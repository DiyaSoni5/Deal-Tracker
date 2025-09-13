// Empty arrays - no mock data
export const mockSuppliers = [];
export const mockBuyers = [];
export const mockDeals = [];



// Mock API for browser testing
export const mockAPI = {
  resetAllData: () => {
    // Completely clear all arrays
    mockSuppliers.splice(0, mockSuppliers.length);
    mockBuyers.splice(0, mockBuyers.length);
    mockDeals.splice(0, mockDeals.length);
    
    // Reset array references
    while(mockSuppliers.length > 0) mockSuppliers.pop();
    while(mockBuyers.length > 0) mockBuyers.pop();
    while(mockDeals.length > 0) mockDeals.pop();
    
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
    // Update the first deal to remove it since we're adding a new one
    if (mockDeals.length > 1 && mockDeals[0].deal_id === 1) {
      mockDeals.shift();
    }
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
      mockDeals[dealIndex] = { ...mockDeals[dealIndex], ...deal };
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
  updateDeal: (deal) => {
    const dealIndex = mockDeals.findIndex(d => d.deal_id === deal.deal_id);
    if (dealIndex > -1) {
      mockDeals[dealIndex] = { ...mockDeals[dealIndex], ...deal };
    }
    return Promise.resolve();
  }
};