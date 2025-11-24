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
      this.showStatus('Please enter a valid host and port (1-65535)', 'error');
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
}

// Initialize settings when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new SettingsController();
});
