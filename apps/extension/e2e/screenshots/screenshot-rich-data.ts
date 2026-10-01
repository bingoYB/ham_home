import type {
  AnalysisResult,
  BookmarkClip,
  BookmarkHealthRecord,
  LocalBookmark,
  LocalCategory,
} from "../../types";
import { DEMO_BOOKMARKS, SCREENSHOT_BASE_TIME } from "./screenshot-data";
import {
  PALETTE_COLORS,
  type ClipArtwork,
  type GalleryTemplate,
} from "./screenshot-visuals";

/**
 * Rich-content seeds for marketing screenshots: page screenshots for the
 * visual gallery, image / text clips, bookmark health results and trash.
 *
 * All sites here are fictional (.demo domains) so issue states such as
 * "broken" or "sign-in required" never describe a real website.
 */

const hour = 60 * 60 * 1000;
const day = 24 * hour;

export const DEMO_INSPIRATION_CATEGORY: LocalCategory = {
  id: "cat-inspiration",
  name: "Visual Inspiration",
  parentId: null,
  order: 7,
  icon: "VI",
  createdAt: SCREENSHOT_BASE_TIME - 47 * day,
};

export interface GallerySite {
  id: string;
  template: GalleryTemplate;
  title: string;
  url: string;
  description: string;
  categoryId: string;
  tags: string[];
  createdAt: number;
}

export const DEMO_GALLERY_SITES: GallerySite[] = [
  gallery("nimbus", "Nimbus Analytics Revenue Dashboard", "https://nimbus-analytics.demo/revenue", "KPI cards, area chart and plan breakdown in a calm dashboard layout.", "cat-data", ["dashboard", "analytics", "ui"], 6.2),
  gallery("aurora", "Aurora Payments Landing Page", "https://aurora-pay.demo/", "Dark gradient hero with a card stack and live transaction panel.", "cat-inspiration", ["landing", "fintech", "gradient"], 6.8),
  gallery("pillar", "Pillar Design System Color Tokens", "https://pillar-ds.demo/foundations/color", "Brand, neutral and semantic color scales with token names and hex values.", "cat-design", ["design-system", "tokens", "color"], 7.5),
  gallery("fieldnote", "Fieldnote Pricing Page", "https://fieldnote.demo/pricing", "Three-tier pricing with a highlighted team plan and yearly toggle.", "cat-product", ["pricing", "saas", "conversion"], 8.1),
  gallery("kiln", "Kiln Ceramics Shop", "https://kiln-ceramics.demo/shop", "Warm e-commerce grid with a seasonal collection banner.", "cat-inspiration", ["ecommerce", "retail", "warm"], 9.4),
  gallery("orbit", "Orbit API Reference", "https://docs.orbit.demo/api/events/create", "Three-column API docs with parameters, code samples and responses.", "cat-frontend", ["docs", "api", "developer"], 10.2),
  gallery("sprout", "Sprout Sprint Board", "https://sprout-board.demo/sprint-24", "Kanban board with labels, progress bars and assignees.", "cat-product", ["kanban", "productivity", "ui"], 11.6),
  gallery("lumen", "Lumen Studio Portfolio", "https://lumen-studio.demo/", "Bold portfolio typography with gradient case study tiles.", "cat-inspiration", ["portfolio", "branding", "typography"], 12.3),
  gallery("cadence", "Cadence Habit Tracker App", "https://cadence-app.demo/", "Mobile app landing with phone mockups, progress ring and streaks.", "cat-inspiration", ["mobile", "landing", "app"], 13.7),
  gallery("tern", "Tern Travel Planner", "https://tern-travel.demo/", "Scenic hero with an inline trip search and destination cards.", "cat-inspiration", ["travel", "search", "hero"], 15.2),
  gallery("margin", "Margin Magazine Issue 18", "https://margin-mag.demo/issue-18", "Editorial layout with a serif masthead and featured essay.", "cat-writing", ["editorial", "typography", "layout"], 16.8),
  gallery("harbor", "Harbor Onboarding Flow", "https://app.harbor-hq.demo/onboarding/workspace", "Multi-step onboarding with segmented inputs and choice cards.", "cat-product", ["onboarding", "forms", "saas"], 18.5),
];

export const DEMO_GALLERY_BOOKMARKS: LocalBookmark[] = DEMO_GALLERY_SITES.map(
  (site) => ({
    id: site.id,
    url: site.url,
    title: site.title,
    description: site.description,
    content: `${site.title}\n\n${site.description}`,
    categoryId: site.categoryId,
    tags: site.tags,
    favicon: "",
    hasSnapshot: false,
    createdAt: site.createdAt,
    updatedAt: site.createdAt,
  }),
);

