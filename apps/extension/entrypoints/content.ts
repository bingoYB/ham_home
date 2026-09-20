/**
 * Content Script - 网页内容提取 + UI 注入
 * 页面内容提取逻辑见 @/utils/page-extract
 * 使用 createShadowRootUi 注入书签面板与页内保存浮窗
 */
/// <reference path="../.wxt/wxt.d.ts" />
import { browser } from "wxt/browser";
import "../style.css";
import { configStorage } from "@/lib/storage/config-storage";
import { extractPageContent } from "@/utils/page-extract";
import { saveFlowBus, type SaveFlowTrigger } from "@/utils/save-flow-bus";
import { registerSingleFileTestHelpers, handleExtractSingleFileHtmlResponse } from "@/utils/single-file-capture";
import { keepShadowRootDocumentStyles } from "@/utils/shadow-root-style-guard";
import { enrichClipContext } from "@/utils/clip-context";

let captureUiContainer: HTMLElement | null = null;

// 监听来自 Popup/Background 的消息
browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EXTRACT_CONTENT") {
    extractPageContent().then((content) => {
      sendResponse(content);
    });

    return true; // 保持消息通道开放
  }

  if (message.type === "EXTRACT_HTML") {
    // 返回清理后的页面 HTML（供快照功能使用）
    const html = document.documentElement.outerHTML;
    sendResponse({ html });
    return true;
  }

  if (message.type === "EXTRACT_SINGLEFILE_HTML") {
    handleExtractSingleFileHtmlResponse(message.captureId, sendResponse);
    return true;
  }

  if (message.type === "START_SAVE_FLOW") {
    // 页内保存流程：由快捷键/右键菜单/Popup 触发，在当前页面展示保存浮窗
    const trigger: SaveFlowTrigger = {
      source: message.source ?? "unknown",
      clip: enrichClipContext(message.clip),
    };
    // 回执让调用方知道页内流程已接管，否则调用方会回退到 Popup；
    // 用户在设置中选择在扩展弹窗中保存时，页面内不接管本次保存
    const takeOver = () => {
      saveFlowBus.emit(trigger);
      sendResponse({ ok: true });
    };
    configStorage
      .getSettings()
      .then((settings) => {
        if (settings.usePopupSavePanel) {
          sendResponse({ ok: false });
          return;
        }
        takeOver();
      })
      .catch(takeOver);
    return true;
  }

  if (message.type === "SET_CAPTURE_VISIBILITY") {
    if (captureUiContainer) {
      captureUiContainer.style.visibility = message.visible ? "" : "hidden";
    }
    if (message.visible) {
      sendResponse({ ok: true });
    } else {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => sendResponse({ ok: true })),
      );
    }
    return true;
  }

  return false;
});

// 导出 WXT content script 配置
export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",
  async main(ctx) {
    // registerSingleFileTestHelpers();

    // 动态导入 React 组件
    const { mountContentUI } = await import("@/components/contentUi/index");

    // 创建 Shadow Root UI
    const ui = await createShadowRootUi(ctx, {
      name: "hamhome-bookmark-panel",
      position: "overlay",
      zIndex: 99999,
      anchor: "body",
      onMount(container) {
        captureUiContainer = container;
        // 创建 React 挂载点
        const appRoot = document.createElement("div");
        appRoot.id = "hamhome-root";
        container.append(appRoot);

        // 挂载 React 应用
        const unmount = mountContentUI(appRoot);

        return { unmount };
      },
      onRemove(mounted) {
        captureUiContainer = null;
        mounted?.unmount();
      },
    });

    // 挂载 UI
    ui.mount();

    // 部分站点（如 Material for MkDocs 的 instant loading）在软导航时会重写 <head>，
    // 顺带删除 WXT 注入的 @property 样式，导致面板样式失效并意外显形
    keepShadowRootDocumentStyles(ctx);
  },
});
