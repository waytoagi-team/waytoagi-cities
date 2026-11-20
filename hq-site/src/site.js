/* WaytoAGI 城市站：找同城、城市筛选、活动分级自查、群码弹窗、加入页城市带入。无依赖。 */
(function () {
  'use strict';
  var norm = function (s) { return String(s || '').trim().replace(/(市|特别行政区)$/, ''); };

  // 找同城
  document.querySelectorAll('[data-finder]').forEach(function (form) {
    var map = {};
    try { map = JSON.parse(form.querySelector('[data-city-map]').textContent); } catch (e) {}
    var msg = form.querySelector('[data-finder-msg]');
    var root = form.getAttribute('data-root') || '';
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var q = norm(form.querySelector('input').value);
      if (!q) { msg.textContent = '先输入城市名。'; return; }
      var own = function (k) { return Object.prototype.hasOwnProperty.call(map, k); };
      var slug = own(q) ? map[q] : '';
      if (!slug) {
        var hit = Object.keys(map).find(function (k) { return k.indexOf(q) === 0 || q.indexOf(k) === 0; });
        slug = hit ? map[hit] : '';
      }
      if (slug) { location.href = root + slug + '/index.html'; return; }
      msg.innerHTML = '';
      msg.append(document.createTextNode('「' + q + '」还没有城市页。'));
      var a = document.createElement('a');
      a.href = root + 'join/index.html?city=' + encodeURIComponent(q);
      a.textContent = '登记城市或申请成为第一位组织者 →';
      msg.append(' ', a);
    });
  });

  // 全部城市：筛选
  var list = document.querySelector('[data-city-list]');
  if (list) {
    var q = document.querySelector('[data-filter-q]');
    var chips = document.querySelectorAll('[data-filter]');
    var region = '';
    var apply = function () {
      var term = norm(q.value);
      var shown = 0;
      list.querySelectorAll('[data-region-block]').forEach(function (block) {
        var blockShown = 0;
        block.querySelectorAll('.city-card').forEach(function (card) {
          var ok = (!region || card.dataset.region === region) && (!term || card.dataset.city.indexOf(term) > -1);
          card.hidden = !ok; if (ok) blockShown++;
        });
        block.hidden = blockShown === 0; shown += blockShown;
      });
      list.querySelector('[data-empty]').hidden = shown > 0;
    };
    q.addEventListener('input', apply);
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        region = c.dataset.filter;
        chips.forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
        apply();
      });
    });
  }

  // 活动分级自查
  var out = document.querySelector('[data-grade-out]');
  if (out) {
    var L = {
      A: ['登记即办', '在活动站发布（选择本城）', '无需审批', ['扫码签到记录', '3 天内上传照片']],
      B: ['报备', '提前报备赞助方、赞助金额和用途、场地安全', '城市运营', ['扫码签到记录', '3 天内上传照片', '赞助明细']],
      C: ['授权', '取得书面授权；涉及商单时约定分成、交付和结算', '总部', ['扫码签到记录', '3 天内上传照片', '赞助明细', '交付验收与甲方反馈', '分成登记']],
      D: ['一事一议', '首次或超出系列授权范围时，提前提交合作说明', '总部', ['扫码签到记录', '3 天内上传照片', '赞助明细', '交付验收与甲方反馈', '简短复盘', '媒体稿发布前交总部审核']]
    };
    var order = 'ABCD';
    var boxes = document.querySelectorAll('.grade-tool input[type=checkbox]');
    var render = function () {
      var lv = 'A';
      boxes.forEach(function (b) { if (b.checked && order.indexOf(b.dataset.level) > order.indexOf(lv)) lv = b.dataset.level; });
      var d = L[lv];
      var levels = order.split('').filter(function (x) { return x === 'A' ? false : Array.from(boxes).some(function (b) { return b.checked && b.dataset.level === x; }); });
      if (!levels.length) levels = ['A'];
      var pre = [];
      levels.forEach(function (x) { L[x][1].split('；').forEach(function (t) { if (t && pre.indexOf(t) < 0) pre.push(t); }); });
      var selected = function (value) { return Array.from(boxes).some(function (box) { return box.checked && box.value === value; }); };
      var materials = ['活动链接、签到人数；3 天内交获准使用的照片链接'];
      if (selected('sponsor')) materials.push('取得赞助时，提交对应收支明细');
      if (selected('order')) materials.push('有商业交付时提交验收与甲方反馈；有分成时登记结算');
      if (lv === 'D') materials.push('按书面授权要求复盘');
      if (selected('media')) materials.push('官方媒体稿发布前送审');
      out.innerHTML = '';
      var badge = document.createElement('span'); badge.className = 'lv big ' + lv.toLowerCase(); badge.textContent = lv;
      var h = document.createElement('h3'); h.textContent = lv + ' 级 · ' + d[0];
      var dl = document.createElement('dl');
      [['事前', pre.join('；')], ['谁确认', d[2]]].forEach(function (p) {
        var dt = document.createElement('dt'); dt.textContent = p[0];
        var dd = document.createElement('dd'); dd.textContent = p[1];
        dl.append(dt, dd);
      });
      var t = document.createElement('p'); t.className = 'muted'; t.style.marginTop = '14px'; t.textContent = '事后交付';
      var ul = document.createElement('ul'); ul.className = 'checks'; ul.style.marginTop = '6px';
      materials.forEach(function (x) { var li = document.createElement('li'); li.textContent = x; ul.append(li); });
      out.append(badge, h, dl, t, ul);
    };
    boxes.forEach(function (b) { b.addEventListener('change', render); });
    render();
  }

  // 群码弹窗
  document.querySelectorAll('[data-open]').forEach(function (btn) {
    var dlg = document.getElementById(btn.dataset.open);
    if (!dlg || typeof dlg.showModal !== 'function') return;
    btn.addEventListener('click', function () { dlg.showModal(); });
    dlg.addEventListener('click', function (ev) { if (ev.target === dlg) dlg.close(); });
  });

  // 加入页：带入城市
  var joinCity = document.querySelector('[data-join-city]');
  if (joinCity) {
    var c = norm(new URLSearchParams(location.search).get('city'));
    if (c) { joinCity.textContent = '正在为「' + c + '」申请：填写表单时请选择这个城市。'; joinCity.hidden = false; }
  }
})();

