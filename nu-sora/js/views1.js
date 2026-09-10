/* NU-SORA デモ / 画面：ダッシュボード・観測局マップ・観測局一覧・観測局詳細 */
'use strict';
(function (NS) {
var el = NS.el, s = NS.s, panel = NS.panel, badge = NS.badge;
NS.V = NS.V || {};

/* ---------- 集計ヘルパ ---------- */
NS.netSummary = function () {
  var t = NS.now(), ok = 0, warn = 0, down = 0, up = 0, night = 0, clear = 0, sqm = [], wbgt = [];
  NS.STATIONS.forEach(function (st) {
    var s2 = NS.stationState(st, t);
    if (s2.status === 'ok') ok++; else if (s2.status === 'warn') warn++; else down++;
    up += s2.uptime;
    if (s2.night) { night++; if (s2.weather.cloud < 0.35) clear++; }
    var sb = NS.skyBrightness(st, t);
    if (sb.mag != null) sqm.push(sb.mag);
    wbgt.push({ st:st, v:s2.weather.wbgt });
  });
  wbgt.sort(function (a, b) { return b.v - a.v; });
  var nominal = NS.STATIONS.reduce(function (a, b) { return a + b.sqm; }, 0) / NS.STATIONS.length;
  return { t:t, ok:ok, warn:warn, down:down, sqmNominal:nominal, uptime:up / NS.STATIONS.length, night:night, clear:clear,
    sqmMean:sqm.length ? sqm.reduce(function (a, b) { return a + b; }, 0) / sqm.length : null,
    sqmN:sqm.length, wbgtMax:wbgt[0], wbgt:wbgt,
    moon:NS.moonIllum(t), moonAge:NS.moonPhase(t) * 29.53 };
};
/* 今夜の検出見込み（局ごとの空の条件から） */
NS.tonightCount = function (at) {
  var t = at == null ? NS.now() : at, tot = 0, per = [];
  NS.STATIONS.forEach(function (st) {
    var r = NS.rng(st.id + '|cnt|' + NS.fmtJST(t, { dateOnly:true }));
    var sb = NS.skyBrightness(st, t);
    var base = 12 * Math.pow(10, 0.30 * (st.sqm - 19.0));      /* 暗い空ほど多い */
    var el2 = sb.mag == null ? 0 : (1 - Math.min(1, sb.w.cloud * 1.05)) * (1 - 0.30 * NS.moonIllum(t));
    var hoursIn = Math.max(0.25, Math.min(1, (-sb.w.sunAlt - 12) / 6));
    var n = Math.round(base * el2 * hoursIn * r.range(0.7, 1.3));
    per.push({ st:st, n:n, cloud:sb.w.cloud, sqm:sb.mag });
    tot += n;
  });
  return { total:tot, per:per };
};
NS.recentFireballs = function (days) {
  var t = NS.now(), lim = t - days * 86400e3;
  return NS.EVENTS.filter(function (e) { return e.t >= lim && e.kind === 'fireball'; });
};

/* ---------- 小部品 ---------- */
function kpi(label, value, unit, sub, opt) {
  opt = opt || {};
  return el('div', { class:'kpi' + (opt.acc ? ' acc' : '') + (opt.spark ? ' has-spark' : '') }, [
    el('div', { class:'kl' }, [opt.icon ? el('span', { text:opt.icon }) : null, label]),
    el('div', { class:'kv' }, [String(value), unit ? el('small', { text:unit }) : null]),
    sub ? el('div', { class:'ks', html:sub }) : null,
    opt.spark ? NS.chart.spark(opt.spark, { color:opt.sparkColor || 'var(--accent)' }) : null
  ]);
}
NS.kpi = kpi;
function evIcon(e) { return e.kind === 'fireball' ? '☄' : e.kind === 'reentry' ? '🛰' : e.kind === 'infrasound' ? '〰' : e.kind === 'seismic' ? '▤' : '✦'; }
NS.evIcon = evIcon;
function evRow(e, onClick, sel) {
  var right, sub;
  if (e.kind === 'fireball' || e.kind === 'meteor') { right = NS.mag(e.absMag); sub = e.stationsDet + ' 局'; }
  else if (e.kind === 'reentry') { right = NS.mag(e.absMag); sub = e.stationsDet + ' 局'; }
  else if (e.kind === 'infrasound') { right = NS.f(e.peakPa, 2) + ' Pa'; sub = e.det.length + ' 局'; }
  else { right = 'M' + (e.name.match(/M([\d.]+)/) || [, '—'])[1]; sub = e.det.length + ' 局'; }
  var r = el('div', { class:'evrow' + (sel === e.id ? ' on' : ''), onclick:function () { onClick(e); }, role:'button', tabindex:'0' }, [
    el('div', { class:'ei', text:evIcon(e) }),
    el('div', null, [
      el('div', { class:'en' }, [e.name, e.auto ? null : badge('解析済', 'info')]),
      el('div', { class:'em', text:NS.fmtJST(e.t) + ' JST · ' + NS.ago(e.t) })
    ]),
    el('div', { class:'ev' }, [right, el('small', { text:sub })])
  ]);
  r.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') onClick(e); });
  return r;
}
NS.evRow = evRow;

/* =========================================================================
   ダッシュボード
   ========================================================================= */
NS.V.dashboard = function (root, go) {
  var n = NS.netSummary(), tn = NS.tonightCount(NS.nextMidnight());
  var fb30 = NS.recentFireballs(14), fb7 = NS.recentFireballs(7);
  var infra24 = NS.INFRA.filter(function (e) { return e.t > NS.now() - 86400e3; });
  var lvl = fb30.some(function (e) { return e.absMag < -11 && e.t > NS.now() - 5 * 86400e3; }) ? '注意' : '平常';

  NS.add(root, el('div', { class:'page-h' }, [
    el('h2', { text:'総合ダッシュボード' }),
    el('p', { text:'全国 13 局の観測局から集約した「日本の空」の現況。火球・スペースデブリ再突入・インフラサウンド・気象・夜空輝度を 24 時間連続で監視する。' })
  ]));

  /* 状態バー */
  var statusPanel = panel('観測網の状態', { note:'GNSS 時刻同期・全局共通仕様' }, [
    el('div', { class:'split', style:{ marginBottom:'12px' } }, [
      el('span', { class:'lvl ' + lvl }, [el('span', { class:'dot' }), '警戒レベル：' + lvl]),
      el('div', { class:'spacer' }),
      badge('稼働 ' + n.ok + ' 局', 'ok'),
      n.warn ? badge('一部障害 ' + n.warn + ' 局', 'warn') : null,
      n.down ? badge('停止 ' + n.down + ' 局', 'crit') : null,
      badge('データ取得 正常', 'ok')
    ]),
    el('div', { class:'grid g4' }, [
      kpi('観測網 稼働率', NS.f(n.uptime, 2), '%', '直近 30 日平均', { acc:true,
        spark:Array.from({ length:24 }, function (_, i) { return 99.2 + NS.rng('up' + i)() * 0.8; }) }),
      kpi('夜間観測中', n.night, '/ 13 局', n.clear + ' 局が晴天（雲量 35% 未満）'),
      kpi('今夜の検出見込み', tn.total, '個', '深夜 1 時前後の空の条件による 13 局の延べ検出数の推定', { icon:'☄' }),
      kpi('月齢', NS.f(n.moonAge, 1), '', '輝面比 ' + Math.round(n.moon * 100) + '% ' + (n.moon > 0.6 ? '（観測条件やや不良）' : '（良好）'))
    ])
  ]);
  NS.add(root, statusPanel);

  /* KPI 行 */
  NS.add(root, el('div', { class:'grid g4', style:{ marginTop:'14px' } }, [
    kpi('火球（14 日）', fb30.length, '件', fb7.length + ' 件が直近 7 日 · 0 等より明るい事象',
      { icon:'☄', spark:Array.from({ length:30 }, function (_, i) { return NS.rng('fb' + i)() * 3; }), sparkColor:'var(--c-crit)' }),
    kpi('インフラサウンド事象（24 h）', infra24.length + 1842, '件', '内訳：雷 1,842 · 火山 1 · その他 ' + infra24.length,
      { icon:'〰', sparkColor:'var(--c-infra)' }),
    kpi('全国平均 夜空輝度', NS.f(n.sqmMean == null ? n.sqmNominal : n.sqmMean, 2), 'mag/arcsec²',
      n.sqmN ? n.sqmN + ' 局で夜間測定中' : '全局が薄明・昼間のため 13 局の平常値の平均を表示', { icon:'✦', sparkColor:'var(--c-sky)' }),
    kpi('最高 WBGT', NS.f(n.wbgtMax.v, 1), '℃', n.wbgtMax.st.name + ' · ' + NS.wbgtLevel(n.wbgtMax.v).label,
      { icon:'🌡', sparkColor:'var(--c-warn)' })
  ]));

  /* 地図 + イベント */
  var mapPanel, evPanel;
  var M = NS.Map({ onStation:function (st) { go('station', st.id); } });
  M.drawFov([30]);
  M.drawStations({ state:function (st) { return NS.stationState(st, NS.now()); },
    halo:function (st) {
      var sb = NS.skyBrightness(st, NS.now()), m = sb.mag == null ? st.sqm : sb.mag;
      return { r:6 + (22 - m) * 5, color:NS.SQM_SCALE(m), opacity:sb.mag == null ? 0.14 : 0.28 };
    },
    tipExtra:function (st, s2) {
      var sb = NS.skyBrightness(st, NS.now());
      return '状態：' + (s2.status === 'ok' ? '正常' : s2.status === 'warn' ? '一部障害' : '停止') +
        ' / ' + s2.obsMode + '<br>夜空輝度：' + (sb.mag == null ? '— （薄明・昼間）' : NS.f(sb.mag, 2) + ' mag/arcsec²') +
        '<br>雲量：' + Math.round(s2.weather.cloud * 100) + '% · 気温 ' + NS.f(s2.weather.temp, 1) + '℃';
    } });
  /* 直近火球の地上軌跡 */
  var fbShow = NS.FLAGSHIP.fireball;
  M.addOverlay(s('path', { d:NS.geoLinePath(fbShow.begin, fbShow.end), stroke:'var(--accent)', 'stroke-width':2.2,
    fill:'none', 'stroke-linecap':'round', opacity:0.9, 'vector-effect':'non-scaling-stroke' }));
  var ee = M.pt(fbShow.end.lon, fbShow.end.lat);
  M.addOverlay(s('circle', { cx:ee[0], cy:ee[1], r:M.px(4), fill:'var(--accent)' }));

  mapPanel = panel('観測局配置と現況', { note:'ホイールで拡大・ドラッグで移動 / 局をクリックで詳細',
    tools:el('div', { class:'split' }, [NS.refreshTool(function () { NS.rerender(); }),
    el('div', { class:'seg' }, ['all', 'kanto', 'kyushu', 'tohoku'].map(function (k) {
      var b = el('button', { text:NS.VIEWS[k].name, 'aria-pressed':k === 'all' ? 'true' : 'false',
        onclick:function () {
          M.goto(k, true);
          Array.prototype.forEach.call(b.parentNode.children, function (x) { x.setAttribute('aria-pressed', 'false'); });
          b.setAttribute('aria-pressed', 'true');
        } });
      return b;
    }))]) }, []);
  mapPanel.querySelector('.panel-b').classList.add('flush');
  mapPanel.querySelector('.panel-b').appendChild(M.node);
  mapPanel.querySelector('.panel-b').appendChild(el('div', { class:'maplegend' }, [
    el('span', { html:'<i style="background:var(--c-u)"></i>大学キャンパス拠点 6 局' }),
    el('span', { html:'<i style="background:var(--c-s);border-radius:50%"></i>付属校拠点 7 局' }),
    el('span', { html:'<i style="border:1px solid var(--accent);background:none"></i>視野円（高度 100 km を仰角 30° 以上、地表半径 ' + Math.round(NS.groundRadius(100, 30)) + ' km）' }),
    el('span', { html:'<i style="background:var(--accent)"></i>直近の火球の地上軌跡' })
  ]));

  var evPanelBody = el('div', { class:'evlist' });
  NS.EVENTS.slice(0, 9).forEach(function (e) {
    NS.add(evPanelBody, evRow(e, function (ev) { go(ev.kind === 'reentry' ? 'reentry' : 'fireball', ev.id); }));
  });
  evPanel = panel('直近の検出イベント', { note:'自動検出 → 多点解析',
    tools:el('button', { class:'iconbtn', text:'カタログ全件 →', onclick:function () { go('fireball'); } }) }, []);
  evPanel.querySelector('.panel-b').classList.add('flush');
  evPanel.querySelector('.panel-b').appendChild(evPanelBody);

  var alerts = NS.alertLog().slice(0, 7);
  var alertPanel = panel('通報・対応ログ', { note:'G-7 社会実装',
    tools:el('button', { class:'iconbtn', text:'すべて →', onclick:function () { go('alerts'); } }) },
    el('ul', { class:'tl' }, alerts.map(function (a) {
      var cls = a.lvl === '通報' || a.lvl === '注意喚起' ? '' : a.lvl === '検出' ? 'i-warn' : a.lvl === '対応' || a.lvl === '判定' ? 'i-ok' : 'i-info';
      return el('li', { class:cls }, [
        el('div', { class:'tt', text:NS.fmtJST(a.t) + ' JST' }),
        el('div', { class:'tx' }, [el('span', { class:'tg', text:a.lvl }), a.text])
      ]);
    })));

  NS.add(root, el('div', { class:'grid g-2-1', style:{ marginTop:'14px' } }, [
    mapPanel, el('div', { class:'grid', style:{ gap:'14px' } }, [evPanel, alertPanel])
  ]));

  /* 局別カード */
  var cards = el('div', { class:'stgrid' }, NS.STATIONS.map(function (st) {
    var s2 = NS.stationState(st, NS.now()), sb = NS.skyBrightness(st, NS.now());
    return el('div', { class:'stcard ' + (s2.status === 'ok' ? '' : s2.status), onclick:function () { go('station', st.id); },
      role:'button', tabindex:'0' }, [
      el('div', { class:'sn' }, [st.name, el('span', { class:'sid', text:st.id })]),
      el('div', { class:'sr', text:st.pref + ' ' + st.city + '　' + (st.kind === 'u' ? '大学' : '付属校') + (st.swir ? ' · SWIR' : '') }),
      el('div', { class:'sv' }, [el('span', { text:s2.obsMode }), el('span', { text:NS.f(s2.uptime, 1) + '%' })]),
      el('div', { class:'sv' }, [
        el('span', { text:'SQM ' + (sb.mag == null ? '—' : NS.f(sb.mag, 2)) }),
        el('span', { text:'雲 ' + Math.round(s2.weather.cloud * 100) + '%' })
      ]),
      NS.bar(s2.uptime / 100, s2.status === 'ok' ? 'ok' : s2.status === 'warn' ? 'warn' : 'crit')
    ]);
  }));
  NS.add(root, el('div', { style:{ marginTop:'14px' } }, panel('観測局の稼働状況（13 局）',
    { note:'全局が同一のフル構成。SWIR 冷却カメラは船橋・湘南・郡山・三島の 4 局',
      tools:el('button', { class:'iconbtn', text:'観測局一覧 →', onclick:function () { go('stations'); } }) }, cards)));
};

/* =========================================================================
   観測局マップ（レイヤ切替）
   ========================================================================= */
NS.V.map = function (root, go, arg) {
  NS.add(root, el('div', { class:'page-h' }, [
    el('h2', { text:'観測局マップ' }),
    el('p', { text:'13 局の配置・視野・観測値を地図上で重ねて見る。視野円は高度 100 km の発光点を各仰角以上で見込める地表範囲を示し、円が重なる領域で多点同時観測（三角測量）が成立する。' })
  ]));
  var state = { layer:'status', elevs:{ 5:false, 10:false, 15:false, 20:false, 30:true, 45:false }, ev:null };
  var M = NS.Map({ onStation:function (st) { go('station', st.id); } });

  var LAYERS = {
    status:{ name:'稼働状態', legend:function () {
      return [el('span', { html:'<i style="background:var(--c-ok)"></i>正常' }), el('span', { html:'<i style="background:var(--c-warn)"></i>一部障害' }),
              el('span', { html:'<i style="background:var(--muted)"></i>停止' })]; } },
    sqm:{ name:'夜空輝度（光害）', legend:function () {
      return [el('span', null, [el('i', { class:'gradbar', style:{ background:'linear-gradient(90deg,#FFF1C9,#F08A3C,#B4562F,#5C4A8C,#2C3A82,#101A44)' } }),
        ' 明 17.5 ← mag/arcsec² → 22.0 暗']), el('span', { class:'hint', text:'昼間・薄明の局は灰色' })]; } },
    wbgt:{ name:'WBGT（熱中症）', legend:function () {
      return [el('span', null, [el('i', { class:'gradbar', style:{ background:'linear-gradient(90deg,#3B7EA1,#4FA07A,#D9B23C,#DE8330,#C43D2E,#8E1B2C)' } }),
        ' 18 ← ℃ → 35']), el('span', { html:'<i style="background:#C43D2E"></i>31℃ 以上＝危険' })]; } },
    cloud:{ name:'雲量', legend:function () {
      return [el('span', null, [el('i', { class:'gradbar', style:{ background:'linear-gradient(90deg,#2F6FA8,#8C97A3,#E8EAED)' } }), ' 快晴 ← → 曇天'])]; } },
    events:{ name:'イベント', legend:function () {
      return [el('span', { html:'<i style="background:var(--accent)"></i>火球の地上軌跡' }),
              el('span', { html:'<i style="background:var(--c-info)"></i>再突入の地上軌跡' }),
              el('span', { html:'<i style="background:var(--c-infra);border-radius:50%"></i>インフラサウンド音源' }),
              el('span', { html:'<i style="background:var(--c-crit);border-radius:50%"></i>隕石落下推定域' })]; } }
  };

  function paint() {
    var t = NS.now();
    M.drawFov(NS.ELEVS.filter(function (e) { return state.elevs[e]; }));
    M.clearOverlay();
    var opt = { state:function (st) { return NS.stationState(st, t); } };
    if (state.layer === 'sqm') {
      opt.halo = function (st) { var sb = NS.skyBrightness(st, t);
        return { r:17, color:sb.mag == null ? 'var(--muted)' : NS.SQM_SCALE(sb.mag), opacity:0.85 }; };
      opt.labelText = function (st) { var sb = NS.skyBrightness(st, t); return st.name + (sb.mag == null ? '' : ' ' + NS.f(sb.mag, 1)); };
    } else if (state.layer === 'wbgt') {
      opt.halo = function (st) { var w = NS.weather(st, t); return { r:17, color:NS.WBGT_SCALE(w.wbgt), opacity:0.85 }; };
      opt.labelText = function (st) { return st.name + ' ' + NS.f(NS.weather(st, t).wbgt, 1) + '℃'; };
    } else if (state.layer === 'cloud') {
      opt.halo = function (st) { var w = NS.weather(st, t); return { r:17, color:NS.CLOUD_SCALE(w.cloud), opacity:0.8 }; };
      opt.labelText = function (st) { return st.name + ' ' + Math.round(NS.weather(st, t).cloud * 100) + '%'; };
    }
    opt.tipExtra = function (st, s2) {
      var sb = NS.skyBrightness(st, t), w = s2.weather;
      return '夜空輝度 ' + (sb.mag == null ? '—' : NS.f(sb.mag, 2) + ' mag/arcsec² · Bortle ' + NS.bortle(sb.mag).n) +
        '<br>WBGT ' + NS.f(w.wbgt, 1) + '℃ · 雲量 ' + Math.round(w.cloud * 100) + '% · 気温 ' + NS.f(w.temp, 1) + '℃' +
        '<br>' + s2.obsMode;
    };
    M.drawStations(opt);

    if (state.layer === 'events') {
      var fb = NS.FLAGSHIP.fireball, re = NS.FLAGSHIP.reentry;
      [[fb, 'var(--accent)'], [re, 'var(--c-info)']].forEach(function (pr) {
        var e = pr[0];
        var p = M.addOverlay(s('path', { d:NS.geoLinePath(e.begin, e.end), stroke:pr[1], 'stroke-width':2.4, fill:'none',
          'stroke-linecap':'round', 'vector-effect':'non-scaling-stroke' }));
        M.tipOn(p, '<b>' + e.name + '</b><span class="mt-s">' + NS.fmtJST(e.t) + ' JST</span><span class="mt-d">' +
          NS.mag(e.absMag) + ' · ' + e.stationsDet + ' 局 · ' + NS.km(e.begin.alt) + ' → ' + NS.km(e.end.alt) + '</span>');
        var a = M.pt(e.begin.lon, e.begin.lat), b = M.pt(e.end.lon, e.end.lat);
        M.addOverlay(s('circle', { cx:a[0], cy:a[1], r:M.px(3.5), fill:'none', stroke:pr[1], 'stroke-width':1.4, 'vector-effect':'non-scaling-stroke' }));
        M.addOverlay(s('circle', { cx:b[0], cy:b[1], r:M.px(4), fill:pr[1] }));
        e.det.forEach(function (d) {
          var st = NS.ST[d.id]; if (!st) return;
          M.addOverlay(s('path', { d:NS.geoLinePath({ lat:st.lat, lon:st.lon }, e.end, 16), stroke:pr[1],
            'stroke-width':0.7, 'stroke-dasharray':'2 3', fill:'none', opacity:0.45, 'vector-effect':'non-scaling-stroke' }));
        });
      });
      /* 落下推定域 */
      var sw = fb.strewn, c = M.pt(sw.lon, sw.lat);
      var kx = Math.abs(M.pt(sw.lon + 0.1, sw.lat)[0] - c[0]) / (0.1 * 111.32 * Math.cos(sw.lat * NS.d2r));
      var ky = Math.abs(M.pt(sw.lon, sw.lat + 0.1)[1] - c[1]) / (0.1 * 111.32);
      var ell = M.addOverlay(s('ellipse', { cx:c[0], cy:c[1], rx:sw.a * kx, ry:sw.b * ky,
        transform:'rotate(' + (90 - sw.az) + ' ' + c[0] + ' ' + c[1] + ')',
        fill:'var(--c-crit)', 'fill-opacity':0.22, stroke:'var(--c-crit)', 'stroke-width':1.3, 'vector-effect':'non-scaling-stroke' }));
      M.tipOn(ell, '<b>隕石落下推定域（暗黒飛行の風補正後）</b><span class="mt-d">長半径 ' + sw.a + ' km / 短半径 ' + sw.b +
        ' km · 最大確率密度 ' + Math.round(sw.pMax * 100) + '%</span><span class="mt-x">千葉県山武市・東金市</span>');
      /* インフラサウンド音源 */
      NS.INFRA.forEach(function (e) {
        if (!e.src) return;
        var p2 = M.pt(e.src.lon, e.src.lat);
        var col = e.kind === 'seismic' ? 'var(--c-warn)' : 'var(--c-infra)';
        var g = M.addOverlay(s('g', null, [
          s('circle', { cx:p2[0], cy:p2[1], r:M.px(10), fill:col, 'fill-opacity':0.2, stroke:col, 'stroke-width':1.1, 'vector-effect':'non-scaling-stroke' }),
          s('circle', { cx:p2[0], cy:p2[1], r:M.px(3.4), fill:col })
        ]));
        M.tipOn(g, '<b>' + e.name + '</b><span class="mt-s">' + e.cls + ' · ' + NS.fmtJST(e.t) + ' JST</span>' +
          '<span class="mt-d">' + e.src.name + ' · ' + e.det.length + ' 局検出' + (e.locErr ? ' · 定位誤差 ±' + e.locErr + ' km' : '') + '</span>');
        e.det.forEach(function (d) {
          var st = NS.ST[d.id]; if (!st) return;
          M.addOverlay(s('path', { d:NS.geoLinePath({ lat:st.lat, lon:st.lon }, e.src, 16), stroke:col,
            'stroke-width':0.8, 'stroke-dasharray':'3 3', fill:'none', opacity:0.4, 'vector-effect':'non-scaling-stroke' }));
        });
      });
    }
    NS.clear(legend);
    NS.add(legend, LAYERS[state.layer].legend());
  }

  var bar = el('div', { class:'mapbar' }, [
    el('span', { class:'lbl', text:'レイヤ' }),
    el('div', { class:'chips' }, Object.keys(LAYERS).map(function (k) {
      var b = el('button', { class:'chip', text:LAYERS[k].name, 'aria-pressed':k === state.layer ? 'true' : 'false',
        onclick:function () {
          state.layer = k;
          Array.prototype.forEach.call(b.parentNode.children, function (x) { x.setAttribute('aria-pressed', 'false'); });
          b.setAttribute('aria-pressed', 'true'); paint();
        } });
      return b;
    })),
    el('div', { class:'spacer' }),
    el('span', { class:'lbl', text:'視野（仰角）' }),
    el('div', { class:'chips' }, NS.ELEVS.map(function (e) {
      var b = el('button', { class:'chip', text:e + '°', 'aria-pressed':state.elevs[e] ? 'true' : 'false',
        title:'地表半径 ' + Math.round(NS.groundRadius(100, e)) + ' km',
        onclick:function () { state.elevs[e] = !state.elevs[e]; b.setAttribute('aria-pressed', state.elevs[e] ? 'true' : 'false'); paint(); } });
      return b;
    })),
    el('div', { class:'seg' }, Object.keys(NS.VIEWS).map(function (k) {
      return el('button', { text:NS.VIEWS[k].name, 'aria-pressed':k === 'all' ? 'true' : 'false', onclick:function (e) {
        M.goto(k, true);
        Array.prototype.forEach.call(e.target.parentNode.children, function (x) { x.setAttribute('aria-pressed', 'false'); });
        e.target.setAttribute('aria-pressed', 'true');
      } });
    }))
  ]);
  var legend = el('div', { class:'maplegend' });
  var refresh = NS.refreshTool(function () { paint(); });
  var p = panel('全国 13 局', { note:'高度 100 km 基準の視野円。更新しても表示範囲とレイヤはそのまま保たれる',
    tools:refresh }, []);
  var body = p.querySelector('.panel-b'); body.classList.add('flush');
  NS.add(body, [bar, M.node, legend]);
  NS.add(root, p);
  paint();

  NS.add(root, el('div', { class:'grid g2', style:{ marginTop:'14px' } }, [
    panel('視野の重なりと多点観測', { note:'高度 100 km の発光点' },
      NS.table(['仰角', '地表半径', '想定される用途'], NS.ELEVS.map(function (e) {
        var r = NS.groundRadius(100, e);
        return [e + '°', NS.f(r, 0) + ' km', e >= 45 ? '高精度の測光・分光' : e >= 30 ? '軌跡決定の標準条件（設計基準）' :
          e >= 15 ? '検出は可能・測位精度は低下' : '大火球のみ・低仰角の減光が大きい'];
      }))),
    panel('観測局の一覧', { note:'座標は概略位置', tools:el('button', { class:'iconbtn', text:'詳細一覧 →', onclick:function () { go('stations'); } }) },
      NS.table(['局', '所在地', '種別', '標高', '設置'], NS.STATIONS.map(function (st) {
        return { attrs:{ class:'clk', onclick:function () { go('station', st.id); } },
          cells:[el('b', { text:st.name }), st.pref + ' ' + st.city, st.kind === 'u' ? '大学キャンパス' : '付属校',
                 { class:'r', html:st.alt + ' m' }, { html:'<span class="sm">' + st.inst + '</span>' }] };
      })))
  ]));
};

/* =========================================================================
   観測局一覧
   ========================================================================= */
NS.V.stations = function (root, go) {
  var t = NS.now();
  NS.add(root, el('div', { class:'page-h' }, [
    el('h2', { text:'観測局と機材構成' }),
    el('p', { text:'全 13 局を同一のフル構成とする。同じ装置・同じ処理で観測することが、発生頻度の統計的推定と学部間の共同作業を成立させる前提になる。' })
  ]));
  NS.add(root, panel('全局共通のフル構成', { note:'機材調査資料 3.1–3.3 に基づく構成（1 局あたり約 300 万円）' },
    el('div', { class:'eqlist' }, NS.EQUIPMENT.map(function (e) {
      return el('div', { class:'eqrow' }, [
        el('span', { class:'ec', text:e.cat }),
        el('div', null, [
          el('div', { class:'en' }, [e.name, e.all ? null : badge('4 局のみ', 'info')]),
          el('div', { class:'ed', text:e.model }),
          el('div', { class:'et', text:e.spec })
        ]),
        el('div', { class:'et', style:{ maxWidth:'19em', textAlign:'right' }, text:e.target })
      ]);
    }))));

  NS.add(root, el('div', { style:{ marginTop:'14px' } }, panel('観測局 一覧（13 局）',
    { note:'局をクリックすると詳細（疑似ライブ映像・機材状態・観測値）を開く' },
    NS.table(['局', 'ID', '所在地', '種別', '設置機関', '座標 / 標高', '状態', '稼働率'],
      NS.STATIONS.map(function (st) {
        var s2 = NS.stationState(st, t);
        return { attrs:{ class:'clk', onclick:function () { go('station', st.id); } }, cells:[
          el('b', { text:st.name }), { class:'mono sm', html:st.id },
          st.pref + ' ' + st.city,
          st.kind === 'u' ? '大学キャンパス拠点' : '付属校拠点',
          { html:'<span class="sm">' + st.host + (st.swir ? ' <b style="color:var(--accent)">＋SWIR</b>' : '') + '</span>' },
          { class:'mono sm', html:NS.f(st.lat, 3) + '°N ' + NS.f(st.lon, 3) + '°E<br>' + st.alt + ' m' },
          badge(s2.status === 'ok' ? '正常' : s2.status === 'warn' ? '一部障害' : '停止', s2.status === 'ok' ? 'ok' : s2.status === 'warn' ? 'warn' : 'crit'),
          { class:'r', html:NS.f(s2.uptime, 2) + '%' }
        ] };
      })))));

  /* 全局の全天カメラ（表示時刻を切り替えられる） */
  var skies = [], def = NS.defaultSkyTime();
  var grid = el('div', { class:'skygrid' }, NS.STATIONS.map(function (st) {
    var A = NS.AllSky(st, { size:260, showConst:false, showGrid:false });
    A.setTime(def.t, def.live);
    skies.push(A);
    var mode = el('span', { class:'hint' });
    A._mode = mode;
    return el('div', { class:'skycard', onclick:function () { go('station', st.id); } }, [
      A.node,
      el('div', { class:'sc-h' }, [el('b', { text:st.name }), mode])
    ]);
  }));
  function applySkyTime(t, live, label) {
    skies.forEach(function (A) {
      A.setTime(t, live);
      var s2 = NS.stationState(A.station, t);
      NS.clear(A._mode);
      NS.add(A._mode, live ? s2.obsMode : label + '（再現）');
    });
    NS.clear(skyNote);
    NS.add(skyNote, live
      ? '現在時刻の空。' + (def.live ? '' : '')
      : '現在は昼間・薄明のため、' + NS.fmtJST(t, { sec:false }) + ' JST の星空を再現して表示している。');
  }
  var skyNote = el('span', { class:'panel-note' });
  var TIMES = [['現在', null], ['今夜 20:00', 20], ['今夜 23:00', 23], ['今夜 02:00', 2], ['今夜 04:00', 4]];
  var seg = el('div', { class:'seg' }, TIMES.map(function (x) {
    var pressed = (x[1] === null) ? def.live : (!def.live && x[0] === def.label);
    return el('button', { text:x[0], 'aria-pressed':pressed ? 'true' : 'false', onclick:function (e) {
      Array.prototype.forEach.call(e.target.parentNode.children, function (c) { c.setAttribute('aria-pressed', 'false'); });
      e.target.setAttribute('aria-pressed', 'true');
      if (x[1] === null) applySkyTime(NS.now(), true, '現在');
      else applySkyTime(NS.tonightAt(x[1]), false, x[0]);
    } });
  }));
  var p2 = panel('全天カメラ（全 13 局）',
    { note:'恒星はエール輝星星表（BSC5）9,096 個、天の川は Tycho-2 の星数密度。雲・流星・人工衛星の軌跡・空の明るさは模擬',
      tools:seg }, [el('div', { style:{ marginBottom:'8px' } }, skyNote), grid]);
  NS.add(root, el('div', { style:{ marginTop:'14px' } }, p2));
  applySkyTime(def.t, def.live, def.label);
  skies.forEach(function (A) { A.start(); });
  NS.onLeave(function () { skies.forEach(function (A) { A.stop(); }); });
};

/* =========================================================================
   観測局 詳細
   ========================================================================= */
NS.V.station = function (root, go, arg) {
  var st = NS.ST[arg] || NS.STATIONS[0];
  var t = NS.now(), s2 = NS.stationState(st, t), sb = NS.skyBrightness(st, t), w = s2.weather;

  NS.add(root, el('div', { class:'page-h' }, [
    el('div', { class:'split' }, [
      el('button', { class:'iconbtn', text:'← 観測局一覧', onclick:function () { go('stations'); } }),
      el('div', { class:'seg' }, NS.STATIONS.map(function (x) {
        return el('button', { text:x.id, title:x.name, 'aria-pressed':x.id === st.id ? 'true' : 'false',
          onclick:function () { go('station', x.id); } });
      }))
    ]),
    el('h2', { text:st.name + '　' + st.en + ' Station', style:{ marginTop:'8px' } }),
    el('p', { html:st.pref + ' ' + st.city + '　' + st.host + '　<span class="mono">' + NS.latlon(st.lat, st.lon) + ' · 標高 ' + st.alt + ' m</span>' })
  ]));

  /* 疑似ライブ + 現況 */
  var A = NS.AllSky(st, { size:460, showNames:true });
  var defT = NS.defaultSkyTime();
  A.setTime(defT.t, defT.live);
  var skyNote2 = el('div', { class:'note' });
  function setSky(t, live, label) {
    A.setTime(t, live);
    NS.clear(skyNote2);
    NS.add(skyNote2, '恒星はエール輝星星表（BSC5）の 9,096 個、星座線は IAU 公式星座図形、天の川は Tycho-2 の星数密度を用い、地方恒星時から地平座標へ変換して描いている（等距離魚眼投影・北が上・東が左）。色は B−V 色指数による。'
      + (live ? '現在時刻の空を表示している。' : '現在は昼間・薄明のため、' + NS.fmtJST(t, { sec:false }) + ' JST の星空を再現して表示している。')
      + '雲・流星・人工衛星の軌跡・空の明るさはデモ用の模擬である。');
  }
  var TSEG = [['現在', null], ['今夜 20:00', 20], ['今夜 23:00', 23], ['今夜 02:00', 2], ['今夜 04:00', 4]];
  var tseg = el('div', { class:'seg' }, TSEG.map(function (x) {
    var pressed = (x[1] === null) ? defT.live : (!defT.live && x[0] === defT.label);
    return el('button', { text:x[0], 'aria-pressed':pressed ? 'true' : 'false', onclick:function (e) {
      Array.prototype.forEach.call(e.target.parentNode.children, function (c) { c.setAttribute('aria-pressed', 'false'); });
      e.target.setAttribute('aria-pressed', 'true');
      if (x[1] === null) setSky(NS.now(), true, '現在'); else setSky(NS.tonightAt(x[1]), false, x[0]);
    } });
  }));
  var skyPanel = panel('全天カメラ', {
    note:'IMX664 全天カメラ ×2 · UFOCaptureIP',
    tools:el('div', { class:'split' }, [
      tseg,
      el('button', { class:'iconbtn', text:'星座線', onclick:function (e) { A.showConst = !A.showConst; e.target.style.opacity = A.showConst ? 1 : 0.5; A._bgKey = null; } }),
      el('button', { class:'iconbtn', text:'星名', onclick:function (e) { A.showNames = !A.showNames; e.target.style.opacity = A.showNames ? 1 : 0.5; A._bgKey = null; } }),
      el('button', { class:'iconbtn', text:'目盛', onclick:function (e) { A.showGrid = !A.showGrid; e.target.style.opacity = A.showGrid ? 1 : 0.5; } }),
      el('button', { class:'iconbtn', text:'早送り ×120', 'data-on':'0', onclick:function (e) {
        var on = e.target.getAttribute('data-on') === '1';
        e.target.setAttribute('data-on', on ? '0' : '1');
        e.target.textContent = on ? '早送り ×120' : '実時間に戻す';
        A.t0 = A.t; A.started = performance.now();
        A.speed = on ? 1 : 120;
      } })
    ])
  }, [A.node, skyNote2]);
  setSky(defT.t, defT.live, defT.label);
  A.start();
  NS.onLeave(function () { A.stop(); });

  var wl = NS.wbgtLevel(w.wbgt), bt = NS.bortle(sb.mag);
  var nowPanel = panel('現在の観測値', { note:NS.fmtJST(t) + ' JST 時点' }, [
    el('div', { class:'split', style:{ marginBottom:'10px' } }, [
      badge(s2.status === 'ok' ? '正常稼働' : s2.status === 'warn' ? '一部障害' : '停止', s2.status === 'ok' ? 'ok' : s2.status === 'warn' ? 'warn' : 'crit'),
      badge(s2.obsMode, 'info'), st.swir ? badge('SWIR 設置局', '') : null,
      el('div', { class:'spacer' }), el('span', { class:'hint', text:'稼働率 ' + NS.f(s2.uptime, 2) + '%' })
    ]),
    NS.kv([
      ['夜空輝度', sb.mag == null ? '<span class="hint">薄明・昼間のため測定なし</span>' :
        '<b>' + NS.f(sb.mag, 2) + '</b> mag/arcsec²　<span class="hint">Bortle ' + bt.n + '（' + bt.label + '）</span>', sb.mag == null ? '' : 'hi'],
      ['雲量', Math.round(w.cloud * 100) + ' %'],
      ['気温 / 湿度', NS.f(w.temp, 1) + ' ℃ / ' + NS.f(w.rh, 0) + ' %'],
      ['気圧', NS.f(w.press, 1) + ' hPa'],
      ['風', NS.f(w.wind, 1) + ' m/s　' + NS.compass(w.dir) + '（' + NS.f(w.dir, 0) + '°）'],
      ['日射', NS.f(w.solar, 3) + ' kW/m²'],
      ['降水', w.rain > 0 ? NS.f(w.rain, 1) + ' mm/h' : 'なし'],
      ['WBGT', '<b style="color:' + wl.color + '">' + NS.f(w.wbgt, 1) + ' ℃</b>　' + wl.label],
      ['太陽高度', NS.f(w.sunAlt, 1) + '°'],
      ['月', '月齢 ' + NS.f(NS.moonPhase(t) * 29.53, 1) + '　輝面比 ' + Math.round(NS.moonIllum(t) * 100) + '%'],
      ['伝送遅延', NS.f(s2.latency, 0) + ' ms'],
      ['一次保存', NS.f(s2.disk, 0) + ' % 使用']
    ], 'wide')
  ]);
  NS.add(root, el('div', { class:'grid g-3-2' }, [skyPanel, nowPanel]));

  /* 24 時間の時系列 */
  var hrs = [], sqmPts = [], tempPts = [], wbgtPts = [], cloudPts = [];
  for (var i = -24 * 4; i <= 0; i++) {
    var tt = t + i * 900e3, hh = i / 4;
    var ww = NS.weather(st, tt), bb = NS.skyBrightness(st, tt);
    hrs.push(hh);
    tempPts.push([hh, ww.temp]); wbgtPts.push([hh, ww.wbgt]); cloudPts.push([hh, ww.cloud * 100]);
    if (bb.mag != null) sqmPts.push([hh, bb.mag]);
  }
  var xf = function (v) { return NS.fmtJST(t + v * 3600e3, { timeOnly:true, sec:false }); };
  NS.add(root, el('div', { class:'grid g2', style:{ marginTop:'14px' } }, [
    panel('夜空輝度の 24 時間推移', { note:'夜間（太陽高度 −12° 以下）のみ測定' },
      sqmPts.length > 3 ? [NS.chart.line({ series:[{ name:'SQM', color:'var(--c-sky)', pts:sqmPts, area:true, dots:0 }],
        width:660, height:180, yLabel:'mag/arcsec²（上ほど暗い）', xFmt:xf, yFmt:function (v) { return NS.f(v, 1); },
        rules:[{ y:21.9, color:'var(--muted)', label:'自然夜空 21.9' }, { y:st.sqm, color:'var(--accent)', label:'この局の平常値 ' + NS.f(st.sqm, 2) }] }),
        el('div', { class:'note', text:'この局の光害量は自然夜空に対して ' + NS.f(21.9 - st.sqm, 2) + ' 等分。雲は都市部では空を明るくし、暗い場所では暗くする。' })]
        : el('div', { class:'hint', text:'現在は昼間・薄明のため夜間データがない。日没後に再表示される。' })),
    panel('気温・WBGT・雲量の 24 時間推移', { note:'複合気象センサー（Vaisala WXT530 系）' }, [
      NS.chart.line({ series:[
        { name:'気温', color:'var(--c-warn)', pts:tempPts },
        { name:'WBGT', color:'var(--c-crit)', pts:wbgtPts, dash:'4 3' },
        { name:'雲量', color:'var(--muted)', pts:cloudPts.map(function (p) { return [p[0], p[1] / 5]; }), opacity:0.55, area:true, areaOpacity:0.10 }
      ], width:660, height:180, xFmt:xf, yLabel:'℃ / 雲量 ÷5 (%)',
        rules:[{ y:28, color:'var(--c-warn)', label:'WBGT 28 厳重警戒' }, { y:31, color:'var(--c-crit)', label:'31 危険' }] }),
      NS.chart.legend([['気温 (℃)', 'var(--c-warn)', 'line'], ['WBGT (℃)', 'var(--c-crit)', 'line'], ['雲量 (%÷5)', 'var(--muted)']])
    ])
  ]));

  /* 機材状態 */
  var eq = NS.eqAt(st);
  NS.add(root, el('div', { class:'grid g-2-1', style:{ marginTop:'14px' } }, [
    panel('搭載機材と稼働状態', { note:eq.length + ' 系統' },
      NS.table(['系統', '機材', '型式・仕様', '状態'], eq.map(function (e) {
        var sub = s2.sub.filter(function (x) { return x.key === e.key; })[0];
        return [{ class:'sm', html:e.cat }, el('b', { text:e.name }),
          { class:'sm', html:e.model + '<br><span class="hint">' + e.spec + '</span>' },
          sub && sub.ok ? badge('正常', 'ok') : badge(sub ? sub.note : '不明', 'warn')];
      }))),
    panel('この局の観測実績（デモ）', { note:'設置 ' + st.inst + ' 以降' }, [
      NS.kv([
        ['累積 流星検出', '<b>' + (12480 + NS.hash(st.id) % 6000).toLocaleString() + '</b> 個'],
        ['火球（0 等より明るい）', (68 + NS.hash(st.id + 'f') % 40) + ' 件'],
        ['多点同時観測に寄与', (41 + NS.hash(st.id + 'm') % 26) + ' 件'],
        ['インフラサウンド事象', (1240 + NS.hash(st.id + 'i') % 900).toLocaleString() + ' 件'],
        ['再突入の光学捕捉', (2 + NS.hash(st.id + 'r') % 5) + ' 件'],
        ['分光取得', (9 + NS.hash(st.id + 's') % 14) + ' 件'],
        ['生徒による検証件数', (320 + NS.hash(st.id + 'k') % 500).toLocaleString() + ' 件']
      ], 'wide'),
      el('div', { class:'note', text:'付属校拠点では、生徒が自動検出の誤検出（雲・虫・飛行機・人工衛星）を目視で検証する作業を探究学習として組み込む（G-8 / DT-7）。' })
    ])
  ]));

  /* この局が関わった主なイベント */
  var rel = NS.EVENTS.filter(function (e) {
    return (e.det && e.det.some(function (d) { return d.id === st.id; })) || (e.stationIds && e.stationIds.indexOf(st.id) >= 0);
  }).slice(0, 8);
  NS.add(root, el('div', { style:{ marginTop:'14px' } }, panel('この局が検出した主なイベント', null,
    rel.length ? NS.table(['日時 (JST)', 'イベント', '種別', '絶対等級', '同時観測'],
      rel.map(function (e) {
        return { attrs:{ class:'clk', onclick:function () { go(e.kind === 'reentry' ? 'reentry' : 'fireball', e.id); } },
          cells:[{ class:'mono sm', html:NS.fmtJST(e.t) }, e.name, e.kind === 'fireball' ? '火球' : e.kind === 'reentry' ? '再突入' : '流星',
                 { class:'r', html:NS.mag(e.absMag) }, { class:'r', html:e.stationsDet + ' 局' }] };
      })) : el('div', { class:'hint', text:'該当なし' }))));
};

})(NS);
