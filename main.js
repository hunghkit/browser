const { app, BrowserWindow, BrowserView, Menu, ipcMain, session, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;
let settingsWindow;
let tabs = new Map(); // Map of tabId -> BrowserView
let activeTabId = null;
let nextTabId = 1;
let autoRefreshIntervals = new Map(); // Map of tabId -> intervalId
let autoRefreshSettings = new Map(); // Map of tabId -> { enabled: boolean, interval: number }
let tabProxySettings = new Map(); // Map of tabId -> proxy settings
let tabSessions = new Map(); // Map of tabId -> Session
let appMenu = null; // Store application menu for reuse
let proxyList = []; // List of saved proxies: [{ id, name, type, host, port, username, password }]
const PROXY_LIST_FILE = path.join(app.getPath('userData'), 'proxy-list.json');

// Load proxy list from file
function loadProxyList() {
  try {
    if (fs.existsSync(PROXY_LIST_FILE)) {
      const data = fs.readFileSync(PROXY_LIST_FILE, 'utf8');
      proxyList = JSON.parse(data);
      // Ensure each proxy has an id
      proxyList.forEach((proxy, index) => {
        if (!proxy.id) {
          proxy.id = `proxy-${Date.now()}-${index}`;
        }
      });
    }
  } catch (error) {
    console.error('Error loading proxy list:', error);
    proxyList = [];
  }
}

// Save proxy list to file
function saveProxyList() {
  try {
    fs.writeFileSync(PROXY_LIST_FILE, JSON.stringify(proxyList, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving proxy list:', error);
    return false;
  }
}

// Build proxy string from settings
function buildProxyString(settings) {
  if (!settings || !settings.host || !settings.port) {
    return '';
  }

  const { type, host, port, username, password } = settings;
  let proxyString = '';

  if (type === 'http' || type === 'https') {
    // For HTTP/HTTPS, Electron requires format:
    // Without auth: http=host:port;https=host:port or just host:port for both
    // With auth: http=http://username:password@host:port;https=https://username:password@host:port
    if (username && password) {
      // With authentication, use proxyRules format with full URL for both HTTP and HTTPS
      proxyString = `http://${username}:${password}@${host}:${port}`;
    } else {
      // Without authentication, use simple format: host:port (works for both HTTP and HTTPS)
      proxyString = `${host}:${port}`;
    }
  } else if (type === 'socks4' || type === 'socks5') {
    // For SOCKS, use format: socks5://host:port or socks4://host:port
    // With auth: socks5://username:password@host:port
    if (username && password) {
      proxyString = `${type}://${username}:${password}@${host}:${port}`;
    } else {
      proxyString = `${type}://${host}:${port}`;
    }
  }

  console.log('Built proxy string:', proxyString);

  return proxyString;
}

// Apply proxy settings to a specific tab
async function applyProxySettingsToTab(tabId, settings) {
  if (!tabs.has(tabId)) {
    console.log(`Tab ${tabId} does not exist, cannot apply proxy`);
    return false;
  }

  const browserView = tabs.get(tabId);
  if (!browserView || browserView.webContents.isDestroyed()) {
    console.log(`Tab ${tabId} BrowserView is invalid`);
    return false;
  }

  // Get the session from the BrowserView's webContents
  const tabSession = browserView.webContents.session;
  if (!tabSession) {
    console.log(`Tab ${tabId} has no session`);
    return false;
  }

  // Ensure tabSessions map is updated
  tabSessions.set(tabId, tabSession);

  const proxyString = buildProxyString(settings);
  console.log(`Applying proxy to tab ${tabId}:`, proxyString || '(no proxy)');

  return new Promise((resolve, reject) => {
  try {
      const proxyUrl = new URL(proxyString);
      const hostPort = `${proxyUrl.hostname}:${proxyUrl.port}`;
      const proxyRules = `${proxyUrl.protocol}//${hostPort}`;

      tabSession.__auth__ = {
        username: proxyUrl.username,
        password: proxyUrl.password,
        host: proxyUrl.hostname,
      };

      tabSession.setProxy({ proxyRules }, () => {
        console.log(
          `Proxy callback: Proxy applied to tab ${tabId}:`,
          proxyString || "(cleared)"
        );

        // Verify proxy was set by resolving a URL
        tabSession.resolveProxy("https://api.myip.com", (proxy) => {
          console.log(`Proxy resolution for tab ${tabId}:`, proxy);

          // Wait a bit to ensure proxy is fully applied
          setTimeout(() => {
            resolve(true);
          }, 200);
        });
      });
    } catch (error) {
      console.error(`Error applying proxy to tab ${tabId}:`, error);
      reject(error);
    }
  });
}

// Create main browser window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  });

  mainWindow.loadFile('index.html');

  // Create initial tab after window is ready
  mainWindow.once('ready-to-show', () => {
    createNewTab();
  });

  mainWindow.on('closed', () => {
    // Clean up all tabs
    tabs.forEach((view) => {
      if (view && !view.webContents.isDestroyed()) {
        view.webContents.destroy();
      }
    });
    tabs.clear();
    mainWindow = null;
    activeTabId = null;
  });

  mainWindow.on('resize', () => {
    updateActiveTabBounds();
  });
}

// Create a new tab
function createNewTab(url = 'about:blank') {
  if (!mainWindow) return null;

  const tabId = nextTabId++;

  // Create a session for this tab
  const tabSession = session.fromPartition(`persist:tab-${tabId}`);
  tabSessions.set(tabId, tabSession);

  const browserView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      partition: `persist:tab-${tabId}` // Use the session partition
    }
  });

  tabs.set(tabId, browserView);
  activeTabId = tabId;

  // Set as active view first
  mainWindow.setBrowserView(browserView);
  updateActiveTabBounds();

  // Apply proxy settings if they exist for this tab (e.g., copied from another tab)
  // This must be applied before loading URL
  const existingProxy = tabProxySettings.get(tabId);
  if (existingProxy) {
    applyProxySettingsToTab(tabId, existingProxy).then(() => {
      // Load URL after proxy is confirmed applied
      browserView.webContents.loadURL(url);
    }).catch((error) => {
      console.error('Error applying proxy when creating tab:', error);
      // Load URL even if proxy fails
      browserView.webContents.loadURL(url);
    });
  } else {
    // Load URL immediately if no proxy
    browserView.webContents.loadURL(url);
  }

  // Forward navigation events to renderer
  browserView.webContents.on('did-start-loading', () => {
    if (mainWindow && activeTabId === tabId) {
      mainWindow.webContents.send('browser-loading', { tabId, isLoading: true });
    }
    mainWindow.webContents.send('tab-loading', { tabId, isLoading: true });
  });

  browserView.webContents.on('did-stop-loading', () => {
    const currentUrl = browserView.webContents.getURL();
    const title = browserView.webContents.getTitle();

    if (mainWindow && activeTabId === tabId) {
      mainWindow.webContents.send('browser-loading', { tabId, isLoading: false });
      mainWindow.webContents.send('url-changed', { tabId, url: currentUrl });
    }
    mainWindow.webContents.send('tab-updated', { tabId, url: currentUrl, title });
  });

  browserView.webContents.on('did-navigate', (event, navigateUrl) => {
    if (mainWindow && activeTabId === tabId) {
      mainWindow.webContents.send('url-changed', { tabId, url: navigateUrl });
    }
    const title = browserView.webContents.getTitle();
    mainWindow.webContents.send('tab-updated', { tabId, url: navigateUrl, title });
  });

  browserView.webContents.on('did-navigate-in-page', (event, navigateUrl) => {
    if (mainWindow && activeTabId === tabId) {
      mainWindow.webContents.send('url-changed', { tabId, url: navigateUrl });
    }
    const title = browserView.webContents.getTitle();
    mainWindow.webContents.send('tab-updated', { tabId, url: navigateUrl, title });
  });

  browserView.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    if (mainWindow && activeTabId === tabId) {
      mainWindow.webContents.send('load-error', { tabId, errorCode, errorDescription });
    }
  });

  browserView.webContents.on('page-title-updated', (event, title) => {
    if (mainWindow && activeTabId === tabId) {
      mainWindow.webContents.send('title-changed', { tabId, title });
    }
    const url = browserView.webContents.getURL();
    mainWindow.webContents.send('tab-updated', { tabId, url, title });
  });

  // Notify renderer of new tab
  mainWindow.webContents.send('tab-created', { tabId, url, title: 'New Tab' });

  return tabId;
}

