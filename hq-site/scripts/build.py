"""WaytoAGI 城市站：从 data/ 生成静态站点到 dist/。

    python3 scripts/build.py

无第三方依赖。所有页面使用相对路径，可部署在任意域名或子路径下。
"""
import hashlib
import html
import json
import re
import shutil
from urllib.parse import quote
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'
DIST = ROOT.parent / 'hq'  # 生成结果提交到仓库根目录 hq/，由 scripts/build.mjs 复制到网站根目录
LOGO_FILE = 'logo/waytoagi-horizontal-en-light.svg'
LOGO_SOURCE = 'originals/灰底黑色2.svg'  # waytoagi-team/waytoagi-logo-skill

site = json.loads((DATA / 'site.json').read_text())
legacy = json.loads((DATA / 'legacy.json').read_text())
cfg = json.loads((DATA / 'cities.json').read_text())
CITIES = cfg['cities']
BY_NAME = {c['name']: c for c in CITIES}
EDITIONS = json.loads((DATA / 'editions.json').read_text())
EVENTS = json.loads((DATA / 'events.json').read_text())['events']
for _ev in EVENTS:
    for _k in ('city', 'date', 'title', 'host', 'kind', 'checkins', 'url'):
        if _ev.get(_k) in (None, ''):
            raise SystemExit(f'events.json 缺少 {_k}：{_ev}')
    if _ev['city'] not in BY_NAME:
        raise SystemExit(f'events.json 城市不在 cities.json：{_ev["city"]}')
    if _ev['kind'] not in ('组织者', '合作社区'):
        raise SystemExit(f'events.json kind 只能是 组织者 或 合作社区：{_ev}')
    if not str(_ev['url']).startswith('https://'):
        raise SystemExit(f'events.json 链接须为 https：{_ev}')
# 期数与首次参加统一按 editions.json 计算，保证首页、列表和城市页口径一致
COUNT, FIRST = {}, {}
for _ed in EDITIONS:
    for _n in _ed.get('cities') or []:
        COUNT[_n] = COUNT.get(_n, 0) + 1
        FIRST.setdefault(_n, _ed['date'])
Q1024 = {}
for row in legacy['qiecuo1024']:
    for part in row['n'].split('&'):
        Q1024[part] = dict(row, joint=row['n'] if '&' in row['n'] else '')
REGIONS = list(legacy['region'].keys())
SLUG_RE = re.compile(r'[a-z][a-z0-9-]*')
SAFE_FILE = re.compile(r'[A-Za-z0-9][A-Za-z0-9._-]*')
RESERVED = {'all', 'rules', 'join', 'assets', 'organizers', 'kit', 'privacy', 'cities', 'home'}

e = html.escape


def ym(s):
    if not s:
        return ''
    if len(s) == 4:
        return f'{s} 年'
    y, m = s.split('-')[:2]
    return f'{y} 年 {int(m)} 月'


def ed_label(ed):
    no = ed['no']
    return f'第 {no} 期 · {ed["theme"]}' if isinstance(no, int) else f'{no} · {ed["theme"]}'


def editions_of(name):
    return [ed for ed in EDITIONS if name in (ed.get('cities') or [])]


def form_btn(key, label, cls='btn primary', extra='', hint=False):
    url = site['forms'].get(key, '')
    if url:
        note = '将打开飞书表单' + ('，无需登录' if site.get('forms_public') else '')
        tip = f'<span class="form-hint">{note}</span>' if hint else ''
        return f'<a class="{cls}" href="{e(url)}" target="_blank" rel="noopener" title="{note}"{extra}>{e(label)} <span aria-hidden="true">↗</span></a>{tip}'
    return f'<span class="{cls} is-pending" aria-disabled="true" title="表单开通中">{e(label)}<small>开通中</small></span>'


# ---------------- 布局 ----------------

def layout(title, desc, body, depth, active='', canonical=''):
    r = '../' * depth
    nav = [('index.html', '城市站', 'home'), ('all/index.html', '全部城市', 'all'), ('organizers/index.html', '组织者', 'people'), ('rules/index.html', '城市站规则', 'rules'), ('join/index.html', '加入与报备', 'join')]
    cur = ' aria-current="page"'
    nav_html = ''.join(f'<a href="{r}{href}"{cur if key == active else ""}>{label}</a>' for href, label, key in nav)
    canon = f'<link rel="canonical" href="{e(site["base_url"].rstrip("/") + "/" + canonical)}">' if canonical is not None else ''
    return f'''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
{canon}
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<script src="{r}kit/v1.js" data-chrome="none" defer></script>
<link rel="stylesheet" href="{r}assets/site.css">
</head>
<body>
<a class="skip" href="#main">跳到正文</a>
<header class="topbar">
  <div class="wrap topbar-in">
    <a class="brand" href="{r}index.html" aria-label="WaytoAGI 城市站首页"><img class="logo" src="{r}assets/{LOGO_FILE}" alt="WaytoAGI" width="167" height="54"><span>城市站</span></a>
    <nav class="mainnav" aria-label="城市站导航">{nav_html}</nav>
    <a class="toplink" href="{e(site['links']['home'])}">返回官网 ↗</a>
  </div>
</header>
<main id="main">
{body}
</main>
<footer class="foot">
  <div class="wrap foot-in">
    <div><img class="logo logo-foot" src="{r}assets/{LOGO_FILE}" alt="WaytoAGI" width="152" height="49"><p>每个城市一个城市页，由 WaytoAGI 总部维护。城市站规则为{e(site['rules_version'])}，以城市运营通知为准。</p></div>
    <nav aria-label="外部链接"><a href="{e(site['links']['home'])}">WaytoAGI 官网</a><a href="{e(site['links']['events'])}">活动平台</a><a href="{e(site['links']['wiki'])}">飞书知识库</a><a href="{e(site['links']['privacy'])}">隐私政策</a></nav>
  </div>
</footer>
<script src="{r}assets/site.js" defer></script>
</body>
</html>
'''


# ---------------- 组件 ----------------

def initial(name):
    ch = name.strip()[:1]
    return ch.upper() if ch.isascii() else ch


