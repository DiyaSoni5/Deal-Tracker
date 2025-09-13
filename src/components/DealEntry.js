import React, { useState, useEffect } from 'react';
import { Save, Calculator, RefreshCw } from 'lucide-react';
import { mockAPI } from '../utils/mockData';

function DealEntry({ persistentDeal, setPersistentDeal }) {
  const [suppliers, setSuppliers] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [deal, setDeal] = useState(persistentDeal || {
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
    brokerage_mode: 'percentage',
    brokerage_per_bag: '',
    gst_percent: 5,
    brokerage_gst_enabled: false,
    brokerage_gst_percent: 18,
    status: 'Confirmed'
  });
  
  // Update persistent state when deal changes
  useEffect(() => {
    if (setPersistentDeal) {
      setPersistentDeal(deal);
    }
  }, [deal, setPersistentDeal]);
  const [calculations, setCalculations] = useState({
    amount_without_gst: 0,
    discount_amount: 0,
    gst_amount: 0,
    amount_with_gst: 0,
    brokerage_amount: 0
  });
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showBuyerForm, setShowBuyerForm] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', contact_no: '' });
  const [newBuyer, setNewBuyer] = useState({ name: '', contact_no: '' });

  useEffect(() => {
    loadSuppliers();
    loadBuyers();
  }, []);

  useEffect(() => {
    calculateAmounts();
  }, [deal.rate, deal.quantity, deal.kg_per_unit, deal.calculation_mode, deal.discount_percent, deal.gst_percent, deal.brokerage_percent, deal.brokerage_mode, deal.brokerage_per_bag, deal.brokerage_gst_enabled, deal.brokerage_gst_percent]);

  const loadSuppliers = async () => {
    try {
      const api = window.electronAPI || mockAPI;
      const data = await api.getSuppliers();
      setSuppliers(data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadBuyers = async () => {
    try {
      const api = window.electronAPI || mockAPI;
      const data = await api.getBuyers();
      setBuyers(data);
    } catch (error) {
      console.error('Error loading buyers:', error);
    }
  };

  const calculateAmounts = () => {
    const rate = parseFloat(deal.rate) || 0;
    const quantity = parseFloat(deal.quantity) || 0;
    const kgPerUnit = parseFloat(deal.kg_per_unit) || 1;
    const discountPercent = parseFloat(deal.discount_percent) || 0;
    const gstPercent = parseFloat(deal.gst_percent) || 0;
    const brokeragePercent = parseFloat(deal.brokerage_percent) || 0;

    // Calculate based on mode
    let amount_without_gst;
    if (deal.calculation_mode === 'per_kg') {
      // Rate per kg × (quantity × kg per unit)
      const totalKg = quantity * kgPerUnit;
      amount_without_gst = rate * totalKg;
    } else {
      // Direct calculation
      amount_without_gst = rate * quantity;
    }

    const discount_amount = (amount_without_gst * discountPercent) / 100;
    const amount_after_discount = amount_without_gst - discount_amount;
    const gst_amount = (amount_after_discount * gstPercent) / 100;
    const amount_with_gst = amount_after_discount + gst_amount;
    
    // Calculate brokerage based on mode
    let brokerage_amount;
    if (deal.brokerage_mode === 'per_bag') {
      brokerage_amount = quantity * parseFloat(deal.brokerage_per_bag || 0);
    } else {
      // Percentage mode - brokerage on amount after discount (without GST)
      brokerage_amount = (amount_after_discount * brokeragePercent) / 100;
    }

    setCalculations({
      amount_without_gst,
      discount_amount,
      gst_amount,
      amount_with_gst,
      brokerage_amount,
      total_kg: deal.calculation_mode === 'per_kg' ? quantity * kgPerUnit : quantity
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const api = window.electronAPI || mockAPI;
      // Add all calculated amounts to deal
      const dealWithCalculations = {
        ...deal,
        amount_without_gst: calculations.amount_without_gst,
        discount_amount: calculations.discount_amount,
        gst_amount: calculations.gst_amount,
        total_amount: calculations.amount_with_gst,
        brokerage_amount: calculations.brokerage_amount,
        total_kg: calculations.total_kg
      };
      
      if (deal.deal_id) {
        // Update existing deal
        if (api.updateDeal) {
          await api.updateDeal(dealWithCalculations);
        } else {
          await mockAPI.updateDeal(dealWithCalculations);
        }
        alert('Deal updated successfully!');
      } else {
        // Add new deal
        await api.addDeal(dealWithCalculations);
        alert('Deal added successfully!');
      }
      // Don't reset form - keep data for reference
    } catch (error) {
      console.error('Error saving deal:', error);
      alert('Error saving deal');
    }
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    try {
      const api = window.electronAPI || mockAPI;
      const result = await api.addSupplier(newSupplier);
      setNewSupplier({ name: '', contact_no: '' });
      setShowSupplierForm(false);
      loadSuppliers();
      setDeal({...deal, supplier_id: result.lastID});
    } catch (error) {
      console.error('Error adding supplier:', error);
      alert('Error adding supplier');
    }
  };

  const handleAddBuyer = async (e) => {
    e.preventDefault();
    try {
      const api = window.electronAPI || mockAPI;
      const result = await api.addBuyer(newBuyer);
      setNewBuyer({ name: '', contact_no: '' });
      setShowBuyerForm(false);
      loadBuyers();
      setDeal({...deal, buyer_id: result.lastID});
    } catch (error) {
      console.error('Error adding buyer:', error);
      alert('Error adding buyer');
    }
  };

  return (
    <div className="p-6">
      {/* Small Supplier Modal */}
      {showSupplierForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Add New Supplier</h3>
              <form onSubmit={handleAddSupplier} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Name *</label>
                  <input
                    type="text"
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    placeholder="Enter supplier name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                  <input
                    type="text"
                    value={newSupplier.contact_no}
                    onChange={(e) => setNewSupplier({...newSupplier, contact_no: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    placeholder="Enter contact number"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    Save Supplier
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSupplierForm(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Small Buyer Modal */}
      {showBuyerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Add New Buyer</h3>
              <form onSubmit={handleAddBuyer} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Buyer Name *</label>
                  <input
                    type="text"
                    value={newBuyer.name}
                    onChange={(e) => setNewBuyer({...newBuyer, name: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    placeholder="Enter buyer name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                  <input
                    type="text"
                    value={newBuyer.contact_no}
                    onChange={(e) => setNewBuyer({...newBuyer, contact_no: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    placeholder="Enter contact number"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    Save Buyer
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBuyerForm(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bill Modal */}
      {showBillModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-900">Brokerage Bill</h3>
              <button
                onClick={() => setShowBillModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="bg-white" id="bill-content">
                <div className="text-center border-b-2 border-black pb-4 mb-6">
                  <div className="text-2xl font-bold mb-2">DEAL-TRACKER</div>
                  <div className="text-sm text-gray-600">Brokerage Services</div>
                  <div className="text-sm text-gray-600">Contact: +91-XXXXXXXXXX | Email: broker@dealtracker.com</div>
                </div>
                
                <div className="flex justify-between mb-6">
                  <div>
                    <strong>Bill No:</strong> BRK-{Date.now()}<br/>
                    <strong>Date:</strong> {new Date().toLocaleDateString()}
                  </div>
                  <div className="text-right">
                    <strong>Deal Date:</strong> {new Date(deal.confirmation_date).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="mb-6">
                  <strong>Bill To:</strong><br/>
                  <strong>Supplier:</strong> {suppliers.find(s => s.supplier_id == deal.supplier_id)?.name || 'N/A'}<br/>
                  <strong>Buyer:</strong> {buyers.find(b => b.buyer_id == deal.buyer_id)?.name || 'N/A'}
                </div>
                
                <table className="w-full border-collapse border border-black mb-6">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-3 text-left">Description</th>
                      <th className="border border-black p-3 text-left">Product</th>
                      <th className="border border-black p-3 text-left">Quantity</th>
                      <th className="border border-black p-3 text-right">Rate</th>
                      <th className="border border-black p-3 text-right">Amount</th>
                      <th className="border border-black p-3 text-right">Brokerage %</th>
                      <th className="border border-black p-3 text-right">Brokerage Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black p-3">Brokerage Services</td>
                      <td className="border border-black p-3">{deal.product_name}</td>
                      <td className="border border-black p-3">{deal.quantity} {deal.unit}</td>
                      <td className="border border-black p-3 text-right">₹{parseFloat(deal.rate).toLocaleString()}</td>
                      <td className="border border-black p-3 text-right">₹{calculations.amount_without_gst.toLocaleString()}</td>
                      <td className="border border-black p-3 text-right">{deal.brokerage_percent}%</td>
                      <td className="border border-black p-3 text-right">₹{calculations.brokerage_amount.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-gray-50 font-bold">
                      <td colSpan="6" className="border border-black p-3">Total Brokerage Amount</td>
                      <td className="border border-black p-3 text-right">₹{calculations.brokerage_amount.toLocaleString()}</td>
                    </tr>
                    {deal.brokerage_gst_enabled && (
                      <tr>
                        <td colSpan="6" className="border border-black p-3">GST @ {deal.brokerage_gst_percent}%</td>
                        <td className="border border-black p-3 text-right">₹{((calculations.brokerage_amount * parseFloat(deal.brokerage_gst_percent || 0)) / 100).toLocaleString()}</td>
                      </tr>
                    )}
                    <tr className="bg-gray-50 font-bold">
                      <td colSpan="6" className="border border-black p-3">Grand Total</td>
                      <td className="border border-black p-3 text-right">₹{deal.brokerage_gst_enabled ? (calculations.brokerage_amount * (1 + parseFloat(deal.brokerage_gst_percent || 0) / 100)).toLocaleString() : calculations.brokerage_amount.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
                
                <div className="mt-8">
                  <p><strong>Payment Terms:</strong> 30 days from invoice date</p>
                  <p><strong>Bank Details:</strong> Account No: XXXX-XXXX-XXXX | IFSC: XXXXXXXX</p>
                </div>
                
                <div className="text-center mt-8 text-sm text-gray-600">
                  <p>Thank you for your business!</p>
                  <p>This is a computer generated invoice.</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
              >
                Print Bill
              </button>
              <button
                onClick={() => {
                  const element = document.getElementById('bill-content');
                  const opt = {
                    margin: 1,
                    filename: `Bill_${Date.now()}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2 },
                    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                  };
                  // Note: html2pdf library would be needed for this
                  alert('PDF download feature requires html2pdf library');
                }}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium"
              >
                Download PDF
              </button>
              <button
                onClick={() => setShowBillModal(false)}
                className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Deal Form */}
        <div className="bg-white p-6 rounded-lg shadow">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier
                </label>
                <select
                  value={deal.supplier_id}
                  onChange={(e) => {
                    if (e.target.value === 'add_new') {
                      setShowSupplierForm(true);
                    } else {
                      setDeal({...deal, supplier_id: e.target.value});
                    }
                  }}
                  className="w-full h-12 border border-gray-200 rounded-lg pl-4 pr-8 text-gray-900 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
                  required
                >
                  <option value="">Choose supplier</option>
                  <option value="add_new" style={{fontStyle: 'italic', color: '#3B82F6'}}>+ Add New Supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.supplier_id} value={supplier.supplier_id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buyer
                </label>
                <select
                  value={deal.buyer_id}
                  onChange={(e) => {
                    if (e.target.value === 'add_new') {
                      setShowBuyerForm(true);
                    } else {
                      setDeal({...deal, buyer_id: e.target.value});
                    }
                  }}
                  className="w-full h-12 border border-gray-200 rounded-lg pl-4 pr-8 text-gray-900 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
                  required
                >
                  <option value="">Choose buyer</option>
                  <option value="add_new" style={{fontStyle: 'italic', color: '#3B82F6'}}>+ Add New Buyer</option>
                  {buyers.map(buyer => (
                    <option key={buyer.buyer_id} value={buyer.buyer_id}>
                      {buyer.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmation Date
              </label>
              <input
                type="date"
                value={deal.confirmation_date}
                onChange={(e) => setDeal({...deal, confirmation_date: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name
              </label>
              <input
                type="text"
                value={deal.product_name}
                onChange={(e) => setDeal({...deal, product_name: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text"
                placeholder="e.g., Cotton Yarn"
                required
              />
            </div>

            {/* Calculation Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calculation Mode
              </label>
              <select
                value={deal.calculation_mode}
                onChange={(e) => setDeal({...deal, calculation_mode: e.target.value})}
                className="w-full border border-gray-300 rounded-md pl-3 pr-8 py-2"
              >
                <option value="per_kg">Rate per KG (with unit conversion)</option>
                <option value="direct">Direct Rate × Quantity</option>
              </select>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 whitespace-nowrap">
                  {deal.calculation_mode === 'per_kg' ? 'Rate per KG (₹)' : 'Rate (₹)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={deal.rate}
                  onChange={(e) => setDeal({...deal, rate: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder={deal.calculation_mode === 'per_kg' ? '189' : '0.00'}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={deal.quantity}
                  onChange={(e) => setDeal({...deal, quantity: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder={deal.calculation_mode === 'per_kg' ? '350' : '0'}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <select
                  value={deal.unit}
                  onChange={(e) => setDeal({...deal, unit: e.target.value})}
                  className="w-full border border-gray-300 rounded-md pl-3 pr-8 py-2"
                >
                  <option value="bags">Bags</option>
                  <option value="kg">KG</option>
                  <option value="tons">Tons</option>
                </select>
              </div>
              
              {deal.calculation_mode === 'per_kg' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    KG per {deal.unit.slice(0, -1)}
                  </label>
                  <input
                    type="number"
                    value={deal.kg_per_unit}
                    onChange={(e) => setDeal({...deal, kg_per_unit: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="50"
                  />
                </div>
              )}
            </div>
            
            {deal.calculation_mode === 'per_kg' && deal.quantity && deal.kg_per_unit && (
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>Total Weight:</strong> {deal.quantity} {deal.unit} × {deal.kg_per_unit} kg = {(deal.quantity * deal.kg_per_unit).toLocaleString()} kg
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cash Discount (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={deal.discount_percent}
                  onChange={(e) => setDeal({...deal, discount_percent: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brokerage Mode
                </label>
                <select
                  value={deal.brokerage_mode || 'percentage'}
                  onChange={(e) => setDeal({...deal, brokerage_mode: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="per_bag">Per Bag (₹)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GST (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={deal.gst_percent}
                  onChange={(e) => setDeal({...deal, gst_percent: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
            
            {/* Brokerage Input */}
            <div className="grid grid-cols-1 gap-4">
              {deal.brokerage_mode === 'per_bag' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brokerage per Bag (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={deal.brokerage_per_bag}
                    onChange={(e) => setDeal({...deal, brokerage_per_bag: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Enter amount per bag"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brokerage (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={deal.brokerage_percent}
                    onChange={(e) => setDeal({...deal, brokerage_percent: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              )}
            </div>
            


            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  const resetDeal = {
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
                  };
                  setDeal(resetDeal);
                  if (setPersistentDeal) {
                    setPersistentDeal(resetDeal);
                  }
                }}
                className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {deal.deal_id ? 'Update Deal' : 'Save Deal'}
              </button>
            </div>
          </form>
        </div>

        {/* Calculations */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center mb-4">
            <Calculator className="w-5 h-5 mr-2" />
            <h2 className="text-lg font-medium">Deal Calculations</h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Base Amount:</span>
              <span className="font-medium">₹{calculations.amount_without_gst.toLocaleString('en-IN')}</span>
            </div>
            
            {deal.calculation_mode === 'per_kg' && calculations.total_kg && (
              <div className="flex justify-between text-sm text-blue-600">
                <span>Total KG: {calculations.total_kg.toLocaleString()} × ₹{deal.rate}</span>
                <span></span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-gray-600">Cash Discount:</span>
              <span className="font-medium text-red-600">-₹{calculations.discount_amount.toLocaleString('en-IN')}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Amount (after discount/without GST):</span>
              <span className="font-medium">₹{(calculations.amount_without_gst - calculations.discount_amount).toLocaleString('en-IN')}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">GST Amount({deal.gst_percent}%):</span>
              <span className="font-medium">₹{calculations.gst_amount.toLocaleString('en-IN')}</span>
            </div>
            
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total Amount with GST:</span>
                <span>₹{calculations.amount_with_gst.toLocaleString('en-IN')}</span>
              </div>
            </div>
            
            <div className="border-t pt-3">
              <div className="flex justify-between text-green-600 font-medium">
                <span>Your Brokerage {deal.brokerage_mode === 'per_bag' ? `(₹${deal.brokerage_per_bag || 0}/bag)` : `(${deal.brokerage_percent}%)`}:</span>
                <span>₹{calculations.brokerage_amount.toLocaleString('en-IN')}</span>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  const supplierName = suppliers.find(s => s.supplier_id == deal.supplier_id)?.name || 'N/A';
                  const buyerName = buyers.find(b => b.buyer_id == deal.buyer_id)?.name || 'N/A';
                  
                  const csvData = [
                    ['Deal Information', '', '', '', '', '', '', ''],
                    ['Date', 'Supplier', 'Buyer', 'Product', 'Rate', 'Quantity', 'Unit', ''],
                    [deal.confirmation_date, supplierName, buyerName, deal.product_name, deal.rate, deal.quantity, deal.unit, ''],
                    ['', '', '', '', '', '', '', ''],
                    ['Calculations', '', '', '', '', '', '', ''],
                    ['Description', 'Percentage', 'Amount', '', '', '', '', ''],
                    ['Base Amount', '', calculations.amount_without_gst.toFixed(2), '', '', '', '', ''],
                    ['Cash Discount', deal.discount_percent + '%', '-' + calculations.discount_amount.toFixed(2), '', '', '', '', ''],
                    ['GST', deal.gst_percent + '%', calculations.gst_amount.toFixed(2), '', '', '', '', ''],
                    ['Total Amount', '', calculations.amount_with_gst.toFixed(2), '', '', '', '', ''],
                    ['Your Brokerage', deal.brokerage_percent + '%', calculations.brokerage_amount.toFixed(2), '', '', '', '', '']
                  ];
                  
                  const csvContent = csvData.map(row => row.join(',')).join('\n');
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Deal_${supplierName}_${buyerName}_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 text-sm"
              >
                Export Excel
              </button>
              
              <button
                type="button"
                onClick={() => setShowBillModal(true)}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm"
              >
                Generate Bill
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DealEntry;