import { Asset, Recommendation } from '@/types';
import { calculateFundamentalScore } from '@/lib/analysis/fundamentals';

export function calculateOverallScore(asset: Asset): number {
  // Weight different components
  const momentumWeight = 0.40;
  const trendWeight = 0.30;
  const technicalWeight = 0.20;
  const fundamentalWeight = 0.10;

  // Normalize trend strength to 0-100 scale
  const trendScore = asset.trend.direction === 'uptrend'
    ? 50 + (asset.trend.strength / 2)
    : asset.trend.direction === 'downtrend'
    ? 50 - (asset.trend.strength / 2)
    : 50;

  // Adjust for reversal signals
  const trendAdjustedScore = asset.trend.reversalSignal
    ? trendScore - 10  // Penalize if reversal signal detected
    : trendScore;

  // Get fundamental score
  const fundamentalScore = calculateFundamentalScore(asset.fundamentals);

  // Calculate overall score
  const overallScore = (
    asset.momentum.score * momentumWeight +
    trendAdjustedScore * trendWeight +
    asset.momentum.breakdown.technical * technicalWeight +
    fundamentalScore * fundamentalWeight
  );

  // Bonus for bullish crossovers
  let bonus = 0;
  if (asset.trend.movingAverageCrossover === 'bullish') {
    bonus += 5;
  } else if (asset.trend.movingAverageCrossover === 'bearish') {
    bonus -= 5;
  }

  return Math.max(0, Math.min(100, overallScore + bonus));
}

export function getRecommendation(score: number, confidence: number): Asset['recommendation'] {
  // Adjust score based on confidence
  const adjustedScore = score * (confidence / 100);

  if (adjustedScore >= 80) {
    return 'strong_buy';
  } else if (adjustedScore >= 60) {
    return 'buy';
  } else if (adjustedScore >= 40) {
    return 'hold';
  } else if (adjustedScore >= 20) {
    return 'sell';
  } else {
    return 'strong_sell';
  }
}

export function calculateConfidence(asset: Asset): number {
  let confidence = 50; // Base confidence

  // Increase confidence if multiple indicators agree
  const indicators = [
    asset.momentum.score > 60,
    asset.trend.direction === 'uptrend',
    asset.technicalIndicators.rsi > 50 && asset.technicalIndicators.rsi < 70,
    asset.technicalIndicators.macd.MACD > asset.technicalIndicators.macd.signal,
    asset.fundamentals.volumeTrend === 'increasing',
  ];

  const agreementCount = indicators.filter(Boolean).length;
  confidence += (agreementCount - 2.5) * 10; // Adjust based on agreement

  // Decrease confidence if reversal signal
  if (asset.trend.reversalSignal) {
    confidence -= 15;
  }

  // Increase confidence with trend strength
  confidence += asset.trend.strength * 0.2;

  // Decrease confidence if data is limited
  if (asset.priceData.length < 100) {
    confidence -= 20;
  }

  return Math.max(0, Math.min(100, confidence));
}

export function generateRecommendationReasoning(asset: Asset): string[] {
  const reasoning: string[] = [];

  // Momentum reasoning
  if (asset.momentum.score > 70) {
    reasoning.push(`Strong momentum score of ${asset.momentum.score.toFixed(1)} indicates bullish sentiment`);
  } else if (asset.momentum.score < 30) {
    reasoning.push(`Weak momentum score of ${asset.momentum.score.toFixed(1)} indicates bearish sentiment`);
  }

  // Trend reasoning
  if (asset.trend.direction === 'uptrend') {
    reasoning.push(`Price is in an uptrend with ${asset.trend.strength.toFixed(1)}% strength`);
  } else if (asset.trend.direction === 'downtrend') {
    reasoning.push(`Price is in a downtrend with ${asset.trend.strength.toFixed(1)}% strength`);
  }

  // Technical indicator reasoning
  if (asset.technicalIndicators.rsi < 30) {
    reasoning.push('RSI indicates oversold conditions, potential buying opportunity');
  } else if (asset.technicalIndicators.rsi > 70) {
    reasoning.push('RSI indicates overbought conditions, potential selling opportunity');
  }

  if (asset.technicalIndicators.macd.MACD > asset.technicalIndicators.macd.signal) {
    reasoning.push('MACD shows bullish crossover');
  } else {
    reasoning.push('MACD shows bearish crossover');
  }

  // Moving average reasoning
  const currentPrice = asset.currentPrice;
  if (currentPrice > asset.technicalIndicators.sma.sma200) {
    reasoning.push('Price is above 200-day moving average, indicating long-term bullish trend');
  } else {
    reasoning.push('Price is below 200-day moving average, indicating long-term bearish trend');
  }

  // Volume reasoning
  if (asset.fundamentals.volumeTrend === 'increasing') {
    reasoning.push('Volume is increasing, indicating growing interest');
  } else if (asset.fundamentals.volumeTrend === 'decreasing') {
    reasoning.push('Volume is decreasing, indicating waning interest');
  }

  // Reversal signal
  if (asset.trend.reversalSignal) {
    reasoning.push('⚠️ Reversal signal detected - trend may be changing');
  }

  // Crossover reasoning
  if (asset.trend.movingAverageCrossover === 'bullish') {
    reasoning.push('Golden cross detected - bullish signal');
  } else if (asset.trend.movingAverageCrossover === 'bearish') {
    reasoning.push('Death cross detected - bearish signal');
  }

  return reasoning;
}

export function generateKeyMetrics(asset: Asset): { label: string; value: string | number }[] {
  return [
    { label: 'Current Price', value: `$${asset.currentPrice.toFixed(2)}` },
    { label: 'Price Change', value: `${asset.priceChangePercent > 0 ? '+' : ''}${asset.priceChangePercent.toFixed(2)}%` },
    { label: 'RSI', value: asset.technicalIndicators.rsi.toFixed(2) },
    { label: 'Momentum Score', value: asset.momentum.score.toFixed(1) },
    { label: 'Trend', value: asset.trend.direction },
    { label: 'Trend Strength', value: `${asset.trend.strength.toFixed(1)}%` },
    { label: 'Confidence', value: `${asset.confidence.toFixed(1)}%` },
    ...(asset.fundamentals.peRatio ? [{ label: 'P/E Ratio', value: asset.fundamentals.peRatio.toFixed(2) }] : []),
    ...(asset.fundamentals.marketCap ? [{ label: 'Market Cap', value: formatMarketCap(asset.fundamentals.marketCap) }] : []),
  ];
}

function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1e12) {
    return `$${(marketCap / 1e12).toFixed(2)}T`;
  } else if (marketCap >= 1e9) {
    return `$${(marketCap / 1e9).toFixed(2)}B`;
  } else if (marketCap >= 1e6) {
    return `$${(marketCap / 1e6).toFixed(2)}M`;
  }
  return `$${marketCap.toFixed(2)}`;
}

export function createRecommendation(asset: Asset): Recommendation {
  return {
    asset,
    reasoning: generateRecommendationReasoning(asset),
    keyMetrics: generateKeyMetrics(asset),
  };
}

