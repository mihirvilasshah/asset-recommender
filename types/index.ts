export type AssetType = 'us_stock' | 'indian_stock' | 'crypto';

export interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    MACD: number;
    signal: number;
    histogram: number;
  };
  sma: {
    sma20: number;
    sma50: number;
    sma200: number;
  };
  ema: {
    ema12: number;
    ema26: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  stochastic: {
    k: number;
    d: number;
  };
  adx: number;
  obv: number;
  volumeSMA: number;
}

export interface FundamentalData {
  peRatio?: number;
  marketCap?: number;
  priceToBook?: number;
  volumeTrend: 'increasing' | 'decreasing' | 'stable';
  averageVolume: number;
}

export interface TrendAnalysis {
  direction: 'uptrend' | 'downtrend' | 'sideways';
  strength: number; // 0-100
  reversalSignal: boolean;
  movingAverageCrossover: 'bullish' | 'bearish' | 'none';
}

export interface MomentumScore {
  score: number; // 0-100
  shortTerm: number; // 0-100
  longTerm: number; // 0-100
  breakdown: {
    technical: number;
    trend: number;
    volume: number;
  };
}

export interface Asset {
  symbol: string;
  name: string;
  type: AssetType;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  priceData: PriceData[];
  technicalIndicators: TechnicalIndicators;
  fundamentals: FundamentalData;
  trend: TrendAnalysis;
  momentum: MomentumScore;
  overallScore: number; // 0-100
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  confidence: number; // 0-100
}

export interface Recommendation {
  asset: Asset;
  reasoning: string[];
  keyMetrics: {
    label: string;
    value: string | number;
  }[];
}

