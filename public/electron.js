const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const Database = require('./database');

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  if (isDev) {
    // mainWindow.webContents.openDevTools();
    // Prevent browser from opening
    mainWindow.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' };
    });
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
ipcMain.handle('get-suppliers', async () => {
  try {
    return await db.getSuppliers();
  } catch (error) {
    console.error('Error getting suppliers:', error);
    throw error;
  }
});

ipcMain.handle('get-buyers', async () => {
  try {
    return await db.getBuyers();
  } catch (error) {
    console.error('Error getting buyers:', error);
    throw error;
  }
});

ipcMain.handle('get-deals', async () => {
  try {
    return await db.getDeals();
  } catch (error) {
    console.error('Error getting deals:', error);
    throw error;
  }
});

ipcMain.handle('add-supplier', async (event, supplier) => {
  try {
    return await db.addSupplier(supplier);
  } catch (error) {
    console.error('Error adding supplier:', error);
    throw error;
  }
});

ipcMain.handle('add-buyer', async (event, buyer) => {
  try {
    return await db.addBuyer(buyer);
  } catch (error) {
    console.error('Error adding buyer:', error);
    throw error;
  }
});

ipcMain.handle('add-deal', async (event, deal) => {
  try {
    return await db.addDeal(deal);
  } catch (error) {
    console.error('Error adding deal:', error);
    throw error;
  }
});

ipcMain.handle('get-dashboard-stats', async () => {
  try {
    return await db.getDashboardStats();
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    throw error;
  }
});

ipcMain.handle('delete-deal', async (event, dealId) => {
  try {
    return await db.deleteDeal(dealId);
  } catch (error) {
    console.error('Error deleting deal:', error);
    throw error;
  }
});