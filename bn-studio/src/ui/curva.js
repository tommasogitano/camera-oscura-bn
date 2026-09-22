/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Camera Oscura BN — editor grafico della curva tonale.
   Disegna su canvas con le sole primitive supportate da UXP:
   rettangoli pieni e spezzate. Nessun testo, nessun arco. */
(function (global) {
  "use strict";
  var BN = global.BN || (global.BN = {});
  var U = BN.util;

  var tela = null, ctx = null, disponibile = false;
  var puntoAttivo = -1;
  var trascina = false;
  var RAGGIO = 9;

  function dimensioni() {
    var w = (tela && tela.width) || 320;
    var h = (tela && tela.height) || 320;
    return { w: w, h: h };
  }

  function aX(valore, w) { return valore / 255 * (w - 2) + 1; }
  function aY(valore, h) { return h - 1 - valore / 255 * (h - 2); }
  function daX(px, w) { return U.clamp((px - 1) / (w - 2) * 255, 0, 255); }
  function daY(py, h) { return U.clamp((h - 1 - py) / (h - 2) * 255, 0, 255); }

  function linea(punti, colore, spessore) {
    if (punti.length < 2) return;
    ctx.strokeStyle = colore;
    ctx.lineWidth = spessore || 1;
    ctx.beginPath();
    ctx.moveTo(punti[0][0], punti[0][1]);
    for (var i = 1; i < punti.length; i++) ctx.lineTo(punti[i][0], punti[i][1]);
    ctx.stroke();
  }

  function disegna() {
    if (!disponibile) return;
    var d = dimensioni(), w = d.w, h = d.h;
    var tono = BN.stato.leggi("tono") || {};

    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, w, h);

    /* Scala dei grigi risultante come sfondo della griglia. */
    var risultato = BN.lut.curvaRisultante(BN.stato.ricetta());
    for (var x = 0; x < w; x++) {
      var c = risultato[Math.min(255, Math.floor(x / w * 256))];
      ctx.fillStyle = U.rgbToHex(c[0], c[1], c[2]);
      ctx.fillRect(x, h - 10, 1, 10);
    }

    /* Griglia delle zone: undici tacche del sistema zonale. */
    for (var i = 0; i <= 10; i++) {
      var gx = Math.round(aX(i * 25.5, w));
      var gy = Math.round(aY(i * 25.5, h));
      ctx.fillStyle = (i === 5) ? "#4a4a4a" : "#2c2c2c";
      ctx.fillRect(gx, 0, 1, h - 10);
      ctx.fillRect(0, gy, w, 1);
    }

    /* Diagonale di riferimento. */
    linea([[aX(0, w), aY(0, h)], [aX(255, w), aY(255, h)]], "#3a3a3a", 1);

    /* Curva tonale complessiva, comprese le regolazioni numeriche. */
    var f = BN.curve.funzioneTono(tono);
    var traccia = [];
    for (var v = 0; v <= 255; v += 2) traccia.push([aX(v, w), aY(f(v), h)]);
    linea(traccia, "#e6e6e6", 2);

    /* Curva disegnata dall'utente, da sola: i suoi punti stanno su questa.
       La curva chiara qui sopra somma anche contrasto, luminosita e le
       altre regolazioni numeriche, quindi puo passare altrove; la traccia
       ambra mostra dove stanno davvero i punti che si trascinano. */
    var punti = tono.curva || [[0, 0], [255, 255]];
    var soloUtente = BN.curve.interpolatore(punti);
    var tracciaUtente = [];
    for (var u = 0; u <= 255; u += 3) tracciaUtente.push([aX(u, w), aY(U.clamp(soloUtente(u), 0, 255), h)]);
    linea(tracciaUtente, "#e8954f", 2);

    /* Punti di controllo dell'utente. */
    for (var k = 0; k < punti.length; k++) {
      var px = aX(punti[k][0], w), py = aY(punti[k][1], h);
      ctx.fillStyle = (k === puntoAttivo) ? "#cf7d3a" : "#f0f0f0";
      ctx.fillRect(Math.round(px) - 3, Math.round(py) - 3, 7, 7);
      ctx.fillStyle = "#1e1e1e";
      ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3);
    }
  }

  function posizione(evento) {
    var r = tela.getBoundingClientRect ? tela.getBoundingClientRect() : { left: 0, top: 0, width: tela.width, height: tela.height };
    var sx = tela.width / (r.width || tela.width);
    var sy = tela.height / (r.height || tela.height);
    return { x: (evento.clientX - r.left) * sx, y: (evento.clientY - r.top) * sy };
  }

  function trovaPunto(x, y, w, h) {
    var punti = BN.stato.leggi("tono.curva") || [];
    for (var i = 0; i < punti.length; i++) {
      var dx = aX(punti[i][0], w) - x, dy = aY(punti[i][1], h) - y;
      if (dx * dx + dy * dy <= RAGGIO * RAGGIO) return i;
    }
    return -1;
  }

  function giu(evento) {
    if (!disponibile) return;
    if (BN.interfaccia && BN.interfaccia.occupato()) return;
    var d = dimensioni();
    var p = posizione(evento);
    var indice = trovaPunto(p.x, p.y, d.w, d.h);
    var punti = U.clone(BN.stato.leggi("tono.curva") || [[0, 0], [255, 255]]);
    if (indice < 0) {
      punti.push([Math.round(daX(p.x, d.w)), Math.round(daY(p.y, d.h))]);
      punti.sort(function (a, b) { return a[0] - b[0]; });
      indice = -1;
      for (var i = 0; i < punti.length; i++) {
        if (Math.abs(aX(punti[i][0], d.w) - p.x) < 2) { indice = i; break; }
      }
      if (indice < 0) indice = 0;
      BN.stato.imposta("tono.curva", punti);
    }
    puntoAttivo = indice;
    trascina = true;
    disegna();
  }

  function muovi(evento) {
    if (!trascina || puntoAttivo < 0) return;
    var d = dimensioni();
    var p = posizione(evento);
    var punti = U.clone(BN.stato.leggi("tono.curva") || []);
    if (!punti[puntoAttivo]) return;

    var nuovoX = Math.round(daX(p.x, d.w));
    var nuovoY = Math.round(daY(p.y, d.h));
    var minimo = puntoAttivo > 0 ? punti[puntoAttivo - 1][0] + 2 : 0;
    var massimo = puntoAttivo < punti.length - 1 ? punti[puntoAttivo + 1][0] - 2 : 255;
    punti[puntoAttivo] = [U.clamp(nuovoX, minimo, massimo), nuovoY];
    BN.stato.imposta("tono.curva", punti, { senzaCronologia: true });
    disegna();
  }

  function su() {
    trascina = false;
  }

  function eliminaPuntoAttivo() {
    var punti = U.clone(BN.stato.leggi("tono.curva") || []);
    if (puntoAttivo < 0 || punti.length <= 2) return;
    punti.splice(puntoAttivo, 1);
    puntoAttivo = -1;
    BN.stato.imposta("tono.curva", punti);
    disegna();
  }

  function inizializza() {
    tela = document.getElementById("telaCurva");
    if (!tela) return false;
    try {
      ctx = tela.getContext("2d");
      disponibile = !!ctx;
    } catch (e) {
      disponibile = false;
    }
    if (!disponibile) {
      if (BN.log) BN.log.avviso("Canvas non disponibile in questa versione di Photoshop: la curva resta modificabile con i cursori numerici.");
      return false;
    }
    tela.addEventListener("mousedown", giu);
    tela.addEventListener("mousemove", muovi);
    tela.addEventListener("mouseup", su);
    tela.addEventListener("mouseleave", su);
    disegna();
    return true;
  }

  /* Striscia della scala dei grigi con il viraggio applicato. */
  function disegnaScala() {
    var t = document.getElementById("telaScala");
    if (!t) return;
    var c;
    try { c = t.getContext("2d"); } catch (e) { return; }
    if (!c) return;
    var w = t.width, h = t.height;
    var risultato = BN.lut.curvaRisultante(BN.stato.ricetta());
    for (var x = 0; x < w; x++) {
      var col = risultato[Math.min(255, Math.floor(x / w * 256))];
      c.fillStyle = U.rgbToHex(col[0], col[1], col[2]);
      c.fillRect(x, 0, 1, h);
    }
    for (var i = 0; i <= 10; i++) {
      c.fillStyle = "#00000055";
      c.fillRect(Math.round(i * (w - 1) / 10), h - 5, 1, 5);
    }
  }

  BN.curvaUI = {
    inizializza: inizializza,
    disegna: function () { disegna(); disegnaScala(); },
    eliminaPuntoAttivo: eliminaPuntoAttivo
  };
})(this);
