# 🔄 Auto Refresh Proxy Rotation & IP Display

## ✨ New Features

### 1. Proxy Rotation on Auto-Refresh 🔄
Automatically rotate through your proxy list on each refresh cycle.

### 2. Current IP Display in Toolbar 🌐
Check and display your current IP address and country directly in the browser toolbar.

### 3. IP Information in Window Title 📋
See current IP, country, and proxy information in the window title bar.

---

## 🚀 Features Overview

### 🔄 Proxy Rotation

**What it does:**
- Automatically switches to the next proxy in your list on each auto-refresh
- Cycles through enabled proxies in sequential order
- Works seamlessly with auto-refresh intervals

**How to use:**
1. Open **Auto Refresh Settings** (⟳ button in toolbar)
2. Enable **Auto Refresh**
3. Check **🔄 Rotate Proxy on Each Refresh**
4. Set your refresh interval
5. Click **Save**

**Requirements:**
- At least 2 enabled proxies in your proxy list
- Auto-refresh must be enabled

**How it works:**
```
Refresh 1 → Proxy 1 → Load page
Refresh 2 → Proxy 2 → Load page
Refresh 3 → Proxy 3 → Load page
Refresh 4 → Proxy 1 → Load page (cycles back)
```

---

### 🌐 Current IP Display

**What it does:**
- Checks your current IP address via proxy
- Displays IP and country in the toolbar
- Shows IP information in window title
- Updates automatically when checking

**How to use:**

#### Manual Check:
1. Click the **🌐 globe icon** in the toolbar
2. Wait for IP check to complete
3. IP and country appear next to the icon

#### Display States:
- **🔄** - Checking IP (loading)
- **123.45.67.89 (US)** - Success (green text)
- **❌** - Failed (red text)

**Where IP is shown:**
1. **Toolbar**: Next to globe icon
2. **Window Title**: Full format `Page Title | IP: 123.45.67.89 (US) | Proxy: proxy.com:8080`

---

## 📖 Usage Guide

### Scenario 1: Rotate Proxies While Auto-Refreshing

**Use Case:** Test a website with different IPs automatically

**Steps:**
1. Add multiple proxies to your proxy list
2. Enable proxies you want to rotate through
3. Open Auto Refresh Settings
4. Configure:
   ```
   ✅ Enable Auto Refresh
   ⏱️ Interval: 60 seconds
   🔄 Rotate Proxy on Each Refresh
   ```
5. Save and start

**Result:**
```
Time 0:00  → Load page with Proxy 1
Time 1:00  → Switch to Proxy 2 → Refresh
Time 2:00  → Switch to Proxy 3 → Refresh
Time 3:00  → Switch to Proxy 1 → Refresh
...continues
```

### Scenario 2: Check Current IP

**Use Case:** Verify which IP you're currently using

**Steps:**
1. Click **🌐 Check IP** button in toolbar
2. Wait 1-2 seconds
3. View IP in toolbar: `123.45.67.89 (US)`
4. View full info in window title

**Console Output:**
```
🌐 Checking current IP...
✅ Current IP: 123.45.67.89 (US)
```

### Scenario 3: Monitor IP While Rotating

**Use Case:** Track IP changes during proxy rotation

**Steps:**
1. Enable proxy rotation
2. Click **Check IP** after each refresh
3. Observe IP changing in toolbar and title

**Example:**
```
Check 1: 192.168.1.1 (VN) - Proxy A
Check 2: 203.45.67.89 (SG) - Proxy B  
Check 3: 104.25.12.34 (US) - Proxy C
```

---

## 🔧 Technical Details

### Proxy Rotation Logic

```javascript
// On each refresh:
1. Check if rotateProxy is enabled
2. Get list of enabled proxies
3. Calculate next proxy index: (current + 1) % total
4. Apply next proxy to tab
5. Continue with refresh

// Example with 3 proxies:
Index 0 → Proxy 1
Index 1 → Proxy 2
Index 2 → Proxy 3
Index 0 → Proxy 1 (cycles back)
```

### IP Checking Process

```javascript
// When checking IP:
1. Create network request to https://api.myip.com
2. Use current tab's session (includes proxy)
3. Parse JSON response
4. Extract IP and country
5. Update UI and window title
6. Cache result for tab
```

### Window Title Format

```
[Page Title] | IP: [IP Address] ([Country]) | Proxy: [host]:[port]

Examples:
- Google | IP: 104.25.12.34 (US) | Proxy: proxy.com:8080
- Facebook | IP: 192.168.1.1 (VN)
- YouTube
```

**Title updates when:**
- Page title changes
- IP is checked
- Proxy is changed
- Tab is switched

---

## ⚙️ Settings Reference

### Auto Refresh Settings Modal