def person_id(c, o):
    idx = [x['name'] for x in c['organizers']].index(o['name']) + 1
    return f'p-{c["slug"]}-{idx}'


def portrait_of(o):
    return o.get('portrait') or o.get('avatar') or ''


def honor_card(o, c, r, big=False, link=False):
    city, host = c['name'], c.get('host', '')
    is_host = o['name'] == host
    role = '主理人' if is_host else '组织者'
    pid = person_id(c, o)
    pic = portrait_of(o)
    if pic:
        art_inner = f'<img src="{r}assets/people/{e(pic)}" alt="{e(o["name"])}的人物形象" width="800" height="1000" loading="lazy">'
    else:
        art_inner = f'<span class="hc-mono" aria-hidden="true">{e(initial(o["name"]))}</span>'
    badge = f'<span class="hc-badge">{e(o["badge"])}</span>' if o.get('badge') else ''
    name = f'<a href="{r}{c["slug"]}/index.html#{pid}">{e(o["name"])}</a>' if link else e(o['name'])
    ident = f'<p class="hc-city">WaytoAGI {e(city)}</p><div class="hc-tags"><span class="hc-role">{role}</span>{badge}</div><h3 class="hc-name">{name}</h3>'
    team = f'<p class="hc-team">WaytoAGI {e(city)} · {e(o["team"])}</p>' if o.get('team') else ''
    partner = f'<p class="hc-team">合作伙伴：{e(o["partner"])}</p>' if o.get('partner') else ''
    motto = f'<blockquote class="hc-motto">{e(o["motto"])}</blockquote>' if o.get('motto') else ''
    duty = f'统筹{e(city)}本城活动排期和城市群，参与商业合作派发' if is_host else f'在{e(city)}办 AI 活动，带动本城社区'
    honors = ''.join(f'<span>{e(h)}</span>' for h in o.get('honors') or [])
    hist = o.get('history') or {}
    SHOW_HISTORY = False  # 往期数据尚不齐全，暂不展示；history 字段保留在 cities.json
    hist_html = (f'<dl class="hc-stats"><div><dd>{hist["count"]}</dd><dt>期全国切磋大会</dt></div>'
                 f'<div><dd>{e(hist["first"].replace("-", "."))}</dd><dt>首次参与</dt></div></dl>' if SHOW_HISTORY and hist.get('count') else '')
    go = f'<a class="hc-go" href="{r}{c["slug"]}/index.html">进入城市页 <span aria-hidden="true">→</span></a>' if link else ''
    cls = 'hcard' + (' host' if is_host else '') + (' xl' if big else '') + (' has-pic' if pic else '')
    over = '' if big else f'<div class="hc-over">{ident}</div>'
    head = f'<div class="hc-ident">{ident}</div>' if big else ''
    return f'''<article class="{cls}" id="{pid}">
  <div class="hc-art">{art_inner}<span class="hc-sheen" aria-hidden="true"></span>{over}</div>
  <div class="hc-info">
    {head}{team}{partner}{motto}
    {hist_html}{f'<p class="hc-duty">{duty}</p>' if big else ''}
    {f'<div class="hc-honors">{honors}</div>' if honors else ''}
    {f'<div class="hc-foot">{go}</div>' if go else ''}
  </div>
</article>'''


def thumb(o, r):
    pic = portrait_of(o)
    if pic:
        return f'<span class="hc-avatar sm has-img" aria-hidden="true"><img src="{r}assets/people/{e(pic)}" alt="" width="68" height="68" loading="lazy"></span>'
    return f'<span class="hc-avatar sm" aria-hidden="true">{e(initial(o["name"]))}</span>'


def head_people(c):
    orgs = c['organizers']
    if not orgs:
        return ''
    host = c.get('host', '')
    lead = next((o for o in orgs if o['name'] == host), orgs[0])
    more = f' 等 {len(orgs)} 位组织者' if len(orgs) > 1 else ''
    return f'<a class="head-person{" host" if lead["name"] == host else ""}" href="#{person_id(c, lead)}">{thumb(lead, "../")}<span>{"主理人" if lead["name"] == host else "组织者"} <b>{e(lead["name"])}</b>{more}</span></a>'


def all_people():
    out = []
    for c in sorted(CITIES, key=lambda c: -COUNT.get(c['name'], 0)):
        host = c.get('host', '')
        for o in sorted(c['organizers'], key=lambda o: o['name'] != host):
            out.append((c, o, o['name'] == host))
    return out


def city_card(c, r):
    n = c['name']
    times = COUNT.get(n, 0)
    meta = f'{times} 场切磋大会' if times else '新城市'
    first = f' · {ym(FIRST[n])}起' if FIRST.get(n) else ''
    has_org = bool(c['organizers'])
    tag = '<span class="tag on">有组织者</span>' if has_org else ''
    return (f'<a class="city-card" href="{r}{c["slug"]}/index.html" data-city="{e(n)}" data-region="{e(c["region"])}">'
            f'<b>{e(n)}</b><span>{meta}{first}</span>{tag}</a>')


def search_box(r, big=False):
    opts = ''.join(f'<option value="{e(c["name"])}"></option>' for c in CITIES)
    data = json.dumps({c['name']: c['slug'] for c in CITIES}, ensure_ascii=False)
    return f'''<form class="finder{' big' if big else ''}" data-finder data-root="{r}" role="search">
  <label class="sr" for="finder-q">输入城市名</label>
  <input id="finder-q" type="search" list="finder-list" placeholder="输入你的城市，比如杭州" autocomplete="off" enterkeyhint="go">
  <button class="btn primary" type="submit">找同城</button>
  <datalist id="finder-list">{opts}</datalist>
  <script type="application/json" data-city-map>{data}</script>
  <p class="finder-msg" data-finder-msg role="status"></p>
</form>'''


