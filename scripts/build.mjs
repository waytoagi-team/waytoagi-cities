// 构建整站：按 cities.json 构建各城市页面，生成城市集合首页，全部输出到 dist/。
// EdgeOne 合并 main 后执行 `npm run build`，PR 上的构建检查跑的也是同一个脚本。
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "dist");
const SLUG = /^[a-z][a-z0-9-]*$/;
// HTML 里以 / 开头的资源引用；挂在 /<slug>/ 下时，没带前缀的绝对路径会 404。
const ABSOLUTE_REF = /\b(?:src|href|poster|action)\s*=\s*["'](\/(?!\/)[^"']*)["']/gi;

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

// 按锁文件选包管理器，城市不必统一。
function buildPackage(dir) {
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  if (!pkg.scripts?.build) fail(`${relative(ROOT, dir)}/package.json 缺少 build 脚本`);
  if (existsSync(join(dir, "pnpm-lock.yaml"))) {
    run("corepack", ["pnpm", "install", "--frozen-lockfile"], dir);
    run("corepack", ["pnpm", "run", "build"], dir);
  } else if (existsSync(join(dir, "yarn.lock"))) {
    run("corepack", ["yarn", "install"], dir);
    run("corepack", ["yarn", "run", "build"], dir);
  } else {
    run("npm", [existsSync(join(dir, "package-lock.json")) ? "ci" : "install"], dir);
    run("npm", ["run", "build"], dir);
  }
  return join(dir, "dist");
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
      if (ref === "/" || ref === `/${slug}` || ref.startsWith(`/${slug}/`)) continue;
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

function buildCity(city) {
  const dir = join(ROOT, "cities", city.slug);
  if (!existsSync(dir)) fail(`cities.json 里启用了 ${city.slug}，但没有 cities/${city.slug}/ 目录`);
  console.log(`\n▶ ${city.slug}（${city.name}）`);
  const isPackage = existsSync(join(dir, "package.json"));
  const outDir = isPackage ? buildPackage(dir) : dir;
  if (!existsSync(join(outDir, "index.html"))) {
    fail(`${relative(ROOT, outDir)}/index.html 不存在` + (isPackage ? "（构建产物要输出到 dist/）" : ""));
  }
  checkAbsoluteRefs(city.slug, outDir);
  cpSync(outDir, join(DIST, city.slug), {
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
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 48px auto; padding: 0 20px; line-height: 1.6; }
    ul { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
    a { display: block; padding: 12px 16px; border: 1px solid #ddd; border-radius: 8px; color: inherit; text-decoration: none; }
    a:hover { border-color: #888; }
  </style>
</head>
<body>
  <h1>WaytoAGI 城市站</h1>
  ${cities.length > 0 ? `<ul>\n${items}\n    </ul>` : "<p>城市站建设中，敬请期待。</p>"}
  <p><a href="https://github.com/waytoagi-team/waytoagi-cities">想为你的城市建站？</a></p>
</body>
</html>
`;
}

const enabled = loadCities().filter((city) => city.enabled);
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST);
for (const city of enabled) buildCity(city);
writeFileSync(join(DIST, "index.html"), renderHome(enabled));
console.log(`\n✓ 构建完成：首页 + ${enabled.length} 个城市 → dist/`);
