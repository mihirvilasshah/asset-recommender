'use client';

import { AssetType } from '@/types';

interface AssetTypeTabsProps {
  selectedType: AssetType | 'all';
  onTypeChange: (type: AssetType | 'all') => void;
}

export default function AssetTypeTabs({ selectedType, onTypeChange }: AssetTypeTabsProps) {
  const tabs = [
    { id: 'all' as const, label: 'All Assets' },
    { id: 'us_stock' as const, label: 'US Stocks' },
    { id: 'indian_stock' as const, label: 'Indian Stocks' },
    { id: 'crypto' as const, label: 'Cryptocurrency' },
  ];

  return (
    <div className="flex space-x-2 mb-6 border-b border-gray-200 dark:border-gray-700">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTypeChange(tab.id)}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            selectedType === tab.id
              ? 'border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

