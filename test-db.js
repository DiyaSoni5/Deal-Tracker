const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Test database connection
const dbPath = path.join(dataDir, 'test.db');
const db = new sqlite3.Database(dbPath);

console.log('✅ SQLite connection successful!');
console.log('📁 Database file will be created at:', dbPath);

// Test creating a simple table
db.run(`CREATE TABLE IF NOT EXISTS test_table (
  id INTEGER PRIMARY KEY,
  name TEXT
)`, (err) => {
  if (err) {
    console.error('❌ Error creating table:', err);
  } else {
    console.log('✅ Table created successfully!');
    
    // Test inserting data
    db.run('INSERT INTO test_table (name) VALUES (?)', ['Test Entry'], function(err) {
      if (err) {
        console.error('❌ Error inserting data:', err);
      } else {
        console.log('✅ Data inserted successfully! ID:', this.lastID);
        
        // Test reading data
        db.all('SELECT * FROM test_table', (err, rows) => {
          if (err) {
            console.error('❌ Error reading data:', err);
          } else {
            console.log('✅ Data retrieved:', rows);
            console.log('🎉 SQLite is working perfectly!');
          }
          db.close();
        });
      }
    });
  }
});