```
┌─────────────────────────────────────┐
│  Auto Refresh Settings              │
├─────────────────────────────────────┤
│                                     │
│  ☑ Enable Auto Refresh              │
│                                     │
│  Refresh Interval: [60] seconds     │
│                                     │
│  ☑ Reset Session (Incognito Mode)   │
│                                     │
│  ☑ 🔄 Rotate Proxy on Each Refresh   │  ← NEW!
│                                     │
│  ☐ Enable Playlist Mode             │
│                                     │
│  [Cancel]  [Save]                   │
└─────────────────────────────────────┘
```

### Toolbar Layout

```
[←] [→] [⟳] [URL Bar] [⚙️] [⟳] [🗑️] [🌐] [🔧]
                               ↑
                        Check IP button
                     (with IP display)
```

---

## 💡 Tips & Best Practices

### Tip 1: Optimal Rotation Interval
```
Too fast (< 10s):  May trigger rate limits
Sweet spot (30-60s): Balanced testing
Too slow (> 300s): Inefficient rotation
```

**Recommendation:** 30-60 seconds for proxy rotation

### Tip 2: Monitor IP Changes

After enabling rotation:
1. Click **Check IP** immediately
2. Wait for one refresh cycle
3. Click **Check IP** again
4. Verify IP changed

### Tip 3: Use with Playlist Mode

Combine both features:
```
✅ Enable Auto Refresh
✅ Rotate Proxy on Each Refresh
✅ Enable Playlist Mode
   URLs: [url1, url2, url3]
   Mode: Sequential

Result:
- Refresh 1: URL1 with Proxy1
- Refresh 2: URL2 with Proxy2
- Refresh 3: URL3 with Proxy3
- Refresh 4: URL1 with Proxy1 (both cycle)
```

### Tip 4: Debug Proxy Rotation

Open DevTools (F12) to see rotation logs:
```
🔄 Rotating proxy...
📡 Switching to proxy 2/5: proxy2.com:8080
✅ Proxy applied successfully
```

### Tip 5: IP Check Frequency

**Don't check too often:**
- API has rate limits
- Each check creates network request
- Check only when needed

**Good practice:**
- Check once after proxy change
- Check if connection seems wrong
- Check when debugging

---

## 🎯 Common Use Cases

### Use Case 1: Web Scraping with IP Rotation
```
Setup:
- 10 proxies in list
- Auto-refresh every 30 seconds
- Rotate proxy enabled
- Target: scraping website

Benefits:
- Different IP on each request
- Avoid IP-based rate limiting
- Automatic rotation, no manual work
```

### Use Case 2: Testing Geo-Restrictions
```
Setup:
- Proxies from different countries (US, UK, JP, etc.)
- Auto-refresh every 60 seconds
- Rotate proxy enabled
- Target: geo-restricted content

Benefits:
- Test access from multiple locations
- See content variations by country
- Automated testing process
```

### Use Case 3: Load Testing with Multiple IPs
```
Setup:
- 20+ proxies
- Auto-refresh every 10 seconds
- Rotate proxy enabled
- Target: your website

Benefits:
- Simulate traffic from different IPs
- Test rate limiting
- Verify geo-targeting
```

### Use Case 4: Privacy-Focused Browsing
```
Setup:
- 5 privacy-focused proxies
- Auto-refresh every 120 seconds
- Rotate proxy enabled
- Reset session enabled

Benefits:
- Change IP regularly
- Clear cookies/cache
- Enhanced privacy
```

---

## 🐛 Troubleshooting

### Issue: Proxy Not Rotating

**Symptoms:**
- Same IP on each refresh
- No rotation logs in console

**Solutions:**
1. **Check proxy list:**
   ```
   Settings → Proxy List → Verify you have 2+ enabled proxies
   ```

2. **Check rotation setting:**
   ```
   Auto Refresh Settings → Verify ✅ Rotate Proxy is checked
   ```

3. **Check console logs:**
   ```
   Open DevTools (F12)
   Look for: "🔄 Rotating proxy..."
   ```

4. **Verify auto-refresh is enabled:**
   ```
   Auto Refresh Settings → Verify ✅ Enable Auto Refresh
   ```

### Issue: IP Check Fails

**Symptoms:**
- ❌ shows in toolbar
- "Failed to check IP" error

**Solutions:**
1. **Check internet connection**
2. **Verify proxy is working:**
   ```
   Settings → Test Proxy button
   ```
3. **Try different IP check service** (if API is down)
4. **Check console for detailed error:**
   ```
   DevTools (F12) → Console → Look for errors
   ```

### Issue: IP Display Not Updating

**Symptoms:**
- Old IP still showing
- IP not changing after proxy rotation

**Solutions:**
1. **Manually check IP:**
   ```
   Click 🌐 button after rotation
   ```

2. **Refresh the page:**
   ```
   Page needs to load through new proxy
   ```

3. **Wait for auto-refresh cycle:**
   ```
   IP changes only after page loads with new proxy
   ```

### Issue: Window Title Not Showing IP

**Symptoms:**
- Title shows page name but no IP
- IP info missing from title

**Solutions:**
1. **Check IP first:**
   ```
   Click 🌐 Check IP button
   ```

