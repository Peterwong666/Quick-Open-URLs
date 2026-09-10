# Quick-Open-URLs

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/develop/migrate)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](./quick-open-urls/manifest.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> Select some text, press a shortcut, and open every link in it at once.
>
> Built for the case where a document, spreadsheet, or chat log contains dozens or hundreds of URLs you need to open.

**中文版本 → [README.md](./README.md)**

---

## Contents

- [1. What problem it solves](#1-what-problem-it-solves)
- [2. Installation](#2-installation)
- [3. Usage](#3-usage)
- [4. Settings](#4-settings)
- [5. How URLs are detected](#5-how-urls-are-detected)
- [6. Project layout](#6-project-layout)
- [7. Browser support and known limitations](#7-browser-support-and-known-limitations)
- [8. FAQ](#8-faq)
- [9. License](#9-license)

---

## 1. What problem it solves

A common chore: a document lists 50 product URLs and you need to check each one. Clicking them one by one, or copy-pasting into the address bar, is slow.

This extension reduces it to two steps: **select the text, press the shortcut**. Every link opens in a background tab without disturbing the page you are on.

The scope is deliberately narrow. No bookmark management, no link collection, no network calls of its own. It does one thing: turn selected text into opened tabs.

---

## 2. Installation

### Load from source (developer mode)

1. Download or clone this repository
2. Open `chrome://extensions` (`edge://extensions` on Edge)
3. Enable **Developer mode** in the top-right corner
4. Click **Load unpacked**
5. **Select the `quick-open-urls` subfolder** — `manifest.json` lives there, not in the repository root

### Install from a store

Not published on the Chrome Web Store. Use the manual steps above.

---

## 3. Usage

### Option A: keyboard shortcut (the main path)

1. Select text containing URLs on any web page
2. Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd> (<kbd>Command</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd> on macOS)
3. Every detected URL opens in a background tab

![how to use](./quick-open-urls/img/how2use.png)

> Tabs are created with `active: false`, so focus stays on the current page. Opening 100 links does not make the browser jump around.

### Option B: context menu

Right-click the extension icon. Two entries:

| Entry | Effect |
|-------|--------|
| Open Selected URLs | Same as the shortcut |
| Quick-Open-URLs on GitHub | Opens this repository |

---

## 4. Settings

Right-click the extension icon → **Options** (opens in a new tab).

![setting](./quick-open-urls/img/setting1.png)

| Setting | Default | Description |
|---------|---------|-------------|
| Lazy loading | off | Instead of requesting the target page immediately, open a lightweight placeholder and load the real page only when the tab gains focus. Prevents saturating your bandwidth and the target server when opening hundreds of links |
| Random order | off | Shuffle the open order |
| Reverse order | off | Open in reverse of the selected order |
| Deduplicate | **on** | Open each unique URL once |
| Handle as search query | off | Treat lines without a scheme as search terms instead of URLs. ⚠️ Requires the `chrome.search` API — **Firefox only** |
| Tab group | none | Put new tabs into a new or existing group for easy bulk closing |
| Container | none | Assign a Firefox container (cookie isolation). ⚠️ Requires the `chrome.contextualIdentities` API — **Firefox only** |

![setting](./quick-open-urls/img/setting2.png)
![setting](./quick-open-urls/img/setting3.png)

---

## 5. How URLs are detected

The parser takes one of two paths depending on whether the selection contains a newline:

| Input | Handling |
|-------|----------|
| **Contains newlines** | One URL per line: split on `\r\n` / `\n`, `trim` each line, drop empty lines, optionally deduplicate |
| **Single line** | Extract every URL fragment with a regular expression |

Additional rules:

- **Scheme is filled in**: a line without `http://` or similar gets `http://` prepended
- **Deduplication is on by default**; turn it off in settings if you need duplicates
- Order transforms run as: deduplicate → reverse → random

### Schemes excluded from lazy loading

These open directly, because the placeholder page cannot proxy them:

```
file  view-source  moz-extension  chrome  chrome-extension  edge  extension
```

---

## 6. Project layout

```
.
├── README.md
├── README_EN.md
└── quick-open-urls/            ← select this level when loading the extension
    ├── manifest.json           Manifest V3 config, shortcut, permission declarations
    ├── background.js           Service worker: URL parsing, tab and group creation, context menu
    ├── options.html / .js      Options page and settings persistence
    ├── lazyloading.html        Placeholder page used by lazy loading (redirects on focus)
    ├── _locales/
    │   ├── zh_CN/messages.json Chinese strings
    │   ├── en/messages.json    English strings
    │   └── localization.js
    ├── icons/                  16 / 48 / 128 icons
    └── img/                    Screenshots used by this document
```

The interface language follows the browser language (a `zh` prefix selects Chinese). No manual switch needed.

---

## 7. Browser support and known limitations

Stated plainly here so they are not mistaken for bugs.

| Feature | Chrome / Edge | Firefox | Note |
|---------|---------------|---------|------|
| Open via shortcut | ✅ | ✅ | |
| Context menu | ✅ | ✅ | |
| Lazy loading | ✅ | ✅ | |
| Dedupe / reverse / random | ✅ | ✅ | |
| Tab groups | ✅ | ❌ | `chrome.tabs.group` and `chrome.tabGroups` are Chromium-only |
| Containers | ❌ | ✅ | `chrome.contextualIdentities` is Firefox-only |
| Search-query handling | ❌ | ✅ | `chrome.search` is Firefox-only |

**Why do "Container" and "Search query" do nothing on Chrome?**

Both call APIs that do not exist in Chrome or Edge. The calls are wrapped in `try / catch`, so failure silently falls back to "no container" and "treat as a normal URL" — no error, and the remaining links still open. This is expected behaviour, not a defect.

**About permissions**

The extension requests `<all_urls>` host permission and `scripting` for exactly one purpose: injecting a script into the active tab to read the selected text (`window.getSelection()`). It makes no network requests of its own and collects no data.

---

## 8. FAQ

**Q: Nothing happens when I press the shortcut.**

Check that text is actually selected — with no selection the extension logs a message and returns quietly rather than showing a dialog. Also confirm the shortcut is not claimed by another extension; review or change it at `chrome://extensions/shortcuts`.

**Q: How many links can I open at once?**

There is no hard limit in the code. But loading many pages at once consumes a lot of memory, so enable **lazy loading**: each tab then holds only a lightweight placeholder and fetches the real page when you switch to it.

**Q: Why do some links end up as 404s?**

When a link in the source text has no scheme, the extension prepends `http://`. Sites that only serve HTTPS may fail to redirect. Write the full `https://` address in the source text to avoid this.

**Q: The tabs pile up and are hard to manage.**

Set **Tab group** to "New tab group" in the settings. Opened tabs are collected into a single group you can collapse or close at once.

---

## 9. License

[MIT License](./LICENSE)
