import { getFaqGroups } from '@/app/lib/faq';

interface LandingFAQProps { isEn: boolean; }

export function LandingFAQ({ isEn }: LandingFAQProps) {
  const groups = getFaqGroups(isEn);
  return (
    <section className="container mx-auto border-t border-border/10 px-4 py-16 sm:px-6 lg:px-8">
      <h2 className="mb-8 text-4xl font-semibold tracking-tight">{isEn ? 'Frequently asked questions' : '常见问题'}</h2>
      <div className="grid gap-8 md:grid-cols-[1fr_3fr]">
        <nav aria-label={isEn ? 'FAQ categories' : '常见问题分类'} className="flex flex-wrap content-start gap-3 md:flex-col">
          {groups.map((group) => <a key={group.id} href={`#faq-${group.id}`} className="text-sm font-medium text-muted-foreground hover:text-primary">{group.label}</a>)}
        </nav>
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.id} id={`faq-${group.id}`} className="scroll-mt-24">
              <h3 className="mb-3 text-lg font-semibold">{group.label}</h3>
              {group.items.map((faq, index) => (
                <details key={faq.question} open={index === 0} className="border-b border-border/30 py-4">
                  <summary className="cursor-pointer text-lg font-medium hover:text-primary">{faq.question}</summary>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
