/**
 * 书签去重工具
 *
 * 规范化后的 URL 是书签的业务身份：
 * - 本地新建书签时用它拒绝重复收藏（bookmark-storage）
 * - WebDAV 同步时用它把不同设备各自生成的 ID 对齐到同一条书签（sync-engine）
 * - 体检中心用它找出并批量清理重复项（BookmarkHealthPage）
 *
 * 三处必须共用同一套规则，否则同一个网址会在不同设备上各留一条记录。
 */

const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'ref',
  'fbclid',
  'gclid',
];

/**
 * 规范化 URL（移除 tracking 参数，统一格式）
 * 无法解析的 URL 原样返回，保证不会把两个非法 URL 误判为同一条
 */
export function normalizeBookmarkUrl(url: string): string {
  try {
    const parsed = new URL(url);
    TRACKING_PARAMS.forEach((param) => parsed.searchParams.delete(param));
    // 移除末尾斜杠
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

/**
 * 参与去重所需的最小书签字段（本地书签与远端 meta 都满足）
 */
export interface DedupCandidate {
  id: string;
  url: string;
  createdAt: number;
  isDeleted?: boolean;
}

export interface DuplicateGroup<T extends DedupCandidate> {
  normalizedUrl: string;
  /** 保留项：最早创建的一条 */
  canonical: T;
  /** 应被合并掉的其余记录 */
  duplicates: T[];
}

/**
 * 在多条记录中选出保留项
 * 规则必须是纯函数且与设备无关：先比创建时间，再比 ID 字典序，
 * 这样每台设备都会独立得出同一个结论，同步才能收敛。
 */
function compareCandidates(a: DedupCandidate, b: DedupCandidate): number {
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * 按规范化 URL 分组，返回存在重复的分组（已删除的记录不参与）
 *
 * @param normalize 自定义规范化规则，返回 null 表示该条不参与去重。
 *   同步默认用 normalizeBookmarkUrl（保留 hash），因为文字剪藏正是靠
 *   Text Fragment 区分同一页面的不同选段，合并会丢数据；体检中心可以传入
 *   更宽松的规则，由用户确认后再清理。
 */
export function buildDuplicateGroups<T extends DedupCandidate>(
  items: T[],
  normalize: (url: string) => string | null = normalizeBookmarkUrl,
): DuplicateGroup<T>[] {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    if (item.isDeleted) continue;
    const normalizedUrl = normalize(item.url);
    if (normalizedUrl === null) continue;
    const group = groups.get(normalizedUrl);
    if (group) {
      group.push(item);
    } else {
      groups.set(normalizedUrl, [item]);
    }
  }

  const result: DuplicateGroup<T>[] = [];
  for (const [normalizedUrl, group] of groups) {
    if (group.length < 2) continue;
    const [canonical, ...duplicates] = [...group].sort(compareCandidates);
    result.push({ normalizedUrl, canonical, duplicates });
  }
  return result;
}
