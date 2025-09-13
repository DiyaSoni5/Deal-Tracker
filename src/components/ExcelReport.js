import React, { useState, useEffect } from 'react';
import { Download, FileText, Calendar } from 'lucide-react';
import { mockAPI } from '../utils/mockData';
import excelIcon from './excel.png';

function ExcelReport() {
  const [deals, setDeals] = useState([]);
  const [filteredDeals, setFilteredDeals] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    supplier: '',
    buyer: ''
  });
  const [companyName, setCompanyName] = useState('AVANTIKA COTSPIN P LTD');
  const [reportPeriod, setReportPeriod] = useState({
    start: '01.04.2024',
    end: '31.03.2025'
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

    setFilteredDeals(filtered);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const calculateAmount = (deal) => {
    let amount;
    if (deal.calculation_mode === 'per_kg' && deal.kg_per_unit) {
      amount = deal.rate * deal.quantity * deal.kg_per_unit;
    } else {
      amount = deal.rate * deal.quantity;
    }
    return amount;
  };

  const calculateBrokerage = (deal) => {
    const amount = calculateAmount(deal);
    // Apply discount first, then calculate brokerage
    const discount = (amount * (deal.discount_percent || 0)) / 100;
    const amountAfterDiscount = amount - discount;
    return (amountAfterDiscount * (deal.brokerage_percent || 0.5)) / 100;
  };

  const exportToExcel = () => {
    // Create Excel-like CSV format
    const headers = [
      'Sr No', 'DATE', 'BILL NO', 'PARTY NAME', 'BAGS', 'EX MILL RATE', 'AMT', 'BROKERAGE AMT'
    ];
    
    const csvData = filteredDeals.map((deal, index) => [
      index + 1,
      formatDate(deal.confirmation_date),
      deal.deal_id,
      deal.supplier_name,
      deal.quantity,
      deal.rate,
      calculateAmount(deal).toFixed(0),
      calculateBrokerage(deal).toFixed(1)
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${companyName.replace(/\s+/g, '_')}_${reportPeriod.start}_TO_${reportPeriod.end}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header Controls */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="w-6 h-6 mr-2" />
            Excel Format Report
          </h1>
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
          >
            <img src={excelIcon} alt="Excel" className="w-4 h-4 mr-2" />
            Export Excel
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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
        </div>

        {/* Company and Period Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period Start
            </label>
            <input
              type="text"
              value={reportPeriod.start}
              onChange={(e) => setReportPeriod({...reportPeriod, start: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="DD.MM.YYYY"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period End
            </label>
            <input
              type="text"
              value={reportPeriod.end}
              onChange={(e) => setReportPeriod({...reportPeriod, end: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="DD.MM.YYYY"
            />
          </div>
        </div>
      </div>

      {/* Excel-like Report Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Company Header */}
        <div className="text-center py-6 border-b-2 border-gray-300">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{companyName}</h2>
          <p className="text-lg text-gray-700">{reportPeriod.start} TO {reportPeriod.end}</p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="border border-gray-400 px-3 py-2 text-left font-semibold text-gray-800">Sr No</th>
                <th className="border border-gray-400 px-3 py-2 text-left font-semibold text-gray-800">DATE</th>
                <th className="border border-gray-400 px-3 py-2 text-left font-semibold text-gray-800">BILL NO</th>
                <th className="border border-gray-400 px-3 py-2 text-left font-semibold text-gray-800">PARTY NAME</th>
                <th className="border border-gray-400 px-3 py-2 text-right font-semibold text-gray-800">BAGS</th>
                <th className="border border-gray-400 px-3 py-2 text-right font-semibold text-gray-800">EX MILL RATE</th>
                <th className="border border-gray-400 px-3 py-2 text-right font-semibold text-gray-800">AMT</th>
                <th className="border border-gray-400 px-3 py-2 text-right font-semibold text-gray-800">BROKERAGE AMT</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.map((deal, index) => (
                <tr key={deal.deal_id} className="hover:bg-gray-50">
                  <td className="border border-gray-400 px-3 py-2 text-left text-gray-900">
                    {index + 1}
                  </td>
                  <td className="border border-gray-400 px-3 py-2 text-left text-gray-900">
                    {formatDate(deal.confirmation_date)}
                  </td>
                  <td className="border border-gray-400 px-3 py-2 text-left text-gray-900">
                    {deal.deal_id}
                  </td>
                  <td className="border border-gray-400 px-3 py-2 text-left text-gray-900">
                    {deal.supplier_name}
                  </td>
                  <td className="border border-gray-400 px-3 py-2 text-right text-gray-900">
                    {deal.quantity}
                  </td>
                  <td className="border border-gray-400 px-3 py-2 text-right text-gray-900">
                    {deal.rate}
                  </td>
                  <td className="border border-gray-400 px-3 py-2 text-right text-gray-900">
                    {calculateAmount(deal).toLocaleString()}
                  </td>
                  <td className="border border-gray-400 px-3 py-2 text-right text-gray-900">
                    {calculateBrokerage(deal).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Row */}
        {filteredDeals.length > 0 && (
          <div className="border-t-2 border-gray-300 bg-gray-50">
            <div className="grid grid-cols-8 gap-0">
              <div className="col-span-4 border-r border-gray-400 px-3 py-2 text-right font-semibold text-gray-800">
                TOTAL
              </div>
              <div className="border-r border-gray-400 px-3 py-2 text-right font-semibold text-gray-800">
                {filteredDeals.reduce((sum, deal) => sum + deal.quantity, 0).toLocaleString()}
              </div>
              <div className="border-r border-gray-400 px-3 py-2 text-right font-semibold text-gray-800">
                -
              </div>
              <div className="border-r border-gray-400 px-3 py-2 text-right font-semibold text-gray-800">
                {filteredDeals.reduce((sum, deal) => sum + calculateAmount(deal), 0).toLocaleString()}
              </div>
              <div className="px-3 py-2 text-right font-semibold text-gray-800">
                {filteredDeals.reduce((sum, deal) => sum + calculateBrokerage(deal), 0).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Report Info */}
      <div className="mt-4 text-center text-sm text-gray-600">
        Showing {filteredDeals.length} deals
        {filters.startDate && filters.endDate && (
          <span> from {formatDate(filters.startDate)} to {formatDate(filters.endDate)}</span>
        )}
      </div>
    </div>
  );
}

export default ExcelReport;
