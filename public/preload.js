const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Suppliers
  addSupplier: (supplier) => ipcRenderer.invoke('db-add-supplier', supplier),
  getSuppliers: () => ipcRenderer.invoke('db-get-suppliers'),
  
  // Buyers
  addBuyer: (buyer) => ipcRenderer.invoke('db-add-buyer', buyer),
  getBuyers: () => ipcRenderer.invoke('db-get-buyers'),
  
  // Deals
  addDeal: (deal) => ipcRenderer.invoke('db-add-deal', deal),
  getDeals: () => ipcRenderer.invoke('db-get-deals'),
  updateDeal: (deal) => ipcRenderer.invoke('db-update-deal', deal),
  deleteDeal: (dealId) => ipcRenderer.invoke('db-delete-deal', dealId),
  updateDealPayment: (dealId, paymentStatus) => ipcRenderer.invoke('db-update-deal-payment', dealId, paymentStatus),
  
  // Deliveries
  addDelivery: (delivery) => ipcRenderer.invoke('db-add-delivery', delivery),
  getDeliveries: (params) => ipcRenderer.invoke('db-get-deliveries', params),
  getDeliverySummary: (dealId) => ipcRenderer.invoke('db-get-delivery-summary', dealId),
  
  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke('db-get-dashboard-stats')
});