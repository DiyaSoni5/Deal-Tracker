import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import DealEntry from './components/DealEntry';
import Suppliers from './components/Suppliers';
import Buyers from './components/Buyers';
import Reports from './components/Reports';
import BrokerageInvoice from './components/BrokerageInvoice';
import DataReset from './components/DataReset';
import GoodsDelivered from './components/GoodsDelivered';
import DealDetails from './components/DealDetails';
import { Home, Plus, Users, Building, FileText, Receipt, Trash2 } from 'lucide-react';



function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [openedDeal, setOpenedDeal] = useState(null);
  const [dashboardKey, setDashboardKey] = useState(0);
  const [reportsFilters, setReportsFilters] = useState({});
  
  // Persistent deal state
  const [persistentDeal, setPersistentDeal] = useState({
    supplier_id: '',
    buyer_id: '',
    confirmation_date: new Date().toISOString().split('T')[0],
    product_name: '',
    rate: '',
    quantity: '',
    unit: 'bags',
    kg_per_unit: 50,
    calculation_mode: 'per_kg',
    discount_percent: 0,
    brokerage_percent: 0.5,
    gst_percent: 5,
    brokerage_gst_enabled: false,
    brokerage_gst_percent: 18,
    status: 'Confirmed'
  });

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'deals', name: 'New Deal', icon: Plus },
    { id: 'reports', name: 'All Deals', icon: FileText },
    { id: 'deliveries', name: 'Goods Delivered', icon: Receipt },
    { id: 'reset', name: 'Reset Data', icon: Trash2 },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard key={dashboardKey} onNewDeal={() => setActiveTab('deals')} onOpenDeal={(deal) => { setOpenedDeal(deal); setActiveTab('dealDetails'); }} setActiveTab={(tab, filters) => { if (filters) setReportsFilters(filters); setActiveTab(tab); }} setPersistentDeal={setPersistentDeal} />;
      case 'deals':
        return <DealEntry persistentDeal={persistentDeal} setPersistentDeal={setPersistentDeal} />;
      case 'dealDetails':
        return <DealDetails deal={openedDeal} onBack={() => setActiveTab('dashboard')} setActiveTab={setActiveTab} setPersistentDeal={setPersistentDeal} />;
      case 'reports':
        return <Reports onOpenDeal={(deal) => { setOpenedDeal(deal); setActiveTab('dealDetails'); }} initialFilters={reportsFilters} />;
      case 'deliveries':
        return <GoodsDelivered />;

      case 'reset':
        return <DataReset onReset={() => setPersistentDeal({
          supplier_id: '',
          buyer_id: '',
          confirmation_date: new Date().toISOString().split('T')[0],
          product_name: '',
          rate: '',
          quantity: '',
          unit: 'bags',
          kg_per_unit: 50,
          calculation_mode: 'per_kg',
          discount_percent: 0,
          brokerage_percent: 0.5,
          gst_percent: 5,
          brokerage_gst_enabled: false,
          brokerage_gst_percent: 18,
          status: 'Confirmed'
        })} />;
      default:
        return <Dashboard onNewDeal={() => setActiveTab('deals')} onOpenDeal={(deal) => { setOpenedDeal(deal); setActiveTab('dealDetails'); }} setActiveTab={setActiveTab} setPersistentDeal={setPersistentDeal} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-800">DEAL-TRACKER</h1>
        </div>
        <nav className="mt-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id !== 'reports') setReportsFilters({}); // Clear filters when not going to reports
                  setActiveTab(tab.id);
                  if (tab.id === 'dashboard') {
                    setTimeout(() => setDashboardKey(prev => prev + 1), 0);
                  }
                }}
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