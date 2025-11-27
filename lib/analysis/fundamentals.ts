import { FundamentalData, PriceData } from '@/types';

export function analyzeFundamentals(
  priceData: PriceData[],
  marketCap?: number,
  peRatio?: number,
  priceToBook?: number
): FundamentalData {
  // Analyze volume trends
  const recentVolumes = priceData.slice(-20).map(d => d.volume);
  const olderVolumes = priceData.slice(-40, -20).map(d => d.volume);

  const recentAvgVolume = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
  const olderAvgVolume = olderVolumes.reduce((sum, v) => sum + v, 0) / olderVolumes.length;

  let volumeTrend: 'increasing' | 'decreasing' | 'stable';
  const volumeChangePercent = ((recentAvgVolume - olderAvgVolume) / olderAvgVolume) * 100;

  if (volumeChangePercent > 10) {
    volumeTrend = 'increasing';
  } else if (volumeChangePercent < -10) {
    volumeTrend = 'decreasing';
  } else {
    volumeTrend = 'stable';
  }

  return {
    peRatio,
    marketCap,
    priceToBook,
    volumeTrend,
    averageVolume: recentAvgVolume,
  };
}

export function calculateFundamentalScore(fundamentals: FundamentalData): number {
  let score = 50; // Base score

  // Volume trend scoring
  if (fundamentals.volumeTrend === 'increasing') {
    score += 15; // Increasing volume is positive
  } else if (fundamentals.volumeTrend === 'decreasing') {
    score -= 15; // Decreasing volume is negative
  }

  // P/E Ratio scoring (if available)
  if (fundamentals.peRatio !== undefined) {
    // Lower P/E is generally better, but context matters
    // For this simple model, we'll consider P/E between 10-25 as good
    if (fundamentals.peRatio > 0 && fundamentals.peRatio < 10) {
      score += 10; // Very low P/E might indicate undervaluation
    } else if (fundamentals.peRatio > 25) {
      score -= 10; // High P/E might indicate overvaluation
    }
  }

  // Price-to-Book scoring (if available)
  if (fundamentals.priceToBook !== undefined) {
    // P/B < 1 might indicate undervaluation, P/B > 3 might indicate overvaluation
    if (fundamentals.priceToBook > 0 && fundamentals.priceToBook < 1) {
      score += 10;
    } else if (fundamentals.priceToBook > 3) {
      score -= 10;
    }
  }

  return Math.max(0, Math.min(100, score));
}

