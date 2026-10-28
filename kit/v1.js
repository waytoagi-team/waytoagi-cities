// WaytoAGI 城市站 kit v1：给页面插入全站统一的页眉和页脚。
// 用法（放在 <head> 里）：<script src="https://cities.waytoagi.com/kit/v1.js" defer></script>
// 页眉页脚放在 Shadow DOM 里，和城市页面的样式互不影响。视觉 token 取自官网 waytoagi-web（themes.css）。
(() => {
  if (window.__wtaKit) return;
  window.__wtaKit = { version: 1 };

  const assetBase = new URL(".", document.currentScript?.src ?? location.href);
  const LINKS = {
    cities: "https://cities.waytoagi.com/",
    events: "https://events.waytoagi.com",
    wiki: "https://waytoagi.feishu.cn/wiki/QPe5w5g7UisbEkkow8XcDmOpn8e",
    home: "https://www.waytoagi.com",
    repo: "https://github.com/waytoagi-team/waytoagi-cities",
  };
  const NAV = [
    { label: "城市站", href: LINKS.cities },
    { label: "活动", href: LINKS.events },
    { label: "知识库", href: LINKS.wiki },
    { label: "官网", href: LINKS.home },
  ];

  const TOKENS = `
    :host { all: initial; display: block; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Source Han Sans SC", "Noto Sans SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", sans-serif; color: #151515; line-height: 1.6; -webkit-font-smoothing: antialiased; }
    * { box-sizing: border-box; }
    a { color: inherit; text-decoration: none; }
    .wrap { max-width: 1328px; margin: 0 auto; padding: 0 20px; }
  `;

  const HEADER = `
    <style>${TOKENS}
      /* 顶条随页面滚走、页眉吸顶：整体 sticky，top 取负的顶条高度 */
      :host { position: sticky; top: -36px; z-index: 2147483000; background: #fff; border-bottom: 1px solid #d5d5d5; }
      .banner { display: block; height: 36px; line-height: 36px; background: #d4ff70; text-align: center; font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 12px; }
      .banner:hover { opacity: 0.9; }
      .bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; height: 64px; }
      .brand { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
      .brand img { height: 56px; width: auto; display: block; }
      .tag { background: #d4ff70; padding: 2px 8px; font-size: 14px; font-weight: 600; white-space: nowrap; }
      nav { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; }
      nav a { padding: 8px 12px; font-size: 15px; color: #333; white-space: nowrap; }
      nav a:hover { color: #151515; background: #f7f7f7; }
      @media (max-width: 640px) {
        .brand img { height: 40px; }
        .tag { display: none; }
        .banner { font-size: 12px; }
        nav a { padding: 6px 8px; font-size: 14px; }
      }
    </style>
    <a class="banner" href="${LINKS.wiki}" target="_blank" rel="noopener">前往 WaytoAGI 飞书知识库 · 1 亿+ 次访问的开源 AI 知识库 →</a>
    <div class="wrap bar">
      <a class="brand" href="${LINKS.cities}" aria-label="WaytoAGI 城市站">
        <img src="${new URL("logo.svg", assetBase)}" alt="通往 AGI 之路 WaytoAGI" width="317" height="101">
        <span class="tag">城市站</span>
      </a>
      <nav aria-label="WaytoAGI 全站导航">
        ${NAV.map((n) => `<a href="${n.href}"${n.href.startsWith(LINKS.cities) ? "" : ' target="_blank" rel="noopener"'}>${n.label}</a>`).join("")}
      </nav>
    </div>
  `;

  const FOOTER = `
    <style>${TOKENS}
      :host { margin-top: 64px; background: #f7f7f7; border-top: 1px solid #e6e6e6; }
      .main { display: grid; grid-template-columns: 2fr 1fr; gap: 32px; padding: 48px 20px; }
      .name { font-size: 18px; font-weight: 600; }
      .name span { color: #5f5f5f; }
      p { margin: 12px 0 0; font-size: 14px; color: #525252; max-width: 28em; }
      h2 { margin: 0; font-size: 14px; font-weight: 600; color: #333; }
      ul { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 8px; font-size: 14px; color: #525252; }
      li a:hover { color: #151515; }
      .legal { border-top: 1px solid #e6e6e6; }
      .legal .wrap { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 16px; padding-top: 20px; padding-bottom: 20px; font-size: 12px; color: #5f5f5f; }
      .legal a:hover { color: #151515; }
      .beian { display: flex; flex-wrap: wrap; gap: 16px; }
      @media (max-width: 640px) { .main { grid-template-columns: 1fr; padding: 32px 20px; } }
    </style>
    <div class="wrap main">
      <div>
        <div class="name">通往 AGI 之路 <span>WaytoAGI</span></div>
        <p>WaytoAGI 各城市社区的展示站，由各地组织者共同建设。</p>
        <p>因 AI 而强大 · Empowering with AI</p>
      </div>
      <div>
        <h2>导航</h2>
        <ul>
          ${NAV.map((n) => `<li><a href="${n.href}">${n.label}</a></li>`).join("")}
          <li><a href="${LINKS.repo}" target="_blank" rel="noopener">为你的城市建站</a></li>
        </ul>
      </div>
    </div>
    <div class="legal">
      <div class="wrap">
        <span>© ${new Date().getFullYear()} 通往 AGI 之路</span>
        <span class="beian">
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">浙ICP备2023022291号-2</a>
          <a href="https://beian.mps.gov.cn/" target="_blank" rel="noopener">浙公网安备33011002017528</a>
        </span>
      </div>
    </div>
  `;

  function mount(tag, html, place) {
    const host = document.querySelector(tag) ?? document.createElement(tag);
    if (!host.isConnected) place(host);
    host.attachShadow({ mode: "open" }).innerHTML = html;
  }

  function init() {
    // 去掉浏览器默认的 body 外边距，页眉页脚才能贴边；城市自己的内容宽度请放在自己的容器上。
    document.head.insertAdjacentHTML("beforeend", "<style>body{margin:0}</style>");
    mount("wta-header", HEADER, (host) => document.body.prepend(host));
    mount("wta-footer", FOOTER, (host) => document.body.append(host));
  }

  if (document.body) init();
  else document.addEventListener("DOMContentLoaded", init);
})();
