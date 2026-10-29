// WaytoAGI 城市站 kit v1：给页面插入全站统一的页眉和页脚，接入全站统计（Umami + GA4），并提供本城活动（wta.events、<wta-events>）。
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

  // ===== 本城活动：数据层 wta.events + 展示组件 <wta-events>（都可选，城市也可以自己调接口）=====
  // 数据来自活动平台公开接口，它允许城市站跨域读取。这里统一处理几个坑：封面是活动平台的相对地址、
  // 个别活动没有开始日期、近期 / 往期按北京时间划分、城市名用 cities.json 里的标准写法（eventsCity）。
  const EVENTS_API = `${LINKS.events}/api/v1/events`;
  const KIND = { hackathon: "黑客松", meetup: "线下聚会", conference: "大会", workshop: "工作坊", livestream: "直播" };
  const WEEKDAY = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  let citiesPromise;
  const eventsCache = new Map();

  const escapeHtml = (text) =>
    String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // 构建时生成的城市名册（slug、name、eventsCity），和 kit 一起发布
  function loadCities() {
    citiesPromise ??= fetch(new URL("cities.json", assetBase))
      .then((res) => (res.ok ? res.json() : []))
      .catch(() => []);
    return citiesPromise;
  }

  async function currentCity() {
    const city = (await loadCities()).find((c) => c.slug === cityTag);
    if (!city) return null;
    return { ...city, url: `${LINKS.events}/?city=${encodeURIComponent(city.eventsCity)}` };
  }

  function coverUrl(cover) {
    if (!cover) return null;
    try {
      const url = new URL(cover, LINKS.events);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch {
      return null;
    }
  }

  async function fetchCityEvents(eventsCity) {
    const raw = [];
    let cursor = "";
    for (let page = 0; page < 20; page++) {
      const url = new URL(EVENTS_API);
      url.searchParams.set("city", eventsCity);
      url.searchParams.set("limit", "50");
      if (cursor) url.searchParams.set("cursor", cursor);
      const res = await fetch(url, { credentials: "omit" });
      if (!res.ok) throw new Error(`活动平台返回 ${res.status}`);
      const body = await res.json();
      raw.push(...(Array.isArray(body.items) ? body.items : []));
      cursor = body.nextCursor ?? "";
      if (!cursor) break;
    }
    return raw;
  }

  /** wta.events.list({ city?, view?: "all" | "upcoming" | "past", limit? })：返回整理好的活动数组 */
  async function listEvents({ city, view = "all", limit } = {}) {
    const eventsCity = city ?? (await currentCity())?.eventsCity;
    if (!eventsCity) throw new Error(`cities.json 里没有当前城市（${cityTag}）`);
    if (!eventsCache.has(eventsCity)) eventsCache.set(eventsCity, fetchCityEvents(eventsCity));
    let raw;
    try {
      raw = await eventsCache.get(eventsCity);
    } catch (error) {
      eventsCache.delete(eventsCity);
      throw error;
    }
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
    const events = raw
      .filter((e) => typeof e.date === "string" && e.date)
      .map((e) => ({
        id: e.id,
        title: e.title ?? "",
        date: e.date,
        endDate: e.endDate || null,
        venue: e.venue || null,
        organizer: e.organizerName || null,
        kind: e.eventKind || null,
        kindLabel: KIND[e.eventKind] ?? "活动",
        online: e.eventMode === "online",
        cover: coverUrl(e.cover),
        url: `${LINKS.events}/events/${encodeURIComponent(e.id)}`,
        upcoming: (e.endDate || e.date) >= today,
      }));
    const upcoming = events.filter((e) => e.upcoming).sort((a, b) => a.date.localeCompare(b.date));
    const past = events.filter((e) => !e.upcoming).sort((a, b) => b.date.localeCompare(a.date));
    const picked = view === "upcoming" ? upcoming : view === "past" ? past : [...upcoming, ...past];
    return limit ? picked.slice(0, limit) : picked;
  }

  window.wta.events = { list: listEvents, city: currentCity };

  const EVENTS_CSS = `
    :host { color: #151515; }
    h3 { margin: 0 0 12px; font-size: 20px; }
    section + section { margin-top: 32px; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-variant-numeric: tabular-nums; }
    .rows { list-style: none; margin: 0; padding: 0; border: 1px solid #d5d5d5; background: #fff; }
    .rows li + li { border-top: 1px solid #d5d5d5; }
    .row { display: grid; grid-template-columns: 5.5rem minmax(0, 1fr) auto; gap: 16px; align-items: center; padding: 14px 20px; }
    .row:hover { background: #f7f7f7; }
    .row:hover .t, .row:hover .arrow { color: #0032ff; }
    .date b { display: block; font-size: 20px; line-height: 1; }
    .date small { display: block; margin-top: 4px; font-size: 10px; letter-spacing: 0.08em; color: #525252; }
    .t { display: block; font-weight: 600; }
    .sub { display: block; margin-top: 2px; font-size: 12px; color: #525252; }
    .arrow { color: #525252; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .card { display: flex; flex-direction: column; border: 1px solid #d5d5d5; background: #fff; }
    .card:hover { border-color: #151515; }
    .cover { aspect-ratio: 16 / 9; background: #e1e1e1; overflow: hidden; display: grid; place-items: center; color: #525252; }
    .cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .body { padding: 12px 14px 14px; }
    .body .mono { font-size: 11px; color: #525252; }
    .body b { display: block; margin-top: 4px; font-size: 15px; line-height: 1.5; }
    .state, .more { margin: 12px 0 0; font-size: 14px; color: #525252; }
    .state a, .more a { color: #0032ff; }
    @media (max-width: 640px) { .row { grid-template-columns: 4.5rem minmax(0, 1fr); padding: 12px 16px; } .arrow { display: none; } }
  `;

  function eventRow(e) {
    const range = e.endDate && e.endDate !== e.date ? ` → ${e.endDate.slice(5).replace("-", ".")}` : "";
    const [y, m, d] = e.date.split("-").map(Number);
    const sub = [e.kindLabel + (e.online ? " · 线上" : ""), e.organizer, e.venue].filter(Boolean).map(escapeHtml).join(" · ");
    return `<li><a class="row" href="${escapeHtml(e.url)}" target="_blank" rel="noopener" data-id="${escapeHtml(e.id)}">
      <span class="date mono"><b>${e.date.slice(5).replace("-", ".")}</b><small>${WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}${range}</small></span>
      <span><span class="t">${escapeHtml(e.title)}</span><span class="sub">${sub}</span></span>
      <span class="arrow" aria-hidden="true">↗</span></a></li>`;
  }

  function eventCard(e) {
    const cover = e.cover ? `<img src="${escapeHtml(e.cover)}" alt="" loading="lazy">` : escapeHtml(e.kindLabel);
    return `<a class="card" href="${escapeHtml(e.url)}" target="_blank" rel="noopener" data-id="${escapeHtml(e.id)}">
      <span class="cover">${cover}</span>
      <span class="body"><span class="mono">${e.date.replaceAll("-", ".")} · ${escapeHtml(e.kindLabel)}</span><b>${escapeHtml(e.title)}</b></span></a>`;
  }

  // <wta-events view="all|upcoming|past" limit="12" city="上海">：都不填时按当前城市显示近期 + 最近 12 场往期
  customElements.define(
    "wta-events",
    class extends HTMLElement {
      async connectedCallback() {
        if (this.shadowRoot) return;
        const root = this.attachShadow({ mode: "open" });
        root.innerHTML = `<style>${TOKENS}${EVENTS_CSS}</style><p class="state">活动加载中…</p>`;
        root.addEventListener("click", (event) => {
          const link = event.target.closest?.("a[data-id]");
          if (link) window.wta.track("event_click", { city: cityTag, id: link.dataset.id });
        });
        const view = this.getAttribute("view") || "all";
        const limit = Number(this.getAttribute("limit")) || 12;
        const city = this.getAttribute("city") || undefined;
        const cityInfo = await currentCity();
        const allUrl = city ? `${LINKS.events}/?city=${encodeURIComponent(city)}` : (cityInfo?.url ?? LINKS.events);
        let html = "";
        try {
          if (view !== "past") {
            const upcoming = await listEvents({ city, view: "upcoming" });
            html += `<section><h3>近期活动</h3>${upcoming.length ? `<ol class="rows">${upcoming.map(eventRow).join("")}</ol>` : `<p class="state">暂时没有即将开始的活动。</p>`}</section>`;
          }
          if (view !== "upcoming") {
            const past = await listEvents({ city, view: "past" });
            html += `<section><h3>往期回顾</h3><div class="grid">${past.slice(0, limit).map(eventCard).join("")}</div></section>`;
          }
          html += `<p class="more"><a href="${escapeHtml(allUrl)}" target="_blank" rel="noopener">去活动平台看全部活动 ↗</a></p>`;
        } catch {
          html = `<p class="state">暂时无法加载活动，<a href="${escapeHtml(allUrl)}" target="_blank" rel="noopener">去活动平台查看 ↗</a></p>`;
        }
        root.innerHTML = `<style>${TOKENS}${EVENTS_CSS}</style>${html}`;
      }
    },
  );

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
