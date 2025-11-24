// Browser UI Controller with Tab Support
class BrowserController {
  constructor() {
    this.tabs = new Map(); // Map of tabId -> { element, title, url, isLoading }
    this.activeTabId = null;
    this.currentUrl = 'about:blank';
    this.initializeElements();
    this.attachEventListeners();
    this.setupEventListeners();
    this.loadInitialTabs();
    this.loadProxySelector();
  }

  initializeElements() {
    this.urlBar = document.getElementById('url-bar');
    this.backBtn = document.getElementById('back-btn');
    this.forwardBtn = document.getElementById('forward-btn');
    this.reloadBtn = document.getElementById('reload-btn');
    this.settingsBtn = document.getElementById('settings-btn');
    this.devtoolsBtn = document.getElementById('devtools-btn');
    this.autoRefreshBtn = document.getElementById('auto-refresh-btn');
    this.clearSessionBtn = document.getElementById('clear-session-btn');
    this.proxySelector = document.getElementById('proxy-selector');
    this.errorMessage = document.getElementById('error-message');
    this.errorText = document.getElementById('error-text');
    this.errorClose = document.getElementById('error-close');
    this.loadingIndicator = document.getElementById('loading-indicator');
    this.tabsContainer = document.getElementById('tabs-container');
    this.newTabBtn = document.getElementById('new-tab-btn');

    // Auto-refresh modal elements
    this.autoRefreshModal = document.getElementById('auto-refresh-modal');
    this.autoRefreshEnabled = document.getElementById('auto-refresh-enabled');
    this.autoRefreshInterval = document.getElementById('auto-refresh-interval');
    this.autoRefreshResetSession = document.getElementById('auto-refresh-reset-session');
    this.autoRefreshPlaylistEnabled = document.getElementById('auto-refresh-playlist-enabled');
    this.playlistContainer = document.getElementById('playlist-container');
    this.playlistMode = document.getElementById('playlist-mode');
    this.playlistUrlInput = document.getElementById('playlist-url-input');
    this.playlistAddBtn = document.getElementById('playlist-add-btn');
    this.playlistList = document.getElementById('playlist-list');
    this.autoRefreshStatus = document.getElementById('auto-refresh-status');
    this.autoRefreshCloseBtn = document.getElementById('auto-refresh-close-btn');
    this.autoRefreshCancelBtn = document.getElementById('auto-refresh-cancel-btn');
    this.autoRefreshSaveBtn = document.getElementById('auto-refresh-save-btn');
    
    // Playlist data
    this.playlistUrls = [];
  }

