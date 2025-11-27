import axios from 'axios';
import { PriceData } from '@/types';

// Using Yahoo Finance API via yahoo-finance2 alternative endpoint
// Since yahoo-finance2 is a Node.js library, we'll use a public API proxy
const YAHOO_FINANCE_API = 'https://query1.finance.yahoo.com/v8/finance/chart';

// Simple in-memory cache
const cache = new Map<string, { data: PriceData[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function fetchIndianStockData(symbol: string): Promise<PriceData[]> {
  const cacheKey = `india_${symbol}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // For Indian stocks, use NSE/BSE format: RELIANCE.NS or RELIANCE.BO
  const formattedSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
  
  // Try up to 2 times with retry
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - (365 * 24 * 60 * 60); // 1 year of data

      const response = await axios.get(YAHOO_FINANCE_API, {
        params: {
          symbol: formattedSymbol,
          period1: startTime,
          period2: endTime,
          interval: '1d',
        },
        timeout: 10000, // 10 second timeout
        validateStatus: (status) => {
          // Accept 200-299, reject 500+ but allow 400-499 (might have partial data)
          return status < 500;
        },
      });

      // Check if we got an HTML error page (Yahoo sometimes returns HTML on errors)
      if (typeof response.data === 'string' || !response.data) {
        throw new Error(`Yahoo Finance returned invalid response for ${formattedSymbol}`);
      }

      if (!response.data.chart || !response.data.chart.result || response.data.chart.result.length === 0) {
        throw new Error(`No chart data available for symbol ${formattedSymbol}`);
      }

      const result = response.data.chart.result[0];
      if (!result || !result.timestamp || !result.indicators || !result.indicators.quote || result.indicators.quote.length === 0) {
        throw new Error(`Invalid data structure for symbol ${formattedSymbol}`);
      }

      const timestamps = result.timestamp;
      const quotes = result.indicators.quote[0];
      if (!quotes) {
        throw new Error(`No quote data available for symbol ${formattedSymbol}`);
      }
      const opens = quotes.open;
      const highs = quotes.high;
      const lows = quotes.low;
      const closes = quotes.close;
      const volumes = quotes.volume;

      const priceData: PriceData[] = timestamps.map((timestamp: number, index: number) => ({
        date: new Date(timestamp * 1000).toISOString().split('T')[0],
        open: opens[index] || 0,
        high: highs[index] || 0,
        low: lows[index] || 0,
        close: closes[index] || 0,
        volume: volumes[index] || 0,
      })).filter((data: PriceData) => data.close > 0);

      if (priceData.length === 0) {
        throw new Error(`No valid price data found for symbol ${formattedSymbol}`);
      }

      cache.set(cacheKey, { data: priceData, timestamp: Date.now() });
      return priceData;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Log on first attempt, don't spam on retry
      if (attempt === 0) {
        console.warn(`Attempt ${attempt + 1} failed for ${symbol}, retrying...`);
      }
      
      // Wait a bit before retrying (except on last attempt)
      if (attempt < 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // All attempts failed
  const errorMessage = lastError?.message || 'Unknown error';
  console.error(`Error fetching Indian stock data for ${symbol} after retries:`, errorMessage);
  throw new Error(`Failed to fetch Indian stock data for ${symbol}: ${errorMessage}`);
}

export async function getIndianStockQuote(symbol: string): Promise<{
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}> {
  const formattedSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
  
  try {
    const response = await axios.get(YAHOO_FINANCE_API, {
      params: {
        symbol: formattedSymbol,
        range: '1d',
        interval: '1m',
      },
      timeout: 5000, // 5 second timeout
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors, but throw on 5xx
    });

    // Check if we got an error response from Yahoo
    if (response.status >= 400 || !response.data || typeof response.data === 'string') {
      // Yahoo returns HTML error pages sometimes
      throw new Error(`Yahoo Finance API returned error for ${formattedSymbol}`);
    }

    if (!response.data.chart || !response.data.chart.result || response.data.chart.result.length === 0) {
      throw new Error(`No quote data available for symbol ${formattedSymbol}`);
    }

    const result = response.data.chart.result[0];
    if (!result || !result.meta) {
      throw new Error(`Invalid quote data structure for symbol ${formattedSymbol}`);
    }

    const meta = result.meta;
    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.previousClose;

    if (currentPrice === undefined || previousClose === undefined) {
      throw new Error(`Missing price data for symbol ${formattedSymbol}`);
    }
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    return {
      symbol: meta.symbol || formattedSymbol,
      price: currentPrice,
      change,
      changePercent,
    };
  } catch (error) {
    // Don't log errors here - they're expected and will be handled by the caller
    // Just rethrow so the caller can decide how to handle it
    throw error;
  }
}

