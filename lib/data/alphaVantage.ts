import axios from 'axios';
import { PriceData } from '@/types';

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
const BASE_URL = 'https://www.alphavantage.co/query';

interface AlphaVantageResponse {
  'Time Series (Daily)'?: {
    [date: string]: {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
      '5. volume': string;
    };
  };
  'Note'?: string;
  'Error Message'?: string;
}

// Simple in-memory cache to handle rate limits
const cache = new Map<string, { data: PriceData[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function fetchUSStockData(symbol: string): Promise<PriceData[]> {
  const cacheKey = `us_${symbol}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await axios.get<AlphaVantageResponse>(BASE_URL, {
      params: {
        function: 'TIME_SERIES_DAILY',
        symbol: symbol,
        apikey: API_KEY,
        outputsize: 'compact', // Free tier only supports 'compact' (latest 100 data points)
        datatype: 'json',
      },
    });

    // Check for rate limit or API key issues
    if (response.data['Note']) {
      const note = response.data['Note'];
      if (note.includes('API call frequency') || note.includes('Thank you for using Alpha Vantage')) {
        throw new Error('API rate limit exceeded. Free tier allows 5 calls per minute and 500 per day. Please try again later.');
      }
      throw new Error(note);
    }

    if (response.data['Error Message']) {
      throw new Error(response.data['Error Message']);
    }

    const timeSeries = response.data['Time Series (Daily)'];
    if (!timeSeries) {
      console.error('Response data:', JSON.stringify(response.data, null, 2));
      throw new Error(`No time series data available for symbol ${symbol}. Please check if the symbol is correct.`);
    }

    const priceData: PriceData[] = Object.entries(timeSeries)
      .map(([date, data]) => ({
        date,
        open: parseFloat(data['1. open']),
        high: parseFloat(data['2. high']),
        low: parseFloat(data['3. low']),
        close: parseFloat(data['4. close']),
        volume: parseInt(data['5. volume']),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (priceData.length === 0) {
      throw new Error(`No price data found for symbol ${symbol}`);
    }

    cache.set(cacheKey, { data: priceData, timestamp: Date.now() });
    return priceData;
  } catch (error) {
    console.error(`Error fetching US stock data for ${symbol}:`, error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', error.response?.data);
    }
    throw error;
  }
}

export async function getUSStockQuote(symbol: string): Promise<{
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}> {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: symbol,
        apikey: API_KEY,
        datatype: 'json',
      },
    });

    // Check for rate limit or API key issues
    if (response.data['Note']) {
      const note = response.data['Note'];
      if (note.includes('API call frequency') || note.includes('Thank you for using Alpha Vantage')) {
        throw new Error('API rate limit exceeded. Please try again later.');
      }
      throw new Error(note);
    }

    if (response.data['Error Message']) {
      throw new Error(response.data['Error Message']);
    }

    const quote = response.data['Global Quote'];
    if (!quote || Object.keys(quote).length === 0) {
      console.error('Response data:', JSON.stringify(response.data, null, 2));
      throw new Error(`No quote data available for symbol ${symbol}`);
    }

    return {
      symbol: quote['01. symbol'] || symbol,
      price: parseFloat(quote['05. price'] || '0'),
      change: parseFloat(quote['09. change'] || '0'),
      changePercent: parseFloat((quote['10. change percent'] || '0%').replace('%', '')),
    };
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', error.response?.data);
    }
    throw error;
  }
}

