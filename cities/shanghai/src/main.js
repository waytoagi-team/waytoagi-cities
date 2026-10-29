import "./style.css";

// 活动数据实时来自活动平台，通过 kit 的数据层 window.wta.events 取（封面、日期、城市名都已处理好），
// 展示样式由本城自己决定。这是「数据由总部提供、样式城市自定」的样例写法。
const PAST_LIMIT = 12;

// 城市资料取自官网公开数据：admin.waytoagi.com/api/public/cities（坐标、区域、亮点）
// 和 waytoagi-web 的 lib/city-landmarks.ts（地标、文化符号）。
const CITY = {
  name: "上海",
  pinyin: "SHANGHAI",
  region: "华东",
  lat: 31.2304,
  lng: 121.4737,
  landmark: "东方明珠 · 陆家嘴",
  symbols: ["外滩", "石库门", "海派"],
  highlight: "AI 切磋大会 · AGI Bar",
};
const CITY_EVENTS = `https://events.waytoagi.com/?city=${encodeURIComponent(CITY.name)}`;

const WEEKDAY = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const mmdd = (d) => d.slice(5).replace("-", ".");
const weekday = (d) => {
  const [y, m, day] = d.split("-").map(Number);
  return WEEKDAY[new Date(Date.UTC(y, m - 1, day)).getUTCDay()];
};
const coord = (lat, lng) => `N ${lat.toFixed(2)}° · E ${lng.toFixed(2)}°`;

// 地标线稿：照搬官网 components/CityLandmark.tsx 的上海线稿（160×100 画布、单线、新生绿太阳）。
function waves(y, from = 8, to = 152, step = 12) {
  let d = `M${from} ${y}`;
  for (let x = from; x < to; x += step) d += `q${step / 4} -2 ${step / 2} 0t${step / 2} 0`;
  return `<path d="${d}"/>`;
}
const LANDMARK = `
  <svg viewBox="0 0 160 100" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="136" cy="22" r="11" fill="#d4ff70" stroke="none"/>
    <path d="M70 92L77 22M90 92L83 22M80 92V22"/>
    <circle cx="80" cy="64" r="12"/><circle cx="80" cy="36" r="8"/><circle cx="80" cy="19" r="3"/>
    <path d="M80 16V4M68 64H92M72 36H88"/>
    <path d="M110 92V34Q114 26 120 24V92M114 40V88"/>
    <path d="M126 92V38H138V92M130 42H134V46H130Z"/>
    <path d="M18 92V74H30V92M32 92V66H44V92M48 92V78H58V92"/>
    ${waves(97)}
  </svg>`;

const ticks = '<i class="tick tl"></i><i class="tick tr"></i><i class="tick bl"></i><i class="tick br"></i>';

function upcomingRow(e) {
  const range = e.endDate && e.endDate !== e.date ? ` → ${mmdd(e.endDate)}` : "";
  return `
    <li><a class="row" href="${escapeHtml(e.url)}" target="_blank" rel="noopener" data-id="${escapeHtml(e.id)}">
      <span class="date"><b>${mmdd(e.date)}</b><small>${weekday(e.date)}${range}</small></span>
      <span class="row-main">
        <span class="row-title">${escapeHtml(e.title)}</span>
        <span class="row-sub">${escapeHtml(e.kindLabel)}${e.organizer ? ` · ${escapeHtml(e.organizer)}` : ""}${e.venue ? ` · ${escapeHtml(e.venue)}` : ""}</span>
      </span>
      <span class="arrow" aria-hidden="true">↗</span>
    </a></li>`;
}

function pastCard(e) {
  const cover = e.cover ? `<img src="${escapeHtml(e.cover)}" alt="" loading="lazy">` : `<span>${escapeHtml(e.kindLabel)}</span>`;
  return `
    <a class="card" href="${escapeHtml(e.url)}" target="_blank" rel="noopener" data-id="${escapeHtml(e.id)}">
      <div class="cover">${cover}</div>
      <div class="card-body">
        <div class="mono">${e.date.replaceAll("-", ".")} · ${escapeHtml(e.kindLabel)}</div>
        <h3>${escapeHtml(e.title)}</h3>
        ${e.organizer ? `<p>${escapeHtml(e.organizer)}</p>` : ""}
      </div>
    </a>`;
}