/** Two copies of gallery pages saved again later, as imports and sync leave behind */
export const DEMO_DUPLICATE_BOOKMARKS: LocalBookmark[] = [
  {
    ...DEMO_GALLERY_BOOKMARKS[5],
    id: "bm-dup-orbit",
    url: `${DEMO_GALLERY_SITES[5].url}?utm_source=newsletter`,
    title: "Orbit API Reference · Create an event",
    createdAt: SCREENSHOT_BASE_TIME - 8.6 * day,
    updatedAt: SCREENSHOT_BASE_TIME - 8.6 * day,
  },
  {
    ...DEMO_GALLERY_BOOKMARKS[2],
    id: "bm-dup-pillar",
    url: `${DEMO_GALLERY_SITES[2].url}#brand`,
    title: "Pillar Color Tokens (brand)",
    createdAt: SCREENSHOT_BASE_TIME - 5.9 * day,
    updatedAt: SCREENSHOT_BASE_TIME - 5.9 * day,
  },
];

export interface ImageClipSeed {
  artwork: ClipArtwork;
  bookmark: LocalBookmark;
  clip: BookmarkClip;
}

export const IMAGE_CLIP_HOST = "https://images.hamhome.demo";

export const DEMO_IMAGE_CLIPS: ImageClipSeed[] = [
  imageClip("softLight", "img-soft-light", {
    title: "Soft Light Poster: Gradient Mesh Study",
    description: "A poster study with blurred coral, amber and lavender blobs behind heavy black type.",
    tags: ["poster", "gradient", "typography"],
    categoryId: "cat-inspiration",
    sourceUrl: "https://studio-notes.demo/posters/soft-light",
    sourceTitle: "Poster Series No. 03",
    colors: ["#F2EEE8", "#FF8A7A", "#FFC46B", "#A78BFA", "#1D1B1A"],
    offset: 2 * hour,
  }),
  imageClip("onboarding", "img-onboarding", {
    title: "Three-step Mobile Onboarding Screens",
    description: "Welcome, notification permissions and success screens sharing one layout rhythm.",
    tags: ["mobile", "onboarding", "ui"],
    categoryId: "cat-design",
    sourceUrl: "https://studio-notes.demo/case-studies/pocket-onboarding",
    sourceTitle: "Pocket onboarding case study",
    colors: ["#E8EDF8", "#0F172A", "#4F46E5", "#F59E0B", "#16A34A"],
    offset: day + 6 * hour,
  }),
  imageClip("palette", "img-palette", {
    title: "Desert Dusk Color Palette",
    description: "Five warm dusk tones from plum to sand, ready to map onto theme tokens.",
    tags: ["color", "palette", "branding"],
    categoryId: "cat-inspiration",
    sourceUrl: "https://studio-notes.demo/color/desert-dusk",
    sourceTitle: "Color Study 05",
    colors: PALETTE_COLORS,
    offset: 3 * day + 8 * hour,
  }),
  imageClip("cohort", "img-cohort", {
    title: "Weekly Retention Cohort Heatmap",
    description: "Cohort table where color intensity tracks the share of users still active each week.",
    tags: ["analytics", "retention", "dataviz"],
    categoryId: "cat-data",
    sourceUrl: "https://nimbus-analytics.demo/blog/retention-cohorts",
    sourceTitle: "Reading retention cohorts",
    colors: ["#F4F6FB", "#2563EB", "#1E3A8A", "#BFDBFE", "#334155"],
    offset: 4 * day + 5 * hour,
  }),
];

/** Image the user right-clicks in the in-page clip screenshot */
export const ICON_SET_IMAGE_URL = `${IMAGE_CLIP_HOST}/studio-notes/icon-set.png`;
export const ICON_SET_SOURCE_PAGE = {
  url: "https://studio-notes.demo/design-systems/icon-refresh",
  title: "Studio Notes — Refreshing our icon system",
};

export const ICON_SET_ANALYSIS: AnalysisResult = {
  title: "Rounded Glyph App Icon Set",
  summary:
    "Six rounded-square app icons with soft two-stop gradients and one stroke weight, a reference for the icon system refresh.",
  category: "Visual Inspiration",
  tags: ["icons", "ui", "gradient", "design-system"],
  imageMetadata: {
    colors: ["#EEF1F7", "#4F46E5", "#F97316", "#0D9488", "#DB2777"],
    width: 1200,
    height: 800,
    format: "PNG",
    mimeType: "image/png",
  },
};

