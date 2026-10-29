// 构建整站：按 cities.json 构建各城市页面，生成城市集合首页，全部输出到 dist/。
// EdgeOne 合并 main 后执行 `npm run build`，PR 上的构建检查跑的也是同一个脚本。
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "dist");
// 用根目录 npm ci 装的固定版 corepack，不用 Node 自带的：自带版本随 Node 变（旧版验不了 npm 新签名，下载 pnpm 会失败；Node 25 起不再自带）。
const COREPACK = join(ROOT, "node_modules", "corepack", "dist", "corepack.js");
const SLUG = /^[a-z][a-z0-9-]*$/;
// HTML 里以 / 开头的资源引用；挂在 /<slug>/ 下时，没带前缀的绝对路径会 404。
const ABSOLUTE_REF = /\b(?:src|href|poster|action)\s*=\s*["'](\/(?!\/)[^"']*)["']/gi;
// 总部页眉页脚（kit/），每个城市页面都必须引入。
const KIT_SCRIPT = /<script\b[^>]*\bsrc\s*=\s*["'](?:https:\/\/cities\.waytoagi\.com)?\/kit\/v1\.js["']/i;

function fail(message) {
  console.error(`\n构建失败：${message}`);
  process.exit(1);
}

function loadCities() {
  const { cities } = JSON.parse(readFileSync(join(ROOT, "cities.json"), "utf8"));
  if (!Array.isArray(cities)) fail("cities.json 缺少 cities 数组");
  const seen = new Set();
  for (const city of cities) {
    if (!SLUG.test(city.slug ?? "")) fail(`城市 slug 不合法：${JSON.stringify(city.slug)}（只能用小写字母、数字和 -）`);
    if (seen.has(city.slug)) fail(`城市 slug 重复：${city.slug}`);
    seen.add(city.slug);
    if (typeof city.name !== "string" || !city.name) fail(`${city.slug} 缺少 name`);
    if (typeof city.enabled !== "boolean") fail(`${city.slug} 的 enabled 必须是 true 或 false`);
    if (!Array.isArray(city.maintainers)) fail(`${city.slug} 的 maintainers 必须是数组`);
  }
  return cities;
}

function run(command, args, cwd) {
  console.log(`  $ ${command} ${args.join(" ")}`);
  execFileSync(command, args, { cwd, stdio: "inherit", env: { ...process.env, COREPACK_ENABLE_DOWNLOAD_PROMPT: "0" } });
}

function corepack(args, cwd) {
  if (!existsSync(COREPACK)) fail("缺少 node_modules/corepack，请先在仓库根目录运行 npm ci");
  run(process.execPath, [COREPACK, ...args], cwd);
}

// 按锁文件选包管理器，城市不必统一。锁文件必须有：没有的话每次构建都重新解析依赖，依赖发了新版本会不经 PR 直接上线。
function buildPackage(dir) {
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  if (!pkg.scripts?.build) fail(`${relative(ROOT, dir)}/package.json 缺少 build 脚本`);
  if (existsSync(join(dir, "pnpm-lock.yaml"))) {
    corepack(["pnpm", "install", "--frozen-lockfile"], dir);
    corepack(["pnpm", "run", "build"], dir);
  } else if (existsSync(join(dir, "yarn.lock"))) {
    corepack(["yarn", "install", "--frozen-lockfile"], dir);
    corepack(["yarn", "run", "build"], dir);
  } else if (existsSync(join(dir, "package-lock.json"))) {
    run("npm", ["ci"], dir);
    run("npm", ["run", "build"], dir);
  } else {
    fail(`${relative(ROOT, dir)} 缺少锁文件，请把 package-lock.json、pnpm-lock.yaml 或 yarn.lock 一起提交`);
  }
  return join(dir, "dist");
}

// 符号链接会原样复制进 dist/，可能把构建机上城市目录以外的文件一起发布出去。
function checkNoSymlinks(dir) {
  const links = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isSymbolicLink()) links.push(relative(ROOT, path));
      else if (entry.isDirectory() && entry.name !== "node_modules") walk(path);
    }
  };
  walk(dir);
  if (links.length > 0) fail(`不能包含符号链接：\n  ${links.slice(0, 10).join("\n  ")}`);
}

function htmlFiles(dir) {
  return readdirSync(dir, { recursive: true })
    .map((file) => join(dir, file))
    .filter((file) => file.endsWith(".html") && statSync(file).isFile());
}

function checkAbsoluteRefs(slug, outDir) {
  const problems = [];
  for (const file of htmlFiles(outDir)) {
    for (const [, ref] of readFileSync(file, "utf8").matchAll(ABSOLUTE_REF)) {
      if (ref === "/" || ref === `/${slug}` || ref.startsWith(`/${slug}/`) || ref.startsWith("/kit/")) continue;
      problems.push(`${relative(outDir, file)}: ${ref}`);
    }
  }
  if (problems.length > 0) {
    fail(
      `${slug} 有 ${problems.length} 处以 / 开头、但不在 /${slug}/ 下的引用，上线后会 404。` +
        `请改成相对路径，或在框架里把 base 设为 /${slug}/（见 AGENTS.md）：\n  ${problems.slice(0, 10).join("\n  ")}`,
    );
  }
}

