# WaytoAGI 城市站

WaytoAGI 各城市的展示页，由各城市组织者自己开发维护。

📖 **城市组织者请先读：[城市站组织者手册（飞书）](https://waytoagi.feishu.cn/docx/X005d8C78oliYZx1N7xc4wfOnNf)**

- 城市集合主页：`https://cities.waytoagi.com/`
- 城市详情页：`https://cities.waytoagi.com/<城市拼音>/`，例如 `https://cities.waytoagi.com/shanghai/`

> 项目刚起步：总部组件（`kit/`）、起步模板（`template/`）和审核 Agent 还在建设中，下文标注「建设中」的部分以后会补齐。城市集合首页目前由构建脚本按 `cities.json` 自动生成。

## 怎么运作

1. 每个城市在 `cities/<城市拼音>/` 下有自己的目录，放页面**源码**。
2. 城市同学提交 PR，审核 Agent 自动检查（建设中）。
3. 合并到 `main` 后，EdgeOne 自动构建并部署整站（接入中）。PR 上会先跑一遍同样的构建检查（`npm run build`）。

技术栈不限：原生 HTML、React、Vue、Astro 等都可以。页眉页脚、统计、登录由总部统一提供。

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

在活动平台 [events.waytoagi.com](https://events.waytoagi.com) 发布活动，城市名按 `cities.json` 里的标准写法填写（例如「郑州」，不要写「郑州市」）。城市页的活动组件会自动显示（建设中）。

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

## 联系

- 内容和运营：Kyle
- 技术和上线：noodles
