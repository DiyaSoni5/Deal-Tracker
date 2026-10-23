const mongoose = require('mongoose');

// ── Connection ──────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/deal-tracker';

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected');
}

// ── Schemas ─────────────────────────────────────────────────────────────────
const supplierSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  contact_no: String,
  address:    String,
  gst_no:     String,
}, { timestamps: { createdAt: 'created_at' } });

const buyerSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  contact_no: String,
  address:    String,
  gst_no:     String,
}, { timestamps: { createdAt: 'created_at' } });

const dealSchema = new mongoose.Schema({
  supplier_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  buyer_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer',    required: true },
  confirmation_date:  String,
  product_name:       String,
  rate:               Number,
  quantity:           Number,
  unit:               { type: String, default: 'bags' },
  kg_per_unit:        { type: Number, default: 50 },
  calculation_mode:   { type: String, default: 'per_kg' },
  discount_percent:   { type: Number, default: 0 },
  brokerage_percent:  { type: Number, default: 0.5 },
  brokerage_mode:     { type: String, default: 'percentage' },
  brokerage_per_bag:  { type: Number, default: 0 },
  gst_percent:        { type: Number, default: 5 },
  payment_status:     { type: String, default: 'Pending' },
  status:             { type: String, default: 'Confirmed' },
  amount_without_gst: Number,
  discount_amount:    Number,
  gst_amount:         Number,
  total_amount:       Number,
  brokerage_amount:   Number,
}, { timestamps: { createdAt: 'created_at' } });

const deliverySchema = new mongoose.Schema({
  deal_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', required: true },
  delivery_date:    String,
  bill_no:          String,
  bags_delivered:   Number,
  gst_percent:      Number,
  buyer_name:       String,
  amount_without_gst: Number,
  gst_amount:       Number,
  total_amount:     Number,
  brokerage_amount: Number,
  payment_status:   { type: String, default: 'Pending' },
}, { timestamps: { createdAt: 'created_at' } });

const Supplier = mongoose.model('Supplier', supplierSchema);
const Buyer    = mongoose.model('Buyer',    buyerSchema);
const Deal     = mongoose.model('Deal',     dealSchema);
const Delivery = mongoose.model('Delivery', deliverySchema);

// ── Helper: convert Mongo doc to plain object with _id as string id ──────────
const toPlain = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject({ virtuals: false }) : { ...doc };
  obj.id = obj._id?.toString();
  return obj;
};

// ── Database class (same interface as old SQLite Database) ───────────────────
class Database {
  async init() {
    await connectDB();
  }

  // Suppliers
  async addSupplier(supplier) {
    await connectDB();
    const doc = await Supplier.create(supplier);
    return { lastID: doc._id.toString() };
  }

  async getSuppliers() {
    await connectDB();
    const docs = await Supplier.find().sort({ name: 1 });
    return docs.map(d => ({
      supplier_id: d._id.toString(),
      name: d.name,
      contact_no: d.contact_no,
      address: d.address,
      gst_no: d.gst_no,
      created_at: d.created_at,
    }));
  }

  // Buyers
  async addBuyer(buyer) {
    await connectDB();
    const doc = await Buyer.create(buyer);
    return { lastID: doc._id.toString() };
  }

  async getBuyers() {
    await connectDB();
    const docs = await Buyer.find().sort({ name: 1 });
    return docs.map(d => ({
      buyer_id: d._id.toString(),
      name: d.name,
      contact_no: d.contact_no,
      address: d.address,
      gst_no: d.gst_no,
      created_at: d.created_at,
    }));
  }

  // Deals
  async addDeal(deal) {
    await connectDB();
    const doc = await Deal.create({
      ...deal,
      supplier_id: deal.supplier_id,
      buyer_id:    deal.buyer_id,
    });
    return { lastID: doc._id.toString() };
  }

  async getDeals() {
    await connectDB();
    const docs = await Deal.find()
      .populate('supplier_id', 'name')
      .populate('buyer_id', 'name')
      .sort({ confirmation_date: -1 });

    return docs.map(d => ({
      deal_id:           d._id.toString(),
      supplier_id:       d.supplier_id?._id?.toString(),
      buyer_id:          d.buyer_id?._id?.toString(),
      supplier_name:     d.supplier_id?.name || '',
      buyer_name:        d.buyer_id?.name || '',
      confirmation_date: d.confirmation_date,
      product_name:      d.product_name,
      rate:              d.rate,
      quantity:          d.quantity,
      unit:              d.unit,
      kg_per_unit:       d.kg_per_unit,
      calculation_mode:  d.calculation_mode,
      discount_percent:  d.discount_percent,
      brokerage_percent: d.brokerage_percent,
      brokerage_mode:    d.brokerage_mode,
      brokerage_per_bag: d.brokerage_per_bag,
      gst_percent:       d.gst_percent,
      payment_status:    d.payment_status,
      status:            d.status,
      amount_without_gst: d.amount_without_gst,
      discount_amount:   d.discount_amount,
      gst_amount:        d.gst_amount,
      total_amount:      d.total_amount,
      brokerage_amount:  d.brokerage_amount,
      created_at:        d.created_at,
    }));
  }

