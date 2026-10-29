// 检查线上是否跟上 main。.github/workflows/deploy-check.yml 在每次推送到 main 后运行，另有定时运行兼作心跳。
// EdgeOne 构建失败时线上会停在上一次成功的版本，GitHub 上看不到。这里比较线上 version.json 里的提交和 main 的最新提交：
// 一致就报 up；不一致且 main 更新不到 GRACE_MINUTES，每分钟再看一次；过了还没跟上就向 Uptime Kuma 报 down，告警发到总部运维群。
import { execFileSync } from "node:child_process";

const SITE = "https://cities.waytoagi.com";
// EdgeOne 一次构建一般 1 分钟内完成，留足排队和依赖下载的时间。工作流的超时要比它长。
const GRACE_MINUTES = 20;
const POLL_MS = 60_000;
// 连续几次读不到 version.json 才报 down，偶尔一次网络抖动不告警。
const MAX_READ_FAILURES = 3;

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const head = git("rev-parse", "HEAD");
// 用提交时间近似合并时间：GitHub 网页上合并 PR 时两者相同。提交时间在未来（时钟不准）时从现在算起，最多等 GRACE_MINUTES。
const committedAt = Number(git("log", "-1", "--format=%ct")) * 1000;
const deadline = Math.min(committedAt, Date.now()) + GRACE_MINUTES * 60_000;

async function liveCommit() {
  const res = await fetch(`${SITE}/version.json?t=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`返回 ${res.status}`);
  const { commit } = await res.json();
  return typeof commit === "string" && commit.length >= 7 ? commit : null;
}

let status;
let msg;
let readFailures = 0;
for (;;) {
  const ageMinutes = Math.round((Date.now() - committedAt) / 60000);
  try {
    const live = await liveCommit();
    readFailures = 0;
    const short = live?.slice(0, 7) ?? "未知";
    if (live && head.startsWith(live)) {
      [status, msg] = ["up", `线上与 main 一致（${head.slice(0, 7)}）`];
      break;
    }
    if (Date.now() >= deadline) {
      [status, msg] = ["down", `线上停在 ${short}，main 的 ${head.slice(0, 7)} 已过 ${ageMinutes} 分钟，到 EdgeOne 控制台看构建日志`];
      break;
    }
    console.log(`等待 EdgeOne 部署：main 的 ${head.slice(0, 7)} 是 ${ageMinutes} 分钟前的提交，线上 ${short}`);
  } catch (error) {
    readFailures += 1;
    if (readFailures >= MAX_READ_FAILURES) {
      [status, msg] = ["down", `读不到线上 version.json：${error.message}`];
      break;
    }
    console.log(`读不到线上 version.json（第 ${readFailures} 次）：${error.message}`);
  }
  await new Promise((resolve) => setTimeout(resolve, POLL_MS));
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
