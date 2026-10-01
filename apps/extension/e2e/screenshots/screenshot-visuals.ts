/**
 * Synthetic visuals for marketing screenshots.
 *
 * Every page here is a fictional product rendered locally, so the visual
 * gallery and image clips look like a real inspiration library without
 * depicting any real website. Pages are rendered at GALLERY_PAGE_SIZE and
 * stored as the page screenshots HamHome would capture when bookmarking.
 */

export const GALLERY_PAGE_SIZE = { width: 1280, height: 800 };

export type GalleryTemplate =
  | "nimbus"
  | "aurora"
  | "pillar"
  | "fieldnote"
  | "kiln"
  | "orbit"
  | "sprout"
  | "lumen"
  | "cadence"
  | "tern"
  | "margin"
  | "harbor";

export type ClipArtwork =
  | "softLight"
  | "onboarding"
  | "palette"
  | "cohort"
  | "iconSet";

export interface ArtworkSpec {
  width: number;
  height: number;
  html: string;
}

const FONT_SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif';
const FONT_SERIF = 'Georgia, "Times New Roman", "Songti SC", serif';
const FONT_MONO = 'Menlo, "SF Mono", Consolas, monospace';

function page(
  width: number,
  height: number,
  css: string,
  body: string,
): string {
  return `<!doctype html><html><head><meta charset="utf-8" /><style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${width}px;height:${height}px;overflow:hidden}
body{font-family:${FONT_SANS};-webkit-font-smoothing:antialiased}
${css}
</style></head><body>${body}</body></html>`;
}

function galleryPage(css: string, body: string): string {
  return page(GALLERY_PAGE_SIZE.width, GALLERY_PAGE_SIZE.height, css, body);
}

const nimbus = () =>
  galleryPage(
    `
body{background:#f5f6fb;color:#0f172a;display:flex}
.side{width:232px;height:800px;background:#0f172a;color:#94a3b8;padding:26px 18px;display:flex;flex-direction:column}
.logo{display:flex;align-items:center;gap:10px;color:#fff;font-weight:700;font-size:19px;margin-bottom:34px}
.logo i{width:28px;height:28px;border-radius:9px;background:linear-gradient(135deg,#818cf8,#22d3ee)}
.nav a{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;font-size:14px;margin-bottom:4px}
.nav a i{width:16px;height:16px;border-radius:5px;background:#334155}
.nav a.on{background:rgba(129,140,248,.16);color:#fff}
.nav a.on i{background:#818cf8}
.upgrade{margin-top:auto;border-radius:14px;padding:16px;background:linear-gradient(160deg,#1e293b,#312e81);color:#e2e8f0;font-size:13px;line-height:1.5}
.upgrade b{display:block;color:#fff;font-size:14px;margin-bottom:4px}
.main{flex:1;padding:28px 32px}
.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}
h1{font-size:25px;letter-spacing:-.02em}
.sub{color:#64748b;font-size:13px;margin-top:4px}
.pills{display:flex;gap:10px;align-items:center}
.pill{border:1px solid #e2e8f0;background:#fff;border-radius:10px;padding:9px 14px;font-size:13px;color:#334155}
.btn{background:#4f46e5;color:#fff;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:600}
.avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#f472b6,#fb923c)}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:18px}
.card{background:#fff;border:1px solid #e6e9f2;border-radius:16px;padding:18px 20px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.kpi span{font-size:12px;color:#64748b}
.kpi strong{display:block;font-size:27px;margin:8px 0 6px;letter-spacing:-.02em}
.up{font-size:12px;color:#059669;background:#ecfdf5;border-radius:999px;padding:3px 8px}
.down{font-size:12px;color:#dc2626;background:#fef2f2;border-radius:999px;padding:3px 8px}
.row{display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:18px}
.ct{display:flex;justify-content:space-between;align-items:center;font-size:15px;font-weight:600;margin-bottom:10px}
.ct small{font-weight:400;color:#64748b;font-size:12px}
.legend div{display:flex;align-items:center;justify-content:space-between;font-size:13px;color:#334155;margin-top:10px}
.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:8px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{color:#64748b;font-weight:500;text-align:left;padding:8px 0;border-bottom:1px solid #eef1f6}
td{padding:11px 0;border-bottom:1px solid #f1f4f9}
.bar{height:6px;border-radius:99px;background:#eef2ff;overflow:hidden;width:140px}
.bar b{display:block;height:100%;background:#6366f1;border-radius:99px}
`,
    `
<aside class="side">
  <div class="logo"><i></i>Nimbus</div>
  <nav class="nav">
    <a class="on"><i></i>Overview</a><a><i></i>Revenue</a><a><i></i>Customers</a>
    <a><i></i>Cohorts</a><a><i></i>Reports</a><a><i></i>Settings</a>
  </nav>
  <div class="upgrade"><b>Forecasts are here</b>Project next quarter with live pipeline data.</div>
</aside>
<main class="main">
  <div class="top">
    <div><h1>Revenue overview</h1><div class="sub">Last 12 months · All regions</div></div>
    <div class="pills"><span class="pill">Jan – Dec 2026</span><span class="pill">Compare</span><span class="btn">Export</span><span class="avatar"></span></div>
  </div>
  <div class="kpis">
    <div class="card kpi"><span>Monthly recurring revenue</span><strong>$84.2k</strong><em class="up">+8.4%</em></div>
    <div class="card kpi"><span>Active customers</span><strong>3,218</strong><em class="up">+214</em></div>
    <div class="card kpi"><span>Net churn</span><strong>1.9%</strong><em class="down">+0.2%</em></div>
    <div class="card kpi"><span>Avg. revenue per user</span><strong>$26.1</strong><em class="up">+3.1%</em></div>
  </div>
  <div class="row">
    <div class="card">
      <div class="ct">Recurring revenue <small>Monthly, USD</small></div>
      <svg width="600" height="230" viewBox="0 0 600 230">
        <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#6366f1" stop-opacity=".32"/><stop offset="1" stop-color="#6366f1" stop-opacity="0"/></linearGradient></defs>
        <g stroke="#eef1f6"><line x1="0" x2="600" y1="30" y2="30"/><line x1="0" x2="600" y1="85" y2="85"/><line x1="0" x2="600" y1="140" y2="140"/><line x1="0" x2="600" y1="195" y2="195"/></g>
        <path d="M0 170 C40 160 60 150 100 152 S160 120 200 124 S260 96 300 104 S360 70 400 76 S460 52 500 58 S560 30 600 28 L600 200 L0 200Z" fill="url(#g)"/>
        <path d="M0 170 C40 160 60 150 100 152 S160 120 200 124 S260 96 300 104 S360 70 400 76 S460 52 500 58 S560 30 600 28" fill="none" stroke="#6366f1" stroke-width="3"/>
        <path d="M0 186 C60 182 100 176 160 172 S260 160 320 156 S420 140 480 138 S560 124 600 120" fill="none" stroke="#22d3ee" stroke-width="2.5" stroke-dasharray="6 6"/>
        <circle cx="500" cy="58" r="6" fill="#fff" stroke="#6366f1" stroke-width="3"/>
        <g fill="#94a3b8" font-size="11"><text x="0" y="222">Jan</text><text x="100" y="222">Mar</text><text x="200" y="222">May</text><text x="300" y="222">Jul</text><text x="400" y="222">Sep</text><text x="500" y="222">Nov</text></g>
      </svg>
    </div>
    <div class="card">
      <div class="ct">Revenue by plan</div>
      <svg width="150" height="150" viewBox="0 0 42 42" style="display:block;margin:6px auto 4px">
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#eef2ff" stroke-width="6"/>
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#6366f1" stroke-width="6" stroke-dasharray="52 48" stroke-dashoffset="25"/>
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#22d3ee" stroke-width="6" stroke-dasharray="28 72" stroke-dashoffset="73"/>
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#f472b6" stroke-width="6" stroke-dasharray="20 80" stroke-dashoffset="45"/>
      </svg>
      <div class="legend">
        <div><span><i style="background:#6366f1"></i>Business</span><b>52%</b></div>
        <div><span><i style="background:#22d3ee"></i>Team</span><b>28%</b></div>
        <div><span><i style="background:#f472b6"></i>Starter</span><b>20%</b></div>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="ct">Top accounts <small>by MRR</small></div>
    <table>
      <tr><th>Account</th><th>Plan</th><th>MRR</th><th>Expansion</th></tr>
      <tr><td>Northwind Labs</td><td>Business</td><td>$4,820</td><td><div class="bar"><b style="width:82%"></b></div></td></tr>
      <tr><td>Helix Health</td><td>Business</td><td>$3,960</td><td><div class="bar"><b style="width:64%"></b></div></td></tr>
    </table>
  </div>
</main>`,
  );

