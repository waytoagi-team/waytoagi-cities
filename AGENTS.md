# AGENTS.md — WaytoAGI 城市站开发说明

你正在帮一位 WaytoAGI 城市组织者开发他们城市的页面。
页面最终发布在 `https://cities.waytoagi.com/<slug>/`。
动手前请先读完本文件。

## 先确认三件事

1. 用户是哪个城市？在 `cities.json` 里找到这个城市的 `slug`（例如 `shanghai`）。
   找不到就停下，提醒用户先申请成为城市管理者（见 README）。
2. 你只能修改 `cities/<slug>/` 目录。其他文件和目录都不要动，
   包括 `cities.json`、`kit/`、`home/`、`template/`、`scripts/`、`.github/`、根目录的 `package.json` 和 `edgeone.json`、`README.md`、本文件。
3. 目录还不存在时，有 `template/` 就复制它到 `cities/<slug>/` 作为起点，
   没有就按用户的意愿从零开始。

## 技术栈

不限：原生 HTML、React、Vue、Astro、Svelte 等都可以。
只有两种合法的目录形态：

- **无需构建**：`cities/<slug>/index.html` 直接可用。
- **需要构建**：`cities/<slug>/package.json` 里有 `build` 脚本，
  构建产物输出到 `cities/<slug>/dist/`，并且 `dist/index.html` 存在。

构建环境是 Node 24.18.0（根目录 `edgeone.json` 指定；EdgeOne 只能用它预装的版本，城市不能自己改）。框架和工具用当前版本即可（例如 `npm create vite@latest`），只要支持 Node 24.18.0。包管理器不限，构建时按锁文件自动识别：有 `pnpm-lock.yaml` 用 pnpm，有 `yarn.lock` 用 yarn，有 `package-lock.json` 用 npm；没有锁文件构建会失败。pnpm、yarn 的版本按 `package.json` 的 `packageManager` 字段（如 `"pnpm@9.15.9"`），不写就用最新版，建议写上。目录里不能有符号链接。

## 路径前缀（最容易出错）

页面部署在 `/<slug>/` 子路径下，不是网站根目录。所有资源路径都要适配：

- 原生 HTML：资源一律用相对路径（`./img/a.webp`），不要写 `/img/a.webp`。
- Vite（React/Vue）：`vite.config` 里设 `base: '/<slug>/'`。
- Astro：`astro.config` 里设 `base: '/<slug>'`。
- Next.js：`output: 'export'` 加 `basePath: '/<slug>'`。

流水线不会帮你加前缀。构建时会检查 HTML：以 `/` 开头、但不在 `/<slug>/` 下的引用会让构建直接失败。

## 必须保留：总部页眉页脚

每个 HTML 页面的 `<head>` 里都要加这一行，构建时会检查，缺了构建直接失败：

```html
<script src="https://cities.waytoagi.com/kit/v1.js" defer></script>
```

- kit 会自动在页面最上方插入全站页眉、最下方插入全站页脚，样式和城市页面互相隔离。
- 不要自己再写一套全站导航，也不要隐藏或覆盖 `<wta-header>`、`<wta-footer>`。
- kit 会把 `body` 的外边距设为 0。不要给 `body` 设 `max-width` 或左右 `margin`，内容宽度放在自己的容器上（例如 `<main>`），否则页眉页脚会被一起挤窄。
- 想控制位置时，可以在页面里自己放 `<wta-header></wta-header>`、`<wta-footer></wta-footer>`，kit 会填进去。
- 访问统计已经由 kit 自动接入（WaytoAGI 自托管 Umami + Google Analytics 4，按城市区分），页面什么都不用加。GA 会在 `.waytoagi.com` 上写 `_ga` Cookie，描述统计时不要写成「不用 Cookie」。
- 想统计页面上的某个操作（例如点了报名、看了二维码），调用 `window.wta?.track("事件名", { 可选数据 })`（同时发给 Umami 和 GA），事件名用英文小写加下划线，例如 `signup_click`；数据里不要放手机号、姓名等个人信息。
- 登录按钮还在建设中，以后加进 kit，页面不用改。

## 本城活动（可选，三种方式任选）

活动数据来自 WaytoAGI 活动平台，城市在活动平台发布后就会出现。kit 提供两种用法，城市也可以自己调接口：

