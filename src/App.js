import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import DealEntry from './components/DealEntry';
import Suppliers from './components/Suppliers';
import Buyers from './components/Buyers';
import Reports from './components/Reports';
import BrokerageInvoice from './components/BrokerageInvoice';
import DataReset from './components/DataReset';
import { Home, Plus, Users, Building, FileText, Receipt, Trash2 } from 'lucide-react';



function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'deals', name: 'New Deal', icon: Plus },
    { id: 'reset', name: 'Reset Data', icon: Trash2 },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'deals':
        return <DealEntry />;
      case 'reset':
        return <DataReset />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-800">DEAL-TRACKER</h1>
            <button
              onClick={() => window.location.reload()}
              className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
            >
              Refresh
            </button>
          </div>
        </div>
        <nav className="mt-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-6 py-3 text-left hover:bg-blue-50 ${
                  activeTab === tab.id ? 'bg-blue-100 border-r-2 border-blue-500' : ''
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
}

export default App;