// Switch to a different tab
function switchTab(tabId) {
  if (!mainWindow || !tabs.has(tabId)) return false;

  const browserView = tabs.get(tabId);
  if (!browserView || browserView.webContents.isDestroyed()) return false;

  activeTabId = tabId;
  mainWindow.setBrowserView(browserView);
  updateActiveTabBounds();

  // Ensure proxy is still applied (in case session was recreated)
  const proxySettings = tabProxySettings.get(tabId);
  if (proxySettings) {
    applyProxySettingsToTab(tabId, proxySettings).catch((error) => {
      console.error(`Error reapplying proxy when switching tabs:`, error);
    });
  }

  // Update renderer with current tab state
  const url = browserView.webContents.getURL();
  const title = browserView.webContents.getTitle();
  const isLoading = browserView.webContents.isLoading();

  mainWindow.webContents.send('tab-switched', { tabId, url, title, isLoading });
  mainWindow.webContents.send('url-changed', { tabId, url });
  mainWindow.webContents.send('title-changed', { tabId, title });
  mainWindow.webContents.send('browser-loading', { tabId, isLoading });

  return true;
}

// Close a tab
function closeTab(tabId) {
  if (!tabs.has(tabId)) return false;

  const browserView = tabs.get(tabId);

  // Stop auto-refresh for this tab
  stopAutoRefresh(tabId);

  // If closing active tab, switch to another
  if (activeTabId === tabId) {
    const tabIds = Array.from(tabs.keys());
    const currentIndex = tabIds.indexOf(tabId);

    if (tabIds.length > 1) {
      // Switch to next tab, or previous if last tab
      const nextTabId = currentIndex < tabIds.length - 1
        ? tabIds[currentIndex + 1]
        : tabIds[currentIndex - 1];
      switchTab(nextTabId);
    } else {
      // Last tab - create new one
      activeTabId = null;
      mainWindow.setBrowserView(null);
    }
  }

  // Destroy the view
  if (browserView && !browserView.webContents.isDestroyed()) {
    browserView.webContents.destroy();
  }
  tabs.delete(tabId);
  autoRefreshSettings.delete(tabId);
  tabProxySettings.delete(tabId);

  // Clean up session
  if (tabSessions.has(tabId)) {
    tabSessions.delete(tabId);
  }

  // Notify renderer
  if (mainWindow) {
    mainWindow.webContents.send('tab-closed', { tabId });

    // If no tabs left, create a new one
    if (tabs.size === 0) {
      createNewTab();
    }
  }

  return true;
}

