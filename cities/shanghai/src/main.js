import "./style.css";
import data from "./events.json";

const EVENTS_SITE = "https://events.waytoagi.com";
const CITY_EVENTS = `${EVENTS_SITE}/?city=${encodeURIComponent(data.city)}`;
const KIND = { conference: "大会", hackathon: "黑客松", meetup: "聚会", workshop: "工作坊" };
const PAST_LIMIT = 12;

function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function formatDate(date, endDate) {
  const fmt = (d) => {
    const [y, m, day] = d.split("-").map(Number);
    return { y, text: `${m} 月 ${day} 日` };
  };
  const start = fmt(date);
  const year = start.y === new Date().getFullYear() ? "" : `${start.y} 年 `;
  if (!endDate || endDate === date) return `${year}${start.text}`;
  return `${year}${start.text} – ${fmt(endDate).text}`;
}

function eventCard(e) {
  const kind = KIND[e.eventKind] ?? "活动";
  const mode = e.eventMode === "online" ? " · 线上" : "";
  const cover = e.cover
    ? `<img src="${escapeHtml(e.cover)}" alt="" loading="lazy">`
    : `<div class="cover-empty">${kind}</div>`;
  return `
    <a class="card" href="${EVENTS_SITE}/events/${encodeURIComponent(e.id)}" target="_blank" rel="noopener">
      <div class="cover">${cover}</div>
      <div class="body">
        <div class="meta"><span class="kind">${kind}${mode}</span>${formatDate(e.date, e.endDate)}</div>
        <h3>${escapeHtml(e.title)}</h3>
        ${e.venue ? `<p class="venue">${escapeHtml(e.venue)}</p>` : ""}
        ${e.organizerName ? `<p class="org">主办：${escapeHtml(e.organizerName)}</p>` : ""}
      </div>
    </a>`;
}

// 按当天日期区分近期和往期，不依赖快照里的状态（快照可能是几天前拉的）。
const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
const upcoming = data.events.filter((e) => (e.endDate ?? e.date) >= today).sort((a, b) => a.date.localeCompare(b.date));
const past = data.events.filter((e) => (e.endDate ?? e.date) < today).sort((a, b) => b.date.localeCompare(a.date));
const hosted = data.events.filter((e) => /waytoagi/i.test(e.organizerName ?? "")).length;
const snapshotDate = new Date(data.fetchedAt).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" });

document.querySelector("#app").innerHTML = `
  <section class="hero">
    <div class="container">
      <p class="eyebrow">WaytoAGI 城市站</p>
      <h1>上海站</h1>
      <p class="lead">在上海，和 AI 爱好者、开发者、创作者一起学习、交流、共创。</p>
      <div class="actions">
        <a class="btn primary" href="#upcoming">近期活动</a>
        <a class="btn" href="${CITY_EVENTS}" target="_blank" rel="noopener">在活动平台查看全部</a>
      </div>
      <dl class="stats">
        <div><dt>活动平台收录的上海活动</dt><dd>${data.events.length} 场</dd></div>
        <div><dt>即将开始</dt><dd>${upcoming.length} 场</dd></div>
        <div><dt>WaytoAGI 主办或联合主办</dt><dd>${hosted} 场</dd></div>
      </dl>
    </div>
  </section>

  <section class="container section" id="upcoming">
    <h2>近期活动</h2>
    ${upcoming.length > 0
      ? `<div class="grid">${upcoming.map(eventCard).join("")}</div>`
      : `<p class="empty">暂时没有即将开始的活动，<a href="${CITY_EVENTS}" target="_blank" rel="noopener">去活动平台看看</a>。</p>`}
  </section>

  <section class="container section">
    <h2>往期回顾</h2>
    <div class="grid">${past.slice(0, PAST_LIMIT).map(eventCard).join("")}</div>
    ${past.length > PAST_LIMIT ? `<p class="more"><a href="${CITY_EVENTS}" target="_blank" rel="noopener">查看全部 ${past.length} 场往期活动 →</a></p>` : ""}
    <p class="note">活动数据来自 WaytoAGI 活动平台，更新于 ${snapshotDate}。</p>
  </section>

  <section class="container section">
    <h2>关于上海站</h2>
    <div class="todo">
      <p>这一部分待上海组织者补充：</p>
      <ul>
        <li>上海社区介绍：我们是谁，在做什么</li>
        <li>主理人和核心成员</li>
        <li>加入方式，例如社群二维码</li>
      </ul>
      <p>想一起建设上海站？<a href="https://github.com/waytoagi-team/waytoagi-cities" target="_blank" rel="noopener">申请成为城市管理者</a></p>
    </div>
  </section>
`;