export interface TextClipSeed {
  bookmark: LocalBookmark;
  clip: BookmarkClip;
}

export const DEMO_TEXT_CLIPS: TextClipSeed[] = [
  textClip("txt-capture", {
    text: "Good retrieval starts at capture time. A two-line summary written the day you save a page is worth more than a perfect taxonomy designed later.",
    note: "Use this framing in the onboarding checklist.",
    tags: ["knowledge", "writing", "onboarding"],
    categoryId: "cat-writing",
    sourceUrl: "https://fieldnote.demo/journal/personal-knowledge-base",
    sourceTitle: "Field Notes: Building a personal knowledge base",
    offset: day + 3 * hour,
  }),
  textClip("txt-design-review", {
    text: "Treat every design review as a search problem: if nobody can find the reference that motivated a decision, the decision will be argued again next quarter.",
    note: "Link design references from each spec.",
    tags: ["design", "process", "research"],
    categoryId: "cat-design",
    sourceUrl: "https://margin-mag.demo/essays/design-memory",
    sourceTitle: "Design memory for small teams",
    offset: 3 * day + 4 * hour,
  }),
  textClip("txt-ship", {
    text: "Ship the smallest version that proves the loop works, then let real usage decide which rough edges deserve polish.",
    tags: ["product", "strategy", "launch"],
    categoryId: "cat-product",
    sourceUrl: "https://fieldnote.demo/journal/small-launches",
    sourceTitle: "Notes on small launches",
    offset: 5 * day + 2 * hour,
  }),
];

/** Every bookmark the screenshot suite seeds, live bookmarks first */
export function showcaseBookmarks(now: number): LocalBookmark[] {
  return [
    ...DEMO_BOOKMARKS,
    ...DEMO_GALLERY_BOOKMARKS,
    ...DEMO_DUPLICATE_BOOKMARKS,
    ...DEMO_IMAGE_CLIPS.map((item) => item.bookmark),
    ...DEMO_TEXT_CLIPS.map((item) => item.bookmark),
    ...demoTrashBookmarks(now),
  ];
}

export function showcaseClips(): BookmarkClip[] {
  return [
    ...DEMO_IMAGE_CLIPS.map((item) => item.clip),
    ...DEMO_TEXT_CLIPS.map((item) => item.clip),
  ];
}

/**
 * Trash rows are relative to the real clock: the retention sweep and the
 * "purged in N days" badge both compare against Date.now().
 */
export function demoTrashBookmarks(now: number): LocalBookmark[] {
  const items: Array<[string, string, string, number]> = [
    ["Q2 Planning Offsite Agenda", "https://notes.hamhome.demo/q2-offsite-agenda", "cat-product", 1],
    ["Legacy Webhooks v1 Reference", "https://docs.orbit.demo/api/v1/webhooks", "cat-frontend", 4],
    ["Conference Travel Checklist", "https://tern-travel.demo/lists/conference-checklist", "cat-ops", 9],
    ["Moodboard Draft: Spring Campaign", "https://studio-notes.demo/moodboards/spring-draft", "cat-inspiration", 17],
    ["Old Pricing Experiment Notes", "https://fieldnote.demo/experiments/pricing-2025", "cat-product", 24],
    ["Temporary Staging Dashboard", "https://staging.nimbus-analytics.demo/", "cat-data", 28],
  ];
  return items.map(([title, url, categoryId, deletedDaysAgo], index) => {
    const deletedAt = now - deletedDaysAgo * day - index * 17 * 60 * 1000;
    return {
      id: `bm-trash-${index}`,
      url,
      title,
      description: "",
      categoryId,
      tags: [],
      favicon: "",
      hasSnapshot: false,
      createdAt: deletedAt - 40 * day,
      updatedAt: deletedAt,
      isDeleted: true,
      deletedAt,
    };
  });
}

/**
 * Health results from a scan one day before the screenshot base time.
 * The most recent regular bookmarks stay unchecked, like pages saved after
 * the last scan.
 */
