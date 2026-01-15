# Proxy Import/Export Guide

Complete guide for importing and exporting proxies in multiple formats.

## 📋 Table of Contents

1. [Supported Formats](#supported-formats)
2. [Export Features](#export-features)
3. [Import Features](#import-features)
4. [Format Examples](#format-examples)
5. [Advanced Usage](#advanced-usage)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Supported Formats

### 1. JSON Format (Recommended)
- **Extension**: `.json`
- **Features**: Complete data with all settings
- **Best for**: Backup, sharing configurations with all metadata

### 2. TXT Format (Simple)
- **Extension**: `.txt`
- **Features**: Simple text format, one proxy per line
- **Best for**: Quick import, sharing with other tools

### 3. CSV Format (Spreadsheet)
- **Extension**: `.csv`
- **Features**: Comma-separated values, Excel compatible
- **Best for**: Editing in spreadsheets, data analysis

---

## 📤 Export Features

### How to Export

1. **Open Settings** → Navigate to "Proxy List" tab
2. **Click Export Button** (📤)
3. **Choose Format**:
   - **JSON**: Full data with all settings
   - **TXT**: Simple text format
   - **CSV**: Spreadsheet format
4. **Confirm** → File downloads automatically

### Export Output Examples

#### JSON Export
```json
[
  {
    "id": "proxy-1704123456789-abc123",
    "type": "http",
    "host": "proxy1.example.com",
    "port": "8080",
    "username": "user1",
    "password": "pass123",
    "name": "My Proxy 1",
    "enabled": true
  },
  {
    "id": "proxy-1704123456790-def456",
    "type": "socks5",
    "host": "proxy2.example.com",
    "port": "1080",
    "username": "",
    "password": "",
    "name": "SOCKS5 Proxy",
    "enabled": true
  }
]
```

#### TXT Export
```
http://user1:pass123@proxy1.example.com:8080
socks5://proxy2.example.com:1080
http://user2:pass456@proxy3.example.com:3128
```

#### CSV Export
```csv
type,host,port,username,password,name
http,proxy1.example.com,8080,user1,pass123,My Proxy 1
socks5,proxy2.example.com,1080,,,SOCKS5 Proxy
http,proxy3.example.com,3128,user2,pass456,Custom Proxy
```

---

## 📥 Import Features

### How to Import

1. **Open Settings** → Navigate to "Proxy List" tab
2. **Click Import Button** (📥)
3. **Select File** (JSON, TXT, or CSV)
4. **Choose Import Mode**:
   - **Merge**: Add to existing proxies (skip duplicates)
   - **Replace**: Remove all existing proxies first
5. **Confirm** → Proxies are imported

### Auto-Format Detection

The importer automatically detects the file format:

- **JSON**: Starts with `[` or `{`
- **CSV**: Contains commas in structured format
- **TXT**: Plain text, one proxy per line

### Supported Input Formats

#### 1. JSON Format
```json
[
  {
    "type": "http",
    "host": "proxy.com",
    "port": "8080",
    "username": "user",
    "password": "pass",
    "name": "My Proxy"
  }
]
```

**Required fields**: `host`, `port`
**Optional fields**: `type`, `username`, `password`, `name`, `enabled`

#### 2. TXT Format - Multiple Variations

**URL Format with Authentication:**
```
http://username:password@proxy.com:8080
https://user:pass@proxy.example.com:443
socks5://user:pass@proxy.socks.com:1080
```

**URL Format without Authentication:**
```
http://proxy.com:8080
socks5://proxy.example.com:1080
```

**Simple Host:Port Format:**
```
proxy.com:8080
192.168.1.100:3128
10.0.0.1:8888
```

**With Authentication (no protocol):**
```
username:password@proxy.com:8080
user:pass@192.168.1.100:3128
```

**Comments Supported:**
```
# Production proxies
http://proxy1.com:8080
http://proxy2.com:8080

// Backup proxies
http://backup1.com:8080
```

#### 3. CSV Format

**With Header:**
```csv
type,host,port,username,password,name
http,proxy.com,8080,user,pass,Main Proxy
socks5,proxy2.com,1080,,,SOCKS Proxy
```

**Without Header (auto-detected):**
```csv
http,proxy.com,8080,user,pass,Main Proxy
socks5,proxy2.com,1080,,,SOCKS Proxy
```

**Minimum Required:**
```csv
type,host,port
http,proxy.com,8080
```

---

## 🔧 Advanced Usage

### Duplicate Detection

Duplicates are detected by **host:port combination**, not by ID.

**Example:**
- Existing: `proxy.com:8080`
- Import: `proxy.com:8080` → **Detected as duplicate**

**Options:**
- **Skip Duplicates** (default): Keep existing proxy
- **Replace Existing**: Update with new data
- **Allow Duplicates**: Add as separate entry

### Data Validation

All imported proxies are validated:

✅ **Valid Port Range**: 1-65535
✅ **Required Fields**: host, port
✅ **Proxy Type**: Auto-detected or defaults to `http`
✅ **Normalization**: Trims whitespace, validates format

❌ **Invalid Examples:**
```
# Missing port
proxy.com

# Invalid port
proxy.com:99999

# Malformed
http:proxy.com:8080
```

### Batch Import Examples

#### Import from Free Proxy List
```txt
http://194.67.204.201:8080
http://103.160.206.91:8080
http://45.77.25.71:3128
```

#### Import from Paid Service
```json
[
  {
    "type": "http",
    "host": "premium1.proxy.com",
    "port": "8080",
    "username": "customer123",
    "password": "secretpass",
    "name": "Premium Proxy 1"
  }
]
```

#### Import Mixed Types
```txt
# HTTP Proxies
http://proxy1.com:8080
http://proxy2.com:8080

# SOCKS5 Proxies
socks5://socks1.com:1080
socks5://user:pass@socks2.com:1080
```

---

## 🚨 Troubleshooting

### Common Issues

#### 1. "Invalid JSON format"
**Problem**: JSON file is malformed

**Solutions:**
- Ensure file starts with `[` or `{`
- Check for missing commas between objects
- Validate JSON at [jsonlint.com](https://jsonlint.com)

**Example Error:**
```json
[
  {
    "host": "proxy.com"
    "port": "8080"  // ❌ Missing comma
  }
]
```

**Fixed:**
```json
[
  {
    "host": "proxy.com",
    "port": "8080"  // ✅ Added comma
  }
]
```

#### 2. "Could not parse line"
**Problem**: TXT format is unrecognized

**Common Issues:**
- Missing port number
- Invalid characters
- Wrong separator

**Examples:**

❌ **Wrong:**
```
proxy.com  (no port)
proxy.com-8080  (wrong separator)
proxy.com:abc  (invalid port)
```

✅ **Correct:**
```
proxy.com:8080
192.168.1.1:3128
http://proxy.com:8080
```

#### 3. "Missing host or port"
**Problem**: Required fields not provided

**Solutions:**
- **CSV**: Ensure at least 3 columns (type, host, port)
- **JSON**: Include `host` and `port` fields
- **TXT**: Use `host:port` format

#### 4. "Invalid port"
**Problem**: Port number is outside valid range

**Solutions:**
- Port must be between 1 and 65535
- Check for typos (e.g., `80800` instead of `8080`)

#### 5. Import Shows "0 imported"
**Possible Causes:**
1. All proxies are duplicates (check existing list)
2. File format not recognized
3. All lines have validation errors

**Debug Steps:**
1. Open browser console (F12)
2. Look for import logs and errors
3. Check error messages for specific issues

### Import Warnings

When importing, you may see warnings like:

```
✅ Imported 45 proxies! (5 skipped) Total: 100
```

**Skipped Reasons:**
- Duplicate host:port
- Invalid format
- Missing required fields
- Port out of range

Check browser console for detailed error messages.

---

## 💡 Best Practices

### 1. Regular Backups
Export your proxy list regularly in JSON format to preserve all data:

```
File naming: proxy-backup-YYYY-MM-DD.json
Example: proxy-backup-2024-01-15.json
```

### 2. Testing After Import
After importing:
1. Check the proxy list count
2. Test a few proxies with "Test" button
3. Verify authentication is working

### 3. Organizing Imports
Use naming conventions in TXT format:

```txt
# Production Proxies - DO NOT DELETE
http://prod1.com:8080
http://prod2.com:8080

# Testing Proxies
http://test1.com:8080
```

### 4. Format Selection

| Use Case | Recommended Format |
|----------|-------------------|
| Backup | JSON |
| Sharing with tools | TXT |
| Excel editing | CSV |
| Quick add | TXT |
| Full configuration | JSON |

### 5. Large Imports

For importing many proxies (100+):

1. Split into smaller files (50 per file)
2. Import one file at a time
3. Check console for errors
4. Test proxies after each batch

---

## 📊 Import Statistics

After import, you'll see:

```
✅ Imported 47 proxies! (3 skipped) Total: 150
```

**Breakdown:**
- **Imported**: Successfully added/updated proxies
- **Skipped**: Duplicates or invalid entries
- **Total**: Current total proxy count

---

## 🎓 Examples

### Example 1: Migrate from Another Tool

**Source (other tool):**
```txt
proxy1.com:8080:user:pass
proxy2.com:3128::
```

**Convert to:**
```txt
http://user:pass@proxy1.com:8080
http://proxy2.com:3128
```

**Import** → Success!

### Example 2: Bulk Add Free Proxies

1. Copy proxies from free list
2. Paste into text file:
```txt
194.67.204.201:8080
103.160.206.91:8080
45.77.25.71:3128
```
3. Import file
4. Test all with "Fetch & Check Proxies"

### Example 3: Organize Paid Proxies

**Create organized CSV:**
```csv
type,host,port,username,password,name
http,us-proxy1.com,8080,myuser,mypass,USA Proxy 1
http,uk-proxy1.com,8080,myuser,mypass,UK Proxy 1
socks5,eu-socks.com,1080,myuser,mypass,EU SOCKS5
```

**Import** → All proxies neatly organized!

---

## 🔐 Security Notes

### Password Handling

⚠️ **Warning**: Exported files contain passwords in plain text!

**Best Practices:**
1. **Encrypt** exported files if storing passwords
2. **Use secure sharing** for sharing proxy lists
3. **Delete exports** after use if they contain sensitive data
4. **Consider separate storage** for credentials

### Recommended Workflow

For sensitive proxies:

1. **Export without passwords** (TXT format doesn't include auth)
2. **Store credentials separately** (password manager)
3. **Add auth** when importing to the app

---

## 📞 Support

### Getting Help

If you encounter issues:

1. **Check browser console** (F12) for detailed errors
2. **Verify file format** matches examples above
3. **Test with small sample** first (2-3 proxies)
4. **Check proxy format** is supported

### Debug Mode

Enable detailed logging by opening browser console (F12) before importing:

```
📥 Importing file: proxy-list.json
📋 Detected JSON format: 50 proxies
✅ Imported: proxy1.com:8080
✅ Imported: proxy2.com:8080
⏭️  Skipped duplicate: proxy3.com:8080
📊 Import summary: { imported: 47, skipped: 3, total: 150 }
```

---

## 🎉 Quick Reference

### Buttons

| Button | Icon | Action |
|--------|------|--------|
| Import | 📥 | Import proxies from file |
| Export | 📤 | Export proxies to file |
| Clear | 🗑️ | Delete all proxies |

### Shortcuts

- **Import**: Click Import → Select file → Confirm
- **Export**: Click Export → Choose format → Download
- **Clear**: Click Clear → Confirm deletion

### File Extensions

- `.json` - JSON format (recommended)
- `.txt` - Text format (universal)
- `.csv` - CSV format (spreadsheet)

---

## ✨ Summary

✅ **Multiple Formats**: JSON, TXT, CSV
✅ **Auto-Detection**: Automatically recognizes format
✅ **Smart Import**: Validates and normalizes data
✅ **Duplicate Handling**: Detects and skips duplicates
✅ **Batch Operations**: Import/export many proxies at once
✅ **Error Reporting**: Clear error messages and logging
✅ **Safe Operations**: Confirmation dialogs for destructive actions

**Enjoy seamless proxy management!** 🚀
