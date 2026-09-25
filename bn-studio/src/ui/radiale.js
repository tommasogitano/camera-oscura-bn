/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Camera Oscura BN — editor grafico della maschera radiale.
   Sulla tela c'e il fotogramma del documento aperto, con il peso della
   maschera in scala di grigi (chiaro = dentro) e l'ellisse in ambra.
   Quattro maniglie: centro, larghezza, altezza, rotazione.
   Come l'editor della curva, usa solo rettangoli pieni e spezzate. */
(function (global) {
  "use strict";
  var BN = global.BN || (global.BN = {});
  var U = BN.util;

  var tela = null, ctx = null, disponibile = false;
  var maniglia = null;          /* "centro" | "larghezza" | "altezza" | "rotazione" */
  var primoMovimento = false;
  var CELLA = 6;                /* lato delle celle dell'anteprima, in pixel di schermo */
  var PRESA = 9;                /* raggio di presa delle maniglie */
  var DISTACCO_ROTAZIONE = 18;  /* distanza della maniglia di rotazione dal bordo */

  /* Dimensioni del documento; senza documento un 3:2 di riferimento. */
  function formato() {
    var doc = null;
    try { doc = BN.ps && BN.ps.documento(); } catch (e) { doc = null; }
    if (doc && doc.width > 0 && doc.height > 0) return { W: Number(doc.width), H: Number(doc.height), vero: true };
    return { W: 3000, H: 2000, vero: false };
  }

  /* La tela puo essere stirata dal CSS: si lavora in pixel di schermo e si
     converte alla fine, cosi un cerchio resta un cerchio. */
  function schermo() {
    var r = tela.getBoundingClientRect ? tela.getBoundingClientRect() : null;
    var dw = (r && r.width) || tela.width;
    var dh = (r && r.height) || tela.height;
    return { dw: dw, dh: dh, sx: tela.width / dw, sy: tela.height / dh, left: r ? r.left : 0, top: r ? r.top : 0 };
  }

  /* Trasformazione documento → schermo: il fotogramma sta al centro,
     con un piccolo margine. */
  function impaginazione(s, f) {
    var margine = 8;
    var scala = Math.min((s.dw - margine * 2) / f.W, (s.dh - margine * 2) / f.H);
    return {
      scala: scala,
      ox: (s.dw - f.W * scala) / 2,
      oy: (s.dh - f.H * scala) / 2
    };
  }

  function aSchermo(p, imp) { return [imp.ox + p[0] * imp.scala, imp.oy + p[1] * imp.scala]; }
  function daSchermo(x, y, imp) { return [(x - imp.ox) / imp.scala, (y - imp.oy) / imp.scala]; }

  function rett(x, y, w, h, s) {
    ctx.fillRect(Math.round(x * s.sx), Math.round(y * s.sy), Math.max(1, Math.round(w * s.sx)), Math.max(1, Math.round(h * s.sy)));
  }

  function linea(punti, colore, spessore, s) {
    if (punti.length < 2) return;
    ctx.strokeStyle = colore;
    ctx.lineWidth = spessore || 1;
    ctx.beginPath();
    ctx.moveTo(punti[0][0] * s.sx, punti[0][1] * s.sy);
    for (var i = 1; i < punti.length; i++) ctx.lineTo(punti[i][0] * s.sx, punti[i][1] * s.sy);
    ctx.stroke();
  }

  function quadratino(p, colore, lato, s) {
    var m = Math.floor(lato / 2);
    ctx.fillStyle = "#1e1e1e";
    rett(p[0] - m - 1, p[1] - m - 1, lato + 2, lato + 2, s);
    ctx.fillStyle = colore;
    rett(p[0] - m, p[1] - m, lato, lato, s);
  }

  function ricetta() { return BN.stato.leggi("locale.radiale") || {}; }

  /* Posizioni delle maniglie in coordinate del documento. */
  function maniglie(g, imp) {
    var a = g.angolo * Math.PI / 180;
    var distacco = DISTACCO_ROTAZIONE / imp.scala;
    var su = g.ry + distacco;
    return {
      centro: [g.cx, g.cy],
      larghezza: BN.radiale.puntoSulBordo(g, 0),
      altezza: BN.radiale.puntoSulBordo(g, Math.PI / 2),
      /* sopra l'ellisse, lungo il suo asse verticale ruotato */
      rotazione: [g.cx + su * Math.sin(a), g.cy - su * Math.cos(a)]
    };
  }

  function disegna() {
    if (!disponibile) return;
    var s = schermo();
    var f = formato();
    var imp = impaginazione(s, f);
    var r = ricetta();
    var g = BN.radiale.geometria(r, f.W, f.H);
    var attiva = !!r.attiva;

    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, tela.width, tela.height);

    /* Peso della maschera, a celle: chiaro dove agisce "dentro". */
    var fw = f.W * imp.scala, fh = f.H * imp.scala;
    for (var y = 0; y < fh; y += CELLA) {
      for (var x = 0; x < fw; x += CELLA) {
        var cw = Math.min(CELLA, fw - x), ch = Math.min(CELLA, fh - y);
        var pd = daSchermo(imp.ox + x + cw / 2, imp.oy + y + ch / 2, imp);
        var w = BN.radiale.peso(pd[0], pd[1], g);
        /* rgbToHex vuole valori 0..1 */
        var v = (attiva ? 34 + w * 150 : 30 + w * 40) / 255;
        ctx.fillStyle = U.rgbToHex(v, v, v);
        rett(imp.ox + x, imp.oy + y, cw, ch, s);
      }
    }

    /* Cornice del fotogramma. */
    ctx.fillStyle = "#555555";
    rett(imp.ox, imp.oy, fw, 1, s);
    rett(imp.ox, imp.oy + fh - 1, fw, 1, s);
    rett(imp.ox, imp.oy, 1, fh, s);
    rett(imp.ox + fw - 1, imp.oy, 1, fh, s);

    /* Ellisse: contorno pieno e, piu tenui, inizio e fine della sfumatura. */
    var ambra = attiva ? "#e8954f" : "#7a6450";
    var tenue = attiva ? "#8a5a33" : "#4a4036";
    function traccia(scala) {
      return BN.radiale.contorno(g, scala, 90).map(function (p) { return aSchermo(p, imp); });
    }
    var raggioMin = Math.min(g.rx, g.ry);
    var fascia = U.clamp(g.sigma * 1.6 / raggioMin, 0, 0.95);
    if (fascia > 0.03) {
      linea(traccia(1 - fascia), tenue, 1, s);
      linea(traccia(1 + fascia), tenue, 1, s);
    }
    linea(traccia(1), ambra, 2, s);

    /* Maniglie. */
    var m = maniglie(g, imp);
    var centro = aSchermo(m.centro, imp);
    var rot = aSchermo(m.rotazione, imp);
    linea([aSchermo(BN.radiale.puntoSulBordo(g, -Math.PI / 2), imp), rot], tenue, 1, s);
    quadratino(centro, maniglia === "centro" ? "#cf7d3a" : "#f0f0f0", 9, s);
    quadratino(aSchermo(m.larghezza, imp), maniglia === "larghezza" ? "#cf7d3a" : "#f0f0f0", 7, s);
    quadratino(aSchermo(m.altezza, imp), maniglia === "altezza" ? "#cf7d3a" : "#f0f0f0", 7, s);
    /* La maniglia di rotazione e vuota al centro, per distinguerla. */
    quadratino(rot, maniglia === "rotazione" ? "#cf7d3a" : "#f0f0f0", 9, s);
    ctx.fillStyle = "#1e1e1e";
    rett(rot[0] - 2, rot[1] - 2, 5, 5, s);

    if (!f.vero) {
      /* Senza documento il fotogramma e un 3:2 indicativo: lo si dice con
         una sottile riga tratteggiata in basso invece che con del testo. */
      ctx.fillStyle = "#444444";
      for (var t = 0; t < fw; t += 8) rett(imp.ox + t, imp.oy + fh + 3, 4, 1, s);
    }
  }

  function posizione(evento, s) {
    return [evento.clientX - s.left, evento.clientY - s.top];
  }

  function trovaManiglia(p, imp, g) {
    var m = maniglie(g, imp);
    var ordine = ["rotazione", "larghezza", "altezza", "centro"];
    for (var i = 0; i < ordine.length; i++) {
      var q = aSchermo(m[ordine[i]], imp);
      var dx = q[0] - p[0], dy = q[1] - p[1];
      if (dx * dx + dy * dy <= PRESA * PRESA) return ordine[i];
    }
    return null;
  }

  function imposta(percorso, valore) {
    var arrotondato = Math.round(valore * 10) / 10;
    if (BN.stato.leggi(percorso) === arrotondato) return;
    if (!BN.stato.leggi("locale.radiale.attiva")) {
      BN.stato.imposta("locale.radiale.attiva", true, { senzaCronologia: true });
    }
    BN.stato.imposta(percorso, arrotondato, { senzaCronologia: !primoMovimento });
    primoMovimento = false;
  }

  function giu(evento) {
    if (!disponibile) return;
    if (BN.interfaccia && BN.interfaccia.occupato()) return;
    var s = schermo(), f = formato(), imp = impaginazione(s, f);
    var g = BN.radiale.geometria(ricetta(), f.W, f.H);
    var p = posizione(evento, s);
    maniglia = trovaManiglia(p, imp, g);
    if (!maniglia) {
      /* Un clic fuori dalle maniglie porta li il centro. */
      var d = daSchermo(p[0], p[1], imp);
      if (d[0] >= 0 && d[0] <= f.W && d[1] >= 0 && d[1] <= f.H) {
        maniglia = "centro";
        primoMovimento = true;
        muovi(evento);
        return;
      }
    }
    primoMovimento = true;
    disegna();
  }

  function muovi(evento) {
    if (!maniglia) return;
    var s = schermo(), f = formato(), imp = impaginazione(s, f);
    var r = ricetta();
    var g = BN.radiale.geometria(r, f.W, f.H);
    var p = posizione(evento, s);
    var d = daSchermo(p[0], p[1], imp);
    var a = g.angolo * Math.PI / 180;
    var dx = d[0] - g.cx, dy = d[1] - g.cy;
    /* coordinate nel riferimento dell'ellisse */
    var ux = dx * Math.cos(a) + dy * Math.sin(a);
    var uy = -dx * Math.sin(a) + dy * Math.cos(a);

    if (maniglia === "centro") {
      imposta("locale.radiale.x", U.clamp(d[0] / f.W * 100, 0, 100));
      imposta("locale.radiale.y", U.clamp(d[1] / f.H * 100, 0, 100));
    } else if (maniglia === "larghezza") {
      imposta("locale.radiale.larghezza", U.clamp(Math.abs(ux) / (f.W / 2) * 100, 5, 200));
    } else if (maniglia === "altezza") {
      imposta("locale.radiale.altezza", U.clamp(Math.abs(uy) / (f.H / 2) * 100, 5, 200));
    } else if (maniglia === "rotazione") {
      var gradi = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      while (gradi > 90) gradi -= 180;
      while (gradi < -90) gradi += 180;
      imposta("locale.radiale.rotazione", gradi);
    }
    disegna();
  }

  function su() {
    if (!maniglia) return;
    maniglia = null;
    disegna();
  }

  function inizializza() {
    tela = document.getElementById("telaRadiale");
    if (!tela) return false;
    try {
      ctx = tela.getContext("2d");
      disponibile = !!ctx;
    } catch (e) {
      disponibile = false;
    }
    if (!disponibile) {
      if (BN.log) BN.log.avviso("Canvas non disponibile: la maschera radiale resta regolabile con i cursori.");
      return false;
    }
    tela.addEventListener("mousedown", giu);
    tela.addEventListener("mousemove", muovi);
    tela.addEventListener("mouseup", su);
    tela.addEventListener("mouseleave", su);
    disegna();
    return true;
  }

  BN.radialeUI = {
    inizializza: inizializza,
    disegna: disegna,
    formato: formato
  };
})(this);
