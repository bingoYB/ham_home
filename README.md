<p>
  <img src="logo.png" alt="HamHome" width="280" />
</p>

# HamHome

**AI-Powered Browser Workspace for Bookmarks, Tabs, and Collections**

<p>
  <img src="https://img.shields.io/github/v/release/bingoYB/ham_home?style=flat-square" alt="Release" />
  <img src="https://img.shields.io/github/stars/bingoYB/ham_home?style=flat-square" alt="Stars" />
  <img src="https://img.shields.io/github/forks/bingoYB/ham_home?style=flat-square" alt="Forks" />
  <img src="https://img.shields.io/github/issues/bingoYB/ham_home?style=flat-square" alt="Issues" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
</p>

<p>
  <a href="https://bingoyb.github.io/ham_home/">Product Introduction</a> •
  <a href="./docs/USAGE_en.md">Usage</a> •
  <a href="./docs/README_zh.md">中文文档</a> •
  <a href="./docs/USAGE_zh.md">使用文档</a> •
  <a href="#features">Features</a> •
  <a href="#development">Development</a> •
  <a href="#contributing">Contributing</a>
</p>

## What is HamHome?

HamHome is an AI-powered browser workspace for modern browsing. It brings together bookmark management, saved tab workspaces, and automatic tab grouping so you can organize both long-term knowledge and in-progress browsing in one place.

Use HamHome to save, manage, and restore tabs that are already open in your browser, automatically group active tabs by rules or AI, and turn valuable pages into structured bookmarks with AI-generated summaries, categories, tags, and semantic search. Your data stays local-first, portable, and syncable across devices when you need it.

