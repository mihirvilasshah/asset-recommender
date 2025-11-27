import { TrendAnalysis, TechnicalIndicators, PriceData } from '@/types';

export function analyzeTrend(
  technicalIndicators: TechnicalIndicators,
  priceData: PriceData[]
): TrendAnalysis {
  const currentPrice = priceData[priceData.length - 1].close;
  const { sma20, sma50, sma200 } = technicalIndicators.sma;
  const { ema12, ema26 } = technicalIndicators.ema;

  // Determine trend direction based on moving averages
  let direction: 'uptrend' | 'downtrend' | 'sideways';
  let strength = 0;
  let reversalSignal = false;

  // Golden Cross / Death Cross detection
  let movingAverageCrossover: 'bullish' | 'bearish' | 'none' = 'none';

  // Check for Golden Cross (EMA12 crosses above EMA26) or Death Cross
  if (priceData.length >= 2) {
    const prevEma12 = calculateEMA(priceData.slice(0, -1).map(d => d.close), 12);
    const prevEma26 = calculateEMA(priceData.slice(0, -1).map(d => d.close), 26);
    
    if (ema12 > ema26 && prevEma12 <= prevEma26) {
      movingAverageCrossover = 'bullish';
    } else if (ema12 < ema26 && prevEma12 >= prevEma26) {
      movingAverageCrossover = 'bearish';
    }
  }

  // Uptrend: Price above all MAs, MAs in ascending order
  if (currentPrice > sma20 && sma20 > sma50 && sma50 > sma200) {
    direction = 'uptrend';
    strength = calculateTrendStrength(priceData, 'up');
  }
  // Downtrend: Price below all MAs, MAs in descending order
  else if (currentPrice < sma20 && sma20 < sma50 && sma50 < sma200) {
    direction = 'downtrend';
    strength = calculateTrendStrength(priceData, 'down');
  }
  // Sideways: Mixed signals
  else {
    direction = 'sideways';
    strength = 25;
  }

  // Check for reversal signals
  reversalSignal = detectReversal(priceData, technicalIndicators);

  return {
    direction,
    strength: Math.max(0, Math.min(100, strength)),
    reversalSignal,
    movingAverageCrossover,
  };
}

function calculateTrendStrength(priceData: PriceData[], direction: 'up' | 'down'): number {
  const recentPrices = priceData.slice(-20).map(d => d.close);
  const firstPrice = recentPrices[0];
  const lastPrice = recentPrices[recentPrices.length - 1];

  const priceChange = direction === 'up'
    ? ((lastPrice - firstPrice) / firstPrice) * 100
    : ((firstPrice - lastPrice) / firstPrice) * 100;

  // Calculate consistency (how many days follow the trend)
  let consistentDays = 0;
  for (let i = 1; i < recentPrices.length; i++) {
    if (direction === 'up' && recentPrices[i] >= recentPrices[i - 1]) {
      consistentDays++;
    } else if (direction === 'down' && recentPrices[i] <= recentPrices[i - 1]) {
      consistentDays++;
    }
  }

  const consistency = (consistentDays / (recentPrices.length - 1)) * 100;
  const strength = Math.min(100, (priceChange * 2) + (consistency * 0.5));

  return strength;
}

function detectReversal(priceData: PriceData[], indicators: TechnicalIndicators): boolean {
  // Check for divergence between price and RSI
  const recentPrices = priceData.slice(-14).map(d => d.close);
  const priceTrend = recentPrices[recentPrices.length - 1] > recentPrices[0] ? 'up' : 'down';

  // RSI divergence (simplified check)
  const rsiOverbought = indicators.rsi > 70;
  const rsiOversold = indicators.rsi < 30;

  // Potential reversal: price making new highs but RSI not confirming
  if (priceTrend === 'up' && rsiOverbought && indicators.macd.histogram < 0) {
    return true;
  }

  // Potential reversal: price making new lows but RSI not confirming
  if (priceTrend === 'down' && rsiOversold && indicators.macd.histogram > 0) {
    return true;
  }

  return false;
}

function calculateEMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1];
  
  const multiplier = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

  for (let i = period; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
  }

  return ema;
}

