'use client';

interface LandingPrivacyProps {
  isEn: boolean;
}

export function LandingPrivacy({ isEn }: LandingPrivacyProps) {
  const texts = {
    kicker: isEn ? 'Privacy first' : '隐私优先',
    title: isEn ? 'AI has boundaries. Your data stays controllable.' : 'AI 有边界，数据也该可控',
    desc: isEn
      ? 'HamHome provides granular storage management, private-domain exclusions, and controlled cleanup. You can enjoy AI productivity while deciding what never enters analysis.'
      : 'HamHome 提供细粒度存储管理、隐私域名黑名单和可控的数据清理。你可以享受 AI 效率，也能决定哪些内容不进入分析流程。',
    localTitle: isEn ? 'Local storage' : '本地存储',
    localDesc: isEn
      ? 'Chrome Storage + IndexedDB. Bookmarks, snapshots, and vectors are visible by category.'
      : 'Chrome Storage + IndexedDB，书签、快照、向量数据分项可见。',
    domainTitle: isEn ? 'Private domains' : '隐私域名',
    domainDesc: isEn
      ? 'Sensitive sites such as banking, email, and admin systems can bypass AI analysis.'
      : '银行、邮箱、后台等敏感站点可直接跳过 AI 分析。',
    syncTitle: isEn ? 'Sync does not mean losing control' : '同步不等于失控',
    syncDesc: isEn
      ? 'WebDAV supports encrypted sync, status visibility, and remote cleanup for cross-device migration without giving up control.'
      : 'WebDAV 支持加密同步、状态提示和远程数据清理，适合在多设备之间迁移，又不牺牲控制权。',
  };

  return (
    <section className="mx-auto grid w-full gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-24 container">
      <div className="max-w-2xl">
        <p className="text-sm font-bold text-[#2dd4bf]">{texts.kicker}</p>
        <h2 className="mt-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
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

        <article className="rounded-lg border bg-card/60 p-6 shadow-sm md:col-span-2">
          <h3 className="text-lg font-bold text-foreground">{texts.syncTitle}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{texts.syncDesc}</p>
        </article>
      </div>
    </section>
  );
}