2. **Verify you're on active tab:**
   ```
   Title only updates for active tab
   ```

3. **Check browser window focus:**
   ```
   Ensure window is focused
   ```

---

## 📊 Performance Considerations

### Network Impact
```
IP Check:
- Request size: ~1 KB
- Response size: ~500 bytes
- Time: 100-500ms (depending on proxy)

Proxy Switch:
- Time: 50-200ms
- No additional data transfer
```

### Resource Usage
```
Proxy Rotation:
- CPU: Minimal (<1%)
- Memory: ~5 KB per proxy
- Network: Only during page load

IP Check:
- CPU: Minimal
- Memory: ~1 KB
- Network: ~1.5 KB per check
```

### Recommendations
```
✅ Do:
- Rotate proxies with 30+ second intervals
- Check IP only when needed
- Use 10-50 proxies for rotation

❌ Don't:
- Rotate faster than 10 seconds
- Check IP on every refresh
- Use 100+ proxies (memory)
```

---

## 🔐 Privacy & Security

### IP Visibility
```
⚠️ Your IP is checked via external API (api.myip.com)

What's sent:
- HTTPS request to api.myip.com
- No personal data
- No tracking cookies

What's received:
- Your IP address
- Country code
- That's it!
```

### Proxy Rotation Security
```
✅ Secure:
- Proxy credentials encrypted in storage
- Rotation happens locally
- No external logging

⚠️ Consider:
- Proxy provider may log your usage
- Websites may detect proxy rotation
- Use trusted proxy providers
```

### Best Practices
```
1. Use HTTPS proxies for sensitive data
2. Don't rotate too aggressively (may trigger detection)
3. Test proxies before using in production
4. Use proxy providers with no-log policy
5. Enable "Reset Session" for maximum privacy
```

---

## 📝 API Reference

### IPC Handlers (Backend)

#### `get-current-ip`
```javascript
// Request
ipcRenderer.invoke('get-current-ip', tabId)

// Response
{
  success: true,
  ip: "123.45.67.89",
  country: "US"
}
```

#### `set-auto-refresh-settings`
```javascript
// Request
ipcRenderer.invoke('set-auto-refresh-settings', 
  tabId,
  enabled,
  intervalSeconds,
  resetSession,
  playlistEnabled,
  playlistMode,
  playlistUrls,
  rotateProxy  // ← NEW parameter
)

// Response
{
  success: true
}
```

### Exposed APIs (Frontend)

```javascript
// Check current IP
window.electronAPI.getCurrentIP(tabId)

// Set auto-refresh with rotation
window.electronAPI.setAutoRefreshSettings(
  tabId,
  true,                // enabled
  60,                  // interval
  false,               // resetSession
  false,               // playlistEnabled
  'sequential',        // playlistMode
  [],                  // playlistUrls
  true                 // rotateProxy ← NEW!
)
```

---

## ✅ Summary

### What's New

✅ **Proxy Rotation**
- Automatic proxy switching on refresh
- Sequential cycling through proxy list
- Only rotates enabled proxies
- Detailed console logging

✅ **IP Display**
- Check current IP with one click
- Display in toolbar and window title
- Country code included
- Color-coded status (green/red)

✅ **Enhanced Title Bar**
- Shows current IP
- Shows country
- Shows active proxy
- Auto-updates on changes

### Key Benefits

🚀 **Automation**: No manual proxy switching
🔄 **Efficiency**: Seamless rotation
🌐 **Visibility**: Always know your current IP
🎯 **Flexibility**: Works with all auto-refresh features
📊 **Monitoring**: Real-time IP verification

---

## 🎓 Examples

### Example 1: Basic Rotation
```javascript
// Setup
Proxies: [A, B, C]
Interval: 60 seconds
Rotation: Enabled

// Timeline
0:00 - Load with Proxy A
1:00 - Switch to B → Refresh
2:00 - Switch to C → Refresh
3:00 - Switch to A → Refresh (cycle)
```

### Example 2: With Playlist
```javascript
// Setup
Proxies: [P1, P2]
URLs: [URL1, URL2]
Interval: 30 seconds
Rotation: Enabled
Playlist: Sequential

// Timeline
0:00 - Load URL1 with P1
0:30 - Load URL2 with P2
1:00 - Load URL1 with P1 (both cycle)
1:30 - Load URL2 with P2
```

### Example 3: IP Monitoring
```javascript
// Check IP periodically
1. Enable rotation (60s interval)
2. After each cycle, click Check IP
3. Observe: IP1 → IP2 → IP3 → IP1

// Console output
✅ Current IP: 192.168.1.1 (VN)
✅ Current IP: 203.45.67.89 (SG)
✅ Current IP: 104.25.12.34 (US)
✅ Current IP: 192.168.1.1 (VN)
```

---

**Enjoy automated proxy rotation and IP monitoring!** 🎉

For questions or issues, check the console (F12) for detailed logs.