def grade_table():
    return '''<div class="tablebox"><table class="grade">
<thead><tr><th scope="col">级别</th><th scope="col">活动类型</th><th scope="col">事前要求</th><th scope="col">谁确认</th></tr></thead>
<tbody>
<tr><td><span class="lv a">A</span>登记即办</td><td>分享会、共学、Meetup、工作坊等社区活动</td><td>在活动站发布（选择本城）</td><td>无需审批</td></tr>
<tr><td><span class="lv b">B</span>报备</td><td>引入赞助、与企业或园区联名、单场合作社区署名、较大规模活动</td><td>提前报备赞助方、赞助金额和用途、场地安全</td><td>城市运营</td></tr>
<tr><td><span class="lv c">C</span>授权</td><td>总部介绍的商业合作、以 WaytoAGI 名义签约或报价、全国联动分会场</td><td>先获总部书面授权；涉及商单时另定交付、分成与结算</td><td>总部</td></tr>
<tr><td><span class="lv d">D</span>一事一议</td><td>政府、协会、青年组织合作，港澳及境外活动，媒体采访</td><td>首次提交合作说明；同一伙伴的系列活动可由总部书面明确范围和期限，超出范围重新确认</td><td>总部</td></tr>
</tbody></table></div>'''


# ---------------- 页面 ----------------

def organizer_wall():
    ppl = all_people()
    if not ppl:
        return ''
    hosts = [(c, o) for c, o, h in ppl if h]
    others = [(c, o) for c, o, h in ppl if not h]
    names = {o['name'] for _, o, _ in ppl}
    ncity = len({c['name'] for c, _, _ in ppl})
    spot = ''
    if hosts:
        spot = '<div class="honor spot">' + ''.join(honor_card(o, c, '', link=True) for c, o in hosts) + '</div>'
    wall = ''.join(f'<a class="wall-item" href="{c["slug"]}/index.html#{person_id(c, o)}">{thumb(o, "")}<span><b>{e(o["name"])}</b><em>{e(c["name"])} · 组织者</em></span></a>' for c, o in others)
    return f'''<section class="sec wall-sec">
  <div class="wrap">
    <div class="sec-head"><span class="eyebrow">城市组织者</span><h2>把 WaytoAGI 带到 <span class="hl">{ncity} 座城市</span>的人</h2><p>{len(names)} 位组织者{f"，其中 {len(hosts)} 位首批主理人" if hosts else ""}。他们找场地、拉群、带志愿者，让每一场切磋大会在自己的城市发生。</p></div>
    {spot}
    <div class="wall">{wall}</div>
    <div class="center"><a class="btn ghost" href="organizers/index.html">看全部组织者荣誉卡</a></div>
  </div>
</section>'''


def page_people():
    r = '../'
    ppl = all_people()
    names = {o['name'] for _, o, _ in ppl}
    tot = lambda k: sum((o.get('record') or {}).get(k) or 0 for _, o, _ in ppl)
    nhost = sum(1 for *_, h in ppl if h)
    stats = [(len(names), '位城市组织者'), (nhost, '位首批主理人'), (len({c['name'] for c, _, _ in ppl}), '座城市')]
    groups = ''
    for reg in REGIONS:
        items = [(c, o) for c, o, h in ppl if c['region'] == reg and not h]
        if items:
            groups += f'<section class="region" data-region-block="{e(reg)}"><h2>{e(reg)}<span>{len(items)}</span></h2><div class="honor">' + ''.join(honor_card(o, c, r, link=True) for c, o in items) + '</div></section>'
    hosts = [(c, o) for c, o, h in ppl if h]
    host_html = ('<section class="region"><h2>首批主理人<span>' + str(len(hosts)) + '</span></h2><div class="honor spot">' + ''.join(honor_card(o, c, r, link=True) for c, o in hosts) + '</div></section>') if hosts else ''
    body = f'''
<section class="page-head people-head">
  <div class="wrap">
    <span class="eyebrow">城市组织者荣誉榜</span>
    <h1>每一座城市，都有<span class="hl">先点灯的人</span></h1>
    <p class="lead">他们找场地、拉群、带志愿者，让每一场活动在自己的城市发生。办成首场的组织者会陆续加入这里。</p>
    <div class="people-stats">{"".join(f"<div><b>{v}</b><span>{t}</span></div>" for v, t in stats)}</div>
  </div>
</section>
<div class="wrap people">
  <aside class="pic-note"><span class="pic-note-ico" aria-hidden="true">✦</span><div><h2>放上你自己的人物形象</h2><p>卡片顶部是你的形象位：AI 创作的角色、插画或本人照片都可以。竖版 4:5，建议 1200×1500 像素以上，JPG、PNG 或 WebP，2MB 以内。须是你本人的形象或你有权使用的作品，不含他人肖像、品牌标识和他人 IP。发给对接你的城市运营，审核后上线。</p></div></aside>
  {host_html}{groups}
  <section class="card cta-panel"><div><h2>你的城市，也可以由你点亮</h2><p>个人或团队都可以申请成为组织者，办成首场即可拿到你的荣誉卡。</p></div><div class="cta-row">{form_btn('organizer_apply', '申请成为组织者')}<a class="btn ghost" href="{r}rules/index.html#join">怎么成为组织者</a></div></section>
</div>'''
    return layout('城市组织者荣誉榜 · WaytoAGI 城市站', f'{len(names)} 位 WaytoAGI 城市组织者与主理人，把 AI 切磋大会带到全国各地。', body, 1, 'people', 'organizers/')