document.querySelector("#app").innerHTML = `
  <aside class="sample-notice" role="note">
    <div class="container">
      <span class="sample-tag mono">样例</span>
      <p>这是城市站的<b>样例页面</b>，用来演示城市站的结构和做法，<b>不是上海的正式站点</b>。正式内容由上海组织者建设中。</p>
      <a href="https://github.com/waytoagi-team/waytoagi-cities" target="_blank" rel="noopener">申请成为上海站管理者 ↗</a>
    </div>
  </aside>

  <section class="hero">
    <div class="container hero-grid">
      <div>
        <span class="chip">城市 Chapter</span>
        <div class="title">
          <span class="sign"><span><b>${CITY.name}</b><small>${CITY.pinyin}</small></span></span>
          <h1>上海站</h1>
        </div>
        <p class="lead">在上海，和 AI 爱好者、开发者、创作者一起学习、交流、共创。</p>
        <ul class="symbols">${CITY.symbols.map((s) => `<li>${s}</li>`).join("")}</ul>
        <p class="highlight">${CITY.highlight}</p>
        <div class="actions">
          <a class="btn btn-cta" href="#upcoming">近期活动 <span aria-hidden="true">→</span></a>
          <a class="btn" href="${CITY_EVENTS}" target="_blank" rel="noopener">在活动平台查看全部 ↗</a>
        </div>
      </div>
      <figure class="landmark">
        ${ticks}
        <div class="mono landmark-meta"><span>${coord(CITY.lat, CITY.lng)}</span><span>${CITY.region}</span></div>
        ${LANDMARK}
        <figcaption>${CITY.landmark}</figcaption>
      </figure>
    </div>
  </section>

  <div class="container">
    <dl class="stats">
      <div><dt>活动平台收录的上海活动</dt><dd class="mono"><span data-stat="total">—</span><small>场</small></dd></div>
      <div><dt>即将开始</dt><dd class="mono"><span data-stat="upcoming">—</span><small>场</small></dd></div>
      <div><dt>WaytoAGI 主办或联合主办</dt><dd class="mono"><span data-stat="hosted">—</span><small>场</small></dd></div>
    </dl>

    <section class="panel" id="upcoming">
      <header class="panel-head">
        <div>
          <span class="next-stop mono">NEXT STOP</span>
          <h2>接下来，在上海见</h2>
        </div>
        <span class="mono muted" data-stat="upcoming-events"></span>
      </header>
      <div id="upcoming-list"><p class="empty">活动加载中…</p></div>
      <footer class="panel-foot"><a href="${CITY_EVENTS}" target="_blank" rel="noopener">去活动站看上海全部活动 ↗</a></footer>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>往期回顾</h2>
        <span class="mono muted" data-stat="past-events"></span>
      </div>
      <div id="past-list"></div>
      <p class="note">活动数据实时来自 WaytoAGI 活动平台。</p>
    </section>

    <section class="section">
      <div class="section-head"><h2>关于上海站</h2></div>
      <div class="todo">
        ${ticks}
        <p>这一部分待上海组织者补充：</p>
        <ul>
          <li>上海社区介绍：我们是谁，在做什么</li>
          <li>主理人和核心成员</li>
          <li>加入方式，例如社群二维码</li>
        </ul>
        <p>想一起建设上海站？<a href="https://github.com/waytoagi-team/waytoagi-cities" target="_blank" rel="noopener">申请成为城市管理者 ↗</a></p>
      </div>
    </section>
  </div>
`;

const app = document.querySelector("#app");
const setText = (key, text) => app.querySelectorAll(`[data-stat="${key}"]`).forEach((el) => (el.textContent = text));

// 点活动时上报，和 kit 组件同一个事件名，方便各城市对比
app.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-id]");
  if (link) window.wta?.track("event_click", { city: "shanghai", id: link.dataset.id });
});

async function loadEvents() {
  const events = await window.wta.events.list();
  const upcoming = events.filter((e) => e.upcoming);
  const past = events.filter((e) => !e.upcoming);
  setText("total", String(events.length));
  setText("upcoming", String(upcoming.length));
  setText("hosted", String(events.filter((e) => /waytoagi/i.test(e.organizer ?? "")).length));
  setText("upcoming-events", `${upcoming.length} EVENTS`);
  setText("past-events", `${past.length} EVENTS`);
  app.querySelector("#upcoming-list").innerHTML = upcoming.length
    ? `<ol class="rows">${upcoming.map(upcomingRow).join("")}</ol>`
    : `<p class="empty">暂时没有即将开始的活动。</p>`;
  app.querySelector("#past-list").innerHTML =
    `<div class="grid">${past.slice(0, PAST_LIMIT).map(pastCard).join("")}</div>` +
    (past.length > PAST_LIMIT
      ? `<p class="more"><a href="${CITY_EVENTS}" target="_blank" rel="noopener">查看全部 ${past.length} 场往期活动 ↗</a></p>`
      : "");
}

loadEvents().catch(() => {
  const fallback = `<p class="empty">暂时无法加载活动，<a href="${CITY_EVENTS}" target="_blank" rel="noopener">去活动平台查看 ↗</a></p>`;
  app.querySelector("#upcoming-list").innerHTML = fallback;
  app.querySelector("#past-list").innerHTML = "";
});
