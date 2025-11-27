'use client';

import { useState, useEffect } from 'react';
import { Recommendation, AssetType } from '@/types';
import RecommendationCard from '@/components/RecommendationCard';
import AssetTypeTabs from '@/components/AssetTypeTabs';
import LoadingSpinner from '@/components/LoadingSpinner';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<AssetType | 'all'>('all');

  useEffect(() => {
    fetchRecommendations();
  }, [selectedType]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const typeParam = selectedType === 'all' ? '' : `?type=${selectedType}`;
      const response = await fetch(`/api/recommendations${typeParam}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecommendations = selectedType === 'all'
    ? recommendations
    : recommendations.filter(rec => rec.asset.type === selectedType);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ThemeToggle />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Asset Recommender
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            AI-powered investment recommendations based on technical analysis, momentum, trends, and fundamentals
          </p>
        </div>

        <AssetTypeTabs selectedType={selectedType} onTypeChange={setSelectedType} />

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <button
              onClick={fetchRecommendations}
              className="mt-2 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 dark:hover:bg-red-800"
            >
              Retry
            </button>
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200">No recommendations available at this time.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredRecommendations.length} recommendation{filteredRecommendations.length !== 1 ? 's' : ''}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecommendations.map((recommendation, index) => (
                <RecommendationCard key={`${recommendation.asset.symbol}-${index}`} recommendation={recommendation} />
              ))}
            </div>
          </>
        )}

        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Disclaimer:</strong> These recommendations are for informational purposes only and should not be considered as financial advice. 
            Always do your own research and consult with a financial advisor before making investment decisions.
          </p>
        </div>
      </div>
    </main>
  );
}

