// File Explorer Controller
class FileExplorer {
  constructor() {
    this.currentPath = '';
    this.isVisible = false;
    this.initializeElements();
    this.attachEventListeners();
    this.loadHomeDirectory();
  }

  initializeElements() {
    this.explorer = document.getElementById('file-explorer');
    this.explorerContent = document.getElementById('explorer-content');
    this.explorerPathInput = document.getElementById('explorer-path-input');
    this.explorerToggleBtn = document.getElementById('explorer-toggle-btn');
    this.explorerCloseBtn = document.getElementById('explorer-close-btn');
    this.explorerHomeBtn = document.getElementById('explorer-home-btn');
    this.explorerUpBtn = document.getElementById('explorer-up-btn');
    this.explorerRefreshBtn = document.getElementById('explorer-refresh-btn');
  }

  attachEventListeners() {
    // Toggle button
    this.explorerToggleBtn.addEventListener('click', () => {
      this.toggle();
    });

    // Close button
    this.explorerCloseBtn.addEventListener('click', () => {
      this.hide();
    });

    // Navigation buttons
    this.explorerHomeBtn.addEventListener('click', () => {
      this.loadHomeDirectory();
    });

    this.explorerUpBtn.addEventListener('click', () => {
      this.navigateUp();
    });

    this.explorerRefreshBtn.addEventListener('click', () => {
      this.refresh();
    });

    // Path input
    this.explorerPathInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.navigateToPath(this.explorerPathInput.value);
      }
    });
  }

  async loadHomeDirectory() {
    try {
      const homePath = await window.electronAPI.getHomeDirectory();
      this.navigateToPath(homePath);
    } catch (error) {
      console.error('Error loading home directory:', error);
      this.showError('Failed to load home directory');
    }
  }

  async navigateToPath(path) {
    try {
      // Normalize path: replace ~ with home directory
      let normalizedPath = path;
      if (path.startsWith('~')) {
        const homeDir = await window.electronAPI.getHomeDirectory();
        normalizedPath = path.replace('~', homeDir);
      }

      // Resolve to absolute path
      normalizedPath = await window.electronAPI.resolvePath(normalizedPath);

      const contents = await window.electronAPI.readDirectory(normalizedPath);

      this.currentPath = normalizedPath;
      this.explorerPathInput.value = normalizedPath;
      this.renderContents(contents, normalizedPath);
    } catch (error) {
      console.error('Error reading directory:', error);
      this.showError(`Failed to read directory: ${error.message}`);
    }
  }

  async navigateUp() {
    if (!this.currentPath) return;

    const parentPath = await window.electronAPI.getParentDirectory(this.currentPath);
    if (parentPath) {
      this.navigateToPath(parentPath);
    }
  }

  async refresh() {
    if (this.currentPath) {
      this.navigateToPath(this.currentPath);
    } else {
      this.loadHomeDirectory();
    }
  }

  renderContents(contents, currentPath) {
    this.explorerContent.innerHTML = '';

    if (!contents || contents.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'explorer-empty';
      emptyMsg.textContent = 'Directory is empty';
      this.explorerContent.appendChild(emptyMsg);
      return;
    }

    // Sort: directories first, then files
    const sorted = contents.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    sorted.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.className = `explorer-item ${item.isDirectory ? 'directory' : 'file'}`;

      const icon = document.createElement('span');
      icon.className = 'explorer-icon';
      icon.textContent = item.isDirectory ? '📁' : this.getFileIcon(item.name);

      const name = document.createElement('span');
      name.className = 'explorer-name';
      name.textContent = item.name;

      itemElement.appendChild(icon);
      itemElement.appendChild(name);

      if (item.isDirectory) {
        itemElement.addEventListener('dblclick', () => {
          this.navigateToPath(item.path);
        });
        itemElement.title = `Double-click to open: ${item.path}`;
      } else {
        itemElement.addEventListener('dblclick', () => {
          this.openFile(item.path);
        });
        itemElement.title = `Double-click to open: ${item.path}`;
      }

      this.explorerContent.appendChild(itemElement);
    });
  }

  getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const iconMap = {
      'html': '🌐',
      'htm': '🌐',
      'css': '🎨',
      'js': '📜',
      'json': '📋',
      'md': '📝',
      'txt': '📄',
      'png': '🖼️',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'gif': '🖼️',
      'svg': '🖼️',
      'pdf': '📕',
      'zip': '📦',
      'tar': '📦',
      'gz': '📦'
    };
    return iconMap[ext] || '📄';
  }

  async openFile(filePath) {
    try {
      // Normalize file path for file:// URL
      // Electron handles file:// URLs, but we need proper formatting
      let fileUrl;
      const normalizedPath = filePath.replace(/\\/g, '/');

      if (normalizedPath.match(/^[A-Za-z]:/)) {
        // Windows drive letter: file:///C:/path/to/file
        fileUrl = `file:///${normalizedPath}`;
      } else {
        // Unix-like: file:///path/to/file
        fileUrl = `file://${normalizedPath}`;
      }

      await window.electronAPI.navigateToUrl(fileUrl);
    } catch (error) {
      console.error('Error opening file:', error);
      this.showError(`Failed to open file: ${error.message}`);
    }
  }

  showError(message) {
    this.explorerContent.innerHTML = `<div class="explorer-error">${message}</div>`;
  }

  show() {
    this.explorer.classList.remove('hidden');
    this.isVisible = true;
    this.explorerToggleBtn.classList.add('active');
  }

  hide() {
    this.explorer.classList.add('hidden');
    this.isVisible = false;
    this.explorerToggleBtn.classList.remove('active');
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
}

// Initialize file explorer when DOM is ready
let fileExplorer;
document.addEventListener('DOMContentLoaded', () => {
  fileExplorer = new FileExplorer();
});

