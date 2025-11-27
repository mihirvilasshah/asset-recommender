import { MomentumScore, TechnicalIndicators } from '@/types';

export function calculateMomentumScore(
  technicalIndicators: TechnicalIndicators,
  priceData: { close: number }[]
): MomentumScore {
  const currentPrice = priceData[priceData.length - 1].close;
  const price20DaysAgo = priceData[Math.max(0, priceData.length - 20)].close;
  const price50DaysAgo = priceData[Math.max(0, priceData.length - 50)].close;

  // RSI Score (0-100, normalized)
  // RSI > 70 = overbought (negative), RSI < 30 = oversold (positive)
  const rsiScore = technicalIndicators.rsi < 30 
    ? 100 - (technicalIndicators.rsi / 30) * 50  // Oversold = bullish
    : technicalIndicators.rsi > 70
    ? 50 - ((technicalIndicators.rsi - 70) / 30) * 50  // Overbought = bearish
    : 50 + ((50 - Math.abs(technicalIndicators.rsi - 50)) / 20) * 30; // Neutral zone

  // MACD Score
  const macdScore = technicalIndicators.macd.MACD > technicalIndicators.macd.signal
    ? 50 + Math.min(50, (technicalIndicators.macd.histogram / currentPrice) * 10000)
    : 50 - Math.min(50, Math.abs(technicalIndicators.macd.histogram / currentPrice) * 10000);

  // Moving Average Score
  const smaScore = currentPrice > technicalIndicators.sma.sma20
    ? currentPrice > technicalIndicators.sma.sma50
      ? currentPrice > technicalIndicators.sma.sma200
        ? 100  // Above all MAs = very bullish
        : 75   // Above 20 and 50, below 200
      : 50     // Above 20, below 50
    : 25;      // Below 20 = bearish

  // Bollinger Bands Score
  const bbPosition = (currentPrice - technicalIndicators.bollingerBands.lower) /
    (technicalIndicators.bollingerBands.upper - technicalIndicators.bollingerBands.lower);
  const bbScore = bbPosition < 0.2
    ? 100  // Near lower band = oversold
    : bbPosition > 0.8
    ? 0    // Near upper band = overbought
    : 50 + (0.5 - bbPosition) * 100; // Middle range

  // Stochastic Score
  const stochasticScore = technicalIndicators.stochastic.k < 20
    ? 100  // Oversold
    : technicalIndicators.stochastic.k > 80
    ? 0    // Overbought
    : 50 + (50 - technicalIndicators.stochastic.k) * 0.625;

  // ADX Score (trend strength)
  const adxScore = technicalIndicators.adx > 25
    ? Math.min(100, 50 + (technicalIndicators.adx - 25) * 2)  // Strong trend
    : technicalIndicators.adx * 2;  // Weak trend

  // Price Momentum Score
  const shortTermMomentum = ((currentPrice - price20DaysAgo) / price20DaysAgo) * 100;
  const longTermMomentum = ((currentPrice - price50DaysAgo) / price50DaysAgo) * 100;

  const shortTermScore = 50 + Math.min(50, Math.max(-50, shortTermMomentum * 5));
  const longTermScore = 50 + Math.min(50, Math.max(-50, longTermMomentum * 2));

  // Volume Score
  const recentVolume = priceData.slice(-5).reduce((sum, d: any) => sum + (d.volume || 0), 0) / 5;
  const volumeScore = recentVolume > technicalIndicators.volumeSMA
    ? 75  // Above average volume = bullish
    : 25; // Below average volume = bearish

  // Weighted combination
  const technicalScore = (
    rsiScore * 0.15 +
    macdScore * 0.20 +
    smaScore * 0.20 +
    bbScore * 0.10 +
    stochasticScore * 0.10 +
    adxScore * 0.10 +
    volumeScore * 0.15
  );

  const overallScore = (
    technicalScore * 0.6 +
    shortTermScore * 0.25 +
    longTermScore * 0.15
  );

  return {
    score: Math.max(0, Math.min(100, overallScore)),
    shortTerm: Math.max(0, Math.min(100, shortTermScore)),
    longTerm: Math.max(0, Math.min(100, longTermScore)),
    breakdown: {
      technical: Math.max(0, Math.min(100, technicalScore)),
      trend: Math.max(0, Math.min(100, adxScore)),
      volume: Math.max(0, Math.min(100, volumeScore)),
    },
  };
}

