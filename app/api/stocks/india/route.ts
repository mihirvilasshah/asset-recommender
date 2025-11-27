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
          console.error(`Error analyzing ${stock.symbol}:`, error);
          // Continue with other stocks
        }
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
  const [priceData, quote] = await Promise.all([
    fetchIndianStockData(symbol),
    getIndianStockQuote(symbol).catch(() => null),
  ]);

  if (priceData.length < 200) {
    throw new Error(`Insufficient data for ${symbol}`);
  }

  const technicalIndicators = calculateTechnicalIndicators(priceData);
  const momentum = calculateMomentumScore(technicalIndicators, priceData);
  const trend = analyzeTrend(technicalIndicators, priceData);
  const fundamentals = analyzeFundamentals(priceData);

  const currentPrice = quote?.price || priceData[priceData.length - 1].close;
  const priceChange = quote?.change || 0;
  const priceChangePercent = quote?.changePercent || 0;

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

