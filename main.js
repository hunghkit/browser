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
let playlistIndices = new Map(); // Map of tabId -> current playlist index for sequential mode
let tabProxySettings = new Map(); // Map of tabId -> proxy settings
let tabSessions = new Map(); // Map of tabId -> Session
let tabBrowserIdentity = new Map(); // Map of tabId -> 'chrome' | 'firefox'
let appMenu = null; // Store application menu for reuse
let proxyList = []; // List of saved proxies: [{ id, name, type, host, port, username, password }]
const PROXY_LIST_FILE = path.join(app.getPath('userData'), 'proxy-list.json');
let autoProxySettings = { enabled: false, source: 'saved', selectedProxyId: null, avoidDuplicate: true, apiUrl: '' };
const AUTO_PROXY_SETTINGS_FILE = path.join(app.getPath('userData'), 'auto-proxy-settings.json');
let usedProxies = new Set(); // Track used proxies to avoid duplicates
let fetchProxyOperations = new Map(); // Track fetch operations: Map<requestId, { shouldStop: boolean }>

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

// Load auto proxy settings from file
function loadAutoProxySettings() {
  try {
    if (fs.existsSync(AUTO_PROXY_SETTINGS_FILE)) {
      const data = fs.readFileSync(AUTO_PROXY_SETTINGS_FILE, 'utf8');
      autoProxySettings = JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading auto proxy settings:', error);
    autoProxySettings = { enabled: false, source: 'saved', selectedProxyId: null, avoidDuplicate: true, apiUrl: '' };
  }
}

// Save auto proxy settings to file
function saveAutoProxySettings() {
  try {
    fs.writeFileSync(AUTO_PROXY_SETTINGS_FILE, JSON.stringify(autoProxySettings, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving auto proxy settings:', error);
    return false;
  }
}

// Get a proxy for auto apply (respecting avoidDuplicate flag)
function getProxyForAutoApply() {
  if (!autoProxySettings.enabled) {
    return null;
  }

  if (autoProxySettings.source === 'saved') {
    // Get from saved proxy list
    let availableProxies = proxyList;

    if (autoProxySettings.selectedProxyId) {
      // Use specific proxy
      const selectedProxy = proxyList.find(p => p.id === autoProxySettings.selectedProxyId);
      if (selectedProxy) {
        if (autoProxySettings.avoidDuplicate && usedProxies.has(selectedProxy.id)) {
          return null; // Already used
        }
        usedProxies.add(selectedProxy.id);
        return selectedProxy;
      }
    } else {
      // Random from list
      if (autoProxySettings.avoidDuplicate) {
        availableProxies = proxyList.filter(p => !usedProxies.has(p.id));
        if (availableProxies.length === 0) {
          // Reset if all proxies used
          usedProxies.clear();
          availableProxies = proxyList;
        }
      }

      if (availableProxies.length > 0) {
        const randomProxy = availableProxies[Math.floor(Math.random() * availableProxies.length)];
        if (autoProxySettings.avoidDuplicate) {
          usedProxies.add(randomProxy.id);
        }
        return randomProxy;
      }
    }
  } else if (autoProxySettings.source === 'api') {
    // TODO: Implement API proxy selection
    // For now, return null
    return null;
  }

  return null;
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

// Get User-Agent string for browser identity
function getUserAgentString(identity) {
  const identityType = identity || 'chrome';

  if (identityType === 'firefox') {
    // Firefox User-Agent
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0';
  } else {
    // Chrome User-Agent (default)
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }
}

// Apply browser identity (User-Agent) to a tab
function applyBrowserIdentityToTab(tabId, identity) {
  if (!tabs.has(tabId)) {
    console.log(`Tab ${tabId} does not exist, cannot apply browser identity`);
    return false;
  }

  const browserView = tabs.get(tabId);
  if (!browserView || browserView.webContents.isDestroyed()) {
    console.log(`Tab ${tabId} BrowserView is invalid`);
    return false;
  }

  const userAgent = getUserAgentString(identity);
  browserView.webContents.setUserAgent(userAgent);
  console.log(`Applied browser identity "${identity}" to tab ${tabId}: ${userAgent}`);

  // Store identity
  tabBrowserIdentity.set(tabId, identity || 'chrome');

  return true;
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
      proxyString = `${type}://${username}:${password}@${host}:${port}`;
    } else {
      // Without authentication, use simple format: host:port (works for both HTTP and HTTPS)
      proxyString = `${type}://${host}:${port}`;
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

  // Set default browser identity to Chrome BEFORE loading URL
  // This ensures User-Agent is set before any network requests
  applyBrowserIdentityToTab(tabId, 'chrome');

  // Set as active view first
  mainWindow.setBrowserView(browserView);
  updateActiveTabBounds();

  // Apply proxy settings if they exist for this tab (e.g., copied from another tab)
  // Or apply auto proxy if enabled
  // This must be applied before loading URL
  const existingProxy = tabProxySettings.get(tabId);
  let proxyToApply = existingProxy;

  // Check for auto proxy if no existing proxy
  if (!proxyToApply) {
    const autoProxy = getProxyForAutoApply();
    if (autoProxy) {
      proxyToApply = {
        type: autoProxy.type,
        host: autoProxy.host,
        port: autoProxy.port,
        username: autoProxy.username || null,
        password: autoProxy.password || null
      };
      tabProxySettings.set(tabId, proxyToApply);
      console.log(`Auto-applying proxy ${autoProxy.name} to tab ${tabId}`);
    }
  }

  if (proxyToApply) {
    applyProxySettingsToTab(tabId, proxyToApply).then(() => {
      // Ensure User-Agent is still set before loading
      if (!tabBrowserIdentity.has(tabId)) {
        applyBrowserIdentityToTab(tabId, 'chrome');
      }
      // Load URL after proxy is confirmed applied
      browserView.webContents.loadURL(url);
    }).catch((error) => {
      console.error('Error applying proxy when creating tab:', error);
      // Ensure User-Agent is still set before loading
      if (!tabBrowserIdentity.has(tabId)) {
        applyBrowserIdentityToTab(tabId, 'chrome');
      }
      // Load URL even if proxy fails
      browserView.webContents.loadURL(url);
    });
  } else {
    // Ensure User-Agent is set before loading URL
    if (!tabBrowserIdentity.has(tabId)) {
      applyBrowserIdentityToTab(tabId, 'chrome');
    }
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
// This function only shows/hides BrowserViews - it does NOT reload URLs
function switchTab(tabId) {
  if (!mainWindow || !tabs.has(tabId)) return false;

  const browserView = tabs.get(tabId);
  if (!browserView || browserView.webContents.isDestroyed()) return false;

  activeTabId = tabId;
  // Show the selected BrowserView and hide others (no reload)
  mainWindow.setBrowserView(browserView);
  updateActiveTabBounds();

  // Ensure browser identity is still applied (in case it wasn't set before)
  const identity = tabBrowserIdentity.get(tabId) || 'chrome';
  applyBrowserIdentityToTab(tabId, identity);

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

// Clear session data (cookies, cache, localStorage, sessionStorage) for a tab
async function clearSessionData(tabId) {
  if (!tabs.has(tabId)) return;

  const browserView = tabs.get(tabId);
  if (!browserView || browserView.webContents.isDestroyed()) return;

  const tabSession = browserView.webContents.session;
  if (!tabSession) return;

  try {
    const currentUrl = browserView.webContents.getURL();

    // Clear localStorage and sessionStorage via JavaScript injection first (before clearing cookies)
    if (currentUrl && currentUrl !== 'about:blank') {
      try {
        await browserView.webContents.executeJavaScript(`
          try {
            localStorage.clear();
            sessionStorage.clear();
          } catch(e) {
            // Ignore errors (may fail if page is not fully loaded)
          }
        `);
      } catch (error) {
        // Ignore - page may not be ready
      }
    }

    // Clear cookies, cache, and storage data
    await tabSession.clearStorageData({
      storages: ['cookies', 'cache', 'localstorage', 'sessionstorage']
    });

    // Also clear cache explicitly
    await new Promise((resolve) => {
      tabSession.clearCache(() => resolve());
    });

    console.log(`Session data cleared for tab ${tabId} (incognito mode)`);
  } catch (error) {
    console.error(`Error clearing session data for tab ${tabId}:`, error);
  }
}

// Get YouTube video current time
async function getYouTubeCurrentTime(browserView) {
  try {
    const currentTime = await browserView.webContents.executeJavaScript(`
      (function() {
        try {
          // Method 1: Try to get time from video element (most reliable)
          const video = document.querySelector('video');
          if (video && !isNaN(video.currentTime) && video.currentTime > 0) {
            return Math.floor(video.currentTime);
          }

          // Method 2: Try YouTube player state
          if (window.ytplayer && window.ytplayer.getCurrentTime) {
            const time = window.ytplayer.getCurrentTime();
            if (time && time > 0) return Math.floor(time);
          }

          // Method 3: Try YouTube player API
          if (window.player && typeof window.player.getCurrentTime === 'function') {
            const time = window.player.getCurrentTime();
            if (time && time > 0) return Math.floor(time);
          }

          // Method 4: Try to get from YouTube's internal player state
          if (window.yt && window.yt.config_ && window.yt.config_.EXPERIMENT_FLAGS) {
            // Try to access player through YouTube's internal API
            const players = document.querySelectorAll('.html5-video-player');
            if (players.length > 0) {
              const player = players[0];
              if (player.getVideoData && player.getCurrentTime) {
                const time = player.getCurrentTime();
                if (time && time > 0) return Math.floor(time);
              }
            }
          }

          // Method 5: Try to get from video element even if paused
          if (video && !isNaN(video.currentTime)) {
            return Math.floor(video.currentTime);
          }
        } catch(e) {
          console.error('Error getting YouTube time:', e);
        }
        return null;
      })();
    `);
    return currentTime;
  } catch (error) {
    console.error('Error executing script to get YouTube time:', error);
    return null;
  }
}

// Check if URL is YouTube
function isYouTubeUrl(url) {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'www.youtube.com' ||
           urlObj.hostname === 'youtube.com' ||
           urlObj.hostname === 'm.youtube.com' ||
           urlObj.hostname === 'youtu.be';
  } catch (e) {
    return false;
  }
}

// Add timestamp to YouTube URL
function addTimestampToYouTubeUrl(url, seconds) {
  if (!url || !seconds || seconds <= 0) return url;
  try {
    const urlObj = new URL(url);
    // Remove existing t parameter
    urlObj.searchParams.delete('t');
    // Add new t parameter
    urlObj.searchParams.set('t', seconds);
    return urlObj.toString();
  } catch (e) {
    return url;
  }
}

// Start auto-refresh for a tab
function startAutoRefresh(tabId, intervalSeconds, resetSession = false, playlistEnabled = false, playlistMode = 'sequential', playlistUrls = []) {
  // Stop existing auto-refresh if any
  stopAutoRefresh(tabId);

  if (!tabs.has(tabId)) return;

  // Initialize playlist index if not exists
  if (!playlistIndices.has(tabId)) {
    playlistIndices.set(tabId, 0);
  }

  const intervalMs = intervalSeconds * 1000;
  console.log(`Starting auto-refresh for tab ${tabId} with interval ${intervalSeconds} seconds (${intervalMs}ms)`);
  const intervalId = setInterval(async () => {
    const browserView = tabs.get(tabId);
    try {
      if (browserView && browserView.webContents && !browserView.webContents.isDestroyed()) {
        console.log(`Auto-refresh triggered for tab ${tabId}`);
        // If playlist is enabled, load URL from playlist
        if (playlistEnabled && playlistUrls && playlistUrls.length > 0) {
          let urlToLoad;

          if (playlistMode === 'random') {
            // Random mode: pick a random URL
            const randomIndex = Math.floor(Math.random() * playlistUrls.length);
            urlToLoad = playlistUrls[randomIndex];
          } else {
            // Sequential mode: go through URLs in order
            let playlistIndex = playlistIndices.get(tabId) || 0;
            urlToLoad = playlistUrls[playlistIndex];
            playlistIndex = (playlistIndex + 1) % playlistUrls.length;
            playlistIndices.set(tabId, playlistIndex);
          }

          // If resetSession is enabled, clear all session data before loading
          if (resetSession) {
            clearSessionData(tabId);
          }

          // Load the URL from playlist
          if (browserView && browserView.webContents && !browserView.webContents.isDestroyed()) {
            browserView.webContents.reload();
          }
        } else {
          // Normal reload mode
          console.log(`Reloading tab ${tabId} (resetSession: ${resetSession})`);

          // Check if it's YouTube and preserve playback time
          const currentUrl = browserView.webContents.getURL();
          let urlToReload = currentUrl;

          if (isYouTubeUrl(currentUrl)) {
            try {
              const currentTime = await getYouTubeCurrentTime(browserView);
              console.log('currentTime:', currentTime);

              if (currentTime && currentTime > 0) {
                urlToReload = addTimestampToYouTubeUrl(currentUrl, currentTime);
                console.log(`Preserving YouTube playback time: ${currentTime} seconds`);
              }
            } catch (error) {
              console.error('Error getting YouTube time:', error);
            }
          }

          if (resetSession) {
            clearSessionData(tabId);
            setTimeout(() => {
              if (browserView && browserView.webContents && !browserView.webContents.isDestroyed()) {
                if (urlToReload !== currentUrl) {
                  browserView.webContents.loadURL(urlToReload);
                } else {
                  browserView.webContents.reload();
                }
              }
            }, 100);
          } else {
            if (urlToReload !== currentUrl) {
              browserView.webContents.loadURL(urlToReload);
            } else {
              browserView.webContents.reload();
            }
          }
        }
      } else {
        // Tab was closed, stop auto-refresh
        stopAutoRefresh(tabId);
      }
    } catch (e) {
      console.error(
        `Error in auto-refresh for tab tab ${tabId} (resetSession: ${resetSession}):`,
        e
      );
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
  // Reset playlist index when stopping
  playlistIndices.delete(tabId);
}

// Set auto-refresh settings for a tab
function setAutoRefreshSettings(tabId, enabled, intervalSeconds, resetSession = false, playlistEnabled = false, playlistMode = 'sequential', playlistUrls = []) {
  if (enabled) {
    autoRefreshSettings.set(tabId, {
      enabled: true,
      interval: intervalSeconds,
      resetSession: resetSession || false,
      playlistEnabled: playlistEnabled || false,
      playlistMode: playlistMode || 'sequential',
      playlistUrls: playlistUrls || []
    });
    startAutoRefresh(tabId, intervalSeconds, resetSession || false, playlistEnabled || false, playlistMode || 'sequential', playlistUrls || []);
  } else {
    autoRefreshSettings.set(tabId, {
      enabled: false,
      interval: intervalSeconds,
      resetSession: resetSession || false,
      playlistEnabled: playlistEnabled || false,
      playlistMode: playlistMode || 'sequential',
      playlistUrls: playlistUrls || []
    });
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
  loadAutoProxySettings();
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

        console.log({ proxyRules, proxyUrl, settings });

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
  return settings || {
    enabled: false,
    interval: 5,
    resetSession: false,
    playlistEnabled: false,
    playlistMode: 'sequential',
    playlistUrls: []
  };
});

ipcMain.handle('set-auto-refresh-settings', (event, tabId, enabled, intervalSeconds, resetSession = false, playlistEnabled = false, playlistMode = 'sequential', playlistUrls = []) => {
  if (intervalSeconds < 1 || intervalSeconds > 36000) {
    return { success: false, error: 'Interval must be between 1 and 36000 seconds' };
  }

  if (playlistEnabled && (!playlistUrls || playlistUrls.length === 0)) {
    return { success: false, error: 'Playlist must contain at least one URL' };
  }

  if (playlistMode !== 'sequential' && playlistMode !== 'random') {
    return { success: false, error: 'Playlist mode must be "sequential" or "random"' };
  }

  setAutoRefreshSettings(tabId, enabled, intervalSeconds, resetSession, playlistEnabled, playlistMode, playlistUrls);
  return { success: true };
});

// Clear session data IPC handler
ipcMain.handle('clear-session-data', async (event, tabId) => {
  if (!tabId || !tabs.has(tabId)) {
    return { success: false, error: 'Invalid tab ID' };
  }

  try {
    await clearSessionData(tabId);

    // Reload the page after clearing session
    const browserView = tabs.get(tabId);
    if (browserView && browserView.webContents && !browserView.webContents.isDestroyed()) {
      setTimeout(() => {
        if (browserView && browserView.webContents && !browserView.webContents.isDestroyed()) {
          browserView.webContents.reloadIgnoringCache();
        }
      }, 100);
    }

    return { success: true };
  } catch (error) {
    console.error('Error in clear-session-data:', error);
    return { success: false, error: `Failed to clear session data: ${error.message}` };
  }
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

// Browser Identity IPC handlers
ipcMain.handle('get-browser-identity', (event, tabId) => {
  if (!tabId || !tabs.has(tabId)) {
    return 'chrome'; // Default to Chrome
  }
  return tabBrowserIdentity.get(tabId) || 'chrome';
});

ipcMain.handle('set-browser-identity', (event, tabId, identity) => {
  if (!tabId || !tabs.has(tabId)) {
    return { success: false, error: 'Invalid tab ID' };
  }

  if (identity !== 'chrome' && identity !== 'firefox') {
    return { success: false, error: 'Invalid browser identity. Must be "chrome" or "firefox"' };
  }

  try {
    applyBrowserIdentityToTab(tabId, identity);

    // Reload the page to apply new User-Agent
    const browserView = tabs.get(tabId);
    if (browserView && browserView.webContents && !browserView.webContents.isDestroyed()) {
      const currentUrl = browserView.webContents.getURL();
      if (currentUrl && currentUrl !== 'about:blank') {
        setTimeout(() => {
          if (browserView && browserView.webContents && !browserView.webContents.isDestroyed()) {
            browserView.webContents.reloadIgnoringCache();
          }
        }, 100);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error in set-browser-identity:', error);
    return { success: false, error: `Failed to set browser identity: ${error.message}` };
  }
});

ipcMain.handle('get-user-agent', (event, tabId) => {
  if (!tabId || !tabs.has(tabId)) {
    return getUserAgentString('chrome');
  }

  const browserView = tabs.get(tabId);
  if (browserView && browserView.webContents && !browserView.webContents.isDestroyed()) {
    return browserView.webContents.getUserAgent();
  }

  const identity = tabBrowserIdentity.get(tabId) || 'chrome';
  return getUserAgentString(identity);
});

// Auto Proxy IPC handlers
ipcMain.handle('get-auto-proxy-settings', () => {
  return autoProxySettings;
});

ipcMain.handle('set-auto-proxy-settings', (event, settings) => {
  autoProxySettings = { ...autoProxySettings, ...settings };
  saveAutoProxySettings();
  return { success: true };
});

ipcMain.handle('fetch-and-check-proxies', async (event, apiUrl, requestId) => {
  const { HttpsProxyAgent } = require('https-proxy-agent');
  const ipProxyUrl = 'https://api.ipify.org/?format=json';

  // Create operation tracker
  const operationId = requestId || `fetch-${Date.now()}`;
  fetchProxyOperations.set(operationId, { shouldStop: false });

  // Dynamic import for node-fetch v3
  let fetch;
  try {
    const fetchModule = await import('node-fetch');
    fetch = fetchModule.default;
  } catch (error) {
    fetchProxyOperations.delete(operationId);
    return { success: false, error: 'Failed to load fetch module' };
  }

  try {
    // Fetch proxies from API
    console.log('Fetching proxies from API:', apiUrl);
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data || !data.proxies || !Array.isArray(data.proxies)) {
      fetchProxyOperations.delete(operationId);
      return { success: false, error: 'Invalid API response' };
    }

    const proxies = data.proxies;
    const workingProxies = [];
    let checked = 0;
    let working = 0;
    let failed = 0;

    console.log(`Found ${proxies.length} proxies to check`);

    // Check each proxy (similar to test-proxy.js)
    for (const item of proxies) {
      const operation = fetchProxyOperations.get(operationId);
      if (!operation || operation.shouldStop) {
        console.log('Fetch operation stopped by user');
        break; // Stop if requested
      }

      let checkResponse = null;
      let proxyFound = false;

      try {
        const proxyUrl = item.proxy;
        if (!proxyUrl) {
          checked++;
          continue;
        }

        // Parse proxy URL to get type, host, port (similar to test-proxy.js)
        // Format: http://host:port or https://host:port
        const agent = new HttpsProxyAgent(proxyUrl);
        checkResponse = await fetch(ipProxyUrl, {
          agent: agent,
          timeout: 10000 // 10 second timeout
        });

        if (checkResponse && checkResponse.ok) {
          const result = await checkResponse.json();
          const proxyType = item.protocol || (proxyUrl.startsWith('https://') ? 'https' : 'http');

          const workingProxy = {
            proxy: proxyUrl,
            type: proxyType,
            ip: result.ip || item.ip || 'N/A',
            country: item.ip_data?.country || 'Unknown',
            port: item.port,
            timeout: item.timeout
          };

          workingProxies.push(workingProxy);
          working++;
          proxyFound = true;
          console.log(`Working proxy found: ${proxyUrl} (${item.ip_data?.country || 'Unknown'})`);

          // Send working proxy immediately to renderer
          event.sender.send('proxy-found', {
            requestId: operationId,
            proxy: workingProxy,
            checked: checked + 1,
            working,
            failed,
            total: proxies.length
          });
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        // Silently fail individual proxy checks
      }

      checked++;

      // Send progress update every 10 proxies or when proxy is found
      if (checked % 10 === 0 || proxyFound) {
        event.sender.send('proxy-fetch-progress', {
          requestId: operationId,
          checked,
          working,
          failed,
          total: proxies.length
        });
      }
    }

    fetchProxyOperations.delete(operationId);

    return {
      success: true,
      workingProxies: workingProxies,
      stats: {
        total: proxies.length,
        checked: checked,
        working: working,
        failed: failed
      }
    };
  } catch (error) {
    console.error('Error fetching and checking proxies:', error);
    fetchProxyOperations.delete(operationId);
    return { success: false, error: error.message };
  }
});

// Stop fetch operation
ipcMain.handle('stop-fetch-proxies', (event, requestId) => {
  if (requestId && fetchProxyOperations.has(requestId)) {
    fetchProxyOperations.get(requestId).shouldStop = true;
    return { success: true };
  }
  return { success: false, error: 'Operation not found' };
});


