import type { SupportedLanguage } from './language';
import { REPOSITORY_URL } from './site';

// Update this date whenever the policy text changes; the sitemap reuses it for the privacy pages.
export const PRIVACY_POLICY_UPDATED_AT = '2026-10-10';

export interface PrivacyPolicySection {
  title: string;
  paragraphs: string[];
}

export const PRIVACY_POLICY_COPY: Record<SupportedLanguage, { title: string; description: string }> = {
  zh: {
    title: '隐私权政策',
    description: 'HamHome 浏览器扩展隐私权政策：扩展在浏览器中保存哪些数据、各项浏览器权限的用途，以及启用 AI、语义搜索和 WebDAV 等功能时会把哪些内容发送给你选择的服务。',
  },
  en: {
    title: 'Privacy Policy',
    description: 'HamHome browser extension privacy policy: what the extension stores in your browser, why it requests each permission, and what is sent to the AI, semantic search and WebDAV services you choose to enable.',
  },
};

const zhSections: PrivacyPolicySection[] = [
  {
    title: '1. 适用范围',
    paragraphs: [
      '本政策适用于 HamHome 浏览器扩展（Chrome、Edge 与 Firefox 版本）。HamHome 是一款开源、本地优先的网页收藏与标签页管理扩展，用于收藏网页、文本和图片，搜索已保存的内容，以及保存和恢复标签页工作空间。',
      '使用 HamHome 无需注册账号，开发者也不运营接收你收藏内容的服务器。只有在你使用第 5 节所列功能时，相关数据才会发送给对应的服务。',
      '本官网使用 Microsoft Clarity 分析页面访问与交互情况，这与扩展中的数据无关；扩展本身不包含统计或广告代码。',
    ],
  },
  {
    title: '2. 我们处理哪些数据',
    paragraphs: [
      '收藏内容：网页书签的网址、标题、描述与摘要、分类、标签、收藏时间和提取的正文；文本剪藏的原文与来源；图片剪藏的图片地址、来源页面、尺寸、格式和主色。',
      '附加内容：你选择保存的本地网页快照（HTML/Markdown）、页面截图（仅网页当前可见区域），以及搜索索引、向量数据、AI 分析缓存和 Agent 对话记录。',
      '标签页与设置：工作空间中的页面网址、标题、图标、顺序、固定状态和分组信息，Tab 分组规则，以及界面偏好和你主动填写的 AI、Embedding、WebDAV 等配置。',
    ],
  },
  {
    title: '3. 数据存储在哪里',
    paragraphs: [
      '收藏内容、快照、截图、索引、AI 分析缓存、Agent 对话记录、工作空间和 WebDAV 配置保存在当前浏览器的扩展本地存储与 IndexedDB 中。',
      '分类、界面设置、AI 与 Embedding 配置（包括你填写的 API Key）、自定义筛选、固定项和 Tab 分组规则保存在浏览器为扩展提供的同步存储（storage.sync）中。如果你在浏览器中开启了账号同步，浏览器会把这些数据同步到登录同一账号的其他设备，该过程由浏览器厂商处理。',
    ],
  },
  {
    title: '4. 浏览器权限',
    paragraphs: [
      'storage、unlimitedStorage：保存收藏、快照、截图、索引和设置，避免数据增多后超出浏览器默认的存储配额。',
      'activeTab、scripting：在你保存当前页面、剪藏内容或打开页内面板时，读取当前网页内容，并在页面中显示 HamHome 界面。',
      'tabs：读取标签页的标题、网址、图标和固定状态，用于保存与恢复工作空间，以及按规则整理标签页。tabGroups（仅 Chrome 与 Edge）：按你设置的规则创建和更新浏览器原生标签页分组。',
      'contextMenus：提供右键收藏网页、文字和图片的入口。bookmarks：导入浏览器书签，并在你选择时把整理后的书签写回浏览器书签栏。clipboardWrite：把笔记写入剪贴板，再通过 Obsidian 协议保存到 Obsidian。alarms：按计划执行 WebDAV 同步、你开启的定期书签体检和回收站到期清理。',
      '访问所有网站（<all_urls>）：让收藏、剪藏、页面截图和页内面板可以在任意网站上使用，并允许扩展连接你配置的 AI 与 WebDAV 地址、在书签体检时访问书签网址。HamHome 只在你使用相关功能，或运行你已开启的自动化（如 AI 标签页分组、定期书签体检）时读取网页信息。',
    ],
  },
  {
    title: '5. 会发送给哪些服务',
    paragraphs: [
      'AI 服务（你配置的服务商或本地端点）：使用 AI 分析网页时，发送网页网址、标题、描述和提取的正文片段；分析文本剪藏时，发送剪藏原文与来源信息；分析图片剪藏时，扩展会从图片原地址获取图片，并把图片、图片地址、说明文字和来源页面信息一并发送。',
      'AI 服务（续）：使用 AI 标签页分组时，发送当前标签页的标题、网址和页面元信息，以及同一窗口内其他标签页的部分标题、域名和已有分组名称；使用 Agent 时，发送你的提问，以及 Agent 为完成任务读取的收藏信息（如标题、网址、摘要和正文片段）。Agent 不会读取 API Key、WebDAV 凭据等敏感配置。',
      'Embedding 服务：启用语义搜索后，发送收藏的标题、描述和正文片段，用于生成向量索引。',
      '隐私控制：你可以设置隐私域名并使用自动隐私检测，匹配的页面会跳过 AI 分析，默认也不会截图；隐私域名中的收藏不会发送给 Embedding 服务。图片分析可在 AI 设置中单独关闭。第三方服务如何处理数据，受该服务商的隐私政策约束；云端 API 费用按服务商定价计算。',
      'WebDAV（你自己的服务器）：启用后，扩展把界面设置、书签及书签正文、剪藏、分类、工作空间和 Tab 分组规则等结构化数据同步到你配置的服务器；删除操作以轻量记录同步。同步内容不包含 AI 配置、API Key、WebDAV 凭据、本地快照文件和页面截图。',
      '网站图标服务：显示网站图标时，扩展会向第三方图标服务 Cravatar（cn.cravatar.com）请求对应网站的图标。请求包含该网站的域名，不包含完整网址、标题或正文。',
      '网站本身与本机应用：书签体检会直接请求书签网址以检查能否访问，请求不携带 Cookie，定期体检默认关闭；分析图片剪藏时，扩展会从图片原地址下载图片。使用 Obsidian 工作流时，笔记通过剪贴板和 Obsidian 协议交给你本机的 Obsidian 应用。',
    ],
  },
  {
    title: '6. 数据共享与出售',
    paragraphs: [
      'HamHome 不出售你的个人数据，也不会把你的收藏库提供给广告商、数据经纪商或开发者的分析平台。',
      '除第 3 节所述的浏览器同步存储和第 5 节所列的服务外，扩展不会把你的收藏内容发送给其他第三方。',
    ],
  },
  {
    title: '7. 数据保留与控制',
    paragraphs: [
      '数据会一直保留在你的浏览器中，直到你删除收藏、清除快照或截图、重置扩展数据、卸载扩展，或通过导入覆盖数据。删除的书签会先进入回收站并保留 30 天；到期或手动彻底删除后，只保留用于同步删除结果的轻量记录。',
      '你可以在扩展中查看、编辑、删除、导出（JSON/HTML）和导入自己的数据，JSON 备份不包含页面截图；也可以通过浏览器的扩展管理清除本地存储。',
    ],
  },
  {
    title: '8. 安全措施',
    paragraphs: [
      'HamHome 尽量减少不必要的数据外发。你填写的 API Key、WebDAV 地址与凭据仅用于实现你启用的功能。',
      '任何设备、浏览器环境或第三方服务都无法保证绝对安全，请妥善保管你的设备和外部服务凭据。',
    ],
  },
  {
    title: '9. 政策更新与联系方式',
    paragraphs: [
      '如果产品的数据处理方式发生重大变化，我们会更新本页面，并修改“最后更新”日期。',
      `如需反馈隐私相关问题，可通过 GitHub Issues 联系项目维护者：${REPOSITORY_URL}/issues`,
    ],
  },
];

