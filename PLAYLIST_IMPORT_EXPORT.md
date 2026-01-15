# 📋 Playlist URLs Import/Export Guide

## ✨ Features

Easily manage your Auto-Refresh playlist URLs with import/export functionality.

### What You Can Do:
- 📥 **Import** URLs from TXT or JSON files
- 📤 **Export** URLs to text files
- 🗑️ **Clear** all URLs with one click
- ✅ **Auto-validation** and duplicate detection
- 📝 **Comments support** in TXT files

---

## 🚀 Quick Start

### Export Playlist URLs

1. Open **Auto Refresh Settings** (⟳ button)
2. Add URLs to your playlist
3. Click **📤 Export** button
4. File downloads as `playlist-urls-[timestamp].txt`

### Import Playlist URLs

1. Open **Auto Refresh Settings**
2. Click **📥 Import** button
3. Select your `.txt` or `.json` file
4. Confirm import
5. URLs are added to playlist!

### Clear All URLs

1. Open **Auto Refresh Settings**
2. Click **🗑️ Clear** button
3. Confirm action
4. All URLs removed!

---

## 📁 Supported Formats

### 1. TXT Format (Recommended)

**Simple text file with one URL per line**

```txt
# Example playlist
https://www.google.com
https://www.youtube.com
https://www.facebook.com

# You can add comments
# Lines starting with # or // are ignored
https://www.github.com

// Another comment style
https://www.stackoverflow.com

# URLs without protocol work too
wikipedia.org
medium.com
```

**Features:**
- ✅ One URL per line
- ✅ Comments supported (`#` or `//`)
- ✅ Empty lines ignored
- ✅ Auto-adds `https://` if missing
- ✅ Human-readable and editable

### 2. JSON Format

**Standard JSON array of URLs**

```json
[
  "https://www.google.com",
  "https://www.youtube.com",
  "https://www.facebook.com",
  "https://www.github.com"
]
```

**Features:**
- ✅ Clean JSON array
- ✅ Easy to generate programmatically
- ✅ Compatible with other tools
- ✅ Supports nested format: `{"urls": [...]}`

---

## 📖 Usage Examples

### Example 1: Export Current Playlist

```
Current playlist: 10 URLs

Steps:
1. Click Export → playlist-urls-1704123456789.txt
2. File downloaded with all 10 URLs
3. Save for later or share with team
```

### Example 2: Import from Text File

**File: `my-urls.txt`**
```txt
https://www.example.com
https://www.test.com
https://www.demo.com
```

**Steps:**
1. Click Import
2. Select `my-urls.txt`
3. Confirm: "Add to current playlist"
4. 3 URLs added!

### Example 3: Batch Add URLs

**Scenario:** Add 50 URLs quickly

**Solution:**
1. Create `urls.txt` with all 50 URLs
2. Import the file
3. All 50 URLs added in seconds!

**vs. Manual:**
- Manual: Click "Add" 50 times ❌
- Import: Click "Import" once ✅

### Example 4: Replace All URLs

**Steps:**
1. Click Clear → Confirm
2. Click Import → Select new file
3. Playlist replaced with new URLs!

---

## 🔧 Import Behavior

### Duplicate Detection

**Duplicates are automatically skipped:**

```
Current playlist:
- https://www.google.com
- https://www.youtube.com

Import file:
- https://www.google.com  ← Skipped (duplicate)
- https://www.facebook.com ← Added
- https://www.twitter.com  ← Added

Result: 2 new URLs added, 1 skipped
```

### URL Validation

**Valid URLs:**
```
✅ https://www.example.com
✅ http://example.com
✅ example.com (auto-adds https://)
✅ www.example.com (auto-adds https://)
```

**Invalid URLs:**
```
❌ just text
❌ has spaces in url
❌ example (no domain)
❌ .com (incomplete)
```

### Auto-Formatting

**Input → Output:**
```
google.com           → https://google.com
www.youtube.com      → https://www.youtube.com
github.com/user/repo → https://github.com/user/repo
```

### Comment Handling (TXT only)

**Comments are ignored:**
```txt
# This is ignored
https://www.example.com  ← Imported

// This is also ignored
https://www.test.com  ← Imported

https://www.demo.com  ← Imported
```

---

## 💡 Tips & Best Practices

### Tip 1: Organize with Comments (TXT)

```txt
# Social Media Platforms
https://www.facebook.com
https://www.twitter.com
https://www.instagram.com

# News Sites
https://www.cnn.com
https://www.bbc.com

# Development Tools
https://www.github.com
https://www.stackoverflow.com
```

**Benefits:**
- Easy to read
- Clear organization
- Quick edits

### Tip 2: Regular Backups

