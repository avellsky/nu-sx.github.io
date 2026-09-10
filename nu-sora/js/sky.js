/* NU-SORA デモ / 全天カメラ 疑似ライブ表示（魚眼・等距離射影）
   恒星位置は実測値（J2000 概略）。雲・流星・衛星軌跡・空の明るさは模擬。 */
'use strict';
(function (NS) {

/* 名前, 赤経(h), 赤緯(°), V等級 */
NS.STARS = [
['シリウス',6.752,-16.716,-1.46],['カノープス',6.399,-52.696,-0.72],['アークトゥルス',14.261,19.182,-0.05],
['ベガ',18.615,38.784,0.03],['カペラ',5.278,45.998,0.08],['リゲル',5.242,-8.202,0.13],
['プロキオン',7.655,5.225,0.34],['アケルナル',1.629,-57.237,0.46],['ベテルギウス',5.919,7.407,0.50],
['ハダル',14.064,-60.373,0.61],['アルタイル',19.846,8.868,0.77],['アクルックス',12.443,-63.099,0.77],
['アルデバラン',4.599,16.509,0.85],['アンタレス',16.490,-26.432,1.09],['スピカ',13.420,-11.161,1.04],
['ポルックス',7.755,28.026,1.14],['フォーマルハウト',22.961,-29.622,1.16],['デネブ',20.690,45.280,1.25],
['ミモザ',12.795,-59.689,1.25],['レグルス',10.140,11.967,1.35],['アダーラ',6.977,-28.972,1.50],
['カストル',7.577,31.888,1.58],['シャウラ',17.560,-37.104,1.62],['ガクルックス',12.519,-57.113,1.63],
['ベラトリックス',5.418,6.350,1.64],['エルナト',5.438,28.608,1.65],['ミアプラキドゥス',9.220,-69.717,1.68],
['アルニラム',5.604,-1.202,1.69],['アルナイル',22.137,-46.961,1.74],['アルニタク',5.679,-1.943,1.74],
['アリオト',12.900,55.960,1.77],['ドゥーベ',11.062,61.751,1.79],['ミルファク',3.405,49.861,1.79],
['ウェズン',7.140,-26.393,1.83],['カウス・アウストラリス',18.403,-34.385,1.85],['アルカイド',13.792,49.313,1.86],
['アヴィオール',8.375,-59.510,1.86],['サルガス',17.622,-42.998,1.87],['メンカリナン',5.992,44.947,1.90],
['アトリア',16.811,-69.028,1.91],['アルヘナ',6.629,16.399,1.93],['ピーコック',20.427,-56.735,1.94],
['アルファルド',9.460,-8.659,1.98],['ミルザム',6.378,-17.956,1.98],['ポラリス',2.530,89.264,1.98],
['アルゲナ',10.333,19.842,2.01],['ハマル',2.120,23.462,2.00],['デネブ・カイトス',0.726,-17.987,2.04],
['サイフ',5.796,-9.670,2.06],['アルフェラッツ',0.140,29.091,2.06],['ヌンキ',18.921,-26.297,2.05],
['ミラク',1.162,35.621,2.05],['メンケント',14.111,-36.370,2.06],['アルフェッカ',15.578,26.715,2.22],
['ミザール',13.399,54.925,2.23],['コカブ',14.845,74.155,2.08],['ラスアルハゲ',17.582,12.560,2.08],
['アルゴル',3.136,40.956,2.12],['アルマク',2.065,42.330,2.10],['デネボラ',11.818,14.572,2.14],
['ツィー',0.945,60.717,2.15],['ナオス',8.060,-40.003,2.21],['スハイル',9.133,-43.433,2.21],
['エルタニン',17.944,51.489,2.23],['シェダル',0.675,56.537,2.23],['サドル',20.371,40.257,2.23],
['カフ',0.153,59.150,2.27],['ミンタカ',5.533,-0.299,2.25],['アルシャイン',19.921,6.407,3.71],
['ラスアルゲティ',17.244,14.390,3.35],['エニフ',21.736,9.875,2.38],['シェアト',23.063,28.083,2.42],
['マルカブ',23.079,15.205,2.48],['アルゲニブ',0.221,15.184,2.83],['ギエナー',20.770,33.970,2.46],
['アルビレオ',19.512,27.960,3.05],['ルクバー',1.430,60.235,2.68],['セギン',1.907,63.670,3.35],
['アルデラミン',21.310,62.586,2.45],['タラゼド',19.771,10.613,2.72],['メラク',11.031,56.382,2.37],
['フェクダ',11.897,53.695,2.44],['メグレズ',12.257,57.033,3.32],['アルゴレム',12.573,-23.397,2.59],
['ジェンマ',15.578,26.715,2.22],['ズベンエルゲヌビ',14.848,-16.042,2.75],['ズベンエスカマリ',15.283,-9.383,2.61],
['アルニヤト',16.353,-25.593,2.89],['ドゥシュバ',15.981,-26.114,2.29],['レサト',17.708,-37.296,2.69],
['カウス・メディア',18.350,-29.828,2.70],['アスケラ',19.078,-21.024,2.60],['アルタルフ',8.275,9.186,3.52],
['アルゴル座β',3.136,40.956,2.12],['プロプス',6.248,22.507,3.31],['メンカル',3.038,4.090,2.53],
['ミラ',2.322,-2.977,3.50],['アルレシャ',2.034,2.764,3.82],['ハトゥサ',0.819,-8.824,3.56],
['アルゲディ',20.294,-12.545,3.57],['ダビ',20.351,-14.781,2.85],['サダルスウド',21.526,-5.571,2.87],
['サダルメリク',22.096,-0.320,2.95],['スカト',22.911,-15.821,3.27],['アルデバランε',4.477,19.180,3.53],
['アルキオネ',3.791,24.105,2.87],['アトラス',3.819,24.053,3.62],['カフ座',0.153,59.150,2.27],
['ヘカ',5.586,9.934,3.39],['タビト',4.831,6.961,3.19],['クルサ',5.131,-5.086,2.79],
['ナイル・アル・サイフ',5.591,-5.910,2.75],['アルヒバ',12.169,-22.620,2.65],['クラズ',12.573,-23.397,2.59],
['ジェンナー',12.263,-17.542,2.94],['ミンカル',12.498,-16.516,2.95],['ラスアルアスド',10.333,19.842,2.01],
['アルジェバ',10.278,23.417,2.37],['ゾスマ',11.235,20.524,2.56],['シェラタン',1.911,20.808,2.64]
];
/* 星座線（星表インデックスの対） */
NS.CONST = [
  { n:'オリオン座', p:[[8,24],[24,25],[24,27],[27,29],[29,5],[5,49],[49,29],[8,26]] },
  { n:'おおぐま座', p:[[31,84],[84,83],[83,86],[86,30],[30,55],[55,35]] },
  { n:'カシオペヤ座', p:[[68,67],[67,80],[80,81],[81,77]] },
  { n:'はくちょう座', p:[[17,66],[66,74],[66,73],[17,75]] },
  { n:'さそり座', p:[[13,90],[90,89],[89,22],[22,88],[88,91]] },
  { n:'こと座・わし座', p:[[3,17],[10,69]] }
];

/* 銀河座標 → 赤道座標（J2000）。標準回転行列の転置 */
var Rg = [[-0.0548755604,0.4941094279,-0.8676661490],
          [-0.8734370902,-0.4448296300,-0.1980763734],
          [-0.4838350155,0.7469822445,0.4559837762]];
function gal2eq(l, b) {
  var lr = l * NS.d2r, br = b * NS.d2r;
  var v = [Math.cos(br) * Math.cos(lr), Math.cos(br) * Math.sin(lr), Math.sin(br)];
  var x = Rg[0][0] * v[0] + Rg[1][0] * v[1] + Rg[2][0] * v[2];
  var y = Rg[0][1] * v[0] + Rg[1][1] * v[1] + Rg[2][1] * v[2];
  var z = Rg[0][2] * v[0] + Rg[1][2] * v[1] + Rg[2][2] * v[2];
  return [((Math.atan2(y, x) * NS.r2d / 15) + 24) % 24, Math.asin(Math.max(-1, Math.min(1, z))) * NS.r2d];
}
/* 天の川の点群（一度だけ生成） */
var MW = null;
function milkyWay() {
  if (MW) return MW;
  MW = [];
  var r = NS.rng('mw');
  for (var i = 0; i < 2400; i++) {
    var l = r() * 360;
    var b = r.norm(0, 7.2);
    var bulge = Math.exp(-Math.pow(((l + 180) % 360 - 180) / 26, 2));
    if (r() > 0.30 + 0.66 * bulge) continue;
    var e = gal2eq(l, b);
    MW.push([e[0], e[1], 0.20 + 0.55 * bulge * r() + 0.2 * r()]);
  }
  return MW;
}

/* 赤道座標 → 地平座標 */
NS.eq2h = function (raH, decDeg, lstDeg, latDeg) {
  var ha = (lstDeg - raH * 15) * NS.d2r, dec = decDeg * NS.d2r, la = latDeg * NS.d2r;
  var sinAlt = Math.sin(dec) * Math.sin(la) + Math.cos(dec) * Math.cos(la) * Math.cos(ha);
  var alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  var az = Math.atan2(-Math.cos(dec) * Math.sin(ha), Math.sin(dec) * Math.cos(la) - Math.cos(dec) * Math.sin(la) * Math.cos(ha));
  return { alt:alt * NS.r2d, az:((az * NS.r2d) + 360) % 360 };
};

/* =============== 全天ビュー =============== */
NS.AllSky = function (station, opts) {
  opts = opts || {};
  var size = opts.size || 420;
  var cv = NS.el('canvas', { class:'allsky', width:size * 2, height:size * 2, style:{ width:'100%', height:'auto' } });
  var A = { node:cv, station:station, running:false, showConst:opts.showConst !== false, showGrid:opts.showGrid !== false,
            speed:opts.speed || 1, meteors:[], sats:[], t0:NS.now(), started:performance.now() };
  var ctx = cv.getContext('2d');
  var CX = size / 2, CY = size / 2, R = size * 0.468;

  function fish(alt, az) {   /* 等距離射影。北が上、東が左 */
    var r = R * (90 - alt) / 90, a = az * NS.d2r;
    return [CX - r * Math.sin(a), CY - r * Math.cos(a)];
  }
  A.fish = fish;

  function draw(nowMs) {
    var t = A.t0 + (nowMs - A.started) * A.speed * (opts.timeScale || 1);
    A.t = t;
    var st = A.station, sb = NS.skyBrightness(st, t), w = sb.w;
    var lst = NS.lst(t, st.lon);
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, size, size);

    /* --- 空の地色（光害ドーム：地平線側が明るい） --- */
    var night = w.sunAlt < -12, dusk = w.sunAlt >= -12 && w.sunAlt < 0;
    var lp = Math.max(0, Math.min(1, (21.9 - st.sqm) / 4.2));
    var g = ctx.createRadialGradient(CX, CY, 0, CX, CY, R);
    if (night) {
      g.addColorStop(0, 'rgb(' + Math.round(6 + 20 * lp) + ',' + Math.round(9 + 22 * lp) + ',' + Math.round(20 + 26 * lp) + ')');
      g.addColorStop(0.62, 'rgb(' + Math.round(10 + 42 * lp) + ',' + Math.round(13 + 40 * lp) + ',' + Math.round(26 + 40 * lp) + ')');
      g.addColorStop(1, 'rgb(' + Math.round(20 + 96 * lp) + ',' + Math.round(22 + 78 * lp) + ',' + Math.round(34 + 54 * lp) + ')');
    } else if (dusk) {
      g.addColorStop(0, '#1b2b4a'); g.addColorStop(0.6, '#3b4a6b'); g.addColorStop(1, '#8a6a58');
    } else {
      g.addColorStop(0, '#4b7fbd'); g.addColorStop(0.6, '#7ba5d0'); g.addColorStop(1, '#c3d4e4');
    }
    ctx.beginPath(); ctx.arc(CX, CY, R, 0, 7); ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, R, 0, 7); ctx.clip();

    var vis = night ? 1 : dusk ? Math.max(0, (-w.sunAlt) / 12) : 0;
    var limMag = night ? (st.sqm - 15.6) : 1.2;   /* 眼視限界等級の代用 */

    /* --- 天の川 --- */
    if (vis > 0.2) {
      milkyWay().forEach(function (p) {
        var h = NS.eq2h(p[0], p[1], lst, st.lat);
        if (h.alt < 2) return;
        var xy = fish(h.alt, h.az);
        var a = p[2] * vis * (0.30 + 0.5 * (1 - lp)) * (1 - w.cloud * 0.85);
        if (a <= 0.01) return;
        ctx.fillStyle = 'rgba(214,222,240,' + a.toFixed(3) + ')';
        ctx.fillRect(xy[0], xy[1], 1.25, 1.25);
      });
    }
    /* --- 星座線 --- */
    if (A.showConst && vis > 0.4) {
      ctx.strokeStyle = 'rgba(120,170,225,' + (0.30 * vis).toFixed(2) + ')'; ctx.lineWidth = 0.7;
      NS.CONST.forEach(function (c) {
        c.p.forEach(function (pr) {
          var s1 = NS.STARS[pr[0]], s2 = NS.STARS[pr[1]];
          if (!s1 || !s2) return;
          var h1 = NS.eq2h(s1[1], s1[2], lst, st.lat), h2 = NS.eq2h(s2[1], s2[2], lst, st.lat);
          if (h1.alt < 4 || h2.alt < 4) return;
          var a = fish(h1.alt, h1.az), b = fish(h2.alt, h2.az);
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        });
      });
    }
    /* --- 恒星 --- */
    var tw = NS.rng('tw' + Math.floor(nowMs / 90));
    NS.STARS.forEach(function (s, i) {
      if (s[3] > limMag) return;
      var h = NS.eq2h(s[1], s[2], lst, st.lat);
      if (h.alt < 1.2) return;
      var xy = fish(h.alt, h.az);
      var ext = 0.28 / Math.max(0.13, Math.sin(Math.max(3, h.alt) * NS.d2r));  /* 大気減光 */
      var m = s[3] + ext;
      var br = Math.max(0, Math.min(1, (limMag - m) / 3.4)) * vis * (1 - w.cloud * 0.9);
      if (br <= 0.02) return;
      var rr = 0.55 + 2.5 * Math.pow(br, 1.5);
      var scin = 1 - 0.24 * (1 - Math.sin(h.alt * NS.d2r)) * tw();
      ctx.beginPath(); ctx.arc(xy[0], xy[1], rr, 0, 7);
      ctx.fillStyle = 'rgba(255,253,246,' + (br * scin).toFixed(3) + ')'; ctx.fill();
      if (rr > 2.0) {
        ctx.beginPath(); ctx.arc(xy[0], xy[1], rr * 2.6, 0, 7);
        ctx.fillStyle = 'rgba(210,225,255,' + (0.14 * br).toFixed(3) + ')'; ctx.fill();
      }
    });
    /* --- 太陽（昼間・薄明） --- */
    if (w.sunAlt > -6) {
      var sAz = ((180 + (NS.jstParts(t).h + NS.jstParts(t).mi / 60 - 12 + (st.lon - 135) / 15) * 15) % 360 + 360) % 360;
      var sxy = fish(Math.max(0, w.sunAlt), sAz);
      var sg = ctx.createRadialGradient(sxy[0], sxy[1], 1, sxy[0], sxy[1], R * 0.30);
      sg.addColorStop(0, 'rgba(255,248,220,0.85)'); sg.addColorStop(0.25, 'rgba(255,236,190,0.30)');
      sg.addColorStop(1, 'rgba(255,236,190,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sxy[0], sxy[1], R * 0.30, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(sxy[0], sxy[1], R * 0.022, 0, 7); ctx.fillStyle = 'rgba(255,253,244,0.95)'; ctx.fill();
    }
    /* --- 月 --- */
    var mAlt = NS.moonAlt(t, st.lat, st.lon), ill = NS.moonIllum(t);
    if (mAlt > 0.5) {
      var mAz = ((NS.lst(t, st.lon) - NS.moonPhase(t) * 360 + 180) % 360 + 360) % 360;
      var mxy = fish(mAlt, mAz);
      var gr = ctx.createRadialGradient(mxy[0], mxy[1], 1, mxy[0], mxy[1], 30);
      gr.addColorStop(0, 'rgba(255,250,232,' + (0.5 * ill * vis).toFixed(2) + ')');
      gr.addColorStop(1, 'rgba(255,250,232,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(mxy[0], mxy[1], 30, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(mxy[0], mxy[1], 4.6, 0, 7);
      ctx.fillStyle = 'rgba(255,251,236,' + (0.35 + 0.6 * ill).toFixed(2) + ')'; ctx.fill();
    }
    /* --- 雲 --- */
    if (w.cloud > 0.04) {
      var cr = NS.rng(st.id + 'cl' + Math.floor(t / 3600e3));
      var n = Math.round(3 + w.cloud * 10);
      var drift = (t / 1000) * 0.0016 * (1 + w.wind / 6);
      for (var i2 = 0; i2 < n; i2++) {
        var ang = cr() * 6.283 + drift * (0.6 + cr() * 0.9);
        var rad = Math.pow(cr(), 0.55) * R * 1.05;
        var cx = CX + rad * Math.cos(ang), cy = CY + rad * Math.sin(ang);
        var rr2 = R * (0.13 + 0.30 * cr()) * (0.55 + w.cloud);
        var cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr2);
        var lum = night ? Math.round(46 + 120 * lp) : 210;
        var op = Math.min(0.94, w.cloud * (0.42 + 0.5 * cr()));
        cg.addColorStop(0, 'rgba(' + lum + ',' + lum + ',' + (lum + 8) + ',' + op.toFixed(2) + ')');
        cg.addColorStop(1, 'rgba(' + lum + ',' + lum + ',' + (lum + 8) + ',0)');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, rr2, 0, 7); ctx.fill();
      }
    }
    /* --- 流星・人工衛星 --- */
    if (night && w.cloud < 0.9) {
      if (Math.random() < 0.011 * A.speed) A.meteors.push(newMeteor());
      if (Math.random() < 0.004 * A.speed) A.sats.push(newSat());
    }
    A.meteors = A.meteors.filter(function (m2) {
      m2.age += 1 / 60 * A.speed;
      if (m2.age > m2.life) return false;
      var f = m2.age / m2.life;
      var a0 = fish(m2.alt0 + (m2.alt1 - m2.alt0) * Math.max(0, f - 0.30), m2.az0 + (m2.az1 - m2.az0) * Math.max(0, f - 0.30));
      var a1 = fish(m2.alt0 + (m2.alt1 - m2.alt0) * f, m2.az0 + (m2.az1 - m2.az0) * f);
      var lum2 = Math.sin(Math.PI * Math.min(1, f * 1.05)) * m2.bright;
      var gl = ctx.createLinearGradient(a0[0], a0[1], a1[0], a1[1]);
      gl.addColorStop(0, 'rgba(150,190,255,0)');
      gl.addColorStop(1, 'rgba(255,248,228,' + Math.min(1, lum2).toFixed(2) + ')');
      ctx.strokeStyle = gl; ctx.lineWidth = 0.9 + 2.4 * m2.bright; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.stroke();
      if (m2.bright > 0.8) {
        ctx.beginPath(); ctx.arc(a1[0], a1[1], 2 + 5 * lum2, 0, 7);
        ctx.fillStyle = 'rgba(255,244,214,' + (0.35 * lum2).toFixed(2) + ')'; ctx.fill();
      }
      if (m2.bright > 0.8 && !m2.logged) { m2.logged = true; A.lastFlash = { t:t, mag:-(1 + m2.bright * 8) }; }
      return true;
    });
    A.sats = A.sats.filter(function (s2) {
      s2.age += 1 / 60 * A.speed;
      if (s2.age > s2.life) return false;
      var f = s2.age / s2.life;
      var p = fish(s2.alt0 + (s2.alt1 - s2.alt0) * f, s2.az0 + (s2.az1 - s2.az0) * f);
      ctx.beginPath(); ctx.arc(p[0], p[1], 1.1, 0, 7);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.55 * Math.sin(Math.PI * f)).toFixed(2) + ')'; ctx.fill();
      return true;
    });
    ctx.restore();

    /* --- 目盛・方位 --- */
    if (A.showGrid) {
      ctx.strokeStyle = 'rgba(190,205,225,0.22)'; ctx.lineWidth = 0.6;
      [30, 60].forEach(function (alt) {
        ctx.beginPath(); ctx.arc(CX, CY, R * (90 - alt) / 90, 0, 7); ctx.stroke();
      });
      ctx.setLineDash([2, 4]);
      for (var az = 0; az < 360; az += 45) {
        var e = fish(0, az);
        ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(e[0], e[1]); ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = 'rgba(150,165,190,0.55)'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(CX, CY, R, 0, 7); ctx.stroke();
    ctx.font = '600 11px "Zen Kaku Gothic New", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(226,232,242,0.8)';
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(function (c) {
      var p = fish(-4.6, c[1]); ctx.fillText(c[0], p[0], p[1]);
    });
    /* --- オーバーレイ情報 --- */
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = '11px ui-monospace, "SFMono-Regular", monospace';
    ctx.fillStyle = 'rgba(232,238,248,0.92)';
    ctx.fillText(st.id + ' ' + st.name + '  ' + NS.fmtJST(t) + ' JST', 8, 7);
    ctx.fillStyle = 'rgba(200,212,230,0.75)';
    ctx.fillText('SQM ' + (sb.mag == null ? '— (薄明)' : NS.f(sb.mag, 2) + ' mag/arcsec²') +
      '   雲量 ' + Math.round(w.cloud * 100) + '%   限界等級 ' + (night ? NS.f(limMag, 1) : '—'), 8, 22);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('模擬映像（デモ）', size - 8, 7);

    if (A.running) requestAnimationFrame(draw);
  }
  function newMeteor() {
    var r = NS.rng(Math.random() * 1e9);
    var az0 = r() * 360, alt0 = 12 + r() * 66;
    var dir = r() * 6.283, len = 6 + r() * 40;
    var b = Math.pow(r(), 3.2);
    return { az0:az0, alt0:alt0, az1:az0 + Math.cos(dir) * len * 1.7, alt1:Math.max(0, alt0 - Math.abs(Math.sin(dir)) * len),
             age:0, life:0.28 + r() * 0.9 + b * 1.6, bright:0.18 + b * 0.95, logged:false };
  }
  function newSat() {
    var r = NS.rng(Math.random() * 1e9);
    var az0 = r() * 360;
    return { az0:az0, alt0:6 + r() * 20, az1:az0 + (r() > 0.5 ? 150 : -150), alt1:6 + r() * 76, age:0, life:9 + r() * 8 };
  }
  A.start = function () { if (A.running) return; A.running = true; A.started = performance.now(); requestAnimationFrame(draw); };
  A.stop = function () { A.running = false; };
  A.render = function () { draw(performance.now()); };
  return A;
};

})(NS);