function checkKit(slug, outDir) {
  const missing = htmlFiles(outDir).filter((file) => !KIT_SCRIPT.test(readFileSync(file, "utf8")));
  if (missing.length > 0) {
    fail(
      `${slug} 有 ${missing.length} 个页面没有引入总部页眉页脚，请在 <head> 里加上（见 AGENTS.md）：\n` +
        `  <script src="https://cities.waytoagi.com/kit/v1.js" defer></script>\n  ` +
        missing.slice(0, 10).map((file) => relative(outDir, file)).join("\n  "),
    );
  }
}

function buildCity(city, target) {
  const dir = join(ROOT, "cities", city.slug);
  if (!existsSync(dir)) fail(`cities.json 里启用了 ${city.slug}，但没有 cities/${city.slug}/ 目录`);
  console.log(`\n▶ ${city.slug}（${city.name}）`);
  checkNoSymlinks(dir);
  const isPackage = existsSync(join(dir, "package.json"));
  const outDir = isPackage ? buildPackage(dir) : dir;
  if (isPackage && existsSync(outDir)) checkNoSymlinks(outDir);
  if (!existsSync(join(outDir, "index.html"))) {
    fail(`${relative(ROOT, outDir)}/index.html 不存在` + (isPackage ? "（构建产物要输出到 dist/）" : ""));
  }
  checkAbsoluteRefs(city.slug, outDir);
  checkKit(city.slug, outDir);
  cpSync(outDir, target, {
    recursive: true,
    filter: (src) => !basename(src).startsWith(".") && basename(src) !== "node_modules",
  });
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function renderHome(cities) {
  const items = cities.map((c) => `      <li><a href="./${c.slug}/">${escapeHtml(c.name)}</a></li>`).join("\n");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WaytoAGI 城市站</title>
  <script src="./kit/v1.js" defer></script>
  <style>
    body { font-family: system-ui, sans-serif; line-height: 1.6; }
    main { max-width: 720px; margin: 48px auto; padding: 0 20px; }
    ul { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
    a { display: block; padding: 12px 16px; border: 1px solid #ddd; border-radius: 8px; color: inherit; text-decoration: none; }
    a:hover { border-color: #888; }
  </style>
</head>
<body>
  <main>
    <h1>WaytoAGI 城市站</h1>
    ${cities.length > 0 ? `<ul>\n${items}\n    </ul>` : "<p>城市站建设中，敬请期待。</p>"}
    <p><a href="https://github.com/waytoagi-team/waytoagi-cities">想为你的城市建站？</a></p>
  </main>
</body>
</html>
`;
}

// PR 检查（CHECK_ALL_CITIES=1）额外构建未上线但已有目录的城市，产物丢进临时目录、不进 dist/，
// 新城市第一次提交时就能在 PR 上看到自己页面的构建结果。线上构建不设这个变量，只构建已上线的城市。
function checkPendingCities(cities) {
  const registered = new Set(cities.map((city) => city.slug));
  const dirs = existsSync(join(ROOT, "cities")) ? readdirSync(join(ROOT, "cities"), { withFileTypes: true }) : [];
  const unregistered = dirs.filter((d) => d.isDirectory() && !registered.has(d.name)).map((d) => d.name);
  if (unregistered.length > 0) fail(`cities/ 下有未登记的城市目录：${unregistered.join("、")}（请先申请成为城市管理者，见 README）`);
  const pending = cities.filter((city) => !city.enabled && existsSync(join(ROOT, "cities", city.slug)));
  const scratch = mkdtempSync(join(tmpdir(), "cities-check-"));
  // fail() 直接 process.exit，finally 不会执行，所以挂在 exit 上清理。
  process.on("exit", () => rmSync(scratch, { recursive: true, force: true }));
  for (const city of pending) buildCity(city, join(scratch, city.slug));
  return pending.length;
}

const cities = loadCities();
const enabled = cities.filter((city) => city.enabled);
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST);
cpSync(join(ROOT, "kit"), join(DIST, "kit"), { recursive: true, filter: (src) => !basename(src).startsWith(".") });
for (const city of enabled) buildCity(city, join(DIST, city.slug));
writeFileSync(join(DIST, "index.html"), renderHome(enabled));
const checked = process.env.CHECK_ALL_CITIES === "1" ? checkPendingCities(cities) : 0;
console.log(`\n✓ 构建完成：首页 + ${enabled.length} 个城市 → dist/` + (checked > 0 ? `；另检查了 ${checked} 个未上线城市` : ""));