const enSections: PrivacyPolicySection[] = [
  {
    title: '1. Scope',
    paragraphs: [
      'This policy applies to the HamHome browser extension for Chrome, Edge and Firefox. HamHome is an open-source, local-first web clipper and tab manager for saving pages, text and images, searching saved content, and saving and restoring tab workspaces.',
      'HamHome requires no account, and the developer does not operate servers that receive your collections. Data is sent to a service only when you use the features listed in Section 5.',
      'This website uses Microsoft Clarity to analyze page visits and interactions. That is separate from your extension data; the extension itself contains no analytics or advertising code.',
    ],
  },
  {
    title: '2. Data We Process',
    paragraphs: [
      'Collections: URLs, titles, descriptions and summaries, categories, tags, saved times and extracted text of page bookmarks; the quoted text and source of text clips; and the image URL, source page, size, format and dominant colors of image clips.',
      'Additional content: local HTML/Markdown snapshots and page screenshots (visible area only) that you choose to save, plus search indexes, vector data, AI analysis cache and Agent conversations.',
      'Tabs and settings: page URLs, titles, icons, order, pinned state and grouping in workspaces; Tab Group rules; UI preferences; and the AI, embedding and WebDAV settings you enter.',
    ],
  },
  {
    title: '3. Where Data Is Stored',
    paragraphs: [
      'Collections, snapshots, screenshots, indexes, AI analysis cache, Agent conversations, workspaces and WebDAV settings are stored in the extension’s local storage and IndexedDB in your current browser.',
      'Categories, UI settings, AI and embedding settings (including the API keys you enter), custom filters, pinned items and Tab Group rules are stored in the browser’s extension sync storage (storage.sync). If browser account sync is turned on, your browser syncs this data to other devices signed in to the same account; that process is handled by the browser vendor.',
    ],
  },
  {
    title: '4. Browser Permissions',
    paragraphs: [
      'storage, unlimitedStorage: store collections, snapshots, screenshots, indexes and settings without hitting the browser’s default storage quota as data grows.',
      'activeTab, scripting: read the current page and show the HamHome interface on it when you save the page, create a clip or open the in-page panel.',
      'tabs: read tab titles, URLs, icons and pinned state to save and restore workspaces and organize tabs with rules. tabGroups (Chrome and Edge only): create and update native tab groups according to your rules.',
      'contextMenus: add right-click entries for saving pages, text and images. bookmarks: import browser bookmarks and, when you choose, write organized bookmarks back to the bookmark bar. clipboardWrite: copy notes to the clipboard before saving them to Obsidian through its protocol. alarms: run scheduled WebDAV sync, the periodic bookmark health checks you enable, and expired-trash cleanup.',
      'Access to all sites (<all_urls>): lets saving, clipping, page screenshots and the in-page panel work on any website, and allows the extension to connect to the AI and WebDAV endpoints you configure and to request bookmark URLs during health checks. HamHome reads page information only when you use a related feature or when an automation you enabled runs, such as AI tab grouping or periodic health checks.',
    ],
  },
  {
    title: '5. Services That Receive Data',
    paragraphs: [
      'AI providers (your configured provider or local endpoint): page analysis sends the page URL, title, description and extracted text excerpts; text clip analysis sends the clipped text and its source; image clip analysis fetches the image from its original URL and sends the image together with its URL, caption text and source page information.',
      'AI providers (continued): AI tab grouping sends the current tab’s title, URL and page metadata, plus some titles and domains of other tabs in the same window and the names of existing groups. The Agent sends your messages and the saved content it reads to complete the task, such as titles, URLs, summaries and text excerpts. The Agent does not read sensitive settings such as API keys or WebDAV credentials.',
      'Embedding providers: when semantic search is enabled, titles, descriptions and text excerpts of saved items are sent to build the vector index.',
      'Privacy controls: privacy domains and automatic privacy detection make matching pages skip AI analysis and, by default, screenshots; items on privacy domains are not sent to the embedding provider. Image analysis can be turned off separately in AI settings. Each third-party provider’s privacy terms govern how it handles data, and cloud API fees follow the provider’s pricing.',
      'WebDAV (your own server): when enabled, the extension syncs structured data such as UI settings, bookmarks and their text, clips, categories, workspaces and Tab Group rules to the server you configure; deletions sync as lightweight records. AI settings, API keys, WebDAV credentials, local snapshot files and page screenshots are not synced.',
      'Site icon service: to display site icons, the extension requests them from the third-party icon service Cravatar (cn.cravatar.com). Each request contains the site’s domain, not the full URL, title or page content.',
      'Websites and local apps: bookmark health checks request bookmark URLs directly to see whether they are reachable, without sending cookies; periodic checks are off by default. Image clip analysis downloads the image from its original URL. The Obsidian workflow hands notes to the Obsidian app on your device through the clipboard and the Obsidian protocol.',
    ],
  },
  {
    title: '6. Sharing and Sale of Data',
    paragraphs: [
      'HamHome does not sell your personal data and does not provide your collections to advertisers, data brokers or developer-run analytics services.',
      'Apart from the browser sync storage described in Section 3 and the services listed in Section 5, the extension does not send your collections to any other third party.',
    ],
  },
  {
    title: '7. Retention and Control',
    paragraphs: [
      'Your data stays in your browser until you delete items, remove snapshots or screenshots, reset extension data, uninstall the extension, or overwrite data through import. Deleted bookmarks stay in Trash for 30 days; after that, or when you delete them permanently, only a lightweight record remains so the deletion can sync.',
      'You can review, edit, delete, export (JSON/HTML) and import your data inside HamHome; JSON backups do not include page screenshots. You can also clear local storage through your browser’s extension settings.',
    ],
  },
  {
    title: '8. Security',
    paragraphs: [
      'HamHome avoids unnecessary external transfers. The API keys, WebDAV endpoints and credentials you enter are used only for the features you enable.',
      'No device, browser environment or third-party service can guarantee absolute security, so please protect your device and external credentials carefully.',
    ],
  },
  {
    title: '9. Updates and Contact',
    paragraphs: [
      'If our data practices change materially, we will update this page and revise the last updated date.',
      `For privacy-related questions, please contact the project maintainer via GitHub Issues: ${REPOSITORY_URL}/issues`,
    ],
  },
];

export const PRIVACY_POLICY_SECTIONS: Record<SupportedLanguage, PrivacyPolicySection[]> = {
  zh: zhSections,
  en: enSections,
};
