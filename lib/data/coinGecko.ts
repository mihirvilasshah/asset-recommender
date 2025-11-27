import axios from 'axios';
import { PriceData } from '@/types';

const API_KEY = process.env.COINGECKO_API_KEY;
// CoinGecko Demo API Configuration
// Base URL: https://api.coingecko.com/api/v3/
// Header: x-cg-demo-api-key (alternative: query param x_cg_demo_api_key)
// Rate Limits: 30 calls/minute, 10,000 calls/month
// Documentation: https://support.coingecko.com/hc/en-us/articles/21880397454233
const BASE_URL = 'https://api.coingecko.com/api/v3';

// Simple in-memory cache
const cache = new Map<string, { data: PriceData[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CoinGeckoOHLCResponse {
  [index: number]: [number, number, number, number, number]; // [timestamp, open, high, low, close]
}

export async function fetchCryptoData(coinId: string, days: number = 365): Promise<PriceData[]> {
  const cacheKey = `crypto_${coinId}_${days}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    // CoinGecko Demo API uses 'x-cg-demo-api-key' header
    const headers = API_KEY ? { 'x-cg-demo-api-key': API_KEY } : {};
    
    const response = await axios.get<CoinGeckoOHLCResponse>(
      `${BASE_URL}/coins/${coinId}/ohlc`,
      {
        params: {
          vs_currency: 'usd',
          days: days,
        },
        headers,
      }
    );

    const ohlcData = response.data;
    if (!ohlcData || !Array.isArray(ohlcData)) {
      console.error(`Invalid OHLC response for ${coinId}:`, {
        type: typeof ohlcData,
        isArray: Array.isArray(ohlcData),
        data: ohlcData,
      });
      throw new Error(`No data available for this cryptocurrency: ${coinId}. Response was not an array.`);
    }
    
    if (ohlcData.length === 0) {
      throw new Error(`Empty OHLC data returned for ${coinId}`);
    }

    // Fetch volume data separately
    const marketDataResponse = await axios.get(
      `${BASE_URL}/coins/${coinId}/market_chart`,
      {
        params: {
          vs_currency: 'usd',
          days: days,
        },
        headers,
      }
    );

    const volumes = marketDataResponse.data.total_volumes || [];
    const volumeMap = new Map<number, number>();
    volumes.forEach(([timestamp, volume]: [number, number]) => {
      const date = new Date(timestamp);
      date.setHours(0, 0, 0, 0);
      volumeMap.set(date.getTime(), volume);
    });

    const priceData: PriceData[] = ohlcData.map(([timestamp, open, high, low, close]) => {
      const date = new Date(timestamp);
      date.setHours(0, 0, 0, 0);
      const volume = volumeMap.get(date.getTime()) || 0;

      return {
        date: date.toISOString().split('T')[0],
        open,
        high,
        low,
        close,
        volume,
      };
    }).filter((data: PriceData) => data.close > 0);

    console.log(`Fetched ${priceData.length} data points for ${coinId} (requested ${days} days, got ${ohlcData.length} OHLC points)`);
    
    if (priceData.length === 0) {
      throw new Error(`No valid price data returned for ${coinId}`);
    }

    cache.set(cacheKey, { data: priceData, timestamp: Date.now() });
    return priceData;
  } catch (error: any) {
    // Handle rate limit errors (429)
    if (error.response?.status === 429) {
      console.error(`Rate limit exceeded for ${coinId}. CoinGecko Demo API: 30 calls/minute, 10,000/month`);
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    console.error(`Error fetching crypto data for ${coinId}:`, error);
    throw error;
  }
}

export async function getCryptoQuote(coinId: string): Promise<{
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}> {
  try {
    // CoinGecko Demo API uses 'x-cg-demo-api-key' header
    const headers = API_KEY ? { 'x-cg-demo-api-key': API_KEY } : {};
    
    // Try the simple/price endpoint first
    try {
      const response = await axios.get(
        `${BASE_URL}/simple/price`,
        {
          params: {
            ids: coinId,
            vs_currencies: 'usd',
            include_24hr_change: true,
          },
          headers,
          timeout: 10000, // 10 second timeout
        }
      );

      const data = response.data[coinId];
      if (!data || !data.usd) {
        throw new Error('No quote data available');
      }

      const price = data.usd;
      const changePercent = data.usd_24h_change || 0;
      const change = (price * changePercent) / 100;

      return {
        symbol: coinId,
        price,
        change,
        changePercent,
      };
    } catch (simplePriceError: any) {
      // If simple/price fails, try using the market data endpoint as fallback
      console.warn(`Simple price endpoint failed for ${coinId}, trying market data endpoint...`);
      
      const marketResponse = await axios.get(
        `${BASE_URL}/coins/${coinId}`,
        {
          params: {
            localization: false,
            tickers: false,
            market_data: true,
            community_data: false,
            developer_data: false,
            sparkline: false,
          },
          headers,
          timeout: 10000,
        }
      );

      const marketData = marketResponse.data.market_data;
      if (!marketData || !marketData.current_price?.usd) {
        throw new Error('No market data available');
      }

      const price = marketData.current_price.usd;
      const changePercent = marketData.price_change_percentage_24h || 0;
      const change = (price * changePercent) / 100;

      return {
        symbol: coinId,
        price,
        change,
        changePercent,
      };
    }
  } catch (error: any) {
    // Handle rate limit errors (429)
    if (error.response?.status === 429) {
      console.error(`Rate limit exceeded for ${coinId}. CoinGecko Demo API: 30 calls/minute, 10,000/month`);
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    // Log more detailed error information
    if (error.response) {
      console.error(`Error fetching quote for ${coinId}:`, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url,
      });
    } else {
      console.error(`Error fetching quote for ${coinId}:`, error.message || error);
    }
    throw error;
  }
}

// Helper function to get coin ID from symbol
export async function getCoinIdFromSymbol(symbol: string): Promise<string> {
  try {
    // CoinGecko Demo API uses 'x-cg-demo-api-key' header
    const headers = API_KEY ? { 'x-cg-demo-api-key': API_KEY } : {};
    
    const response = await axios.get(
      `${BASE_URL}/coins/list`,
      {
        headers,
      }
    );

    const coin = response.data.find(
      (c: { symbol: string }) => c.symbol.toLowerCase() === symbol.toLowerCase()
    );

    return coin ? coin.id : symbol;
  } catch (error: any) {
    // Handle rate limit errors (429)
    if (error.response?.status === 429) {
      console.error(`Rate limit exceeded. CoinGecko Demo API: 30 calls/minute, 10,000/month`);
    }
    console.error(`Error getting coin ID for ${symbol}:`, error);
    return symbol;
  }
}