  attachEventListeners() {
    // URL bar navigation
    this.urlBar.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.navigate();
      }
    });

    this.urlBar.addEventListener('focus', () => {
      this.urlBar.select();
    });

    // Navigation buttons
    this.backBtn.addEventListener('click', () => {
      window.electronAPI.goBack();
      this.updateNavigationButtons();
    });

    this.forwardBtn.addEventListener('click', () => {
      window.electronAPI.goForward();
      this.updateNavigationButtons();
    });

    this.reloadBtn.addEventListener('click', () => {
      window.electronAPI.reload();
    });

    // Action buttons
    this.settingsBtn.addEventListener('click', async () => {
      window.electronAPI.openSettings();
      // Reload proxy selector after settings window might have changed proxy list
      // Wait a bit for settings window to potentially make changes
      setTimeout(() => {
        this.loadProxySelector();
      }, 1000);
    });

    this.devtoolsBtn.addEventListener('click', () => {
      window.electronAPI.openDevTools();
    });

    this.autoRefreshBtn.addEventListener('click', () => {
      this.openAutoRefreshModal();
    });

    this.clearSessionBtn.addEventListener('click', () => {
      this.clearSessionData();
    });

    // Proxy selector
    this.proxySelector.addEventListener('change', () => {
      this.applyProxyToCurrentTab();
    });

    // Auto-refresh modal handlers
    this.autoRefreshCloseBtn.addEventListener('click', () => {
      this.closeAutoRefreshModal();
    });

    this.autoRefreshCancelBtn.addEventListener('click', () => {
      this.closeAutoRefreshModal();
    });

    this.autoRefreshSaveBtn.addEventListener('click', () => {
      this.saveAutoRefreshSettings();
    });

    // Playlist handlers
    this.autoRefreshPlaylistEnabled.addEventListener('change', () => {
      this.playlistContainer.style.display = this.autoRefreshPlaylistEnabled.checked ? 'block' : 'none';
    });

    this.playlistAddBtn.addEventListener('click', () => {
      this.addPlaylistUrl();
    });

    this.playlistUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.addPlaylistUrl();
      }
    });

    // Close modal on background click
    this.autoRefreshModal.addEventListener('click', (e) => {
      if (e.target === this.autoRefreshModal) {
        this.closeAutoRefreshModal();
      }
    });

    // New tab button
    this.newTabBtn.addEventListener('click', () => {
      this.createNewTab();
    });

    // Error close button
    this.errorClose.addEventListener('click', () => {
      this.hideError();
    });
  }

  async loadInitialTabs() {
    try {
      const tabs = await window.electronAPI.getTabs();
      const activeTabId = await window.electronAPI.getActiveTabId();

      tabs.forEach(tab => {
        this.addTabToUI(tab.id, tab.title, tab.url, tab.isLoading);
      });

      if (activeTabId && this.tabs.has(activeTabId)) {
        this.switchToTab(activeTabId);
      }
    } catch (error) {
      console.error('Error loading initial tabs:', error);
    }
  }

  setupEventListeners() {
    // Listen for URL changes from main process
    window.electronAPI.onUrlChanged((data) => {
      if (data.tabId === this.activeTabId) {
        this.currentUrl = data.url;
        if (data.url && data.url !== 'about:blank') {
          this.urlBar.value = data.url;
        }
        this.updateNavigationButtons();
      }
    });

    // Listen for load errors from main process
    window.electronAPI.onLoadError((error) => {
      if (error.tabId === this.activeTabId) {
        this.hideLoading();
        this.showError(`Error ${error.errorCode}: ${error.errorDescription}`);
      }
    });

    // Listen for loading state changes
    window.electronAPI.onBrowserLoading((data) => {
      if (data.tabId === this.activeTabId) {
        if (data.isLoading) {
          this.showLoading();
        } else {
          this.hideLoading();
          this.updateUrl();
          this.updateNavigationButtons();
        }
      }
      // Update tab loading indicator
      this.updateTabLoading(data.tabId, data.isLoading);
    });

    // Listen for title changes
    window.electronAPI.onTitleChanged((data) => {
      if (data.tabId === this.activeTabId) {
        document.title = data.title || 'Electron Browser';
      }
      this.updateTabTitle(data.tabId, data.title);
    });

    // Update auto-refresh button state on tab switch
    window.electronAPI.onTabSwitched(() => {
      this.updateAutoRefreshButtonState();
      this.updateProxySelector();
    });

    // Tab management events
    window.electronAPI.onTabCreated((data) => {
      this.addTabToUI(data.tabId, data.title || 'New Tab', data.url, false);
      this.switchToTab(data.tabId);
      this.updateAutoRefreshButtonState();
    });

    window.electronAPI.onTabClosed((data) => {
      this.removeTabFromUI(data.tabId);
    });

    window.electronAPI.onTabSwitched((data) => {
      this.switchToTab(data.tabId);
      this.urlBar.value = data.url || '';
      this.currentUrl = data.url;
      if (data.isLoading) {
        this.showLoading();
      } else {
        this.hideLoading();
      }
      this.updateNavigationButtons();
      this.updateProxySelector();
    });

    window.electronAPI.onTabUpdated((data) => {
      this.updateTabInfo(data.tabId, data.title, data.url);
    });

    window.electronAPI.onTabLoading((data) => {
      this.updateTabLoading(data.tabId, data.isLoading);
    });
  }

  addTabToUI(tabId, title, url, isLoading) {
    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.dataset.tabId = tabId;

    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'tab-loading';
    loadingIndicator.style.display = isLoading ? 'block' : 'none';

    const titleElement = document.createElement('span');
    titleElement.className = 'tab-title';
    titleElement.textContent = title || 'New Tab';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close';
    closeBtn.innerHTML = '×';
    closeBtn.title = 'Close tab';

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTab(tabId);
    });

    tabElement.addEventListener('click', () => {
      this.switchToTab(tabId);
    });

    tabElement.appendChild(loadingIndicator);
    tabElement.appendChild(titleElement);
    tabElement.appendChild(closeBtn);

    this.tabsContainer.appendChild(tabElement);
    this.tabs.set(tabId, {
      element: tabElement,
      title: title || 'New Tab',
      url: url || 'about:blank',
      isLoading: isLoading
    });
  }

  removeTabFromUI(tabId) {
    const tab = this.tabs.get(tabId);
    if (tab && tab.element) {
      tab.element.remove();
    }
    this.tabs.delete(tabId);
  }

  async switchToTab(tabId) {
    // Don't switch if already active
    if (this.activeTabId === tabId) {
      return;
    }

    // Set activeTabId early to prevent event loop
    this.activeTabId = tabId;

    // Update active state in UI first
    this.tabs.forEach((tab, id) => {
      if (id === tabId) {
        tab.element.classList.add('active');
        // Scroll tab into view
        tab.element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      } else {
        tab.element.classList.remove('active');
      }
    });

    // Call main process to switch BrowserView (show/hide, no reload)
    try {
      await window.electronAPI.switchTab(tabId);
    } catch (error) {
      console.error('Error switching tab:', error);
    }

    // Update URL bar
    const tab = this.tabs.get(tabId);
    if (tab) {
      this.urlBar.value = tab.url || '';
      this.currentUrl = tab.url || '';
    }

    // Update auto-refresh button state
    this.updateAutoRefreshButtonState();
  }

  updateTabInfo(tabId, title, url) {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.title = title || 'New Tab';
      tab.url = url || 'about:blank';

      const titleElement = tab.element.querySelector('.tab-title');
      if (titleElement) {
        titleElement.textContent = tab.title;
      }
    }
  }

  updateTabLoading(tabId, isLoading) {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.isLoading = isLoading;
      const loadingIndicator = tab.element.querySelector('.tab-loading');
      if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
      }
    }
  }

  async createNewTab(url = 'about:blank') {
    try {
      await window.electronAPI.createTab(url);
    } catch (error) {
      console.error('Error creating tab:', error);
    }
  }

  async closeTab(tabId) {
    try {
      await window.electronAPI.closeTab(tabId);
    } catch (error) {
      console.error('Error closing tab:', error);
    }
  }

  async navigate() {
    let url = this.urlBar.value.trim();

    if (!url) {
      return;
    }

    // Format URL if needed
    if (!url.includes('://')) {
      if (url.includes('.') && !url.includes(' ')) {
        url = 'https://' + url;
      } else {
        // Treat as search query
        url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      }
    }

    this.currentUrl = url;
    this.urlBar.value = url;
    this.showLoading();

    try {
      await window.electronAPI.navigateToUrl(url, this.activeTabId);
    } catch (error) {
      this.hideLoading();
      this.showError(`Navigation failed: ${error.message}`);
    }
  }

  async updateUrl() {
    try {
      const url = await window.electronAPI.getCurrentUrl();
      if (url && url !== 'about:blank') {
        this.currentUrl = url;
        this.urlBar.value = url;
      }
    } catch (error) {
      console.error('Error getting current URL:', error);
    }
  }

  async updateNavigationButtons() {
    try {
      const canBack = await window.electronAPI.canGoBack();
      const canForward = await window.electronAPI.canGoForward();

      this.backBtn.disabled = !canBack;
      this.forwardBtn.disabled = !canForward;
    } catch (error) {
      console.error('Error updating navigation buttons:', error);
    }
  }

  showError(message) {
    this.errorText.textContent = message;
    this.errorMessage.classList.remove('hidden');
  }

  hideError() {
    this.errorMessage.classList.add('hidden');
  }

  showLoading() {
    this.loadingIndicator.classList.remove('hidden');
  }

  hideLoading() {
    this.loadingIndicator.classList.add('hidden');
  }

  async openAutoRefreshModal() {
    if (!this.activeTabId) {
      this.showError('No active tab');
      return;
    }

    try {
      const settings = await window.electronAPI.getAutoRefreshSettings(this.activeTabId);
      this.autoRefreshEnabled.checked = settings.enabled;
      this.autoRefreshInterval.value = settings.interval;
      this.autoRefreshResetSession.checked = settings.resetSession || false;
      this.autoRefreshPlaylistEnabled.checked = settings.playlistEnabled || false;
      this.playlistContainer.style.display = this.autoRefreshPlaylistEnabled.checked ? 'block' : 'none';
      this.playlistMode.value = settings.playlistMode || 'sequential';
      this.playlistUrls = settings.playlistUrls || [];
      this.renderPlaylist();
      this.updateAutoRefreshStatus(settings);

      // Hide BrowserView to allow modal interaction
      await window.electronAPI.setModalVisible(true);

      this.autoRefreshModal.classList.remove('hidden');
      // Ensure modal is on top
      this.autoRefreshModal.style.zIndex = '999999';
      document.body.style.overflow = 'hidden';

      // Focus on the interval input after a short delay to ensure it's ready
      setTimeout(() => {
        this.autoRefreshInterval.focus();
        this.autoRefreshInterval.select();
      }, 100);
    } catch (error) {
      console.error('Error loading auto-refresh settings:', error);
      this.showError('Failed to load auto-refresh settings');
    }
  }

  async closeAutoRefreshModal() {
    this.autoRefreshModal.classList.add('hidden');
    this.autoRefreshStatus.textContent = '';
    document.body.style.overflow = '';

    // Restore BrowserView
    await window.electronAPI.setModalVisible(false);
  }

  updateAutoRefreshStatus(settings) {
    if (settings.enabled) {
      const resetText = settings.resetSession ? ' (with session reset)' : '';
      const playlistText = settings.playlistEnabled ? ` (playlist: ${settings.playlistUrls?.length || 0} URLs, ${settings.playlistMode || 'sequential'})` : '';
      this.autoRefreshStatus.textContent = `Auto-refresh is enabled. Page will refresh every ${settings.interval} second(s)${resetText}${playlistText}.`;
      this.autoRefreshStatus.className = 'auto-refresh-status enabled';
      this.autoRefreshBtn.classList.add('active');
    } else {
      this.autoRefreshStatus.textContent = 'Auto-refresh is disabled.';
      this.autoRefreshStatus.className = 'auto-refresh-status disabled';
      this.autoRefreshBtn.classList.remove('active');
    }
  }

  addPlaylistUrl() {
    const url = this.playlistUrlInput.value.trim();
    if (!url) return;

    // Format URL if needed
    let formattedUrl = url;
    if (!url.includes('://')) {
      if (url.includes('.') && !url.includes(' ')) {
        formattedUrl = 'https://' + url;
      } else {
        this.showError('Invalid URL');
        return;
      }
    }

    if (this.playlistUrls.includes(formattedUrl)) {
      this.showError('URL already in playlist');
      return;
    }

    this.playlistUrls.push(formattedUrl);
    this.playlistUrlInput.value = '';
    this.renderPlaylist();
  }

  removePlaylistUrl(index) {
    this.playlistUrls.splice(index, 1);
    this.renderPlaylist();
  }

  renderPlaylist() {
    if (this.playlistUrls.length === 0) {
      this.playlistList.innerHTML = '<div class="empty-list" style="text-align: center; color: #999; padding: 20px;">No URLs in playlist</div>';
      return;
    }

    this.playlistList.innerHTML = this.playlistUrls.map((url, index) => `
      <div class="playlist-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px; margin-bottom: 4px; background: #fff; border-radius: 4px; border: 1px solid #e0e0e0;">
        <span style="flex: 1; font-size: 12px; word-break: break-all; margin-right: 8px;">${url}</span>
        <button type="button" class="btn btn-secondary btn-small" data-index="${index}" style="flex-shrink: 0;">Remove</button>
      </div>
    `).join('');

    // Attach remove handlers
    this.playlistList.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.removePlaylistUrl(index);
      });
    });
  }

  async saveAutoRefreshSettings() {
    if (!this.activeTabId) {
      this.showError('No active tab');
      return;
    }

    const enabled = this.autoRefreshEnabled.checked;
    const interval = parseInt(this.autoRefreshInterval.value, 10);
    const resetSession = this.autoRefreshResetSession.checked;
    const playlistEnabled = this.autoRefreshPlaylistEnabled.checked;
    const playlistMode = this.playlistMode.value;
    const playlistUrls = this.playlistUrls;

    if (isNaN(interval) || interval < 1 || interval > 36000) {
      this.autoRefreshStatus.textContent = 'Interval must be between 1 and 36000 seconds.';
      this.autoRefreshStatus.className = 'auto-refresh-status error';
      return;
    }

    if (playlistEnabled && playlistUrls.length === 0) {
      this.autoRefreshStatus.textContent = 'Please add at least one URL to playlist.';
      this.autoRefreshStatus.className = 'auto-refresh-status error';
      return;
    }

    try {
      const result = await window.electronAPI.setAutoRefreshSettings(
        this.activeTabId,
        enabled,
        interval,
        resetSession,
        playlistEnabled,
        playlistMode,
        playlistUrls
      );

      if (result.success) {
        const settings = { enabled, interval, resetSession, playlistEnabled, playlistMode, playlistUrls };
        this.updateAutoRefreshStatus(settings);
        this.autoRefreshStatus.textContent = 'Settings saved successfully!';
        this.autoRefreshStatus.className = 'auto-refresh-status success';

        // Close modal after a short delay
        setTimeout(() => {
          this.closeAutoRefreshModal();
        }, 1000);
      } else {
        this.autoRefreshStatus.textContent = result.error || 'Failed to save settings';
        this.autoRefreshStatus.className = 'auto-refresh-status error';
      }
    } catch (error) {
      console.error('Error saving auto-refresh settings:', error);
      this.autoRefreshStatus.textContent = 'Failed to save settings: ' + error.message;
      this.autoRefreshStatus.className = 'auto-refresh-status error';
    }
  }

  async updateAutoRefreshButtonState() {
    if (!this.activeTabId) {
      this.autoRefreshBtn.classList.remove('active');
      return;
    }

    try {
      const settings = await window.electronAPI.getAutoRefreshSettings(this.activeTabId);
      if (settings.enabled) {
        this.autoRefreshBtn.classList.add('active');
      } else {
        this.autoRefreshBtn.classList.remove('active');
      }
    } catch (error) {
      console.error('Error checking auto-refresh state:', error);
    }
  }

  async loadProxySelector() {
    try {
      const proxyList = await window.electronAPI.getProxyList();
      this.proxySelector.innerHTML = '<option value="">No Proxy</option>';

      proxyList.forEach(proxy => {
        const option = document.createElement('option');
        option.value = proxy.id;
        option.textContent = proxy.name;
        this.proxySelector.appendChild(option);
      });

      await this.updateProxySelector();
    } catch (error) {
      console.error('Error loading proxy selector:', error);
    }
  }

  async updateProxySelector() {
    if (!this.activeTabId) {
      this.proxySelector.value = '';
      return;
    }

    try {
      const settings = await window.electronAPI.getProxySettings(this.activeTabId);
      if (settings) {
        // Try to find matching proxy in list
        const proxyList = await window.electronAPI.getProxyList();
        const matchingProxy = proxyList.find(p =>
          p.type === settings.type &&
          p.host === settings.host &&
          p.port === settings.port
        );
        if (matchingProxy) {
          this.proxySelector.value = matchingProxy.id;
          return;
        }
      }
      this.proxySelector.value = '';
    } catch (error) {
      console.error('Error updating proxy selector:', error);
    }
  }

  async clearSessionData() {
    if (!this.activeTabId) {
      this.showError('No active tab');
      return;
    }

    // Confirm action
    if (!confirm('Clear all session data (cookies, cache, localStorage)? This will reload the page.')) {
      return;
    }

    try {
      this.showLoading();
      const result = await window.electronAPI.clearSessionData(this.activeTabId);
      if (result.success) {
        this.showError('Session data cleared successfully');
        setTimeout(() => {
          this.hideError();
        }, 2000);
      } else {
        this.showError(result.error || 'Failed to clear session data');
      }
    } catch (error) {
      console.error('Error clearing session data:', error);
      this.showError('Error clearing session data: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  async applyProxyToCurrentTab() {
    if (!this.activeTabId) {
      this.showError('No active tab');
      return;
    }

    const proxyId = this.proxySelector.value || null;

    try {
      const result = await window.electronAPI.applyProxyToTab(this.activeTabId, proxyId);
      if (result.success) {
        // Success - proxy will be applied and page reloaded
      } else {
        this.showError(result.error || 'Failed to apply proxy');
        // Revert selector
        await this.updateProxySelector();
      }
    } catch (error) {
      console.error('Error applying proxy:', error);
      this.showError('Error applying proxy: ' + error.message);
      // Revert selector
      await this.updateProxySelector();
    }
  }
}

// Initialize browser when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new BrowserController();
});
