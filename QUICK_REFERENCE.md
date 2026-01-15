# 📋 Proxy Import/Export - Quick Reference

## 🚀 Quick Actions

### Export Proxies
```
Settings → Proxy List → 📤 Export → Choose Format → Download
```

### Import Proxies
```
Settings → Proxy List → 📥 Import → Select File → Confirm
```

### Clear All
```
Settings → Proxy List → 🗑️ Clear → Confirm
```

---

## 📁 Supported Formats

| Format | Extension | Best For |
|--------|-----------|----------|
| **JSON** | `.json` | Backups, full data |
| **TXT** | `.txt` | Universal, simple |
| **CSV** | `.csv` | Spreadsheets, editing |

---

## 📝 Format Examples

### JSON
```json
[{"type":"http","host":"proxy.com","port":"8080"}]
```

### TXT
```
http://user:pass@proxy.com:8080
proxy.com:8080
```

### CSV
```csv
type,host,port,username,password,name
http,proxy.com,8080,user,pass,My Proxy
```

---

## ⚡ Keyboard Shortcuts

- **F12** - Open console (for debug logs)
- **Ctrl+S / Cmd+S** - Save (in forms)
- **Esc** - Cancel modal

---

## 🔍 Common Issues

| Issue | Solution |
|-------|----------|
| "Invalid JSON" | Validate at jsonlint.com |
| "Could not parse" | Check format matches examples |
| "0 imported" | Check console (F12) for errors |
| "Duplicates" | Normal - duplicates are skipped |

---

## 📊 Understanding Import Results

```
✅ Imported 47 proxies! (3 skipped) Total: 150
```

- **47** = New proxies added
- **3** = Skipped (duplicates/invalid)
- **150** = Total proxies now

---

## 💡 Pro Tips

1. **Export JSON weekly** for backups
2. **Use TXT for sharing** (most compatible)
3. **Check console (F12)** for detailed logs
4. **Test small files first** before bulk import
5. **Comments work in TXT** (`#` or `//`)

---

## 🎯 Most Common Workflows

### Workflow 1: Backup
```
Export → JSON → Save to cloud
```

### Workflow 2: Share
```
Export → TXT → Send file
```

### Workflow 3: Bulk Add
```
Get list → Save as .txt → Import
```

### Workflow 4: Clean Up
```
Export backup → Clear All → Import (no duplicates)
```

---

## 🐛 Debug Mode

Open browser console (F12) to see:
- Import/export progress
- Validation errors
- Duplicate detections
- File parsing logs

---

## 📚 Full Docs

- **Complete Guide**: `IMPORT_EXPORT_GUIDE.md`
- **Feature Summary**: `PROXY_IMPORT_EXPORT.md`
- **Test Files**: `test-import-examples.txt/csv`

---

**That's it! You're ready to go!** 🎉
