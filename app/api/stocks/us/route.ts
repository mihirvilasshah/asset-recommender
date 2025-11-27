import { NextRequest, NextResponse } from 'next/server';
import { fetchUSStockData, getUSStockQuote } from '@/lib/data/alphaVantage';
import { calculateTechnicalIndicators } from '@/lib/analysis/technicalIndicators';
import { calculateMomentumScore } from '@/lib/analysis/momentum';
import { analyzeTrend } from '@/lib/analysis/trends';
import { analyzeFundamentals } from '@/lib/analysis/fundamentals';
import { calculateOverallScore, getRecommendation, calculateConfidence, createRecommendation } from '@/lib/utils/scoring';
import { Asset } from '@/types';

// Popular US stocks to analyze
const US_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
  { symbol: 'V', name: 'Visa Inc.' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
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
      
      for (const stock of US_STOCKS.slice(0, 5)) { // Limit to 5 to avoid rate limits
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
    console.error('Error in US stocks API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch US stock data' },
      { status: 500 }
    );
  }
}

async function analyzeStock(symbol: string, name?: string): Promise<Asset> {
  const [priceData, quote] = await Promise.all([
    fetchUSStockData(symbol),
    getUSStockQuote(symbol).catch(() => null),
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
    type: 'us_stock',
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

