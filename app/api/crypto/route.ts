import { NextRequest, NextResponse } from 'next/server';
import { fetchCryptoData, getCryptoQuote, getCoinIdFromSymbol } from '@/lib/data/coinGecko';
import { calculateTechnicalIndicators } from '@/lib/analysis/technicalIndicators';
import { calculateMomentumScore } from '@/lib/analysis/momentum';
import { analyzeTrend } from '@/lib/analysis/trends';
import { analyzeFundamentals } from '@/lib/analysis/fundamentals';
import { calculateOverallScore, getRecommendation, calculateConfidence } from '@/lib/utils/scoring';
import { Asset } from '@/types';

// Popular cryptocurrencies to analyze
const CRYPTO_COINS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  { id: 'matic-network', symbol: 'MATIC', name: 'Polygon' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
];

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol');
    const coinId = request.nextUrl.searchParams.get('coinId');

    if (symbol || coinId) {
      // Analyze single cryptocurrency
      const id = coinId || await getCoinIdFromSymbol(symbol!);
      const coin = CRYPTO_COINS.find(c => c.id === id || c.symbol.toLowerCase() === symbol?.toLowerCase());
      const asset = await analyzeCrypto(id, coin?.name || id);
      return NextResponse.json({ asset });
    } else {
      // Analyze multiple cryptocurrencies
      const assets: Asset[] = [];
      
      for (const coin of CRYPTO_COINS.slice(0, 5)) { // Limit to 5 to avoid rate limits
        try {
          const asset = await analyzeCrypto(coin.id, coin.name);
          assets.push(asset);
        } catch (error) {
          console.error(`Error analyzing ${coin.symbol}:`, error);
          // Continue with other coins
        }
      }

      // Sort by overall score
      assets.sort((a, b) => b.overallScore - a.overallScore);

      return NextResponse.json({ assets });
    }
  } catch (error) {
    console.error('Error in crypto API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cryptocurrency data' },
      { status: 500 }
    );
  }
}

async function analyzeCrypto(coinId: string, name?: string): Promise<Asset> {
  const [priceData, quote] = await Promise.all([
    fetchCryptoData(coinId, 365),
    getCryptoQuote(coinId).catch(() => null),
  ]);

  // Log data availability for debugging
  console.log(`Analyzing ${coinId}: ${priceData.length} data points available`);
  
  // Minimum requirement reduced to 50 (technical indicators can work with less than 200)
  if (priceData.length < 50) {
    throw new Error(`Insufficient data for ${coinId}: got ${priceData.length} points, need at least 50`);
  }

  const technicalIndicators = calculateTechnicalIndicators(priceData);
  const momentum = calculateMomentumScore(technicalIndicators, priceData);
  const trend = analyzeTrend(technicalIndicators, priceData);
  const fundamentals = analyzeFundamentals(priceData);

  const currentPrice = quote?.price || priceData[priceData.length - 1].close;
  const priceChange = quote?.change || 0;
  const priceChangePercent = quote?.changePercent || 0;

  const asset: Asset = {
    symbol: quote?.symbol || coinId.toUpperCase(),
    name: name || coinId,
    type: 'crypto',
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

