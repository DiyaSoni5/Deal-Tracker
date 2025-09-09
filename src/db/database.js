const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class BrokerDatabase {
  constructor() {
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'broker.db');
    this.db = new sqlite3.Database(dbPath);
    this.initTables();
  }

  initTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS suppliers (
        supplier_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_no TEXT,
        address TEXT,
        gst_no TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS buyers (
        buyer_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_no TEXT,
        address TEXT,
        gst_no TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS deals (
        deal_id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER,
        buyer_id INTEGER,
        confirmation_date DATE,
        product_name TEXT,
        rate DECIMAL(10,2),
        quantity INTEGER,
        unit TEXT DEFAULT 'bags',
        discount_percent DECIMAL(5,2) DEFAULT 0,
        brokerage_percent DECIMAL(5,2),
        gst_percent DECIMAL(5,2) DEFAULT 5,
        status TEXT DEFAULT 'Confirmed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id),
        FOREIGN KEY (buyer_id) REFERENCES buyers (buyer_id)
      )`,
      `CREATE TABLE IF NOT EXISTS bills (
        bill_id INTEGER PRIMARY KEY AUTOINCREMENT,
        deal_id INTEGER,
        bill_no TEXT,
        bill_date DATE,
        amount_without_gst DECIMAL(12,2),
        gst_amount DECIMAL(12,2),
        amount_with_gst DECIMAL(12,2),
        total_quantity INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (deal_id) REFERENCES deals (deal_id)
      )`,
      `CREATE TABLE IF NOT EXISTS payments (
        payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        deal_id INTEGER,
        payment_date DATE,
        amount_paid DECIMAL(12,2),
        pending_balance DECIMAL(12,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (deal_id) REFERENCES deals (deal_id)
      )`,
      `CREATE TABLE IF NOT EXISTS brokerage (
        brokerage_id INTEGER PRIMARY KEY AUTOINCREMENT,
        deal_id INTEGER,
        brokerage_amount DECIMAL(10,2),
        brokerage_invoice_no TEXT,
        brokerage_status TEXT DEFAULT 'Unpaid',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (deal_id) REFERENCES deals (deal_id)
      )`
    ];

    tables.forEach(sql => {
      this.db.run(sql, (err) => {
        if (err) console.error('Error creating table:', err);
      });
    });
  }

  // Suppliers
  getSuppliers() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM suppliers ORDER BY name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  addSupplier(supplier) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO suppliers (name, contact_no, address, gst_no) VALUES (?, ?, ?, ?)',
        [supplier.name, supplier.contact_no, supplier.address, supplier.gst_no],
        function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID });
        }
      );
    });
  }

  // Buyers
  getBuyers() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM buyers ORDER BY name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  addBuyer(buyer) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO buyers (name, contact_no, address, gst_no) VALUES (?, ?, ?, ?)',
        [buyer.name, buyer.contact_no, buyer.address, buyer.gst_no],
        function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID });
        }
      );
    });
  }

  // Deals
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

  addDeal(deal) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO deals (supplier_id, buyer_id, confirmation_date, product_name, rate, quantity, unit, discount_percent, brokerage_percent, gst_percent, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [deal.supplier_id, deal.buyer_id, deal.confirmation_date, deal.product_name,
         deal.rate, deal.quantity, deal.unit, deal.discount_percent, deal.brokerage_percent,
         deal.gst_percent, deal.status],
        function(err) {
          if (err) {
            reject(err);
          } else {
            // Auto-calculate and insert brokerage
            const amount_without_gst = deal.rate * deal.quantity;
            const brokerage_amount = (amount_without_gst * deal.brokerage_percent) / 100;
            
            this.db.run(
              'INSERT INTO brokerage (deal_id, brokerage_amount) VALUES (?, ?)',
              [this.lastID, brokerage_amount],
              (brokerageErr) => {
                if (brokerageErr) reject(brokerageErr);
                else resolve({ lastID: this.lastID });
              }
            );
          }
        }.bind(this)
      );
    });
  }

  getDashboardStats() {
    return new Promise((resolve, reject) => {
      const stats = { totalDeals: 0, totalBrokerage: 0, pendingBrokerage: 0 };
      
      this.db.get('SELECT COUNT(*) as count FROM deals', (err, row) => {
        if (err) return reject(err);
        stats.totalDeals = row.count;
        
        this.db.get('SELECT SUM(brokerage_amount) as total FROM brokerage', (err, row) => {
          if (err) return reject(err);
          stats.totalBrokerage = row.total || 0;
          
          this.db.get('SELECT SUM(brokerage_amount) as total FROM brokerage WHERE brokerage_status = "Unpaid"', (err, row) => {
            if (err) return reject(err);
            stats.pendingBrokerage = row.total || 0;
            resolve(stats);
          });
        });
      });
    });
  }

  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = BrokerDatabase;