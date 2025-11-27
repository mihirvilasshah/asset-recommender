# Asset Recommender App

## Overview

A Next.js web application that analyzes and recommends investments across Indian stocks, US stocks, and cryptocurrency using technical analysis, momentum indicators, trend analysis, and fundamental metrics.

## Architecture

### Tech Stack

- **Framework**: Next.js 16 (latest stable, App Router) for Vercel deployment
- **Styling**: Tailwind CSS for modern UI
- **Data Sources**: 
  - US Stocks: IEX Cloud API (free tier: 100,000 messages/month)
  - Indian Stocks: Yahoo Finance API (via yfinance library or API)
  - Cryptocurrency: CoinGecko API (free tier)
- **Technical Analysis**: Custom calculations + `technicalindicators` library
- **Language**: TypeScript

### Key Features

1. **Data Fetching**: API routes to fetch market data for all three asset types
2. **Technical Analysis Engine**: Calculate comprehensive technical indicators (RSI, MACD, Moving Averages, Bollinger Bands, Stochastic, ADX, Volume indicators, etc.)
3. **Momentum Scoring**: Combine indicators to generate momentum scores
4. **Trend Analysis**: Identify uptrends/downtrends using moving averages and price action
5. **Fundamental Analysis**: Basic fundamental metrics (P/E ratio, market cap, volume trends)
6. **Recommendation Engine**: Score and rank assets based on combined signals
7. **Simple Dashboard**: Display top recommendations with key metrics

## File Structure

```
/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Main dashboard page
│   ├── api/
│   │   ├── stocks/
│   │   │   ├── us/route.ts     # US stocks data endpoint
│   │   │   └── india/route.ts  # Indian stocks data endpoint
│   │   ├── crypto/route.ts     # Crypto data endpoint
│   │   └── recommendations/route.ts  # Combined recommendations
│   └── globals.css             # Global styles
├── lib/
│   ├── data/
│   │   ├── iexCloud.ts         # IEX Cloud API client
│   │   ├── yahooFinance.ts     # Yahoo Finance API client
│   │   └── coinGecko.ts        # CoinGecko API client
│   ├── analysis/
│   │   ├── technicalIndicators.ts  # Technical indicator calculations
│   │   ├── momentum.ts         # Momentum scoring logic
│   │   ├── trends.ts           # Trend analysis
│   │   └── fundamentals.ts     # Fundamental analysis
│   └── utils/
│       └── scoring.ts          # Recommendation scoring algorithm
├── components/
│   ├── RecommendationCard.tsx # Card component for each recommendation
│   ├── AssetTypeTabs.tsx       # Tabs for filtering by asset type
│   └── LoadingSpinner.tsx      # Loading state component
├── types/
│   └── index.ts                # TypeScript interfaces
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
└── .env.local.example          # Example env file for API keys

```

## Implementation Details

### Data Fetching (`lib/data/`)

- **IEX Cloud**: Fetch US stock data (historical charts, real-time quotes) with rate limiting
- **Yahoo Finance**: Fetch Indian stock data (NSE/BSE symbols)
- **CoinGecko**: Fetch crypto prices, market data, and historical data

### Technical Analysis (`lib/analysis/technicalIndicators.ts`)

Calculate indicators:

- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- SMA/EMA (Simple/Exponential Moving Averages)
- Bollinger Bands
- Stochastic Oscillator
- ADX (Average Directional Index)
- Volume indicators (OBV, Volume SMA)
- Support/Resistance levels

### Momentum Scoring (`lib/analysis/momentum.ts`)

- Combine multiple indicators into momentum score (0-100)
- Weight different indicators based on asset type
- Consider timeframes (short-term vs long-term momentum)

### Trend Analysis (`lib/analysis/trends.ts`)

- Identify trend direction using moving average crossovers
- Calculate trend strength
- Detect trend reversals

### Fundamental Analysis (`lib/analysis/fundamentals.ts`)

- P/E ratio (where available)
- Market capitalization
- Volume trends
- Price-to-book ratio (for stocks)

### Recommendation Engine (`lib/utils/scoring.ts`)

- Combine technical, momentum, trend, and fundamental scores
- Rank assets by overall score
- Filter out low-confidence recommendations

### UI Components

- **Dashboard**: Grid/list of recommendation cards
- **Recommendation Card**: Shows asset name, score, key metrics, buy/sell signal
- **Asset Type Filter**: Tabs to filter by Indian stocks, US stocks, or crypto
- **Loading States**: Skeleton loaders while fetching data

### API Routes

- `/api/stocks/us`: Fetch and analyze US stocks
- `/api/stocks/india`: Fetch and analyze Indian stocks  
- `/api/crypto`: Fetch and analyze cryptocurrency
- `/api/recommendations`: Get combined recommendations across all asset types

## Configuration

- Environment variables for API keys (IEX Cloud, CoinGecko)
- Rate limiting configuration for free API tiers
- Caching strategy to minimize API calls

## Deployment

- Configured for Vercel deployment
- Environment variables setup in Vercel dashboard
- API routes will run as serverless functions

## Limitations & Considerations

- Free API tiers have rate limits (will implement caching)
- Indian stock data may require workarounds (Yahoo Finance or alternative free sources)
- Real-time data may be delayed (15-20 minutes for free tiers)
- Recommendations are for informational purposes only (not financial advice)