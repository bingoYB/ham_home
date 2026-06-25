const fs = require('fs');
const file = 'apps/extension/entrypoints/background.ts';
let code = fs.readFileSync(file, 'utf8');

const replacement = `const newlyCreatedTabs = new Set<number>();\n\nexport default defineBackground(() => {`;
code = code.replace(`export default defineBackground(() => {`, replacement);

const onCreatedOriginal = `browser.tabs.onCreated.addListener((tab) => {\n    if (tab.id != null) {\n      void autoGroupTabFromRules(tab.id, tab, { allowAI: false });\n    }\n  });`;
const onCreatedNew = `browser.tabs.onCreated.addListener((tab) => {\n    if (tab.id != null) {\n      newlyCreatedTabs.add(tab.id);\n      if (tab.url || tab.pendingUrl) {\n        try {\n          tabDomainCache.set(tab.id, new URL((tab.url || tab.pendingUrl)!).hostname);\n        } catch {}\n      }\n      void autoGroupTabFromRules(tab.id, tab, { allowAI: false });\n    }\n  });`;
code = code.replace(onCreatedOriginal, onCreatedNew);

const onUpdatedOriginal = `browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {\n    if (changeInfo.status === "complete" || changeInfo.url) {\n      void autoGroupTabFromRules(tabId, {\n        ...tab,\n        url: changeInfo.url || tab.url,\n      }, {\n        allowAI: changeInfo.status === "complete",\n      });\n    }\n  });`;
const onUpdatedNew = `browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {\n    let isDomainChanged = false;\n    const currentUrl = changeInfo.url || tab.url;\n    if (currentUrl) {\n      try {\n        const currentDomain = new URL(currentUrl).hostname;\n        const previousDomain = tabDomainCache.get(tabId);\n        if (previousDomain && previousDomain !== currentDomain) {\n          isDomainChanged = true;\n        }\n        tabDomainCache.set(tabId, currentDomain);\n      } catch {}\n    }\n\n    if (changeInfo.status === "complete" || changeInfo.url) {\n      void autoGroupTabFromRules(tabId, {\n        ...tab,\n        url: currentUrl,\n      }, {\n        allowAI: changeInfo.status === "complete",\n        isDomainChanged,\n        isNewTab: newlyCreatedTabs.has(tabId),\n      });\n      if (changeInfo.status === "complete") {\n        newlyCreatedTabs.delete(tabId);\n      }\n    }\n  });`;
code = code.replace(onUpdatedOriginal, onUpdatedNew);

const autoGroupOriginal = `async function autoGroupTabFromRules(\n  tabId: number,\n  tab: { url?: string; pendingUrl?: string; title?: string; windowId?: number; pinned?: boolean },\n  options?: { allowAI?: boolean },\n) {`;
const autoGroupNew = `async function autoGroupTabFromRules(\n  tabId: number,\n  tab: { url?: string; pendingUrl?: string; title?: string; windowId?: number; pinned?: boolean },\n  options?: { allowAI?: boolean; isDomainChanged?: boolean; isNewTab?: boolean },\n) {`;
code = code.replace(autoGroupOriginal, autoGroupNew);

const callOriginal = `{ allowAI: options?.allowAI, description },`;
const callNew = `{ allowAI: options?.allowAI, description, isDomainChanged: options?.isDomainChanged, isNewTab: options?.isNewTab },`;
code = code.replace(callOriginal, callNew);

const cacheDeclOriginal = `let isCreatingContextMenu = false;`;
const cacheDeclNew = `let isCreatingContextMenu = false;\n\n// 缓存 tab 的域名，用于检测域名是否发生变化\nconst tabDomainCache = new Map<number, string>();`;
code = code.replace(cacheDeclOriginal, cacheDeclNew);

const onRemovedStr = `  browser.tabs.onRemoved.addListener((tabId) => {\n    tabDomainCache.delete(tabId);\n  });\n\n  // Service Worker 每次启动时创建右键菜单（确保菜单始终存在）`;
code = code.replace(`  // Service Worker 每次启动时创建右键菜单（确保菜单始终存在）`, onRemovedStr);

fs.writeFileSync(file, code);