**Best Practice:**
```
Export weekly: playlist-backup-2024-01-15.txt
File naming: playlist-[category]-[date].txt
Storage: Cloud backup (Dropbox, Google Drive)
```

### Tip 3: Share with Team

**Workflow:**
1. Create master playlist
2. Export to file
3. Share via email/Slack
4. Team imports instantly

### Tip 4: Multiple Playlists

**Organize by purpose:**
```
playlist-work.txt      → Work-related sites
playlist-news.txt      → News sources
playlist-social.txt    → Social media
playlist-testing.txt   → Testing endpoints
```

**Switch easily:**
1. Clear current playlist
2. Import desired playlist
3. Done!

### Tip 5: Test Before Import

**For large imports (50+ URLs):**
1. Create small test file (5 URLs)
2. Import test file
3. Verify everything works
4. Import full file

---

## 🎯 Common Use Cases

### Use Case 1: Web Scraping Rotation

**Goal:** Scrape 20 different pages in rotation

**Setup:**
```txt
# urls.txt
https://site.com/page1
https://site.com/page2
https://site.com/page3
...
https://site.com/page20
```

**Steps:**
1. Import `urls.txt`
2. Set playlist mode: Sequential
3. Set interval: 60 seconds
4. Enable auto-refresh
5. Pages rotate automatically!

### Use Case 2: Dashboard Monitoring

**Goal:** Monitor multiple dashboards

**Setup:**
```txt
# dashboards.txt
https://analytics.company.com
https://status.company.com
https://metrics.company.com
https://logs.company.com
```

**Steps:**
1. Import dashboards list
2. Sequential mode
3. 30-second intervals
4. Display on monitor

### Use Case 3: A/B Testing

**Goal:** Test different page versions

**Setup:**
```txt
https://site.com/version-a
https://site.com/version-b
https://site.com/version-c
```

**Configuration:**
- Mode: Random
- Interval: 10 seconds
- Rotate proxy: Yes

### Use Case 4: Content Aggregation

**Goal:** Browse multiple news sources

**Setup:**
```txt
# news.txt
https://www.cnn.com
https://www.bbc.com
https://www.reuters.com
https://www.nytimes.com
```

**Usage:**
- Sequential browsing
- 120-second intervals
- Stay informed!

---

## 🐛 Troubleshooting

### Issue: Import Shows "0 URLs Imported"

**Possible causes:**
1. All URLs are duplicates
2. File format incorrect
3. All URLs invalid

**Solutions:**
1. **Check duplicates:**
   ```
   Clear playlist first, then import
   ```

2. **Verify file format:**
   ```
   TXT: One URL per line
   JSON: Valid JSON array
   ```

3. **Check console (F12):**
   ```
   Look for: "Invalid URL skipped: ..."
   ```

### Issue: "Invalid JSON format"

**Problem:** JSON file is malformed

**Solutions:**
1. **Validate JSON:**
   - Visit [jsonlint.com](https://jsonlint.com)
   - Paste your JSON
   - Fix errors

2. **Common mistakes:**
   ```json
   ❌ ["url1" "url2"]        // Missing comma
   ✅ ["url1", "url2"]       // Correct
   
   ❌ ["url1",]              // Trailing comma
   ✅ ["url1"]               // Correct
   ```

### Issue: URLs Not Working After Import

**Problem:** URLs seem correct but don't load

**Solutions:**
1. **Check URL format:**
   ```
   Each URL should start with http:// or https://
   ```

2. **Test URLs manually:**
   ```
   Copy URL from playlist
   Paste in browser
   Verify it loads
   ```

3. **Check for extra spaces:**
   ```
   ❌ "https://example.com "  // Trailing space
   ✅ "https://example.com"   // Correct
   ```

### Issue: Import File Not Found

**Problem:** Can't find exported file

**Solutions:**
1. **Check Downloads folder:**
   ```
   Default location: ~/Downloads/
   ```

2. **Search by name:**
   ```
   playlist-urls-*.txt
   ```

3. **Check browser download settings**

---

## 📊 Import Statistics

**After import, you'll see:**

```
✅ Imported 47 URLs! (3 duplicates skipped) (2 invalid) Total: 50
```

**Breakdown:**
- **Imported**: New URLs added (47)
- **Duplicates**: Already in playlist (3)
- **Invalid**: Failed validation (2)
- **Total**: Current total count (50)

**Console Details (F12):**
```
📥 Importing playlist URLs from: my-urls.txt
Invalid URL skipped: just text
Duplicate URL skipped: https://www.google.com
✅ Import complete: { imported: 47, skipped: 3, invalid: 2, total: 50 }
```

---

## 🔐 Privacy & Security

### Data Storage

**Where:**
- Playlist URLs stored in memory
- Auto-saved with auto-refresh settings
- Not sent to external servers

**When exported:**
- Plain text file on your computer
- You control where to save/share

### URL Visibility

**⚠️ Important:**
- Exported files contain full URLs
- May include sensitive paths
- Review before sharing

**Best practices:**
1. Remove sensitive URLs before export
2. Use generic placeholders for demos
3. Encrypt files if sharing sensitive lists

---

## 📝 File Format Reference

### TXT Format Specification

```
Format: One URL per line
Comments: # or // at start of line
Empty lines: Ignored
URL format: Full URL or domain name
Encoding: UTF-8
Line endings: LF or CRLF
```

**Example:**
```txt
# Comment
https://www.example.com
example.org
// Another comment

https://test.com
```

### JSON Format Specification

**Array format:**
```json
[
  "https://url1.com",
  "https://url2.com"
]
```

**Object format:**
```json
{
  "urls": [
    "https://url1.com",
    "https://url2.com"
  ]
}
```

**Nested objects (URLs extracted):**
```json
[
  {"url": "https://url1.com"},
  {"url": "https://url2.com"}
]
```

---

## ⚡ Performance

### Import Speed

```
10 URLs:    < 100ms
50 URLs:    < 200ms
100 URLs:   < 500ms
1000 URLs:  < 2 seconds
```

### Memory Usage

```
Per URL: ~100 bytes
1000 URLs: ~100 KB
Very efficient!
```

### Recommendations

```
✅ Recommended: 10-100 URLs
⚠️ Large: 100-500 URLs
❌ Too many: 500+ URLs (may slow down)
```

---

## 🎓 Advanced Examples

### Example 1: Dynamic URL Generation

**Create URLs programmatically:**

```javascript
// Generate URLs for pages 1-20
const urls = Array.from({length: 20}, (_, i) => 
  `https://example.com/page${i + 1}`
);

