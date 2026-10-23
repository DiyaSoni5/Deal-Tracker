import React, { useEffect, useMemo, useState } from 'react';
import { mockAPI } from '../utils/mockData';

const getAPI = () => window.electronAPI || mockAPI;

function GoodsDelivered() {
  const [deals, setDeals] = useState([]);
  const [selectedDealId, setSelectedDealId] = useState('');
  const [form, setForm] = useState({
    delivery_date: new Date().toISOString().split('T')[0],
    bill_no: '',
    bags_delivered: '',
    gst_percent: 5,
    buyer_name: ''
  });
  const [summary, setSummary] = useState({ total_bags: 0, total_amount: 0, total_brokerage: 0 });
  const [deliveries, setDeliveries] = useState([]);
  const [exportFilters, setExportFilters] = useState({ buyer_name: '', start_date: '', end_date: '' });
  const [showExport, setShowExport] = useState(false);
  const [exportTab, setExportTab] = useState('party');
  const [exportOptions, setExportOptions] = useState({ detailed: true, consolidated: false, includeOngoing: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAPI().getDeals().then(setDeals).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedDealId) {
      setForm(f => ({ ...f, buyer_name: '' }));
      setSummary({ total_bags: 0, total_amount: 0, total_brokerage: 0 });
      setDeliveries([]);
      return;
    }
    const api = getAPI();
    const found = deals.find(x => x.deal_id === Number(selectedDealId));
    if (found) {
      setForm(f => ({ ...f, buyer_name: found.buyer_name, gst_percent: Number(found.gst_percent || 5) }));
    }
    Promise.all([
      api.getDeliverySummary(selectedDealId),
      api.getDeliveries({ deal_id: selectedDealId })
    ]).then(([s, rows]) => {
      setSummary(s || { total_bags: 0, total_amount: 0, total_brokerage: 0 });
      setDeliveries(Array.isArray(rows) ? rows : []);
    }).catch(e => {
      console.error('Load delivery summary failed', e);
      setSummary({ total_bags: 0, total_amount: 0, total_brokerage: 0 });
      setDeliveries([]);
    });
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
    const baseAmount = rate * bags * kgPerUnit;
    const discountAmount = baseAmount * (discountPercent / 100);
    const amount = baseAmount - discountAmount;
    const gst_amount = amount * (gst / 100);
    const total = amount + gst_amount;
    const brokerage = amount * (brokeragePercent / 100);
    return { amount, gst_amount, total, brokerage };
  }, [selectedDeal, form.bags_delivered, form.gst_percent]);

  const remainingBags = useMemo(() => {
    if (!selectedDeal) return 0;
    return Math.max(0, Number(selectedDeal.quantity || 0) - Number(summary.total_bags || 0));
  }, [selectedDeal, summary.total_bags]);

  const overallStatus = useMemo(() => {
    if (!deliveries || deliveries.length === 0) return 'Pending';
    const allPaid = deliveries.every(d => d.payment_status === 'Paid');
    if (allPaid) return 'Paid';
    const anyPaid = deliveries.some(d => d.payment_status === 'Paid');
    return anyPaid ? 'Partial' : 'Pending';
  }, [deliveries]);

  const refreshDeliveryData = async (dealId) => {
    const api = getAPI();
    const [s, rows, updatedDeals] = await Promise.all([
      api.getDeliverySummary(dealId),
      api.getDeliveries({ deal_id: dealId }),
      api.getDeals()
    ]);
    setSummary(s || { total_bags: 0, total_amount: 0, total_brokerage: 0 });
    setDeliveries(Array.isArray(rows) ? rows : []);
    setDeals(updatedDeals);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedDeal || saving) return;

    if (remainingBags === 0) {
      alert('All bags for this deal have been delivered.');
      return;
    }
    const bagsToDeliver = Number(form.bags_delivered || 0);
    if (bagsToDeliver <= 0) {
      alert('Please enter a valid number of bags.');
      return;
    }
    if (bagsToDeliver > remainingBags) {
      alert(`Cannot deliver ${bagsToDeliver} bags. Only ${remainingBags} remaining.`);
      return;
    }

    setSaving(true);
    try {
      const api = getAPI();
      await api.addDelivery({
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
      });

      const newSummary = await api.getDeliverySummary(selectedDeal.deal_id);
      if ((newSummary?.total_bags || 0) >= selectedDeal.quantity) {
        await api.updateDealPayment(selectedDeal.deal_id, 'Delivered');
      }

      await refreshDeliveryData(selectedDeal.deal_id);
      setForm(f => ({ ...f, bill_no: '', bags_delivered: '' }));
    } catch (err) {
      console.error('Failed to save delivery:', err);
      alert('Failed to save delivery. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!selectedDeal) return;
    try {
      const api = getAPI();
      await api.markDealPaid(selectedDeal.deal_id);
      await refreshDeliveryData(selectedDeal.deal_id);
      alert('Payment marked as received!');
    } catch (err) {
      console.error('Failed to mark as paid', err);
      alert('Failed to mark as paid.');
    }
  };

  const exportCSV = async (scope) => {
    try {
      const api = getAPI();
      const rows = await api.reportDeliveriesDetailed(scope || {});
      const headers = ['Date', 'Bill No', 'Buyer', 'Deal ID', 'Bags', 'GST %', 'Amount', 'GST Amount', 'Total', 'Brokerage', 'Payment'];
      const csv = [headers.join(',')].concat(
        rows.map(r => [r.delivery_date, r.bill_no, r.buyer_name, r.deal_id, r.bags_delivered, r.gst_percent,
          r.amount_without_gst, r.gst_amount, r.total_amount, r.brokerage_amount, r.payment_status].join(','))
      ).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'deliveries.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed.');
    }
  };

  const exportPDF = async (scope) => {
    try {
      const api = getAPI();
      const rows = await api.reportDeliveriesDetailed(scope || {});
      const html = `<html><head><title>Deliveries Report</title>
        <style>body{font-family:Arial;padding:20px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #000;padding:6px} th{background:#eee}</style>
        </head><body><h2>Deliveries Report</h2>
        <p><strong>Filters:</strong> ${scope.buyer_name || 'All parties'}, ${scope.start_date || 'Beginning'} to ${scope.end_date || 'Today'}</p>
        <table><thead><tr><th>Date</th><th>Bill No</th><th>Buyer</th><th>Deal</th><th>Bags</th><th>GST %</th><th>Amount</th><th>GST</th><th>Total</th><th>Brokerage</th><th>Status</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td>${r.delivery_date}</td><td>${r.bill_no || ''}</td><td>${r.buyer_name || ''}</td><td>${r.deal_id}</td><td>${r.bags_delivered}</td><td>${r.gst_percent}</td><td>${Number(r.amount_without_gst).toFixed(2)}</td><td>${Number(r.gst_amount).toFixed(2)}</td><td>${Number(r.total_amount).toFixed(2)}</td><td>${Number(r.brokerage_amount).toFixed(2)}</td><td>${r.payment_status}</td></tr>`).join('')}
        </tbody></table></body></html>`;
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); w.print(); }
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF export failed.');
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
            <input className="border rounded-md w-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.bill_no} onChange={e => setForm({ ...form, bill_no: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Bags Delivered</label>
            <input type="number" className="border rounded-md w-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.bags_delivered} onChange={e => setForm({ ...form, bags_delivered: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Buyer Name</label>
            <input className="border rounded-md w-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.buyer_name} onChange={e => setForm({ ...form, buyer_name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">GST %</label>
            <input type="number" className="border rounded-md w-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.gst_percent} onChange={e => setForm({ ...form, gst_percent: e.target.value })} />
          </div>
        </div>

        {selectedDeal && (
          <div className="mt-4 flex gap-6 text-sm text-gray-700 bg-gray-50 p-3 rounded">
            <div>Base: <strong>₹{(Number(selectedDeal.rate || 0) * Number(form.bags_delivered || 0) * Number(selectedDeal.kg_per_unit || 50)).toLocaleString('en-IN')}</strong></div>
            <div>Discount ({selectedDeal.discount_percent || 0}%): <strong className="text-red-600">-₹{calculations.amount > 0 ? ((Number(selectedDeal.rate || 0) * Number(form.bags_delivered || 0) * Number(selectedDeal.kg_per_unit || 50)) - calculations.amount).toLocaleString('en-IN') : 0}</strong></div>
            <div>Amount: <strong>₹{calculations.amount.toLocaleString('en-IN')}</strong></div>
            <div>GST: <strong>₹{calculations.gst_amount.toLocaleString('en-IN')}</strong></div>
            <div>Total: <strong>₹{calculations.total.toLocaleString('en-IN')}</strong></div>
            <div>Brokerage: <strong className="text-green-600">₹{calculations.brokerage.toLocaleString('en-IN')}</strong></div>
          </div>
        )}

        <button
          onClick={submit}
          disabled={remainingBags === 0 || saving}
          className={`mt-4 px-6 py-2 rounded-md font-medium ${
            remainingBags === 0
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : saving
              ? 'bg-blue-400 text-white cursor-wait'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {saving ? 'Saving...' : remainingBags === 0 ? 'All Bags Delivered' : 'Save Entry'}
        </button>
      </div>

      {selectedDeal && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium mb-4">Live Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded">Total delivered: <strong>{summary.total_bags}</strong></div>
            <div className="p-3 bg-gray-50 rounded">Remaining: <strong>{remainingBags}</strong></div>
            <div className="p-3 bg-gray-50 rounded">Total amount: <strong>₹{Number(summary.total_amount || 0).toLocaleString('en-IN')}</strong></div>
            <div className="p-3 bg-gray-50 rounded flex justify-between items-center">
              <span>Status: <strong className={overallStatus === 'Paid' ? 'text-green-600' : overallStatus === 'Partial' ? 'text-yellow-600' : 'text-orange-600'}>{overallStatus}</strong></span>
              {remainingBags === 0 && overallStatus !== 'Paid' && (
                <button onClick={handleMarkPaid} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 ml-2">
                  Mark Paid
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedDeal && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Delivery Entries</h2>
            <button className="bg-gray-700 text-white rounded-md px-3 py-2 text-sm" onClick={() => setShowExport(true)}>Export</button>
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
                    <td className="px-4 py-2 text-sm">₹{Number(r.brokerage_amount || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {deliveries.length > 0 && (
                  <tr className="bg-gray-100 font-bold border-t-2">
                    <td className="px-4 py-2 text-sm" colSpan="4">TOTAL</td>
                    <td className="px-4 py-2 text-sm">₹{deliveries.reduce((s, r) => s + Number(r.amount_without_gst || 0), 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-sm">₹{deliveries.reduce((s, r) => s + Number(r.gst_amount || 0), 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-sm">₹{deliveries.reduce((s, r) => s + Number(r.total_amount || 0), 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-sm">₹{deliveries.reduce((s, r) => s + Number(r.brokerage_amount || 0), 0).toLocaleString('en-IN')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showExport && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Export / Report</h3>
              <button onClick={() => setShowExport(false)}>✖</button>
            </div>
            <div className="mb-4 border-b">
              <button className={`px-4 py-2 ${exportTab === 'party' ? 'border-b-2 border-blue-600' : ''}`} onClick={() => setExportTab('party')}>Party (single)</button>
              <button className={`ml-4 px-4 py-2 ${exportTab === 'all' ? 'border-b-2 border-blue-600' : ''}`} onClick={() => setExportTab('all')}>All Parties</button>
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
                </div>
                <div className="flex gap-3">
                  <button className="bg-gray-700 text-white rounded-md px-3 py-2" onClick={() => exportCSV(exportFilters)}>Generate Excel</button>
                  <button className="bg-gray-700 text-white rounded-md px-3 py-2" onClick={() => exportPDF(exportFilters)}>Generate PDF</button>
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
