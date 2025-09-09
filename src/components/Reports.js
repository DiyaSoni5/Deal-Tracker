import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar } from 'lucide-react';
import { mockAPI } from '../utils/mockData';

function Reports() {
  const [deals, setDeals] = useState([]);
  const [filteredDeals, setFilteredDeals] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    supplier: '',
    buyer: '',
    status: ''
  });
  const [summary, setSummary] = useState({
    totalDeals: 0,
    totalAmount: 0,
    totalBrokerage: 0,
    totalGST: 0
  });

  useEffect(() => {
    loadDeals();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [deals, filters]);

  const loadDeals = async () => {
    try {
      const api = window.electronAPI || mockAPI;
      const data = await api.getDeals();
      setDeals(data);
    } catch (error) {
      console.error('Error loading deals:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...deals];

    if (filters.startDate) {
      filtered = filtered.filter(deal => 
        new Date(deal.confirmation_date) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(deal => 
        new Date(deal.confirmation_date) <= new Date(filters.endDate)
      );
    }

    if (filters.supplier) {
      filtered = filtered.filter(deal => 
        deal.supplier_name?.toLowerCase().includes(filters.supplier.toLowerCase())
      );
    }

    if (filters.buyer) {
      filtered = filtered.filter(deal => 
        deal.buyer_name?.toLowerCase().includes(filters.buyer.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter(deal => deal.status === filters.status);
    }

    setFilteredDeals(filtered);

    // Calculate summary
    const totalDeals = filtered.length;
    const totalAmount = filtered.reduce((sum, deal) => {
      const amount = deal.rate * deal.quantity;
      const gst = (amount * deal.gst_percent) / 100;
      return sum + amount + gst;
    }, 0);
    const totalBrokerage = filtered.reduce((sum, deal) => {
      return sum + ((deal.rate * deal.quantity * deal.brokerage_percent) / 100);
    }, 0);
    const totalGST = filtered.reduce((sum, deal) => {
      const amount = deal.rate * deal.quantity;
      return sum + ((amount * deal.gst_percent) / 100);
    }, 0);

    setSummary({ totalDeals, totalAmount, totalBrokerage, totalGST });
  };

  const exportToCSV = () => {
    const headers = [
      'Date', 'Supplier', 'Buyer', 'Product', 'Quantity', 'Rate', 
      'Amount', 'Discount%', 'GST%', 'Brokerage%', 'Brokerage Amount', 'Status'
    ];
    
    const csvData = filteredDeals.map(deal => [
      new Date(deal.confirmation_date).toLocaleDateString(),
      deal.supplier_name,
      deal.buyer_name,
      deal.product_name,
      `${deal.quantity} ${deal.unit}`,
      deal.rate,
      deal.rate * deal.quantity,
      deal.discount_percent,
      deal.gst_percent,
      deal.brokerage_percent,
      ((deal.rate * deal.quantity * deal.brokerage_percent) / 100).toFixed(2),
      deal.status
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deals-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <button
          onClick={exportToCSV}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-medium mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Filters
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier
            </label>
            <input
              type="text"
              value={filters.supplier}
              onChange={(e) => setFilters({...filters, supplier: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Search supplier..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buyer
            </label>
            <input
              type="text"
              value={filters.buyer}
              onChange={(e) => setFilters({...filters, buyer: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Search buyer..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Status</option>
              <option value="Confirmed">Confirmed</option>
              <option value="In-progress">In-progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Total Deals</div>
          <div className="text-2xl font-semibold text-gray-900">{summary.totalDeals}</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Total Amount</div>
          <div className="text-2xl font-semibold text-gray-900">₹{summary.totalAmount.toLocaleString()}</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Total Brokerage</div>
          <div className="text-2xl font-semibold text-green-600">₹{summary.totalBrokerage.toLocaleString()}</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Total GST</div>
          <div className="text-2xl font-semibold text-gray-900">₹{summary.totalGST.toLocaleString()}</div>
        </div>
      </div>

      {/* Deals Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Deals Report ({filteredDeals.length} deals)
          </h2>
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDeals.map((deal) => (
                <tr key={deal.deal_id}>
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
                    ₹{((deal.rate * deal.quantity * deal.brokerage_percent) / 100).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      deal.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      deal.status === 'In-progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {deal.status}
                    </span>
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

export default Reports;