// Start auto-refresh for a tab
function startAutoRefresh(tabId, intervalSeconds) {
  // Stop existing auto-refresh if any
  stopAutoRefresh(tabId);

  if (!tabs.has(tabId)) return;

  const intervalMs = intervalSeconds * 1000;
  const intervalId = setInterval(() => {
    const browserView = tabs.get(tabId);
    if (browserView && browserView.webContents && !browserView.webContents.isDestroyed()) {
      browserView.webContents.reload();
    } else {
      // Tab was closed, stop auto-refresh
      stopAutoRefresh(tabId);
    }
  }, intervalMs);

  autoRefreshIntervals.set(tabId, intervalId);
}

// Stop auto-refresh for a tab
function stopAutoRefresh(tabId) {
  if (autoRefreshIntervals.has(tabId)) {
    clearInterval(autoRefreshIntervals.get(tabId));
    autoRefreshIntervals.delete(tabId);
  }
}

// Set auto-refresh settings for a tab
function setAutoRefreshSettings(tabId, enabled, intervalSeconds) {
  if (enabled) {
    autoRefreshSettings.set(tabId, { enabled: true, interval: intervalSeconds });
    startAutoRefresh(tabId, intervalSeconds);
  } else {
    autoRefreshSettings.set(tabId, { enabled: false, interval: intervalSeconds });
    stopAutoRefresh(tabId);
  }
}