def page_home():
    r = ''
    total_cities = len(COUNT)
    total_ed = len(EDITIONS)
    peak = max((ed for ed in EDITIONS if ed.get('n')), key=lambda x: x['n'])
    top = sorted(CITIES, key=lambda c: -COUNT.get(c['name'], 0))[:12]
    node_cities = sum(1 for c in CITIES if c['organizers'])
    body = f'''
<section class="hero">
  <div class="wrap">
    <span class="eyebrow">WaytoAGI 城市站</span>
    <h1>在你的城市，<span class="hl">找到同路人</span></h1>
    <p class="lead">查询历届参与城市，登记加入本城群或申请办活动。已核实的群入口、活动和组织者将分城开放。</p>
    {search_box(r, big=True)}
    <div class="hot">热门：{''.join(f'<a href="{c["slug"]}/index.html">{e(c["name"])}</a>' for c in top[:6])}</div>
  </div>
</section>

<section class="band">
  <div class="wrap stats">
    <div><b>{total_cities}</b><span>座城市办过 AI 切磋大会</span></div>
    <div><b>{total_ed}</b><span>场全国联动切磋大会</span></div>
    <div><b>{peak["n"]}</b><span>座城市同时开场（{peak["theme"]}）</span></div>
    <div><b>{node_cities or '首批'}</b><span>{'个城市已有组织者' if node_cities else '组织者招募中'}</span></div>
  </div>
</section>

{organizer_wall()}
<section class="sec">
  <div class="wrap">
    <div class="sec-head"><h2>组织者 → 主理人 → 区域负责人</h2><p>同城可以有多位组织者，活动不限场次。每城一位主理人从组织者中产生，统筹本城活动排期和城市群。</p></div>
    <div class="grid g3">
      <a class="card link-card" href="all/index.html"><span class="num">01</span><h3>找到本城</h3><p>查看历史活动；已有群入口的城市可扫码加入，其余城市可先登记。</p><span class="more">全部城市 →</span></a>
      <a class="card link-card" href="join/index.html"><span class="num">02</span><h3>成为组织者</h3><p>个人或团队都可以申请，办成首场即在城市页公示。园区、空间和机构以合作伙伴身份接入。</p><span class="more">申请成为组织者 →</span></a>
      <a class="card link-card" href="rules/index.html"><span class="num">03</span><h3>按规则办活动</h3><p>社区活动登记即办、不抽成；涉及赞助、商业合作或政府合作的提前报备。</p><span class="more">看城市站规则 →</span></a>
    </div>
  </div>
</section>

<section class="sec alt">
  <div class="wrap">
    <div class="sec-head"><h2>参加次数最多的城市</h2><p>按历届全国 AI 切磋大会（含番外与 1024）参与记录统计。</p></div>
    <ol class="rank">{''.join(f'<li><a href="{c["slug"]}/index.html"><span class="rk">{i + 1}</span><b>{e(c["name"])}</b><span class="bar"><i style="width:{round(COUNT.get(c["name"], 0) / COUNT.get(top[0]["name"], 1) * 100)}%"></i></span><em>{COUNT.get(c["name"], 0)} 场</em></a></li>' for i, c in enumerate(top))}</ol>
    <div class="center"><a class="btn ghost" href="all/index.html">看全部 {len(CITIES)} 座城市</a></div>
  </div>
</section>

<section class="sec">
  <div class="wrap cta-panel">
    <div><h2>你的城市还没有组织者？</h2><p>先登记，同城人数够了就开本城群；也可以直接申请成为本城第一位组织者。</p></div>
    <div class="cta-row">{form_btn('organizer_apply', '申请成为组织者')}{form_btn('city_signup', '登记我的城市', 'btn ghost')}</div>
  </div>
</section>'''
    return layout('WaytoAGI 城市站 · 找到你的城市', '72 座城市办过 AI 切磋大会。找到你的城市，进本城群，参加或发起本城活动。', body, 0, 'home', '')


def page_all():
    r = '../'
    groups = ''
    for reg in REGIONS:
        cs = sorted([c for c in CITIES if c['region'] == reg], key=lambda c: -COUNT.get(c['name'], 0))
        if not cs:
            continue
        groups += f'<section class="region" data-region-block="{e(reg)}"><h2>{e(reg)}<span>{len(cs)}</span></h2><div class="city-grid">{"".join(city_card(c, r) for c in cs)}</div></section>'
    chips = '<button type="button" class="chip" aria-pressed="true" data-filter="">全部</button>' + ''.join(
        f'<button type="button" class="chip" aria-pressed="false" data-filter="{e(reg)}">{e(reg)}</button>' for reg in REGIONS)
    body = f'''
<section class="page-head">
  <div class="wrap">
    <h1>全部<span class="hl">城市</span></h1>
    <p class="lead">其中 {len(COUNT)} 座城市有切磋大会参与记录。筹备城市仅开放登记。</p>
    <div class="filterbar"><input type="search" class="filter-q" data-filter-q placeholder="筛选城市" aria-label="筛选城市"><div class="chips" role="group" aria-label="按大区筛选">{chips}</div></div>
  </div>
</section>
<div class="wrap" data-city-list>{groups}<p class="empty" data-empty hidden>没有找到这个城市。{form_btn('city_signup', '登记我的城市', 'btn ghost sm')}</p></div>'''
    return layout('全部城市 · WaytoAGI 城市站', '按大区查看办过 WaytoAGI AI 切磋大会的全部城市。', body, 1, 'all', 'all/')


