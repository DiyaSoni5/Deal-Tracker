import React, { useEffect, useMemo, useState } from 'react';
import { mockAPI } from '../utils/mockData';

function GoodsDelivered() {
  const api = typeof window !== 'undefined' && window.electronAPI ? window.electronAPI : {
    getDeals: () => mockAPI.getDeals(),
    addDelivery: () => Promise.resolve(),
    getDeliverySummary: () => Promise.resolve({ total_bags: 0, total_amount: 0, total_brokerage: 0 }),
    getDeliveries: () => Promise.resolve([]),
    updateDealPayment: (dealId, paymentStatus) => mockAPI.updateDealPayment(dealId, paymentStatus)
  };

  const [deals, setDeals] = useState([]);
  const [selectedDealId, setSelectedDealId] = useState('');
  const [form, setForm] = useState({
    delivery_date: new Date().toISOString().split('T')[0],
    bill_no: '',
    bags_delivered: '',
    gst_percent: 5,
    buyer_name: ''
  });
  const [dealDiscountPercent, setDealDiscountPercent] = useState(0);
  const [summary, setSummary] = useState({ total_bags: 0, total_amount: 0, total_brokerage: 0 });
  const [deliveries, setDeliveries] = useState([]);

  const [exportFilters, setExportFilters] = useState({ buyer_name: '', start_date: '', end_date: '' });
  const [showExport, setShowExport] = useState(false);
  const [exportTab, setExportTab] = useState('party'); // 'party' | 'all'
  const [exportOptions, setExportOptions] = useState({ detailed: true, consolidated: false, includeOngoing: false });

  useEffect(() => {
    (async () => {
      const d = await api.getDeals();
      setDeals(d);

    })();
  }, []);



  useEffect(() => {
    if (!selectedDealId) {
      setForm(f => ({ ...f, buyer_name: '' }));
      return;
    }
    (async () => {
      try {
        const getSummary = api.getDeliverySummary ? api.getDeliverySummary : async () => ({ total_bags: 0, total_amount: 0, total_brokerage: 0 });
        const getRows = api.getDeliveries ? api.getDeliveries : async () => [];
        const s = await getSummary(selectedDealId);
        setSummary(s || { total_bags: 0, total_amount: 0, total_brokerage: 0 });
        const rows = await getRows({ deal_id: selectedDealId });
        setDeliveries(Array.isArray(rows) ? rows : []);
      } catch (e) {
        console.error('Load delivery summary failed', e);
        setSummary({ total_bags: 0, total_amount: 0, total_brokerage: 0 });
        setDeliveries([]);
      }
      const found = deals.find(x => x.deal_id === Number(selectedDealId));
      if (found) {
        setForm(f => ({ ...f, buyer_name: found.buyer_name, gst_percent: Number(found.gst_percent || f.gst_percent || 0) }));
        setDealDiscountPercent(Number(found.discount_percent || 0));
      }
    })();
  }, [selectedDealId, deals]);

  const selectedDeal = useMemo(() => deals.find(d => d.deal_id === Number(selectedDealId)), [deals, selectedDealId]);

  const calculations = useMemo(() => {
    if (!selectedDeal) return { amount: 0, gst_amount: 0, total: 0, brokerage: 0 };
    const rate = Number(selectedDeal.rate || 0);
    const bags = Number(form.bags_delivered || 0);
    const gst = Number(form.gst_percent || 0);
    const discountPercent = Number(selectedDeal.discount_percent || 0);
    const kgPerUnit = Number(selectedDeal.kg_per_unit || 50);
    const brokeragePercent = Number(selectedDeal.brokerage_percent || 0.5);

    // Calculate base amount (rate per kg × bags × kg per bag)
    const baseAmount = rate * bags * kgPerUnit;
    
    // Apply discount
    const discountAmount = baseAmount * (discountPercent / 100);
    const amount = baseAmount - discountAmount; // Amount after discount (without GST)
    
    // Calculate GST on discounted amount
    const gst_amount = amount * (gst / 100);
    const total = amount + gst_amount;

    // Brokerage calculated on discounted amount (after discount)
    const brokerage = amount * (brokeragePercent / 100);

    return { amount, gst_amount, total, brokerage };
  }, [selectedDeal, form.bags_delivered, form.gst_percent]);

  const remainingBags = useMemo(() => {
    if (!selectedDeal) return 0;
    const total = Number(selectedDeal.quantity || 0);
    return Math.max(0, total - Number(summary.total_bags || 0));
  }, [selectedDeal, summary.total_bags]);

  const overallStatus = useMemo(() => {
    if (!deliveries || deliveries.length === 0) return 'Pending';
    const anyPending = deliveries.some(d => (d.payment_status || 'Pending') !== 'Paid');
    return anyPending ? (deliveries.some(d => (d.payment_status || 'Pending') === 'Paid') ? 'Partial' : 'Pending') : 'Paid';
  }, [deliveries]);

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedDeal) return;
    
    // Check if all bags are already delivered
    if (remainingBags === 0) {
      alert('All bags for this deal have been delivered. No more entries allowed.');
      return;
    }
    
    // Check if trying to deliver more bags than remaining
    const bagsToDeliver = Number(form.bags_delivered || 0);
    if (bagsToDeliver > remainingBags) {
      alert(`Cannot deliver ${bagsToDeliver} bags. Only ${remainingBags} bags remaining.`);
      return;
    }
    
    const entry = {
      deal_id: selectedDeal.deal_id,
      delivery_date: form.delivery_date,
      bill_no: form.bill_no,
      bags_delivered: bagsToDeliver,
      gst_percent: Number(form.gst_percent || 0),
      buyer_name: form.buyer_name || selectedDeal.buyer_name,
      amount_without_gst: calculations.amount,
      gst_amount: calculations.gst_amount,
      total_amount: calculations.total,
      brokerage_amount: calculations.brokerage,
      payment_status: 'Pending'
    };
    await api.addDelivery(entry);
    
    // Check if all bags delivered and auto-update status
    const newSummary = await api.getDeliverySummary(selectedDeal.deal_id);
    const totalDelivered = (newSummary?.total_bags || 0) + bagsToDeliver;
    
    if (totalDelivered >= selectedDeal.quantity) {
      // All bags delivered - auto change status to 'Delivered'
      await api.updateDealPayment(selectedDeal.deal_id, 'Delivered');
    }
    
    // refresh
    setSummary(newSummary);
    const rows = await api.getDeliveries({ deal_id: selectedDeal.deal_id });
    setDeliveries(rows);
    const updatedDeals = await api.getDeals();
    setDeals(updatedDeals);
    setForm({ ...form, bill_no: '', bags_delivered: '' });
  };

  const exportCSV = async (scope) => {
    const rows = await api.reportDeliveriesDetailed(scope || {});
    const headers = ['Date','Bill No','Buyer','Deal ID','Bags','GST %','Amount','GST Amount','Total','Brokerage','Payment'];
    const csv = [headers.join(',')].concat(rows.map(r => [r.delivery_date, r.bill_no, r.buyer_name, r.deal_id, r.bags_delivered, r.gst_percent, r.amount_without_gst, r.gst_amount, r.total_amount, r.brokerage_amount, r.payment_status].join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deliveries.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportPDF = async (scope) => {
    const rows = await api.reportDeliveriesDetailed(scope || {});
    const html = `
      <html><head><title>Deliveries Report</title>
      <style>body{font-family:Arial;padding:20px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #000;padding:6px} th{background:#eee}</style>
      </head><body>
      <h2>Deliveries Report</h2>
      <p><strong>Filters:</strong> ${scope.buyer_name || 'All parties'}, ${scope.start_date || 'Beginning'} to ${scope.end_date || 'Today'}</p>
      <table><thead><tr><th>Date</th><th>Bill No</th><th>Buyer</th><th>Deal</th><th>Bags</th><th>GST %</th><th>Amount</th><th>GST</th><th>Total</th><th>Brokerage</th><th>Status</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${r.delivery_date}</td><td>${r.bill_no || ''}</td><td>${r.buyer_name || ''}</td><td>${r.deal_id}</td><td>${r.bags_delivered}</td><td>${r.gst_percent}</td><td>${Number(r.amount_without_gst).toFixed(2)}</td><td>${Number(r.gst_amount).toFixed(2)}</td><td>${Number(r.total_amount).toFixed(2)}</td><td>${Number(r.brokerage_amount).toFixed(2)}</td><td>${r.payment_status}</td></tr>`).join('')}
      </tbody></table>
      </body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Goods Delivered</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Select Deal</label>
            <select className="border rounded-md w-full p-2" value={selectedDealId} onChange={e => setSelectedDealId(e.target.value)}>
              <option value="">-- Choose Deal --</option>
              {deals.map(d => (
                <option key={d.deal_id} value={d.deal_id}>
                  {d.deal_id} - {d.supplier_name} → {d.buyer_name} @ ₹{d.rate} ({d.quantity} {d.unit})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Date</label>
            <input type="date" className="border rounded-md w-full p-2" value={form.delivery_date} onChange={e => setForm({ ...form, delivery_date: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Bill No</label>
            <input className="border rounded-md w-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-text" value={form.bill_no} onChange={e => setForm({ ...form, bill_no: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Bags Delivered</label>
            <input type="number" className="border rounded-md w-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-text" value={form.bags_delivered} onChange={e => setForm({ ...form, bags_delivered: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Buyer Name</label>
            <input className="border rounded-md w-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-text" value={form.buyer_name} onChange={e => setForm({ ...form, buyer_name: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex gap-6 text-sm text-gray-600">
            <div>Base Amount: ₹{(Number(selectedDeal?.rate || 0) * Number(form.bags_delivered || 0) * Number(selectedDeal?.kg_per_unit || 50)).toLocaleString('en-IN')}</div>
            <div>Discount ({selectedDeal?.discount_percent || 0}%): -₹{((Number(selectedDeal?.rate || 0) * Number(form.bags_delivered || 0) * Number(selectedDeal?.kg_per_unit || 50)) * (Number(selectedDeal?.discount_percent || 0) / 100)).toLocaleString('en-IN')}</div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">GST %</label>
            <input type="number" className="border rounded-md w-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-text" value={form.gst_percent} onChange={e => setForm({ ...form, gst_percent: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex gap-6 text-sm text-gray-600">
            <div>Base Amount: ₹{(Number(selectedDeal?.rate || 0) * Number(form.bags_delivered || 0) * Number(selectedDeal?.kg_per_unit || 50)).toLocaleString('en-IN')}</div>
            <div>Discount ({selectedDeal?.discount_percent || 0}%): -₹{((Number(selectedDeal?.rate || 0) * Number(form.bags_delivered || 0) * Number(selectedDeal?.kg_per_unit || 50)) * (Number(selectedDeal?.discount_percent || 0) / 100)).toLocaleString('en-IN')}</div>
          </div>
          <div className="flex gap-6 text-sm text-gray-800">
            <div>Amount: <strong>₹{calculations.amount.toLocaleString('en-IN')}</strong></div>
            <div>GST: <strong>₹{calculations.gst_amount.toLocaleString('en-IN')}</strong></div>
            <div>Brokerage: <strong>₹{calculations.brokerage.toLocaleString('en-IN')}</strong></div>
          </div>
        </div>
        <button 
          onClick={submit} 
          disabled={remainingBags === 0}
          className={`mt-4 px-4 py-2 rounded-md ${
            remainingBags === 0 
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {remainingBags === 0 ? 'All Bags Delivered' : 'Save Entry'}
        </button>
      </div>

      {selectedDeal && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium mb-4">Live Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded">Total bags delivered: <strong>{summary.total_bags}</strong></div>
            <div className="p-3 bg-gray-50 rounded">Remaining bags: <strong>{Math.max(0, (selectedDeal.quantity || 0) - (summary.total_bags || 0))}</strong></div>
            <div className="p-3 bg-gray-50 rounded">Total amount: <strong>₹{Number(summary.total_amount || 0).toLocaleString('en-IN')}</strong></div>
            <div className="p-3 bg-gray-50 rounded flex justify-between items-center">
              <span>Payment status: <strong className={overallStatus === 'Paid' ? 'text-green-600' : overallStatus === 'Partial' ? 'text-yellow-600' : 'text-orange-600'}>{overallStatus}</strong></span>
              {remainingBags === 0 && overallStatus !== 'Paid' && (
                <button
                  onClick={async () => {
                    try {
                      if (window.electronAPI?.markDealPaid) {
                        await window.electronAPI.markDealPaid(selectedDeal.deal_id);
                        // Refresh local state
                        const [updatedDeals, sNew, rowsNew] = await Promise.all([
                          window.electronAPI.getDeals(),
                          window.electronAPI.getDeliverySummary(selectedDeal.deal_id),
                          window.electronAPI.getDeliveries({ deal_id: selectedDeal.deal_id })
                        ]);
                        setDeals(updatedDeals);
                        setSummary(sNew || summary);
                        setDeliveries(Array.isArray(rowsNew) ? rowsNew : deliveries);
                        alert('Payment marked as received!');
                      } else {
                        // Update the deal payment status in mockAPI
                        await mockAPI.updateDealPayment(selectedDeal.deal_id, 'Paid');
                        console.log('Updated deal payment status to Paid for deal:', selectedDeal.deal_id);
                        
                        // Update all deliveries for this deal to Paid status
                        if (deliveries && deliveries.length > 0) {
                          deliveries.forEach(delivery => {
                            delivery.payment_status = 'Paid';
                          });
                        }
                        
                        // Refresh local state
                        const updatedDeals = await mockAPI.getDeals();
                        console.log('Updated deals:', updatedDeals.find(d => d.deal_id === selectedDeal.deal_id));
                        setDeals(updatedDeals);
                        setDeliveries([...deliveries]); // Force re-render
                        alert('Payment marked as received!');
                      }
                    } catch (e) {
                      console.error('Failed to mark as paid', e);
                      alert('Failed to mark as paid');
                    }
                  }}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Mark as Paid
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedDeal && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium mb-4">Filter & Export</h2>
          <div className="mb-4">
            <button className="bg-gray-700 text-white rounded-md px-3 py-2" onClick={() => setShowExport(true)}>Open Export</button>
          </div>

          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bill No</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bags</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">GST</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Brokerage</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deliveries.map(r => (
                <tr key={r.delivery_id}>
                  <td className="px-4 py-2 text-sm">{r.delivery_date}</td>
                  <td className="px-4 py-2 text-sm">{r.bill_no}</td>
                  <td className="px-4 py-2 text-sm">{r.buyer_name}</td>
                  <td className="px-4 py-2 text-sm">{r.bags_delivered}</td>
                  <td className="px-4 py-2 text-sm">₹{Number(r.amount_without_gst || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2 text-sm">₹{Number(r.gst_amount || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2 text-sm">₹{Number(r.total_amount || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2 text-sm">₹{(() => {
                    if (!selectedDeal) return Number(r.brokerage_amount || 0).toLocaleString('en-IN');
                    // Recalculate brokerage using current formula
                    const rate = Number(selectedDeal.rate || 0);
                    const bags = Number(r.bags_delivered || 0);
                    const kgPerUnit = Number(selectedDeal.kg_per_unit || 50);
                    const discountPercent = Number(selectedDeal.discount_percent || 0);
                    const brokeragePercent = Number(selectedDeal.brokerage_percent || 0.5);
                    
                    const baseAmount = rate * bags * kgPerUnit;
                    const discountAmount = baseAmount * (discountPercent / 100);
                    const amountAfterDiscount = baseAmount - discountAmount;
                    const correctBrokerage = amountAfterDiscount * (brokeragePercent / 100);
                    
                    return Number(correctBrokerage).toLocaleString('en-IN');
                  })()}</td>
                </tr>
              ))}
              {deliveries.length > 0 && (
                <tr className="bg-gray-100 font-bold border-t-2">
                  <td className="px-4 py-2 text-sm" colSpan="4">TOTAL</td>
                  <td className="px-4 py-2 text-sm">₹{deliveries.reduce((sum, r) => sum + Number(r.amount_without_gst || 0), 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2 text-sm">₹{deliveries.reduce((sum, r) => sum + Number(r.gst_amount || 0), 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2 text-sm">₹{deliveries.reduce((sum, r) => sum + Number(r.total_amount || 0), 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2 text-sm">₹{(() => {
                    if (!selectedDeal) return deliveries.reduce((sum, r) => sum + Number(r.brokerage_amount || 0), 0).toLocaleString('en-IN');
                    
                    const totalBrokerage = deliveries.reduce((sum, r) => {
                      const rate = Number(selectedDeal.rate || 0);
                      const bags = Number(r.bags_delivered || 0);
                      const kgPerUnit = Number(selectedDeal.kg_per_unit || 50);
                      const discountPercent = Number(selectedDeal.discount_percent || 0);
                      const brokeragePercent = Number(selectedDeal.brokerage_percent || 0.5);
                      
                      const baseAmount = rate * bags * kgPerUnit;
                      const discountAmount = baseAmount * (discountPercent / 100);
                      const amountAfterDiscount = baseAmount - discountAmount;
                      const correctBrokerage = amountAfterDiscount * (brokeragePercent / 100);
                      
                      return sum + correctBrokerage;
                    }, 0);
                    
                    return Number(totalBrokerage).toLocaleString('en-IN');
                  })()}</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {showExport && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Export / Report</h3>
              <button onClick={() => setShowExport(false)}>✖</button>
            </div>
            <div className="mb-4 border-b">
              <button className={`px-4 py-2 ${exportTab==='party'?'border-b-2 border-blue-600':''}`} onClick={() => setExportTab('party')}>Party (single)</button>
              <button className={`ml-4 px-4 py-2 ${exportTab==='all'?'border-b-2 border-blue-600':''}`} onClick={() => setExportTab('all')}>All Parties</button>
            </div>
            {exportTab === 'party' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm text-gray-600">Party</label>
                    <input className="border rounded-md p-2 w-full" placeholder="Party name" value={exportFilters.buyer_name} onChange={e => setExportFilters({ ...exportFilters, buyer_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">From</label>
                    <input type="date" className="border rounded-md p-2 w-full" value={exportFilters.start_date} onChange={e => setExportFilters({ ...exportFilters, start_date: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">To</label>
                    <input type="date" className="border rounded-md p-2 w-full" value={exportFilters.end_date} onChange={e => setExportFilters({ ...exportFilters, end_date: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="bg-gray-700 text-white rounded-md px-3 py-2" onClick={() => exportCSV(exportFilters)}>Generate Excel</button>
                  <button className="bg-gray-700 text-white rounded-md px-3 py-2" onClick={() => exportPDF(exportFilters)}>Generate PDF</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-600">From</label>
                    <input type="date" className="border rounded-md p-2 w-full" value={exportFilters.start_date} onChange={e => setExportFilters({ ...exportFilters, start_date: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">To</label>
                    <input type="date" className="border rounded-md p-2 w-full" value={exportFilters.end_date} onChange={e => setExportFilters({ ...exportFilters, end_date: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={exportOptions.detailed} onChange={e => setExportOptions({ ...exportOptions, detailed: e.target.checked })} /> Detailed rows</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={exportOptions.consolidated} onChange={e => setExportOptions({ ...exportOptions, consolidated: e.target.checked })} /> Consolidated per party</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={exportOptions.includeOngoing} onChange={e => setExportOptions({ ...exportOptions, includeOngoing: e.target.checked })} /> Include Ongoing Deals</label>
                </div>
                <div className="flex gap-3">
                  <button className="bg-gray-700 text-white rounded-md px-3 py-2" onClick={() => alert('Export feature coming soon')}>Generate Excel</button>
                  <button className="bg-gray-700 text-white rounded-md px-3 py-2" onClick={() => alert('Export feature coming soon')}>Generate PDF</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GoodsDelivered;


