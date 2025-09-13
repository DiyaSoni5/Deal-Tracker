import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { mockAPI } from '../utils/mockData';

function DataReset({ onReset }) {
  const [showConfirm, setShowConfirm] = useState(false);

  const resetAllData = async () => {
    try {
      const api = window.electronAPI?.resetAllData ? window.electronAPI : mockAPI;
      await api.resetAllData();
      
      // Clear localStorage if any
      localStorage.clear();
      
      // Clear persistent deal state
      if (onReset) {
        onReset();
      }
      
      alert('All data has been reset successfully!');
      setShowConfirm(false);
      
      // Force reload to refresh all components
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('Error resetting data:', error);
      alert('Error resetting data');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reset Application Data</h1>
      
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
          <h2 className="text-lg font-medium text-red-800">Danger Zone</h2>
        </div>
        
        <p className="text-red-700 mb-6">
          This will permanently delete ALL data including:
        </p>
        
        <ul className="list-disc list-inside text-red-700 mb-6 space-y-1">
          <li>All suppliers</li>
          <li>All buyers</li>
          <li>All deals</li>
          <li>All brokerage records</li>
          <li>All invoices</li>
        </ul>
        
        <p className="text-red-700 font-medium mb-6">
          This action cannot be undone!
        </p>
        
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 flex items-center"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Reset All Data
          </button>
        ) : (
          <div className="space-y-4">
            <p className="text-red-800 font-medium">
              Are you absolutely sure? Type "RESET" to confirm:
            </p>
            <input
              type="text"
              placeholder="Type RESET to confirm"
              className="border border-red-300 rounded-md px-3 py-2"
              onChange={(e) => {
                if (e.target.value === 'RESET') {
                  resetAllData();
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DataReset;