def page_city(c):
    r = '../'
    n = c['name']
    eds = editions_of(n)
    times = COUNT.get(n, 0) or len(eds)
    q = Q1024.get(n)
    stats = [(f'{times} 场' if times else '—', '参加过的全国切磋大会'), (ym(FIRST.get(n, '')) or '—', '第一次参加'),
             (ym(eds[-1]['date']) if eds else '—', '最近一次')]
    if q:
        stats.append((f'{q["ci"]} 人', '1024 现场签到' + ('（联合会场）' if q['joint'] else '')))
    stat_html = ''.join(f'<div><b>{e(v)}</b><span>{e(t)}</span></div>' for v, t in stats)

    orgs = c['organizers']
    host = c.get('host', '')
    if orgs:
        ordered = sorted(orgs, key=lambda o: o['name'] != host)
        node_html = '<div class="honor">' + ''.join(honor_card(o, c, r, big=(o['name'] == host)) for o in ordered) + '</div>'
        node_intro = f'感谢把 WaytoAGI 带到{e(n)}的人。共 {len(orgs)} 位组织者' + (f'，本城主理人：{e(host)}。' if host else '；主理人产生前由城市运营统筹。')
    else:
        node_html = ''
        node_intro = '本城还没有公示的组织者。办成首场即可在这里公示。'

    qr = c.get('group_qr')
    if qr:
        group_btn = f'<button class="btn primary" type="button" data-open="qr-dialog">进本城群</button>'
        group_dialog = f'''<dialog class="qr" id="qr-dialog" aria-labelledby="qr-title"><form method="dialog"><h2 id="qr-title">WaytoAGI · {e(n)} 城市群</h2><img src="{r}assets/qr/{e(qr)}" alt="{e(n)}城市群二维码" width="240" height="240"><p class="muted">微信扫码进群{('，二维码更新于 ' + e(c['group_qr_updated'])) if c.get('group_qr_updated') else ''}。进群后看群公告，报名本城下一场。</p><button class="btn ghost" value="close">关闭</button></form></dialog>'''
    else:
        group_btn = form_btn('city_signup', '登记进本城群')
        group_dialog = ''
    events = c.get('events_url') or f"{site['links']['events']}/?city={quote(c.get('events_city') or n)}"
    ed_rows = ''.join(f'<li><span>{e(ym(ed["date"]))}</span><b>{e(ed_label(ed))}</b><em>{ed.get("n") or "—"} 城同场</em></li>' for ed in reversed(eds))
    hist = f'<ol class="timeline">{ed_rows}</ol>' if ed_rows else '<p class="muted">本城暂无已核实的历史参与记录。</p>'
    evs = sorted([x for x in EVENTS if x['city'] == n], key=lambda x: x['date'], reverse=True)
    if evs:
        ev_rows = ''.join(
            f'<li><span>{e(x["date"].replace("-", "."))}</span><b><a href="{e(x["url"])}" target="_blank" rel="noopener">{e(x["title"])}</a>'
            f'<small>{"合作社区" if x["kind"] == "合作社区" else "组织者"}：{e(x["host"])}</small></b><em>{int(x["checkins"])} 人签到</em></li>' for x in evs)
        ev_intro = f'共收录 {len(evs)} 场，累计签到 {sum(int(x["checkins"]) for x in evs)} 人。'
        ev_html = f'<ol class="timeline events">{ev_rows}</ol>'
    else:
        ev_intro = '还没有收录的活动。办完活动 3 天内提交活动成果，审核通过后在这里展示。'
        ev_html = ''
    jsonld = json.dumps({'@context': 'https://schema.org', '@type': 'Organization', 'name': f'WaytoAGI {n}', 'parentOrganization': {'@type': 'Organization', 'name': 'WaytoAGI', 'url': site['links']['home']}, 'areaServed': n}, ensure_ascii=False)
    body = f'''
<section class="page-head city-head">
  <div class="wrap">
    <a class="back" href="{r}all/index.html">← 全部城市</a>
    <h1>WaytoAGI <span class="hl">{e(n)}</span></h1>
    <p class="muted">{"" if qr else "本页暂未开放扫码进群，可先登记意向。"}</p>
    {head_people(c)}
    <p class="url"><span class="chip">{e(site['base_url'].replace('https://', '').replace('www.', ''))}/{e(c['slug'])}</span><span class="muted">{e(c['region'])}</span></p>
    <div class="cta-row">{group_btn}<a class="btn ghost" href="{e(events)}" target="_blank" rel="noopener">看本城活动 ↗</a><a class="btn ghost" href="{r}join/index.html?city={e(n)}">申请成为组织者</a></div>
  </div>
</section>
<div class="wrap city-body">
  <div class="stats card">{stat_html}</div>
  <section class="card">
    <div class="card-head"><div><h2>本城组织者</h2><p class="muted">{node_intro}</p></div>{form_btn('organizer_apply', '申请成为组织者', 'btn primary sm')}</div>
    {node_html}
  </section>
  <section class="card">
    <div class="card-head"><div><h2>本城收录活动</h2><p class="muted">{ev_intro}</p></div><div class="cta-row">{form_btn('event_result', '提交活动成果', 'btn primary sm')}<a class="btn ghost sm" href="{r}rules/index.html#listing">收录规范</a></div></div>
    {ev_html}
  </section>
  <div class="grid g2">
    <section class="card"><h2>全国切磋大会 · 历届参与</h2>{hist}</section>
    <section class="card">
      <h2>在本城办活动</h2>
      <ul class="checks">
        <li>社区活动<b>登记即办、不抽成</b>，在活动站发布（选择本城）</li>
        <li>活动页和海报放「关于 WaytoAGI」统一介绍，使用官方标识原件</li>
        <li>现场扫码签到，活动后 3 天内提交活动成果，审核通过即收录到本城记录</li>
        <li>引入赞助、商业合作、政府或境外合作，按分级提前报备</li>
        <li>只办一场、想以「合作社区：WaytoAGI」署名，活动前 7 天报备</li>
      </ul>
      <div class="cta-row"><a class="btn ghost sm" href="{r}rules/index.html#grade">看活动分级</a>{form_btn('event_report', '活动报备', 'btn ghost sm')}</div>
    </section>
  </div>
</div>
{group_dialog}
<script type="application/ld+json">{jsonld}</script>'''
    return layout(f'WaytoAGI {n} · 城市站', f'WaytoAGI {n}：本城的城市群、AI 活动和组织者。{times} 场 AI 切磋大会参与记录。' if times else f'WaytoAGI {n}：本城的城市群、AI 活动和组织者。', body, 1, 'all', f'{c["slug"]}/')


