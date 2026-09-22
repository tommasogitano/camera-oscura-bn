/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Camera Oscura BN — generatore di LUT 3D in formato .cube.
   La LUT contiene conversione, filtro colorato, tono e viraggio:
   tutto cio che dipende solo dal colore del pixel. Restano fuori
   grana, vignetta, chiarezza e dodge and burn, che dipendono dalla
   posizione nel fotogramma o dai pixel vicini. */
(function (global) {
  "use strict";
  var BN = global.BN || (global.BN = {});
  var U = BN.util;

  /* Trasformazione completa di un colore sRGB 0..1 -> 0..1. */
  function trasforma(ricetta, tabellaTono, mix, r, g, b) {
    var y = BN.bn.grigio(r, g, b, mix);
    var idx = U.clamp(y * 255, 0, 255);
    var i0 = Math.floor(idx), i1 = Math.min(255, i0 + 1), f = idx - i0;
    var t = (tabellaTono[i0] * (1 - f) + tabellaTono[i1] * f) / 255;
    return BN.viraggi.colora(t, ricetta.finiture);
  }

  function generaCube(ricetta, dimensione, titolo) {
    var n = dimensione || 33;
    var tab = BN.curve.tabella(ricetta.tono);
    var mix = BN.bn.mixEffettivo(ricetta);
    var righe = [];

    righe.push("# LUT generata da Camera Oscura BN");
    righe.push("# Ricetta: " + (ricetta.nome || "senza titolo"));
    righe.push("# Pellicola: " + (ricetta.pellicola || "personalizzata"));
    righe.push("# Nota: grana, vignetta e interventi locali non sono inclusi nella LUT.");
    righe.push('TITLE "' + String(titolo || ricetta.nome || "Camera Oscura BN").replace(/"/g, "") + '"');
    righe.push("LUT_3D_SIZE " + n);
    righe.push("DOMAIN_MIN 0.0 0.0 0.0");
    righe.push("DOMAIN_MAX 1.0 1.0 1.0");
    righe.push("");

    /* Nel formato .cube il canale rosso varia piu velocemente. */
    for (var ib = 0; ib < n; ib++) {
      for (var ig = 0; ig < n; ig++) {
        for (var ir = 0; ir < n; ir++) {
          var c = trasforma(ricetta, tab, mix, ir / (n - 1), ig / (n - 1), ib / (n - 1));
          righe.push(c[0].toFixed(6) + " " + c[1].toFixed(6) + " " + c[2].toFixed(6));
        }
      }
    }
    return righe.join("\n") + "\n";
  }

  /* LUT monodimensionale utile per verifiche rapide e per il grafico. */
  function curvaRisultante(ricetta) {
    var tab = BN.curve.tabella(ricetta.tono);
    var mix = BN.bn.mixEffettivo(ricetta);
    var out = [];
    for (var i = 0; i < 256; i++) {
      var v = i / 255;
      out.push(trasforma(ricetta, tab, mix, v, v, v));
    }
    return out;
  }

  BN.lut = { genera: generaCube, curvaRisultante: curvaRisultante, trasforma: trasforma };
})(this);
