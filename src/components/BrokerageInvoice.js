import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer } from 'lucide-react';
import { mockAPI } from '../utils/mockData';

function BrokerageInvoice() {
  const [deals, setDeals] = useState([]);
  const [selectedDeals, setSelectedDeals] = useState([]);
  const [invoiceData, setInvoiceData] = useState({
    invoiceNo: `INV-${Date.now()}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    brokerName: 'Your Broker Name',
    brokerAddress: 'Your Address',
    brokerGST: 'Your GST Number'
  });

  useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    try {
      const api = window.electronAPI || mockAPI;
      const data = await api.getDeals();
      setDeals(data);
    } catch (error) {
      console.error('Error loading deals:', error);
    }
  };

  const handleDealSelect = (dealId) => {
    setSelectedDeals(prev => 
      prev.includes(dealId) 
        ? prev.filter(id => id !== dealId)
        : [...prev, dealId]
    );
  };

  const calculateTotalBrokerage = () => {
    return selectedDeals.reduce((total, dealId) => {
      const deal = deals.find(d => d.deal_id === dealId);
      if (deal) {
        const amount = deal.rate * deal.quantity;
        const brokerage = (amount * deal.brokerage_percent) / 100;
        return total + brokerage;
      }
      return total;
    }, 0);
  };

  const generateInvoice = () => {
    const selectedDealData = selectedDeals.map(dealId => 
      deals.find(d => d.deal_id === dealId)
    );
    
    const totalBrokerage = calculateTotalBrokerage();
    const gstAmount = (totalBrokerage * 18) / 100; // 18% GST on brokerage
    const totalAmount = totalBrokerage + gstAmount;

    const invoiceHTML = `
      <html>
        <head>
          <title>Brokerage Invoice</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .invoice-details { margin: 20px 0; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #000; padding: 8px; text-align: left; }
            .table th { background-color: #f0f0f0; }
            .total { text-align: right; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>BROKERAGE INVOICE</h1>
            <p>${invoiceData.brokerName}</p>
            <p>${invoiceData.brokerAddress}</p>
            <p>GST: ${invoiceData.brokerGST}</p>
          </div>
          
          <div class="invoice-details">
            <p><strong>Invoice No:</strong> ${invoiceData.invoiceNo}</p>
            <p><strong>Date:</strong> ${new Date(invoiceData.invoiceDate).toLocaleDateString()}</p>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Deal Date</th>
                <th>Supplier</th>
                <th>Buyer</th>
                <th>Product</th>
                <th>Amount</th>
                <th>Brokerage %</th>
                <th>Brokerage Amount</th>
              </tr>
            </thead>
            <tbody>
              ${selectedDealData.map(deal => {
                const amount = deal.rate * deal.quantity;
                const brokerage = (amount * deal.brokerage_percent) / 100;
                return `
                  <tr>
                    <td>${new Date(deal.confirmation_date).toLocaleDateString()}</td>
                    <td>${deal.supplier_name}</td>
                    <td>${deal.buyer_name}</td>
                    <td>${deal.product_name}</td>
                    <td>₹${amount.toLocaleString()}</td>
                    <td>${deal.brokerage_percent}%</td>
                    <td>₹${brokerage.toLocaleString()}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="total">
            <p>Total Brokerage: ₹${totalBrokerage.toLocaleString()}</p>
            <p>GST (18%): ₹${gstAmount.toLocaleString()}</p>
            <p><strong>Total Amount: ₹${totalAmount.toLocaleString()}</strong></p>
          </div>
        </body>
      </html>
    `;

    const newWindow = window.open('', '_blank');
    newWindow.document.write(invoiceHTML);
    newWindow.document.close();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Generate Brokerage Invoice</h1>

      {/* Invoice Details */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-medium mb-4">Invoice Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
            <input
              type="text"
              value={invoiceData.invoiceNo}
              onChange={(e) => setInvoiceData({...invoiceData, invoiceNo: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
            <input
              type="date"
              value={invoiceData.invoiceDate}
              onChange={(e) => setInvoiceData({...invoiceData, invoiceDate: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Broker Name</label>
            <input
              type="text"
              value={invoiceData.brokerName}
              onChange={(e) => setInvoiceData({...invoiceData, brokerName: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
            <input
              type="text"
              value={invoiceData.brokerGST}
              onChange={(e) => setInvoiceData({...invoiceData, brokerGST: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Select Deals */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Select Deals for Invoice</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDeals(deals.map(d => d.deal_id));
                      } else {
                        setSelectedDeals([]);
                      }
                    }}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brokerage</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deals.map((deal) => {
                const amount = deal.rate * deal.quantity;
                const brokerage = (amount * deal.brokerage_percent) / 100;
                return (
                  <tr key={deal.deal_id}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedDeals.includes(deal.deal_id)}
                        onChange={() => handleDealSelect(deal.deal_id)}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(deal.confirmation_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{deal.supplier_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{deal.buyer_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{deal.product_name}</td>
                    <td className="px-6 py-4 text-sm text-green-600 font-medium">
                      ₹{brokerage.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Summary */}
      {selectedDeals.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-medium mb-4">Invoice Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total Brokerage:</span>
              <span>₹{calculateTotalBrokerage().toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>GST (18%):</span>
              <span>₹{((calculateTotalBrokerage() * 18) / 100).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total Amount:</span>
              <span>₹{(calculateTotalBrokerage() * 1.18).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <div className="flex gap-4">
        <button
          onClick={generateInvoice}
          disabled={selectedDeals.length === 0}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
        >
          <FileText className="w-4 h-4 mr-2" />
          Generate Invoice
        </button>
        <button
          onClick={() => {
            setSelectedDeals([]);
            setInvoiceData({
              invoiceNo: `INV-${Date.now()}`,
              invoiceDate: new Date().toISOString().split('T')[0],
              brokerName: 'Your Broker Name',
              brokerAddress: 'Your Address',
              brokerGST: 'Your GST Number'
            });
          }}
          className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 flex items-center"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export default BrokerageInvoice;