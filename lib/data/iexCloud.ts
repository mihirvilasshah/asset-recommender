import axios from 'axios';
import { PriceData } from '@/types';

const API_KEY = process.env.IEX_CLOUD_API_KEY || '';
const BASE_URL = 'https://cloud.iexapis.com/stable';

// Simple in-memory cache to handle rate limits
const cache = new Map<string, { data: PriceData[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface IEXChartData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  uOpen: number;
  uHigh: number;
  uLow: number;
  uClose: number;
  uVolume: number;
  change: number;
  changePercent: number;
  label: string;
  changeOverTime: number;
}

interface IEXQuoteData {
  symbol: string;
  companyName: string;
  primaryExchange: string;
  calculationPrice: string;
  open: number;
  openTime: number;
  openSource: string;
  close: number;
  closeTime: number;
  closeSource: string;
  high: number;
  highTime: number;
  highSource: string;
  low: number;
  lowTime: number;
  lowSource: string;
  latestPrice: number;
  latestSource: string;
  latestTime: string;
  latestUpdate: number;
  latestVolume: number;
  iexRealtimePrice: number;
  iexRealtimeSize: number;
  iexLastUpdated: number;
  delayedPrice: number;
  delayedPriceTime: number;
  oddLotDelayedPrice: number;
  oddLotDelayedPriceTime: number;
  extendedPrice: number;
  extendedChange: number;
  extendedChangePercent: number;
  extendedPriceTime: number;
  previousClose: number;
  previousVolume: number;
  change: number;
  changePercent: number;
  volume: number;
  iexMarketPercent: number;
  iexVolume: number;
  avgTotalVolume: number;
  iexBidPrice: number;
  iexBidSize: number;
  iexAskPrice: number;
  iexAskSize: number;
  iexOpen: number;
  iexOpenTime: number;
  iexClose: number;
  iexCloseTime: number;
  marketCap: number;
  peRatio: number;
  week52High: number;
  week52Low: number;
  ytdChange: number;
}

export async function fetchUSStockData(symbol: string): Promise<PriceData[]> {
  const cacheKey = `us_${symbol}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  if (!API_KEY) {
    throw new Error('IEX_CLOUD_API_KEY is required. Get a free API key at https://iexcloud.io/console/');
  }

  try {
    // IEX Cloud free tier: 100,000 messages/month
    // Using chart endpoint to get historical data (1 message per call)
    // Range: 1m, 3m, 6m, 1y, 2y, 5y, ytd, max
    const response = await axios.get<IEXChartData[]>(`${BASE_URL}/stock/${symbol}/chart/1y`, {
      params: {
        token: API_KEY,
      },
    });

    if (!response.data || response.data.length === 0) {
      throw new Error(`No historical data available for symbol ${symbol}. Please check if the symbol is correct.`);
    }

    const priceData: PriceData[] = response.data
      .map((item) => ({
        date: item.date,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
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
      if (error.response?.status === 429) {
        throw new Error('API rate limit exceeded. Free tier allows 100,000 messages per month. Please try again later.');
      }
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Invalid API key. Please check your IEX_CLOUD_API_KEY environment variable.');
      }
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
  if (!API_KEY) {
    throw new Error('IEX_CLOUD_API_KEY is required. Get a free API key at https://iexcloud.io/console/');
  }

  try {
    const response = await axios.get<IEXQuoteData>(`${BASE_URL}/stock/${symbol}/quote`, {
      params: {
        token: API_KEY,
      },
    });

    // Check if response is valid and has price data
    if (!response.data || response.data.latestPrice === null || response.data.latestPrice === undefined) {
      throw new Error(`No quote data available for symbol ${symbol}`);
    }

    return {
      symbol: response.data.symbol || symbol,
      price: response.data.latestPrice,
      change: response.data.change || 0,
      changePercent: (response.data.changePercent || 0) * 100, // Convert to percentage
    };
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', error.response?.data);
      if (error.response?.status === 429) {
        throw new Error('API rate limit exceeded. Free tier allows 100,000 messages per month. Please try again later.');
      }
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Invalid API key. Please check your IEX_CLOUD_API_KEY environment variable.');
      }
    }
    throw error;
  }
}

