import Link from 'next/link';
import type { SupportedLanguage } from '@/app/lib/language';
import { GUIDES } from '@/app/lib/guides';
import { localizedPath } from '@/app/lib/site';
import { Reveal } from './motion/Reveal';

interface LandingGuidesProps { language: SupportedLanguage; }

export function LandingGuides({ language }: LandingGuidesProps) {
  return (
    <section className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <Reveal as="h2" className="text-3xl font-bold">{language === 'en' ? 'Start with what you want to do' : '从你想完成的事情开始'}</Reveal>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {GUIDES.map((guide, index) => (
          <Reveal key={guide.slug} delay={(index % 2) * 90} className="h-full">
            <Link href={localizedPath(language, `guides/${guide.slug}`)} className="lift-card block h-full rounded-xl border border-border/70 p-5 hover:border-primary">
              <h3 className="text-lg font-semibold">{guide[language].title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{guide[language].description}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
