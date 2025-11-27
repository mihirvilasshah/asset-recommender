# Asset Recommender

A Next.js web application that analyzes and recommends investments across Indian stocks, US stocks, and cryptocurrency using technical analysis, momentum indicators, trend analysis, and fundamental metrics.

## Features

- **Multi-Asset Analysis**: Analyzes US stocks, Indian stocks, and cryptocurrencies
- **Technical Indicators**: RSI, MACD, Moving Averages, Bollinger Bands, Stochastic, ADX, and more
- **Momentum Scoring**: Combines multiple indicators to generate momentum scores
- **Trend Analysis**: Identifies uptrends/downtrends using moving averages
- **Fundamental Analysis**: Basic fundamental metrics (P/E ratio, market cap, volume trends)
- **Smart Recommendations**: Scores and ranks assets based on combined signals

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd asset-recommender
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your API keys:
```
IEX_CLOUD_API_KEY=your_iex_cloud_api_key_here
COINGECKO_API_KEY=your_coingecko_api_key_here (optional)
```

### Getting API Keys

- **IEX Cloud**: Get a free API key at [https://iexcloud.io/console/](https://iexcloud.io/console/) (Free tier: 100,000 messages/month)
- **CoinGecko Demo API**: 
  - Sign up for a free CoinGecko account at [https://www.coingecko.com/en/api](https://www.coingecko.com/en/api)
  - Navigate to the [Developer's Dashboard](https://www.coingecko.com/en/developers/dashboard)
  - Click "+ Add New Key" to generate a Demo API key
  - Add the key to your `.env.local` file as `COINGECKO_API_KEY` 
  - See the [User Guide](https://support.coingecko.com/hc/en-us/articles/21880397454233-User-Guide-How-to-sign-up-for-CoinGecko-Demo-API-and-generate-an-API-key) for detailed instructions

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Deployment to Vercel

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - `IEX_CLOUD_API_KEY`
   - `COINGECKO_API_KEY` (optional)
4. Deploy!

The app will be automatically deployed and available at your Vercel URL.

## Project Structure

```
/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   ├── page.tsx          # Main dashboard
│   └── globals.css       # Global styles
├── components/            # React components
├── lib/                   # Core logic
│   ├── data/             # API clients
│   ├── analysis/         # Analysis modules
│   └── utils/            # Utility functions
└── types/                # TypeScript types
```

## API Endpoints

- `GET /api/stocks/us` - Fetch and analyze US stocks
- `GET /api/stocks/india` - Fetch and analyze Indian stocks
- `GET /api/crypto` - Fetch and analyze cryptocurrency
- `GET /api/recommendations` - Get combined recommendations

## Limitations

- Free API tiers have rate limits (caching is implemented to minimize calls)
- Real-time data may be delayed (15-20 minutes for free tiers)
- Recommendations are for informational purposes only (not financial advice)

## Disclaimer

This application provides investment recommendations based on technical analysis and should not be considered as financial advice. Always do your own research and consult with a financial advisor before making investment decisions.

## License

MIT

