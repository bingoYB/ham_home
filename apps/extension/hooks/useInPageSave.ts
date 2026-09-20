/**
 * useInPageSave Hook
 * 页内保存流程的状态机：触发 -> 提取页面内容 -> AI 分析 -> 展示保存表单
 *
 * 相比旧的 Popup 流程，页内流程在用户切换焦点、操作页面时不会被打断，
 * AI 分析期间只在角落展示一个 loading 浮窗，分析完成后再展开保存表单。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { getFavicon } from "@hamhome/utils";
import { bookmarkStorage, configStorage } from "@/lib/storage";
import { containsPrivateContent, isNonBookmarkableUrl } from "@/lib/privacy";
import { extractPageContent } from "@/utils/page-extract";
import { saveFlowBus } from "@/utils/save-flow-bus";
import { applyClipTargetToPageContent } from "@/utils/clip-context";
import type {
  LocalBookmark,
  PageContent,
  SaveFlowClipContext,
  SaveFlowTrigger,
} from "@/types";

export type InPageSavePhase =
  /** 未触发 */
  | "idle"
  /** 提取页面内容中 */
  | "preparing"
  /** AI 分析中（保存表单已挂载但未展示） */
  | "analyzing"
  /** 展示保存表单 */
  | "ready"
  /** 保存成功提示 */
  | "saved"
  /** 无法保存（浏览器内部页面等） */
  | "error";

export interface UseInPageSaveResult {
  phase: InPageSavePhase;
  pageContent: PageContent | null;
  existingBookmark: LocalBookmark | null;
  clipContext: SaveFlowClipContext | null;
  error: string | null;
  /** 手动触发保存流程 */
  start: (trigger?: SaveFlowTrigger) => void;
  /** 跳过等待 AI 分析，立即展示表单 */
  showFormNow: () => void;
  /** AI 分析（或初始化）结束 */
  handleInitialLoadSettled: () => void;
  /** 保存成功 */
  handleSaved: () => void;
  /** 关闭浮窗 */
  close: () => void;
}

/** 保存成功提示的展示时长 */
const SAVED_TOAST_DURATION = 1600;
/** 无法保存提示的展示时长 */
const ERROR_TOAST_DURATION = 4000;

/** AI 是否已完成配置（与 useSavePanel 中的判断保持一致） */
function isAIConfigured(config: {
  provider: string;
  baseUrl?: string;
  apiKey?: string;
}): boolean {
  return config.provider === "ollama" ? !!config.baseUrl : !!config.apiKey;
}

export function useInPageSave(): UseInPageSaveResult {
  const [phase, setPhase] = useState<InPageSavePhase>("idle");
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [existingBookmark, setExistingBookmark] =
    useState<LocalBookmark | null>(null);
  const [clipContext, setClipContext] = useState<SaveFlowClipContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 避免过期的异步流程覆盖新流程的状态
  const runIdRef = useRef(0);
  const phaseRef = useRef<InPageSavePhase>("idle");
  phaseRef.current = phase;

  const close = useCallback(() => {
    runIdRef.current += 1;
    setPhase("idle");
    setPageContent(null);
    setExistingBookmark(null);
    setClipContext(null);
    setError(null);
  }, []);

  const start = useCallback((trigger?: SaveFlowTrigger) => {
    // 流程进行中或表单已展开时忽略重复触发（例如用户连按快捷键）；
    // 保存成功提示 / 无法保存提示期间再次触发则重新开始
    const phase = phaseRef.current;
    if (phase === "preparing" || phase === "analyzing" || phase === "ready") {
      return;
    }

    const runId = ++runIdRef.current;
    const isCurrent = () => runIdRef.current === runId;

    setError(null);
    setPageContent(null);
    setExistingBookmark(null);
    setClipContext(trigger?.clip ?? null);
    setPhase("preparing");

    void (async () => {
      const sourcePageUrl = window.location.href;

      try {
        if (isNonBookmarkableUrl(sourcePageUrl)) {
          if (!isCurrent()) return;
          setError("cannotBookmarkPage");
          setPhase("error");
          return;
        }

        const privacyCheck = await containsPrivateContent(sourcePageUrl);
        const sourceContent: PageContent = privacyCheck.isPrivate
          ? {
              url: sourcePageUrl,
              title: document.title,
              content: "",
              htmlContent: "",
              textContent: "",
              excerpt: "",
              favicon: getFavicon(sourcePageUrl),
              isPrivate: true,
              privacyReason: privacyCheck.reason,
            }
          : ((await extractPageContent()) ?? {
              url: sourcePageUrl,
              title: document.title,
              content: "",
              htmlContent: "",
              textContent: "",
              excerpt: "",
              favicon: getFavicon(sourcePageUrl),
              isPrivate: false,
            });
        const content = applyClipTargetToPageContent(
          sourceContent,
          trigger?.clip,
        );

        const [bookmark, aiConfig] = await Promise.all([
          bookmarkStorage.getBookmarkByUrl(content.url),
          configStorage.getAIConfig(),
        ]);

        if (!isCurrent()) return;

        setPageContent(content);
        setExistingBookmark(bookmark);

        // 预判是否会执行 AI 分析：不会分析时直接展示表单，避免空等
        // 剪藏以图片 / 选中文字本身为分析主体，与来源页是否有正文无关
        const clip = trigger?.clip;
        const isImageClip = clip?.type === "image" && !!clip.imageSourceUrl;
        const isHighlightClip = clip?.type === "highlight" && !!clip.text?.trim();
        const hasAnalyzableSubject =
          isImageClip ||
          isHighlightClip ||
          !!(content.content || content.textContent);
        // 图片剪藏会把原图发送给模型，受独立开关控制
        const imageAnalysisAllowed =
          !isImageClip || aiConfig.enableImageAnalysis !== false;

        const willAnalyze =
          !bookmark &&
          !content.isPrivate &&
          isAIConfigured(aiConfig) &&
          hasAnalyzableSubject &&
          imageAnalysisAllowed;

        setPhase(willAnalyze ? "analyzing" : "ready");
      } catch (err) {
        console.error("[useInPageSave] Failed to prepare save flow:", err);
        if (!isCurrent()) return;
        setError("extractFailed");
        setPhase("error");
      }
    })();
  }, []);

  const showFormNow = useCallback(() => {
    setPhase((prev) => (prev === "analyzing" ? "ready" : prev));
  }, []);

  const handleInitialLoadSettled = useCallback(() => {
    setPhase((prev) => (prev === "analyzing" ? "ready" : prev));
  }, []);

  const handleSaved = useCallback(() => {
    setPhase((prev) => (prev === "idle" ? prev : "saved"));
  }, []);

  // 订阅来自快捷键/右键菜单/Popup 的触发
  useEffect(() => saveFlowBus.subscribe(start), [start]);

  // 保存成功 / 无法保存的提示自动消失
  useEffect(() => {
    if (phase !== "saved" && phase !== "error") return;

    const timer = window.setTimeout(
      () => close(),
      phase === "saved" ? SAVED_TOAST_DURATION : ERROR_TOAST_DURATION,
    );
    return () => window.clearTimeout(timer);
  }, [phase, close]);

  return {
    phase,
    pageContent,
    existingBookmark,
    clipContext,
    error,
    start,
    showFormNow,
    handleInitialLoadSettled,
    handleSaved,
    close,
  };
}