const aurora = () =>
  galleryPage(
    `
body{color:#e2e8f0;background:radial-gradient(900px 520px at 78% 18%,rgba(124,58,237,.55),transparent 60%),radial-gradient(700px 480px at 10% 90%,rgba(20,184,166,.35),transparent 60%),#0b1020}
nav{display:flex;align-items:center;justify-content:space-between;padding:28px 64px}
.logo{display:flex;align-items:center;gap:10px;font-weight:700;font-size:20px;color:#fff}
.logo i{width:26px;height:26px;border-radius:50%;background:conic-gradient(from 90deg,#a78bfa,#22d3ee,#a78bfa)}
.links{display:flex;gap:34px;font-size:14px;color:#cbd5e1}
.cta{display:flex;gap:14px;align-items:center;font-size:14px}
.cta b{background:#fff;color:#0b1020;border-radius:999px;padding:10px 18px}
.hero{display:grid;grid-template-columns:1.05fr .95fr;gap:40px;padding:56px 64px 0}
.eyebrow{display:inline-flex;gap:8px;align-items:center;border:1px solid rgba(167,139,250,.4);background:rgba(167,139,250,.12);border-radius:999px;padding:7px 14px;font-size:13px;color:#ddd6fe}
h1{font-size:60px;line-height:1.04;letter-spacing:-.035em;color:#fff;margin:24px 0 20px}
h1 span{background:linear-gradient(90deg,#c4b5fd,#5eead4);-webkit-background-clip:text;color:transparent}
p{font-size:18px;line-height:1.6;color:#94a3b8;max-width:520px}
.btns{display:flex;gap:14px;margin-top:32px}
.btns b{background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#fff;border-radius:12px;padding:14px 22px;font-size:15px}
.btns span{border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:14px 22px;font-size:15px;color:#e2e8f0}
.stack{position:relative;height:420px}
.cardx{position:absolute;right:40px;top:10px;width:340px;height:210px;border-radius:22px;transform:rotate(-8deg);background:linear-gradient(135deg,#7c3aed,#2563eb 55%,#14b8a6);box-shadow:0 30px 80px rgba(0,0,0,.45);padding:26px;color:#fff}
.cardx .chip{width:44px;height:32px;border-radius:8px;background:linear-gradient(135deg,#fde68a,#f59e0b);margin:22px 0 34px}
.cardx .num{font-family:${FONT_MONO};letter-spacing:.14em;font-size:17px}
.panel{position:absolute;left:0;bottom:0;width:360px;border-radius:20px;background:rgba(15,23,42,.82);border:1px solid rgba(148,163,184,.2);backdrop-filter:blur(10px);padding:20px;box-shadow:0 24px 60px rgba(0,0,0,.4)}
.panel h3{font-size:14px;color:#fff;margin-bottom:14px}
.tx{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid rgba(148,163,184,.14);font-size:13px}
.tx i{width:34px;height:34px;border-radius:10px}
.tx div{flex:1}.tx small{display:block;color:#64748b;font-size:12px;margin-top:2px}
.tx b{color:#5eead4}
.trust{padding:0 64px;margin-top:38px;display:flex;align-items:center;gap:44px;color:#64748b;font-size:13px}
.trust strong{font-size:19px;letter-spacing:.02em;color:#94a3b8}
`,
    `
<nav><div class="logo"><i></i>Aurora</div><div class="links"><span>Products</span><span>Pricing</span><span>Developers</span><span>Company</span></div><div class="cta"><span>Sign in</span><b>Get started</b></div></nav>
<section class="hero">
  <div>
    <span class="eyebrow">New · Instant payouts in 42 countries</span>
    <h1>Move money at the <span>speed of your team.</span></h1>
    <p>Cards, payouts and spend controls for distributed teams — reconciled automatically, visible in real time.</p>
    <div class="btns"><b>Open an account</b><span>Talk to sales</span></div>
  </div>
  <div class="stack">
    <div class="cardx"><div style="font-weight:700">Aurora</div><div class="chip"></div><div class="num">4821 •••• •••• 0923</div></div>
    <div class="panel"><h3>Recent activity</h3>
      <div class="tx"><i style="background:#312e81"></i><div>Design tools<small>Team · 2 min ago</small></div><b>-$240.00</b></div>
      <div class="tx"><i style="background:#134e4a"></i><div>Payout to Lisbon<small>Contractor · 1 h ago</small></div><b>-$3,100.00</b></div>
      <div class="tx"><i style="background:#3b0764"></i><div>Customer payment<small>Invoice #2041</small></div><b>+$8,920.00</b></div>
    </div>
  </div>
</section>
<div class="trust"><span>Trusted by finance teams at</span><strong>Northwind</strong><strong>Helix</strong><strong>Quanta</strong><strong>Evergreen</strong><strong>Vertex</strong></div>`,
  );

const pillar = () => {
  const scale = (name: string, colors: string[]) =>
    `<h3>${name}</h3><div class="sw">${colors
      .map(
        (color, index) =>
          `<div><i style="background:${color}"></i><b>${name.toLowerCase()}-${
            index === 0 ? 50 : index * 100
          }</b><span>${color.toUpperCase()}</span></div>`,
      )
      .join("")}</div>`;
  return galleryPage(
    `
body{background:#fff;color:#111827}
header{height:62px;border-bottom:1px solid #eceef3;display:flex;align-items:center;gap:18px;padding:0 28px}
.logo{display:flex;align-items:center;gap:10px;font-weight:700;font-size:17px}
.logo i{width:24px;height:24px;border-radius:7px;background:#111827;box-shadow:inset -8px -8px 0 #6366f1}
.ver{font-size:12px;border:1px solid #e5e7eb;border-radius:999px;padding:3px 9px;color:#6b7280}
.search{margin-left:auto;width:280px;height:36px;border-radius:10px;background:#f3f4f6;color:#9ca3af;font-size:13px;display:flex;align-items:center;padding:0 12px}
.wrap{display:flex}
aside{width:236px;padding:24px 22px;border-right:1px solid #f1f2f6;height:738px;font-size:14px;color:#4b5563}
aside h4{font-size:11px;letter-spacing:.08em;color:#9ca3af;margin:0 0 10px}
aside a{display:block;padding:8px 10px;border-radius:8px;margin-bottom:2px}
aside a.on{background:#eef2ff;color:#4338ca;font-weight:600}
main{flex:1;padding:30px 40px}
h1{font-size:34px;letter-spacing:-.02em}
.lead{color:#6b7280;font-size:15px;margin:8px 0 22px;max-width:640px;line-height:1.6}
h3{font-size:14px;margin:18px 0 10px}
.sw{display:grid;grid-template-columns:repeat(10,1fr);gap:10px}
.sw div{font-size:11px}
.sw i{display:block;height:58px;border-radius:10px;margin-bottom:8px;border:1px solid rgba(0,0,0,.05)}
.sw b{display:block;color:#111827;font-weight:600}
.sw span{color:#9ca3af;font-family:${FONT_MONO};font-size:10px}
`,
    `
<header><div class="logo"><i></i>Pillar</div><span class="ver">v4.2</span><span style="font-size:14px;color:#4b5563;margin-left:18px">Foundations</span><span style="font-size:14px;color:#9ca3af">Components</span><span style="font-size:14px;color:#9ca3af">Patterns</span><div class="search">Search tokens…</div></header>
<div class="wrap">
  <aside><h4>FOUNDATIONS</h4><a class="on">Color</a><a>Typography</a><a>Spacing</a><a>Elevation</a><a>Motion</a><h4 style="margin-top:22px">COMPONENTS</h4><a>Button</a><a>Input</a><a>Dialog</a></aside>
  <main>
    <h1>Color</h1>
    <p class="lead">Semantic tokens map brand and neutral scales to intent. Use the 500 step for primary actions and keep text on 700 or darker for AA contrast.</p>
    ${scale("Indigo", ["#eef2ff", "#e0e7ff", "#c7d2fe", "#a5b4fc", "#818cf8", "#6366f1", "#4f46e5", "#4338ca", "#3730a3", "#312e81"])}
    ${scale("Slate", ["#f8fafc", "#f1f5f9", "#e2e8f0", "#cbd5e1", "#94a3b8", "#64748b", "#475569", "#334155", "#1e293b", "#0f172a"])}
    ${scale("Teal", ["#f0fdfa", "#ccfbf1", "#99f6e4", "#5eead4", "#2dd4bf", "#14b8a6", "#0d9488", "#0f766e", "#115e59", "#134e4a"])}
  </main>
</div>`,
  );
};

