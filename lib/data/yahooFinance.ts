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

  try {
    // For Indian stocks, use NSE/BSE format: RELIANCE.NS or RELIANCE.BO
    const formattedSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
    
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (365 * 24 * 60 * 60); // 1 year of data

    const response = await axios.get(YAHOO_FINANCE_API, {
      params: {
        symbol: formattedSymbol,
        period1: startTime,
        period2: endTime,
        interval: '1d',
      },
    });

    const result = response.data.chart.result[0];
    if (!result) {
      throw new Error('No data available for this symbol');
    }

    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
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

    cache.set(cacheKey, { data: priceData, timestamp: Date.now() });
    return priceData;
  } catch (error) {
    console.error(`Error fetching Indian stock data for ${symbol}:`, error);
    throw error;
  }
}

export async function getIndianStockQuote(symbol: string): Promise<{
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}> {
  try {
    const formattedSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
    
    const response = await axios.get(YAHOO_FINANCE_API, {
      params: {
        symbol: formattedSymbol,
        range: '1d',
        interval: '1m',
      },
    });

    const result = response.data.chart.result[0];
    if (!result) {
      throw new Error('No quote data available');
    }

    const meta = result.meta;
    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.previousClose;
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    return {
      symbol: meta.symbol,
      price: currentPrice,
      change,
      changePercent,
    };
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    throw error;
  }
}

