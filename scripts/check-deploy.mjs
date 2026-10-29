// 定时检查线上是否跟上 main（.github/workflows/deploy-check.yml 每 15 分钟运行）。
// EdgeOne 构建失败时线上会停在上一次成功的版本，GitHub 上看不到。这里比较线上 version.json 里的提交和 main 的最新提交，
// main 更新超过 GRACE_MINUTES 线上还没跟上，就向 Uptime Kuma 报 down，告警发到总部运维群。
import { execFileSync } from "node:child_process";

const SITE = "https://cities.waytoagi.com";
// EdgeOne 一次构建一般 1 分钟内完成，留足排队和依赖下载的时间。
const GRACE_MINUTES = 20;

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const head = git("rev-parse", "HEAD");
// 用提交时间近似合并时间：GitHub 网页上合并 PR 时两者相同。
const ageMinutes = Math.round((Date.now() - Number(git("log", "-1", "--format=%ct")) * 1000) / 60000);

async function liveCommit() {
  const res = await fetch(`${SITE}/version.json?t=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`返回 ${res.status}`);
  const { commit } = await res.json();
  return typeof commit === "string" && commit.length >= 7 ? commit : null;
}

let status;
let msg;
try {
  const live = await liveCommit();
  const short = live?.slice(0, 7) ?? "未知";
  if (live && head.startsWith(live)) {
    [status, msg] = ["up", `线上与 main 一致（${head.slice(0, 7)}）`];
  } else if (ageMinutes < GRACE_MINUTES) {
    [status, msg] = ["up", `main 的 ${head.slice(0, 7)} 是 ${ageMinutes} 分钟前的提交，等待 EdgeOne 部署（线上 ${short}）`];
  } else {
    [status, msg] = ["down", `线上停在 ${short}，main 的 ${head.slice(0, 7)} 已过 ${ageMinutes} 分钟，到 EdgeOne 控制台看构建日志`];
  }
} catch (error) {
  [status, msg] = ["down", `读不到线上 version.json：${error.message}`];
}
console.log(`${status}: ${msg}`);
if (status === "down") console.log(`::error::${msg}`);

const pushUrl = process.env.KUMA_PUSH_URL;
if (!pushUrl) {
  console.log("没有设置 KUMA_PUSH_URL，只打印结果");
} else {
  const res = await fetch(`${pushUrl}?${new URLSearchParams({ status, msg, ping: "" })}`, { signal: AbortSignal.timeout(20_000) });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.ok !== true) {
    console.error(`推送 Uptime Kuma 失败：HTTP ${res.status} ${body?.msg ?? ""}`);
    process.exit(1);
  }
}