export function demoHealthRecords(): BookmarkHealthRecord[] {
  const checkedAt = SCREENSHOT_BASE_TIME - day + 12 * 60 * 1000;
  const uncheckedIds = new Set(["bm-00", "bm-01", "bm-02", "bm-dup-pillar"]);
  const issues: Record<string, Partial<BookmarkHealthRecord>> = {
    "gallery-fieldnote": {
      status: "redirected",
      httpStatus: 200,
      finalUrl: "https://fieldnote.demo/plans",
      issueCodes: ["redirected"],
    },
    "gallery-kiln": { status: "broken", httpStatus: 404, issueCodes: ["broken"] },
    "gallery-harbor": {
      status: "auth_required",
      httpStatus: 401,
      issueCodes: ["auth_required"],
    },
    "gallery-tern": {
      status: "rate_limited",
      httpStatus: 429,
      issueCodes: ["rate_limited"],
    },
    "gallery-margin": {
      status: "server_error",
      httpStatus: 503,
      issueCodes: ["server_error"],
    },
    "gallery-cadence": {
      status: "network_error",
      issueCodes: ["timeout"],
      error: "Request timed out",
    },
    "gallery-orbit": {
      status: "healthy",
      httpStatus: 200,
      issueCodes: ["duplicate_url:gallery-orbit"],
    },
    "bm-dup-orbit": {
      status: "healthy",
      httpStatus: 200,
      issueCodes: ["duplicate_url:gallery-orbit"],
    },
  };

  return [...DEMO_BOOKMARKS, ...DEMO_GALLERY_BOOKMARKS, ...DEMO_DUPLICATE_BOOKMARKS]
    .filter((bookmark) => !uncheckedIds.has(bookmark.id))
    .map((bookmark, index) => ({
      bookmarkId: bookmark.id,
      sourceUrl: bookmark.url,
      checkedAt: checkedAt + index * 1500,
      status: "healthy",
      httpStatus: 200,
      issueCodes: [],
      responseTimeMs: 140 + ((index * 73) % 520),
      ...issues[bookmark.id],
    }));
}

function gallery(
  template: GalleryTemplate,
  title: string,
  url: string,
  description: string,
  categoryId: string,
  tags: string[],
  daysAgo: number,
): GallerySite {
  return {
    id: `gallery-${template}`,
    template,
    title,
    url,
    description,
    categoryId,
    tags,
    createdAt: SCREENSHOT_BASE_TIME - daysAgo * day,
  };
}

function imageClip(
  artwork: ClipArtwork,
  id: string,
  options: {
    title: string;
    description: string;
    tags: string[];
    categoryId: string;
    sourceUrl: string;
    sourceTitle: string;
    colors: string[];
    offset: number;
  },
): ImageClipSeed {
  const imageUrl = `${IMAGE_CLIP_HOST}/clips/${id}.png`;
  const createdAt = SCREENSHOT_BASE_TIME - options.offset;
  return {
    artwork,
    bookmark: {
      id,
      url: imageUrl,
      title: options.title,
      description: options.description,
      categoryId: options.categoryId,
      tags: options.tags,
      favicon: "",
      hasSnapshot: false,
      createdAt,
      updatedAt: createdAt,
    },
    clip: {
      id: `clip-${id}`,
      bookmarkId: id,
      type: "image",
      imageSourceUrl: imageUrl,
      sourceUrl: options.sourceUrl,
      sourceTitle: options.sourceTitle,
      imageMetadata: {
        colors: options.colors,
        format: "PNG",
        mimeType: "image/png",
      },
      createdAt,
      updatedAt: createdAt,
    },
  };
}

function textClip(
  id: string,
  options: {
    text: string;
    note?: string;
    tags: string[];
    categoryId: string;
    sourceUrl: string;
    sourceTitle: string;
    offset: number;
  },
): TextClipSeed {
  const createdAt = SCREENSHOT_BASE_TIME - options.offset;
  const fragment = encodeURIComponent(options.text.slice(0, 60).trim()).replace(
    /-/g,
    "%2D",
  );
  const title =
    options.text.length > 80 ? `${options.text.slice(0, 80)}…` : options.text;
  return {
    bookmark: {
      id,
      url: `${options.sourceUrl}#:~:text=${fragment}`,
      title,
      description: "",
      content: options.text,
      categoryId: options.categoryId,
      tags: options.tags,
      favicon: "",
      hasSnapshot: false,
      createdAt,
      updatedAt: createdAt,
    },
    clip: {
      id: `clip-${id}`,
      bookmarkId: id,
      type: "highlight",
      text: options.text,
      note: options.note,
      sourceUrl: options.sourceUrl,
      sourceTitle: options.sourceTitle,
      selector: { exact: options.text },
      createdAt,
      updatedAt: createdAt,
    },
  };
}