const fieldnote = () => {
  const plan = (
    name: string,
    price: string,
    unit: string,
    features: string[],
    featured = false,
  ) => `<div class="plan${featured ? " hot" : ""}">${
    featured ? '<span class="tag">Most popular</span>' : ""
  }<h3>${name}</h3><div class="price">${price}<small>${unit}</small></div><div class="btn">${
    featured ? "Start free trial" : "Get started"
  }</div><ul>${features.map((item) => `<li><i></i>${item}</li>`).join("")}</ul></div>`;
  return galleryPage(
    `
body{background:#f6f1e7;color:#1f2a24}
nav{display:flex;align-items:center;justify-content:space-between;padding:26px 72px}
.logo{font-family:${FONT_SERIF};font-style:italic;font-size:26px;color:#1f5f4a}
.links{display:flex;gap:30px;font-size:14px;color:#4b5a51}
.login{font-size:14px;border:1px solid #cdbfa6;border-radius:999px;padding:9px 18px}
.head{text-align:center;margin-top:26px}
h1{font-family:${FONT_SERIF};font-weight:400;font-size:52px;letter-spacing:-.01em}
.head p{color:#5d6b63;margin-top:12px;font-size:17px}
.toggle{display:inline-flex;margin-top:22px;background:#ebe3d3;border-radius:999px;padding:4px;font-size:13px}
.toggle span{padding:8px 16px;border-radius:999px;color:#5d6b63}
.toggle .on{background:#fff;color:#1f2a24;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.plans{display:grid;grid-template-columns:repeat(3,300px);gap:22px;justify-content:center;margin-top:34px}
.plan{position:relative;background:#fffdf8;border:1px solid #e6dcc8;border-radius:22px;padding:28px}
.plan.hot{background:#1f5f4a;color:#f6f1e7;border-color:#1f5f4a;transform:translateY(-10px);box-shadow:0 24px 50px rgba(31,95,74,.28)}
.tag{position:absolute;top:18px;right:18px;font-size:11px;background:#f3c969;color:#1f2a24;border-radius:999px;padding:4px 10px;font-weight:600}
h3{font-size:16px;font-weight:600}
.price{font-family:${FONT_SERIF};font-size:44px;margin:14px 0 18px}
.price small{font-family:${FONT_SANS};font-size:13px;opacity:.7;margin-left:6px}
.btn{text-align:center;border-radius:12px;padding:12px;font-size:14px;font-weight:600;background:#1f2a24;color:#f6f1e7}
.hot .btn{background:#f6f1e7;color:#1f5f4a}
ul{list-style:none;margin-top:20px;font-size:14px;line-height:1.5}
li{display:flex;gap:10px;align-items:center;margin-bottom:10px}
li i{width:16px;height:16px;border-radius:50%;background:#cfe3d8;box-shadow:inset 0 0 0 4px #1f5f4a}
.hot li i{background:#f3c969;box-shadow:inset 0 0 0 4px #1f5f4a}
`,
    `
<nav><div class="logo">fieldnote</div><div class="links"><span>Product</span><span>Templates</span><span>Pricing</span><span>Journal</span></div><span class="login">Log in</span></nav>
<div class="head"><h1>Simple pricing for thoughtful teams</h1><p>Start free. Upgrade when your notes become a shared memory.</p><div class="toggle"><span>Monthly</span><span class="on">Yearly · save 20%</span></div></div>
<div class="plans">
  ${plan("Starter", "$0", "forever", ["3 shared notebooks", "Web clipper", "7-day history"])}
  ${plan("Team", "$12", "/ seat / mo", ["Unlimited notebooks", "AI summaries", "Version history", "Guest access"], true)}
  ${plan("Business", "$29", "/ seat / mo", ["SSO & audit log", "Retention policies", "Priority support"])}
</div>`,
  );
};

const kiln = () => {
  const product = (
    name: string,
    price: string,
    bg: string,
    shape: string,
  ) => `<div class="p"><div class="img" style="background:${bg}">${shape}</div><div class="meta"><b>${name}</b><span>${price}</span></div></div>`;
  return galleryPage(
    `
body{background:#fbf8f3;color:#2e2620}
nav{display:flex;align-items:center;justify-content:space-between;padding:24px 56px;border-bottom:1px solid #eee5da}
.logo{font-weight:700;letter-spacing:.34em;font-size:18px}
.links{display:flex;gap:30px;font-size:14px;color:#6b5d51}
.cart{font-size:14px;color:#6b5d51}
.banner{margin:26px 56px;height:220px;border-radius:24px;background:linear-gradient(120deg,#c8704f,#e2a36f 60%,#f0cf9b);display:flex;align-items:center;justify-content:space-between;padding:0 48px;color:#fff8ef;overflow:hidden}
.banner h1{font-family:${FONT_SERIF};font-weight:400;font-size:44px;line-height:1.1}
.banner p{margin-top:10px;font-size:15px;opacity:.9}
.banner b{display:inline-block;margin-top:18px;background:#2e2620;color:#fbf8f3;border-radius:999px;padding:10px 20px;font-size:13px}
.jar{width:170px;height:190px;border-radius:70px 70px 44px 44px;background:linear-gradient(160deg,#fff3e2,#e9c9a3);box-shadow:inset -20px -10px 0 rgba(0,0,0,.06);position:relative;top:40px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;padding:0 56px}
.p .img{height:228px;border-radius:18px;display:flex;align-items:flex-end;justify-content:center;overflow:hidden}
.meta{display:flex;justify-content:space-between;margin-top:12px;font-size:14px}
.meta span{color:#8a7b6e}
.vase{width:96px;height:150px;background:#8fa89a;border-radius:40px 40px 30px 30px;position:relative;margin-bottom:30px}
.vase:before{content:"";position:absolute;left:30px;top:-28px;width:36px;height:40px;background:#7f998b;border-radius:10px 10px 4px 4px}
.mug{width:110px;height:100px;background:#e7d7c3;border-radius:14px 14px 34px 34px;position:relative;margin-bottom:44px}
.mug:after{content:"";position:absolute;right:-30px;top:22px;width:34px;height:44px;border:10px solid #e7d7c3;border-left:none;border-radius:0 24px 24px 0}
.bowl{width:170px;height:84px;background:#c9785c;border-radius:0 0 90px 90px;margin-bottom:56px;box-shadow:inset 0 10px 0 #b8674c}
.bud{width:64px;height:120px;background:#3f4a5a;border-radius:32px;margin-bottom:34px;position:relative}
.bud:before{content:"";position:absolute;left:24px;top:-30px;width:16px;height:36px;background:#3f4a5a;border-radius:6px}
`,
    `
<nav><div class="logo">KILN</div><div class="links"><span>Shop</span><span>Collections</span><span>Studio</span><span>Journal</span></div><div class="cart">Search · Cart (2)</div></nav>
<section class="banner"><div><h1>Autumn glaze<br/>collection</h1><p>Hand-thrown stoneware, fired in small batches.</p><b>Shop the collection</b></div><div class="jar"></div></section>
<div class="grid">
  ${product("Moss vase", "$68", "#dfe7df", '<div class="vase"></div>')}
  ${product("Morning mug", "$32", "#efe4d6", '<div class="mug"></div>')}
  ${product("Ember bowl", "$44", "#f2dfd4", '<div class="bowl"></div>')}
  ${product("Night bud vase", "$38", "#dde2ea", '<div class="bud"></div>')}
</div>`,
  );
};

