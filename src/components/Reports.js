import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar } from 'lucide-react';
import { mockAPI } from '../utils/mockData';
import excelIcon from './excel.png';

function Reports({ onOpenDeal, initialFilters }) {
  const [deals, setDeals] = useState([]);
  const [filteredDeals, setFilteredDeals] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    supplier: '',
    buyer: '',
    status: initialFilters?.status || '',
    dateRange: initialFilters?.dateRange || ''
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
      filtered = filtered.filter(deal => (deal.payment_status || 'Pending') === filters.status);
    }
    
    if (filters.dateRange === 'month') {
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      filtered = filtered.filter(deal => {
        const dealDate = new Date(deal.confirmation_date);
        return dealDate.getMonth() === thisMonth && dealDate.getFullYear() === thisYear;
      });
    }


    setFilteredDeals(filtered);

    // Calculate summary with correct formulas
    const totalDeals = filtered.length;
    const totalAmount = filtered.reduce((sum, deal) => {
      let amount;
      if (deal.calculation_mode === 'per_kg' && deal.kg_per_unit) {
        amount = deal.rate * deal.quantity * deal.kg_per_unit;
      } else {
        amount = deal.rate * deal.quantity;
      }
      const discount = (amount * (deal.discount_percent || 0)) / 100;
      const amountAfterDiscount = amount - discount;
      const gst = (amountAfterDiscount * (deal.gst_percent || 0)) / 100;
      return sum + amountAfterDiscount + gst; // Total with GST
    }, 0);
    const totalBrokerage = filtered.reduce((sum, deal) => {
      let amount;
      if (deal.calculation_mode === 'per_kg' && deal.kg_per_unit) {
        amount = deal.rate * deal.quantity * deal.kg_per_unit;
      } else {
        amount = deal.rate * deal.quantity;
      }
      const discount = (amount * (deal.discount_percent || 0)) / 100;
      const amountAfterDiscount = amount - discount;
      return sum + ((amountAfterDiscount * (deal.brokerage_percent || 0.5)) / 100);
    }, 0);
    const totalGST = filtered.reduce((sum, deal) => {
      let amount;
      if (deal.calculation_mode === 'per_kg' && deal.kg_per_unit) {
        amount = deal.rate * deal.quantity * deal.kg_per_unit;
      } else {
        amount = deal.rate * deal.quantity;
      }
      const discount = (amount * (deal.discount_percent || 0)) / 100;
      const amountAfterDiscount = amount - discount;
      return sum + ((amountAfterDiscount * (deal.gst_percent || 0)) / 100);
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
          <img src={excelIcon} alt="Excel" className="w-4 h-4 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Compact Filters */}
      <div className="bg-white p-3 rounded-lg shadow mb-4">
        <div className="flex items-center gap-3 text-sm">
          <input type="date" value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value})} className="border border-gray-300 rounded px-2 py-1" placeholder="Start Date" />
          <input type="date" value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value})} className="border border-gray-300 rounded px-2 py-1" placeholder="End Date" />
          <input type="text" value={filters.supplier} onChange={(e) => setFilters({...filters, supplier: e.target.value})} className="border border-gray-300 rounded px-2 py-1 w-32" placeholder="Supplier..." />
          <input type="text" value={filters.buyer} onChange={(e) => setFilters({...filters, buyer: e.target.value})} className="border border-gray-300 rounded px-2 py-1 w-32" placeholder="Buyer..." />
          <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className="border border-gray-300 rounded px-2 py-1">
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Delivered">Delivered</option>
            <option value="Paid">Paid</option>
          </select>
          {(filters.status || filters.dateRange || initialFilters) && (
            <button onClick={() => setFilters({startDate: '', endDate: '', supplier: '', buyer: '', status: '', dateRange: ''})} className="bg-gray-500 text-white px-2 py-1 rounded text-xs">
              Clear Filters
            </button>
          )}
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
                      let amount;
                      if (deal.calculation_mode === 'per_kg' && deal.kg_per_unit) {
                        amount = deal.rate * deal.quantity * deal.kg_per_unit;
                      } else {
                        amount = deal.rate * deal.quantity;
                      }
                      // Apply discount first, then calculate brokerage
                      const discount = (amount * (deal.discount_percent || 0)) / 100;
                      const amountAfterDiscount = amount - discount;
                      return ((amountAfterDiscount * (deal.brokerage_percent || 0.5)) / 100).toLocaleString();
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(deal.payment_status === 'Delivered' || deal.payment_status === 'Paid') ? (
                      <select
                        onClick={(e) => e.stopPropagation()}
                        value={deal.payment_status}
                        onChange={async (e) => {
                          const api = window.electronAPI || mockAPI;
                          await api.updateDealPayment(deal.deal_id, e.target.value);
                          loadDeals();
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