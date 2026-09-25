/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Camera Oscura BN — maschera radiale (calcolo puro).
   Un'ellisse regolabile in tutto: centro, larghezza, altezza, rotazione e
   sfumatura del bordo. Dentro e fuori ricevono regolazioni indipendenti di
   luminosita, contrasto e struttura, come la maschera radiale di Silver Efex.
   Qui stanno solo la geometria e il peso della maschera: il disegno in
   Photoshop sta in src/ps/pipeline.js, quello nel pannello in src/ui/radiale.js. */
(function (global) {
  "use strict";
  var BN = global.BN || (global.BN = {});
  var U = BN.util;

  /* Chiavi che cambiano solo la forma: basta ridisegnare le maschere. */
  var CHIAVI_FORMA = ["x", "y", "larghezza", "altezza", "rotazione", "sfumatura"];

  /* Geometria in pixel per un documento W×H.
     x, y: centro in percentuale del fotogramma (0..100).
     larghezza, altezza: semiassi in percentuale di meta lato (100 = ellisse
     inscritta nel fotogramma).
     rotazione: gradi, in senso orario come in Photoshop.
     sfumatura: 0..100, larghezza della transizione in rapporto al semiasse
     minore. La linea di meta peso cade sul contorno dell'ellisse. */
  function geometria(r, W, H) {
    r = r || {};
    var rx = Math.max(2, U.clamp(r.larghezza == null ? 60 : r.larghezza, 2, 300) / 100 * W / 2);
    var ry = Math.max(2, U.clamp(r.altezza == null ? 60 : r.altezza, 2, 300) / 100 * H / 2);
    var sf = U.clamp(r.sfumatura == null ? 50 : r.sfumatura, 0, 100) / 100;
    return {
      cx: U.clamp(r.x == null ? 50 : r.x, -50, 150) / 100 * W,
      cy: U.clamp(r.y == null ? 50 : r.y, -50, 150) / 100 * H,
      rx: rx,
      ry: ry,
      angolo: U.clamp(r.rotazione || 0, -180, 180),
      /* Raggio della sfocatura gaussiana di Photoshop, che equivale alla
         deviazione standard: a sfumatura piena la transizione copre circa
         tutto il semiasse minore. */
      sigma: Math.max(0.5, sf * Math.min(rx, ry) * 0.45)
    };
  }

  /* Funzione di errore (Abramowitz e Stegun 7.1.26), scarto < 1.5e-7. */
  function erf(x) {
    var s = x < 0 ? -1 : 1;
    x = Math.abs(x);
    var t = 1 / (1 + 0.3275911 * x);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }

  /* Peso della maschera "dentro" nel punto (px, py): 1 al centro, 0 lontano.
     Approssima un'ellisse piena sfocata con la gaussiana: la distanza dal
     contorno, misurata lungo il raggio, passa per la funzione di errore. */
  function peso(px, py, g) {
    var a = -g.angolo * Math.PI / 180;
    var dx = px - g.cx, dy = py - g.cy;
    var ux = dx * Math.cos(a) - dy * Math.sin(a);
    var uy = dx * Math.sin(a) + dy * Math.cos(a);
    var d = Math.sqrt((ux * ux) / (g.rx * g.rx) + (uy * uy) / (g.ry * g.ry));
    if (d === 0) return 1;
    /* distanza in pixel dal contorno lungo questa direzione */
    var raggioQui = Math.sqrt(ux * ux + uy * uy) / d;
    var distanza = (1 - d) * raggioQui;
    return U.clamp(0.5 * (1 + erf(distanza / (g.sigma * Math.SQRT2))), 0, 1);
  }

  /* Punti del contorno dell'ellisse (per il disegno nel pannello).
     scala: fattore sui semiassi (1 = contorno, <1 e >1 = inizio e fine
     della sfumatura). */
  function contorno(g, scala, n) {
    n = n || 72;
    scala = scala == null ? 1 : scala;
    var a = g.angolo * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    var punti = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n * Math.PI * 2;
      var ex = Math.cos(t) * g.rx * scala, ey = Math.sin(t) * g.ry * scala;
      punti.push([g.cx + ex * ca - ey * sa, g.cy + ex * sa + ey * ca]);
    }
    return punti;
  }

  /* Punto sul contorno all'angolo locale t (radianti), gia ruotato. */
  function puntoSulBordo(g, t) {
    var a = g.angolo * Math.PI / 180;
    var ex = Math.cos(t) * g.rx, ey = Math.sin(t) * g.ry;
    return [g.cx + ex * Math.cos(a) - ey * Math.sin(a), g.cy + ex * Math.sin(a) + ey * Math.cos(a)];
  }

  /* Parametri tonali di un lato (dentro o fuori) come oggetto "tono"
     parziale, cosi la curva usa esattamente le formule della scheda Tono. */
  function tonoLato(r, lato) {
    var l = (r && r[lato]) || {};
    return {
      luminosita: U.clamp(l.luminosita || 0, -100, 100),
      contrasto: U.clamp(l.contrasto || 0, -100, 100),
      curva: [[0, 0], [255, 255]]
    };
  }

  function latoAttivoTono(r, lato) {
    var l = (r && r[lato]) || {};
    return !!(l.luminosita || l.contrasto);
  }

  function latoAttivoStruttura(r, lato) {
    var l = (r && r[lato]) || {};
    return !!l.struttura;
  }

  /* La maschera ha qualcosa da fare? */
  function attiva(r) {
    if (!r || !r.attiva) return false;
    return latoAttivoTono(r, "dentro") || latoAttivoTono(r, "fuori") ||
           latoAttivoStruttura(r, "dentro") || latoAttivoStruttura(r, "fuori");
  }

  function soloForma(chiave) {
    return CHIAVI_FORMA.indexOf(chiave) >= 0;
  }

  BN.radiale = {
    CHIAVI_FORMA: CHIAVI_FORMA,
    geometria: geometria,
    peso: peso,
    contorno: contorno,
    puntoSulBordo: puntoSulBordo,
    tonoLato: tonoLato,
    latoAttivoTono: latoAttivoTono,
    latoAttivoStruttura: latoAttivoStruttura,
    attiva: attiva,
    soloForma: soloForma,
    erf: erf
  };
})(this);