const orbit = () =>
  galleryPage(
    `
body{background:#0b0f17;color:#cbd5e1}
header{height:58px;border-bottom:1px solid #1c2433;display:flex;align-items:center;padding:0 26px;gap:16px}
.logo{display:flex;align-items:center;gap:9px;color:#fff;font-weight:700}
.logo i{width:22px;height:22px;border-radius:50%;border:3px solid #38bdf8;box-shadow:0 0 0 3px rgba(56,189,248,.18)}
.logo span{color:#64748b;font-weight:500}
.search{margin-left:30px;width:320px;height:34px;border-radius:9px;background:#131a26;border:1px solid #1f2937;color:#64748b;font-size:13px;display:flex;align-items:center;padding:0 12px}
.key{margin-left:auto;font-size:13px;background:#38bdf8;color:#04121f;border-radius:9px;padding:8px 14px;font-weight:600}
.wrap{display:flex;height:742px}
aside{width:236px;border-right:1px solid #1c2433;padding:22px 18px;font-size:13px}
aside h4{font-size:11px;letter-spacing:.08em;color:#64748b;margin:16px 0 8px}
aside a{display:block;padding:7px 10px;border-radius:7px;color:#94a3b8}
aside a.on{background:#132132;color:#7dd3fc}
main{flex:1;padding:30px 36px}
.crumb{font-size:12px;color:#64748b}
h1{color:#fff;font-size:30px;margin:10px 0 14px;letter-spacing:-.02em}
.ep{display:inline-flex;align-items:center;gap:10px;font-family:${FONT_MONO};font-size:13px;background:#111827;border:1px solid #1f2937;border-radius:9px;padding:8px 12px}
.ep b{color:#0b0f17;background:#4ade80;border-radius:5px;padding:2px 7px;font-size:11px}
main p{font-size:14px;line-height:1.7;color:#94a3b8;margin:16px 0 20px;max-width:520px}
.param{border-top:1px solid #1c2433;padding:13px 0;font-size:13px}
.param code{font-family:${FONT_MONO};color:#e2e8f0}
.param em{font-style:normal;color:#64748b;margin-left:8px;font-size:12px}
.param .req{color:#fb923c}
.param div{color:#94a3b8;margin-top:5px}
.code{width:430px;padding:30px 26px 0 0}
.box{background:#0f1622;border:1px solid #1f2937;border-radius:14px;overflow:hidden;margin-bottom:18px}
.tabs{display:flex;gap:18px;padding:12px 16px;border-bottom:1px solid #1f2937;font-size:12px;color:#64748b}
.tabs .on{color:#7dd3fc}
pre{font-family:${FONT_MONO};font-size:12.5px;line-height:1.75;padding:16px;color:#cbd5e1;white-space:pre}
.k{color:#c084fc}.s{color:#86efac}.n{color:#fdba74}.c{color:#64748b}
`,
    `
<header><div class="logo"><i></i>Orbit <span>Docs</span></div><div class="search">Search the API…   ⌘K</div><div class="key">API keys</div></header>
<div class="wrap">
  <aside><h4>GETTING STARTED</h4><a>Introduction</a><a>Authentication</a><a>Errors</a><h4>EVENTS</h4><a>The event object</a><a class="on">Create an event</a><a>List events</a><a>Retrieve an event</a><h4>WEBHOOKS</h4><a>Endpoints</a><a>Signatures</a></aside>
  <main>
    <div class="crumb">API reference / Events</div>
    <h1>Create an event</h1>
    <span class="ep"><b>POST</b>/v1/events</span>
    <p>Records a product event for a user. Events are processed in order per user and become queryable within a few seconds.</p>
    <div class="param"><code>name</code><em>string</em><em class="req">required</em><div>Event name, for example <code>checkout.completed</code>.</div></div>
    <div class="param"><code>user_id</code><em>string</em><em class="req">required</em><div>Stable identifier of the user in your system.</div></div>
    <div class="param"><code>properties</code><em>object</em><div>Up to 64 custom key-value pairs.</div></div>
    <div class="param"><code>timestamp</code><em>integer</em><div>Unix time in ms. Defaults to receipt time.</div></div>
  </main>
  <div class="code">
    <div class="box"><div class="tabs"><span class="on">cURL</span><span>Node</span><span>Python</span></div><pre><span class="c"># Create an event</span>
curl https://api.orbit.demo/v1/events \\
  -H <span class="s">"Authorization: Bearer $ORBIT_KEY"</span> \\
  -d name=<span class="s">"checkout.completed"</span> \\
  -d user_id=<span class="s">"usr_8f2k"</span> \\
  -d properties[plan]=<span class="s">"team"</span></pre></div>
    <div class="box"><div class="tabs"><span class="on">Response · 200</span></div><pre>{
  <span class="k">"id"</span>: <span class="s">"evt_3Jq9x"</span>,
  <span class="k">"object"</span>: <span class="s">"event"</span>,
  <span class="k">"name"</span>: <span class="s">"checkout.completed"</span>,
  <span class="k">"received_at"</span>: <span class="n">1781232000000</span>
}</pre></div>
  </div>
</div>`,
  );

