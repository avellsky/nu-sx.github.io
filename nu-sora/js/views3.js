/* NU-SORA デモ / 画面：気象・熱中症、夜空の明るさ、通報、データ公開、デモについて */
'use strict';
(function (NS) {
var el = NS.el, s = NS.s, panel = NS.panel, badge = NS.badge, kpi = NS.kpi;

/* =========================================================================
   気象・熱中症（G-6 / DT-3・DT-6）
   ========================================================================= */
NS.V.weather = function (root, go, arg) {
  var t = NS.now();
  var rows = NS.STATIONS.map(function (st) { return { st:st, w:NS.weather(st, t) }; });
  rows.sort(function (a, b) { return b.w.wbgt - a.w.wbgt; });
  var maxW = rows[0], nDanger = rows.filter(function (r) { return r.w.wbgt >= 31; }).length;
  var nStrict = rows.filter(function (r) { return r.w.wbgt >= 28; }).length;
  var rain = rows.filter(function (r) { return r.w.rain > 0.5; });

  NS.add(root, el('div', { class:'page-h' }, [
    el('h2', { text:'気象・熱中症環境　学校微気候ツイン' }),
    el('p', { text:'各局の複合気象センサーから WBGT（暑さ指数）を算出し、屋上 1 点の観測を校庭・体育館へダウンスケーリングして部活動の判断を支援する。線状降水帯は、雨量計だけでなくインフラサウンドによる雷放電の方位交会と 2 周波 GNSS の可降水量を組み合わせて早期に検知する（サブテーマ G-6 / G-4 / DT-3・DT-4）。' })
  ]));

  NS.add(root, el('div', { class:'grid g4' }, [
    kpi('最高 WBGT', NS.f(maxW.w.wbgt, 1), '℃', maxW.st.name + ' · ' + NS.wbgtLevel(maxW.w.wbgt).label, { acc:true, icon:'🌡' }),
    kpi('厳重警戒以上', nStrict, '/ 13 局', 'うち危険（31℃ 以上）' + nDanger + ' 局'),
    kpi('降水中', rain.length, '/ 13 局', rain.length ? rain.map(function (r) { return r.st.name; }).join('・') : 'なし'),
    kpi('観測項目', 6, '種', '気温・湿度・気圧・風向風速・雨量・日射（Vaisala WXT530 系）')
  ]));

  /* 地図 + ランキング */
  var M = NS.Map({ onStation:function (st) { go('station', st.id); } });
  M.drawStations({ state:function (st) { return NS.stationState(st, t); },
    halo:function (st) { return { r:19, color:NS.WBGT_SCALE(NS.weather(st, t).wbgt), opacity:0.9 }; },
    labelText:function (st) { return st.name + ' ' + NS.f(NS.weather(st, t).wbgt, 1) + '℃'; },
    tipExtra:function (st) {
      var w = NS.weather(st, t), l = NS.wbgtLevel(w.wbgt);
      return 'WBGT <b>' + NS.f(w.wbgt, 1) + '℃</b>（' + l.label + '）<br>気温 ' + NS.f(w.temp, 1) + '℃ / 湿度 ' + NS.f(w.rh, 0) +
        '% / 風 ' + NS.f(w.wind, 1) + ' m/s<br>日射 ' + NS.f(w.solar, 3) + ' kW/m² · 雲量 ' + Math.round(w.cloud * 100) + '%<br>' + l.advice;
    } });
  var mp = panel('全国 WBGT 分布', { note:'Ono & Tonouchi (2014) の屋外 WBGT 推定式による算出' }, []);
  var mb = mp.querySelector('.panel-b'); mb.classList.add('flush'); mb.appendChild(M.node);
  NS.add(mb, el('div', { class:'maplegend' }, [
    el('span', null, [el('i', { class:'gradbar', style:{ background:'linear-gradient(90deg,#3B7EA1,#4FA07A,#D9B23C,#DE8330,#C43D2E,#8E1B2C)' } }), ' 18 ← WBGT ℃ → 35']),
    el('span', { html:'21 注意 · 25 警戒 · 28 厳重警戒 · <b>31 以上 危険（運動は原則中止）</b>' })
  ]));

  var rank = panel('局別の現況（WBGT 降順）', { note:NS.fmtJST(t) + ' JST' },
    NS.table(['局', 'WBGT', '区分', '気温', '湿度', '風', '日射', '雲量'], rows.map(function (r) {
      var l = NS.wbgtLevel(r.w.wbgt);
      return { attrs:{ class:'clk', onclick:function () { go('station', r.st.id); } }, cells:[
        el('b', { text:r.st.name }),
        { class:'r', html:'<b style="color:' + l.color + '">' + NS.f(r.w.wbgt, 1) + '</b>' },
        badge(l.label, l.n >= 4 ? 'crit' : l.n === 3 ? 'warn' : l.n === 2 ? '' : 'ok'),
        { class:'r', html:NS.f(r.w.temp, 1) + '℃' }, { class:'r', html:NS.f(r.w.rh, 0) + '%' },
        { class:'r', html:NS.f(r.w.wind, 1) }, { class:'r', html:NS.f(r.w.solar, 2) },
        { class:'r', html:Math.round(r.w.cloud * 100) + '%' }
      ] };
    })));
  NS.add(root, el('div', { class:'grid g-3-2', style:{ marginTop:'14px' } }, [mp, rank]));

  /* 校庭ダウンスケーリング */
  NS.add(root, el('div', { class:'grid g-2-1', style:{ marginTop:'14px' } }, [
    panel('校庭内の WBGT 分布（屋上 1 点からのダウンスケーリング）',
      { note:maxW.st.name + ' · 校舎 3D モデルによる日影と地表面被覆を考慮（DT-3）' }, [
      schoolYard(maxW.st, maxW.w),
      el('div', { class:'note', text:'屋上に置いた 1 台の気象センサーの値を、校舎の日影・地表面（土／人工芝／アスファルト）・風の遮蔽から校庭の各地点へ配分する。同一校庭内で WBGT が 3〜4℃ 違うことがあり、屋上値だけでは部活動の可否を判断できない。' })
    ]),
    panel('活動の判断支援', { note:'スポーツ科学部・医学部の指針（G-6）' }, [
      NS.table(['WBGT', '区分', '対応'], [
        ['31 ℃ 以上', badge('危険', 'crit'), '屋外での運動を原則中止。屋内も空調のない場所は中止'],
        ['28 – 31 ℃', badge('厳重警戒', 'warn'), '激しい運動は中止。10–20 分ごとに休憩と給水'],
        ['25 – 28 ℃', badge('警戒', ''), '積極的に休息。運動の合間に必ず給水'],
        ['21 – 25 ℃', badge('注意', 'ok'), '死亡事故の発生あり。水分補給を'],
        ['21 ℃ 未満', badge('ほぼ安全', 'ok'), '通常の水分補給を']
      ]),
      el('div', { class:'note', text:'各付属校の顧問端末へ 10 分ごとに自校の値と校庭内分布を配信し、判断の記録を残す。全国 13 校の同一仕様データにより、地域差・時間帯差の統計解析が可能になる。' })
    ])
  ]));

  /* 24h 推移 */
  var series = NS.STATIONS.map(function (st, i) {
    var pts = [];
    for (var h = -24; h <= 0; h += 0.5) pts.push([h, NS.weather(st, t + h * 3600e3).wbgt]);
    return { name:st.name, color:i < 6 ? ['var(--accent)','var(--c-info)','var(--c-ok)','var(--c-warn)','var(--c-sky)','var(--c-spec)'][i] : 'var(--muted)',
      pts:pts, width:i < 6 ? 1.5 : 0.8, opacity:i < 6 ? 1 : 0.4 };
  });
  NS.add(root, el('div', { class:'grid g2', style:{ marginTop:'14px' } }, [
    panel('WBGT の 24 時間推移（全 13 局）', { note:'太線は大学キャンパス拠点 6 局' }, [
      NS.chart.line({ series:series, width:660, height:230, xLabel:'現在からの時間', yLabel:'WBGT ℃',
        xFmt:function (v) { return NS.f(v, 0) + 'h'; }, yFmt:function (v) { return NS.f(v, 0); },
        rules:[{ y:28, color:'var(--c-warn)', label:'28 厳重警戒' }, { y:31, color:'var(--c-crit)', label:'31 危険' }, { y:25, color:'var(--c-cau)', label:'25 警戒' }] }),
      NS.chart.legend(series.slice(0, 6).map(function (x) { return [x.name, x.color, 'line']; }))
    ]),
    panel('降水と雷（線状降水帯の監視）', { note:'気象センサーの雨量とインフラサウンドの雷検知を統合' }, [
      NS.chart.bars({ bars:rows.map(function (r) {
        return { y:r.w.rain, label:r.st.id, color:r.w.rain > 20 ? 'var(--c-crit)' : r.w.rain > 5 ? 'var(--c-warn)' : 'var(--c-info)',
          title:r.st.name + ' ' + NS.f(r.w.rain, 1) + ' mm/h', top:r.w.rain > 0.5 ? NS.f(r.w.rain, 0) : '' };
      }), width:660, height:170, yLabel:'mm/h', yMax:Math.max(12, Math.max.apply(null, rows.map(function (r) { return r.w.rain; })) * 1.15) }),
      NS.kv([
        ['直近 24 時間の落雷検知', '<b>1,842</b> 回（インフラサウンド・関東南部）'],
        ['降水帯の移動', '34 km/h · 方位 072°'],
        ['学校への注意喚起', '検知から 4 分で 5 校へ発報（G-7 の試行）'],
        ['連携', '気象庁レーダーとの突き合わせで検知の妥当性を検証']
      ], 'wide'),
      el('div', { class:'split', style:{ marginTop:'8px' } }, [
        el('button', { class:'iconbtn', text:'↓ 線状降水帯の統合検知事例へ', onclick:function () {
          var t = document.getElementById('rainband'); if (t) t.scrollIntoView({ behavior:'smooth', block:'start' }); } }),
        el('button', { class:'iconbtn', text:'雷の検出事例を見る →', onclick:function () { go('infra', 'NUS-IS-T-0118'); } })
      ])
    ])
  ]));

  NS.add(root, el('div', { id:'rainband' }, NS.rainbandSection(go)));

  NS.add(root, el('div', { style:{ marginTop:'14px' } }, panel('気象データの他分野への利用', null,
    NS.table(['用途', '使うデータ', '担当学部', '対応テーマ'], [
      ['暗黒飛行の風補正（隕石落下域）', '各局の風向風速・気温プロファイル', '理工学部（航空宇宙）', 'G-1 / DT-1'],
      ['熱中症環境の校内マップ', '気温・湿度・風・日射（WBGT）', 'スポーツ科学部・医学部', 'G-6 / DT-3'],
      ['農業・生態系への影響', '高密度の気温・降水・日射', '生物資源科学部', 'DT-3'],
      ['太陽光発電量と星空予報', '日射・雲量・全天画像', '理工学部・文理学部', 'DT-2'],
      ['線状降水帯の早期検知', 'インフラサウンド（雷放電の方位交会）＋ GNSS 可降水量 ＋ 雨量・気圧', '理工学部（精密機械・航空宇宙）・文理学部（地球科学）・危機管理学部', 'G-4・G-6 / DT-4'],
      ['成層圏風の逆推定', 'インフラサウンド到達時刻 ＋ 地上気象', '理工学部・文理学部（地球科学）', 'G-4 / DT-4'],
      ['校舎の使用可否判定', '微動計 ＋ 気温（剛性の温度依存の補正）', '工学部・理工学部（建築）', 'G-6 / DT-6']
    ]))));
};

/* 校庭 WBGT 分布の簡易可視化 */
function schoolYard(st, w) {
  var NX = 26, NY = 15, CW = 24, CH = 22, PAD = 30;
  var g = s('svg', { viewBox:'0 0 ' + (NX * CW + PAD * 2) + ' ' + (NY * CH + PAD * 2 + 18), class:'chart' });
  var sunAz = 180 + (w.sunAlt > 0 ? ((NS.jstParts(NS.now()).h - 12) * 15) : 40);
  var shadeLen = w.sunAlt > 3 ? Math.min(11, 5 / Math.tan(Math.max(6, w.sunAlt) * NS.d2r)) : 11;
  var r = NS.rng(st.id + '|yard');
  var vals = [];
  for (var y = 0; y < NY; y++) {
    for (var x = 0; x < NX; x++) {
      /* 校舎（左上のブロック）と体育館（右下） */
      var inBld = (x < 7 && y < 4) || (x > 20 && y > 11);
      var shaded = (x < 7 + shadeLen && x >= 7 && y < 4 + shadeLen * 0.35) || inBld;
      /* 地表面：中央は土のグラウンド、周囲はアスファルト、左下は樹木 */
      var tree = (x < 5 && y > 11);
      var surf = tree ? -2.4 : (x > 3 && x < 23 && y > 3 && y < 12) ? 0.4 : 1.1;
      var v = w.wbgt + surf + (shaded ? -2.2 : 0.9) - (tree ? 0.6 : 0) + r.norm(0, 0.22)
        - (x === 0 || y === 0 || x === NX - 1 || y === NY - 1 ? 0.3 : 0);
      vals.push({ x:x, y:y, v:v, bld:inBld, tree:tree, shaded:shaded && !inBld });
    }
  }
  vals.forEach(function (c) {
    var X = PAD + c.x * CW, Y = PAD + c.y * CH;
    NS.add(g, s('rect', { x:X, y:Y, width:CW, height:CH, fill:c.bld ? 'var(--rule2)' : NS.WBGT_SCALE(c.v),
      opacity:c.bld ? 1 : 0.92, stroke:'none' }, s('title', { text:c.bld ? '建物' : 'WBGT ' + NS.f(c.v, 1) + '℃' + (c.shaded ? '（日影）' : '') + (c.tree ? '（樹木）' : '') })));
  });
  /* 注記 */
  var lab = function (x, y, tx, anchor) {
    NS.add(g, s('text', { x:PAD + x * CW, y:PAD + y * CH, class:'axl', fill:'var(--ink)', 'text-anchor':anchor || 'start',
      'paint-order':'stroke', stroke:'var(--panel)', 'stroke-width':2.6, text:tx }));
  };
  lab(0.3, 2.4, '校舎');
  lab(21.3, 13.4, '体育館');
  lab(11, 8.2, 'グラウンド（土）', 'middle');
  lab(0.3, 13.6, '樹木');
  NS.add(g, s('text', { x:PAD, y:NY * CH + PAD + 14, class:'axl', text:'← 約 130 m →' }));
  NS.add(g, s('text', { x:NX * CW + PAD, y:NY * CH + PAD + 14, class:'axl', 'text-anchor':'end',
    text:'屋上センサー値 ' + NS.f(w.wbgt, 1) + '℃ / 校庭内 ' +
      NS.f(Math.min.apply(null, vals.filter(function (c) { return !c.bld; }).map(function (c) { return c.v; })), 1) + '–' +
      NS.f(Math.max.apply(null, vals.map(function (c) { return c.v; })), 1) + '℃' }));
  return g;
}

/* =========================================================================
   夜空の明るさ（G-3 / DT-2）
   ========================================================================= */
NS.V.skyglow = function (root, go, arg) {
  var t = NS.now();
  var rows = NS.STATIONS.map(function (st) { return { st:st, sb:NS.skyBrightness(st, t) }; });
  var meas = rows.filter(function (r) { return r.sb.mag != null; });
  var sorted = NS.STATIONS.slice().sort(function (a, b) { return b.sqm - a.sqm; });

  NS.add(root, el('div', { class:'page-h' }, [
    el('h2', { text:'夜空の明るさ　全国輝度マップと寄与分離' }),
    el('p', { text:'全 13 局に夜空輝度計（Unihedron SQM-LU-DL、視野 FWHM 約 20°）を天頂向きに設置し、全天カメラの恒星測光と相互較正する。人工光（光害）・月・雲・衛星コンステレーションの寄与を分離し、経年変化を測る（サブテーマ G-3 / DT-2）。' })
  ]));

  NS.add(root, el('div', { class:'grid g4' }, [
    kpi('最も暗い局', NS.f(sorted[0].sqm, 2), 'mag/arcsec²', sorted[0].name + ' · Bortle ' + NS.bortle(sorted[0].sqm).n, { acc:true, icon:'✦' }),
    kpi('最も明るい局', NS.f(sorted[sorted.length - 1].sqm, 2), 'mag/arcsec²', sorted[sorted.length - 1].name + ' · Bortle ' + NS.bortle(sorted[sorted.length - 1].sqm).n),
    kpi('局間の差', NS.f(sorted[0].sqm - sorted[sorted.length - 1].sqm, 2), '等', '明るさで約 ' + NS.f(Math.pow(10, 0.4 * (sorted[0].sqm - sorted[sorted.length - 1].sqm)), 0) + ' 倍'),
    kpi('夜間測定中', meas.length, '/ 13 局', meas.length ? '平均 ' + NS.f(meas.reduce(function (a, b) { return a + b.sb.mag; }, 0) / meas.length, 2) + ' mag/arcsec²' : '全局が薄明・昼間')
  ]));

  /* 地図 */
  var M = NS.Map({ onStation:function (st) { go('station', st.id); } });
  M.drawStations({ state:function (st) { return NS.stationState(st, t); },
    halo:function (st) { var sb = NS.skyBrightness(st, t);
      return { r:19, color:NS.SQM_SCALE(sb.mag == null ? st.sqm : sb.mag), opacity:sb.mag == null ? 0.42 : 0.92 }; },
    labelText:function (st) { var sb = NS.skyBrightness(st, t); return st.name + ' ' + NS.f(sb.mag == null ? st.sqm : sb.mag, 2) + (sb.mag == null ? '*' : ''); },
    tipExtra:function (st) {
      var sb = NS.skyBrightness(st, t);
      if (sb.mag == null) return '薄明・昼間のため測定なし<br>平常値 ' + NS.f(st.sqm, 2) + ' mag/arcsec²';
      var b = NS.bortle(sb.mag);
      return '<b>' + NS.f(sb.mag, 2) + ' mag/arcsec²</b>（Bortle ' + b.n + '：' + b.label + '）<br>' +
        '平常値 ' + NS.f(st.sqm, 2) + ' / 光害量 ' + NS.f(sb.lp, 2) + ' 等<br>' +
        '雲の寄与 ' + NS.f(sb.cloudEffect, 2) + ' 等 · 月の寄与 ' + NS.f(sb.moonEffect, 2) + ' 等';
    } });
  var mp = panel('全国 夜空輝度マップ', { note:'夜間の局は現在値、昼間・薄明の局は平常値（* 印・淡く表示）' }, []);
  var mb = mp.querySelector('.panel-b'); mb.classList.add('flush'); mb.appendChild(M.node);
  NS.add(mb, el('div', { class:'maplegend' }, [
    el('span', null, [el('i', { class:'gradbar', style:{ background:'linear-gradient(90deg,#FFF1C9,#F08A3C,#B4562F,#5C4A8C,#2C3A82,#101A44)' } }),
      ' 明 17.5 ← mag/arcsec² → 22.0 暗']),
    el('span', { html:'自然な暗夜は 21.9 mag/arcsec²。数値が小さいほど空が明るい' })
  ]));

  var rank = panel('局別の平常値（暗い順）', { note:'Bortle スケールは Bortle (2001) による区分' },
    NS.table(['局', '平常値', 'Bortle', '空の状態', '現在値', '光害量'], sorted.map(function (st) {
      var b = NS.bortle(st.sqm), sb = NS.skyBrightness(st, t);
      return { attrs:{ class:'clk', onclick:function () { go('station', st.id); } }, cells:[
        el('b', { text:st.name }),
        { class:'r', html:'<b>' + NS.f(st.sqm, 2) + '</b>' },
        { class:'c', html:String(b.n) }, { class:'sm', html:b.label },
        { class:'r', html:sb.mag == null ? '<span class="hint">薄明</span>' : NS.f(sb.mag, 2) },
        { class:'r', html:NS.f(21.9 - st.sqm, 2) + ' 等' }
      ] };
    })));
  NS.add(root, el('div', { class:'grid g-3-2', style:{ marginTop:'14px' } }, [mp, rank]));

  /* 一晩の推移 + 寄与分離 */
  var night = [];
  for (var h = -14; h <= 0; h += 0.25) night.push(h);
  var nSeries = [NS.ST.NGN, NS.ST.YMG, NS.ST.FNB, NS.ST.SRG].map(function (st, i) {
    var pts = [];
    night.forEach(function (h) { var b = NS.skyBrightness(st, t + h * 3600e3); if (b.mag != null) pts.push([h, b.mag]); });
    return { name:st.name, color:['var(--c-sky)','var(--c-info)','var(--c-ok)','var(--accent)'][i], pts:pts, width:1.6 };
  }).filter(function (x) { return x.pts.length > 3; });

  /* 寄与分離（明るさの加算量を等級差から算出） */
  var stFocus = NS.ST.FNB;
  var xs = [], comp = { lp:[], moon:[], cloud:[], sat:[] };
  night.forEach(function (h) {
    var b = NS.skyBrightness(stFocus, t + h * 3600e3);
    if (b.mag == null) return;
    xs.push(h);
    comp.lp.push(Math.max(0, b.lp));
    comp.moon.push(Math.max(0, -b.moonEffect));
    comp.cloud.push(Math.max(0, -b.cloudEffect));
    comp.sat.push(Math.max(0, -b.satEffect) * 40);   /* 見やすさのため 40 倍に拡大 */
  });

  NS.add(root, el('div', { class:'grid g2', style:{ marginTop:'14px' } }, [
    panel('一晩の夜空輝度の推移', { note:'暗い局（長野・山形）と明るい局（船橋・駿河台）の比較' },
      nSeries.length ? [
        NS.chart.line({ series:nSeries, width:660, height:230, xLabel:'現在からの時間', yLabel:'mag/arcsec²（上ほど暗い）',
          xFmt:function (v) { return NS.f(v, 0) + 'h'; }, yFmt:function (v) { return NS.f(v, 1); },
          rules:[{ y:21.9, color:'var(--muted)', label:'自然夜空 21.9' }] }),
        NS.chart.legend(nSeries.map(function (x) { return [x.name, x.color, 'line']; })),
        el('div', { class:'note', text:'暗い局では雲が空を暗くし、明るい局では都市光を反射して空を明るくする（符号が逆転する）。この差を使えば、雲量の独立推定にも使える。' })
      ] : el('div', { class:'hint', text:'現在は昼間・薄明のため夜間データがない。日没後に再表示される。' })),
    panel('明るさの寄与分離（' + stFocus.name + '）', { note:'自然夜空を基準とした超過分（等級）。衛星の寄与は 40 倍に拡大して表示' },
      xs.length > 3 ? [
        NS.chart.stack({ x:xs, series:[
          { name:'人工光（光害）', color:'#E08A3C', v:comp.lp },
          { name:'月', color:'#C8CBD2', v:comp.moon },
          { name:'雲による都市光の反射', color:'#8C97A3', v:comp.cloud },
          { name:'衛星コンステレーション（×40）', color:'#7C6FD0', v:comp.sat }
        ], width:660, height:230, yLabel:'超過等級', xFmt:function (v) { return NS.f(v, 0) + 'h'; }, yFmt:function (v) { return NS.f(v, 1); } }),
        NS.chart.legend([['人工光（光害）', '#E08A3C'], ['月', '#C8CBD2'], ['雲の反射', '#8C97A3'], ['衛星（×40）', '#7C6FD0']]),
        el('div', { class:'note', text:'軌道上の衛星・デブリによる散乱光は天頂の夜空輝度を自然値より約 1 % 高めうると推定されている（Kocifaj et al. 2021, MNRAS Letters）。1 % は 0.011 等に相当し、光害の数等という寄与に比べて小さいため、全国 13 点・長期の均質観測で月・雲・人工光を差し引いて初めて分離できる。' })
      ] : el('div', { class:'hint', text:'夜間データの蓄積待ち。' }))
  ]));

  /* 経年トレンド */
  var years = [], tr = { NGN:[], FNB:[], SRG:[], MYZ:[] };
  for (var y = 0; y <= 60; y++) {
    var yr = 2028 + y / 12;
    years.push(yr);
    Object.keys(tr).forEach(function (k) {
      var st = NS.ST[k], r = NS.rng(k + 'trend' + y);
      var slope = k === 'SRG' ? -0.021 : k === 'FNB' ? -0.016 : k === 'MYZ' ? -0.009 : -0.004;  /* 等/年の明化 */
      tr[k].push([yr, st.sqm + slope * (y / 12) + 0.09 * Math.sin(2 * Math.PI * y / 12) + r.norm(0, 0.035)]);
    });
  }
  NS.add(root, el('div', { class:'grid g-2-1', style:{ marginTop:'14px' } }, [
    panel('夜空輝度の経年トレンド（5 年分・デモ）', { note:'月・雲の寄与を除いた月平均値。負の傾きは空が明るくなっていることを示す' }, [
      NS.chart.line({ series:Object.keys(tr).map(function (k, i) {
        return { name:NS.ST[k].name, color:['var(--c-sky)','var(--c-ok)','var(--accent)','var(--c-warn)'][i], pts:tr[k], width:1.4 };
      }), width:900, height:230, xLabel:'年', yLabel:'mag/arcsec²', xFmt:function (v) { return NS.f(v, 0); }, yFmt:function (v) { return NS.f(v, 1); } }),
      NS.chart.legend(Object.keys(tr).map(function (k, i) { return [NS.ST[k].name, ['var(--c-sky)','var(--c-ok)','var(--accent)','var(--c-warn)'][i], 'line']; })),
      el('div', { class:'note', text:'都心局（駿河台）で −0.021 等/年、内陸暗夜（長野）で −0.004 等/年。都市部の LED 化・再開発と、衛星コンステレーションの増加という二つの要因を、地域差から分離することを目指す。' })
    ]),
    panel('Bortle スケール', { note:'夜空の暗さの標準的な区分' },
      NS.table(['等級', 'mag/arcsec²', '空の状態', '該当局'], [
        ['1', '≥ 21.99', '極めて暗い空', '—'],
        ['2', '21.89 – 21.99', '典型的な暗い空', '—'],
        ['3', '21.69 – 21.89', '田舎の空', '—'],
        ['4', '21.25 – 21.69', '田舎と郊外の遷移', NS.STATIONS.filter(function (x) { return NS.bortle(x.sqm).n === 4; }).map(function (x) { return x.name; }).join('・') || '—'],
        ['5', '20.49 – 21.25', '郊外の空', NS.STATIONS.filter(function (x) { return NS.bortle(x.sqm).n === 5; }).map(function (x) { return x.name; }).join('・') || '—'],
        ['6', '19.50 – 20.49', '明るい郊外', NS.STATIONS.filter(function (x) { return NS.bortle(x.sqm).n === 6; }).map(function (x) { return x.name; }).join('・') || '—'],
        ['7', '18.94 – 19.50', '郊外と都市の遷移', NS.STATIONS.filter(function (x) { return NS.bortle(x.sqm).n === 7; }).map(function (x) { return x.name; }).join('・') || '—'],
        ['8', '18.38 – 18.94', '都市の空', NS.STATIONS.filter(function (x) { return NS.bortle(x.sqm).n === 8; }).map(function (x) { return x.name; }).join('・') || '—'],
        ['9', '< 18.38', '市街中心部', NS.STATIONS.filter(function (x) { return NS.bortle(x.sqm).n === 9; }).map(function (x) { return x.name; }).join('・') || '—']
      ]))
  ]));

  NS.add(root, el('div', { style:{ marginTop:'14px' } }, panel('夜空輝度データの用途', null,
    NS.table(['用途', '内容', '担当'], [
      ['光害の全国マップ', '13 点の均質・連続測定による経年変化。自治体の照明政策への基礎資料', '理工学部・文理学部（地理）'],
      ['衛星コンステレーションの影響', '月・雲・人工光を差し引いた残差から軌道上散乱光の寄与を抽出', '理工学部（航空宇宙）'],
      ['流星検出効率の品質管理', '夜空輝度と限界等級から各局の検出効率を較正し、発生頻度の推定に反映', '理工学部（G-1 と共用）'],
      ['星空観光・星空予報', '雲量・輝度・月齢から「星が見える度」を予報し、地域へ発信', '国際関係学部・芸術学部'],
      ['生態系への影響', '夜間光と昆虫・鳥類・農作物への影響評価', '生物資源科学部'],
      ['教育・探究学習', '生徒が自校の空の明るさを測り、全国と比べる', '付属校・文理学部（教育）']
    ]))));
};

/* =========================================================================
   通報・アラート（G-7）
   ========================================================================= */
NS.V.alerts = function (root, go, arg) {
  var log = NS.alertLog();
  NS.add(root, el('div', { class:'page-h' }, [
    el('h2', { text:'通報と社会実装' }),
    el('p', { text:'観測を「情報」で終わらせず「行動」に変える。落下域確率地図と警報を自治体・教育委員会・学校へ届け、対応訓練と法的・保険上の論点整理まで一体で進める（サブテーマ G-7 / PF-3）。' })
  ]));

  NS.add(root, panel('通報ワークフロー', { note:'検出から自治体配信まで、房総沖大火球の実績で 3 分 42 秒' }, [workflow(), el('div', { class:'note',
    text:'エッジ計算機での自動検出（深層学習）→ 全局データの突き合わせ → 多点三角測量 → 暗黒飛行の風補正 → 落下域確率地図の生成 → 自治体・教育委員会への自動配信、までを人手を介さずに実行する。人による確認は配信後の追認と、回収調査の判断に用いる。' })]));

  NS.add(root, el('div', { class:'grid g-2-1', style:{ marginTop:'14px' } }, [
    panel('通報・対応ログ（全件）', { note:log.length + ' 件' },
      el('ul', { class:'tl' }, log.map(function (a) {
        var cls = a.lvl === '通報' || a.lvl === '注意喚起' ? '' : a.lvl === '検出' ? 'i-warn' : (a.lvl === '対応' || a.lvl === '判定') ? 'i-ok' : 'i-info';
        var ev = NS.EVMAP[a.ev];
        return el('li', { class:cls }, [
          el('div', { class:'tt', text:NS.fmtJST(a.t) + ' JST' }),
          el('div', { class:'tx' }, [el('span', { class:'tg', text:a.lvl }), a.text]),
          (ev || a.ev === 'NUS-LR-2028-0908-01') ? el('button', { class:'iconbtn', style:{ marginTop:'3px', padding:'2px 8px', fontSize:'10.5px' },
            text:(ev ? ev.name : NS.rainband().name) + ' →', onclick:function () {
              if (!ev) { go('weather'); setTimeout(function () {
                var t2 = document.getElementById('rainband'); if (t2) t2.scrollIntoView({ block:'start' }); }, 60); return; }
              go(ev.kind === 'reentry' ? 'reentry' : (ev.kind === 'infrasound' || ev.kind === 'seismic') ? 'infra' : 'fireball', ev.id);
            } }) : null
        ]);
      }))),
    el('div', { class:'grid', style:{ gap:'14px' } }, [
      panel('警戒レベルの定義', { note:'危機管理学部と共同で設計' },
        NS.table(['レベル', '発報の条件', '受け手と行動'], [
          [el('span', { class:'lvl 平常', text:'平常' }), '通常の観測（流星・気象・輝度）', '公開ポータルでの表示のみ'],
          [el('span', { class:'lvl 注意', text:'注意' }), '−8 等より明るい火球、または残存質量 0.1 kg 以上の推定', '該当自治体・教育委員会へ落下域確率地図を配信'],
          [el('span', { class:'lvl 警戒', text:'警戒' }), '残存質量 10 kg 以上、または人口密集域に落下域が重なる', '自治体防災担当へ電話連絡、学校へ屋内退避の連絡'],
          [el('span', { class:'lvl 重大', text:'重大' }), '被害の可能性がある落下、制御外再突入の破片落下', '自治体・消防・警察・JAXA へ同時通報、記者発表']
        ])),
      panel('連携先（想定）', { note:'申請前に内諾を得る' }, [
        el('div', { class:'chips' }, ['千葉県山武市 防災課', '千葉県東金市 防災課', '千葉県教育委員会', '福島県郡山市', '静岡県三島市',
          '長野県長野市', '鹿児島県（火山連携）', 'JAXA 宇宙状況把握（SSA）', 'NICT（宇宙天気）', '国立天文台', '高知工科大学（インフラサウンド）',
          '気象庁（火山・雷の突き合わせ）', '損害保険会社（落下物責任）'].map(function (x) { return badge(x, 'info'); })),
        el('div', { class:'note', text:'法学部が機器貸与契約・設置協定・観測データの証拠性・宇宙活動法上の論点を整備し、危機管理学部が通報訓練とリスクコミュニケーションを担当する。' })
      ])
    ])
  ]));

  NS.add(root, el('div', { class:'grid g3', style:{ marginTop:'14px' } }, [
    panel('通報の実績（デモ）', null, [
      NS.kv([['自治体への配信', '4 件'], ['学校への注意喚起', '11 件'], ['JAXA への情報共有', '2 件'],
             ['通報訓練の実施', '2 市 · 3 校'], ['平均 配信所要時間', '3 分 51 秒'], ['誤報', '0 件（うち保留判断 1 件）']], 'wide')
    ]),
    panel('法的・保険上の論点（法学部）', null, el('ul', { style:{ margin:0, paddingLeft:'1.2em', fontSize:'12.5px', color:'var(--ink2)' } }, [
      el('li', { text:'隕石・再突入破片による損害の責任主体（宇宙損害責任条約・宇宙活動法）' }),
      el('li', { text:'観測データの証拠性（時刻同期・改変防止・保存期間）' }),
      el('li', { text:'別法人の付属校への機器設置に関する貸与契約と設置協定' }),
      el('li', { text:'落下物の所有権（土地所有者・発見者・国）' }),
      el('li', { text:'空のみを撮像する画角設定と映像の公開範囲（個人情報）' })
    ].map(function (x) { return x; }))),
    panel('教育への統合（G-8 / PF-4）', null, el('ul', { style:{ margin:0, paddingLeft:'1.2em', fontSize:'12.5px', color:'var(--ink2)' } }, [
      el('li', { text:'生徒による自動検出の誤検出検証（雲・虫・飛行機・人工衛星の判別）を探究学習として制度化' }),
      el('li', { text:'各校が「自校のツイン」（DT-7）を持ち、自校の空を再現して探究する' }),
      el('li', { text:'全国生徒研究発表会の開催と、学校防災計画への観測局の組み込み' }),
      el('li', { text:'落下域通報を用いた避難訓練（危機管理学部と共同）' })
    ]))
  ]));
};

function workflow() {
  var steps = [
    ['検出', '0 秒', 'エッジ AI が\n火球候補を判定'],
    ['多点対応', '+18 秒', '全局データを\n時刻で突き合わせ'],
    ['軌跡決定', '+41 秒', '三角測量\n残差 41 m'],
    ['落下域', '+128 秒', '暗黒飛行の\n風補正'],
    ['通報', '+222 秒', '自治体・教育委\nへ自動配信'],
    ['確認', '+244 秒', 'インフラサウンド\nでエネルギー検証'],
    ['対応', '+30 分', '被害確認\n回収捜索の判断']
  ];
  var W = 1000, H = 130, bw = W / steps.length;
  var g = s('svg', { viewBox:'0 0 ' + W + ' ' + H, class:'chart' });
  steps.forEach(function (st, i) {
    var x = i * bw + 6;
    NS.add(g, s('rect', { x:x, y:26, width:bw - 22, height:78, rx:5, fill:'var(--panel2)',
      stroke:i === 4 ? 'var(--accent)' : 'var(--rule2)', 'stroke-width':i === 4 ? 1.8 : 1 }));
    NS.add(g, s('text', { x:x + 11, y:14, class:'axl', fill:'var(--accent)', text:st[1] }));
    NS.add(g, s('text', { x:x + 11, y:45, style:'font-size:13px;font-weight:700', fill:'var(--ink)', text:st[0] }));
    st[2].split('\n').forEach(function (line, k) {
      NS.add(g, s('text', { x:x + 11, y:64 + k * 14, class:'axl', fill:'var(--ink2)', text:line }));
    });
    if (i < steps.length - 1) {
      var ax = x + bw - 15;
      NS.add(g, s('path', { d:'M' + ax + ' 65 l9 0 m-4 -4 l4 4 l-4 4', stroke:'var(--muted)', 'stroke-width':1.4, fill:'none' }));
    }
  });
  return g;
}

/* =========================================================================
   データ公開・API
   ========================================================================= */
NS.V.data = function (root, go, arg) {
  NS.add(root, el('div', { class:'page-h' }, [
    el('h2', { text:'データ公開と API' }),
    el('p', { text:'全局のデータを学内クラウドに集約し、研究者・自治体・学校の 3 階層でアクセス制御する。カメラは空のみを撮像し、映像の学外公開は検出クリップに限定する（PF-2）。' })
  ]));

  NS.add(root, el('div', { class:'grid g3' }, [
    panel('3 階層のアクセス', { note:'個人情報とデータ保護（理工学部 五味が安全設計を担当）' },
      NS.table(['階層', '対象', '公開する内容'], [
        ['第 1 層', '一般・学校・報道', 'イベントカタログ（時刻・等級・軌道・落下域の概略）、夜空輝度マップ、WBGT、検出クリップ'],
        ['第 2 層', '自治体・教育委員会', '落下域確率地図（詳細）、警報、局別の気象・雷、校舎判定'],
        ['第 3 層', '研究者（申請制）', '生映像・波形・分光の原データ、較正情報、軌道解の共分散']
      ])),
    panel('公開データ', { note:'2 年間の到達目標' },
      NS.table(['データ', '内容', '公開時期'], [
        ['火球カタログ', '1 年分の全事象（軌跡・軌道・エネルギー）', '令和10年度'],
        ['再突入観測事例集', '分光・SWIR・音響を含む事例集', '令和10年度'],
        ['夜空輝度マップ', '13 点の連続データと全国マップ', '令和10年度'],
        ['インフラサウンド', '波形と検出イベント（公開 API）', '令和9年度末'],
        ['気象', '13 点の 1 分値（公開 API）', '令和9年度末'],
        ['白書・ガイドライン', '宇宙起源災害への学校・自治体対応', '令和10年度']
      ])),
    panel('カタログ統計（デモ）', null, [
      NS.kv([
        ['登録イベント', NS.EVENTS.length.toLocaleString() + ' 件（直近 14 日）'],
        ['うち火球（0 等より明るい）', NS.EVENTS.filter(function (e) { return e.kind === 'fireball'; }).length + ' 件'],
        ['多点（4 局以上）', NS.EVENTS.filter(function (e) { return e.stationsDet >= 4; }).length + ' 件'],
        ['分光取得', NS.EVENTS.filter(function (e) { return e.spectrum || e.hasSpec; }).length + ' 件'],
        ['インフラサウンド同時', NS.EVENTS.filter(function (e) { return e.hasInfra || (e.det && e.det.some(function (d) { return d.infra; })); }).length + ' 件'],
        ['1 日あたりの生成データ量', '約 1.4 TB（13 局合計・一次映像を含む）'],
        ['長期保存', '検出クリップと較正データを恒久保存、連続映像は 30 日'],
        ['時刻精度', 'GNSS 同期 < 1 ms（IP カメラは転送遅延を局ごとに補正）']
      ], 'wide')
    ])
  ]));

  var sampleFb = NS.FLAGSHIP.fireball;
  var json = {
    id: sampleFb.id, kind: 'fireball',
    t_utc: new Date(sampleFb.t).toISOString(), t_jst: NS.fmtJST(sampleFb.t, { ms:true }),
    abs_mag_peak: Number(sampleFb.absMag.toFixed(1)), duration_s: Number(sampleFb.dur.toFixed(2)),
    stations_detected: sampleFb.stationsDet, stations_in_fov: sampleFb.stationsFov,
    begin: { lat:sampleFb.begin.lat, lon:sampleFb.begin.lon, alt_km:sampleFb.begin.alt },
    end: { lat:sampleFb.end.lat, lon:sampleFb.end.lon, alt_km:sampleFb.end.alt },
    v_inf_kms: sampleFb.vInf, entry_angle_deg: sampleFb.entryAngle, azimuth_deg: sampleFb.azimuth,
    energy: { radiated_gj: Number((sampleFb.ErJ / 1e9).toFixed(3)), total_kt_optical: Number(sampleFb.EKt.toExponential(3)),
              total_kt_infrasound: Number(sampleFb.EinfKt.toExponential(3)), method_optical:'Brown et al. 2002', method_infrasound:'AFTAC period-yield' },
    mass: { photometric_kg: Number(sampleFb.massPhoto.toFixed(1)), terminal_kg: sampleFb.massTerminal, tau: sampleFb.tau },
    orbit: sampleFb.orbit, radiant: sampleFb.radiant,
    strewn_field: { center:{ lat:sampleFb.strewn.lat, lon:sampleFb.strewn.lon },
                    semi_major_km:sampleFb.strewn.a, semi_minor_km:sampleFb.strewn.b, azimuth_deg:sampleFb.strewn.az },
    stations: sampleFb.det.map(function (d) { return { id:d.id, mag:d.mag, elev_deg:d.elev, snr:d.snr, infrasound_delay_s:d.infra ? d.infra.dt : null }; })
  };
  NS.add(root, el('div', { class:'grid g-1-2', style:{ marginTop:'14px' } }, [
    panel('公開 API（設計案）', { note:'読み取り専用・JSON' }, el('div', { class:'api', html:
      '<span class="m">GET</span> /api/v1/<span class="k">stations</span>                <span class="c"># 13局の諸元・稼働状態</span>\n' +
      '<span class="m">GET</span> /api/v1/<span class="k">stations</span>/{id}/status     <span class="c"># 機材別の稼働・観測モード</span>\n' +
      '<span class="m">GET</span> /api/v1/<span class="k">events</span>?from=&to=&min_mag= <span class="c"># 火球・流星カタログ</span>\n' +
      '<span class="m">GET</span> /api/v1/<span class="k">events</span>/{id}              <span class="c"># 軌跡・軌道・エネルギー・落下域</span>\n' +
      '<span class="m">GET</span> /api/v1/<span class="k">events</span>/{id}/lightcurve   <span class="c"># 局別の光度曲線</span>\n' +
      '<span class="m">GET</span> /api/v1/<span class="k">events</span>/{id}/spectrum     <span class="c"># 分光（要 第3層）</span>\n' +
      '<span class="m">GET</span> /api/v1/<span class="k">reentry</span>/forecast         <span class="c"># 再突入予報（TLE 由来）</span>\n' +
      '<span class="m">GET</span> /api/v1/<span class="k">infrasound</span>/events        <span class="c"># 音響イベントと定位結果</span>\n' +
      '<span class="m">GET</span> /api/v1/<span class="k">infrasound</span>/{id}/waveform <span class="c"># 波形（要 第3層）</span>\n' +
      '<span class="m">GET</span> /api/v1/<span class="k">weather</span>?station=&res=1min <span class="c"># 気象 1 分値・WBGT</span>\n' +
      '<span class="m">GET</span> /api/v1/<span class="k">skybrightness</span>?station=    <span class="c"># 夜空輝度（SQM）</span>\n' +
      '<span class="m">GET</span> /api/v1/<span class="k">tec</span>?station=              <span class="c"># 電離圏 TEC（2周波GNSS）</span>\n' +
      '<span class="m">GET</span> /api/v1/<span class="k">structure</span>/{id}/modes      <span class="c"># 校舎固有振動数（要 第2層）</span>\n' +
      '<span class="m">GET</span> /api/v1/<span class="k">alerts</span>                    <span class="c"># 発報履歴</span>\n\n' +
      '<span class="c"># 認証：第2層・第3層は API キー（申請制）。全時刻は UTC と JST を併記。</span>' })),
    panel('レスポンス例', { note:'GET /api/v1/events/' + sampleFb.id },
      el('div', { class:'api', text:JSON.stringify(json, null, 2) }))
  ]));

  NS.add(root, el('div', { style:{ marginTop:'14px' } }, panel('デジタルツイン（DT-1〜DT-7）',
    { note:'実測で常時更新される仮想モデル。可視化だけのダッシュボードとは区別する' },
    NS.table(['ツイン', '対象', '観測網から得るデータ', '目的・what-if'], [
      ['DT-1 上空大気圏', '日本上空 0–120 km の火球・再突入体と周囲大気', '多点全天動画、インフラサウンド、風プロファイル、公開軌道要素', '発生数分後に落下域の確率地図を自治体・学校へ配信'],
      ['DT-2 空の明るさ・雲', '各局上空の夜空輝度、雲量・雲形、透明度', '夜空輝度計、全天画像、日射計、気象衛星', '全国輝度マップ、衛星・光害の寄与分離、星空予報'],
      ['DT-3 学校微気候', '校庭・体育館・屋上の WBGT・日射・風', '気象センサー、雲量、校舎 3D モデル', '時間帯・場所別の熱中症リスク予測'],
      ['DT-4 音の大気', '地表〜成層圏の音波伝搬場と音源', '13 局インフラサウンド、高層風、既知音源', '火山・津波・爆発の即時検知と定位、成層圏風の逆推定'],
      ['DT-5 電離圏', '日本上空の TEC 分布と擾乱', '2 周波 GNSS、GEONET、NICT', 'GNSS 測位誤差予報、津波・噴火起源の電離圏波動'],
      ['DT-6 校舎構造', '観測局を載せる校舎の固有振動数・剛性', '微動計、温度', '地震直後の校舎使用可否の即時判定'],
      ['DT-7 学びのツイン', '各付属校の「自校のツイン」と探究記録', '自校局の全データ、生徒追加センサー', '生徒が自校の空を再現して探究し、結果を観測網へ還元']
    ]))));
};

/* =========================================================================
   このデモについて
   ========================================================================= */
NS.V.about = function (root, go) {
  NS.add(root, el('div', { class:'page-h' }, [
    el('h2', { text:'このデモについて' }),
    el('p', { text:'令和9年度 日本大学特別研究の申請に向けた、観測ポータル「そら」のデモ版である。観測網の設計は申請書のとおりだが、表示されている観測値とイベントはすべて模擬データである。' })
  ]));
  NS.add(root, el('div', { class:'grid g2' }, [
    panel('実データ（申請書に基づく）', { note:'このデモで正確に反映している内容' },
      el('ul', { style:{ margin:0, paddingLeft:'1.2em', fontSize:'12.5px', color:'var(--ink2)' } }, [
        '観測局 13 局の名称・所在地・座標・設置機関（大学キャンパス拠点 6 局／付属校拠点 7 局）',
        'SWIR 冷却カメラの設置局（船橋・湘南・郡山・三島）',
        '全局共通のフル構成（機材の型式・仕様・価格帯・用途）',
        '視野円の算出（高度 100 km を仰角 30° 以上で見込める地表半径 ' + Math.round(NS.groundRadius(100, 30)) + ' km）',
        '日本の都道府県境界（国土数値情報を簡略化したデータ）',
        'サブテーマ G-1〜G-8 とデジタルツイン DT-1〜DT-7 の対応',
        '恒星の位置（赤経・赤緯 J2000。地方恒星時から地平座標へ変換して表示）',
        '物理関係式：Brown et al. (2002) の Er–E 関係、AFTAC の周期–収量関係、Ono & Tonouchi (2014) の WBGT 推定式、Bortle (2001) の空の等級',
        '発光スペクトルの線同定と相対強度：実際に取得された流星スペクトル（S. Abe et al. 2000 のしし座流星群スペクトルほか）の代表例に合わせて構成。回折格子は 600 本/mm を想定',
        'スペースデブリの分子（酸化物）バンド AlO・CN・TiO・FeO の同定、励起温度、発光開始→アブレーション→爆発→分裂→終端の推移：Watanabe, Abe, Arima & Hanayama (ACM 2026) による LM-3B 第2段の再突入分光観測',
        '線状降水帯の参照事象：2023 年 9 月 8 日に千葉県で発生し気象庁が「顕著な大雨に関する情報」を発表した事例'
      ].map(function (x) { return el('li', { text:x }); }))),
    panel('模擬データ（デモ用の作り物）', { note:'実際の観測結果ではない' },
      el('ul', { style:{ margin:0, paddingLeft:'1.2em', fontSize:'12.5px', color:'var(--ink2)' } }, [
        'すべてのイベント（火球・再突入・インフラサウンド・線状降水帯・地震応答）とその解析値',
        '発光スペクトルの波形そのもの（線同定は実測に基づくが、波形は合成）',
        '気象・夜空輝度・WBGT・雲量・稼働率などの観測値',
        '全天カメラの映像（雲・流星・人工衛星の軌跡・空の明るさ）',
        '再突入予報の対象天体（NORAD 仮 ID 99xxx / COSPAR 2xxx-DEMO-x）',
        '通報ログ・連携自治体との実績',
        '経年トレンド・カタログ統計'
      ].map(function (x) { return el('li', { text:x }); })))
  ]));
  NS.add(root, el('div', { class:'grid g2', style:{ marginTop:'14px' } }, [
    panel('観測網の名称', null, NS.kv([
      ['正式名称（英）', 'Nihon University Sky Observation and Resilience Array（NU-SORA）'],
      ['和名', '日本大学 全学屋上観測網「そら」'],
      ['主幹', '理工学部（理工学研究所）・宇宙科学研究ユニット NU-SX'],
      ['局数', '13 局（大学キャンパス拠点 6・付属校拠点 7）'],
      ['南北の広がり', '北端：<b>札幌局</b>（札幌日本大学高等学校・中学校）42.98°N<br>南端：<b>宮崎局</b>（宮崎日本大学高等学校・中学校）31.93°N'],
      ['局間の最大距離', NS.f(NS.dist(NS.ST.SPR.lat, NS.ST.SPR.lon, NS.ST.MYZ.lat, NS.ST.MYZ.lon), 0) + ' km']
    ], 'wide')),
    panel('参考資料・リンク', null, el('ul', { style:{ margin:0, paddingLeft:'1.2em', fontSize:'12.5px' } }, [
      ['NU-SX 公式サイト', 'https://aero.cst.nihon-u.ac.jp/nu-sx/'],
      ['Abe Space Science Lab（日本大学 理工学部 航空宇宙工学科）', 'https://aero.cst.nihon-u.ac.jp/abe-s/'],
      ['理工学部プレスリリース（NU-SX 設立）', 'https://www.cst.nihon-u.ac.jp/news/20260312_2211/'],
      ['日本大学 付属校一覧', 'https://www.nihon-u.ac.jp/affiliate_school/'],
      ['SonotaCo Network Japan（UFOCapture）', 'https://sonotaco.jp/'],
      ['株式会社サヤ INF03（インフラサウンド）', 'https://www.saya-net.com/products/inf03.html'],
      ['Unihedron SQM-LU-DL（夜空輝度計）', 'https://unihedron.com/projects/sqm-lu-dl/'],
      ['高知工科大学 インフラサウンド研究室', 'https://www.kochi-tech.ac.jp/research/research_center/advanced_engineering/infrasound.html']
    ].map(function (x) {
      return el('li', null, [el('a', { href:x[1], target:'_blank', rel:'noopener', text:x[0] })]);
    })))
  ]));

  /* ---- 参考文献 ---- */
  var lnk = function (href, label) {
    return el('a', { href:href, target:'_blank', rel:'noopener', class:'doi', text:label });
  };
  NS.add(root, el('div', { style:{ marginTop:'14px' } }, panel('参考文献',
    { note:'本デモが依拠している研究代表者らの主な先行研究と、関連する実装。表題をクリックすると原著にアクセスできる' },
    NS.table(['文献', 'デモ内での対応'], [
      [el('span', null, [
        el('b', { text:'Abe, S. ' }), '(2026), ',
        el('i', { text:'“A calibrated dust-trail model of the Leonid meteoroid stream and forecasts of the 2031–2035 encounters”' }),
        el('br'),
        lnk('https://arxiv.org/abs/2608.25456', 'arXiv:2608.25456'),
        lnk('https://zenodo.org/records/22084210', 'データ: Zenodo')
      ]),
       'しし座流星群のダストトレイルと地球軌道の交差から流星嵐を予報する。本観測網が検証対象とする「いつ・どこで・どれだけ流れるか」の理論側。DT-1（上空大気圏ツイン）の予報入力に対応する'],
      [el('span', null, [
        el('b', { text:'Abe, S., et al. ' }), '(2020), ',
        el('i', { text:'“Sodium variation in Geminid meteoroids from (3200) Phaethon”' }),
        ', Planetary and Space Science, 194, 105040', el('br'),
        lnk('https://doi.org/10.1016/j.pss.2020.105040', 'doi:10.1016/j.pss.2020.105040')
      ]),
       'ふたご座流星群の Na I 589 nm の強度変化から母天体（3200）Phaethon の熱進化を読む。「火球・隕石」画面の発光スペクトルで Na／Mg 比を組成の指標として扱う根拠（G-1）'],
      [el('span', null, [
        el('b', { text:'Abe, S., et al. ' }), '(2011), ',
        el('i', { text:'“Near-Ultraviolet and Visible Spectroscopy of HAYABUSA Spacecraft Re-Entry”' }),
        ', Publications of the Astronomical Society of Japan, 63, 1011–1021', el('br'),
        lnk('https://doi.org/10.1093/pasj/63.5.1011', 'doi:10.1093/pasj/63.5.1011')
      ]),
       '「はやぶさ」再突入の近紫外・可視分光。人工物の再突入を地上から分光観測した先行例であり、「デブリ再突入」画面の分光（G-2）が直接引き継ぐ手法'],
      [el('span', null, [
        el('b', { text:'Abe, S. ' }), '(2009), ',
        el('i', { text:'“Meteoroids and Meteors – Observations and Connection to Parent Bodies”' }),
        ', Lecture Notes in Physics, 758, 129–166, Springer', el('br'),
        lnk('https://doi.org/10.1007/978-3-540-76935-4_5', 'doi:10.1007/978-3-540-76935-4_5')
      ]),
       '流星の観測手法（撮像・分光）と、軌道・密度・強度・組成から母天体へ遡る枠組みの総説。本デモ全体の観測設計と解析フローの土台'],
      [el('span', null, [
        el('b', { text:'Abe, S., et al. ' }), '(2000), ',
        el('i', { text:'“First Results of High-Definition TV Spectroscopic Observations of the 1999 Leonid Meteor Shower”' }),
        ', Earth, Moon, and Planets, 82–83, 369–377', el('br'),
        lnk('https://doi.org/10.1023/A:1017055120356', 'doi:10.1023/A:1017055120356')
      ]),
       '「火球・隕石」画面の自然天体スペクトルの線同定（Ca II・Mg I・Na I・Si II・O I・N I・N₂）と相対強度の基準'],
      [el('span', null, [
        el('b', { text:'Watanabe, K., Abe, S., Arima, N. & Hanayama, H. ' }), '(2026), ',
        el('i', { text:'“Spectroscopic Study of Rocket Debris during Atmospheric Re-entry”' }),
        ', ACM 2026（Asteroids, Comets, Meteors 2026 発表）'
      ]),
       'LM-3B 第2段の再突入分光（石垣島天文台・600 grooves/mm）。「デブリ再突入」画面の分子（酸化物）バンド AlO・CN・TiO と、発光開始→アブレーション→爆発→分裂→終端の局面推移はこの成果に基づく'],
      [el('span', null, [
        el('b', { text:'Meteorium（メテオリウム）' }), '　宇宙科学デジタルツイン アプリ、Abe Space Science Lab (2026)', el('br'),
        lnk('https://aero.cst.nihon-u.ac.jp/abe-s/2026/08/31/meteorium%ef%bc%88%e3%83%a1%e3%83%86%e3%82%aa%e3%83%aa%e3%82%a6%e3%83%a0%ef%bc%89/', '紹介記事'),
        lnk('https://apps.apple.com/app/id6798546441', 'App Store')
      ]),
       '太陽系を俯瞰してダストトレイルと地球軌道の交差を見せ、そのまま地上視点に降りて流星雨の見え方を再現する。論文の計算結果をそのまま動かせる「宇宙科学デジタルツイン」の先行実装であり、本観測網の PF-2（デジタルツイン）・DT-7（学びのツイン）が目指す形を、観測データ側から補完する'],
      [el('span', null, [
        el('b', { text:'Astrarium（アストラリウム）' }), '　星空アプリ、Abe Space Science Lab (2026)', el('br'),
        lnk('https://apps.apple.com/app/id6795053748', 'App Store')
      ]),
       'その場の空に見える星座・天体を再現する星空アプリ。本デモの「全天カメラ（疑似ライブ）」が恒星の赤経・赤緯から地方恒星時で天球を再現しているのと同じ考え方であり、付属校の生徒が自分の空と観測画像を見比べる導入として、DT-7（学びのツイン）・G-8（探究）に接続する']
    ], { class:'refs' }))));
  NS.add(root, el('div', { style:{ marginTop:'14px' } }, panel('操作方法', null, NS.table(['操作', '内容'], [
    ['地図：ホイール / トラックパッド', '拡大・縮小'],
    ['地図：ドラッグ', '移動'],
    ['地図：局のマーカーをクリック', 'その局の詳細画面（疑似ライブ映像・機材状態・時系列）へ'],
    ['地図：レイヤ切替', '稼働状態 / 夜空輝度 / WBGT / 雲量 / イベント'],
    ['「気象・熱中症」画面の下部', '線状降水帯の統合検知（気象センサー × インフラサウンド × GNSS 可降水量）'],
    ['「デブリ再突入」画面の発光スペクトル', '再突入の局面（発光開始／アブレーション／爆発／分裂／終端）の切替と、分子（酸化物）バンド AlO・CN・TiO・FeO の ON / OFF'],
    ['地図：視野（仰角）', '5°〜45° の視野円を重ね、多点観測の成立範囲を確認'],
    ['一覧の行・イベント行をクリック', '詳細を表示'],
    ['右上のテーマ切替', '暗い配色（観測運用向け）と明るい配色（印刷・投影向け）'],
    ['右上の「時刻」', '表示中の時刻。実時刻に追従する']
  ]))));
};

})(NS);

