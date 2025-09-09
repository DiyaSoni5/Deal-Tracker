const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSuppliers: () => ipcRenderer.invoke('get-suppliers'),
  getBuyers: () => ipcRenderer.invoke('get-buyers'),
  getDeals: () => ipcRenderer.invoke('get-deals'),
  addSupplier: (supplier) => ipcRenderer.invoke('add-supplier', supplier),
  addBuyer: (buyer) => ipcRenderer.invoke('add-buyer', buyer),
  addDeal: (deal) => ipcRenderer.invoke('add-deal', deal),
  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
  deleteDeal: (dealId) => ipcRenderer.invoke('delete-deal', dealId)
});