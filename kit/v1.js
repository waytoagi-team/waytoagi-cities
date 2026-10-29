// WaytoAGI 城市站 kit v1：给页面插入全站统一的页眉和页脚，并接入全站统计（Umami + GA4）。
// 用法（放在 <head> 里）：<script src="https://cities.waytoagi.com/kit/v1.js" defer></script>
// 页眉页脚放在 Shadow DOM 里，和城市页面的样式互不影响。视觉 token 取自官网 waytoagi-web（themes.css）。
(() => {
  if (window.__wtaKit) return;
  window.__wtaKit = { version: 1 };

  // 全站统计：WaytoAGI 自托管 Umami（infra apps/umami），cities.waytoagi.com 一个站点，
  // 按路径第一段打城市标签（data-tag），本地开发和预览不上报（data-domains）。
  const UMAMI = {
    src: "https://a.waytoagi.com/script.js",
    websiteId: "34b08736-94d7-4e7e-bfc8-65a3bc90a926",
    domains: "cities.waytoagi.com",
  };
  const firstSegment = location.pathname.split("/")[1] ?? "";
  const cityTag = /^[a-z][a-z0-9-]*$/.test(firstSegment) ? firstSegment : "home";

  // 城市自定义埋点：wta.track("事件名", { 可选数据 })。统计脚本还没加载完时先排队。
  const pending = [];
  window.wta = {
    track(name, data) {
      window.gtag?.("event", name, data);
      if (window.umami) window.umami.track(name, data);
      else pending.push([name, data]);
    },
  };

  // GA4：两个衡量 ID 共用一份 gtag.js。gtag.js 在境内经常很慢，提前插入会拖住页面 load，
  // 而 Umami 要等 load 完成才发 pageview，所以等 load 之后再插入；只在正式域名加载。GA 会写 _ga Cookie。
  const GA_IDS = ["G-861F9YGB8L", "G-X2EXEE4LZW"];

  function setupGA() {
    if (location.hostname !== UMAMI.domains || window.gtag) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    // 和 Umami 一致：上报的网址不带参数和 #，来源只保留域名；content_group 按城市分组，GA 后台不用额外配置。
    const config = { page_location: location.origin + location.pathname, content_group: cityTag };
    try {
      if (document.referrer) config.page_referrer = new URL(document.referrer).origin;
    } catch {
      // 来源解析不了就不传，GA 用它自己的默认值
    }
    for (const id of GA_IDS) window.gtag("config", id, config);
    const insert = () => {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_IDS[0]}`;
      document.head.append(script);
    };
    if (document.readyState === "complete") insert();
    else window.addEventListener("load", insert, { once: true });
  }

  // 不等 body：先建好 gtag 队列，kit 初始化前调用的 wta.track 也能进 GA；gtag.js 本身仍等 load 之后插入。
  setupGA();

  function loadAnalytics() {
    if (document.querySelector(`script[src="${UMAMI.src}"]`)) return;
    // 来源只保留域名，外站链接里的参数不进统计；本站网址的参数和 # 由 data-exclude-* 去掉。
    window.__wtaBeforeSend = (type, payload) => {
      if (payload?.referrer) {
        try {
          payload.referrer = new URL(payload.referrer).origin;
        } catch {
          payload.referrer = "";
        }
      }
      return payload;
    };
    const script = document.createElement("script");
    script.defer = true;
    script.src = UMAMI.src;
    Object.assign(script.dataset, {
      websiteId: UMAMI.websiteId,
      domains: UMAMI.domains,
      tag: cityTag,
      excludeSearch: "true",
      excludeHash: "true",
      beforeSend: "__wtaBeforeSend",
    });
    script.addEventListener("load", () => {
      for (const [name, data] of pending.splice(0)) window.umami?.track(name, data);
    });
    document.head.append(script);
  }

  const assetBase = new URL(".", document.currentScript?.src ?? location.href);
  const LINKS = {
    cities: "https://cities.waytoagi.com/",
    events: "https://events.waytoagi.com",
    wiki: "https://waytoagi.feishu.cn/wiki/QPe5w5g7UisbEkkow8XcDmOpn8e",
    home: "https://www.waytoagi.com",
    repo: "https://github.com/waytoagi-team/waytoagi-cities",
    privacy: "https://cities.waytoagi.com/privacy/",
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
        <span>© ${new Date().getFullYear()} 通往 AGI 之路 · <a href="${LINKS.privacy}">隐私政策</a></span>
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
    loadAnalytics();
  }

  if (document.body) init();
  else document.addEventListener("DOMContentLoaded", init);
})();
