import { NextRequest, NextResponse } from 'next/server';
import { fetchUSStockData, getUSStockQuote } from '@/lib/data/iexCloud';
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

// Rate limiting: Free tier allows 60 calls per minute
// Add delay between API calls to respect rate limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol');

    if (symbol) {
      // Analyze single stock
      const asset = await analyzeStock(symbol);
      return NextResponse.json({ asset });
    } else {
      // Analyze multiple stocks
      // Free tier: 100,000 messages/month, so we can process many stocks
      const assets: Asset[] = [];
      const stocksToAnalyze = US_STOCKS.slice(0, 10); // Process up to 10 stocks
      
      for (let i = 0; i < stocksToAnalyze.length; i++) {
        const stock = stocksToAnalyze[i];
        try {
          // Add small delay between calls to respect rate limits
          // IEX Cloud free tier is generous, but we'll add a small delay
          if (i > 0) {
            await delay(500); // 0.5 second between calls
          }
          
          const asset = await analyzeStock(stock.symbol, stock.name);
          assets.push(asset);
        } catch (error) {
          console.error(`Error analyzing ${stock.symbol}:`, error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Error details: ${errorMessage}`);
          // Continue with other stocks
        }
      }

      // Sort by overall score
      assets.sort((a, b) => b.overallScore - a.overallScore);

      return NextResponse.json({ assets });
    }
  } catch (error) {
    console.error('Error in US stocks API:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch US stock data', details: errorMessage },
      { status: 500 }
    );
  }
}

async function analyzeStock(symbol: string, name?: string): Promise<Asset> {
  const [priceData, quote] = await Promise.all([
    fetchUSStockData(symbol),
    getUSStockQuote(symbol).catch(() => null),
  ]);

  // IEX Cloud provides 1 year of historical data, which is sufficient for analysis
  if (priceData.length < 20) {
    throw new Error(`Insufficient data for ${symbol}. Got ${priceData.length} data points, need at least 20.`);
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

