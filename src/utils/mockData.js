// Mock deliveries store
const mockDeliveries = [];

export const mockSuppliers = [];
export const mockBuyers = [];
export const mockDeals = [];



// Mock API for browser testing
export const mockAPI = {
  resetAllData: () => {
    mockSuppliers.splice(0, mockSuppliers.length);
    mockBuyers.splice(0, mockBuyers.length);
    mockDeals.splice(0, mockDeals.length);
    mockDeliveries.splice(0, mockDeliveries.length);
    return Promise.resolve();
  },
  getSuppliers: () => Promise.resolve(mockSuppliers),
  getBuyers: () => Promise.resolve(mockBuyers),
  getDeals: () => Promise.resolve(mockDeals),
  getDashboardStats: () => {
    const totalDeals = mockDeals.length;
    const totalBrokerage = mockDeals.reduce((sum, deal) => sum + (deal.brokerage_amount || 0), 0);
    
    return Promise.resolve({
      totalDeals,
      totalBrokerage,
      pendingBrokerage: totalBrokerage
    });
  },
  addSupplier: (supplier) => {
    const newSupplier = { ...supplier, supplier_id: Date.now(), created_at: new Date().toISOString() };
    mockSuppliers.push(newSupplier);
    return Promise.resolve({ lastID: newSupplier.supplier_id });
  },
  addBuyer: (buyer) => {
    const newBuyer = { ...buyer, buyer_id: Date.now(), created_at: new Date().toISOString() };
    mockBuyers.push(newBuyer);
    return Promise.resolve({ lastID: newBuyer.buyer_id });
  },
  addDeal: (deal) => {
    const newDeal = { 
      ...deal, 
      deal_id: Date.now(), 
      created_at: new Date().toISOString(),
      supplier_name: mockSuppliers.find(s => s.supplier_id == deal.supplier_id)?.name || 'Unknown',
      buyer_name: mockBuyers.find(b => b.buyer_id == deal.buyer_id)?.name || 'Unknown'
    };
    mockDeals.push(newDeal);
    return Promise.resolve({ lastID: newDeal.deal_id });
  },
  deleteDeal: (dealId) => {
    const index = mockDeals.findIndex(deal => deal.deal_id === dealId);
    if (index > -1) {
      mockDeals.splice(index, 1);
    }
    return Promise.resolve();
  },
  updateDeal: (deal) => {
    const dealIndex = mockDeals.findIndex(d => d.deal_id === deal.deal_id);
    if (dealIndex > -1) {
      mockDeals[dealIndex] = {
        ...mockDeals[dealIndex],
        ...deal,
        supplier_name: mockSuppliers.find(s => s.supplier_id == deal.supplier_id)?.name || mockDeals[dealIndex].supplier_name,
        buyer_name: mockBuyers.find(b => b.buyer_id == deal.buyer_id)?.name || mockDeals[dealIndex].buyer_name
      };
      return Promise.resolve({ success: true });
    }
    return Promise.reject(new Error('Deal not found'));
  },
  updateDealPayment: (dealId, paymentStatus) => {
    const dealIndex = mockDeals.findIndex(d => d.deal_id === dealId);
    if (dealIndex > -1) {
      mockDeals[dealIndex].payment_status = paymentStatus;
    }
    return Promise.resolve();
  },
  addDelivery: (entry) => {
    const delivery = { ...entry, delivery_id: Date.now(), created_at: new Date().toISOString() };
    mockDeliveries.push(delivery);
    return Promise.resolve({ lastID: delivery.delivery_id });
  },
  getDeliveries: (params = {}) => {
    const rows = params.deal_id
      ? mockDeliveries.filter(d => d.deal_id === Number(params.deal_id))
      : mockDeliveries;
    return Promise.resolve(rows);
  },
  getDeliverySummary: (dealId) => {
    const rows = mockDeliveries.filter(d => d.deal_id === Number(dealId));
    const total_bags = rows.reduce((s, r) => s + Number(r.bags_delivered || 0), 0);
    const total_amount = rows.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const total_brokerage = rows.reduce((s, r) => s + Number(r.brokerage_amount || 0), 0);
    return Promise.resolve({ total_bags, total_amount, total_brokerage });
  },
  markDealPaid: (dealId) => {
    const dealIndex = mockDeals.findIndex(d => d.deal_id === dealId);
    if (dealIndex > -1) mockDeals[dealIndex].payment_status = 'Paid';
    mockDeliveries.filter(d => d.deal_id === dealId).forEach(d => { d.payment_status = 'Paid'; });
    return Promise.resolve({ success: true });
  },
  reportDeliveriesDetailed: (filters = {}) => {
    let rows = [...mockDeliveries];
    if (filters.buyer_name) rows = rows.filter(r => r.buyer_name === filters.buyer_name);
    if (filters.start_date) rows = rows.filter(r => r.delivery_date >= filters.start_date);
    if (filters.end_date) rows = rows.filter(r => r.delivery_date <= filters.end_date);
    return Promise.resolve(rows);
  }
};