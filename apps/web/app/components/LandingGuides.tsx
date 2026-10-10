import Link from 'next/link';
import type { SupportedLanguage } from '@/app/lib/language';
import { GUIDES } from '@/app/lib/guides';
import { localizedPath } from '@/app/lib/site';

interface LandingGuidesProps { language: SupportedLanguage; }

export function LandingGuides({ language }: LandingGuidesProps) {
  return (
    <section className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold">{language === 'en' ? 'Start with what you want to do' : '从你想完成的事情开始'}</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {GUIDES.map((guide) => (
          <Link key={guide.slug} href={localizedPath(language, `guides/${guide.slug}`)} className="rounded-xl border border-border/70 p-5 transition-colors hover:border-primary">
            <h3 className="text-lg font-semibold">{guide[language].title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{guide[language].description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
