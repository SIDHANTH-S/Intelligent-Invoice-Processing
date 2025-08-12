import React, { useState } from 'react';
import { CleaningOptions as CleaningOptionsType } from '../types/data';
import { Settings, Play } from 'lucide-react';

interface CleaningOptionsProps {
  onCleanData: (options: CleaningOptionsType) => void;
  isLoading: boolean;
}

export const CleaningOptions: React.FC<CleaningOptionsProps> = ({ onCleanData, isLoading }) => {
  const [options, setOptions] = useState<CleaningOptionsType>({
    handleMissing: 'mean',
    handleDuplicates: 'remove_first',
    handleOutliers: 'cap',
    standardizeText: true,
    validateFormats: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCleanData(options);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 w-12 h-12 rounded-full flex items-center justify-center">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Cleaning Configuration</h3>
          <p className="text-gray-600">Configure how you want to clean your data</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Missing Values */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Handle Missing Values
            </label>
            <select
              value={options.handleMissing}
              onChange={(e) => setOptions({...options, handleMissing: e.target.value as any})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="mean">Replace with Mean (numeric)</option>
              <option value="median">Replace with Median (numeric)</option>
              <option value="mode">Replace with Mode (most frequent)</option>
              <option value="forward_fill">Forward Fill</option>
              <option value="backward_fill">Backward Fill</option>
              <option value="remove">Remove rows with missing values</option>
            </select>
          </div>

          {/* Duplicates */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Handle Duplicate Rows
            </label>
            <select
              value={options.handleDuplicates}
              onChange={(e) => setOptions({...options, handleDuplicates: e.target.value as any})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="remove_first">Keep last occurrence</option>
              <option value="remove_last">Keep first occurrence</option>
              <option value="remove_all">Remove all duplicates</option>
            </select>
          </div>

          {/* Outliers */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Handle Outliers
            </label>
            <select
              value={options.handleOutliers}
              onChange={(e) => setOptions({...options, handleOutliers: e.target.value as any})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="cap">Cap at boundaries (IQR method)</option>
              <option value="remove">Remove outlier rows</option>
              <option value="keep">Keep outliers unchanged</option>
            </select>
          </div>

          {/* Text Standardization */}
          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={options.standardizeText}
                onChange={(e) => setOptions({...options, standardizeText: e.target.checked})}
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Standardize Text Formatting
              </span>
            </label>
            <p className="text-xs text-gray-500 ml-8">
              Trim whitespace, normalize spacing, and fix basic formatting issues
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <Play className="w-5 h-5" />
            <span>{isLoading ? 'Cleaning Data...' : 'Clean Data'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};