def page_rules():
    r = '../'
    factors = [('sponsor', '引入赞助，或与企业、园区联名', 'B'), ('cosign', '单场活动以「合作社区：WaytoAGI」署名', 'B'), ('big', '规模较大（以城市运营通知为准）', 'B'),
               ('order', '总部介绍的商业合作，或以 WaytoAGI 名义签约、报价', 'C'), ('national', '全国联动活动的分会场', 'C'),
               ('gov', '政府、协会或青年组织合作', 'D'), ('abroad', '在港澳或境外举办', 'D'), ('media', '有媒体采访', 'D')]
    fac_html = ''.join(f'<label class="check"><input type="checkbox" data-level="{lv}" value="{k}"><span>{e(t)}</span></label>' for k, t, lv in factors)
    body = f'''
<section class="page-head">
  <div class="wrap">
    <span class="chip warn">{e(site['rules_version'])} · 以城市运营通知为准</span>
    <h1>城市站<span class="hl">规则</span></h1>
    <p class="lead">三级角色：组织者 → 主理人 → 区域负责人。每个城市一个城市页，由总部维护；同城可以有多位组织者，活动不限场次。</p>
    <nav class="toc" aria-label="本页目录"><a href="#roles">角色</a><a href="#join">加入</a><a href="#cosign">单场合作社区</a><a href="#multi">同城多位组织者</a><a href="#grade">活动分级</a><a href="#listing">收录规范</a><a href="#fund">城市基金</a><a href="#redline">红线与处理</a></nav>
  </div>
</section>
<div class="wrap rules">
  <section id="roles" class="rsec">
    <h2>三级角色</h2>
    <div class="tablebox"><table>
      <thead><tr><th scope="col">角色</th><th scope="col">人数</th><th scope="col">负责什么</th><th scope="col">怎么产生</th></tr></thead>
      <tbody>
        <tr><td>组织者</td><td>每城不限</td><td>在本城办活动；可带自己的团队，人手自行安排</td><td>申请后试办首场，合格即在城市页公示</td></tr>
        <tr><td>主理人</td><td>每城 1 人</td><td>统筹本城活动排期和城市群，参与商业合作派发，每季度与总部复盘；本人仍是组织者</td><td>从本城组织者中产生，看最近一个季度的活动记录，加一次面谈；任期一年。具体条件以城市运营通知为准</td></tr>
        <tr><td>区域负责人</td><td>按大区</td><td>帮区域内新城市办第一场，区域商业合作优先</td><td>从主理人中选，看是否带出过周边新城市和商业合作评级</td></tr>
      </tbody></table></div>
    <p class="muted" style="margin-top:12px">园区、OPC 社区、联合办公空间、高校、协会和海外社群是合作伙伴，按机构合作管理，不占个人身份。来参加活动、帮忙的人统称参与者，不设头衔。</p>
  </section>

  <section id="join" class="rsec">
    <h2>怎么成为组织者</h2>
    <div class="grid g3">
      <div class="card"><span class="tag">组织者</span><h3>个人或团队</h3><p class="muted">有首场的场地和计划就能申请。团队可以起一个展示名。</p></div>
      <div class="card"><span class="tag">合作伙伴 · 空间</span><h3>园区、OPC 社区、联合办公空间</h3><p class="muted">能稳定提供场地，指定 1 名对接人；活动由组织者或总部搭档完成。</p></div>
      <div class="card"><span class="tag">合作伙伴 · 机构</span><h3>高校社团、青年组织、港澳及海外社群</h3><p class="muted">提交书面合作说明；涉及政府、协会或境外合作的事项逐项授权。</p></div>
    </div>
    <ol class="steps">
      <li><b>申请登记</b><span>城市运营通过预留微信联系；场地或机构合作按所提供资源对接</span></li>
      <li><b>试办首场</b><span>60 天内按收录规范办第一场，期间显示「筹备中」，不对外使用 WaytoAGI 名义签约</span></li>
      <li class="on"><b>正式组织者</b><span>首场达到合格标准（以城市运营通知为准），在城市页公示团队名和活动记录</span></li>
      <li><b>每年续期</b><span>连续 6 个月无合规活动转为休眠，重新办活动即可恢复</span></li>
    </ol>
    <p class="muted">普通用户不用申请，在城市页进本城群即可。</p>
  </section>

  <section id="cosign" class="rsec">
    <h2>单场合作社区</h2>
    <p class="muted">只想办一场、希望 WaytoAGI 以合作社区身份署名的个人、团队或其他社区，不需要先成为组织者，按 B 级报备。</p>
    <ul class="dl">
      <li><b>署名</b><span>统一写「合作社区：WaytoAGI」或「支持社区：WaytoAGI」，不得写主办、联合主办或官方。</span></li>
      <li><b>报备</b><span>活动前 7 天填活动报备，勾选「单场合作社区」；城市运营 3 个工作日内回复，确认后才可署名。</span></li>
      <li><b>社区提供</b><span>标识原件与「关于 WaytoAGI」介绍；本城城市群转发一次。公众号与全国渠道宣发另行申请，由总部决定。</span></li>
      <li><b>你需要做到</b><span>按收录规范办；不收费，赞助在报名页写明；活动后 3 天内提交活动成果。审核通过的活动收录到城市页。</span></li>
      <li><b>转正</b><span>同一主体办满 2 场合格活动，可申请转为正式组织者或长期合作伙伴。</span></li>
      <li><b>不接</b><span>商业推广、卖课、引流到付费群、无实际活动内容的挂名。</span></li>
    </ul>
    <div class="cta-row">{form_btn('event_report', '申请单场合作社区')}</div>
  </section>

  <section id="multi" class="rsec">
    <h2>同城多位组织者</h2>
    <ul class="dl">
      <li><b>主理人</b><span>每城 1 名主理人，从本城组织者中产生，统筹本城活动排期和城市群；主理人产生前由城市运营统筹。</span></li>
      <li><b>命名</b><span>「WaytoAGI · 城市名」只由总部使用；组织者团队可用「WaytoAGI 城市名 · 团队名」。个人头衔只用组织者、主理人、区域负责人，不得自称城市负责人、城市代理或总代。</span></li>
      <li><b>城市群</b><span>每城一个长期群，由总部账号建群，主理人和本城组织者任管理员。组织者可另建活动群，但不得冠以城市群名义，不得收取群费。</span></li>
      <li><b>撞期</b><span>活动在活动站选择本城发布，主理人据此查看本城排期；同城同时段可并行；仅在争用场地、预算或联动名额时协调。主理人也是申请方时，由城市运营协调。</span></li>
      <li><b>全国联动</b><span>切磋大会等全国活动，每位正式组织者都可报名分会场，各会场分别满足场地和签到要求。</span></li>
      <li><b>争议</b><span>主理人先协调；5 个工作日内无法解决的，交城市运营裁定。</span></li>
    </ul>
  </section>

  <section id="grade" class="rsec">
    <h2>活动分级</h2>
    <p class="muted">越涉及品牌背书、资金、政府或境外合作，审核越前置；普通社区活动登记即办。</p>
    <div class="grade-tool">
      <fieldset class="card"><legend>勾选这场活动的情况</legend>{fac_html}<p class="muted small">都不勾，就是普通社区活动。</p></fieldset>
      <div class="card grade-out" data-grade-out aria-live="polite"></div>
    </div>
    {grade_table()}
    <div class="tablebox"><table>
      <thead><tr><th scope="col">适用情形</th><th scope="col">须交材料</th></tr></thead>
      <tbody>
        <tr><td>所有活动</td><td>3 天内提交活动成果：活动站链接、扫码签到人数、获准公开的现场照片</td></tr>
        <tr><td>引入赞助</td><td>对应的收支明细</td></tr>
        <tr><td>有商业交付</td><td>交付验收与甲方反馈；约定分成的另登记结算</td></tr>
        <tr><td>专项授权或官方媒体稿</td><td>按授权要求复盘；官方稿件发布前送审</td></tr>
      </tbody></table></div>
    <div class="cta-row">{form_btn('event_report', 'B / C / D 级活动报备')}</div>
  </section>

  <section id="listing" class="rsec">
    <h2>收录规范</h2>
    <p class="muted">组织者自办活动不限场次、不抽成。满足以下五项的活动收录到城市页，并计入组织者活动记录。</p>
    <ul class="checks cols">
      <li><b>发布</b>在活动站发布</li>
      <li><b>官方介绍</b>活动页底部和海报放「关于 WaytoAGI」统一介绍</li>
      <li><b>品牌素材</b>使用总部提供的标识原件，不重画、不变形、不改色</li>
      <li><b>签到</b>现场扫活动站签到码</li>
      <li><b>照片</b>活动后 3 天内上传现场照片</li>
    </ul>
    <p class="muted">试行期内暂不办公开收费活动。活动结束后 3 天内用「提交活动成果」表提交活动站链接、签到人数和现场照片，审核通过即收录到本城页面。请勿提交报名名单。</p>
  </section>

  <section class="rsec"><h2>提交活动成果</h2><p>活动结束后 3 天内提交，审核通过即收录到本城页面，并计入你的活动记录。查进度或更正，写在表单「补充说明」里注明原活动名和日期。</p>{form_btn('event_result', '提交活动成果')}</section>
  <section id="fund" class="rsec">
    <h2>商业合作与城市基金</h2>
    <div class="fund">
      <div class="fund-bar" aria-hidden="true"><span style="flex:8">80% 执行的组织者</span><span style="flex:2">20%</span></div>
      <ul class="dl">
        <li><b>比例</b><span>总部介绍给城市的商业合作，原则上按书面约定基数的 20% 进城市基金、80% 归执行组织者。开工前确认基数、成本、税费、退款与结算日期；非标项目单议。</span></li>
        <li><b>授权</b><span>以 WaytoAGI 名义签约或对外报价，须总部一单一授权。</span></li>
        <li><b>用途</b><span>城市基金用于城市运营人力、物料、切磋大会和城市活动支持。</span></li>
        <li><b>公示</b><span>每季度向本城组织者公示基金收入与支出汇总。</span></li>
      </ul>
    </div>
  </section>

  <section id="redline" class="rsec">
    <h2>红线与处理</h2>
    <div class="grid g2">
      <div class="card"><h3>各级通用规则</h3><ul class="checks">
        <li>不得自称官方、总部或城市代理，不冒用大厂、嘉宾、赞助方名义</li>
        <li>试行期内暂不办公开收费活动；不私下收费、不收群费，不把成员引到个人付费群</li>
        <li>报名名单不导出给第三方；拍照须在报名须知中说明</li>
        <li>不夸大 AI 能力，不做收益承诺，不涉及投资理财、医疗和政治议题</li>
        <li>不以官方身份接受采访或发声明，统一转总部</li>
        <li>大型活动确认场地容量和疏散通道；有未成年人参加须取得监护人同意</li>
      </ul></div>
      <div class="card"><h3>违规处理</h3><ol class="ladder"><li>提醒修改</li><li>不收录</li><li>暂停资格</li><li>取消身份</li></ol><p class="muted">私下收费、导出成员数据、冒用官方名义的，直接暂停资格，核实后决定是否取消。</p></div>
    </div>
  </section>
</div>'''
    return layout('城市站规则 · WaytoAGI 城市站', 'WaytoAGI 城市站规则（试行）：三级角色、怎么成为组织者、同城多位组织者、活动分级、收录规范与城市基金。', body, 1, 'rules', 'rules/')


