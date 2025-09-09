// Mock data for browser testing
export const mockSuppliers = [
  { supplier_id: 1, name: 'Madhav Cotspin', contact_no: '9876543210', address: 'Samana', gst_no: 'GST123456', created_at: new Date().toISOString() },
  { supplier_id: 2, name: 'ABC Textiles', contact_no: '9876543211', address: 'Mumbai', gst_no: 'GST123457', created_at: new Date().toISOString() }
];

export const mockBuyers = [
  { buyer_id: 1, name: 'Shri Rani Sati Textile', contact_no: '9876543220', address: 'Malegaon', gst_no: 'GST123458', created_at: new Date().toISOString() },
  { buyer_id: 2, name: 'XYZ Trading', contact_no: '9876543221', address: 'Delhi', gst_no: 'GST123459', created_at: new Date().toISOString() }
];

export const mockDeals = [
  {
    deal_id: 1,
    supplier_id: 1,
    buyer_id: 1,
    supplier_name: 'Madhav Cotspin',
    buyer_name: 'Shri Rani Sati Textile',
    confirmation_date: '2024-01-15',
    product_name: 'Cotton Yarn',
    rate: 189,
    quantity: 350,
    unit: 'bags',
    discount_percent: 2,
    brokerage_percent: 0.5,
    gst_percent: 5,
    status: 'Confirmed',
    created_at: new Date().toISOString()
  }
];

export const mockStats = {
  totalDeals: 1,
  totalBrokerage: 33075,
  pendingBrokerage: 16537.5
};

// Mock API for browser testing
export const mockAPI = {
  resetAllData: () => {
    mockSuppliers.length = 0;
    mockBuyers.length = 0;
    mockDeals.length = 0;
    return Promise.resolve();
  },
  getSuppliers: () => Promise.resolve(mockSuppliers),
  getBuyers: () => Promise.resolve(mockBuyers),
  getDeals: () => Promise.resolve(mockDeals),
  getDashboardStats: () => Promise.resolve(mockStats),
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
  }
};