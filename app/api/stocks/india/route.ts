import { NextRequest, NextResponse } from 'next/server';
import { fetchIndianStockData, getIndianStockQuote } from '@/lib/data/yahooFinance';
import { calculateTechnicalIndicators } from '@/lib/analysis/technicalIndicators';
import { calculateMomentumScore } from '@/lib/analysis/momentum';
import { analyzeTrend } from '@/lib/analysis/trends';
import { analyzeFundamentals } from '@/lib/analysis/fundamentals';
import { calculateOverallScore, getRecommendation, calculateConfidence } from '@/lib/utils/scoring';
import { Asset } from '@/types';

// Popular Indian stocks to analyze
const INDIAN_STOCKS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd' },
  { symbol: 'TCS', name: 'Tata Consultancy Services' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd' },
  { symbol: 'INFY', name: 'Infosys Ltd' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd' },
  { symbol: 'SBIN', name: 'State Bank of India' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd' },
  { symbol: 'LICI', name: 'Life Insurance Corporation of India' },
];

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol');

    if (symbol) {
      // Analyze single stock
      const asset = await analyzeStock(symbol);
      return NextResponse.json({ asset });
    } else {
      // Analyze multiple stocks
      const assets: Asset[] = [];
      
      for (const stock of INDIAN_STOCKS.slice(0, 5)) { // Limit to 5 to avoid rate limits
        try {
          const asset = await analyzeStock(stock.symbol, stock.name);
          assets.push(asset);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Error analyzing ${stock.symbol}:`, errorMessage);
          console.error('Full error:', error);
          // Continue with other stocks
        }
      }

      if (assets.length === 0) {
        console.error('No Indian stocks were successfully analyzed. All stocks failed.');
        return NextResponse.json(
          { 
            assets: [],
            error: 'All Indian stock requests failed. Check server logs for details.',
            message: 'Unable to fetch Indian stock data. This may be due to API rate limits or network issues.'
          },
          { status: 503 }
        );
      }

      // Sort by overall score
      assets.sort((a, b) => b.overallScore - a.overallScore);

      return NextResponse.json({ assets });
    }
  } catch (error) {
    console.error('Error in Indian stocks API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Indian stock data' },
      { status: 500 }
    );
  }
}

async function analyzeStock(symbol: string, name?: string): Promise<Asset> {
  // Fetch historical data first (required)
  const priceData = await fetchIndianStockData(symbol);

  if (priceData.length < 30) {
    throw new Error(`Insufficient data for ${symbol}: only ${priceData.length} data points available (minimum 30 required)`);
  }

  // Try to fetch quote, but don't let it block or fail the entire request
  let quote = null;
  try {
    const quotePromise = getIndianStockQuote(symbol);
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Quote request timeout')), 5000)
    );
    
    quote = await Promise.race([
      quotePromise,
      timeoutPromise,
    ]) as { symbol: string; price: number; change: number; changePercent: number } | null;
  } catch (error) {
    // Silently fail - we'll use historical data instead
    // Quote failures are common with Yahoo Finance for Indian stocks
  }

  const technicalIndicators = calculateTechnicalIndicators(priceData);
  const momentum = calculateMomentumScore(technicalIndicators, priceData);
  const trend = analyzeTrend(technicalIndicators, priceData);
  const fundamentals = analyzeFundamentals(priceData);

  // Use quote if available, otherwise calculate from historical data
  const latestClose = priceData[priceData.length - 1].close;
  const previousClose = priceData.length > 1 ? priceData[priceData.length - 2].close : latestClose;
  
  const currentPrice = quote?.price || latestClose;
  
  // Calculate price change from historical data if quote is not available
  let priceChange = quote?.change ?? 0;
  let priceChangePercent = quote?.changePercent ?? 0;
  
  if (!quote && priceData.length > 1) {
    priceChange = currentPrice - previousClose;
    priceChangePercent = previousClose > 0 ? (priceChange / previousClose) * 100 : 0;
  }

  const asset: Asset = {
    symbol: quote?.symbol || symbol,
    name: name || symbol,
    type: 'indian_stock',
    currentPrice,
    priceChange,
    priceChangePercent,
    priceData: priceData.slice(-100), // Keep last 100 days
    technicalIndicators,
    fundamentals,
    trend,
    momentum,
    overallScore: 0, // Will be calculated
    recommendation: 'hold',
    confidence: 0, // Will be calculated
  };

  asset.overallScore = calculateOverallScore(asset);
  asset.confidence = calculateConfidence(asset);
  asset.recommendation = getRecommendation(asset.overallScore, asset.confidence);

  return asset;
}