const sprout = () => {
  const card = (
    title: string,
    tags: Array<[string, string]>,
    progress?: number,
  ) => `<div class="card"><b>${title}</b><div class="tags">${tags
    .map(([label, color]) => `<span style="background:${color}1f;color:${color}">${label}</span>`)
    .join("")}</div>${
    progress === undefined
      ? ""
      : `<div class="prog"><i style="width:${progress}%"></i></div>`
  }<div class="foot"><span class="av"><i style="background:#fda4af"></i><i style="background:#93c5fd"></i></span><span>Jun ${
    10 + title.length % 18
  }</span></div></div>`;
  const column = (name: string, count: number, cards: string) =>
    `<section class="col"><h3>${name}<span>${count}</span></h3>${cards}</section>`;
  return galleryPage(
    `
body{background:#f3f7f4;color:#14281d}
header{display:flex;align-items:center;gap:16px;padding:22px 32px;background:#fff;border-bottom:1px solid #e3ebe5}
.logo{display:flex;align-items:center;gap:8px;font-weight:800;color:#15803d;font-size:18px}
.logo i{width:22px;height:22px;border-radius:6px 16px 6px 16px;background:#22c55e}
h1{font-size:17px;margin-left:18px}
h1 span{color:#6b7f72;font-weight:400}
.people{margin-left:auto;display:flex}
.people i{width:30px;height:30px;border-radius:50%;border:2px solid #fff;margin-left:-8px}
.new{background:#15803d;color:#fff;border-radius:10px;padding:9px 14px;font-size:13px;font-weight:600;margin-left:14px}
.chips{display:flex;gap:10px;padding:16px 32px}
.chips span{font-size:12px;background:#fff;border:1px solid #dfe8e2;border-radius:999px;padding:6px 12px;color:#476052}
.board{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;padding:0 32px}
.col{background:#e9f0eb;border-radius:16px;padding:14px;height:640px}
.col h3{display:flex;justify-content:space-between;font-size:13px;margin:2px 4px 12px;color:#355243}
.col h3 span{background:#fff;border-radius:999px;padding:1px 9px;font-size:12px}
.card{background:#fff;border-radius:12px;padding:14px;margin-bottom:12px;box-shadow:0 1px 2px rgba(20,40,29,.08);font-size:13px}
.card b{display:block;line-height:1.4;margin-bottom:10px}
.tags{display:flex;gap:6px;flex-wrap:wrap}
.tags span{font-size:11px;border-radius:6px;padding:3px 8px;font-weight:600}
.prog{height:6px;background:#eef3ef;border-radius:99px;margin-top:12px;overflow:hidden}
.prog i{display:block;height:100%;background:#22c55e;border-radius:99px}
.foot{display:flex;justify-content:space-between;align-items:center;margin-top:12px;color:#7a8d80;font-size:12px}
.av{display:flex}.av i{width:22px;height:22px;border-radius:50%;border:2px solid #fff;margin-right:-6px}
`,
    `
<header><div class="logo"><i></i>Sprout</div><h1>Sprint 24 <span>· Mobile app</span></h1><div class="people"><i style="background:#fda4af"></i><i style="background:#93c5fd"></i><i style="background:#fcd34d"></i><i style="background:#86efac"></i></div><span class="new">+ New task</span></header>
<div class="chips"><span>All tasks</span><span>Assigned to me</span><span>Due this week</span><span>Labels</span></div>
<div class="board">
  ${column("To do", 4, card("Offline mode for saved lists", [["iOS", "#2563eb"], ["Spec", "#7c3aed"]]) + card("Empty states copy pass", [["Design", "#db2777"]]) + card("Crash on photo import", [["Bug", "#dc2626"], ["Android", "#16a34a"]]))}
  ${column("In progress", 3, card("New onboarding checklist", [["Growth", "#ea580c"]], 62) + card("Sync conflict resolution", [["Core", "#0891b2"], ["Spec", "#7c3aed"]], 35) + card("Widget refresh budget", [["iOS", "#2563eb"]], 80))}
  ${column("Review", 2, card("Accessible color tokens", [["Design", "#db2777"], ["A11y", "#0d9488"]], 95) + card("Paywall experiment v2", [["Growth", "#ea580c"]]))}
  ${column("Done", 6, card("Push notification settings", [["Android", "#16a34a"]]) + card("Search result ranking", [["Core", "#0891b2"]]) + card("Release notes template", [["Docs", "#4b5563"]]))}
</div>`,
  );
};

const lumen = () =>
  galleryPage(
    `
body{background:#0a0a0a;color:#f5f5f4}
nav{display:flex;justify-content:space-between;padding:28px 56px;font-size:14px;color:#a8a29e}
nav b{color:#fff;font-size:16px}
nav div{display:flex;gap:30px}
h1{padding:18px 56px 0;font-size:64px;line-height:1.02;letter-spacing:-.04em;font-weight:600;max-width:1080px}
h1 span{background:linear-gradient(90deg,#fb7185,#f59e0b,#a3e635);-webkit-background-clip:text;color:transparent}
.grid{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:18px;padding:40px 56px 0}
.tile{height:360px;border-radius:20px;position:relative;overflow:hidden}
.tile span{position:absolute;left:18px;bottom:16px;font-size:13px;color:rgba(255,255,255,.85)}
.t1{background:radial-gradient(circle at 30% 40%,#fb7185,transparent 45%),radial-gradient(circle at 70% 65%,#f59e0b,transparent 45%),#1c1917}
.t2{background:repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 1px,transparent 1px 28px),linear-gradient(180deg,#312e81,#0f172a)}
.t2:after{content:"";position:absolute;left:50%;top:44%;width:150px;height:150px;margin:-75px;border-radius:50%;border:18px solid #a5b4fc;box-shadow:0 0 60px #818cf8}
.t3{background:#d9f99d}
.t3:before{content:"";position:absolute;left:34px;top:40px;width:180px;height:220px;border-radius:14px;background:#0a0a0a;box-shadow:24px 24px 0 #65a30d}
`,
    `
<nav><b>Lumen Studio</b><div><span>Work</span><span>Services</span><span>About</span><span>Contact</span></div></nav>
<h1>Brand, motion &amp; interface design for <span>curious companies.</span></h1>
<div class="grid"><div class="tile t1"><span>Helio — Identity system</span></div><div class="tile t2"><span>Wavelength — Motion</span></div><div class="tile t3"><span style="color:#1a2e05">Atlas — Product UI</span></div></div>`,
  );

const cadence = () => {
  const habit = (name: string, color: string, done: boolean) =>
    `<div class="h"><i style="background:${color}"></i><span>${name}</span><em class="${done ? "on" : ""}"></em></div>`;
  return galleryPage(
    `
body{background:linear-gradient(135deg,#fff4ea,#ffe3d6);color:#2b1d17;display:grid;grid-template-columns:1fr 1fr;align-items:center;padding:0 72px}
.logo{position:absolute;top:30px;left:72px;font-weight:800;font-size:22px;color:#e8590c}
h1{font-size:60px;line-height:1.05;letter-spacing:-.035em}
p{font-size:18px;color:#7c5a4b;margin:20px 0 30px;line-height:1.6;max-width:460px}
.stores{display:flex;gap:12px}
.stores span{background:#2b1d17;color:#fff;border-radius:14px;padding:13px 20px;font-size:14px}
.rate{margin-top:22px;font-size:14px;color:#9a7466}
.phones{position:relative;height:640px}
.ph{position:absolute;width:280px;height:580px;border-radius:44px;background:#1f1a17;padding:12px;box-shadow:0 40px 80px rgba(120,53,15,.25)}
.ph .s{width:100%;height:100%;border-radius:34px;background:#fffaf6;padding:36px 20px;overflow:hidden}
.p1{left:20px;top:40px}.p2{left:260px;top:0;transform:rotate(6deg)}
.s h3{font-size:22px;margin-bottom:4px}.s small{color:#9a7466;font-size:12px}
.ring{margin:18px auto;display:block}
.h{display:flex;align-items:center;gap:10px;background:#fff;border-radius:14px;padding:12px;margin-bottom:10px;font-size:13px;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.h i{width:26px;height:26px;border-radius:8px}
.h span{flex:1}
.h em{width:20px;height:20px;border-radius:50%;border:2px solid #f3d3c4}
.h em.on{background:#e8590c;border-color:#e8590c}
.bars{display:flex;align-items:flex-end;gap:10px;height:180px;margin:26px 4px 12px}
.bars i{flex:1;border-radius:8px 8px 4px 4px;background:#ffc9b0}
.bars i.on{background:#e8590c}
.days{display:flex;justify-content:space-between;font-size:11px;color:#9a7466;padding:0 6px}
`,
    `
<div class="logo">cadence</div>
<div><h1>Build routines that actually stick.</h1><p>Tiny daily check-ins, gentle streaks and weekly reflections that adapt to your real schedule.</p><div class="stores"><span>Download for iOS</span><span>Get it on Android</span></div><div class="rate">★★★★★ 4.8 · 12k reviews</div></div>
<div class="phones">
  <div class="ph p1"><div class="s"><h3>Today</h3><small>Thursday, June 12</small>
    <svg class="ring" width="150" height="150" viewBox="0 0 42 42"><circle cx="21" cy="21" r="15.9" fill="none" stroke="#fde2d6" stroke-width="5"/><circle cx="21" cy="21" r="15.9" fill="none" stroke="#e8590c" stroke-width="5" stroke-linecap="round" stroke-dasharray="72 28" stroke-dashoffset="25"/><text x="21" y="23.5" text-anchor="middle" font-size="7" font-weight="700" fill="#2b1d17">72%</text></svg>
    ${habit("Morning pages", "#fdba74", true)}${habit("20 min walk", "#86efac", true)}${habit("Read 10 pages", "#93c5fd", false)}${habit("No phone after 10", "#c4b5fd", false)}
  </div></div>
  <div class="ph p2"><div class="s"><h3>This week</h3><small>5-day streak</small><div class="bars"><i class="on" style="height:70%"></i><i class="on" style="height:88%"></i><i class="on" style="height:62%"></i><i class="on" style="height:94%"></i><i class="on" style="height:76%"></i><i style="height:40%"></i><i style="height:28%"></i></div><div class="days"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div></div></div>
</div>`,
  );
};

