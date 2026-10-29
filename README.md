# WaytoAGI 城市站

WaytoAGI 各城市的展示页，由各城市组织者自己开发维护。

📖 **城市组织者请先读：[城市站组织者手册（飞书）](https://waytoagi.feishu.cn/docx/X005d8C78oliYZx1N7xc4wfOnNf)**

- 城市集合主页：`https://cities.waytoagi.com/`
- 城市详情页：`https://cities.waytoagi.com/<城市拼音>/`，例如 `https://cities.waytoagi.com/shanghai/`

> 项目刚起步：总部页眉页脚和访问统计（Umami + GA4，`kit/v1.js`）已提供；登录、起步模板（`template/`）和审核 Agent 还在建设中，下文标注「建设中」的部分以后会补齐。城市集合首页由构建脚本按 `cities.json` 自动生成。

## 怎么运作

1. 每个城市在 `cities/<城市拼音>/` 下有自己的目录，放页面**源码**。
2. 城市同学提交 PR，审核 Agent 自动检查（建设中）。
3. 合并到 `main` 后，EdgeOne 自动构建并部署整站。PR 上会先跑一遍同样的构建检查（`npm run build`）。
   整站一起构建：只要一个城市构建失败，所有城市和总部 kit 的更新都上不了线，线上保持上一版。EdgeOne 构建失败在 GitHub 上看不到，所以总部每 15 分钟比对一次线上的 `/version.json` 和 `main`（`deploy-check` 工作流），`main` 更新超过 20 分钟线上还没跟上，就会向总部运维告警。

技术栈不限：原生 HTML、React、Vue、Astro 等都可以。页眉页脚、统计、隐私说明（`/privacy/`，源文件在 `home/`）、登录由总部统一提供。

## 城市组织者上手

### 1. 申请成为城市管理者

在本仓库 [新建 issue](../../issues/new/choose)，选择「城市管理者申请」。总部核实身份后，会把你登记进城市名册 `cities.json`。

### 2. 开发你的页面

1. clone 本仓库到本地。
2. 让你的 AI 编程助手（Claude Code、Cursor、Codex 等）先读根目录的 [`AGENTS.md`](./AGENTS.md)，它会按说明在 `cities/<城市拼音>/` 下帮你开发。
3. 两条硬规矩：提交**源码**，不要只交打包后的 HTML；页面里保留总部页眉页脚的引入代码。

### 3. 提交上线

提交 PR，等待审核结果（写在 PR 评论里）。通过后自动合并上线。

## 能改什么、不能改什么

| ✅ 随便改 | ❌ 不要动 |
|---|---|
| 自己城市目录里的所有内容 | 页眉页脚的引入代码 |
| 页面结构、样式、交互、自己写的组件 | 别的城市的目录 |
| 城市介绍、主理人、往期回顾、相册 | `cities.json`、`kit/`、`home/`、`AGENTS.md`、`.github/` 等公共部分 |

## 活动怎么出现在城市页上

在活动平台 [events.waytoagi.com](https://events.waytoagi.com) 发布活动，城市名按 `cities.json` 里的标准写法填写（例如「郑州」，不要写「郑州市」）。页面上加一行 `<wta-events></wta-events>` 就会自动显示本城活动；也可以用 kit 的 `wta.events.list()` 只取数据、自己设计样式，或者自己调活动平台接口。详见 [`AGENTS.md`](./AGENTS.md)「本城活动」。

## 素材规范

- 单张图片不超过 1MB，优先用 WebP 或 JPG。
- 文件名用英文或拼音，不带空格。
- 不使用未授权的图片和字体。

## 城市名册 `cities.json`

由总部维护，修改需人工审核。每个城市一条记录：

| 字段 | 说明 | 示例 |
|---|---|---|
| `slug` | 城市拼音，也是目录名和网址路径 | `shanghai` |
| `name` | 城市中文名 | `上海` |
| `eventsCity` | 活动平台上的标准城市名 | `上海` |
| `enabled` | 是否上线，设为 `false` 即下线 | `true` |
| `maintainers` | 城市管理者的 GitHub 账号 | `["octocat"]` |

## 权限与审核

- **城市管理者**：登记在名册里，只改本城目录的 PR，审核 Agent 通过后自动合并。
- **贡献者**：任何人都可以提 PR，需要本城管理者在 PR 下回复同意。
- **必须人工审**：修改城市名册、修改公共部分、城市首次上线；以及改了依赖或构建配置的 PR（`package.json`、锁文件、`vite.config` 等构建工具配置）。需要构建的城市在构建时会执行自己的代码，合并前的人工审核是唯一的安全边界，这类改动不会自动合并。

## 总部维护：构建用的 Node 版本

- 版本由根目录 `edgeone.json` 的 `nodeVersion` 决定，`.nvmrc` 保持一致（PR 上的构建检查用它）。城市不能自己改。
- EdgeOne 只能用它预装的版本。**以 EO 控制台「项目设置 → Node.js 版本」里能选的为准**，官方文档里的列表可能过时。
- 升级步骤：先在 EO 控制台确认并切换 → 同步改 `edgeone.json` 和 `.nvmrc` → 确认 PR 构建检查里所有城市都能构建 → 更新 AGENTS.md 里写的版本号。
- `edgeone.json` 里的版本优先于控制台设置：两边不一致时，EO 按 `edgeone.json` 去切换，选了控制台里没有的版本就会构建失败（#3 就是这样失败的）。所以两边要保持一致。

## 联系

- 内容和运营：Kyle
- 技术和上线：noodles
