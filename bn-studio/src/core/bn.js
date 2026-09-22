/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Camera Oscura BN — conversione cromatica in bianco e nero.
   Riproduce l'algoritmo del livello Bianco e nero di Photoshop:
   il colore viene scomposto nella coppia primario/secondario piu vicina
   e ogni parte viene pesata con il cursore corrispondente. */
(function (global) {
  "use strict";
  var BN = global.BN || (global.BN = {});
  var U = BN.util;

  /* r, g, b in 0..1; mix con i sei cursori in percentuale.
     Restituisce la luminanza in 0..1 (puo eccedere: viene tagliata). */
  function grigio(r, g, b, mix) {
    var wR = (mix.rosso == null ? 40 : mix.rosso) / 100;
    var wG = (mix.verde == null ? 40 : mix.verde) / 100;
    var wB = (mix.blu == null ? 20 : mix.blu) / 100;
    var wY = (mix.giallo == null ? 60 : mix.giallo) / 100;
    var wC = (mix.ciano == null ? 60 : mix.ciano) / 100;
    var wM = (mix.magenta == null ? 80 : mix.magenta) / 100;
    var v;

    if (r >= g && g >= b)      v = b + (g - b) * wY + (r - g) * wR;   // rosso -> giallo
    else if (g >= r && r >= b) v = b + (r - b) * wY + (g - r) * wG;   // giallo -> verde
    else if (g >= b && b >= r) v = r + (b - r) * wC + (g - b) * wG;   // verde -> ciano
    else if (b >= g && g >= r) v = r + (g - r) * wC + (b - g) * wB;   // ciano -> blu
    else if (b >= r && r >= g) v = g + (r - g) * wM + (b - r) * wB;   // blu -> magenta
    else                       v = g + (b - g) * wM + (r - b) * wR;   // magenta -> rosso

    return U.clamp(v, 0, 1);
  }

  /* Miscelatore effettivo della ricetta: base piu filtro colorato. */
  function mixEffettivo(ricetta) {
    var c = ricetta.conversione || {};
    var base = {
      rosso: c.rosso, giallo: c.giallo, verde: c.verde,
      ciano: c.ciano, blu: c.blu, magenta: c.magenta
    };
    return BN.filtri.applica(base, c.filtro || "nessuno", c.intensitaFiltro, c.tintaFiltro);
  }

  BN.bn = { grigio: grigio, mixEffettivo: mixEffettivo };
})(this);