const tern = () => {
  const scene = (sky: string, hill: string, far: string) =>
    `<svg width="100%" height="150" viewBox="0 0 360 150" preserveAspectRatio="none"><rect width="360" height="150" fill="${sky}"/><circle cx="270" cy="52" r="20" fill="#fff" opacity=".8"/><path d="M0 110 L70 60 L130 100 L200 44 L280 104 L360 70 L360 150 L0 150Z" fill="${far}"/><path d="M0 130 L90 96 L170 128 L260 90 L360 124 L360 150 L0 150Z" fill="${hill}"/></svg>`;
  const destination = (name: string, price: string, svg: string) =>
    `<div class="d">${svg}<div class="dm"><b>${name}</b><span>${price}</span></div></div>`;
  return galleryPage(
    `
body{background:#fff;color:#1e293b}
.hero{position:relative;height:500px;color:#fff}
.hero svg{position:absolute;inset:0}
nav{position:relative;display:flex;justify-content:space-between;align-items:center;padding:26px 60px;font-size:14px}
nav b{font-size:20px;letter-spacing:.02em}
nav div{display:flex;gap:28px;opacity:.9}
.copy{position:relative;padding:40px 60px 0}
h1{font-size:58px;letter-spacing:-.03em;line-height:1.05;text-shadow:0 2px 20px rgba(0,0,0,.18)}
.copy p{font-size:18px;margin-top:14px;opacity:.92}
.search{position:relative;margin:34px 60px 0;display:grid;grid-template-columns:1.4fr 1fr 1fr auto;background:#fff;border-radius:18px;padding:10px;box-shadow:0 20px 50px rgba(15,23,42,.25);color:#1e293b}
.search div{padding:8px 16px;border-right:1px solid #eef2f7;font-size:12px;color:#64748b}
.search div b{display:block;color:#0f172a;font-size:15px;margin-top:3px}
.search span{background:#0f766e;color:#fff;border-radius:12px;padding:0 26px;display:flex;align-items:center;font-weight:600;font-size:14px}
.trend{padding:26px 60px 0}
.trend h2{font-size:18px;margin-bottom:14px}
.row{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.d{border-radius:16px;overflow:hidden;border:1px solid #e2e8f0}
.dm{display:flex;justify-content:space-between;padding:12px 16px;font-size:14px}
.dm span{color:#0f766e;font-weight:600}
`,
    `
<section class="hero">
  <svg width="1280" height="500" viewBox="0 0 1280 500" preserveAspectRatio="none"><defs><linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#1e3a8a"/><stop offset=".55" stop-color="#f97316"/><stop offset="1" stop-color="#fcd34d"/></linearGradient></defs><rect width="1280" height="500" fill="url(#sky)"/><circle cx="960" cy="300" r="70" fill="#fde68a"/><path d="M0 380 L180 250 L330 340 L520 200 L700 330 L880 230 L1060 330 L1280 260 L1280 500 L0 500Z" fill="#7c2d12" opacity=".75"/><path d="M0 440 L220 350 L420 420 L640 330 L860 420 L1080 350 L1280 410 L1280 500 L0 500Z" fill="#431407"/></svg>
  <nav><b>tern</b><div><span>Trips</span><span>Guides</span><span>Deals</span><span>Sign in</span></div></nav>
  <div class="copy"><h1>Plan the trip,<br/>not the logistics.</h1><p>Flights, stays and day plans in one shared itinerary.</p></div>
  <div class="search"><div>Where<b>Lofoten, Norway</b></div><div>When<b>Aug 14 – 22</b></div><div>Who<b>2 adults</b></div><span>Search</span></div>
</section>
<section class="trend"><h2>Trending this month</h2><div class="row">
  ${destination("Lofoten, Norway", "from $1,240", scene("#bfdbfe", "#1e3a8a", "#60a5fa"))}
  ${destination("Kyoto, Japan", "from $980", scene("#fecdd3", "#9f1239", "#fb7185"))}
  ${destination("Patagonia, Chile", "from $1,560", scene("#fde68a", "#78350f", "#f59e0b"))}
</div></section>`,
  );
};

const margin = () =>
  galleryPage(
    `
body{background:#faf8f3;color:#1c1917}
.mast{text-align:center;padding-top:26px}
.mast small{font-size:12px;letter-spacing:.14em;color:#78716c}
.mast h1{font-family:${FONT_SERIF};font-size:72px;letter-spacing:.14em;font-weight:400;margin-top:6px}
nav{display:flex;justify-content:center;gap:34px;font-size:13px;letter-spacing:.08em;color:#57534e;border-top:1px solid #1c1917;border-bottom:1px solid #e7e5e4;margin:16px 60px 0;padding:12px 0}
.feat{display:grid;grid-template-columns:1.25fr 1fr;gap:40px;padding:30px 60px 0}
.art{height:380px;border-radius:4px;background:radial-gradient(circle at 70% 30%,#fcd34d 0 16%,transparent 17%),linear-gradient(160deg,#99f6e4,#0f766e 70%);position:relative;overflow:hidden}
.art:before{content:"";position:absolute;left:60px;bottom:-40px;width:260px;height:260px;border-radius:50%;background:#134e4a}
.art:after{content:"";position:absolute;right:80px;bottom:40px;width:220px;height:140px;background:#faf8f3;border-radius:8px;box-shadow:12px 12px 0 #1c1917}
.kicker{font-size:12px;letter-spacing:.16em;color:#b45309;font-weight:700}
h2{font-family:${FONT_SERIF};font-size:42px;line-height:1.12;font-weight:400;margin:14px 0}
.dek{font-size:17px;line-height:1.6;color:#57534e}
.by{margin-top:18px;font-size:13px;color:#78716c}
.more{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;padding:26px 60px 0}
.more div{display:flex;gap:14px;align-items:flex-start}
.more i{width:90px;height:64px;border-radius:3px;flex-shrink:0}
.more b{font-family:${FONT_SERIF};font-weight:400;font-size:17px;line-height:1.3}
`,
    `
<div class="mast"><small>ISSUE 18 · SUMMER 2026</small><h1>MARGIN</h1></div>
<nav><span>DESIGN</span><span>TECHNOLOGY</span><span>CULTURE</span><span>ESSAYS</span><span>NEWSLETTER</span></nav>
<section class="feat"><div class="art"></div><div><div class="kicker">ESSAY</div><h2>The quiet return of the personal website</h2><p class="dek">Tired of feeds, a generation of designers is building small, slow, hand-made corners of the web again.</p><div class="by">By Ines Varga · 12 min read</div></div></section>
<section class="more"><div><i style="background:linear-gradient(135deg,#fda4af,#be123c)"></i><b>Type specimens as storytelling</b></div><div><i style="background:linear-gradient(135deg,#bae6fd,#1d4ed8)"></i><b>What interfaces learned from maps</b></div><div><i style="background:linear-gradient(135deg,#fde68a,#b45309)"></i><b>A field guide to calm software</b></div></section>`,
  );

