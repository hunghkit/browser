# Electron Browser with Proxy Support

A simple, lightweight web browser built with Electron that includes full proxy support for HTTP, HTTPS, SOCKS4, and SOCKS5 protocols.

## Features

- 🚀 Simple and clean browser interface
- 🔒 Full proxy support (HTTP, HTTPS, SOCKS4, SOCKS5)
- 🔐 Proxy authentication support (username/password)
- ⚡ Fast and lightweight
- 🛠️ Developer tools integration
- 📱 Responsive UI

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the application:**
   ```bash
   npm start
   ```

## Usage

### Basic Navigation

- Enter a URL in the address bar and press Enter
- Use the Back, Forward, and Reload buttons for navigation
- Click the Settings button (gear icon) to configure proxy settings
- Click the Developer Tools button to open DevTools

### Proxy Configuration

1. Click the **Settings** button (gear icon) in the toolbar, or use the menu: **File → Settings** (or press `Cmd/Ctrl + ,`)
2. Fill in the proxy settings:
   - **Proxy Type**: Select HTTP, HTTPS, SOCKS4, or SOCKS5
   - **Host**: Enter the proxy server address
   - **Port**: Enter the proxy server port (1-65535)
   - **Username** (optional): Enter proxy username if required
   - **Password** (optional): Enter proxy password if required
3. Click **Save & Apply** to save and apply the proxy settings
4. The browser will automatically reload to apply the new proxy configuration

### Clearing Proxy Settings

Click the **Clear Proxy** button in the settings window to remove all proxy settings and use direct connections.

### Keyboard Shortcuts

- `Cmd/Ctrl + ,` - Open Settings
- `Cmd/Ctrl + R` - Reload page
- `F12` - Toggle Developer Tools
- `Cmd/Ctrl + Q` (Mac) or `Ctrl + Q` (Windows/Linux) - Quit application

## Proxy Format Examples

The application supports the following proxy formats:

- **HTTP**: `http=proxy.com:8080`
- **HTTP with auth**: `http=http://user:pass@proxy.com:8080`
- **HTTPS**: `https=proxy.com:8080`
- **SOCKS5**: `socks5://proxy.com:1080`
- **SOCKS5 with auth**: `socks5://user:pass@proxy.com:1080`
- **SOCKS4**: `socks4://proxy.com:1080`

## Project Structure

```
browser/
├── main.js           # Electron main process
├── preload.js        # Preload script for secure IPC
├── renderer.js       # Renderer process logic
├── index.html        # Main browser UI
├── settings.html     # Proxy settings UI
├── settings.js       # Settings controller
├── styles.css        # Main stylesheet
├── settings.css      # Settings stylesheet
├── package.json      # Project configuration
└── README.md         # This file
```

## Technical Details

- **Electron Version**: Latest stable (28.0.0+)
- **Architecture**: Uses BrowserView for web content display
- **Security**: Context isolation enabled, node integration disabled
- **Proxy Storage**: Settings are saved in the user data directory

## Troubleshooting

### Proxy Not Working

1. Verify your proxy settings are correct
2. Check that the proxy server is accessible
3. Ensure the port number is correct (1-65535)
4. For authenticated proxies, verify username and password
5. Try reloading the page after applying proxy settings

### Connection Errors

- Check your internet connection
- Verify the proxy server is running
- Ensure firewall settings allow connections
- Check proxy server logs for issues

## Development

To modify the application:

1. Edit the relevant files
2. Restart the application to see changes
3. Use Developer Tools (F12) to debug renderer process
4. Check the console for main process logs

## License

MIT