1. **直接放组件**（最省事）：在页面里加 `<wta-events></wta-events>`，自动显示本城近期活动和往期回顾。
   可选属性：`view="upcoming|past|all"`（默认 all）、`limit="12"`（往期最多几张）、`city="上海"`（不填按当前城市）。
   样式由总部统一，和页面样式互相隔离。
2. **只取数据、自己设计样式**（推荐想自定义的城市用）：
   ```js
   const events = await window.wta.events.list({ view: "upcoming" }); // view: all | upcoming | past，可加 limit
   ```
   每条活动的字段：`id`、`title`、`date`、`endDate`、`venue`、`organizer`、`kindLabel`（黑客松 / 大会…）、`online`、`cover`（已是完整地址）、`url`（活动详情页）、`upcoming`（按北京时间判断）。
   `window.wta.events.city()` 返回当前城市的 `name`、`eventsCity` 和活动平台上的本城列表地址 `url`。
   上海样例站（`cities/shanghai/src/main.js`）就是这种写法。
3. **自己调接口**：`https://events.waytoagi.com/api/v1/events?city=<eventsCity>`（只返回已发布活动，用 `nextCursor` 翻页）。要自己处理这几个坑：
   - 有的封面是活动平台的相对地址（`/api/images/proxy?...`），要补上 `https://events.waytoagi.com`；
   - 个别活动没有 `date`，要先过滤掉，否则排序会报错；
   - 近期 / 往期按北京时间划分；
   - 城市名用 `cities.json` 里的 `eventsCity`，不要自己写。
   - 只用最简单的 GET（例如 `fetch(url)`），**不要加自定义请求头**，也不要带 Cookie（`credentials: "include"`）。活动平台不响应浏览器的预检请求，加了请求头会被浏览器拦下，取不到数据。

注意：活动平台只允许这些地址跨域读取：正式域名 `https://cities.waytoagi.com`，以及本地开发用的 `localhost`、`127.0.0.1`（http / https，端口不限）。用手机通过局域网 IP（例如 `192.168.x.x`）访问自己电脑上的开发服务器时取不到数据，这是预期行为。所以拉不到数据时，页面一定要显示「去活动平台查看」之类的兜底，不能整页空白（kit 组件和上海样例都已处理）。
想统计活动点击，用 `window.wta?.track("event_click", { city: "<slug>", id })`，组件已经自带。

## 其他总部组件（建设中）

- 登录按钮、「关注本城」按钮：由 kit 提供，不要自己接登录。

## 禁止事项

- 不要提交构建产物（`dist/`）、`node_modules/`、`.env`，也不要提交任何密钥或 token。
- 不要引入第三方统计或追踪脚本，统计统一由 kit 负责。全站的隐私说明（`https://cities.waytoagi.com/privacy/`）只写了 kit 的统计、kit 取活动数据和报名表单的去向，城市页面自己的代码不要另外收集访客数据。
- 报名、收集联系方式：**建议在活动平台（events.waytoagi.com）创建活动**，页面只放报名链接（活动平台有小程序承接、核销签到等能力和流量加持）。确实要用别的表单的，只用飞书问卷、腾讯问卷这类**境内**服务（不要用 Google Forms、Typeform 等境外表单，报名信息出境比统计数据敏感得多），以**链接跳转或 iframe 嵌入**的方式接入，不要用对方提供的 JS 嵌入脚本；不要在页面里自己写收集、提交个人信息的代码。
- 不要把手机号、姓名等个人信息写进网址，也不要上报到 `wta.track`。
- 不要嵌入来源不明的外部脚本，不要使用未授权的图片和字体。
- 单张图片不超过 1MB，优先用 WebP 或 JPG；文件名用英文或拼音，不带空格。

## 提交前自检

1. 如果需要构建，在 `cities/<slug>/` 下运行 `build`，必须成功。
2. 在本地按 `/<slug>/` 路径预览，确认图片、样式、链接都正常。
3. `git status` 里只能有 `cities/<slug>/` 下的改动。
4. PR 标题格式：`[<slug>] 改了什么`，例如 `[shanghai] 新增 10 月活动回顾`。

## 提交后

PR 上的「Build check」会用和线上相同的方式构建整站，失败时点进去看日志。
审核 Agent 会把检查结果写在 PR 评论里（建设中）。
没通过就按提示修改，再推送到同一个 PR。通过后自动合并，几分钟后上线。
改了依赖或构建配置（`package.json`、锁文件、构建工具配置）的 PR 必须总部人工审核，不会自动合并。只改页面内容时尽量不要顺手升级依赖。
