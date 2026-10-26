# AGENTS.md — WaytoAGI 城市站开发说明

你正在帮一位 WaytoAGI 城市组织者开发他们城市的页面。
页面最终发布在 `https://cities.waytoagi.com/<slug>/`。
动手前请先读完本文件。

> 标「⚠️ 待定」的地方还在和总部技术负责人确认，以后会更新。

## 先确认三件事

1. 用户是哪个城市？在 `cities.json` 里找到这个城市的 `slug`（例如 `shanghai`）。
   找不到就停下，提醒用户先申请成为城市管理者（见 README）。
2. 你只能修改 `cities/<slug>/` 目录。其他文件和目录都不要动，
   包括 `cities.json`、`kit/`、`home/`、`template/`、`.github/`、`README.md`、本文件。
3. 目录还不存在时，有 `template/` 就复制它到 `cities/<slug>/` 作为起点，
   没有就按用户的意愿从零开始。

## 技术栈

不限：原生 HTML、React、Vue、Astro、Svelte 等都可以。
只有两种合法的目录形态：

- **无需构建**：`cities/<slug>/index.html` 直接可用。
- **需要构建**：`cities/<slug>/package.json` 里有 `build` 脚本，
  构建产物输出到 `cities/<slug>/dist/`，并且 `dist/index.html` 存在。

⚠️ 待定：包管理器（建议 pnpm）、Node 版本。

## 路径前缀（最容易出错）

页面部署在 `/<slug>/` 子路径下，不是网站根目录。所有资源路径都要适配：

- 原生 HTML：资源一律用相对路径（`./img/a.webp`），不要写 `/img/a.webp`。
- Vite（React/Vue）：`vite.config` 里设 `base: '/<slug>/'`。
- Astro：`astro.config` 里设 `base: '/<slug>'`。
- Next.js：`output: 'export'` 加 `basePath: '/<slug>'`。

⚠️ 待定：统一构建时是否由流水线自动注入前缀。

## 必须保留：总部页眉页脚

每个 HTML 页面都要引入总部 kit，审核会检查，缺失就不通过。
kit 会提供页眉、页脚、统计和登录按钮。
不要自己再写一套全站导航，也不要隐藏或覆盖 kit 的元素。

⚠️ 待定：kit 还在建设中，引入代码以 `kit/` 发布后的说明为准。在那之前，页面先不放页眉页脚。

## 可用的总部组件（建设中）

- 本城活动列表：传入 `cities.json` 里该城市的 `eventsCity`（如「上海」）。
- 登录按钮、「关注本城」按钮：由 kit 提供，不要自己接登录。

## 禁止事项

- 不要提交构建产物（`dist/`）、`node_modules/`、`.env`，也不要提交任何密钥或 token。
- 不要引入第三方统计或追踪脚本，统计统一由 kit 负责。
- 不要做收集手机号、身份证等个人信息的表单，报名一律跳转活动平台。
- 不要嵌入来源不明的外部脚本，不要使用未授权的图片和字体。
- 单张图片不超过 1MB，优先用 WebP 或 JPG；文件名用英文或拼音，不带空格。

## 提交前自检

1. 如果需要构建，在 `cities/<slug>/` 下运行 `build`，必须成功。
2. 在本地按 `/<slug>/` 路径预览，确认图片、样式、链接都正常。
3. `git status` 里只能有 `cities/<slug>/` 下的改动。
4. PR 标题格式：`[<slug>] 改了什么`，例如 `[shanghai] 新增 10 月活动回顾`。

## 提交后

审核 Agent 会把检查结果写在 PR 评论里（建设中）。
没通过就按提示修改，再推送到同一个 PR。通过后自动合并，几分钟后上线。
