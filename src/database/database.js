const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

class Database {
  constructor() {
    // Create database in user data directory
    const dbPath = path.join(app.getPath('userData'), 'deal-tracker.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Connected to SQLite database at:', dbPath);
        this.initializeTables();
      }
    });
  }

  initializeTables() {
    // Create suppliers table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS suppliers (
        supplier_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_no TEXT,
        address TEXT,
        gst_no TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create buyers table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS buyers (
        buyer_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_no TEXT,
        address TEXT,
        gst_no TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create deals table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS deals (
        deal_id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER,
        buyer_id INTEGER,
        confirmation_date DATE,
        product_name TEXT,
        rate DECIMAL(10,2),
        quantity INTEGER,
        unit TEXT,
        kg_per_unit INTEGER DEFAULT 50,
        calculation_mode TEXT DEFAULT 'per_kg',
        discount_percent DECIMAL(5,2) DEFAULT 0,
        brokerage_percent DECIMAL(5,2) DEFAULT 0.5,
        gst_percent DECIMAL(5,2) DEFAULT 5,
        payment_status TEXT DEFAULT 'Pending',
        amount_without_gst DECIMAL(12,2),
        discount_amount DECIMAL(12,2),
        gst_amount DECIMAL(12,2),
        total_amount DECIMAL(12,2),
        brokerage_amount DECIMAL(12,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
        FOREIGN KEY (buyer_id) REFERENCES buyers(buyer_id)
      )
    `);

    // Create deliveries table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS deliveries (
        delivery_id INTEGER PRIMARY KEY AUTOINCREMENT,
        deal_id INTEGER,
        delivery_date DATE,
        bill_no TEXT,
        bags_delivered INTEGER,
        gst_percent DECIMAL(5,2),
        buyer_name TEXT,
        amount_without_gst DECIMAL(12,2),
        gst_amount DECIMAL(12,2),
        total_amount DECIMAL(12,2),
        brokerage_amount DECIMAL(12,2),
        payment_status TEXT DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (deal_id) REFERENCES deals(deal_id)
      )
    `);

    console.log('Database tables initialized');
  }

  // Suppliers methods
  addSupplier(supplier) {
    return new Promise((resolve, reject) => {
      const { name, contact_no, address, gst_no } = supplier;
      this.db.run(
        'INSERT INTO suppliers (name, contact_no, address, gst_no) VALUES (?, ?, ?, ?)',
        [name, contact_no, address, gst_no],
        function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID });
        }
      );
    });
  }

  getSuppliers() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM suppliers ORDER BY name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Buyers methods
  addBuyer(buyer) {
    return new Promise((resolve, reject) => {
      const { name, contact_no, address, gst_no } = buyer;
      this.db.run(
        'INSERT INTO buyers (name, contact_no, address, gst_no) VALUES (?, ?, ?, ?)',
        [name, contact_no, address, gst_no],
        function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID });
        }
      );
    });
  }

  getBuyers() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM buyers ORDER BY name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Deals methods
  addDeal(deal) {
    return new Promise((resolve, reject) => {
      const {
        supplier_id, buyer_id, confirmation_date, product_name, rate, quantity, unit,
        kg_per_unit, calculation_mode, discount_percent, brokerage_percent, gst_percent,
        amount_without_gst, discount_amount, gst_amount, total_amount, brokerage_amount
      } = deal;
      
      this.db.run(`
        INSERT INTO deals (
          supplier_id, buyer_id, confirmation_date, product_name, rate, quantity, unit,
          kg_per_unit, calculation_mode, discount_percent, brokerage_percent, gst_percent,
          amount_without_gst, discount_amount, gst_amount, total_amount, brokerage_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        supplier_id, buyer_id, confirmation_date, product_name, rate, quantity, unit,
        kg_per_unit, calculation_mode, discount_percent, brokerage_percent, gst_percent,
        amount_without_gst, discount_amount, gst_amount, total_amount, brokerage_amount
      ], function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID });
      });
    });
  }

  getDeals() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT d.*, s.name as supplier_name, b.name as buyer_name
        FROM deals d
        LEFT JOIN suppliers s ON d.supplier_id = s.supplier_id
        LEFT JOIN buyers b ON d.buyer_id = b.buyer_id
        ORDER BY d.confirmation_date DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  updateDeal(deal) {
    return new Promise((resolve, reject) => {
      const {
        deal_id, supplier_id, buyer_id, confirmation_date, product_name, rate, quantity, unit,
        kg_per_unit, calculation_mode, discount_percent, brokerage_percent, gst_percent,
        amount_without_gst, discount_amount, gst_amount, total_amount, brokerage_amount
      } = deal;
      
      this.db.run(`
        UPDATE deals SET
          supplier_id = ?, buyer_id = ?, confirmation_date = ?, product_name = ?, rate = ?,
          quantity = ?, unit = ?, kg_per_unit = ?, calculation_mode = ?, discount_percent = ?,
          brokerage_percent = ?, gst_percent = ?, amount_without_gst = ?, discount_amount = ?,
          gst_amount = ?, total_amount = ?, brokerage_amount = ?
        WHERE deal_id = ?
      `, [
        supplier_id, buyer_id, confirmation_date, product_name, rate, quantity, unit,
        kg_per_unit, calculation_mode, discount_percent, brokerage_percent, gst_percent,
        amount_without_gst, discount_amount, gst_amount, total_amount, brokerage_amount, deal_id
      ], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  deleteDeal(dealId) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM deals WHERE deal_id = ?', [dealId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  updateDealPayment(dealId, paymentStatus) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE deals SET payment_status = ? WHERE deal_id = ?',
        [paymentStatus, dealId],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }

  // Deliveries methods
  addDelivery(delivery) {
    return new Promise((resolve, reject) => {
      const {
        deal_id, delivery_date, bill_no, bags_delivered, gst_percent, buyer_name,
        amount_without_gst, gst_amount, total_amount, brokerage_amount, payment_status
      } = delivery;
      
      this.db.run(`
        INSERT INTO deliveries (
          deal_id, delivery_date, bill_no, bags_delivered, gst_percent, buyer_name,
          amount_without_gst, gst_amount, total_amount, brokerage_amount, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        deal_id, delivery_date, bill_no, bags_delivered, gst_percent, buyer_name,
        amount_without_gst, gst_amount, total_amount, brokerage_amount, payment_status
      ], function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID });
      });
    });
  }

  getDeliveries(params = {}) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM deliveries';
      let queryParams = [];
      
      if (params.deal_id) {
        query += ' WHERE deal_id = ?';
        queryParams.push(params.deal_id);
      }
      
      query += ' ORDER BY delivery_date DESC';
      
      this.db.all(query, queryParams, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getDeliverySummary(dealId) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          COALESCE(SUM(bags_delivered), 0) as total_bags,
          COALESCE(SUM(total_amount), 0) as total_amount,
          COALESCE(SUM(brokerage_amount), 0) as total_brokerage
        FROM deliveries 
        WHERE deal_id = ?
      `, [dealId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  getDashboardStats() {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          COUNT(*) as totalDeals,
          COALESCE(SUM(brokerage_amount), 0) as totalBrokerage,
          COALESCE(SUM(CASE WHEN payment_status = 'Pending' THEN brokerage_amount ELSE 0 END), 0) as pendingBrokerage
        FROM deals
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  close() {
    this.db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

module.exports = Database;