// Get active BrowserView
function getActiveBrowserView() {
  if (!activeTabId || !tabs.has(activeTabId)) return null;
  return tabs.get(activeTabId);
}

// Update active tab bounds
function updateActiveTabBounds() {
  if (!mainWindow || !activeTabId) return;

  const browserView = getActiveBrowserView();
  if (!browserView) return;

  const bounds = mainWindow.getBounds();
  const toolbarHeight = 60; // Toolbar height
  const tabBarHeight = 40; // Tab bar height
  const totalOffset = toolbarHeight + tabBarHeight;

  browserView.setBounds({
    x: 0,
    y: totalOffset,
    width: bounds.width,
    height: bounds.height - totalOffset
  });
}

// Store original BrowserView for restoring
let storedBrowserView = null;

// Hide BrowserView when modal is open
function hideBrowserViewForModal() {
  const browserView = getActiveBrowserView();
  if (!browserView) return;

  // Store the BrowserView reference
  storedBrowserView = browserView;

  // Remove BrowserView from window to prevent it from intercepting events
  mainWindow.setBrowserView(null);
}

// Restore BrowserView when modal is closed
function restoreBrowserViewFromModal() {
  if (!storedBrowserView) {
    updateActiveTabBounds();
    return;
  }

  // Restore BrowserView to window
  mainWindow.setBrowserView(storedBrowserView);
  updateActiveTabBounds();
  storedBrowserView = null;
}

// Create settings window
function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 500,
    height: 450,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    resizable: false
  });

  settingsWindow.loadFile('settings.html');

  // Set the same menu for settings window to enable copy/paste
  if (appMenu) {
    settingsWindow.setMenu(appMenu);
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// App event handlers
app.whenReady().then(() => {
  // Load proxy list on app start
  loadProxyList();
  createMainWindow();

  // Create application menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            createSettingsWindow();
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo'
        },
        {
          label: 'Redo',
          accelerator: process.platform === 'darwin' ? 'Shift+Cmd+Z' : 'Ctrl+Y',
          role: 'redo'
        },
        { type: 'separator' },
        {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectAll'
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            createNewTab();
          }
        },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            const view = getActiveBrowserView();
            if (view && view.webContents) {
              view.webContents.reload();
            }
          }
        },
        {
          label: 'Developer Tools',
          accelerator: 'F12',
          click: () => {
            const view = getActiveBrowserView();
            if (view && view.webContents) {
              view.webContents.toggleDevTools();
            }
          }
        }
      ]
    }
  ];

  appMenu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(appMenu);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('get-proxy-settings', (event, tabId) => {
  if (tabId) {
    return tabProxySettings.get(tabId) || null;
  }
  return null;
});

ipcMain.handle('save-proxy-settings', (event, tabId, settings) => {
  if (!tabId || !tabs.has(tabId)) {
    return { success: false, error: 'Invalid tab ID' };
  }

  // Store settings
  if (settings) {
    tabProxySettings.set(tabId, settings);
  } else {
    tabProxySettings.delete(tabId);
  }

  // Apply proxy to the tab
  return applyProxySettingsToTab(tabId, settings).then((applied) => {
    if (applied) {
      // Force a hard reload to ensure proxy is used
      const browserView = tabs.get(tabId);
      if (browserView && browserView.webContents && !browserView.webContents.isDestroyed()) {
        const currentUrl = browserView.webContents.getURL();
        console.log(`Reloading tab ${tabId} after proxy apply, current URL:`, currentUrl);

        // Clear cache first, then reload
        browserView.webContents.session.clearCache(() => {
          console.log(`Cache cleared for tab ${tabId}`);
          // Wait a bit before reloading to ensure proxy is fully applied
          setTimeout(() => {
            if (currentUrl && currentUrl !== 'about:blank') {
              console.log(`Reloading tab ${tabId} with URL:`, currentUrl);
              browserView.webContents.loadURL(currentUrl, { bypassCache: true });
            } else {
              console.log(`Reloading tab ${tabId} ignoring cache`);
              browserView.webContents.reloadIgnoringCache();
            }
          }, 300);
        });
      }
      return { success: true };
    }
    return { success: false, error: 'Failed to apply proxy settings' };
  }).catch((error) => {
    console.error('Error in save-proxy-settings:', error);
    return { success: false, error: `Failed to apply proxy: ${error.message}` };
  });
});

