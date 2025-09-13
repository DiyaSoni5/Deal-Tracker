import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Building, IndianRupee, Trash2, Plus, FileText, AlertCircle, Calendar } from 'lucide-react';
import { mockAPI } from '../utils/mockData';
import excelIcon from './excel.png';
import pdfIcon from './pdf (1).png';

function Dashboard({ onNewDeal, onOpenDeal, setActiveTab }) {
  const [stats, setStats] = useState({
    totalDeals: 0,
    totalBrokerage: 0,
    pendingPayments: 0,
    thisMonthDeals: 0,
    monthName: new Date().toLocaleString('default', { month: 'long' })
  });
  const [recentDeals, setRecentDeals] = useState([]);
  const [filters, setFilters] = useState({ paymentStatus: '', dateRange: '', search: '' });
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []); // Load on mount
  
  useEffect(() => {
    loadDashboardData();
  });
  
  useEffect(() => {
    loadDashboardData();
  }, [filters]);

  const loadDashboardData = async () => {
    try {
      const api = window.electronAPI || mockAPI;
      const deals = await api.getDeals();
      
      const totalDeals = deals.length;
      const pendingPayments = deals.filter(d => (d.payment_status || 'Pending') !== 'Paid').length;
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      const thisMonthDeals = deals.filter(d => {
        const dealDate = new Date(d.confirmation_date);
        return dealDate.getMonth() === thisMonth && dealDate.getFullYear() === thisYear;
      }).length;
      
      const monthName = new Date().toLocaleString('default', { month: 'long' });
      
      const totalBrokerage = deals.reduce((sum, deal) => {
        let amount = deal.calculation_mode === 'per_kg' && deal.kg_per_unit 
          ? deal.rate * deal.quantity * deal.kg_per_unit 
          : deal.rate * deal.quantity;
        const discount = (amount * (deal.discount_percent || 0)) / 100;
        const amountAfterDiscount = amount - discount;
        return sum + ((amountAfterDiscount * (deal.brokerage_percent || 0.5)) / 100);
      }, 0);
      
      setStats({ totalDeals, totalBrokerage, pendingPayments, thisMonthDeals, monthName });
      
      const newAlerts = [];
      
      // No New Deals (7+ days)
      const latestDeal = deals.length > 0 ? Math.max(...deals.map(d => new Date(d.confirmation_date))) : 0;
      const daysSinceLastDeal = latestDeal ? Math.floor((new Date() - latestDeal) / (1000 * 60 * 60 * 24)) : 999;
      if (daysSinceLastDeal > 7) {
        newAlerts.push(`No new deals for ${daysSinceLastDeal} days - Generate more business`);
      }
      
      // Overdue Payments (30+ days) - includes Pending and Delivered
      const overdueCount = deals.filter(deal => {
        const dealDate = new Date(deal.confirmation_date);
        const daysSince = Math.floor((new Date() - dealDate) / (1000 * 60 * 60 * 24));
        return daysSince > 30 && (deal.payment_status || 'Pending') !== 'Paid';
      }).length;
      if (overdueCount > 0) {
        newAlerts.push(`${overdueCount} overdue payments (30+ days) - Follow up required`);
      }
      
      // Pending Deliveries (deals confirmed but no delivery for 15+ days)
      const pendingDeliveries = deals.filter(deal => {
        const dealDate = new Date(deal.confirmation_date);
        const daysSince = Math.floor((new Date() - dealDate) / (1000 * 60 * 60 * 24));
        return daysSince > 15 && deal.status === 'Confirmed';
      }).length;
      if (pendingDeliveries > 0) {
        newAlerts.push(`${pendingDeliveries} deals pending delivery (15+ days) - Check status`);
      }
      
      // Deal Completion Reminders (deals in-progress for 20+ days)
      const incompleteDeals = deals.filter(deal => {
        const dealDate = new Date(deal.confirmation_date);
        const daysSince = Math.floor((new Date() - dealDate) / (1000 * 60 * 60 * 24));
        return daysSince > 20 && deal.status === 'In-progress';
      }).length;
      if (incompleteDeals > 0) {
        newAlerts.push(`${incompleteDeals} deals incomplete (20+ days) - Complete pending work`);
      }
      
      // Low Stock Alerts (suppliers with no deals in 30+ days)
      const suppliers = [...new Set(deals.map(d => d.supplier_name))];
      const inactiveSuppliers = suppliers.filter(supplier => {
        const supplierDeals = deals.filter(d => d.supplier_name === supplier);
        const latestSupplierDeal = Math.max(...supplierDeals.map(d => new Date(d.confirmation_date)));
        const daysSince = Math.floor((new Date() - latestSupplierDeal) / (1000 * 60 * 60 * 24));
        return daysSince > 30;
      }).length;
      if (inactiveSuppliers > 0) {
        newAlerts.push(`${inactiveSuppliers} suppliers inactive (30+ days) - Check stock availability`);
      }
      
      setAlerts(newAlerts);
      
      let filtered = [...deals];
      if (filters.paymentStatus) filtered = filtered.filter(d => (d.payment_status || 'Pending') === filters.paymentStatus);
      if (filters.dateRange) {
        const today = new Date();
        filtered = filtered.filter(d => {
          const dealDate = new Date(d.confirmation_date);
          if (filters.dateRange === 'today') return dealDate.toDateString() === today.toDateString();
          if (filters.dateRange === 'week') return (today - dealDate) / (1000 * 60 * 60 * 24) <= 7;
          if (filters.dateRange === 'month') return dealDate.getMonth() === today.getMonth();
          return true;
        });
      }
      if (filters.search) {
        filtered = filtered.filter(d => 
          d.supplier_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
          d.buyer_name?.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      
      setRecentDeals(filtered);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const deleteDeal = async (dealId) => {
    if (window.confirm('Are you sure you want to delete this deal?')) {
      try {
        const api = window.electronAPI || mockAPI;
        await api.deleteDeal(dealId);
        loadDashboardData(); // Refresh data
      } catch (error) {
        console.error('Error deleting deal:', error);
        alert('Error deleting deal');
      }
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, onClick }) => (
    <div 
      className={`bg-white p-6 rounded-lg shadow ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <StatCard title="Total Deals" value={stats.totalDeals} icon={FileText} color="bg-blue-500" />
        <StatCard 
          title="Unpaid Deals" 
          value={stats.pendingPayments} 
          icon={AlertCircle} 
          color="bg-orange-500" 
          onClick={() => {
            setFilters({...filters, paymentStatus: 'Pending'});
          }} 
        />
        <StatCard 
          title={`${stats.monthName || 'This Month'} Deals`} 
          value={stats.thisMonthDeals} 
          icon={Calendar} 
          color="bg-green-500" 
          onClick={() => {
            setFilters({...filters, dateRange: 'month'});
          }} 
        />
        <StatCard 
          title="Total Brokerage" 
          value={`₹${stats.totalBrokerage.toLocaleString()}`} 
          icon={IndianRupee} 
          color="bg-purple-500" 
          onClick={() => {
            setFilters({paymentStatus: '', dateRange: '', search: ''});
          }} 
        />
      </div>
      
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-red-800 font-medium mb-2">⚠️ Alerts</h3>
          <ul className="text-red-700 text-sm space-y-1">
            {alerts.map((alert, index) => <li key={index}>• {alert}</li>)}
          </ul>
        </div>
      )}

      {/* Recent Deals */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Recent Deals</h2>
            <div className="flex gap-3">
            <button
              onClick={async () => {
                // Since we don't have actual delivery data, export deal summary
                const api = window.electronAPI || mockAPI;
                const allDeals = await api.getDeals();
                
                // Sort by buyer name, then by date
                allDeals.sort((a, b) => {
                  if (a.buyer_name !== b.buyer_name) {
                    return a.buyer_name.localeCompare(b.buyer_name);
                  }
                  return new Date(a.confirmation_date) - new Date(b.confirmation_date);
                });
                
                // Create Excel export with deal data
                const headers = ['Sr No', 'Date', 'Deal ID', 'Party Name', 'Supplier', 'Product', 'Bags', 'Ex Mill Rate', 'Amount', 'Brokerage Amount', 'Status'];
                let csv = headers.join(',') + '\n';
                
                allDeals.forEach((deal, index) => {
                  // Calculate correct brokerage
                  let amount;
                  if (deal.calculation_mode === 'per_kg' && deal.kg_per_unit) {
                    amount = deal.rate * deal.quantity * deal.kg_per_unit;
                  } else {
                    amount = deal.rate * deal.quantity;
                  }
                  const discount = (amount * (deal.discount_percent || 0)) / 100;
                  const amountAfterDiscount = amount - discount;
                  const brokerage = (amountAfterDiscount * (deal.brokerage_percent || 0.5)) / 100;
                  
                  const row = [
                    index + 1,
                    new Date(deal.confirmation_date).toLocaleDateString('en-GB'),
                    deal.deal_id,
                    deal.buyer_name,
                    deal.supplier_name,
                    deal.product_name,
                    deal.quantity,
                    deal.rate,
                    Math.round(amountAfterDiscount),
                    Math.round(brokerage),
                    deal.payment_status || 'Pending'
                  ];
                  csv += row.join(',') + '\n';
                });
                
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Deal_Transactions_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <img src={excelIcon} alt="Excel" className="w-4 h-4" />
              Export Excel
            </button>
            <button
              onClick={() => onNewDeal && onNewDeal()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Deal
            </button>
            </div>
          </div>
          
          {/* Quick Filters */}
          <div className="flex gap-3 text-sm">
            <select value={filters.paymentStatus} onChange={(e) => setFilters({...filters, paymentStatus: e.target.value})} className="border border-gray-300 rounded px-2 py-1">
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Delivered">Delivered</option>
              <option value="Paid">Paid</option>
            </select>
            <select value={filters.dateRange} onChange={(e) => setFilters({...filters, dateRange: e.target.value})} className="border border-gray-300 rounded px-2 py-1">
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <input type="text" value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} placeholder="Search supplier/buyer..." className="border border-gray-300 rounded px-2 py-1 w-48" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Buyer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Brokerage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentDeals.map((deal) => (
                <tr 
                  key={deal.deal_id}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onOpenDeal && onOpenDeal(deal)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(deal.confirmation_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {deal.supplier_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {deal.buyer_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {deal.product_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {deal.quantity} {deal.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{deal.rate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                    ₹{(() => {
                      if (deal.brokerage_amount) {
                        return deal.brokerage_amount.toLocaleString('en-IN');
                      }
                      let amount;
                      if (deal.calculation_mode === 'per_kg' && deal.kg_per_unit) {
                        amount = deal.rate * deal.quantity * deal.kg_per_unit;
                      } else {
                        amount = deal.rate * deal.quantity;
                      }
                      // Calculate brokerage on amount after discount (without GST)
                      const discount = (amount * (deal.discount_percent || 0)) / 100;
                      const amountAfterDiscount = amount - discount;
                      return ((amountAfterDiscount * (deal.brokerage_percent || 0.5)) / 100).toLocaleString('en-IN');
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {(deal.payment_status === 'Delivered' || deal.payment_status === 'Paid') ? (
                      <select
                        onClick={(e) => e.stopPropagation()}
                        value={deal.payment_status}
                        onChange={async (e) => {
                          const api = window.electronAPI || mockAPI;
                          await api.updateDealPayment(deal.deal_id, e.target.value);
                          loadDashboardData();
                        }}
                        className={`px-2 py-1 rounded text-xs font-medium cursor-pointer ${
                          deal.payment_status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        <option value="Delivered">Delivered</option>
                        <option value="Paid">Paid</option>
                      </select>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                        {deal.payment_status || 'Pending'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDeal(deal.deal_id);
                        }}
                        className="text-red-600 hover:text-red-800"
                        title="Delete Deal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;