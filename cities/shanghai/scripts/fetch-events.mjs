// 构建前从活动平台拉取上海的已发布活动，写成 src/events.json。
// 活动平台接口不允许跨域，页面不能在浏览器里直接请求，所以在构建时取一份快照。
// 拉取失败时保留仓库里已提交的上一份快照，不让整站构建失败。
import { writeFileSync } from "node:fs";

const CITY = "上海";
const API = "https://events.waytoagi.com/api/v1/events";
const OUT = new URL("../src/events.json", import.meta.url);
const FIELDS = ["id", "title", "date", "endDate", "venue", "eventKind", "eventMode", "organizerName", "cover"];

async function fetchAll() {
  const events = [];
  let cursor = "";
  do {
    const url = `${API}?city=${encodeURIComponent(CITY)}&limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    if (!body.ok || !Array.isArray(body.items)) throw new Error("返回格式不对");
    events.push(...body.items.map((e) => Object.fromEntries(FIELDS.map((k) => [k, e[k] ?? null]))));
    cursor = body.nextCursor ?? "";
  } while (cursor);
  return events;
}

try {
  const events = await fetchAll();
  writeFileSync(OUT, `${JSON.stringify({ fetchedAt: new Date().toISOString(), city: CITY, events }, null, 2)}\n`);
  console.log(`已拉取 ${events.length} 场${CITY}活动`);
} catch (error) {
  console.warn(`拉取活动失败（${error.message}），沿用已提交的 src/events.json`);
}
