import { ArrowUpRight, CircleDot, GitPullRequest, MessagesSquare } from 'lucide-react';
import Image from 'next/image';
import { REPOSITORY_URL } from '@/app/lib/site';

interface LandingCommunityProps {
  isEn: boolean;
  isDark: boolean;
}

const channels = [
  {
    path: 'discussions', name: 'Discussions', Icon: MessagesSquare,
    en: 'Ask a question, suggest a feature, or share how you organize your bookmarks.',
    zh: '询问使用方法、讨论新想法，或分享你的书签整理方式。',
  },
  {
    path: 'issues', name: 'Issues', Icon: CircleDot,
    en: 'Report a bug with your browser, HamHome version, and steps to reproduce it.',
    zh: '反馈故障时，请附上浏览器、HamHome 版本和复现步骤。',
  },
  {
    path: 'pulls', name: 'Pull requests', Icon: GitPullRequest,
    en: 'Contribute a fix, improve a translation, or help edit the guides.',
    zh: '提交代码修复、翻译或文档改进，也可以参与评审。',
  },
];

export function LandingCommunity({ isEn, isDark }: LandingCommunityProps) {
  const qqImage = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/community/qq-group-${isDark ? 'dark' : 'light'}.jpg`;
  return (
    <section id="community" aria-labelledby="community-heading" className="container mx-auto scroll-mt-20 px-4 py-12 sm:px-6 lg:px-8">
      <h2 id="community-heading" className="mb-6 text-3xl font-bold tracking-tight">
        {isEn ? 'Community and support' : '社区交流与反馈'}
      </h2>
      <div className={isEn ? '' : 'grid items-start gap-6 lg:grid-cols-[3fr_2fr]'}>
        <ul className={isEn ? 'grid gap-3 md:grid-cols-3' : 'grid gap-3'}>
          {channels.map(({ path, name, Icon, en, zh }) => (
            <li key={path}>
              <a href={`${REPOSITORY_URL}/${path}`} className="group flex h-full items-start gap-3 rounded-xl border border-border/70 p-4 transition-colors hover:border-primary focus-visible:border-primary">
                <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="flex-1">
                  <span className="font-semibold">{name}</span>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{isEn ? en : zh}</p>
                </div>
                <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
              </a>
            </li>
          ))}
        </ul>
        {!isEn && (
          <div className="flex flex-wrap items-center gap-5 rounded-xl border border-border/70 p-5">
            <a href={qqImage} aria-label="查看 HamHome QQ 群二维码原图" className="block size-48 max-w-full shrink-0 overflow-hidden rounded-lg">
              {/* Frame the QR code on the original QQ card. Opening it shows the full-size image. */}
              <Image src={qqImage} alt="HamHome 交流群二维码" width={1361} height={2420} className="size-full scale-[1.33] object-cover object-[50%_55%]" />
            </a>
            <div className="min-w-36 flex-1">
              <h3 className="text-lg font-semibold">HamHome 交流群</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">用手机 QQ 扫码，或搜索群号加入。</p>
              <p className="mt-2 select-all font-mono text-lg font-semibold tracking-wide">1060145278</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