ipcMain.handle('test-proxy', async (event, tabId, settings) => {
  if (!tabId) {
    return { success: false, error: 'Invalid tab ID' };
  }

  try {
    const proxyString = buildProxyString(settings);
    if (!proxyString) {
      return { success: false, error: 'Invalid proxy settings' };
    }

    console.log('Testing proxy with string:', proxyString);

    // Create a temporary session for testing
    const testPartition = `temp-test-${Date.now()}`;
    const testSession = session.fromPartition(testPartition);

    // Set proxy with callback to ensure it's applied before creating BrowserView
    return new Promise(async (resolve) => {
      try {
        const proxyUrl = new URL(proxyString);
        const hostPort = `${proxyUrl.hostname}:${proxyUrl.port}`;
        const proxyRules = `${proxyUrl.protocol}//${hostPort}`;

        testSession.setProxy({
          proxyRules,
        });

        testSession.__auth__ = {
          username: proxyUrl.username,
          password: proxyUrl.password,
          host: proxyUrl.hostname,
        };

        console.log("Proxy set for test session, creating BrowserView...");

        // Create a temporary BrowserView to test the proxy
        const testView = new BrowserView({
          webPreferences: {
            partition: testPartition,
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
          },
        });

          const testUrl = "https://api.myip.com";

          const timeout = setTimeout(() => {
            testView.webContents?.destroy();
            resolve({
              success: false,
              error: "Proxy test timed out after 15 seconds",
            });
          }, 30000);

          testView.webContents.once("did-finish-load", () => {
            clearTimeout(timeout);

            testView.webContents
              .executeJavaScript("document.body.innerText", true)
              .then((bodyText) => {
                try {
                  const json = JSON.parse(bodyText);
                  const ip = json.ip;
                  console.log(`Proxy test successful for tab ${tabId}:`, ip);
                  testView.webContents.destroy();
                  resolve({
                    success: true,
                    message: `Proxy connection successful! Your IP: ${ip}`,
                  });
                } catch (e) {
                  console.error("Error parsing IP response:", e, bodyText);
                  testView.webContents.destroy();
                  resolve({
                    success: true,
                    message:
                      "Proxy connection successful! (Could not parse IP)",
                  });
                }
              })
              .catch((err) => {
                console.error("Error reading response body:", err);
                testView.webContents.destroy();
                resolve({
                  success: true,
                  message:
                    "Proxy connection successful! (Could not read response body)",
                });
              });
          });

          testView.webContents.once(
            "did-fail-load",
            (event, errorCode, errorDescription) => {
              clearTimeout(timeout);
              testView.webContents.destroy();
              let errorMsg = "Connection failed";
              if (errorCode === -105) {
                errorMsg = "Proxy connection failed - check host and port";
              } else if (errorCode === -106) {
                errorMsg = "Proxy authentication failed";
              } else if (errorCode === -118) {
                errorMsg =
                  "Connection timed out - proxy may be slow or unreachable";
              } else if (errorDescription) {
                errorMsg = `Connection failed: ${errorDescription}`;
              }
              console.error(
                `Proxy test failed with error code ${errorCode}:`,
                errorMsg,
                errorDescription
              );
              resolve({ success: false, error: errorMsg });
            }
          );

          // Wait a bit to ensure proxy is fully applied, then load URL
          setTimeout(() => {
            console.log("Loading test URL:", testUrl);
            testView.webContents.loadURL(testUrl);
          }, 200);
       } catch (err) {
         console.error("Invalid proxy:", err);
         resolve({ success: false, error: "Invalid proxy" });
       }
    });
  } catch (error) {
    console.error('Proxy test error:', error);
    return { success: false, error: `Proxy test error: ${error.message}` };
  }
});

