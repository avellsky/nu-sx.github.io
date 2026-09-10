/* NU-SORA デモ / アプリ本体：ルーティング・ヘッダ・時計・テーマ */
'use strict';
(function (NS) {
var el = NS.el;

var TABS = [
  { id:'dashboard', label:'ダッシュボード',   tag:'OVERVIEW' },
  { id:'map',       label:'観測局マップ',     tag:'NETWORK' },
  { id:'fireball',  label:'火球・隕石',       tag:'G-1' },
  { id:'reentry',   label:'デブリ再突入',     tag:'G-2' },
  { id:'infra',     label:'インフラサウンド', tag:'G-4' },
  { id:'weather',   label:'気象・熱中症',     tag:'G-6' },
  { id:'skyglow',   label:'夜空の明るさ',     tag:'G-3' },
  { id:'alerts',    label:'通報・社会実装',   tag:'G-7' },
  { id:'stations',  label:'観測局・機材',     tag:'PF-1' },
  { id:'data',      label:'データ・API',      tag:'PF-2' },
  { id:'about',     label:'このデモについて', tag:'' }
];
var PARENT = { station:'stations' };

var leaveFns = [];
NS.onLeave = function (f) { leaveFns.push(f); };

function go(view, arg) {
  location.hash = '#' + view + (arg ? '/' + arg : '');
}
NS.go = go;

function parseHash() {
  var h = (location.hash || '').replace(/^#/, '');
  if (!h) return { view:'dashboard', arg:null };
  var p = h.split('/');
  return { view:p[0], arg:p[1] ? decodeURIComponent(p[1]) : null };
}

function render() {
  var r = parseHash();
  if (!NS.V[r.view]) r = { view:'dashboard', arg:null };
  leaveFns.forEach(function (f) { try { f(); } catch (e) {} });
  leaveFns = [];
  var main = document.getElementById('main');
  NS.clear(main);
  var active = PARENT[r.view] || r.view;
  Array.prototype.forEach.call(document.querySelectorAll('nav.tabs button'), function (b) {
    b.setAttribute('aria-selected', b.getAttribute('data-v') === active ? 'true' : 'false');
  });
  try {
    NS.V[r.view](main, go, r.arg);
  } catch (err) {
    NS.add(main, el('div', { class:'panel' }, el('div', { class:'panel-b' }, [
      el('h3', { text:'表示に失敗しました' }),
      el('pre', { class:'api', text:String(err && err.stack || err) })
    ])));
    if (window.console) console.error(err);
  }
  main.scrollIntoView({ block:'start' });
  window.scrollTo(0, 0);
}

function buildHeader() {
  var head = document.getElementById('head');
  var clock = el('div', { class:'clock' }, [
    el('div', { class:'jst', id:'clk-jst', text:'--:--:--' }),
    el('div', { class:'utc', id:'clk-utc', text:'---- UTC' })
  ]);
  var themeBtn = el('button', { class:'iconbtn', id:'themebtn', text:'配色', title:'明暗の配色を切り替える',
    onclick:function () {
      var cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', cur);
      try { localStorage.setItem('nusora-theme', cur); } catch (e) {}
      themeBtn.textContent = cur === 'light' ? '配色：明' : '配色：暗';
      render();
    } });
  var saved = 'dark';
  try { saved = localStorage.getItem('nusora-theme') || 'dark'; } catch (e) {}
  document.documentElement.setAttribute('data-theme', saved);
  themeBtn.textContent = saved === 'light' ? '配色：明' : '配色：暗';

  NS.add(head, el('div', { class:'top-in' }, [
    el('div', { class:'brand' }, [
      el('div', { class:'eyebrow', text:'NU-SORA · Nihon University Sky Observation and Resilience Array' }),
      el('h1', { text:'日本大学 全学屋上観測網「そら」' }),
      el('div', { class:'sub', text:'観測ポータル デモ版　全国 13 局 ／ 全天光学カメラ・4K分光カメラ・インフラサウンド・気象・夜空輝度計・GNSS' })
    ]),
    el('div', { class:'hstat' }, [
      el('span', { class:'badge ok', id:'netbadge' }, [el('span', { class:'dot' }), '観測網 稼働中']),
      clock, themeBtn
    ])
  ]));
  NS.add(head, el('nav', { class:'tabs', role:'tablist' }, TABS.map(function (t) {
    return el('button', { role:'tab', 'data-v':t.id, 'aria-selected':'false', onclick:function () { go(t.id); } }, [
      t.label, t.tag ? el('span', { class:'tg', text:t.tag }) : null
    ]);
  })));
}

function tick() {
  var t = NS.now();
  var j = document.getElementById('clk-jst'), u = document.getElementById('clk-utc');
  if (j) j.textContent = NS.fmtJST(t, { timeOnly:true });
  if (u) u.textContent = NS.fmtJST(t, { dateOnly:true }) + ' JST ／ ' + NS.fmtUTC(t) + ' UTC';
  var b = document.getElementById('netbadge');
  if (b) {
    var n = NS.netSummary();
    b.className = 'badge ' + (n.down ? 'warn' : 'ok');
    NS.clear(b);
    NS.add(b, [el('span', { class:'dot' }), '観測網 ' + n.ok + '/' + NS.STATIONS.length + ' 局 稼働中']);
  }
}

function boot() {
  NS.buildCatalog();
  buildHeader();
  window.addEventListener('hashchange', render);
  render();
  tick();
  setInterval(tick, 1000);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})(NS);
