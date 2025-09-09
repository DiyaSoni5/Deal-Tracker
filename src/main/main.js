const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.ELECTRON_IS_DEV === 'true';
const Database = require('../db/database');

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, '../../public/icon.png')
  });

  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  // Initialize database
  db = new Database();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for database operations
ipcMain.handle('db-query', async (event, query, params) => {
  try {
    return db.query(query, params);
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
});

ipcMain.handle('get-suppliers', () => db.getSuppliers());
ipcMain.handle('get-buyers', () => db.getBuyers());
ipcMain.handle('get-deals', () => db.getDeals());
ipcMain.handle('add-supplier', (event, supplier) => db.addSupplier(supplier));
ipcMain.handle('add-buyer', (event, buyer) => db.addBuyer(buyer));
ipcMain.handle('add-deal', (event, deal) => db.addDeal(deal));
ipcMain.handle('get-dashboard-stats', () => db.getDashboardStats());