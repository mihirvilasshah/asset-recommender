'use client';

import { Recommendation } from '@/types';

interface RecommendationCardProps {
  recommendation: Recommendation;
}

export default function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const { asset, reasoning, keyMetrics } = recommendation;

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'strong_buy':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'buy':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'hold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'sell':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'strong_sell':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRecommendationLabel = (rec: string) => {
    return rec.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-blue-600';
    if (score >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAssetTypeLabel = (type: string) => {
    switch (type) {
      case 'us_stock':
        return 'US Stock';
      case 'indian_stock':
        return 'Indian Stock';
      case 'crypto':
        return 'Crypto';
      default:
        return type;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{asset.name}</h3>
          <p className="text-sm text-gray-500">{asset.symbol} • {getAssetTypeLabel(asset.type)}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRecommendationColor(asset.recommendation)}`}>
          {getRecommendationLabel(asset.recommendation)}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center space-x-4">
          <div>
            <p className="text-2xl font-bold text-gray-900">${asset.currentPrice.toFixed(2)}</p>
            <p className={`text-sm ${asset.priceChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {asset.priceChangePercent >= 0 ? '+' : ''}{asset.priceChangePercent.toFixed(2)}%
            </p>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Overall Score</span>
              <span className={`text-lg font-bold ${getScoreColor(asset.overallScore)}`}>
                {asset.overallScore.toFixed(1)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  asset.overallScore >= 70 ? 'bg-green-500' :
                  asset.overallScore >= 50 ? 'bg-blue-500' :
                  asset.overallScore >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${asset.overallScore}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {keyMetrics.slice(0, 4).map((metric, index) => (
          <div key={index} className="bg-gray-50 p-2 rounded">
            <p className="text-xs text-gray-500">{metric.label}</p>
            <p className="text-sm font-semibold text-gray-900">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">Key Insights:</p>
        <ul className="space-y-1">
          {reasoning.slice(0, 3).map((reason, index) => (
            <li key={index} className="text-xs text-gray-600 flex items-start">
              <span className="mr-2">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 pt-4 border-t">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Confidence: {asset.confidence.toFixed(1)}%</span>
          <span>Momentum: {asset.momentum.score.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}

