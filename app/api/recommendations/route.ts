import { NextRequest, NextResponse } from 'next/server';
import { Asset, Recommendation } from '@/types';
import { createRecommendation } from '@/lib/utils/scoring';

export async function GET(request: NextRequest) {
  try {
    const assetType = request.nextUrl.searchParams.get('type'); // 'us_stock', 'indian_stock', 'crypto', or null for all

    const recommendations: Recommendation[] = [];
    const allAssets: Asset[] = [];

    // Fetch US stocks
    if (!assetType || assetType === 'us_stock') {
      try {
        const usResponse = await fetch(`${request.nextUrl.origin}/api/stocks/us`);
        if (usResponse.ok) {
          const usData = await usResponse.json();
          if (usData.assets) {
            allAssets.push(...usData.assets);
          } else if (usData.asset) {
            allAssets.push(usData.asset);
          }
        }
      } catch (error) {
        console.error('Error fetching US stocks:', error);
      }
    }

    // Fetch Indian stocks
    if (!assetType || assetType === 'indian_stock') {
      try {
        const indiaResponse = await fetch(`${request.nextUrl.origin}/api/stocks/india`);
        if (indiaResponse.ok) {
          const indiaData = await indiaResponse.json();
          if (indiaData.assets) {
            allAssets.push(...indiaData.assets);
          } else if (indiaData.asset) {
            allAssets.push(indiaData.asset);
          }
        }
      } catch (error) {
        console.error('Error fetching Indian stocks:', error);
      }
    }

    // Fetch cryptocurrencies
    if (!assetType || assetType === 'crypto') {
      try {
        const cryptoResponse = await fetch(`${request.nextUrl.origin}/api/crypto`);
        if (cryptoResponse.ok) {
          const cryptoData = await cryptoResponse.json();
          if (cryptoData.assets) {
            allAssets.push(...cryptoData.assets);
          } else if (cryptoData.asset) {
            allAssets.push(cryptoData.asset);
          }
        }
      } catch (error) {
        console.error('Error fetching crypto:', error);
      }
    }

    // Filter by confidence and create recommendations
    const filteredAssets = allAssets.filter(asset => asset.confidence >= 0);
    
    // Sort by overall score
    filteredAssets.sort((a, b) => b.overallScore - a.overallScore);

    // Create recommendations for top assets
    const topAssets = filteredAssets.slice(0, 20); // Top 20 recommendations
    recommendations.push(...topAssets.map(asset => createRecommendation(asset)));

    return NextResponse.json({
      recommendations,
      total: recommendations.length,
      filtered: filteredAssets.length,
      totalAnalyzed: allAssets.length,
    });
  } catch (error) {
    console.error('Error in recommendations API:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

