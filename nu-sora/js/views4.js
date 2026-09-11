/* NU-SORA デモ / 画面：地震・津波（全センサー統合／デジタルツイン処理） */
'use strict';
(function (NS) {
var el = NS.el, s = NS.s, panel = NS.panel, badge = NS.badge, kpi = NS.kpi;

/* 海底 → 地殻 → 大気 → 電離圏 の結合を、どのセンサーがどの層を見ているかとして描く */
function couplingDiagram(ts) {
  var W = 1000, H = 330, m = { l:96, r:150, t:26, b:34 };
  var iw = W - m.l - m.r, ih = H - m.t - m.b;
  var g = s('svg', { viewBox:'0 0 ' + W + ' ' + H, class:'chart twin', role:'img',
    'aria-label':'海底から電離圏までの結合と、各層を観測するセンサー' });
  var LAYERS = [
    { name:'電離圏', sub:'高度 250–350 km', color:'#7C6FD0', h:0.22,
      sensors:['2 周波 GNSS（TEC）'], obs:['音波共振 4.4 / 3.6 mHz（+8 分）', '津波性電離圏ホール −1.85 TECU（+19 分）'] },
    { name:'中間圏・成層圏', sub:'高度 20–100 km', color:'#4585CC', h:0.20,
      sensors:['全天カメラ', 'インフラサウンド（成層圏反射波）'], obs:['大気光の擾乱（夜間）', '成層圏を経由した音波の到達'] },
    { name:'対流圏', sub:'地表 – 高度 20 km', color:'#3FA07A', h:0.22,
      sensors:['インフラサウンド（LF 0.005–0.1 Hz）', '複合気象センサー（気圧）'], obs:['大気重力波・ラム波（+13 分）', '気圧変動'] },
    { name:'地殻・校舎', sub:'地表', color:'#C9A227', h:0.18,
      sensors:['微動計（3 成分加速度）'], obs:['P 波・S 波の到達', '校舎の固有振動数の変化'] },
    { name:'海底・海面', sub:'震源', color:'#D6405F', h:0.18,
      sensors:['（本観測網では直接観測しない）'], obs:['断層すべり → 海面変動 → 津波'] }
  ];
  var y = m.t;
  LAYERS.forEach(function (L) {
    var hh = ih * L.h;
    NS.add(g, s('rect', { x:m.l, y:y, width:iw, height:hh - 3, rx:3, fill:L.color, 'fill-opacity':0.11,
      stroke:L.color, 'stroke-opacity':0.45, 'stroke-width':1 }));
    NS.add(g, s('text', { x:m.l - 8, y:y + hh / 2 - 4, 'text-anchor':'end',
      style:'font-size:12px;font-weight:700', fill:L.color, text:L.name }));
    NS.add(g, s('text', { x:m.l - 8, y:y + hh / 2 + 9, 'text-anchor':'end', class:'axl', text:L.sub }));
    L.sensors.forEach(function (sn, i) {
      NS.add(g, s('text', { x:m.l + 10, y:y + 15 + i * 13, style:'font-size:10.5px;font-weight:700',
        fill:'var(--ink)', text:'▸ ' + sn }));
    });
    L.obs.forEach(function (o, i) {
      NS.add(g, s('text', { x:m.l + iw * 0.44, y:y + 15 + i * 13, class:'axl', fill:'var(--ink2)', text:o }));
    });
    y += hh;
  });
  /* 下から上へ伝わる矢印 */
  var ax = m.l + iw + 26;
  NS.add(g, s('path', { d:'M' + ax + ' ' + (m.t + ih - 6) + 'L' + ax + ' ' + (m.t + 10) +
    ' m-5 8 l5 -8 l5 8', stroke:'var(--accent)', 'stroke-width':1.8, fill:'none' }));
  ['+19 分 電離圏ホール', '+13 分 大気重力波', '+8 分 TEC 共振', '0 分 地震'].forEach(function (tx, i) {
    NS.add(g, s('text', { x:ax + 9, y:m.t + 16 + i * (ih / 4.3), class:'axl', fill:'var(--ink2)', text:tx }));
  });
  NS.add(g, s('text', { x:ax - 4, y:m.t + 6, class:'axl', 'text-anchor':'end', fill:'var(--accent)', text:'伝搬' }));
  NS.add(g, s('text', { x:m.l + 10, y:H - 12, class:'axl', text:'観測するセンサー' }));
  NS.add(g, s('text', { x:m.l + iw * 0.44, y:H - 12, class:'axl', text:'この事象で捉えたもの' }));
  return g;
}

NS.V.quake = function (root, go, arg) {
  var ts = NS.tsunami(), q = ts.quake, t = NS.now();
  var seis = NS.EVMAP['NUS-IS-Q-0106'];

  NS.add(root, el('div', { class:'page-h' }, [
    el('h2', { text:'地震・津波　全センサーの統合とデジタルツイン' }),
    el('p', { text:'海底の変動は、地殻を揺らし、大気に音波と重力波を放ち、電離圏の電子密度を変える。本観測網は微動計・インフラサウンド・気象センサー・2 周波 GNSS を同一地点に揃えているため、この一連の結合を一つの局で追える。地震そのものは気象庁と防災科研の観測網が担うので、本観測網は「その後に大気と電離圏で何が起きたか」を受け持つ（サブテーマ G-4・G-5・G-6 / DT-4・DT-5・DT-6）。' })
  ]));

  NS.add(root, el('div', { class:'grid g4' }, [
    kpi('直近の地震', 'M' + q.mw, '', q.name + '　深さ ' + q.depth + ' km', { acc:true, icon:'▤' }),
    kpi('電離圏の応答', '+8', '分', 'TEC に音波共振（' + ts.resFreq.join(' / ') + ' mHz）'),
    kpi('推定沿岸波高', NS.f(ts.estWave, 1) + ' ± ' + NS.f(ts.estErr, 1), 'm', '実測 ' + NS.f(ts.obsWave, 1) + ' m（' + ts.obsPlace + '）'),
    kpi('校舎の判定', '13 / 13', '局 継続使用可', '固有振動数の低下は 5 % 未満')
  ]));

  /* ---- 統合デジタルツイン図 ---- */
  NS.add(root, el('div', { style:{ marginTop:'14px' } }, panel('鉛直方向の結合とセンサーの対応',
    { note:'一つの事象が層を越えて伝わる過程を、どのセンサーがどの層を見ているかとして示す（DT-4・DT-5・DT-6 の接点）' },
    [couplingDiagram(ts),
     el('div', { class:'note', text:'デジタルツインは可視化だけの仕組みではない。ここでは、観測された TEC の擾乱と大気重力波の振幅から津波の規模を逆算し、その結果を検潮所の実測と突き合わせて係数を更新する、という同化の流れそのものを指す。層ごとに別の研究室が持っていたデータを、同一地点・同一時刻で並べられることが本観測網の要点である。' })])));

  /* ---- 地図：震央・観測局・検知状況 ---- */
  var M = NS.Map({ onStation:function (st) { go('station', st.id); } });
  M.drawStations({ state:function (st) { return NS.stationState(st, t); },
    halo:function (st) {
      var d = ts.det.filter(function (x) { return x.id === st.id; });
      if (!d.length) return null;
      return { r:16, color:'var(--c-sky)', opacity:0.34 };
    },
    tipExtra:function (st) {
      var d = ts.det.filter(function (x) { return x.id === st.id; });
      if (!d.length) return 'この事象では検知なし';
      return d.map(function (x) { return x.kind + '　+' + NS.f(x.dt, 1) + ' 分　' + x.val; }).join('<br>');
    } });
  var qp = M.pt(q.lon, q.lat);
  M.addOverlay(s('circle', { cx:qp[0], cy:qp[1], r:M.px(18), fill:'var(--c-crit)', 'fill-opacity':0.12,
    stroke:'var(--c-crit)', 'stroke-width':1, 'vector-effect':'non-scaling-stroke' }));
  M.addOverlay(s('path', { d:'M' + (qp[0] - M.px(7)) + ' ' + qp[1] + 'h' + M.px(14) +
    'M' + qp[0] + ' ' + (qp[1] - M.px(7)) + 'v' + M.px(14), stroke:'var(--c-crit)', 'stroke-width':2,
    'vector-effect':'non-scaling-stroke' }));
  ts.det.forEach(function (d) {
    var st = NS.ST[d.id]; if (!st) return;
    M.addOverlay(s('path', { d:NS.geoLinePath({ lat:q.lat, lon:q.lon }, { lat:st.lat, lon:st.lon }, 16),
      stroke:d.kind === 'GNSS' ? 'var(--c-sky)' : d.kind === 'インフラサウンド' ? 'var(--c-infra)' : 'var(--c-warn)',
      'stroke-width':0.9, 'stroke-dasharray':'3 3', fill:'none', opacity:0.45, 'vector-effect':'non-scaling-stroke' }));
  });
  M.fit([{ lat:q.lat, lon:q.lon }].concat(NS.STATIONS.map(function (st) { return { lat:st.lat, lon:st.lon }; })), 0.15);
  var mp = panel('震央と検知した観測局', { note:'✕ が震央。破線は震央と検知局を結ぶ（色＝センサーの種類）' }, []);
  var mb = mp.querySelector('.panel-b'); mb.classList.add('flush'); mb.appendChild(M.node);
  NS.add(mb, el('div', { class:'maplegend' }, [
    el('span', { html:'<i style="background:var(--c-warn)"></i>微動計' }),
    el('span', { html:'<i style="background:var(--c-sky)"></i>2 周波 GNSS（TEC）' }),
    el('span', { html:'<i style="background:var(--c-infra)"></i>インフラサウンド' })]));

  var detTable = panel('検知の時系列', { note:ts.det.length + ' 件・' + NS.fmtJST(ts.t, { sec:false }) + ' JST の地震' },
    NS.table(['経過', '局', 'センサー', '内容'], ts.det.map(function (d) {
      return { attrs:{ class:'clk', onclick:function () { go('station', d.id); } }, cells:[
        { class:'r mono', html:'+' + NS.f(d.dt, 1) + ' 分' }, NS.ST[d.id].name,
        badge(d.kind, d.kind === 'GNSS' ? 'info' : d.kind === 'インフラサウンド' ? 'ok' : 'warn'),
        { class:'sm', html:d.val + (d.note ? '　<span class="hint">' + d.note + '</span>' : '') }] };
    })));
  NS.add(root, el('div', { class:'grid g-3-2', style:{ marginTop:'14px' } }, [mp, detTable]));

  /* ---- TEC 時系列 ---- */
  NS.add(root, el('div', { class:'grid g-2-1', style:{ marginTop:'14px' } }, [
    panel('電離圏 TEC の時系列', { note:'2 周波 GNSS。地震発生を 0 分とする' }, [
      NS.chart.line({ series:[
          { name:'TEC', color:'var(--c-info)', pts:ts.tec.map(function (p) { return [p.m, p.tec]; }), area:true },
          { name:'共振成分（拡大）', color:'var(--c-warn)', pts:ts.tec.map(function (p) { return [p.m, 22.6 + p.res * 2]; }), dash:'3 3' }],
        width:900, height:220, xLabel:'地震発生からの経過（分）', yLabel:'TEC（TECU）',
        xFmt:function (v) { return NS.f(v, 0); }, yFmt:function (v) { return NS.f(v, 0); },
        rules:[{ x:8, color:'var(--c-warn)', dash:'3 3', label:'音波共振' },
               { x:19, color:'var(--accent)', dash:'3 3', label:'電離圏ホール' },
               { x:26, color:'var(--c-ok)', dash:'3 3', label:'規模推定' }] }),
      el('div', { class:'note', text:'共振（+8 分）は海面が動いたことを示し、ホール（+19 分）はその大きさを含む。前者は早く、後者は確からしい。両方を見ることで早さと確度を両立させる。' })
    ]),
    panel('津波規模の推定と検証', null, [
      NS.kv([
        ['TEC 最大減少', NS.f(ts.holeMax, 2) + ' TECU'],
        ['減少率', NS.f(ts.holeRate, 2) + ' TECU/分'],
        ['推定沿岸波高', '<b>' + NS.f(ts.estWave, 1) + ' ± ' + NS.f(ts.estErr, 1) + ' m</b>'],
        ['実測', NS.f(ts.obsWave, 1) + ' m（' + ts.obsPlace + '）'],
        ['差', NS.f(ts.estWave - ts.obsWave, 1) + ' m（不確かさの範囲内）'],
        ['外部情報', ts.jmaWarn.text + '（+' + NS.f(ts.jmaWarn.dt, 0) + ' 分）']
      ], 'wide'),
      el('div', { class:'note', text:ts.note }),
      el('div', { class:'chips', style:{ marginTop:'8px' } }, ts.refs.map(function (x) { return badge(x, ''); })),
      el('button', { class:'iconbtn', style:{ marginTop:'8px' }, text:'通報ワークフロー（津波）を見る →',
        onclick:function () { go('alerts'); } })
    ])
  ]));

  /* ---- 校舎の判定（DT-6） ---- */
  var rows = NS.STATIONS.map(function (st) {
    var r = NS.rng(st.id + '|seis'), f0 = 2.6 + r() * 1.9;
    var pre = f0 * (1 + r.range(0.000, 0.012));
    var d = seis && seis.det.filter(function (x) { return x.id === st.id; })[0];
    var pga = d ? d.pga : 0.4 + r() * 12;
    var drift = ((f0 - pre) / pre) * 100;
    return { st:st, f0:f0, pre:pre, drift:drift, pga:pga };
  }).sort(function (a, b) { return b.pga - a.pga; });
  NS.add(root, el('div', { style:{ marginTop:'14px' } }, panel('校舎の使用可否判定（全 13 局・DT-6）',
    { note:'常時微動から同定した 1 次固有振動数を地震前後で比較する。低下が 5 % を超えたら「点検要」を自動発報する' },
    [NS.table(['局', '設置校', '地震前 f₀', '地震後 f₀', '変化', '最大加速度', '判定'], rows.map(function (r) {
      return { attrs:{ class:'clk', onclick:function () { go('station', r.st.id); } }, cells:[
        el('b', { text:r.st.name }), { class:'sm', html:r.st.host.split('・')[0] },
        { class:'r', html:NS.f(r.pre, 2) + ' Hz' }, { class:'r', html:NS.f(r.f0, 2) + ' Hz' },
        { class:'r', html:NS.f(r.drift, 1) + ' %' }, { class:'r', html:NS.f(r.pga, 1) + ' gal' },
        Math.abs(r.drift) < 5 ? badge('継続使用可', 'ok') : badge('点検要', 'warn')] };
    })),
     el('div', { class:'note', text:'固有振動数は剛性の平方根に比例するため、低下率は構造的な損傷の指標になる。学校は多くの自治体で避難所に指定されており、地震直後に「この校舎を使ってよいか」を数分で答えられることの意味は大きい。工学部（建築）・理工学部（建築・機械）・生産工学部が担当する。' })])));

  /* ---- 防災科研との連携 ---- */
  NS.add(root, el('div', { style:{ marginTop:'14px' } }, panel('防災科学技術研究所（NIED）の公開データとの突き合わせ',
    { note:'本観測網だけでは閉じない。既存の基盤観測網と突き合わせて初めて検証になる' },
    [NS.niedTable('地震'), el('div', { class:'src', text:NS.niedNote })])));
};

})(NS);
