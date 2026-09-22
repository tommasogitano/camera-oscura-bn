/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Camera Oscura BN — matematica delle curve tonali.
   Interpolazione cubica monotona (Fritsch-Carlson): non genera
   sovraelongazioni, quindi la curva non "rimbalza" fra i punti. */
(function (global) {
  "use strict";
  var BN = global.BN || (global.BN = {});
  var U = BN.util;

  function ordina(punti) {
    return punti.slice().sort(function (a, b) { return a[0] - b[0]; });
  }

  /* Costruisce una funzione f(x) su punti [[x,y], ...] con x e y in 0..255. */
  function interpolatore(punti) {
    var p = ordina(punti);
    var n = p.length;
    if (n === 0) return function (x) { return x; };
    if (n === 1) return function () { return p[0][1]; };

    var xs = [], ys = [];
    for (var i = 0; i < n; i++) {
      if (i > 0 && p[i][0] === xs[xs.length - 1]) continue; // scarta x duplicate
      xs.push(p[i][0]); ys.push(p[i][1]);
    }
    n = xs.length;
    if (n < 2) return function () { return ys[0]; };

    var dx = [], dy = [], m = [];
    for (var k = 0; k < n - 1; k++) {
      dx.push(xs[k + 1] - xs[k]);
      dy.push(ys[k + 1] - ys[k]);
      m.push(dy[k] / dx[k]);
    }

    var c1 = [m[0]];
    for (var j = 0; j < n - 2; j++) {
      var mA = m[j], mB = m[j + 1];
      if (mA * mB <= 0) {
        c1.push(0);
      } else {
        var dA = dx[j], dB = dx[j + 1], comune = dA + dB;
        c1.push(3 * comune / ((comune + dB) / mA + (comune + dA) / mB));
      }
    }
    c1.push(m[n - 2]);

    return function (x) {
      if (x <= xs[0]) return ys[0];
      if (x >= xs[n - 1]) return ys[n - 1];
      var lo = 0, hi = n - 1;
      while (hi - lo > 1) {
        var mid = (lo + hi) >> 1;
        if (xs[mid] > x) hi = mid; else lo = mid;
      }
      var h = xs[lo + 1] - xs[lo], t = (x - xs[lo]) / h;
      var t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[lo]
           + (t3 - 2 * t2 + t) * h * c1[lo]
           + (-2 * t3 + 3 * t2) * ys[lo + 1]
           + (t3 - t2) * h * c1[lo + 1];
    };
  }

  /* Curva a S per il contrasto: forza -100..100. */
  function contrastoS(x, forza) {
    if (!forza) return x;
    var t = x / 255;
    var k = forza / 100;
    var s;
    if (k >= 0) {
      // smoothstep: sigmoide ancorata a 0 e 1, sempre monotona
      var sm = t * t * (3 - 2 * t);
      s = t + k * (sm - t);
    } else {
      // riduzione di contrasto: avvicinamento controllato al grigio medio
      s = 0.5 + (t - 0.5) * (1 + k * 0.7);
    }
    return U.clamp(s, 0, 1) * 255;
  }

  /* Punto di nero e di bianco piu gamma (come i Livelli di Photoshop). */
  function livelli(x, nero, bianco, gamma) {
    var d = Math.max(1, bianco - nero);
    var t = U.clamp((x - nero) / d, 0, 1);
    if (gamma && gamma !== 1) t = Math.pow(t, 1 / gamma);
    return t * 255;
  }

  /* Esaltazione dei neri: comprime e approfondisce solo la coda bassa,
     senza toccare i mezzitoni. quantita 0..100. */
  function esaltaNeri(x, quantita) {
    if (!quantita) return x;
    var k = quantita / 100;
    var t = x / 255;
    var peso = Math.pow(Math.max(0, 1 - t / 0.45), 2); // attivo solo sotto lo zona IV
    var spinta = t * (1 - 0.55 * k);
    return U.clamp(t * (1 - peso) + spinta * peso, 0, 1) * 255;
  }

  /* Esaltazione dei bianchi: allunga la coda alta verso il bianco carta. */
  function esaltaBianchi(x, quantita) {
    if (!quantita) return x;
    var k = quantita / 100;
    var t = x / 255;
    var peso = Math.pow(Math.max(0, (t - 0.55) / 0.45), 2);
    var spinta = t + (1 - t) * 0.55 * k;
    return U.clamp(t * (1 - peso) + spinta * peso, 0, 1) * 255;
  }

  /* Luminosita generale: potenza sulla scala 0..1, estremi fermi.
     valore -100..100; positivo schiarisce. */
  function luminosita(x, valore) {
    if (!valore) return x;
    var e = Math.pow(2, -U.clamp(valore, -100, 100) / 100 * 0.9);
    return Math.pow(U.clamp(x / 255, 0, 1), e) * 255;
  }

  /* Campana liscia su [a, b], nulla fuori: pesa una fascia tonale. */
  function campana(t, a, b) {
    if (t <= a || t >= b) return 0;
    var s = Math.sin(Math.PI * (t - a) / (b - a));
    return s * s;
  }

  var FASCE = { ombre: [0, 0.55], mezzitoni: [0.2, 0.8], luci: [0.45, 1] };

  /* Peso di ciascuna fascia per un valore 0..1: serve anche alle maschere. */
  function pesoFascia(nome, t) {
    var f = FASCE[nome];
    return f ? campana(t, f[0], f[1]) : 0;
  }

  /* Luminosita per fascia: ombre, mezzitoni e alte luci, -100..100 ciascuna.
     L'ampiezza massima (0.15) tiene la curva sempre crescente. */
  function luminositaFasce(x, ombre, mezzi, luci) {
    if (!ombre && !mezzi && !luci) return x;
    var t = x / 255;
    var d = (ombre || 0) / 100 * 0.15 * pesoFascia("ombre", t)
          + (mezzi || 0) / 100 * 0.15 * pesoFascia("mezzitoni", t)
          + (luci || 0) / 100 * 0.15 * pesoFascia("luci", t);
    return U.clamp(t + d, 0, 1) * 255;
  }

  /* Contrasto morbido: agisce sui mezzitoni lasciando quasi intatti gli estremi.
     valore -100..100. */
  function contrastoMorbido(x, valore) {
    if (!valore) return x;
    var t = x / 255;
    var k = U.clamp(valore, -100, 100) / 100;
    return U.clamp(t - k * 0.055 * Math.sin(2 * Math.PI * t), 0, 1) * 255;
  }

  /* Protezione tonale: riporta verso il valore di partenza le ombre e le
     alte luci che le regolazioni hanno spinto verso il taglio. 0..100. */
  function protezione(y, riferimento, ombre, luci) {
    var t = riferimento / 255;
    if (luci) {
      var wl = U.clamp((t - 0.6) / 0.4, 0, 1);
      wl = wl * wl * (3 - 2 * wl) * U.clamp(luci, 0, 100) / 100;
      if (y > riferimento) y = y + (riferimento - y) * wl;
    }
    if (ombre) {
      var wo = U.clamp((0.4 - t) / 0.4, 0, 1);
      wo = wo * wo * (3 - 2 * wo) * U.clamp(ombre, 0, 100) / 100;
      if (y < riferimento) y = y + (riferimento - y) * wo;
    }
    return y;
  }

  /* Compone tutte le regolazioni tonali in una singola funzione 0..255. */
  function funzioneTono(tono) {
    var f = interpolatore(tono.curva && tono.curva.length >= 2 ? tono.curva : [[0, 0], [255, 255]]);
    return function (x) {
      var v = livelli(x, tono.neroInput || 0, tono.biancoInput == null ? 255 : tono.biancoInput, tono.gamma || 1);
      var riferimento = v;
      v = luminosita(v, tono.luminosita || 0);
      v = luminositaFasce(v, tono.lumOmbre, tono.lumMezzitoni, tono.lumLuci);
      v = contrastoS(v, tono.contrasto || 0);
      v = contrastoMorbido(v, tono.contrastoMorbido || 0);
      v = esaltaNeri(v, tono.esaltaNeri || 0);
      v = esaltaBianchi(v, tono.esaltaBianchi || 0);
      v = f(v);
      v = protezione(v, riferimento, tono.protezioneOmbre || 0, tono.protezioneLuci || 0);
      return U.clamp(v, 0, 255);
    };
  }

  /* Campiona la funzione tonale in N punti di controllo monotoni in x,
     pronti per il livello Curve di Photoshop (massimo 16 punti). */
  function puntiPerPhotoshop(tono, n) {
    var tab = tabella(tono);
    n = Math.max(2, Math.min(16, n || 12));
    var punti = [];
    for (var i = 0; i < n; i++) {
      var x = Math.round(i * 255 / (n - 1));
      punti.push([x, Math.round(tab[x])]);
    }
    return punti;
  }

  /* Tabella di 256 valori: serve a LUT, XMP e anteprima.
     Il massimo progressivo garantisce una curva mai decrescente. */
  function tabella(tono) {
    var f = funzioneTono(tono), t = new Float32Array(256), max = 0;
    for (var i = 0; i < 256; i++) {
      var v = U.clamp(f(i), 0, 255);
      if (v < max) v = max;
      max = v;
      t[i] = v;
    }
    return t;
  }

  BN.curve = {
    interpolatore: interpolatore,
    funzioneTono: funzioneTono,
    puntiPerPhotoshop: puntiPerPhotoshop,
    tabella: tabella,
    contrastoS: contrastoS,
    livelli: livelli,
    pesoFascia: pesoFascia
  };
})(this);
