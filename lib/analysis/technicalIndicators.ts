import { RSI, MACD, SMA, EMA, BollingerBands, Stochastic, ADX } from 'technicalindicators';
import { PriceData, TechnicalIndicators as TechnicalIndicatorsType } from '@/types';

export function calculateTechnicalIndicators(priceData: PriceData[]): TechnicalIndicatorsType {
  // Minimum data requirement: at least 50 points for basic indicators
  // SMA200 needs 200 points, but we'll use fallbacks for shorter datasets
  if (priceData.length < 50) {
    throw new Error(`Insufficient data points. Need at least 50 days of data, got ${priceData.length}.`);
  }

  // Extract arrays for calculations
  const closes = priceData.map(d => d.close);
  const highs = priceData.map(d => d.high);
  const lows = priceData.map(d => d.low);
  const volumes = priceData.map(d => d.volume);

  // Calculate RSI (14 period)
  const rsiValues = RSI.calculate({ values: closes, period: 14 });
  const rsi = rsiValues && rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : 50;

  // Calculate MACD
  const macdInput = {
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  };
  const macdValues = MACD.calculate(macdInput);
  const latestMacd = macdValues && macdValues.length > 0 ? macdValues[macdValues.length - 1] : {
    MACD: 0,
    signal: 0,
    histogram: 0,
  };

  // Calculate Moving Averages
  const sma20Values = priceData.length >= 20 ? SMA.calculate({ values: closes, period: 20 }) : null;
  const sma50Values = priceData.length >= 50 ? SMA.calculate({ values: closes, period: 50 }) : null;
  const sma200Values = priceData.length >= 200 ? SMA.calculate({ values: closes, period: 200 }) : null;

  const sma20 = sma20Values && sma20Values.length > 0 ? sma20Values[sma20Values.length - 1] : closes[closes.length - 1];
  const sma50 = sma50Values && sma50Values.length > 0 ? sma50Values[sma50Values.length - 1] : closes[closes.length - 1];
  // For SMA200, use SMA50 or current price if not enough data
  const sma200 = sma200Values && sma200Values.length > 0 
    ? sma200Values[sma200Values.length - 1] 
    : (sma50Values && sma50Values.length > 0 ? sma50Values[sma50Values.length - 1] : closes[closes.length - 1]);

  // Calculate EMA
  const ema12Values = EMA.calculate({ values: closes, period: 12 });
  const ema26Values = EMA.calculate({ values: closes, period: 26 });

  const ema12 = ema12Values && ema12Values.length > 0 ? ema12Values[ema12Values.length - 1] : closes[closes.length - 1];
  const ema26 = ema26Values && ema26Values.length > 0 ? ema26Values[ema26Values.length - 1] : closes[closes.length - 1];

  // Calculate Bollinger Bands
  const bbInput = {
    values: closes,
    period: 20,
    stdDev: 2,
  };
  const bbValues = BollingerBands.calculate(bbInput);
  const latestBB = bbValues && bbValues.length > 0 ? bbValues[bbValues.length - 1] : {
    upper: closes[closes.length - 1],
    middle: closes[closes.length - 1],
    lower: closes[closes.length - 1],
  };

  // Calculate Stochastic Oscillator
  const stochasticInput = {
    high: highs,
    low: lows,
    close: closes,
    period: 14,
    signalPeriod: 3,
  };
  const stochasticValues = Stochastic.calculate(stochasticInput);
  const latestStochastic = stochasticValues && stochasticValues.length > 0 ? stochasticValues[stochasticValues.length - 1] : {
    k: 50,
    d: 50,
  };

  // Calculate ADX (Average Directional Index)
  const adxInput = {
    high: highs,
    low: lows,
    close: closes,
    period: 14,
  };
  const adxValues = ADX.calculate(adxInput);
  const adx = adxValues && adxValues.length > 0 && adxValues[adxValues.length - 1]?.adx ? adxValues[adxValues.length - 1].adx : 25;

  // Calculate OBV (On-Balance Volume)
  const obv = calculateOBV(priceData);

  // Calculate Volume SMA
  const volumeSMAValues = SMA.calculate({ values: volumes, period: 20 });
  const volumeSMA = volumeSMAValues && volumeSMAValues.length > 0 ? volumeSMAValues[volumeSMAValues.length - 1] : volumes[volumes.length - 1];

  return {
    rsi,
    macd: {
      MACD: latestMacd.MACD || 0,
      signal: latestMacd.signal || 0,
      histogram: latestMacd.histogram || 0,
    },
    sma: {
      sma20,
      sma50,
      sma200,
    },
    ema: {
      ema12,
      ema26,
    },
    bollingerBands: {
      upper: latestBB.upper,
      middle: latestBB.middle,
      lower: latestBB.lower,
    },
    stochastic: {
      k: latestStochastic.k,
      d: latestStochastic.d,
    },
    adx,
    obv,
    volumeSMA,
  };
}

function calculateOBV(priceData: PriceData[]): number {
  let obv = 0;
  for (let i = 1; i < priceData.length; i++) {
    const currentClose = priceData[i].close;
    const previousClose = priceData[i - 1].close;
    const volume = priceData[i].volume;

    if (currentClose > previousClose) {
      obv += volume;
    } else if (currentClose < previousClose) {
      obv -= volume;
    }
    // If close is same, OBV remains unchanged
  }
  return obv;
}

export function calculateSupportResistance(priceData: PriceData[]): {
  support: number;
  resistance: number;
} {
  const recentData = priceData.slice(-50); // Last 50 days
  const lows = recentData.map(d => d.low);
  const highs = recentData.map(d => d.high);

  // Support is the minimum low in recent period
  const support = Math.min(...lows);

  // Resistance is the maximum high in recent period
  const resistance = Math.max(...highs);

  return { support, resistance };
}

