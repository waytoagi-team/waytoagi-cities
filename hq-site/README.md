# 城市站总部页生成器（hq-site）

生成 cities.waytoagi.com 的总部页面和各城市默认页，结果提交在仓库根目录 `hq/`，由 `scripts/build.mjs` 原样复制到网站根目录。纯 Python 3 标准库，无第三方依赖。

## 页面

| 路径 | 内容 |
|---|---|
| `/` | 首页：找同城、全国数据、首批主理人与组织者墙、参加次数最多的城市 |
| `/all/` | 全部城市（历届参与城市与筹备城市），按大区筛选 |
| `/organizers/` | 城市组织者荣誉榜：首批主理人、按大区的全部组织者人物卡 |
| `/<slug>/` | 每城一页：进本城群、看本城活动（活动平台本城列表）、本城组织者人物卡、本城收录活动、全国切磋大会历届参与 |
| `/rules/` | 城市站规则（试行版）：三级角色、怎么成为组织者、单场合作社区、同城多位组织者、活动分级自查、收录规范、城市基金、红线 |
| `/join/` | 四个入口：申请成为组织者、登记我的城市、活动报备、提交活动成果（飞书表单外链） |

## 怎么更新

```sh
python3 hq-site/scripts/build.py      # 生成到 hq/
python3 hq-site/scripts/check_dist.py # 检查 hq/ 无绝对路径、无缺失文件
npm run build                         # 整站构建（与 EdgeOne、PR 检查相同）
```

改完把 `hq-site/` 和 `hq/` 一起提交。

- **城市与组织者**：`data/cities.json`。`organizers` 只填已正式公示、本人同意的组织者；`host` 填主理人。可选字段：`team`、`partner`、`since`（YYYY-MM）、`honors`、`badge`（如「首批主理人」）、`motto`（本人一句话）、`portrait`（人物形象，放 `assets/people/`，竖版 4:5、jpg/png/webp、2MB 内，本人创作或有权使用，经城市运营审核）。
- **城市群码**：图片放 `assets/qr/`，在城市里填 `group_qr` 和 `group_qr_updated`；没填的城市显示「登记进本城群」表单。
- **本城活动**：默认跳活动平台 `https://events.waytoagi.com/?city=<城市名>`；需要特殊链接时填 `events_url`。
- **收录活动**：`data/events.json`，由城市运营从「活动成果提交」表审核导入（字段：city、date、title、host、kind、checkins、url）。
- **表单与规则版本**：`data/site.json` 的 `forms`、`rules_version`；规则正文在 `scripts/build.py` 的 `page_rules()`。
- **Logo**：`assets/logo/` 为官方 SVG（来自 waytoagi-logo-skill），构建时按清单校验 sha256，不得改色、拉伸或重绘。

## 数据口径

- 城市名单、历届参与、首次参加来自 `data/editions.json`（全国 AI 切磋大会历届城市名单，含番外与 1024）。
- 「1024 现场签到」来自 `data/legacy.json`；广州、佛山为联合会场。
- 页面不含组织者联系方式和报名名单。