const harbor = () =>
  galleryPage(
    `
body{background:#f2f5fb;color:#0f172a}
header{display:flex;align-items:center;justify-content:space-between;padding:24px 40px}
.logo{display:flex;align-items:center;gap:10px;font-weight:700;font-size:18px}
.logo i{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,#0ea5e9,#2563eb)}
header span{font-size:13px;color:#64748b}
.steps{display:flex;justify-content:center;gap:16px;margin-top:6px;font-size:13px;color:#94a3b8}
.steps div{display:flex;align-items:center;gap:8px}
.steps b{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#e2e8f0;color:#64748b;font-size:12px}
.steps .done b{background:#16a34a;color:#fff}.steps .on{color:#0f172a;font-weight:600}.steps .on b{background:#2563eb;color:#fff}
.steps hr{width:60px;border:none;border-top:2px solid #dbe3ef}
.card{width:720px;margin:28px auto 0;background:#fff;border-radius:22px;padding:36px 40px;box-shadow:0 20px 50px rgba(15,23,42,.08)}
h2{font-size:26px;letter-spacing:-.02em}
.card p{color:#64748b;font-size:15px;margin:8px 0 24px}
label{display:block;font-size:13px;font-weight:600;margin-bottom:8px}
.input{height:44px;border:1.5px solid #2563eb;border-radius:12px;display:flex;align-items:center;padding:0 14px;font-size:15px;box-shadow:0 0 0 4px rgba(37,99,235,.12);margin-bottom:22px}
.seg{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:22px;font-size:14px;text-align:center}
.seg span{padding:11px 0;border-right:1px solid #e2e8f0}.seg .on{background:#eff6ff;color:#1d4ed8;font-weight:600}
.choices{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.choices div{border:1px solid #e2e8f0;border-radius:14px;padding:16px;font-size:13px;color:#475569}
.choices b{display:block;color:#0f172a;font-size:14px;margin:10px 0 4px}
.choices i{display:block;width:32px;height:32px;border-radius:10px}
.choices .on{border:1.5px solid #2563eb;background:#f8fbff}
.foot{display:flex;justify-content:space-between;margin-top:28px}
.foot span{font-size:14px;color:#64748b;padding:12px 0}
.foot b{background:#2563eb;color:#fff;border-radius:12px;padding:12px 26px;font-size:14px}
`,
    `
<header><div class="logo"><i></i>Harbor</div><span>Need help? Chat with us</span></header>
<div class="steps"><div class="done"><b>✓</b>Account</div><hr/><div class="on"><b>2</b>Workspace</div><hr/><div><b>3</b>Invite team</div><hr/><div><b>4</b>Integrations</div></div>
<div class="card"><h2>Set up your workspace</h2><p>This is where your team's docs, tasks and decisions will live.</p>
  <label>Workspace name</label><div class="input">Acme Research</div>
  <label>Team size</label><div class="seg"><span>1–10</span><span class="on">11–50</span><span>51–200</span><span style="border:none">200+</span></div>
  <label>What will you use Harbor for?</label>
  <div class="choices"><div class="on"><i style="background:#dbeafe"></i><b>Product planning</b>Roadmaps and specs</div><div><i style="background:#dcfce7"></i><b>Research ops</b>Interviews and insights</div><div><i style="background:#fae8ff"></i><b>Team wiki</b>Docs and onboarding</div></div>
  <div class="foot"><span>← Back</span><b>Continue</b></div>
</div>`,
  );

const GALLERY_TEMPLATES: Record<GalleryTemplate, () => string> = {
  nimbus,
  aurora,
  pillar,
  fieldnote,
  kiln,
  orbit,
  sprout,
  lumen,
  cadence,
  tern,
  margin,
  harbor,
};

export function galleryPageHtml(template: GalleryTemplate): string {
  return GALLERY_TEMPLATES[template]();
}

const softLight = (): ArtworkSpec => ({
  width: 1080,
  height: 1350,
  html: page(
    1080,
    1350,
    `
body{background:#f2eee8;color:#1d1b1a;position:relative}
.blob{position:absolute;border-radius:50%;filter:blur(70px)}
.top{position:absolute;top:70px;left:80px;right:80px;display:flex;justify-content:space-between;font-size:26px;letter-spacing:.08em}
h1{position:absolute;left:72px;bottom:190px;font-size:250px;line-height:.86;letter-spacing:-.05em;font-weight:800}
.foot{position:absolute;left:80px;right:80px;bottom:80px;display:flex;justify-content:space-between;font-size:24px;border-top:3px solid #1d1b1a;padding-top:26px}
`,
    `
<div class="blob" style="width:620px;height:620px;left:-60px;top:180px;background:#ff8a7a"></div>
<div class="blob" style="width:560px;height:560px;right:-80px;top:120px;background:#ffc46b"></div>
<div class="blob" style="width:600px;height:600px;left:260px;top:520px;background:#a78bfa"></div>
<div class="blob" style="width:380px;height:380px;right:40px;top:640px;background:#5eead4"></div>
<div class="top"><span>POSTER SERIES</span><span>NO. 03</span></div>
<h1>SOFT<br/>LIGHT</h1>
<div class="foot"><span>Gradient mesh study</span><span>2026</span></div>`,
  ),
});

const onboarding = (): ArtworkSpec => {
  const phone = (label: string, inner: string) =>
    `<figure><div class="ph"><div class="s">${inner}</div></div><figcaption>${label}</figcaption></figure>`;
  return {
    width: 1600,
    height: 1000,
    html: page(
      1600,
      1000,
      `
body{background:linear-gradient(180deg,#e8edf8,#dfe6f5);display:flex;align-items:center;justify-content:center;gap:70px}
figure{text-align:center}
figcaption{margin-top:28px;font-size:22px;color:#475569;letter-spacing:.04em}
.ph{width:320px;height:660px;border-radius:52px;background:#0f172a;padding:14px;box-shadow:0 40px 80px rgba(15,23,42,.22)}
.s{width:100%;height:100%;border-radius:40px;background:#fff;padding:70px 30px 40px;display:flex;flex-direction:column;align-items:center;text-align:center}
.art{width:200px;height:200px;border-radius:50%;margin-bottom:44px;position:relative}
h2{font-size:28px;letter-spacing:-.02em;color:#0f172a}
p{font-size:16px;line-height:1.55;color:#64748b;margin-top:12px}
.btn{margin-top:auto;width:100%;border-radius:18px;background:#4f46e5;color:#fff;padding:18px;font-size:17px;font-weight:600}
.row{width:100%;display:flex;justify-content:space-between;align-items:center;border:1px solid #e2e8f0;border-radius:16px;padding:14px 16px;margin-top:14px;font-size:15px;color:#334155}
.tg{width:46px;height:28px;border-radius:99px;background:#4f46e5;position:relative}
.tg:after{content:"";position:absolute;right:3px;top:3px;width:22px;height:22px;border-radius:50%;background:#fff}
.tg.off{background:#cbd5e1}.tg.off:after{right:auto;left:3px}
`,
      `
${phone("01  WELCOME", '<div class="art" style="background:radial-gradient(circle at 35% 35%,#c7d2fe,#6366f1)"></div><h2>Welcome to Pocket</h2><p>Save anything you read and come back to it when you have time.</p><div class="btn">Get started</div>')}
${phone("02  NOTIFICATIONS", '<div class="art" style="width:150px;height:150px;border-radius:40px;background:linear-gradient(135deg,#fde68a,#f59e0b);margin-bottom:34px"></div><h2>Stay in the loop</h2><div class="row">Daily digest<span class="tg"></span></div><div class="row">Reading reminders<span class="tg"></span></div><div class="row">Product news<span class="tg off"></span></div><div class="btn">Continue</div>')}
${phone("03  READY", '<div class="art" style="background:radial-gradient(circle at 40% 35%,#bbf7d0,#16a34a)"><svg width="200" height="200" viewBox="0 0 200 200"><path d="M62 104 L90 130 L140 76" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/></svg></div><h2>You\'re all set</h2><p>Your first list is ready. Add the Pocket button to your browser to save faster.</p><div class="btn">Open my list</div>')}`,
    ),
  };
};

const PALETTE = [
  { name: "Plum Night", hex: "#3D2C4E" },
  { name: "Mauve", hex: "#7A4069" },
  { name: "Terracotta", hex: "#C9665C" },
  { name: "Apricot", hex: "#E8A87C" },
  { name: "Sand", hex: "#F6D6AD" },
];