/* =========================================================================
   線状降水帯セクション（気象・熱中症 画面に差し込む）
   気象センサー × インフラサウンド × 2周波GNSS の統合検知デモ
   ========================================================================= */
(function (NS) {
var el = NS.el, s = NS.s, panel = NS.panel, badge = NS.badge, kpi = NS.kpi;

/* 帯の軸から幅 w km の帯状ポリゴンを地図座標で作る */
function bandPath(M, axis, widthKm, shiftKm, shiftAz) {
  var a = axis.a, b = axis.b;
  var dx = (b.lon - a.lon) * 111.32 * Math.cos((a.lat + b.lat) / 2 * NS.d2r);
  var dy = (b.lat - a.lat) * 111.32;
  var L = Math.sqrt(dx * dx + dy * dy) || 1;
  var nx = -dy / L, ny = dx / L;                    /* 軸に直交する単位ベクトル（km） */
  var h = widthKm / 2;
  var sx = 0, sy = 0;
  if (shiftKm) { sx = shiftKm * Math.sin(shiftAz * NS.d2r); sy = shiftKm * Math.cos(shiftAz * NS.d2r); }
  var toLL = function (p, ox, oy) {
    return { lat:p.lat + (oy) / 111.32, lon:p.lon + (ox) / (111.32 * Math.cos(p.lat * NS.d2r)) };
  };
  var c = [toLL(a, nx * h + sx, ny * h + sy), toLL(b, nx * h + sx, ny * h + sy),
           toLL(b, -nx * h + sx, -ny * h + sy), toLL(a, -nx * h + sx, -ny * h + sy)];
  var d = '';
  c.forEach(function (p, i) { var xy = M.pt(p.lon, p.lat); d += (i ? 'L' : 'M') + xy[0].toFixed(1) + ' ' + xy[1].toFixed(1); });
  return d + 'Z';
}

NS.rainbandSection = function (go) {
  var rb = NS.rainband();
  var wrap = el('div', { class:'grid', style:{ gap:'14px', marginTop:'14px' } });
  var jst = function (dt) { return NS.fmtJST(rb.t + dt * 60000, { sec:false, timeOnly:true }); };

  /* ---- 見出し ---- */
  NS.add(wrap, panel('線状降水帯の統合検知　' + rb.name,
    { note:rb.id + ' · ' + NS.fmtJST(rb.t, { sec:false }) + ' JST 形成 · 継続 ' + Math.round(rb.durMin / 60 * 10) / 10 + ' 時間',
      tools:badge('気象センサー × インフラサウンド × GNSS', 'info') }, [
    el('p', { style:{ margin:'0 0 12px', color:'var(--ink2)' },
      text:'線状降水帯は、帯の直下でなければ雨量計に何も現れない。一方で、帯の中で連続する雷放電は 0.6–14 Hz のインフラサウンドとして 50–70 km 離れた局にも届く。観測局は帯の西 26–69 km にあり直接の大雨は受けていないが、5 局の到来方位を交会することで帯の位置・長さ・向き・移動を、雨量計より前に捉えられる。ここに 2 周波 GNSS の可降水量を重ねて、水蒸気の流入と併せて判定する。' }),
    el('div', { class:'grid g4' }, [
      kpi('先行時間', rb.leadMin, '分', 'インフラサウンドによる自動判定が外部の大雨情報に先行', { acc:true, icon:'〰' }),
      kpi('雷放電の検知', rb.strikesTotal.toLocaleString(), '回', 'ピーク ' + rb.strikesPeak + ' 回 / 10 分 · ' + rb.freq),
      kpi('帯の推定規模', rb.lengthKm + ' × ' + rb.axis.width, 'km', '方位交会による定位精度 ±' + NS.f(rb.locErr, 1) + ' km'),
      kpi('帯の移動', NS.f(rb.move.speed, 1), 'km/h', '方位 ' + rb.move.az + '°（' + NS.compass(rb.move.az) + 'へ）· 到来方位の時間変化から推定')
    ])
  ]));

  /* ---- 地図：帯・雷放電の定位点・到来方位 ---- */
  var M = NS.Map({ onStation:function (st) { go('station', st.id); } });
  M.drawStations({ state:function (st) { return NS.stationState(st, NS.now()); } });
  /* 帯（形成時 → 3 時間後） */
  M.addOverlay(s('path', { d:bandPath(M, rb.axis, rb.axis.width, 0, 0), fill:'var(--c-info)', 'fill-opacity':0.16,
    stroke:'var(--c-info)', 'stroke-width':1.3, 'vector-effect':'non-scaling-stroke' }));
  var shift = rb.move.speed * 3;
  M.addOverlay(s('path', { d:bandPath(M, rb.axis, rb.axis.width, shift, rb.move.az), fill:'none',
    stroke:'var(--c-info)', 'stroke-width':1.1, 'stroke-dasharray':'5 4', opacity:0.6, 'vector-effect':'non-scaling-stroke' }));
  M.fit([rb.axis.a, rb.axis.b, { lat:NS.ST.SNN.lat, lon:NS.ST.SNN.lon }, { lat:NS.ST.TCR.lat, lon:NS.ST.TCR.lon }], 0.30);
  /* 雷放電の定位点（時刻で色分け） */
  var tcol = NS.colorScale([[0.2, '#4585CC'], [2.4, '#C9A227'], [4.8, '#D6405F']]);
  var pr = M.px(1.9);
  rb.pts.forEach(function (p) {
    var xy = M.pt(p.lon, p.lat);
    M.addOverlay(s('circle', { cx:xy[0], cy:xy[1], r:pr, fill:tcol(p.h), 'fill-opacity':0.8 }));
  });
  /* 各局の到来方位 */
  rb.det.forEach(function (d) {
    var st = NS.ST[d.id], p0 = M.pt(st.lon, st.lat);
    var L = 1.06 * NS.dist(st.lat, st.lon, (rb.axis.a.lat + rb.axis.b.lat) / 2, (rb.axis.a.lon + rb.axis.b.lon) / 2);
    [-d.azSd, 0, d.azSd].forEach(function (da, k) {
      var az = (d.az + da) * NS.d2r;
      var lat2 = st.lat + L * Math.cos(az) / 111.32, lon2 = st.lon + L * Math.sin(az) / (111.32 * Math.cos(st.lat * NS.d2r));
      M.addOverlay(s('path', { d:NS.geoLinePath({ lat:st.lat, lon:st.lon }, { lat:lat2, lon:lon2 }, 12),
        stroke:'var(--c-infra)', 'stroke-width':k === 1 ? 1.5 : 0.7, 'stroke-dasharray':k === 1 ? null : '3 3',
        fill:'none', opacity:k === 1 ? 0.9 : 0.38, 'vector-effect':'non-scaling-stroke' }));
    });
  });
  /* 移動ベクトル */
  var mc = { lat:(rb.axis.a.lat + rb.axis.b.lat) / 2, lon:(rb.axis.a.lon + rb.axis.b.lon) / 2 };
  var mt = { lat:mc.lat + shift * Math.cos(rb.move.az * NS.d2r) / 111.32,
             lon:mc.lon + shift * Math.sin(rb.move.az * NS.d2r) / (111.32 * Math.cos(mc.lat * NS.d2r)) };
  var mp0 = M.pt(mc.lon, mc.lat), mp1 = M.pt(mt.lon, mt.lat);
  M.addOverlay(s('path', { d:'M' + mp0[0] + ' ' + mp0[1] + 'L' + mp1[0] + ' ' + mp1[1],
    stroke:'var(--accent)', 'stroke-width':2, fill:'none', 'vector-effect':'non-scaling-stroke' }));
  M.addOverlay(s('circle', { cx:mp1[0], cy:mp1[1], r:M.px(4), fill:'var(--accent)' }));

  var mapPanel = panel('帯の推定位置と雷放電の定位', {
    note:'緑の実線は各局のインフラサウンド到来方位（破線は方位のばらつき）。点は雷放電の推定位置で、色は発生時刻。青の破線は 3 時間後の帯の位置' }, []);
  var mb = mapPanel.querySelector('.panel-b'); mb.classList.add('flush'); mb.appendChild(M.node);
  NS.add(mb, el('div', { class:'maplegend' }, [
    el('span', { html:'<i style="background:var(--c-info);opacity:.45"></i>推定された帯（' + rb.lengthKm + ' × ' + rb.axis.width + ' km）' }),
    el('span', { html:'<i style="background:var(--c-infra)"></i>インフラサウンド到来方位' }),
    el('span', null, [el('i', { class:'gradbar', style:{ width:'96px', background:'linear-gradient(90deg,#4585CC,#C9A227,#D6405F)' } }), ' 雷放電 早い ← → 遅い']),
    el('span', { html:'<i style="background:var(--accent)"></i>帯の移動（' + rb.move.az + '° · ' + NS.f(rb.move.speed, 1) + ' km/h）' })
  ]));

  /* ---- 時系列 ---- */
  var xs = rb.series.map(function (p) { return p.hh; });
  var xf = function (v) { return NS.p2(Math.floor(v) % 24) + ':' + NS.p2(Math.round((v % 1) * 60)); };
  var rules = [
    { x:rb.t ? 4 + (12 + 20) / 60 : 0, color:'var(--c-infra)', dash:'3 3', label:'検知' },
    { x:4 + (54 + 20) / 60, color:'var(--accent)', dash:'3 3', label:'判定' },
    { x:4 + (88 + 20) / 60, color:'var(--c-warn)', dash:'3 3', label:'外部情報' }
  ];
  var chartPanel = panel('検知の時系列（10 分値）', { note:'雷放電はインフラサウンド、降水強度・気圧は気象センサー、可降水量は 2 周波 GNSS による' }, [
    NS.chart.bars({ bars:rb.series.map(function (p) {
        return { y:p.strikes, label:(p.min % 60 === 0 ? xf(p.hh) : ''), color:p.strikes >= 30 ? 'var(--c-infra)' : 'var(--muted)',
                 title:xf(p.hh) + '　' + p.strikes + ' 回 / 10 分' };
      }), width:660, height:150, margin:{ l:48, r:12, t:12, b:22 }, yLabel:'雷放電 回 / 10 分（全局合計）' }),
    NS.chart.line({ series:[
        { name:'降水強度', color:'var(--c-info)', pts:rb.series.map(function (p) { return [p.hh, p.rain]; }), area:true },
        { name:'可降水量 PWV', color:'var(--c-spec)', pts:rb.series.map(function (p) { return [p.hh, p.pwv]; }), dash:'4 3' }
      ], width:660, height:160, margin:{ l:48, r:12, t:12, b:24 }, xLabel:'JST', yLabel:'mm/h ・ PWV mm',
      xFmt:xf, yFmt:function (v) { return NS.f(v, 0); }, rules:rules.concat([{ y:55, color:'var(--c-spec)', dash:'2 3', label:'PWV 判定閾値 55 mm' }]) }),
    NS.chart.line({ series:[{ name:'気圧', color:'var(--c-warn)', pts:rb.series.map(function (p) { return [p.hh, p.press]; }) }],
      width:660, height:120, margin:{ l:48, r:12, t:10, b:24 }, xLabel:'JST', yLabel:'気圧 hPa', xFmt:xf, yFmt:function (v) { return NS.f(v, 0); } }),
    NS.chart.legend([['雷放電（インフラサウンド）', 'var(--c-infra)'], ['降水強度（雨量計）', 'var(--c-info)'],
                     ['可降水量（GNSS）', 'var(--c-spec)', 'line'], ['気圧', 'var(--c-warn)', 'line']]),
    el('div', { class:'note', text:'雷放電の急増（' + jst(12) + '）は、船橋局で 30 mm/h に達する（' + jst(150) + '）より 2 時間以上早い。帯の直下にない局でも、音と水蒸気で帯の発生を捉えられることがこの構成の要点である。' })
  ]);
  NS.add(wrap, el('div', { class:'grid g-3-2' }, [mapPanel, chartPanel]));

  /* ---- 局別・判定条件・経過 ---- */
  NS.add(wrap, el('div', { class:'grid g3' }, [
    panel('局別の検知状況', { note:'帯の軸からの距離順' },
      NS.table(['局', '帯まで', '雷検知', '到来方位', '6 h 雨量', '最大 1 h', 'PWV'],
        rb.det.map(function (d) {
          return { attrs:{ class:'clk', onclick:function () { go('station', d.id); } }, cells:[
            el('b', { text:NS.ST[d.id].name }),
            { class:'r', html:d.axisKm + ' km' },
            { class:'r', html:d.strikes.toLocaleString() },
            { class:'r mono', html:'<b>' + NS.f(d.az, 0) + '°</b> ±' + NS.f(d.azSd, 1) + '°' },
            { class:'r', html:NS.f(d.rain6h, 1) },
            { class:'r', html:NS.f(d.rainMax, 1) },
            { class:'r', html:d.pwv0 + '→' + d.pwvMax }
          ] };
        }))),
    panel('自動判定の条件', { note:'6 条件すべての成立で「線状降水帯の可能性」を発報' },
      NS.table(['指標', '閾値', '観測値', ''], rb.criteria.map(function (c) {
        return [{ class:'sm', html:c[0] }, { class:'sm', html:c[1] }, { html:'<b>' + c[2] + '</b>' },
          c[3] ? badge('成立', 'ok') : badge('不成立', 'dim')];
      }))),
    panel('降水と被害の想定', { note:'帯の直下（推定）' }, [
      NS.kv([
        ['最大 1 時間降水量', '<b>' + rb.rainPeak1h + ' mm/h</b>（' + rb.rainPeakPlace + '）'],
        ['帯の継続', NS.f(rb.durMin / 60, 1) + ' 時間'],
        ['最大瞬間風速', NS.f(rb.det[0].gust, 1) + ' m/s（船橋局）'],
        ['最低気圧', NS.f(rb.det[0].pressMin, 1) + ' hPa（' + NS.f(rb.det[0].pressDrop, 1) + ' hPa）'],
        ['通報先', '千葉県 山武市・東金市・茂原市／県東部の付属校 3 校'],
        ['学校の対応', '登校時間帯の変更、部活動の中止、屋外行事の延期']
      ], 'wide'),
      el('div', { class:'note', text:'帯の直下の降水量は、方位交会で求めた雷放電の密度と船橋局の実測から推定した値であり、レーダー観測の代替ではない。運用では気象庁レーダー・解析雨量と突き合わせて検証する。' })
    ])
  ]));

  NS.add(wrap, el('div', { class:'grid g-2-1' }, [
    panel('検知から通報までの経過', { note:'形成（' + NS.fmtJST(rb.t, { sec:false, timeOnly:true }) + ' JST）からの経過分' },
      el('ul', { class:'tl' }, rb.timeline.map(function (a) {
        var cls = a.kind === '通報' || a.kind === '判定' ? '' : a.kind === '実測' || a.kind === '衰弱' ? 'i-ok' : 'i-info';
        return el('li', { class:cls }, [
          el('div', { class:'tt', text:jst(a.dt) + ' JST（＋' + a.dt + ' 分）　' + a.src }),
          el('div', { class:'tx' }, [el('span', { class:'tg', text:a.kind }), a.text])
        ]);
      }))),
    panel('三つのセンサーの役割', { note:'同一局・同一時刻の観測を組み合わせる' }, [
      NS.table(['センサー', '捉えるもの', '特徴'], [
        ['インフラサウンド（0.1–1000 Hz）', '雷放電の音波と、帯内の対流に伴う気圧擾乱',
          '<span class="sm">帯の直下でなくても 50–70 km 先を検知。方位交会で位置・長さ・向き・移動が出る。<b>最も早い</b></span>'],
        ['2 周波 GNSS（可降水量）', '観測局上空の水蒸気総量（PWV）',
          '<span class="sm">降水が始まる前に水蒸気の流入が現れる。GEONET と同じ原理を学校屋上で実施</span>'],
        ['複合気象センサー', '雨量・気圧・風向風速・気温',
          '<span class="sm">最も確実だが、帯が到達してからでないと分からない。判定の確定と検証に使う</span>'],
        ['全天カメラ', '雲底の様子と発雷の閃光',
          '<span class="sm">夜間は発雷の光でインフラサウンドの検知を裏づけ、誤検知（工事音・爆発音）を排除できる</span>']
      ]),
      el('div', { class:'note', text:'インフラサウンドは火球の衝撃波（G-1）・火山噴火（G-4）と同じ装置・同じ波形処理を使う。一つのセンサー網が、宇宙起源の災害と気象災害の双方に効くことが本観測網の設計思想である。' })
    ])
  ]));

  NS.add(wrap, el('div', { class:'src', style:{ marginTop:'0' }, text:rb.ref }));
  return wrap;
};
})(NS);