def page_join():
    r = '../'
    body = f'''
<section class="page-head">
  <div class="wrap">
    <h1>加入与<span class="hl">报备</span></h1>
    <p class="lead">四个入口：申请成为组织者、登记我的城市、活动报备、提交活动成果。微信仅用于跟进本次事项；姓名或团队展示另行征求同意。</p>
    <p class="muted" data-join-city hidden></p>
  </div>
</section>
<div class="wrap join">
  <div class="grid g2">
    <section class="card entry">
      <span class="num">01</span><h2>申请成为组织者</h2>
      <p class="muted">个人或团队都可以申请；园区、空间和机构请在表单里选「合作伙伴」。组织者填写首场计划；合作伙伴只需说明可提供的资源或合作意向，不必承诺主办。</p>
      <ol class="mini"><li>城市运营通过微信联系</li><li>60 天内试办首场</li><li>达标后另征得本人同意再公示</li></ol>
      {form_btn('organizer_apply', '填写申请', hint=True)}
    </section>
    <section class="card entry">
      <span class="num">02</span><h2>登记我的城市</h2>
      <p class="muted">本城还没有群，或者想先认识同城的人。登记后，同城人数够了就开本城群。</p>
      <ol class="mini"><li>留下城市和联系方式</li><li>城市运营通过微信联系你</li><li>本城开群时第一时间通知</li></ol>
      {form_btn('city_signup', '登记城市', hint=True)}
    </section>
    <section class="card entry">
      <span class="num">03</span><h2>活动报备</h2>
      <p class="muted">B、C、D 级活动在这里报备或申请授权：引入赞助、单场合作社区署名、商业合作、政府或境外合作、媒体采访。</p>
      <ol class="mini"><li>先用活动分级确认级别</li><li>按级别提前提交</li><li>城市运营或总部确认</li></ol>
      {form_btn('event_report', '提交报备', hint=True)}<a class="btn ghost sm" href="{r}rules/index.html#grade">活动分级自查</a>
    </section>
    <section class="card entry">
      <span class="num">04</span><h2>提交活动成果</h2>
      <p class="muted">活动结束后 3 天内提交活动站链接、签到人数和现场照片。审核通过即收录到本城页面，并计入你的活动记录。</p>
      <ol class="mini"><li>按收录规范办活动</li><li>3 天内提交成果</li><li>审核通过后上城市页</li></ol>
      {form_btn('event_result', '提交成果', hint=True)}<a class="btn ghost sm" href="{r}rules/index.html#listing">收录规范</a>
    </section>
  </div>
  <section class="card faq">
    <h2>常见问题</h2>
    <details><summary>同一个城市已经有组织者了，我还能申请吗？</summary><p>可以。同城可以有多位组织者，各自带团队办活动；本城主理人统一协调活动排期和城市群。</p></details>
    <details><summary>需要配副手或固定团队吗？</summary><p>不强制。人手由组织者自行安排。</p></details>
    <details><summary>办活动要交钱或被抽成吗？</summary><p>不用。组织者自办社区活动不抽成；试行期内也暂不办公开收费活动。总部介绍的商业合作原则上按书面约定基数的 20% 进城市基金，用于反哺城市运营。</p></details>
    <details><summary>我只想办一场，能让 WaytoAGI 作为合作社区吗？</summary><p>可以。活动前 7 天提交活动报备并勾选「单场合作社区」，确认后按「合作社区：WaytoAGI」署名，不需要先成为组织者。详见<a href="{r}rules/index.html#cosign">单场合作社区规则</a>。</p></details>
    <details><summary>办完活动，成果交到哪里？</summary><p>活动结束后 3 天内填「提交活动成果」表：活动站链接、签到人数、现场照片。审核通过后收录到本城页面。需要查进度或更正，在表单「补充说明」里注明原活动名和日期。</p></details>
    <details><summary>办多少场有限制吗？</summary><p>不限场次。按收录规范办的活动，都会进本城记录。</p></details>
  </section>
</div>'''
    return layout('加入与报备 · WaytoAGI 城市站', '申请成为 WaytoAGI 城市组织者、登记城市、提交活动报备。', body, 1, 'join', 'join/')


