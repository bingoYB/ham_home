interface AgentExamplesProps { isEn: boolean; }

export function AgentExamples({ isEn }: AgentExamplesProps) {
  const examples = isEn ? [
    { request: 'Find the React articles I saved last week.', result: 'Search saved content and return matching sources.' },
    { request: 'Summarize these saved pages.', result: 'Review saved content and return a summary with bookmark references.' },
    { request: 'Check my WebDAV sync status and open its settings.', result: 'Inspect status and open the relevant extension page; credentials stay manual.' },
  ] : [
    { request: '帮我找上周保存的 React 文章。', result: '检索已保存内容，返回匹配的收藏来源。' },
    { request: '总结这些已保存的网页。', result: '阅读收藏内容并给出带书签引用的总结。' },
    { request: '检查 WebDAV 同步状态，打开对应设置。', result: '查看状态并打开相关插件页面，凭据仍由你手动填写。' },
  ];
  return (
    <section className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold">{isEn ? 'Ask for help with a specific task' : '用一句话，让 Agent 帮你完成具体任务'}</h2>
      <p className="mt-3 text-muted-foreground">{isEn ? 'The optional Agent searches, summarizes and runs supported tools, showing its execution steps.' : '按需启用 Agent，用自然语言查找、总结和执行支持的操作，执行过程可见。'}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {examples.map((example) => (
          <article key={example.request} className="rounded-xl border border-border/70 p-5">
            <h3 className="font-semibold">“{example.request}”</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{example.result}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
