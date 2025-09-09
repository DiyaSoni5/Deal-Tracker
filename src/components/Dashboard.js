import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Building, IndianRupee, Trash2 } from 'lucide-react';
import { mockAPI } from '../utils/mockData';

function Dashboard() {
  const [stats, setStats] = useState({
    totalDeals: 0,
    totalBrokerage: 0,
    pendingBrokerage: 0
  });
  const [recentDeals, setRecentDeals] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const api = window.electronAPI || mockAPI;
      const dashboardStats = await api.getDashboardStats();
      const deals = await api.getDeals();
      
      setStats(dashboardStats);
      setRecentDeals(deals.slice(0, 5)); // Show last 5 deals
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

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-lg shadow">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Deals"
          value={stats.totalDeals}
          icon={TrendingUp}
          color="bg-blue-500"
        />
        <StatCard
          title="Total Brokerage"
          value={`₹${stats.totalBrokerage?.toLocaleString() || 0}`}
          icon={IndianRupee}
          color="bg-green-500"
        />
        <StatCard
          title="Pending Brokerage"
          value={`₹${stats.pendingBrokerage?.toLocaleString() || 0}`}
          icon={Users}
          color="bg-orange-500"
        />
      </div>

      {/* Recent Deals */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Deals</h2>
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
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentDeals.map((deal) => (
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const amount = deal.rate * deal.quantity;
                          const discount = (amount * deal.discount_percent) / 100;
                          const afterDiscount = amount - discount;
                          const gst = (afterDiscount * deal.gst_percent) / 100;
                          const total = afterDiscount + gst;
                          const brokerage = (amount * deal.brokerage_percent) / 100;
                          
                          const csvData = [
                            ['Deal Information', '', '', '', '', '', ''],
                            ['Deal ID', 'Date', 'Supplier', 'Buyer', 'Product', 'Rate', 'Quantity'],
                            [deal.deal_id, new Date(deal.confirmation_date).toLocaleDateString(), deal.supplier_name, deal.buyer_name, deal.product_name, deal.rate, deal.quantity + ' ' + deal.unit],
                            ['', '', '', '', '', '', ''],
                            ['Calculations', '', '', '', '', '', ''],
                            ['Description', 'Percentage', 'Amount', '', '', '', ''],
                            ['Base Amount', '', amount.toFixed(2), '', '', '', ''],
                            ['Cash Discount', deal.discount_percent + '%', '-' + discount.toFixed(2), '', '', '', ''],
                            ['GST', deal.gst_percent + '%', gst.toFixed(2), '', '', '', ''],
                            ['Total Amount', '', total.toFixed(2), '', '', '', ''],
                            ['Your Brokerage', deal.brokerage_percent + '%', brokerage.toFixed(2), '', '', '', '']
                          ];
                          
                          const csvContent = csvData.map(row => row.join(',')).join('\n');
                          const blob = new Blob([csvContent], { type: 'text/csv' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `Deal_${deal.deal_id}_${deal.supplier_name}_${new Date().toISOString().split('T')[0]}.csv`;
                          a.click();
                          window.URL.revokeObjectURL(url);
                        }}
                        className="text-green-600 hover:text-green-800"
                        title="Export to Excel"
                      >
                        📈
                      </button>
                      <button
                        onClick={() => {
                          const amount = deal.rate * deal.quantity;
                          const brokerage = (amount * deal.brokerage_percent) / 100;
                          
                          const billHTML = `
                            <html>
                              <head>
                                <title>Brokerage Bill - Deal #${deal.deal_id}</title>
                                <style>
                                  body { font-family: Arial, sans-serif; margin: 20px; }
                                  .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
                                  .company { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                                  .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                                  .table th, .table td { border: 1px solid #000; padding: 10px; text-align: left; }
                                  .table th { background-color: #f0f0f0; font-weight: bold; }
                                  .total-row { background-color: #f9f9f9; font-weight: bold; }
                                  .amount { text-align: right; }
                                </style>
                              </head>
                              <body>
                                <div class="header">
                                  <div class="company">DEAL-TRACKER BROKERAGE</div>
                                  <div>Contact: +91-XXXXXXXXXX | Email: broker@dealtracker.com</div>
                                </div>
                                
                                <div style="margin-bottom: 20px;">
                                  <strong>Bill No:</strong> BRK-${deal.deal_id}-${Date.now()}<br>
                                  <strong>Date:</strong> ${new Date().toLocaleDateString()}<br>
                                  <strong>Deal Date:</strong> ${new Date(deal.confirmation_date).toLocaleDateString()}
                                </div>
                                
                                <div style="margin-bottom: 20px;">
                                  <strong>Bill To:</strong><br>
                                  <strong>Supplier:</strong> ${deal.supplier_name}<br>
                                  <strong>Buyer:</strong> ${deal.buyer_name}
                                </div>
                                
                                <table class="table">
                                  <thead>
                                    <tr>
                                      <th>Description</th>
                                      <th>Product</th>
                                      <th>Quantity</th>
                                      <th>Rate</th>
                                      <th>Amount</th>
                                      <th>Brokerage %</th>
                                      <th class="amount">Brokerage Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td>Brokerage Services</td>
                                      <td>${deal.product_name}</td>
                                      <td>${deal.quantity} ${deal.unit}</td>
                                      <td class="amount">₹${parseFloat(deal.rate).toLocaleString()}</td>
                                      <td class="amount">₹${amount.toLocaleString()}</td>
                                      <td class="amount">${deal.brokerage_percent}%</td>
                                      <td class="amount">₹${brokerage.toLocaleString()}</td>
                                    </tr>
                                    <tr class="total-row">
                                      <td colspan="6"><strong>Total Brokerage Amount</strong></td>
                                      <td class="amount"><strong>₹${brokerage.toLocaleString()}</strong></td>
                                    </tr>
                                    <tr>
                                      <td colspan="6">GST @ 18%</td>
                                      <td class="amount">₹${(brokerage * 0.18).toLocaleString()}</td>
                                    </tr>
                                    <tr class="total-row">
                                      <td colspan="6"><strong>Grand Total</strong></td>
                                      <td class="amount"><strong>₹${(brokerage * 1.18).toLocaleString()}</strong></td>
                                    </tr>
                                  </tbody>
                                </table>
                                
                                <div style="margin-top: 40px;">
                                  <p><strong>Payment Terms:</strong> 30 days from invoice date</p>
                                  <p><strong>Thank you for your business!</strong></p>
                                </div>
                              </body>
                            </html>
                          `;
                          
                          const newWindow = window.open('', '_blank');
                          newWindow.document.write(billHTML);
                          newWindow.document.close();
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="Generate Brokerage Bill"
                      >
                        📜
                      </button>
                      <button
                        onClick={() => deleteDeal(deal.deal_id)}
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