def build():
    manifest = json.loads((ROOT / 'assets' / 'logo' / 'source-manifest.json').read_text('utf-8'))
    want = next(v['sha256'] for v in manifest['variants'] if v['file'] == LOGO_SOURCE)
    if hashlib.sha256((ROOT / 'assets' / LOGO_FILE).read_bytes()).hexdigest() != want:
        raise SystemExit('Logo 与官方素材清单不一致，停止构建')
    slugs = [c['slug'] for c in CITIES]
    for sl in slugs:
        if not SLUG_RE.fullmatch(sl or ''):
            raise SystemExit(f'城市 slug 不合法：{sl!r}（只能用小写字母开头，含小写字母、数字和 -）')
        if not (DIST / sl).resolve().is_relative_to(DIST.resolve()):
            raise SystemExit(f'城市 slug 越出 hq/：{sl!r}')
    if len(slugs) != len(set(slugs)):
        raise SystemExit('城市 slug 重复')
    if RESERVED & set(slugs):
        raise SystemExit(f'城市 slug 与保留路径冲突：{sorted(RESERVED & set(slugs))}')
    for c in CITIES:
        for key in ('group_qr',):
            if c.get(key) and not SAFE_FILE.fullmatch(c[key]):
                raise SystemExit(f'{c["name"]} 的 {key} 只能是文件名：{c[key]!r}')
        for o in c['organizers']:
            if portrait_of(o) and not SAFE_FILE.fullmatch(portrait_of(o)):
                raise SystemExit(f'{c["name"]} {o["name"]} 的人物形象只能是文件名：{portrait_of(o)!r}')
        if c.get('group_qr') and not (ROOT / 'assets' / 'qr' / c['group_qr']).exists():
            raise SystemExit(f'{c["name"]} 的群码文件不存在：assets/qr/{c["group_qr"]}')
        for o in c['organizers']:
            pic = portrait_of(o)
            if pic:
                f = ROOT / 'assets' / 'people' / pic
                if not f.exists():
                    raise SystemExit(f'{c["name"]} {o["name"]} 的人物形象不存在：assets/people/{pic}')
                if f.suffix.lower() not in ('.jpg', '.jpeg', '.png', '.webp'):
                    raise SystemExit(f'人物形象只支持 jpg、png、webp：{pic}')
                if f.stat().st_size > 2 * 1024 * 1024:
                    raise SystemExit(f'人物形象超过 2MB，请压缩后再放：{pic}')
    if DIST.exists():
        shutil.rmtree(DIST)
    (DIST / 'assets').mkdir(parents=True)
    shutil.copytree(ROOT / 'assets', DIST / 'assets', dirs_exist_ok=True)
    shutil.copy(ROOT / 'src' / 'site.css', DIST / 'assets' / 'site.css')
    shutil.copy(ROOT / 'src' / 'site.js', DIST / 'assets' / 'site.js')
    pages = {'index.html': page_home(), 'all/index.html': page_all(), 'rules/index.html': page_rules(), 'join/index.html': page_join(), 'organizers/index.html': page_people()}
    for c in CITIES:
        pages[f'{c["slug"]}/index.html'] = page_city(c)
    for path, content in pages.items():
        p = DIST / path
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content)
    base = site['base_url'].rstrip('/')
    urls = [''] + ['all/', 'organizers/', 'rules/', 'join/'] + [c['slug'] + '/' for c in CITIES]
    (DIST / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'<url><loc>{base}/{u}</loc></url>\n' for u in urls) + '</urlset>\n')
    print(f'生成 {len(pages)} 个页面到 hq/（城市页 {len(CITIES)} 个）')


if __name__ == '__main__':
    build()
