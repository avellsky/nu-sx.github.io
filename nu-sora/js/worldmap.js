/* NU-SORA デモ / 地球図（メルカトル図法）と、再突入体の軌道フィッティング
   観測から得られるのは「いつ・どこを・どの向きに・どれだけの速さで」通ったかである。
   そこから軌道傾斜角を逆算し、公開カタログの候補と突き合わせてどの物体かを絞り込む。 */
'use strict';
(function (NS) {
var el = NS.el, s = NS.s, D2R = Math.PI / 180, R2D = 180 / Math.PI;

NS.RE_KM = 6378.137;                     /* 地球赤道半径 km */
NS.MU_E  = 398600.4418;                  /* 地心重力定数 km³/s² */
NS.OMEGA_E = 7.2921159e-5;               /* 地球の自転角速度 rad/s */

/* 円軌道の周期（秒） */
NS.orbPeriod = function (altKm) {
  var a = NS.RE_KM + altKm;
  return 2 * Math.PI * Math.sqrt(a * a * a / NS.MU_E);
};
/* 円軌道の速度（km/s） */
NS.orbSpeed = function (altKm) { return Math.sqrt(NS.MU_E / (NS.RE_KM + altKm)); };

/* 緯度 φ を通るときの地上軌跡の方位。軌道傾斜角 i から 2 つ（上昇・下降）出る。
   球面三角法：cos i = sin β · cos φ 。|cos i| > cos φ なら その緯度には届かない。 */
NS.trackHeadings = function (iDeg, latDeg) {
  var ci = Math.cos(iDeg * D2R), cf = Math.cos(latDeg * D2R);
  if (Math.abs(ci) > cf) return null;              /* この緯度には到達できない */
  var b = Math.asin(ci / cf) * R2D;                /* 上昇パス（北向き成分） */
  return [ (b + 360) % 360, (180 - b + 360) % 360 ];
};
/* 観測した方位と緯度から軌道傾斜角を逆算する */
NS.incFromHeading = function (azDeg, latDeg) {
  var v = Math.sin(azDeg * D2R) * Math.cos(latDeg * D2R);
  return Math.acos(Math.max(-1, Math.min(1, v))) * R2D;
};

/* 地上軌跡。u0 は基準時刻での緯度引数、lon0 はそのときの経度。 */
NS.groundTrack = function (o) {
  var per = NS.orbPeriod(o.alt), i = o.inc * D2R;
  var out = [], n = o.n || 720, span = o.span || per * 1.05;
  for (var k = 0; k <= n; k++) {
    var dt = -span / 2 + span * k / n;
    var u = o.u0 + 2 * Math.PI * dt / per;
    var lat = Math.asin(Math.sin(i) * Math.sin(u)) * R2D;
    var dlon = Math.atan2(Math.cos(i) * Math.sin(u), Math.cos(u))
             - Math.atan2(Math.cos(i) * Math.sin(o.u0), Math.cos(o.u0));
    var lon = o.lon0 + dlon * R2D - NS.OMEGA_E * dt * R2D;
    lon = ((lon + 180) % 360 + 360) % 360 - 180;
    out.push({ dt:dt, lat:lat, lon:lon });
  }
  return out;
};
/* 観測した点・時刻・方位を通る軌跡を作る（u0 を緯度から決める） */
NS.trackThrough = function (inc, alt, lat, lon, az, span) {
  var i = inc * D2R;
  var su = Math.sin(lat * D2R) / Math.sin(i);
  su = Math.max(-1, Math.min(1, su));
  var u0 = Math.asin(su);
  /* 方位が北向き成分を持たない（下降パス）なら u を補角にする */
  var h = NS.trackHeadings(inc, lat);
  if (h && Math.abs(((az - h[1] + 540) % 360) - 180) < Math.abs(((az - h[0] + 540) % 360) - 180)) u0 = Math.PI - u0;
  return NS.groundTrack({ inc:inc, alt:alt, u0:u0, lon0:lon, span:span || NS.orbPeriod(alt) * 0.62 });
};

/* =========================================================================
   メルカトル図法の世界図
   ========================================================================= */
var MW = 1000, MH = 640, LAT_MAX = 78;
function my(lat) {
  var l = Math.max(-LAT_MAX, Math.min(LAT_MAX, lat));
  var m = Math.log(Math.tan(Math.PI / 4 + l * D2R / 2));
  var mMax = Math.log(Math.tan(Math.PI / 4 + LAT_MAX * D2R / 2));
  return MH / 2 - m / mMax * (MH / 2);
}
function mx(lon) { return (lon + 180) / 360 * MW; }
NS.mercXY = function (lon, lat) { return [mx(lon), my(lat)]; };

NS.WorldMercator = function (opts) {
  opts = opts || {};
  var svg = s('svg', { viewBox:'0 0 ' + MW + ' ' + MH, class:'wmap', preserveAspectRatio:'xMidYMid meet' });
  NS.add(svg, s('rect', { x:0, y:0, width:MW, height:MH, class:'w-sea' }));
  var gGrid = s('g', { class:'w-grid' }), gLand = s('g', { class:'w-land' }), gOv = s('g', { class:'w-ov' });
  NS.add(svg, [gGrid, gLand, gOv]);

  /* 経緯線 */
  for (var la = -60; la <= 60; la += 30) {
    NS.add(gGrid, s('line', { x1:0, x2:MW, y1:my(la), y2:my(la), class:'gl' }));
    NS.add(gGrid, s('text', { x:4, y:my(la) - 3, class:'gt', text:(la > 0 ? '+' : '') + la + '°' }));
  }
  for (var lo = -150; lo <= 150; lo += 30) {
    NS.add(gGrid, s('line', { x1:mx(lo), x2:mx(lo), y1:0, y2:MH, class:'gl' }));
    NS.add(gGrid, s('text', { x:mx(lo) + 3, y:MH - 5, class:'gt', text:lo + '°' }));
  }
  NS.add(gGrid, s('line', { x1:0, x2:MW, y1:my(0), y2:my(0), class:'gl eq' }));

  /* 陸地。日付変更線をまたぐ環（ユーラシアなど）は経度を連続に展開してから描き、
     はみ出したぶんを ±360° ずらしてもう一度描くことで、横に走る筋が出ないようにする。 */
  (window.GEO_WORLD || []).forEach(function (ring) {
    var lon = [], lat = [], prev = ring[0][0], acc = 0;
    for (var i = 0; i < ring.length; i++) {
      var v = ring[i][0];
      if (i > 0) {
        var d0 = v - prev;
        if (d0 > 180) acc -= 360; else if (d0 < -180) acc += 360;
      }
      lon.push(v + acc); lat.push(ring[i][1]); prev = v;
    }
    var lo = Math.min.apply(null, lon), hi = Math.max.apply(null, lon);
    var shifts = [0];
    if (hi > 180) shifts.push(-360);
    if (lo < -180) shifts.push(360);
    shifts.forEach(function (sh) {
      var d = '';
      for (var j = 0; j < lon.length; j++) {
        var p = NS.mercXY(lon[j] + sh, lat[j]);
        d += (j ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
      }
      NS.add(gLand, s('path', { d:d + 'Z', class:'w-l' }));
    });
  });

  var M = { node:el('div', { class:'wmapwrap' }, svg), svg:svg, ov:gOv };
  M.clear = function () { NS.clear(gOv); };
  M.pt = function (lon, lat) { return NS.mercXY(lon, lat); };
  /* 日付変更線をまたぐところで折れ線を切る */
  M.track = function (pts, attrs) {
    var segs = [[]], prev = null;
    pts.forEach(function (p) {
      if (prev !== null && Math.abs(p.lon - prev) > 180) segs.push([]);
      segs[segs.length - 1].push(p); prev = p.lon;
    });
    var out = [];
    segs.forEach(function (seg) {
      if (seg.length < 2) return;
      var d = seg.map(function (p, i) {
        var q = NS.mercXY(p.lon, p.lat);
        return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1);
      }).join('');
      out.push(NS.add(gOv, s('path', Object.assign({ d:d, fill:'none', 'vector-effect':'non-scaling-stroke' }, attrs))));
    });
    return out;
  };
  M.mark = function (lon, lat, attrs) {
    var q = NS.mercXY(lon, lat);
    return NS.add(gOv, s('circle', Object.assign({ cx:q[0], cy:q[1], r:4 }, attrs)));
  };
  M.label = function (lon, lat, text, attrs) {
    var q = NS.mercXY(lon, lat);
    return NS.add(gOv, s('text', Object.assign({ x:q[0] + 7, y:q[1] + 3.5, class:'w-lbl', text:text }, attrs)));
  };
  return M;
};

/* =========================================================================
   軌道フィッティング
   ========================================================================= */
/* 観測量（時刻・位置・方位・速度）と候補カタログを突き合わせ、残差で順位づけする。
   決め手は方位で、緯度 φ を方位 β で横切れる軌道傾斜角は cos i = sin β cos φ に限られる。 */
NS.fitDebris = function (e, cands) {
  var lat = e.begin.lat, lon = e.begin.lon;
  var incObs = NS.incFromHeading(e.azimuth, lat);
  return cands.map(function (c) {
    var h = NS.trackHeadings(c.inc, lat);
    var dAz = h === null ? 999 : Math.min(
      Math.abs(((e.azimuth - h[0] + 540) % 360) - 180),
      Math.abs(((e.azimuth - h[1] + 540) % 360) - 180));
    var dInc = Math.abs(c.inc - incObs);
    var dT = (c.t - e.t) / 60000;                       /* 分 */
    var dV = Math.abs(NS.orbSpeed(c.alt) - e.vInf);
    /* 重み：方位 3°、時刻 20 分、速度 0.15 km/s を 1σ とする */
    var chi2 = Math.pow(dAz / 3, 2) + Math.pow(dT / 20, 2) + Math.pow(dV / 0.15, 2);
    return { c:c, dAz:dAz, dInc:dInc, dT:dT, dV:dV, chi2:chi2, reach:h !== null };
  }).sort(function (a, b) { return a.chi2 - b.chi2; });
};

NS.debrisTrackPanel = function (e, go) {
  var kpi = NS.kpi, panel = NS.panel, badge = NS.badge, f = NS.f;
  var lat = e.begin.lat, lon = e.begin.lon;
  var incObs = NS.incFromHeading(e.azimuth, lat);
  var altObs = 78.4;                                   /* 発光開始高度。軌道高度の下限にあたる */
  var cands = NS.DEBRIS_CANDIDATES;
  var fit = NS.fitDebris(e, cands);
  var best = fit[0];

  var M = NS.WorldMercator();
  var COL = ['var(--accent)', 'var(--c-info)', 'var(--c-ok)', 'var(--c-warn)', 'var(--c-sky)'];

  /* 候補の地上軌跡（当てはまりの悪いものほど薄く） */
  fit.slice().reverse().forEach(function (r, k) {
    var rank = fit.length - 1 - k;
    if (!r.reach) return;
    var tr = NS.trackThrough(r.c.inc, r.c.alt, lat, lon, e.azimuth, NS.orbPeriod(r.c.alt) * 1.0);
    M.track(tr, { stroke:rank === 0 ? 'var(--accent)' : 'var(--muted)',
      'stroke-width':rank === 0 ? 2.2 : 1, 'stroke-dasharray':rank === 0 ? null : '4 4',
      opacity:rank === 0 ? 1 : 0.32 });
  });
  /* 観測点・観測局 */
  NS.STATIONS.forEach(function (st) {
    M.mark(st.lon, st.lat, { r:2.2, fill:'var(--c-s)', 'fill-opacity':0.9 });
  });
  M.track([e.begin, e.end], { stroke:'var(--c-crit)', 'stroke-width':3.4 });
  M.mark(lon, lat, { r:5, fill:'none', stroke:'var(--c-crit)', 'stroke-width':2 });
  M.label(lon, lat, '発光開始', { fill:'var(--c-crit)' });

  var trBest = NS.trackThrough(best.c.inc, best.c.alt, lat, lon, e.azimuth, NS.orbPeriod(best.c.alt));
  var per = NS.orbPeriod(best.c.alt);

  return [
    panel('地球上の推定軌道（メルカトル図法）', {
      note:'赤の太線が観測した発光区間、赤の細線が最も当てはまる候補の地上軌跡。灰の破線は他の候補。青点は観測局',
      tools:badge('軌道傾斜角 ' + f(incObs, 1) + '° と推定', 'info') }, [
      M.node,
      NS.chart.legend([['観測した発光区間', 'var(--c-crit)', 'line'], ['最良候補の地上軌跡', 'var(--accent)', 'line'],
                       ['他の候補', 'var(--muted)', 'dash'], ['観測局', 'var(--c-s)', 'dot']]),
      el('div', { class:'grid g4', style:{ marginTop:'10px' } }, [
        kpi('推定 軌道傾斜角', f(incObs, 1), '°', '観測した方位 ' + f(e.azimuth, 1) + '° と緯度 ' + f(lat, 2) + '° から', { acc:true }),
        kpi('推定 軌道周期', f(per / 60, 1), '分', '高度 ' + best.c.alt + ' km の円軌道として'),
        kpi('推定 軌道速度', f(NS.orbSpeed(best.c.alt), 2), 'km/s', '観測値 ' + f(e.vInf, 2) + ' km/s との差 ' + f(best.dV, 2)),
        kpi('1 周で西へずれる量', f(per * NS.OMEGA_E * 180 / Math.PI, 1), '°', '地球の自転による。軌跡が周回ごとに西へ移る')
      ]),
      el('div', { class:'note', html:'地上軌跡の向きと緯度だけで軌道傾斜角が決まる。球面三角法から '
        + '<b>cos i = sin β · cos φ</b>（β＝方位、φ＝緯度）で、観測した β = ' + f(e.azimuth, 1) + '°・φ = ' + f(lat, 2) + '° を入れると '
        + '<b>i = ' + f(incObs, 1) + '°</b> となる。90° を超えるので<b>逆行軌道</b>である。'
        + 'この 1 点だけで、順行軌道の候補はすべて除外できる。' })
    ]),
    panel('推定されるデブリ（衛星）とのフィッティング', {
      note:'公開カタログの候補と、観測量（方位・時刻・速度）の残差を比べる。χ² が小さいほど当てはまりが良い',
      tools:badge('最良候補：' + best.c.name, 'ok') },
      [NS.table(['順位', '候補', 'NORAD / COSPAR', '軌道傾斜角', '到達可否', 'Δ方位', 'Δ時刻', 'Δ速度', 'χ²', '判定'],
        fit.map(function (r, i2) {
          return { attrs:{ class:i2 === 0 ? 'on' : '' }, cells:[
            { class:'r mono', html:String(i2 + 1) },
            el('b', { text:r.c.name }),
            { class:'mono sm', html:r.c.norad + '<br>' + r.c.cospar },
            { class:'r mono', html:f(r.c.inc, 1) + '°' },
            r.reach ? badge('可', 'ok') : badge('この緯度に届かない', 'warn'),
            { class:'r mono', html:r.reach ? f(r.dAz, 1) + '°' : '—' },
            { class:'r mono', html:(r.dT >= 0 ? '+' : '') + f(r.dT, 1) + ' 分' },
            { class:'r mono', html:f(r.dV, 2) + ' km/s' },
            { class:'r mono', html:r.reach ? f(r.chi2, 1) : '—' },
            i2 === 0 ? badge('同定', 'crit') : '<span class="hint">除外</span>'
          ] };
        })),
      NS.kv([
        ['同定した物体', '<b>' + best.c.name + '</b>（' + best.c.norad + ' / ' + best.c.cospar + '・' + best.c.type + '）'],
        ['質量', best.c.mass + ' kg'],
        ['決め手', '方位から求めた軌道傾斜角が ' + f(incObs, 1) + '° の逆行軌道で、順行の候補（43 – 98°）はいずれもこの向きに横切れない'],
        ['時刻の一致', '再突入予報との差 ' + f(Math.abs(best.dT), 1) + ' 分（予報窓 ± ' + e.predict.windowMin + ' 分の内側）'],
        ['速度の一致', '円軌道速度 ' + f(NS.orbSpeed(best.c.alt), 2) + ' km/s に対し観測 ' + f(e.vInf, 2) + ' km/s（差 ' + f(best.dV, 2) + '）'],
        ['残差の重み', '方位 3°・時刻 20 分・速度 0.15 km/s を 1σ として χ² を計算した']
      ], 'wide'),
      el('div', { class:'note', text:'この手順は、光学観測だけで軌道要素の一部を独立に決められることを示している。'
        + '公開カタログに載っていない物体でも、方位と緯度から軌道傾斜角が、周回ごとの西へのずれから周期が出るので、'
        + '「カタログのどれでもない」という結論自体を根拠つきで出せる。結果は JAXA 宇宙状況把握（SSA）へ共有する。' }),
      el('div', { class:'src', text:'海岸線は Natural Earth 110m（public domain）。軌道は円軌道近似で、'
        + '球面三角法（cos i = sin β cos φ）と地球の自転（15.04°/時）から地上軌跡を求めている。'
        + '候補カタログはデモ用の仮想の物体で、実在の衛星ではない。' })]
    )
  ];
};

})(NS);