  async updateDeal(deal) {
    await connectDB();
    await Deal.findByIdAndUpdate(deal.deal_id, {
      supplier_id:        deal.supplier_id,
      buyer_id:           deal.buyer_id,
      confirmation_date:  deal.confirmation_date,
      product_name:       deal.product_name,
      rate:               deal.rate,
      quantity:           deal.quantity,
      unit:               deal.unit,
      kg_per_unit:        deal.kg_per_unit,
      calculation_mode:   deal.calculation_mode,
      discount_percent:   deal.discount_percent,
      brokerage_percent:  deal.brokerage_percent,
      brokerage_mode:     deal.brokerage_mode,
      brokerage_per_bag:  deal.brokerage_per_bag,
      gst_percent:        deal.gst_percent,
      amount_without_gst: deal.amount_without_gst,
      discount_amount:    deal.discount_amount,
      gst_amount:         deal.gst_amount,
      total_amount:       deal.total_amount,
      brokerage_amount:   deal.brokerage_amount,
    });
    return { success: true };
  }

  async deleteDeal(dealId) {
    await connectDB();
    await Deal.findByIdAndDelete(dealId);
    await Delivery.deleteMany({ deal_id: dealId });
    return { success: true };
  }

  async updateDealPayment(dealId, paymentStatus) {
    await connectDB();
    await Deal.findByIdAndUpdate(dealId, { payment_status: paymentStatus });
    return { success: true };
  }

  // Deliveries
  async addDelivery(delivery) {
    await connectDB();
    const doc = await Delivery.create(delivery);
    return { lastID: doc._id.toString() };
  }

  async getDeliveries(params = {}) {
    await connectDB();
    const filter = {};
    if (params.deal_id) filter.deal_id = params.deal_id;
    const docs = await Delivery.find(filter).sort({ delivery_date: -1 });
    return docs.map(d => ({
      delivery_id:       d._id.toString(),
      deal_id:           d.deal_id?.toString(),
      delivery_date:     d.delivery_date,
      bill_no:           d.bill_no,
      bags_delivered:    d.bags_delivered,
      gst_percent:       d.gst_percent,
      buyer_name:        d.buyer_name,
      amount_without_gst: d.amount_without_gst,
      gst_amount:        d.gst_amount,
      total_amount:      d.total_amount,
      brokerage_amount:  d.brokerage_amount,
      payment_status:    d.payment_status,
      created_at:        d.created_at,
    }));
  }

  async getDeliverySummary(dealId) {
    await connectDB();
    const result = await Delivery.aggregate([
      { $match: { deal_id: new mongoose.Types.ObjectId(dealId) } },
      { $group: {
        _id: null,
        total_bags:      { $sum: '$bags_delivered' },
        total_amount:    { $sum: '$total_amount' },
        total_brokerage: { $sum: '$brokerage_amount' },
      }},
    ]);
    return result[0] || { total_bags: 0, total_amount: 0, total_brokerage: 0 };
  }

  async markDealPaid(dealId) {
    await connectDB();
    await Deal.findByIdAndUpdate(dealId, { payment_status: 'Paid' });
    await Delivery.updateMany({ deal_id: dealId }, { payment_status: 'Paid' });
    return { success: true };
  }

  async reportDeliveriesDetailed(filters = {}) {
    await connectDB();
    const match = {};
    if (filters.buyer_name) match.buyer_name = filters.buyer_name;
    if (filters.start_date) match.delivery_date = { $gte: filters.start_date };
    if (filters.end_date)   match.delivery_date = { ...match.delivery_date, $lte: filters.end_date };
    const docs = await Delivery.find(match).sort({ delivery_date: 1 });
    return docs.map(d => ({
      delivery_id:       d._id.toString(),
      deal_id:           d.deal_id?.toString(),
      delivery_date:     d.delivery_date,
      bill_no:           d.bill_no,
      buyer_name:        d.buyer_name,
      bags_delivered:    d.bags_delivered,
      gst_percent:       d.gst_percent,
      amount_without_gst: d.amount_without_gst,
      gst_amount:        d.gst_amount,
      total_amount:      d.total_amount,
      brokerage_amount:  d.brokerage_amount,
      payment_status:    d.payment_status,
    }));
  }

  async getDashboardStats() {
    await connectDB();
    const totalDeals = await Deal.countDocuments();
    const brokerageResult = await Deal.aggregate([
      { $group: {
        _id: null,
        totalBrokerage:   { $sum: '$brokerage_amount' },
        pendingBrokerage: { $sum: { $cond: [{ $ne: ['$payment_status', 'Paid'] }, '$brokerage_amount', 0] } },
      }},
    ]);
    return {
      totalDeals,
      totalBrokerage:   brokerageResult[0]?.totalBrokerage   || 0,
      pendingBrokerage: brokerageResult[0]?.pendingBrokerage || 0,
    };
  }

  async resetAllData() {
    await connectDB();
    await Promise.all([
      Supplier.deleteMany({}),
      Buyer.deleteMany({}),
      Deal.deleteMany({}),
      Delivery.deleteMany({}),
    ]);
    return { success: true };
  }

  close() {
    mongoose.connection.close();
  }
}

module.exports = Database;