ipcMain.handle('navigate-to-url', (event, url, tabId = null) => {
  const targetTabId = tabId || activeTabId;
  if (!targetTabId || !tabs.has(targetTabId)) return;

  const browserView = tabs.get(targetTabId);
  if (browserView && browserView.webContents && !browserView.webContents.isDestroyed()) {
    browserView.webContents.loadURL(url);
  }
});

ipcMain.handle('open-settings', () => {
  createSettingsWindow();
});

ipcMain.handle('open-dev-tools', () => {
  const view = getActiveBrowserView();
  if (view && view.webContents) {
    view.webContents.toggleDevTools();
  }
});

ipcMain.handle('get-current-url', () => {
  const view = getActiveBrowserView();
  if (view && view.webContents) {
    return view.webContents.getURL();
  }
  return '';
});

ipcMain.handle('can-go-back', () => {
  const view = getActiveBrowserView();
  if (view && view.webContents) {
    return view.webContents.canGoBack();
  }
  return false;
});

ipcMain.handle('can-go-forward', () => {
  const view = getActiveBrowserView();
  if (view && view.webContents) {
    return view.webContents.canGoForward();
  }
  return false;
});

ipcMain.handle('go-back', () => {
  const view = getActiveBrowserView();
  if (view && view.webContents) {
    view.webContents.goBack();
  }
});

ipcMain.handle('go-forward', () => {
  const view = getActiveBrowserView();
  if (view && view.webContents) {
    view.webContents.goForward();
  }
});

ipcMain.handle('reload', () => {
  const view = getActiveBrowserView();
  if (view && view.webContents) {
    view.webContents.reload();
  }
});

// Tab management IPC handlers
ipcMain.handle('create-tab', (event, url = 'about:blank') => {
  return createNewTab(url);
});

ipcMain.handle('close-tab', (event, tabId) => {
  return closeTab(tabId);
});

ipcMain.handle('switch-tab', (event, tabId) => {
  return switchTab(tabId);
});

ipcMain.handle('get-tabs', () => {
  const tabsList = [];
  tabs.forEach((view, tabId) => {
    if (view && view.webContents && !view.webContents.isDestroyed()) {
      tabsList.push({
        id: tabId,
        url: view.webContents.getURL(),
        title: view.webContents.getTitle(),
        isLoading: view.webContents.isLoading()
      });
    }
  });
  return tabsList;
});

ipcMain.handle('get-active-tab-id', () => {
  return activeTabId;
});

ipcMain.handle('set-modal-visible', (event, visible) => {
  if (visible) {
    hideBrowserViewForModal();
  } else {
    restoreBrowserViewFromModal();
  }
  return true;
});

// File system IPC handlers
ipcMain.handle('get-home-directory', () => {
  return os.homedir();
});

ipcMain.handle('read-directory', (event, dirPath) => {
  try {
    const items = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    entries.forEach(entry => {
      const fullPath = path.join(dirPath, entry.name);
      items.push({
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile()
      });
    });

    return items;
  } catch (error) {
    throw new Error(`Failed to read directory: ${error.message}`);
  }
});

ipcMain.handle('get-parent-directory', (event, filePath) => {
  try {
    const parent = path.dirname(filePath);
    // Don't go above root
    if (parent === filePath) {
      return null;
    }
    return parent;
  } catch (error) {
    return null;
  }
});

ipcMain.handle('resolve-path', (event, filePath) => {
  try {
    return path.resolve(filePath);
  } catch (error) {
    throw new Error(`Failed to resolve path: ${error.message}`);
  }
});

// Auto-refresh IPC handlers
ipcMain.handle('get-auto-refresh-settings', (event, tabId) => {
  const settings = autoRefreshSettings.get(tabId);
  return settings || { enabled: false, interval: 5 };
});

ipcMain.handle('set-auto-refresh-settings', (event, tabId, enabled, intervalSeconds) => {
  if (intervalSeconds < 1 || intervalSeconds > 3600) {
    return { success: false, error: 'Interval must be between 1 and 3600 seconds' };
  }

  setAutoRefreshSettings(tabId, enabled, intervalSeconds);
  return { success: true };
});

