import React, { useEffect, useMemo, useState } from 'react';

function DealDetails({ deal, onBack, setActiveTab, setPersistentDeal }) {
  const api = typeof window !== 'undefined' && window.electronAPI ? window.electronAPI : {
    getDeals: () => import('../utils/mockData').then(m => m.mockAPI.getDeals()),
    getDeliveries: (params) => import('../utils/mockData').then(m => m.mockAPI.getDeliveries(params)),
    getDeliverySummary: (id) => import('../utils/mockData').then(m => m.mockAPI.getDeliverySummary(id)),
    updateDealPayment: (id, status) => import('../utils/mockData').then(m => m.mockAPI.updateDealPayment(id, status)),
  };
  const [summary, setSummary] = useState({ total_bags: 0, total_amount: 0, total_brokerage: 0 });
  const [deliveries, setDeliveries] = useState([]);
  const [currentDeal, setCurrentDeal] = useState(deal);

  useEffect(() => {
    if (!deal) return;
    (async () => {
      try {
        const s = api.getDeliverySummary ? await api.getDeliverySummary(Number(deal.deal_id)) : { total_bags: 0, total_amount: 0, total_brokerage: 0 };
        setSummary(s || { total_bags: 0, total_amount: 0, total_brokerage: 0 });
        const rows = api.getDeliveries ? await api.getDeliveries({ deal_id: Number(deal.deal_id) }) : [];
        setDeliveries(Array.isArray(rows) ? rows : []);

        const mockAPI = (await import('../utils/mockData')).mockAPI;
        const deals = await (api.getDeals || mockAPI.getDeals)();
        let updatedDeal = deals.find(d => d.deal_id === deal.deal_id);

        if (updatedDeal && (s?.total_bags || 0) >= (updatedDeal.quantity || 0) && (!updatedDeal.payment_status || updatedDeal.payment_status === 'Pending')) {
          await (api.updateDealPayment || mockAPI.updateDealPayment)(deal.deal_id, 'Delivered');
          updatedDeal.payment_status = 'Delivered';
        }

        if (updatedDeal) setCurrentDeal(updatedDeal);
      } catch (e) {
        console.error('DealDetails load failed', e);
      }
    })();
  }, [deal]); // eslint-disable-line

  const perKg = deal?.calculation_mode === 'per_kg';
  const inferredKgPerUnit = Number(deal?.kg_per_unit || 50);
  const baseAmount = useMemo(() => {
    if (!deal) return 0;
    return perKg ? deal.rate * deal.quantity * inferredKgPerUnit : deal.rate * deal.quantity;
  }, [deal, perKg, inferredKgPerUnit]);
  const discountAmount = useMemo(() => baseAmount * (Number(deal?.discount_percent || 0) / 100), [baseAmount, deal]);
  const amountAfterDiscount = baseAmount - discountAmount;
  const gstAmount = amountAfterDiscount * (Number(deal?.gst_percent || 0) / 100);
  const totalAmount = amountAfterDiscount + gstAmount;
  const brokerageAmount = useMemo(() => {
    if (!deal) return 0;
    return amountAfterDiscount * (Number(deal?.brokerage_percent || 0) / 100);
  }, [deal, amountAfterDiscount]);

  // TOTAL row calculations
  const totalBags = deliveries.reduce((s, r) => s + Number(r.bags_delivered || 0), 0);
  const totalAmountCol = deliveries.reduce((s, r) => s + Number(r.amount_without_gst || 0), 0);
  const totalGST = deliveries.reduce((s, r) => s + Number(r.gst_amount || 0), 0);
  const totalTotal = deliveries.reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const totalBrokerage = deliveries.reduce((s, r) => s + Number(r.brokerage_amount || 0), 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <button className="text-blue-600" onClick={onBack}>← Back</button>
        <button
          onClick={() => {
            setPersistentDeal({
              ...deal,
              supplier_id: deal.supplier_id,
              buyer_id: deal.buyer_id,
              confirmation_date: deal.confirmation_date,
              product_name: deal.product_name,
              rate: deal.rate,
              quantity: deal.quantity,
              unit: deal.unit,
              kg_per_unit: deal.kg_per_unit || 50,
              calculation_mode: deal.calculation_mode || 'per_kg',
              discount_percent: deal.discount_percent || 0,
              brokerage_percent: deal.brokerage_percent || 0.5,
              gst_percent: deal.gst_percent || 5
            });
            setActiveTab('deals');
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          ✏️ Edit Deal
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-2">Deal #{deal?.deal_id}</h1>
      <p className="text-gray-600 mb-4">{deal?.supplier_name} → {deal?.buyer_name} | {deal?.product_name}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4">Deal Calculation</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Quantity</span><strong>{deal?.quantity} {deal?.unit}</strong></div>
            {perKg && <div className="flex justify-between"><span>Kg per bag</span><strong>{deal?.kg_per_unit}</strong></div>}
            <div className="flex justify-between"><span>Rate</span><strong>₹{Number(deal?.rate).toLocaleString('en-IN')}{perKg ? ' /kg' : ''}</strong></div>
            <div className="flex justify-between"><span>Base amount</span><strong>₹{Number(baseAmount).toLocaleString('en-IN')}</strong></div>
            <div className="flex justify-between"><span>Discount ({deal?.discount_percent || 0}%)</span><strong>-₹{Number(discountAmount).toLocaleString('en-IN')}</strong></div>
            <div className="flex justify-between"><span>Amount after discount</span><strong>₹{Number(amountAfterDiscount).toLocaleString('en-IN')}</strong></div>
            <div className="flex justify-between"><span>GST ({deal?.gst_percent || 0}%)</span><strong>₹{Number(gstAmount).toLocaleString('en-IN')}</strong></div>
            <div className="flex justify-between border-t pt-2"><span>Total</span><strong>₹{Number(totalAmount).toLocaleString('en-IN')}</strong></div>
            <div className="flex justify-between"><span>Brokerage on discounted amount ({deal?.brokerage_percent || 0}%)</span><strong>₹{Number(brokerageAmount).toLocaleString('en-IN')}</strong></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4">Delivery Summary</h2>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div className="p-3 bg-gray-50 rounded">Delivered bags: <strong>{summary.total_bags}</strong></div>
            <div className="p-3 bg-gray-50 rounded">Remaining bags: <strong>{Math.max(0, (deal?.quantity || 0) - (summary.total_bags || 0))}</strong></div>
            <div className="p-3 bg-gray-50 rounded">Delivered amount: <strong>₹{Number(summary.total_amount || 0).toLocaleString('en-IN')}</strong></div>
            <div className="p-3 bg-gray-50 rounded">Brokerage earned: <strong>₹{Number(brokerageAmount).toLocaleString('en-IN')}</strong></div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Payment Status:</span>
            {(currentDeal?.payment_status === 'Delivered' || currentDeal?.payment_status === 'Paid') ? (
              <select
                value={currentDeal?.payment_status || 'Pending'}
                onChange={async (e) => {
                  const mockAPI = (await import('../utils/mockData')).mockAPI;
                  await (api.updateDealPayment || mockAPI.updateDealPayment)(deal.deal_id, e.target.value);
                  setCurrentDeal({ ...currentDeal, payment_status: e.target.value });
                }}
                className={`pl-2 pr-6 py-1 rounded text-sm font-medium min-w-[90px] ${
                  currentDeal?.payment_status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                <option value="Delivered">Delivered</option>
                <option value="Paid">Paid</option>
              </select>
            ) : (
              <span className={`px-3 py-1 rounded text-sm font-medium ${
                Math.max(0, (deal?.quantity || 0) - (summary.total_bags || 0)) === 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-800'
              }`}>
                {Math.max(0, (deal?.quantity || 0) - (summary.total_bags || 0)) === 0 ? 'Delivered' : 'Pending'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">Delivery Entries</h2>
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
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-6 text-center text-gray-400 text-sm">No delivery entries yet</td>
                </tr>
              ) : (
                <>
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
                  <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
                    <td className="px-4 py-2 text-sm" colSpan="3">TOTAL</td>
                    <td className="px-4 py-2 text-sm">{totalBags}</td>
                    <td className="px-4 py-2 text-sm">₹{totalAmountCol.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-sm">₹{totalGST.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-sm">₹{totalTotal.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-sm">₹{totalBrokerage.toLocaleString('en-IN')}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DealDetails;