const palette = (): ArtworkSpec => ({
  width: 1200,
  height: 1200,
  html: page(
    1200,
    1200,
    `
body{display:flex;font-family:${FONT_SANS}}
.c{flex:1;height:1200px;display:flex;flex-direction:column;justify-content:flex-end;padding:0 0 64px 30px}
.c b{font-size:28px}
.c span{font-family:${FONT_MONO};font-size:24px;margin-top:10px;opacity:.85}
h1{position:absolute;left:60px;top:64px;color:#f6d6ad;font-family:${FONT_SERIF};font-weight:400;font-size:76px;line-height:1}
h1 small{display:block;font-family:${FONT_SANS};font-size:22px;letter-spacing:.2em;margin-top:18px;opacity:.8}
`,
    `${PALETTE.map(
      (item, index) =>
        `<div class="c" style="background:${item.hex};color:${index < 3 ? "#fbeee0" : "#3d2c4e"}"><b>${item.name}</b><span>${item.hex}</span></div>`,
    ).join("")}<h1>Desert<br/>Dusk<small>COLOR STUDY · 05</small></h1>`,
  ),
});

export const PALETTE_COLORS = PALETTE.map((item) => item.hex);

const cohort = (): ArtworkSpec => {
  const weeks = 10;
  const rows = [
    "Apr 06",
    "Apr 13",
    "Apr 20",
    "Apr 27",
    "May 04",
    "May 11",
    "May 18",
    "May 25",
  ];
  const cells = rows
    .map((label, rowIndex) => {
      const available = weeks - rowIndex;
      const values = Array.from({ length: weeks }, (_, week) => {
        if (week >= available) return `<td class="empty"></td>`;
        const value =
          week === 0
            ? 100
            : Math.round(
                100 * Math.pow(0.72 + rowIndex * 0.012, Math.sqrt(week) * 1.25),
              );
        const alpha = (0.12 + (value / 100) * 0.88).toFixed(2);
        return `<td style="background:rgba(37,99,235,${alpha});color:${
          value > 45 ? "#fff" : "#1e3a8a"
        }">${value}%</td>`;
      }).join("");
      return `<tr><th>${label}</th><td class="n">${1200 + rowIndex * 87}</td>${values}</tr>`;
    })
    .join("");
  return {
    width: 1400,
    height: 900,
    html: page(
      1400,
      900,
      `
body{background:#f4f6fb;padding:60px}
.card{background:#fff;border-radius:28px;padding:44px 48px;box-shadow:0 20px 50px rgba(15,23,42,.07);height:780px}
h1{font-size:34px;letter-spacing:-.02em;color:#0f172a}
p{font-size:18px;color:#64748b;margin:8px 0 28px}
table{border-collapse:separate;border-spacing:6px;width:100%;font-size:16px}
th{color:#64748b;font-weight:500;text-align:left;padding-right:10px;white-space:nowrap}
thead th{font-size:14px;text-align:center}
td{height:56px;border-radius:10px;text-align:center;font-weight:600}
td.n{color:#334155;background:#f1f5f9;font-weight:500}
td.empty{background:#f8fafc}
`,
      `<div class="card"><h1>Weekly retention by signup cohort</h1><p>Share of users active in each week after signup</p><table><thead><tr><th></th><th>Users</th>${Array.from(
        { length: weeks },
        (_, week) => `<th>W${week}</th>`,
      ).join("")}</tr></thead><tbody>${cells}</tbody></table></div>`,
    ),
  };
};

const iconSet = (): ArtworkSpec => {
  const icon = (gradient: string, glyph: string) =>
    `<div class="i" style="background:${gradient}"><svg width="92" height="92" viewBox="0 0 92 92" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${glyph}</svg></div>`;
  return {
    width: 1200,
    height: 800,
    html: page(
      1200,
      800,
      `
body{background:#eef1f7;display:grid;grid-template-columns:repeat(3,220px);grid-auto-rows:220px;gap:64px 90px;justify-content:center;align-content:center}
.i{border-radius:56px;display:flex;align-items:center;justify-content:center;box-shadow:0 24px 40px rgba(15,23,42,.16),inset 0 -8px 0 rgba(0,0,0,.08)}
`,
      [
        icon(
          "linear-gradient(145deg,#60a5fa,#4f46e5)",
          '<circle cx="46" cy="46" r="26"/><path d="M46 32v14l10 8"/>',
        ),
        icon(
          "linear-gradient(145deg,#fbbf24,#f97316)",
          '<path d="M52 12 26 50h20l-6 30 26-38H46z"/>',
        ),
        icon(
          "linear-gradient(145deg,#34d399,#0d9488)",
          '<path d="M22 70c0-30 18-46 48-48 0 30-16 48-46 48"/><path d="M22 70 48 44"/>',
        ),
        icon(
          "linear-gradient(145deg,#f472b6,#db2777)",
          '<path d="M18 24h56v36H40l-14 12V60h-8z"/>',
        ),
        icon(
          "linear-gradient(145deg,#a78bfa,#7c3aed)",
          '<rect x="16" y="28" width="60" height="44" rx="10"/><circle cx="46" cy="50" r="12"/><path d="M34 28l6-10h12l6 10"/>',
        ),
        icon(
          "linear-gradient(145deg,#94a3b8,#334155)",
          '<path d="M26 16h30l12 12v48H26z"/><path d="M36 44h20M36 56h20"/>',
        ),
      ].join(""),
    ),
  };
};

const CLIP_ARTWORKS: Record<ClipArtwork, () => ArtworkSpec> = {
  softLight,
  onboarding,
  palette,
  cohort,
  iconSet,
};

export function clipArtwork(artwork: ClipArtwork): ArtworkSpec {
  return CLIP_ARTWORKS[artwork]();
}

/**
 * Source article for the image clip save screenshot: the icon set is the
 * image the user right-clicks, surrounded by ordinary article content.
 */
export function studioNotesPageHtml(imageUrl: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Studio Notes — Refreshing our icon system</title>
    <meta name="description" content="How we rebuilt a rounded glyph icon set with one stroke weight and soft gradients." />
    <style>
      :root { color-scheme: light; font-family: ${FONT_SANS}; color: #1e293b; background: #ffffff; }
      body { margin: 0; }
      header { display: flex; align-items: center; gap: 10px; padding: 18px 56px; border-bottom: 1px solid #e5e9f0; font-weight: 700; }
      header i { width: 14px; height: 14px; border-radius: 4px; background: linear-gradient(135deg, #f472b6, #6366f1); }
      main { max-width: 820px; margin: 0 auto; padding: 48px 24px 96px; }
      .kicker { font-size: 13px; letter-spacing: .12em; color: #6366f1; font-weight: 700; }
      h1 { font-size: 40px; line-height: 1.2; margin: 12px 0 14px; letter-spacing: -0.02em; }
      .meta { color: #64748b; font-size: 14px; margin-bottom: 30px; }
      p { font-size: 17px; line-height: 1.75; color: #334155; margin: 0 0 18px; }
      figure { margin: 30px 0; }
      figure img { display: block; width: 100%; border-radius: 16px; border: 1px solid #e2e8f0; }
      figcaption { margin-top: 10px; font-size: 14px; color: #64748b; }
    </style>
  </head>
  <body>
    <header><i></i>Studio Notes</header>
    <main>
      <div class="kicker">DESIGN SYSTEMS</div>
      <h1>Refreshing our icon system</h1>
      <p class="meta">June 2026 · 6 min read</p>
      <p>We rebuilt the product icon set around a single stroke weight, a rounded 56px corner radius, and soft two-stop gradients, so every surface reads as part of the same family.</p>
      <figure>
        <img src="${imageUrl}" alt="Rounded glyph app icon set" width="1200" height="800" />
        <figcaption>Six app icons from the refreshed set: time, energy, growth, messages, camera, and notes.</figcaption>
      </figure>
      <p>Each glyph is drawn on a 92px grid with the same 7px stroke and rounded joins. Gradients always run from the lighter tone at the top-left to the deeper tone at the bottom-right.</p>
    </main>
  </body>
</html>`;
}