👉 **[View Product Introduction](https://bingoyb.github.io/ham_home/)** - Learn more about features and capabilities

## Screenshots

|                         **Side Panel**                         |                          **Save Panel**                          |
| :------------------------------------------------------------: | :--------------------------------------------------------------: |
|  ![Side Panel](docs/screenshot/compressed/en/side-panel.png)   |   ![Save Panel](docs/screenshot/compressed/en/save-panel.png)    |
|                      **Semantic Search**                       |                      **Preset Categories**                       |
|      ![Semantic Search](https://i.imgur.com/8HHRTb9.png)       |      ![Preset Categories](https://i.imgur.com/0Qku5cx.png)       |
|                      **Management Page**                       |                        **Settings Page**                         |
| ![Management Page](docs/screenshot/compressed/en/mng-page.png) | ![Settings Page](docs/screenshot/compressed/en/setting-page.png) |
|                         **Workspaces**                         |                      **Tab Group Rules**                         |
|                          【待补充】                            |                          【待补充】                              |
|                    **Full Data Backup**                        |                         **WebDAV Sync**                          |
|                          【待补充】                            |                          【待补充】                              |

## Features

### 🧩 Workspaces & Tab Sessions

- Save open tabs as restorable workspaces for research, projects, and recurring browsing sessions
- Preserve native browser Tab Groups when saving and restoring supported browser sessions
- Organize workspaces with separate workspace categories and tags
- Analyze workspace pages to detect duplicates and recommend pages worth converting into long-term bookmarks

### 🧠 Smart Tab Grouping

- Create automatic Tab Group rules by domain, URL, title, case-insensitive title, or regex
- Configure target group title, color, collapsed state, and multiple match conditions
- Optional AI auto-grouping uses your configured AI provider and caches results for repeated pages

### 🤖 AI-Assisted Bookmarking

- Auto-categorization based on page content
- Smart tag suggestions with configurable presets
- AI-generated summaries for quick reference
- Semantic and conversational search for saved bookmarks
- BYOK (Bring Your Own Key) support for OpenAI, Anthropic, Claude, Ollama, and custom endpoints

### 🔄 Multi-Device Sync (WebDAV)

- Support synchronization via WebDAV (e.g., Nextcloud, InfiniCLOUD, etc.)
- Sync bookmarks, categories, settings, workspaces, workspace categories, and Tab Group configuration
- End-to-end encrypted or plain data sync options
- Real-time sync status widget in the header
- Granular control over remote data (clear remote data anytime)

### 🗂️ Category Management

- **Icon Support**: Add emoji icons to your categories for better visual identification.
- **Preset Schemes**: Two built-in category templates—"General" and "Professional Creator"—with one-click import
- **AI-Generated Categories**: Describe your use case and let AI create a tailored category structure
- Unlimited hierarchical category tree

### 📸 Page Snapshots

- Save complete HTML snapshots locally (IndexedDB)
- Access content even when the original page goes offline
- Powered by [Mozilla Readability](https://github.com/mozilla/readability) for clean extraction

### 🔍 Powerful Search & Filtering

- Full-text search across titles, descriptions, and content
- Semantic search (vector-based)
- Filter by category, tags, and time range
- Create custom filter presets for complex queries

### 📦 Import, Export & Portability

- JSON backups include bookmarks, categories, workspaces, workspace categories, Tab Group rules, and auto-group settings
- JSON restore remaps category relationships and updates existing workspaces or Tab Group rules when IDs already exist
- HTML import/export supports standard browser bookmark files for Chrome, Firefox, and Edge

### 🎯 Privacy-First Design & Storage

- **Local-First**: All data stored locally in Chrome Storage + IndexedDB
- **Granular Storage Management**: View and manage space used by bookmarks, snapshots, and vector data separately.
- **Selective Deletion**: Delete specific data types (e.g., only snapshots) while keeping your categories and configurations.
- **Privacy Domains**: Configure domains to exclude sensitive sites from AI analysis

### 🖥️ Modern UI

- Grid (masonry) and list view modes
- Light/dark theme with system preference detection
- Full i18n support (English & Chinese)
- Keyboard shortcuts and edge-trigger panel

## Browser Support

| Browser           | Status           |
| ----------------- | ---------------- |
| Chrome / Chromium | ✅ Manifest V3    |
| Microsoft Edge    | ✅ Manifest V3    |
| Firefox           | ✅ Manifest V2/V3 |

## Downloads

- [**Chrome Web Store**](https://chromewebstore.google.com/detail/hamhome-%E6%99%BA%E8%83%BD%E4%B9%A6%E7%AD%BE%E5%8A%A9%E6%89%8B/mkdokbchcfegdkgoiikagecikldbkbmg)
- [**Firefox Add-ons**](https://addons.mozilla.org/zh-CN/firefox/addon/hamhome-%E6%99%BA%E8%83%BD%E4%B9%A6%E7%AD%BE%E5%8A%A9%E6%89%8B/)
- [**Microsoft Edge Addons**](https://microsoftedge.microsoft.com/addons/detail/hamhome-smart-bookmark-/nmbdgbicgagmokdmohgngcbhkaicfnpi)
- See [releases](https://github.com/bingoYB/ham_home/releases) to download and install manually.

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/bingoYB/ham_home.git
cd ham_home

# Install dependencies (requires pnpm)
pnpm install

# Build for Chrome/Edge
pnpm --filter extension build

# Build for Firefox
pnpm --filter extension build:firefox
```

### Load the Extension

- **Chrome/Edge**: Navigate to `chrome://extensions/`, enable "Developer mode", click "Load unpacked", and select `apps/extension/.output/chrome-mv3`
- **Firefox**: Go to `about:debugging`, click "This Firefox", click "Load Temporary Add-on", and select `apps/extension/.output/firefox-mv2/manifest.json`

## Development

```bash
# Start dev server (Chrome)
pnpm --filter extension dev

# Start dev server (Firefox)
pnpm --filter extension dev:firefox

# Build all browser variants
pnpm --filter extension build:all
```

## Tech Stack

<p>
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square&logo=node.js" alt="Node" />
  <img src="https://img.shields.io/badge/pnpm-9.0.0-orange?style=flat-square&logo=pnpm" alt="pnpm" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react" alt="React" />
</p>

- **Framework**: [WXT](https://wxt.dev/) (Vite-based extension framework)
- **UI**: React 19 + TypeScript + Tailwind CSS
- **Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Content Extraction**: Mozilla Readability + Turndown
- **i18n**: i18next + react-i18next
- **Storage**: Chrome Storage API + IndexedDB

## Project Structure

```
ham_home/
├── apps/
│   └── extension/          # Browser extension
│       ├── components/     # React components
│       ├── hooks/          # Custom hooks
│       ├── lib/            # Core libraries (AI, storage, i18n)
│       ├── entrypoints/    # Extension entry points
│       └── locales/        # i18n resources
├── packages/
│   ├── ui/                 # Shared UI components
│   ├── types/              # Shared TypeScript types
│   └── ...                 # Other shared packages
└── docs/                   # Documentation
```

## Contributing

Contributions are welcome! Please:

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

[MIT](./LICENSE)

---

<p align="center">
  If you find HamHome useful, consider giving it a ⭐
</p>