// Proxy list management IPC handlers
ipcMain.handle('get-proxy-list', () => {
  // Return list without passwords for security
  return proxyList.map(proxy => ({
    id: proxy.id,
    name: proxy.name || `${proxy.type}://${proxy.host}:${proxy.port}`,
    type: proxy.type,
    host: proxy.host,
    port: proxy.port,
    username: proxy.username || null,
    hasPassword: !!proxy.password
  }));
});

ipcMain.handle('get-proxy-by-id', (event, proxyId) => {
  const proxy = proxyList.find(p => p.id === proxyId);
  if (proxy) {
    // Return full proxy data including password
    return { ...proxy };
  }
  return null;
});

ipcMain.handle('save-proxy-to-list', (event, proxyData) => {
  try {
    const { id, name, type, host, port, username, password } = proxyData;

    // Validate
    if (!type || !host || !port || port < 1 || port > 65535) {
      return { success: false, error: 'Invalid proxy data' };
    }

    if (id) {
      // Update existing proxy
      const index = proxyList.findIndex(p => p.id === id);
      if (index !== -1) {
        proxyList[index] = {
          id,
          name: name || `${type}://${host}:${port}`,
          type,
          host,
          port,
          username: username || null,
          password: password || proxyList[index].password || null
        };
      } else {
        return { success: false, error: 'Proxy not found' };
      }
    } else {
      // Add new proxy
      const newProxy = {
        id: `proxy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: name || `${type}://${host}:${port}`,
        type,
        host,
        port,
        username: username || null,
        password: password || null
      };
      proxyList.push(newProxy);
    }

    if (saveProxyList()) {
      return { success: true };
    } else {
      return { success: false, error: 'Failed to save proxy list' };
    }
  } catch (error) {
    console.error('Error saving proxy to list:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-proxy-from-list', (event, proxyId) => {
  try {
    const index = proxyList.findIndex(p => p.id === proxyId);
    if (index !== -1) {
      proxyList.splice(index, 1);
      if (saveProxyList()) {
        return { success: true };
      } else {
        return { success: false, error: 'Failed to save proxy list' };
      }
    } else {
      return { success: false, error: 'Proxy not found' };
    }
  } catch (error) {
    console.error('Error deleting proxy from list:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('apply-proxy-to-tab', (event, tabId, proxyId) => {
  if (!tabId || !tabs.has(tabId)) {
    return { success: false, error: 'Invalid tab ID' };
  }

  let settings = null;
  if (proxyId) {
    const proxy = proxyList.find(p => p.id === proxyId);
    if (!proxy) {
      return { success: false, error: 'Proxy not found' };
    }
    settings = {
      type: proxy.type,
      host: proxy.host,
      port: proxy.port,
      username: proxy.username || null,
      password: proxy.password || null
    };
  }

  // Store settings
  if (settings) {
    tabProxySettings.set(tabId, settings);
  } else {
    tabProxySettings.delete(tabId);
  }

  // Apply proxy to the tab
  return applyProxySettingsToTab(tabId, settings).then((applied) => {
    if (applied) {
      // Force a hard reload to ensure proxy is used
      const browserView = tabs.get(tabId);
      if (browserView && browserView.webContents && !browserView.webContents.isDestroyed()) {
        const currentUrl = browserView.webContents.getURL();
        console.log(`Reloading tab ${tabId} after proxy apply, current URL:`, currentUrl);

        // Clear cache first, then reload
        browserView.webContents.session.clearCache(() => {
          console.log(`Cache cleared for tab ${tabId}`);
          // Wait a bit before reloading to ensure proxy is fully applied
          setTimeout(() => {
            if (currentUrl && currentUrl !== 'about:blank') {
              console.log(`Reloading tab ${tabId} with URL:`, currentUrl);
              browserView.webContents.loadURL(currentUrl, { bypassCache: true });
            } else {
              console.log(`Reloading tab ${tabId} ignoring cache`);
              browserView.webContents.reloadIgnoringCache();
            }
          }, 300);
        });
      }
      return { success: true };
    }
    return { success: false, error: 'Failed to apply proxy settings' };
  }).catch((error) => {
    console.error('Error in apply-proxy-to-tab:', error);
    return { success: false, error: `Failed to apply proxy: ${error.message}` };
  });
});


