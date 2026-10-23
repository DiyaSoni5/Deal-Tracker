require('dotenv').config();
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
let isDev;
try { isDev = require('electron-is-dev'); } catch (e) { isDev = false; }

if (!app) {
  console.error('Not running in Electron context');
  process.exit(1);
}
const Database = require('../src/database/database');

let mainWindow;
let database;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,

    title: 'Deal Tracker - Broker Management System',
    show: false, // Don't show until ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app
  const startUrl = isDev 
    ? 'http://localhost:3001' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Initialize database
  initializeDatabase();

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (database) {
      database.close();
    }
  });
}

function initializeDatabase() {
  try {
    database = new Database();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// App event listeners
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for database operations
ipcMain.handle('db-add-supplier', async (event, supplier) => {
  try {
    if (!database) throw new Error('Database not initialized');
    return await database.addSupplier(supplier);
  } catch (error) {
    console.error('Error in db-add-supplier:', error);
    throw error;
  }
});

ipcMain.handle('db-get-suppliers', async () => {
  try {
    if (!database) throw new Error('Database not initialized');
    return await database.getSuppliers();
  } catch (error) {
    console.error('Error in db-get-suppliers:', error);
    throw error;
  }
});

ipcMain.handle('db-add-buyer', async (event, buyer) => {
  try {
    if (!database) throw new Error('Database not initialized');
    return await database.addBuyer(buyer);
  } catch (error) {
    console.error('Error in db-add-buyer:', error);
    throw error;
  }
});

ipcMain.handle('db-get-buyers', async () => {
  try {
    if (!database) throw new Error('Database not initialized');
    return await database.getBuyers();
  } catch (error) {
    console.error('Error in db-get-buyers:', error);
    throw error;
  }
});

ipcMain.handle('db-add-deal', async (event, deal) => {
  try {
    if (!database) throw new Error('Database not initialized');
    return await database.addDeal(deal);
  } catch (error) {
    console.error('Error in db-add-deal:', error);
    throw error;
  }
});

ipcMain.handle('db-get-deals', async () => {
  try {
    if (!database) throw new Error('Database not initialized');
    return await database.getDeals();
  } catch (error) {
    console.error('Error in db-get-deals:', error);
    throw error;
  }
});

ipcMain.handle('db-update-deal', async (event, deal) => {
  try {
    if (!database) throw new Error('Database not initialized');
    return await database.updateDeal(deal);
  } catch (error) {
    console.error('Error in db-update-deal:', error);
    throw error;
  }
});

ipcMain.handle('db-delete-deal', async (event, dealId) => {
  try {
    if (!database) throw new Error('Database not initialized');
    return await database.deleteDeal(dealId);
  } catch (error) {
    console.error('Error in db-delete-deal:', error);
    throw error;
  }
});

ipcMain.handle('db-update-deal-payment', async (event, dealId, paymentStatus) => {
  try {
    if (!database) throw new Error('Database not initialized');
    return await database.updateDealPayment(dealId, paymentStatus);
  } catch (error) {
    console.error('Error in db-update-deal-payment:', error);
    throw error;
  }
});

ipcMain.handle('db-add-delivery', async (event, delivery) => {
  try {
    if (!database) throw new Error('Database not initialized');
    return await database.addDelivery(delivery);
  } catch (error) {
    console.error('Error in db-add-delivery:', error);
    throw error;
  }
});

ipcMain.handle('db-get-deliveries', async (event, params) => {
  try {
    if (!database) throw new Error('Database not initialized');
    return await database.getDeliveries(params);
  } catch (error) {
    console.error('Error in db-get-deliveries:', error);
    throw error;
  }
});

ipcMain.handle('db-get-delivery-summary', async (event, dealId) => {
  try {
    if (!database) throw new Error('Database not initialized');
    return await database.getDeliverySummary(dealId);
  } catch (error) {
    console.error('Error in db-get-delivery-summary:', error);
    throw error;
  }
});

ipcMain.handle('db-mark-deal-paid', async (event, dealId) => {
  try {
    if (!database) throw new Error('Database not initialized');
    await database.updateDealPayment(dealId, 'Paid');
    return { success: true };
  } catch (error) {
    console.error('Error in db-mark-deal-paid:', error);
    throw error;
  }
});

ipcMain.handle('db-report-deliveries-detailed', async (event, filters) => {
  try {
    if (!database) throw new Error('Database not initialized');
    return await database.getDeliveries(filters || {});
  } catch (error) {
    console.error('Error in db-report-deliveries-detailed:', error);
    throw error;
  }
});

ipcMain.handle('db-get-dashboard-stats', async () => {
  try {
    if (!database) throw new Error('Database not initialized');
    return await database.getDashboardStats();
  } catch (error) {
    console.error('Error in db-get-dashboard-stats:', error);
    throw error;
  }
});