const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Proxy settings (per-tab)
  getProxySettings: (tabId) => ipcRenderer.invoke('get-proxy-settings', tabId),
  saveProxySettings: (tabId, settings) => ipcRenderer.invoke('save-proxy-settings', tabId, settings),
  testProxy: (tabId, settings) => ipcRenderer.invoke('test-proxy', tabId, settings),

  // Proxy list management
  getProxyList: () => ipcRenderer.invoke('get-proxy-list'),
  getProxyById: (proxyId) => ipcRenderer.invoke('get-proxy-by-id', proxyId),
  saveProxyToList: (proxyData) => ipcRenderer.invoke('save-proxy-to-list', proxyData),
  deleteProxyFromList: (proxyId) => ipcRenderer.invoke('delete-proxy-from-list', proxyId),
  applyProxyToTab: (tabId, proxyId) => ipcRenderer.invoke('apply-proxy-to-tab', tabId, proxyId),
  exportProxyList: () => ipcRenderer.invoke('export-proxy-list'),
  importProxyList: (proxies, replaceExisting) => ipcRenderer.invoke('import-proxy-list', proxies, replaceExisting),
  clearProxyList: () => ipcRenderer.invoke('clear-proxy-list'),
  checkIp: (tabId) => ipcRenderer.invoke('check-ip', tabId),
  toggleProxy: (tabId, enabled) => ipcRenderer.invoke('toggle-proxy', tabId, enabled),

  // Navigation
  navigateToUrl: (url, tabId) => ipcRenderer.invoke('navigate-to-url', url, tabId),
  getCurrentUrl: () => ipcRenderer.invoke('get-current-url'),

  // Browser controls
  canGoBack: () => ipcRenderer.invoke('can-go-back'),
  canGoForward: () => ipcRenderer.invoke('can-go-forward'),
  goBack: () => ipcRenderer.invoke('go-back'),
  goForward: () => ipcRenderer.invoke('go-forward'),
  reload: () => ipcRenderer.invoke('reload'),

  // Tab management
  createTab: (url) => ipcRenderer.invoke('create-tab', url),
  closeTab: (tabId) => ipcRenderer.invoke('close-tab', tabId),
  switchTab: (tabId) => ipcRenderer.invoke('switch-tab', tabId),
  getTabs: () => ipcRenderer.invoke('get-tabs'),
  getActiveTabId: () => ipcRenderer.invoke('get-active-tab-id'),

  // UI actions
  openSettings: () => ipcRenderer.invoke('open-settings'),
  openDevTools: () => ipcRenderer.invoke('open-dev-tools'),

  // Events
  onUrlChanged: (callback) => {
    ipcRenderer.on('url-changed', (event, data) => callback(data));
  },
  onLoadError: (callback) => {
    ipcRenderer.on('load-error', (event, error) => callback(error));
  },
  onBrowserLoading: (callback) => {
    ipcRenderer.on('browser-loading', (event, data) => callback(data));
  },
  onTitleChanged: (callback) => {
    ipcRenderer.on('title-changed', (event, data) => callback(data));
  },
  onTabCreated: (callback) => {
    ipcRenderer.on('tab-created', (event, data) => callback(data));
  },
  onTabClosed: (callback) => {
    ipcRenderer.on('tab-closed', (event, data) => callback(data));
  },
  onTabSwitched: (callback) => {
    ipcRenderer.on('tab-switched', (event, data) => callback(data));
  },
  onTabUpdated: (callback) => {
    ipcRenderer.on('tab-updated', (event, data) => callback(data));
  },
  onTabLoading: (callback) => {
    ipcRenderer.on('tab-loading', (event, data) => callback(data));
  },

  // File system operations
  getHomeDirectory: () => ipcRenderer.invoke('get-home-directory'),
  readDirectory: (path) => ipcRenderer.invoke('read-directory', path),
  getParentDirectory: (path) => ipcRenderer.invoke('get-parent-directory', path),
  resolvePath: (path) => ipcRenderer.invoke('resolve-path', path),

  // Auto-refresh operations
  getAutoRefreshSettings: (tabId) => ipcRenderer.invoke('get-auto-refresh-settings', tabId),
  setAutoRefreshSettings: (tabId, enabled, intervalSeconds, resetSession, playlistEnabled, playlistMode, playlistUrls, rotateProxy) => ipcRenderer.invoke('set-auto-refresh-settings', tabId, enabled, intervalSeconds, resetSession, playlistEnabled, playlistMode, playlistUrls, rotateProxy),

  // Session operations
  clearSessionData: (tabId) => ipcRenderer.invoke('clear-session-data', tabId),

  // Browser Identity operations
  getBrowserIdentity: (tabId) => ipcRenderer.invoke('get-browser-identity', tabId),
  setBrowserIdentity: (tabId, identity) => ipcRenderer.invoke('set-browser-identity', tabId, identity),
  getUserAgent: (tabId) => ipcRenderer.invoke('get-user-agent', tabId),

  // Auto Proxy operations
  getAutoProxySettings: () => ipcRenderer.invoke('get-auto-proxy-settings'),
  setAutoProxySettings: (settings) => ipcRenderer.invoke('set-auto-proxy-settings', settings),
  fetchAndCheckProxies: (apiUrl, requestId) => ipcRenderer.invoke('fetch-and-check-proxies', apiUrl, requestId),
  stopFetchProxies: (requestId) => ipcRenderer.invoke('stop-fetch-proxies', requestId),
  onProxyFetchProgress: (callback) => {
    ipcRenderer.on('proxy-fetch-progress', (event, data) => callback(event, data));
  },
  onProxyFound: (callback) => {
    ipcRenderer.on('proxy-found', (event, data) => callback(event, data));
  },

  // Modal visibility
  setModalVisible: (visible) => ipcRenderer.invoke('set-modal-visible', visible),

  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