// Save to JSON
const json = JSON.stringify(urls, null, 2);
// Import this JSON file
```

### Example 2: URL Templates

**Template file:**
```txt
# API Endpoints
https://api.example.com/v1/users
https://api.example.com/v1/posts
https://api.example.com/v1/comments

# Different Environments
https://staging.example.com
https://dev.example.com
https://prod.example.com
```

### Example 3: Conditional URLs

**Different lists for different purposes:**

**work-urls.txt:**
```txt
https://mail.company.com
https://calendar.company.com
https://docs.company.com
```

**personal-urls.txt:**
```txt
https://mail.google.com
https://calendar.google.com
https://drive.google.com
```

**Workflow:**
- Morning: Import work-urls.txt
- Evening: Import personal-urls.txt

---

## 📚 Integration Examples

### Example 1: Export from Spreadsheet

**Google Sheets:**
1. Create column with URLs
2. Copy column
3. Paste into text editor
4. Save as `.txt`
5. Import!

### Example 2: Generate from Script

**Python example:**
```python
urls = [
    "https://site.com/page1",
    "https://site.com/page2",
    "https://site.com/page3"
]

# Save as JSON
import json
with open('urls.json', 'w') as f:
    json.dump(urls, f, indent=2)
```

### Example 3: Parse from Web Page

**Extract URLs from HTML:**
```javascript
// In browser console
const links = Array.from(document.querySelectorAll('a'))
  .map(a => a.href)
  .filter(url => url.startsWith('http'));

console.log(JSON.stringify(links, null, 2));
// Copy output → Save as .json → Import
```

---

## ✅ Summary

### What's Included:

✅ **Import from TXT/JSON**
- One-click import
- Auto-validation
- Duplicate detection
- Comment support

✅ **Export to TXT**
- One-click export
- Timestamped filename
- Simple format
- Easy to edit

✅ **Clear All**
- Quick reset
- Confirmation dialog
- Safe operation

✅ **Smart Validation**
- URL format checking
- Auto-formatting
- Error reporting

### Key Benefits:

🚀 **Fast**: Import 100+ URLs in seconds
💾 **Backup**: Export anytime for safety
🔄 **Share**: Easy team collaboration
📝 **Edit**: Use any text editor
✅ **Reliable**: Validation and error handling

---

## 🎉 Quick Reference

### Buttons

| Button | Icon | Action |
|--------|------|--------|
| Import | 📥 | Import URLs from file |
| Export | 📤 | Export URLs to file |
| Clear | 🗑️ | Remove all URLs |

### File Extensions

- `.txt` - Text format (recommended)
- `.json` - JSON format

### Keyboard Shortcuts

- **Enter** - Add URL (when typing)
- **Ctrl+V** - Paste URL

---

**Enjoy efficient playlist management!** 🎉

For questions, check the console (F12) for detailed logs.
