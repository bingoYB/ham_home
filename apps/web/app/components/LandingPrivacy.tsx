'use client';

interface LandingPrivacyProps {
  isEn: boolean;
}

export function LandingPrivacy({ isEn }: LandingPrivacyProps) {
  const texts = {
    kicker: isEn ? 'Data boundaries' : '数据与隐私边界',
    title: isEn ? 'AI has boundaries. Stored data stays inspectable.' : 'AI 有边界，数据也该可检查',
    desc: isEn
      ? 'HamHome stores primary data in browser storage and IndexedDB, lets you exclude sensitive domains from AI analysis, and keeps credentials out of Agent automation. Image clips reach your AI provider only while image analysis is on, and never from private pages.'
      : 'HamHome 将主要数据保存在浏览器存储和 IndexedDB 中，支持将敏感域名排除在 AI 分析之外，也不会让 Agent 自动读取或代填凭据。图片剪藏只在开启图片分析时发送给你的 AI 服务，隐私页面始终不会发送。',
    localTitle: isEn ? 'Local storage' : '本地存储',
    localDesc: isEn
      ? 'Bookmarks, snapshots, page screenshots, AI cache, and vectors are stored locally and can be managed separately.'
      : '书签、快照、页面截图、AI 缓存和向量数据都在本地，并可分项管理。',
    domainTitle: isEn ? 'Private domains' : '隐私域名',
    domainDesc: isEn
      ? 'Sensitive sites such as banking, email, and admin systems can bypass AI analysis and page screenshots.'
      : '银行、邮箱、后台等敏感站点可直接跳过 AI 分析和页面截图。',
    syncTitle: isEn ? 'Sync is explicit and structured' : '同步是显式且结构化的',
    syncDesc: isEn
      ? 'WebDAV sync writes structured HamHome data, including clips and deletion tombstones, under /HamHomeSync. Snapshot files and page screenshots stay on this device unless you download them or send Markdown notes to Obsidian.'
      : 'WebDAV 会在 /HamHomeSync 下同步结构化数据，包括剪藏和删除墓碑。快照文件与页面截图默认只在本机，除非你手动下载，或通过 Obsidian Markdown 笔记流程另行处理。',
    sensitiveTitle: isEn ? 'Sensitive values stay manual' : '敏感项必须手动填写',
    sensitiveDesc: isEn
      ? 'API keys, Base URLs, privacy domains, WebDAV credentials, and browser shortcuts are configured by the user, not by the Agent.'
      : 'API Key、Base URL、隐私域名、WebDAV 凭据和浏览器快捷键都由用户手动配置，Agent 不代填。',
  };

  return (
    <section className="mx-auto grid w-full gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-24 container">
      <div className="max-w-2xl">
        <p className="text-sm font-bold text-[#0f766e] dark:text-[#5eead4]">{texts.kicker}</p>
        <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">
          {texts.title}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          {texts.desc}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-lg border bg-card/60 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-foreground">{texts.localTitle}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{texts.localDesc}</p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
            <span className="block h-full w-[64%] rounded-full bg-gradient-to-r from-[#2dd4bf] to-[#818cf8]" />
          </div>
        </article>

        <article className="rounded-lg border bg-card/60 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-foreground">{texts.domainTitle}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{texts.domainDesc}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground">
              mail.example.com
            </span>
            <span className="rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground">
              bank.example.com
            </span>
          </div>
        </article>

        <article className="rounded-lg border bg-card/60 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-foreground">{texts.syncTitle}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{texts.syncDesc}</p>
        </article>

        <article className="rounded-lg border bg-card/60 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-foreground">{texts.sensitiveTitle}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{texts.sensitiveDesc}</p>
        </article>
      </div>
    </section>
  );
}
