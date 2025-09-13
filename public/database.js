const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class BrokerDatabase {
  constructor() {
    const dataDir = path.join(__dirname, '../data');
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS brokerage (
        brokerage_id INTEGER PRIMARY KEY AUTOINCREMENT,
        deal_id INTEGER,
        brokerage_amount DECIMAL(10,2),
        brokerage_status TEXT DEFAULT 'Unpaid',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS deliveries (
        delivery_id INTEGER PRIMARY KEY AUTOINCREMENT,
        deal_id INTEGER NOT NULL,
        delivery_date DATE NOT NULL,
        bill_no TEXT,
        bags_delivered INTEGER NOT NULL,
        gst_percent DECIMAL(5,2) DEFAULT 0,
        buyer_name TEXT,
        amount_without_gst DECIMAL(12,2),
        gst_amount DECIMAL(12,2),
        total_amount DECIMAL(12,2),
        brokerage_amount DECIMAL(12,2),
        payment_status TEXT DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    tables.forEach(sql => {
      this.db.run(sql, (err) => {
        if (err) console.error('Error creating table:', err);
      });
    });

    // Ensure legacy databases have required columns
    const ensureColumn = (table, column, definition) => {
      this.db.all(`PRAGMA table_info(${table})`, (err, rows) => {
        if (err) return console.error('PRAGMA error:', table, err);
        const has = Array.isArray(rows) && rows.some(r => r.name === column);
        if (!has) {
          this.db.run(`ALTER TABLE ${table} ADD COLUMN ${definition}`, (alterErr) => {
            if (alterErr) console.error(`Failed to add column ${table}.${column}:`, alterErr);
          });
        }
      });
    };

    ensureColumn('brokerage', 'brokerage_status', 'TEXT DEFAULT "Unpaid"');
    ensureColumn('deliveries', 'payment_status', 'TEXT DEFAULT "Pending"');
    ensureColumn('deals', 'kg_per_unit', 'INTEGER DEFAULT 50');
    ensureColumn('deals', 'calculation_mode', 'TEXT DEFAULT "per_unit"');
  }

  resetAllData() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        const statements = [
          'DELETE FROM brokerage',
          'DELETE FROM deals',
          'DELETE FROM suppliers',
          'DELETE FROM buyers'
        ];
        let hadError = false;
        statements.forEach((sql) => {
          if (hadError) return;
          this.db.run(sql, (err) => {
            if (err && !hadError) {
              hadError = true;
              reject(err);
            }
          });
        });
        if (!hadError) {
          resolve({ success: true });
        }
      });
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
      // Detect optional columns for backward compatibility with older databases
      this.db.all('PRAGMA table_info(deals)', (pragmaErr, columns) => {
        if (pragmaErr) return reject(pragmaErr);

        const hasKgPerUnit = Array.isArray(columns) && columns.some(c => c.name === 'kg_per_unit');
        const hasCalcMode = Array.isArray(columns) && columns.some(c => c.name === 'calculation_mode');

        const cols = ['supplier_id', 'buyer_id', 'confirmation_date', 'product_name', 'rate', 'quantity', 'unit', 'discount_percent', 'brokerage_percent', 'gst_percent', 'status'];
        const params = [
          deal.supplier_id,
          deal.buyer_id,
          deal.confirmation_date,
          deal.product_name,
          Number(deal.rate || 0),
          Number(deal.quantity || 0),
          deal.unit || 'bags',
          Number(deal.discount_percent || 0),
          Number(deal.brokerage_percent || 0),
          Number(deal.gst_percent || 0),
          deal.status || 'Confirmed'
        ];

        if (hasKgPerUnit) {
          cols.push('kg_per_unit');
          params.push(Number(deal.kg_per_unit || 50));
        }
        if (hasCalcMode) {
          cols.push('calculation_mode');
          params.push(deal.calculation_mode || 'per_unit');
        }

        const placeholders = cols.map(() => '?').join(', ');
        const sql = `INSERT INTO deals (${cols.join(', ')}) VALUES (${placeholders})`;

        this.db.run(sql, params, function(err) {
          if (err) return reject(err);

          // Compute brokerage on amount after discount (without GST)
          const kgPerUnit = Number(deal.kg_per_unit || 50);
          const isPerKg = (deal.calculation_mode === 'per_kg');
          const baseAmount = isPerKg
            ? Number(deal.rate || 0) * Number(deal.quantity || 0) * kgPerUnit
            : Number(deal.rate || 0) * Number(deal.quantity || 0);
          const discountAmount = baseAmount * (Number(deal.discount_percent || 0) / 100);
          const afterDiscount = baseAmount - discountAmount;
          const brokerage_amount = afterDiscount * (Number(deal.brokerage_percent || 0) / 100);

          // Insert brokerage row
          const ctx = this; // function scope "this" is Statement; need db from outer class via bind below
          ctx.db.run(
            'INSERT INTO brokerage (deal_id, brokerage_amount) VALUES (?, ?)',
            [ctx.lastID, brokerage_amount],
            (brokerageErr) => {
              if (brokerageErr) reject(brokerageErr);
              else resolve({ lastID: ctx.lastID });
            }
          );
        }.bind(this));
      });
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

  updateDeal(deal) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE deals SET 
         supplier_id = ?, buyer_id = ?, confirmation_date = ?, product_name = ?, 
         rate = ?, quantity = ?, unit = ?, discount_percent = ?, 
         brokerage_percent = ?, gst_percent = ?, status = ?, kg_per_unit = ?, calculation_mode = ?
         WHERE deal_id = ?`,
        [deal.supplier_id, deal.buyer_id, deal.confirmation_date, deal.product_name,
         deal.rate, deal.quantity, deal.unit, deal.discount_percent, deal.brokerage_percent,
         deal.gst_percent, deal.status, deal.kg_per_unit || 50, deal.calculation_mode || 'per_unit', deal.deal_id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            // Update brokerage amount if it exists
            if (deal.brokerage_amount !== undefined) {
              this.db.run(
                'UPDATE brokerage SET brokerage_amount = ? WHERE deal_id = ?',
                [deal.brokerage_amount, deal.deal_id],
                (brokerageErr) => {
                  if (brokerageErr) reject(brokerageErr);
                  else resolve({ success: true });
                }
              );
            } else {
              resolve({ success: true });
            }
          }
        }.bind(this)
      );
    });
  }

  deleteDeal(dealId) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM deals WHERE deal_id = ?', [dealId], function(err) {
        if (err) reject(err);
        else resolve({ success: true });
      });
    });
  }

  addDelivery(entry) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM deals WHERE deal_id = ?', [entry.deal_id], (err, deal) => {
        if (err) return reject(err);
        if (!deal) return reject(new Error('Deal not found'));

        const rate = Number(deal.rate || 0);
        const bags = Number(entry.bags_delivered || 0);
        const gst = Number(entry.gst_percent != null ? entry.gst_percent : deal.gst_percent || 0);
        const discountPercent = Number(deal.discount_percent || 0);
        // default to 50 kg/bag if not stored
        const kgPerUnit = Number(deal.kg_per_unit || 50);
        const baseAmount = rate * bags * kgPerUnit;
        const discountAmount = baseAmount * (discountPercent / 100);
        const amount = baseAmount - discountAmount;
        const gstAmount = amount * (gst / 100);
        const total = amount + gstAmount;
        const brokeragePerBag = rate * kgPerUnit * (Number(deal.brokerage_percent || 0) / 100);
        const brokerage = bags * brokeragePerBag;

        const sql = `INSERT INTO deliveries (deal_id, delivery_date, bill_no, bags_delivered, gst_percent, buyer_name, amount_without_gst, gst_amount, total_amount, brokerage_amount, payment_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        this.db.run(
          sql,
          [entry.deal_id, entry.delivery_date, entry.bill_no, bags, entry.gst_percent, entry.buyer_name, amount, gstAmount, total, brokerage, entry.payment_status || 'Pending'],
          function(runErr) {
            if (runErr) reject(runErr);
            else resolve({ lastID: this.lastID });
          }
        );
      });
    });
  }

  getDeliveriesByFilter({ buyer_name, start_date, end_date, deal_id }) {
    return new Promise((resolve, reject) => {
      const conditions = [];
      const params = [];
      if (buyer_name) { conditions.push('buyer_name = ?'); params.push(buyer_name); }
      if (deal_id) { conditions.push('deal_id = ?'); params.push(deal_id); }
      if (start_date) { conditions.push('date(delivery_date) >= date(?)'); params.push(start_date); }
      if (end_date) { conditions.push('date(delivery_date) <= date(?)'); params.push(end_date); }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const sql = `SELECT * FROM deliveries ${where} ORDER BY date(delivery_date) DESC`;
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getDeliveriesDetailed(filters = {}) {
    return new Promise((resolve, reject) => {
      const conditions = [];
      const params = [];
      if (filters.buyer_name) { conditions.push('del.buyer_name = ?'); params.push(filters.buyer_name); }
      if (filters.start_date) { conditions.push('date(del.delivery_date) >= date(?)'); params.push(filters.start_date); }
      if (filters.end_date) { conditions.push('date(del.delivery_date) <= date(?)'); params.push(filters.end_date); }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const sql = `
        SELECT del.*, d.rate as deal_rate, d.quantity as deal_quantity, d.product_name,
               d.buyer_id, d.supplier_id, d.confirmation_date, s.name as supplier_name, b.name as party_name
        FROM deliveries del
        LEFT JOIN deals d ON del.deal_id = d.deal_id
        LEFT JOIN suppliers s ON d.supplier_id = s.supplier_id
        LEFT JOIN buyers b ON d.buyer_id = b.buyer_id
        ${where}
        ORDER BY ${filters.buyer_name ? 'date(del.delivery_date) ASC' : 'party_name ASC, date(del.delivery_date) ASC'}
      `;
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getDeliveriesConsolidated(start_date, end_date) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT b.name as party_name,
               SUM(del.bags_delivered) as total_bags,
               SUM(del.amount_without_gst) as amount_wo_gst,
               SUM(del.gst_amount) as gst_amount,
               SUM(del.total_amount) as amount_with_gst,
               SUM(del.brokerage_amount) as brokerage_amount,
               COUNT(*) as bills,
               SUM(del.amount_without_gst * 1.0) / NULLIF(SUM(del.bags_delivered * 1.0), 0) as avg_rate
        FROM deliveries del
        LEFT JOIN deals d ON del.deal_id = d.deal_id
        LEFT JOIN buyers b ON d.buyer_id = b.buyer_id
        WHERE date(del.delivery_date) >= date(?) AND date(del.delivery_date) <= date(?)
        GROUP BY party_name
        ORDER BY party_name ASC
      `;
      this.db.all(sql, [start_date, end_date], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getOngoingDeals() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT d.deal_id, s.name as supplier_name, b.name as buyer_name, d.quantity as total_bags,
               IFNULL(SUM(del.bags_delivered), 0) as delivered_bags,
               (d.quantity - IFNULL(SUM(del.bags_delivered), 0)) as remaining_bags,
               d.rate as deal_rate,
               d.confirmation_date as start_date,
               MAX(del.delivery_date) as last_delivery_date
        FROM deals d
        LEFT JOIN suppliers s ON d.supplier_id = s.supplier_id
        LEFT JOIN buyers b ON d.buyer_id = b.buyer_id
        LEFT JOIN deliveries del ON d.deal_id = del.deal_id
        GROUP BY d.deal_id
        HAVING remaining_bags > 0
        ORDER BY remaining_bags DESC
      `;
      this.db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getDeliverySummary(dealId) {
    return new Promise((resolve, reject) => {
      const summary = {};
      this.db.get('SELECT SUM(bags_delivered) as total_bags, SUM(total_amount) as total_amount, SUM(brokerage_amount) as total_brokerage FROM deliveries WHERE deal_id = ?', [dealId], (err, row) => {
        if (err) return reject(err);
        summary.total_bags = row.total_bags || 0;
        summary.total_amount = row.total_amount || 0;
        summary.total_brokerage = row.total_brokerage || 0;
        resolve(summary);
      });
    });
  }

  markDealPaid(dealId) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('UPDATE brokerage SET brokerage_status = "Paid" WHERE deal_id = ?', [dealId], (err) => {
          if (err) return reject(err);
          this.db.run('UPDATE deliveries SET payment_status = "Paid" WHERE deal_id = ?', [dealId], (err2) => {
            if (err2) return reject(err2);
            resolve({ success: true });
          });
        });
      });
    });
  }
}

module.exports = BrokerDatabase;