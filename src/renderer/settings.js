// Settings Controller
class SettingsController {
  constructor() {
    this.currentTabId = null;
    this.editingProxyId = null;
    this.currentProxyId = null; // Proxy currently applied to tab
    this.form = document.getElementById('proxy-form');
    this.statusMessage = document.getElementById('status-message');
    this.proxyListContainer = document.getElementById('proxy-list-container');
    this.proxySelect = document.getElementById('proxy-select');
    this.currentTabInfo = document.getElementById('current-tab-info');

    this.initializeElements();
    this.attachEventListeners();
    this.initializeTabs();
    this.getCurrentTabId();
    this.loadProxyList();
    this.loadProxySelect();
  }

  initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;

        // Update button states
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update content visibility
        tabContents.forEach(content => {
          content.classList.remove('active');
        });

        const tabIdMap = {
          'list': 'proxy-list-tab',
          'new': 'proxy-form-tab',
          'apply': 'apply-proxy-tab',
          'auto': 'auto-proxy-tab',
          'browser': 'browser-identity-tab'
        };

        const targetContentId = tabIdMap[targetTab];
        if (targetContentId) {
          document.getElementById(targetContentId).classList.add('active');
        }

        // Load data when switching to certain tabs
        if (targetTab === 'list') {
          this.loadProxyList();
        } else if (targetTab === 'apply') {
          this.loadProxySelect();
          this.updateCurrentTabInfo();
        } else if (targetTab === 'auto') {
          this.loadAutoProxySettings();
        } else if (targetTab === 'browser') {
          this.loadBrowserIdentity();
          this.updateBrowserTabInfo();
        }
      });
    });
  }

  async getCurrentTabId() {
    try {
      this.currentTabId = await window.electronAPI.getActiveTabId();
      if (this.currentTabId) {
        await this.loadCurrentTabProxy();
        await this.updateCurrentTabInfo();
      } else {
        this.showStatus('No active tab found', 'error');
      }
    } catch (error) {
      console.error('Error getting current tab ID:', error);
      this.showStatus('Error getting current tab', 'error');
    }
  }

  async loadCurrentTabProxy() {
    if (!this.currentTabId) return;

    try {
      const settings = await window.electronAPI.getProxySettings(this.currentTabId);
      if (settings) {
        // Try to find matching proxy in list
        const proxyList = await window.electronAPI.getProxyList();
        const matchingProxy = proxyList.find(p =>
          p.type === settings.type &&
          p.host === settings.host &&
          p.port === settings.port
        );
        if (matchingProxy) {
          this.currentProxyId = matchingProxy.id;
        }
      }
    } catch (error) {
      console.error('Error loading current tab proxy:', error);
    }
  }

  async updateCurrentTabInfo() {
    if (!this.currentTabId) {
      this.currentTabInfo.textContent = 'No active tab';
      return;
    }

    try {
      const settings = await window.electronAPI.getProxySettings(this.currentTabId);
      if (settings) {
        const authInfo = settings.username ? ` (${settings.username})` : '';
        this.currentTabInfo.textContent = `Tab ${this.currentTabId}: ${settings.type.toUpperCase()} ${settings.host}:${settings.port}${authInfo}`;
      } else {
        this.currentTabInfo.textContent = `Tab ${this.currentTabId}: No proxy applied`;
      }
    } catch (error) {
      this.currentTabInfo.textContent = `Tab ${this.currentTabId}: Error loading info`;
    }
  }

  initializeElements() {
    this.proxyType = document.getElementById('proxy-type');
    this.proxyAddress = document.getElementById('proxy-address');
    this.proxyName = document.getElementById('proxy-name');
    this.testBtn = document.getElementById('test-btn');
    this.cancelEditBtn = document.getElementById('cancel-edit-btn');
    this.saveBtn = document.getElementById('save-btn');
    this.closeBtn = document.getElementById('settings-close-btn');
    this.addNewProxyBtn = document.getElementById('add-new-proxy-btn');
    this.applyProxyBtn = document.getElementById('apply-proxy-btn');
    this.browserIdentitySelect = document.getElementById('browser-identity-select');
    this.applyBrowserIdentityBtn = document.getElementById('apply-browser-identity-btn');
    this.browserTabInfo = document.getElementById('browser-tab-info');
    this.currentUserAgent = document.getElementById('current-user-agent');
    
    // Import/Export buttons
    this.exportProxiesBtn = document.getElementById('export-proxies-btn');
    this.importProxiesBtn = document.getElementById('import-proxies-btn');
    this.clearProxiesBtn = document.getElementById('clear-proxies-btn');
    this.importFileInput = document.getElementById('import-file-input');

    // Auto proxy elements
    this.autoProxyEnabled = document.getElementById('auto-proxy-enabled');
    this.autoProxySettings = document.getElementById('auto-proxy-settings');
    this.autoProxySource = document.getElementById('auto-proxy-source');
    this.autoProxySavedContainer = document.getElementById('auto-proxy-saved-container');
    this.autoProxySelect = document.getElementById('auto-proxy-select');
    this.autoProxyApiContainer = document.getElementById('auto-proxy-api-container');
    this.autoProxyApiUrl = document.getElementById('auto-proxy-api-url');
    this.fetchProxiesBtn = document.getElementById('fetch-proxies-btn');
    this.stopFetchBtn = document.getElementById('stop-fetch-btn');
    this.fetchProgress = document.getElementById('fetch-progress');
    this.fetchStatus = document.getElementById('fetch-status');
    this.fetchTotal = document.getElementById('fetch-total');
    this.fetchChecked = document.getElementById('fetch-checked');
    this.fetchWorking = document.getElementById('fetch-working');
    this.fetchFailed = document.getElementById('fetch-failed');
    this.autoProxyApiList = document.getElementById('auto-proxy-api-list');
    this.autoProxyApiListContent = document.getElementById('auto-proxy-api-list-content');
    this.saveAllWorkingBtn = document.getElementById('save-all-working-btn');
    this.autoProxyAvoidDuplicate = document.getElementById('auto-proxy-avoid-duplicate');

    this.workingProxies = []; // Store working proxies from API
    this.isFetching = false;
    this.currentFetchRequestId = null;
  }

  attachEventListeners() {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveProxyToList();
    });

    this.testBtn.addEventListener('click', () => {
      this.testProxy();
    });

    this.cancelEditBtn.addEventListener('click', () => {
      this.clearForm();
      this.switchToTab('list');
    });

    this.closeBtn.addEventListener('click', () => {
      window.close();
    });

    this.addNewProxyBtn.addEventListener('click', () => {
      this.clearForm();
      this.switchToTab('new');
    });

    this.applyProxyBtn.addEventListener('click', () => {
      this.applyProxyToTab();
    });

    this.applyBrowserIdentityBtn.addEventListener('click', () => {
      this.applyBrowserIdentity();
    });
    
    // Import/Export event listeners
    this.exportProxiesBtn.addEventListener('click', () => {
      this.exportProxies();
    });
    
    this.importProxiesBtn.addEventListener('click', () => {
      this.importFileInput.click();
    });
    
    this.importFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleImportFile(e.target.files[0]);
      }
    });
    
    this.clearProxiesBtn.addEventListener('click', () => {
      this.clearAllProxies();
    });

    // Auto proxy event listeners
    this.autoProxyEnabled.addEventListener('change', () => {
      this.autoProxySettings.style.display = this.autoProxyEnabled.checked ? 'block' : 'none';
      if (this.autoProxyEnabled.checked) {
        this.saveAutoProxySettings();
      }
    });

    this.autoProxySource.addEventListener('change', () => {
      if (this.autoProxySource.value === 'saved') {
        this.autoProxySavedContainer.style.display = 'block';
        this.autoProxyApiContainer.style.display = 'none';
      } else {
        this.autoProxySavedContainer.style.display = 'none';
        this.autoProxyApiContainer.style.display = 'block';
      }
      this.saveAutoProxySettings();
    });

    this.autoProxySelect.addEventListener('change', () => {
      this.saveAutoProxySettings();
    });

    this.autoProxyAvoidDuplicate.addEventListener('change', () => {
      this.saveAutoProxySettings();
    });

    this.fetchProxiesBtn.addEventListener('click', () => {
      this.fetchAndCheckProxies();
    });

    this.stopFetchBtn.addEventListener('click', () => {
      this.stopFetching();
    });

    this.saveAllWorkingBtn.addEventListener('click', () => {
      this.saveAllWorkingProxies();
    });
  }

  switchToTab(tabName) {
    const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (tabBtn) {
      tabBtn.click();
    }
  }

  async loadProxyList() {
    try {
      this.proxyListContainer.innerHTML = '<div class="loading">Loading...</div>';
      const proxyList = await window.electronAPI.getProxyList();

      if (proxyList.length === 0) {
        this.proxyListContainer.innerHTML = `
          <div class="empty-list">
            <div>No proxies saved yet</div>
            <div style="margin-top: 12px; font-size: 12px; color: #999;">Click "Add New Proxy" to add your first proxy</div>
          </div>
        `;
        return;
      }

      this.proxyListContainer.innerHTML = proxyList.map(proxy => {
        const authInfo = proxy.username ? ` • Auth: ${proxy.username}` : '';
        const passwordInfo = proxy.hasPassword ? ' • Password: •••' : '';

        return `
          <div class="proxy-item" data-proxy-id="${proxy.id}">
            <div class="proxy-item-info">
              <div class="proxy-item-name">${proxy.name}</div>
              <div class="proxy-item-details">
                ${proxy.type.toUpperCase()} • ${proxy.host}:${proxy.port}${authInfo}${passwordInfo}
              </div>
            </div>
            <div class="proxy-item-actions">
              <button class="btn btn-secondary btn-small edit-proxy-btn" data-proxy-id="${proxy.id}">Edit</button>
              <button class="btn btn-secondary btn-small delete-proxy-btn" data-proxy-id="${proxy.id}">Delete</button>
              <button class="btn btn-primary btn-small apply-proxy-btn-list" data-proxy-id="${proxy.id}">Apply</button>
            </div>
          </div>
        `;
      }).join('');

      // Attach event listeners to action buttons
      this.proxyListContainer.querySelectorAll('.edit-proxy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.editProxy(e.target.dataset.proxyId);
        });
      });

      this.proxyListContainer.querySelectorAll('.delete-proxy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.deleteProxy(e.target.dataset.proxyId);
        });
      });

      this.proxyListContainer.querySelectorAll('.apply-proxy-btn-list').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.applyProxyToTab(e.target.dataset.proxyId);
        });
      });
    } catch (error) {
      console.error('Error loading proxy list:', error);
      this.proxyListContainer.innerHTML = '<div class="empty-list">Error loading proxy list</div>';
    }
  }

  async loadProxySelect() {
    try {
      const proxyList = await window.electronAPI.getProxyList();
      this.proxySelect.innerHTML = '<option value="">-- No Proxy --</option>';

      proxyList.forEach(proxy => {
        const option = document.createElement('option');
        option.value = proxy.id;
        option.textContent = proxy.name;
        if (proxy.id === this.currentProxyId) {
          option.selected = true;
        }
        this.proxySelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading proxy select:', error);
    }
  }

  formatProxyAddress(host, port, username, password) {
    // Format: username:password@host:port or host:port
    if (username || password) {
      const authPart = password ? `${username}:${password}` : username;
      return `${authPart}@${host}:${port}`;
    }
    return `${host}:${port}`;
  }

  async editProxy(proxyId) {
    try {
      const proxy = await window.electronAPI.getProxyById(proxyId);
      if (!proxy) {
        this.showStatus('Proxy not found', 'error');
        return;
      }

      this.editingProxyId = proxyId;
      this.proxyName.value = proxy.name || '';
      this.proxyType.value = proxy.type || 'http';

      // Format proxy address: username:password@host:port or host:port
      const address = this.formatProxyAddress(
        proxy.host || '',
        proxy.port || '',
        proxy.username || null,
        proxy.password || null
      );
      this.proxyAddress.value = address;

      this.switchToTab('new');
    } catch (error) {
      console.error('Error loading proxy for edit:', error);
      this.showStatus('Error loading proxy', 'error');
    }
  }

  async deleteProxy(proxyId) {
    if (!confirm('Are you sure you want to delete this proxy?')) {
      return;
    }

    try {
      const result = await window.electronAPI.deleteProxyFromList(proxyId);
      if (result.success) {
        this.showStatus('Proxy deleted successfully', 'success');
        this.loadProxyList();
        this.loadProxySelect();
      } else {
        this.showStatus(result.error || 'Failed to delete proxy', 'error');
      }
    } catch (error) {
      console.error('Error deleting proxy:', error);
      this.showStatus('Error deleting proxy: ' + error.message, 'error');
    }
  }

  parseProxyAddress(address) {
    // Parse format: username:password@host:port or host:port
    address = address.trim();

    let username = null;
    let password = null;
    let host = '';
    let port = null;

    // Check if there's authentication (contains @)
    if (address.includes('@')) {
      const [authPart, hostPart] = address.split('@');

      // Parse username:password
      if (authPart.includes(':')) {
        const [user, pass] = authPart.split(':');
        username = user.trim() || null;
        password = pass.trim() || null;
      } else {
        username = authPart.trim() || null;
      }

      // Parse host:port
      if (hostPart.includes(':')) {
        const [h, p] = hostPart.split(':');
        host = h.trim();
        port = parseInt(p.trim());
      } else {
        host = hostPart.trim();
      }
    } else {
      // No authentication, just host:port
      if (address.includes(':')) {
        const [h, p] = address.split(':');
        host = h.trim();
        port = parseInt(p.trim());
      } else {
        host = address.trim();
      }
    }

    return { username, password, host, port };
  }

  getSettingsFromForm() {
    const address = this.proxyAddress.value.trim();
    const parsed = this.parseProxyAddress(address);

    return {
      type: this.proxyType.value,
      host: parsed.host,
      port: parsed.port,
      username: parsed.username,
      password: parsed.password,
      name: this.proxyName.value.trim() || null
    };
  }

  async testProxy() {
    const settings = this.getSettingsFromForm();

    // Validate
    if (!settings.host || !settings.port || settings.port < 1 || settings.port > 65535) {
        console.log("settings:", settings);

      this.showStatus(
        "Please enter a valid host and port (1-65535)",
        "error",
      );
      return;
    }

    this.testBtn.disabled = true;
    this.testBtn.textContent = 'Testing...';
    this.showStatus('Testing proxy connection...', 'info');

    try {
      // Use current tab for testing, or create a test
      const tabId = this.currentTabId || 1; // Fallback if no tab
      const result = await window.electronAPI.testProxy(tabId, settings);

      if (result.success) {
        this.showStatus(result.message || 'Proxy connection successful!', 'success');
      } else {
        this.showStatus(result.error || 'Proxy test failed', 'error');
      }
    } catch (error) {
      console.error('Error testing proxy:', error);
      this.showStatus('Error testing proxy: ' + error.message, 'error');
    } finally {
      this.testBtn.disabled = false;
      this.testBtn.textContent = 'Test Proxy';
    }
  }

  async saveProxyToList() {
    const settings = this.getSettingsFromForm();

    console.log(settings)
    // Validate
    if (!settings.host || !settings.port || settings.port < 1 || settings.port > 65535) {
      this.showStatus('Please enter a valid host and port (1-65535)', 'error');
      return;
    }

    try {
      const proxyData = {
        id: this.editingProxyId || null,
        ...settings
      };

      const result = await window.electronAPI.saveProxyToList(proxyData);
      if (result.success) {
        this.showStatus(this.editingProxyId ? 'Proxy updated successfully!' : 'Proxy saved to list!', 'success');
        this.clearForm();
        this.loadProxyList();
        this.loadProxySelect();

        // Switch back to list tab after a delay
        setTimeout(() => {
          this.switchToTab('list');
        }, 1000);
      } else {
        this.showStatus(result.error || 'Failed to save proxy', 'error');
      }
    } catch (error) {
      console.error('Error saving proxy:', error);
      this.showStatus('Error saving proxy: ' + error.message, 'error');
    }
  }

  async applyProxyToTab(proxyId = null) {
    if (!this.currentTabId) {
      this.showStatus('No active tab found', 'error');
      return;
    }

    const targetProxyId = proxyId || this.proxySelect.value || null;

    try {
      const result = await window.electronAPI.applyProxyToTab(this.currentTabId, targetProxyId);
      if (result.success) {
        this.currentProxyId = targetProxyId;
        this.showStatus(targetProxyId ? 'Proxy applied successfully!' : 'Proxy removed successfully!', 'success');
        this.updateCurrentTabInfo();
        this.loadProxySelect();

        // Close window after a short delay
        setTimeout(() => {
          window.close();
        }, 1500);
      } else {
        this.showStatus(result.error || 'Failed to apply proxy', 'error');
      }
    } catch (error) {
      console.error('Error applying proxy:', error);
      this.showStatus('Error applying proxy: ' + error.message, 'error');
    }
  }

  async loadBrowserIdentity() {
    if (!this.currentTabId) {
      this.browserIdentitySelect.value = 'chrome';
      return;
    }

    try {
      const identity = await window.electronAPI.getBrowserIdentity(this.currentTabId);
      this.browserIdentitySelect.value = identity || 'chrome';
    } catch (error) {
      console.error('Error loading browser identity:', error);
      this.browserIdentitySelect.value = 'chrome';
    }
  }

  async updateBrowserTabInfo() {
    if (!this.currentTabId) {
      this.browserTabInfo.textContent = 'No active tab';
      this.currentUserAgent.textContent = 'N/A';
      return;
    }

    try {
      this.browserTabInfo.textContent = `Tab ${this.currentTabId}`;
      const userAgent = await window.electronAPI.getUserAgent(this.currentTabId);
      this.currentUserAgent.textContent = userAgent || 'N/A';
    } catch (error) {
      console.error('Error updating browser tab info:', error);
      this.browserTabInfo.textContent = `Tab ${this.currentTabId}: Error loading info`;
      this.currentUserAgent.textContent = 'Error loading User-Agent';
    }
  }

  async applyBrowserIdentity() {
    if (!this.currentTabId) {
      this.showStatus('No active tab found', 'error');
      return;
    }

    const identity = this.browserIdentitySelect.value || 'chrome';

    try {
      const result = await window.electronAPI.setBrowserIdentity(this.currentTabId, identity);
      if (result.success) {
        this.showStatus('Browser identity applied successfully!', 'success');
        this.updateBrowserTabInfo();

        // Close window after a short delay
        setTimeout(() => {
          window.close();
        }, 1500);
      } else {
        this.showStatus(result.error || 'Failed to apply browser identity', 'error');
      }
    } catch (error) {
      console.error('Error applying browser identity:', error);
      this.showStatus('Error applying browser identity: ' + error.message, 'error');
    }
  }

  clearForm() {
    this.editingProxyId = null;
    this.proxyName.value = '';
    this.proxyType.value = 'http';
    this.proxyAddress.value = '';
  }

  showStatus(message, type) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.classList.remove('hidden');

    // Auto-hide after 5 seconds for errors and info
    if (type === 'error' || type === 'info') {
      setTimeout(() => {
        this.statusMessage.classList.add('hidden');
      }, 5000);
    }
  }

  async loadAutoProxySettings() {
    try {
      const settings = await window.electronAPI.getAutoProxySettings();
      this.autoProxyEnabled.checked = settings.enabled || false;
      this.autoProxySettings.style.display = this.autoProxyEnabled.checked ? 'block' : 'none';
      this.autoProxySource.value = settings.source || 'saved';
      this.autoProxySelect.value = settings.selectedProxyId || '';
      this.autoProxyAvoidDuplicate.checked = settings.avoidDuplicate !== false;
      this.autoProxyApiUrl.value = settings.apiUrl || this.autoProxyApiUrl.value;

      if (settings.source === 'saved') {
        this.autoProxySavedContainer.style.display = 'block';
        this.autoProxyApiContainer.style.display = 'none';
        await this.loadProxySelectForAuto();
      } else {
        this.autoProxySavedContainer.style.display = 'none';
        this.autoProxyApiContainer.style.display = 'block';
      }
    } catch (error) {
      console.error('Error loading auto proxy settings:', error);
    }
  }

  async loadProxySelectForAuto() {
    try {
      const proxyList = await window.electronAPI.getProxyList();
      this.autoProxySelect.innerHTML = '<option value="">-- Random from List --</option>';
      proxyList.forEach(proxy => {
        const option = document.createElement('option');
        option.value = proxy.id;
        option.textContent = proxy.name;
        this.autoProxySelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading proxy select for auto:', error);
    }
  }

  async saveAutoProxySettings() {
    try {
      const settings = {
        enabled: this.autoProxyEnabled.checked,
        source: this.autoProxySource.value,
        selectedProxyId: this.autoProxySelect.value || null,
        avoidDuplicate: this.autoProxyAvoidDuplicate.checked,
        apiUrl: this.autoProxyApiUrl.value
      };
      await window.electronAPI.setAutoProxySettings(settings);
    } catch (error) {
      console.error('Error saving auto proxy settings:', error);
      this.showStatus('Error saving auto proxy settings', 'error');
    }
  }

  async fetchAndCheckProxies() {
    if (this.isFetching) return;

    const apiUrl = this.autoProxyApiUrl.value.trim();
    if (!apiUrl) {
      this.showStatus('Please enter API URL', 'error');
      return;
    }

    this.isFetching = true;
    this.fetchProxiesBtn.style.display = 'none';
    this.stopFetchBtn.style.display = 'inline-block';
    this.fetchProgress.style.display = 'block';
    this.autoProxyApiList.style.display = 'none';
    this.workingProxies = [];

    // Generate unique request ID
    const requestId = `fetch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.currentFetchRequestId = requestId;

    this.fetchStatus.textContent = 'Fetching proxies from API...';
    this.fetchTotal.textContent = '0';
    this.fetchChecked.textContent = '0';
    this.fetchWorking.textContent = '0';
    this.fetchFailed.textContent = '0';

    try {
      // Listen for progress updates
      const progressHandler = (event, data) => {
        if (data.requestId === requestId) {
          this.fetchChecked.textContent = data.checked || 0;
          this.fetchWorking.textContent = data.working || 0;
          this.fetchFailed.textContent = data.failed || 0;
          this.fetchTotal.textContent = data.total || 0;
        }
      };

      // Listen for working proxy found (real-time)
      const proxyFoundHandler = (event, data) => {
        if (data.requestId === requestId && data.proxy) {
          // Add proxy to working list immediately
          this.workingProxies.push(data.proxy);

          // Update stats
          this.fetchChecked.textContent = data.checked || 0;
          this.fetchWorking.textContent = data.working || 0;
          this.fetchFailed.textContent = data.failed || 0;
          this.fetchTotal.textContent = data.total || 0;

          // Render immediately
          this.renderWorkingProxies();
          this.autoProxyApiList.style.display = 'block';

          // Update status
          this.fetchStatus.textContent = `Found ${data.working} working proxy/proxies... (checking...)`;

          console.log('Working proxy found and displayed:', data.proxy);
        }
      };

      // Remove old listeners if exists
      if (window.electronAPI.removeAllListeners) {
        window.electronAPI.removeAllListeners('proxy-fetch-progress');
        window.electronAPI.removeAllListeners('proxy-found');
      }

      // Add progress listener (if available via preload)
      if (window.electronAPI.onProxyFetchProgress) {
        window.electronAPI.onProxyFetchProgress(progressHandler);
      }

      // Add proxy found listener
      if (window.electronAPI.onProxyFound) {
        window.electronAPI.onProxyFound(proxyFoundHandler);
      }

      const result = await window.electronAPI.fetchAndCheckProxies(apiUrl, requestId);

      if (!this.isFetching) {
        // User stopped
        this.fetchStatus.textContent = 'Stopped by user';
        return;
      }

      if (result.success) {
        // Merge with already found proxies (from real-time updates)
        const newProxies = result.workingProxies || [];
        // Avoid duplicates
        const existingProxyUrls = new Set(this.workingProxies.map(p => p.proxy));
        newProxies.forEach(proxy => {
          if (!existingProxyUrls.has(proxy.proxy)) {
            this.workingProxies.push(proxy);
          }
        });

        const stats = result.stats || {};
        this.fetchTotal.textContent = stats.total || 0;
        this.fetchChecked.textContent = stats.checked || 0;
        this.fetchWorking.textContent = this.workingProxies.length;
        this.fetchFailed.textContent = stats.failed || 0;
        this.fetchStatus.textContent = `Completed: ${this.workingProxies.length} working proxies found`;
        this.renderWorkingProxies();
        this.autoProxyApiList.style.display = 'block';
        this.showStatus(`Found ${this.workingProxies.length} working proxies`, 'success');
      } else {
        this.fetchStatus.textContent = `Error: ${result.error || 'Failed to fetch proxies'}`;
        this.showStatus(result.error || 'Failed to fetch proxies', 'error');
      }
    } catch (error) {
      console.error('Error fetching proxies:', error);
      this.fetchStatus.textContent = `Error: ${error.message}`;
      this.showStatus('Error fetching proxies: ' + error.message, 'error');
    } finally {
      this.isFetching = false;
      this.currentFetchRequestId = null;
      this.fetchProxiesBtn.style.display = 'inline-block';
      this.stopFetchBtn.style.display = 'none';

      // Cleanup progress listeners
      if (window.electronAPI.removeAllListeners) {
        window.electronAPI.removeAllListeners('proxy-fetch-progress');
        window.electronAPI.removeAllListeners('proxy-found');
      }
    }
  }

  async stopFetching() {
    if (this.currentFetchRequestId) {
      try {
        await window.electronAPI.stopFetchProxies(this.currentFetchRequestId);
      } catch (error) {
        console.error('Error stopping fetch:', error);
      }
    }
    this.isFetching = false;
    this.currentFetchRequestId = null;
    this.fetchStatus.textContent = 'Stopping...';
  }

  renderWorkingProxies() {
    if (this.workingProxies.length === 0) {
      this.autoProxyApiListContent.innerHTML = '<div class="empty-list">No working proxies found</div>';
      return;
    }

    this.autoProxyApiListContent.innerHTML = this.workingProxies.map((proxy, index) => {
      const country = proxy.country || 'Unknown';
      return `
        <div class="proxy-item" data-proxy-index="${index}">
          <div class="proxy-item-info">
            <div class="proxy-item-name">${proxy.proxy}</div>
            <div class="proxy-item-details">
              ${proxy.type || 'http'} • ${country} • IP: ${proxy.ip || 'N/A'}
            </div>
          </div>
          <div class="proxy-item-actions">
            <button class="btn btn-primary btn-small save-single-proxy-btn" data-proxy-index="${index}">Save</button>
          </div>
        </div>
      `;
    }).join('');

    // Attach save handlers
    this.autoProxyApiListContent.querySelectorAll('.save-single-proxy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.proxyIndex);
        this.saveSingleProxy(index);
      });
    });
  }

  async saveSingleProxy(index) {
    const proxy = this.workingProxies[index];
    if (!proxy) return;

    try {
      // Parse proxy string (format: http://host:port)
      const url = new URL(proxy.proxy);
      const type = url.protocol.replace(':', '');
      const host = url.hostname;
      const port = parseInt(url.port);

      const proxyData = {
        type: type,
        host: host,
        port: port,
        name: `${host}:${port} (${proxy.country || 'API'})`
      };

      const result = await window.electronAPI.saveProxyToList(proxyData);
      if (result.success) {
        this.showStatus('Proxy saved successfully', 'success');
        await this.loadProxyList();
        await this.loadProxySelectForAuto();
      } else {
        this.showStatus(result.error || 'Failed to save proxy', 'error');
      }
    } catch (error) {
      console.error('Error saving proxy:', error);
      this.showStatus('Error saving proxy: ' + error.message, 'error');
    }
  }

  async saveAllWorkingProxies() {
    if (this.workingProxies.length === 0) {
      this.showStatus('No proxies to save', 'error');
      return;
    }

    try {
      let saved = 0;
      let failed = 0;

      for (const proxy of this.workingProxies) {
        try {
          const url = new URL(proxy.proxy);
          const type = url.protocol.replace(':', '');
          const host = url.hostname;
          const port = parseInt(url.port);

          const proxyData = {
            type: type,
            host: host,
            port: port,
            name: `${host}:${port} (${proxy.country || 'API'})`
          };

          const result = await window.electronAPI.saveProxyToList(proxyData);
          if (result.success) {
            saved++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
        }
      }

      this.showStatus(`Saved ${saved} proxies${failed > 0 ? `, ${failed} failed` : ''}`, saved > 0 ? 'success' : 'error');
      await this.loadProxyList();
      await this.loadProxySelectForAuto();
    } catch (error) {
      console.error('Error saving all proxies:', error);
      this.showStatus('Error saving proxies: ' + error.message, 'error');
    }
  }
  
  // Export proxy list to JSON file
  async exportProxies() {
    try {
      const result = await window.electronAPI.exportProxyList();
      if (result.success) {
        const data = JSON.stringify(result.data, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proxy-list-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showStatus(`Exported ${result.data.length} proxies successfully!`, 'success');
      } else {
        this.showStatus('Failed to export proxies: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Export error:', error);
      this.showStatus('Export error: ' + error.message, 'error');
    }
  }
  
  // Import proxy list from JSON file
  async handleImportFile(file) {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target.result;
          const proxies = JSON.parse(content);
          
          if (!Array.isArray(proxies)) {
            this.showStatus('Invalid file format: Expected an array of proxies', 'error');
            return;
          }
          
          // Ask user if they want to replace or merge
          const replace = confirm(
            `Import ${proxies.length} proxies?\n\n` +
            `Click OK to MERGE with existing proxies\n` +
            `Click Cancel to abort`
          );
          
          if (replace === null) return; // User cancelled
          
          const result = await window.electronAPI.importProxyList(proxies, false);
          
          if (result.success) {
            this.showStatus(
              `Successfully imported ${result.imported} proxies! ` +
              `(${result.skipped} skipped, Total: ${result.total})`,
              'success'
            );
            this.loadProxyList();
            this.loadProxySelect();
          } else {
            this.showStatus('Failed to import proxies: ' + result.error, 'error');
          }
        } catch (error) {
          console.error('Parse error:', error);
          this.showStatus('Invalid JSON file: ' + error.message, 'error');
        } finally {
          // Reset file input
          this.importFileInput.value = '';
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Import error:', error);
      this.showStatus('Import error: ' + error.message, 'error');
    }
  }
  
  // Clear all proxies
  async clearAllProxies() {
    const proxyList = await window.electronAPI.getProxyList();
    if (proxyList.length === 0) {
      this.showStatus('Proxy list is already empty', 'info');
      return;
    }
    
    const confirmed = confirm(
      `Are you sure you want to delete all ${proxyList.length} proxies?\n\n` +
      `This action cannot be undone!`
    );
    
    if (!confirmed) return;
    
    try {
      const result = await window.electronAPI.clearProxyList();
      if (result.success) {
        this.showStatus('All proxies cleared successfully!', 'success');
        this.loadProxyList();
        this.loadProxySelect();
      } else {
        this.showStatus('Failed to clear proxies: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Clear error:', error);
      this.showStatus('Clear error: ' + error.message, 'error');
    }
  }
}

// Initialize settings when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new SettingsController();
});
