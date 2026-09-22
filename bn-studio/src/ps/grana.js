/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Camera Oscura BN — motore di grana procedurale.
   Genera il granulo pixel per pixel e lo scrive nel documento con
   l'API imaging: permette un controllo di dimensione e ruvidita che
   il filtro Aggiungi disturbo non puo dare. Se l'API non e disponibile
   la pipeline ricade sul motore nativo. */
(function (global) {
  "use strict";
  var BN = global.BN || (global.BN = {});
  var U = BN.util;
  var P = BN.ps;

  var ps = require("photoshop");
  var imaging = ps.imaging;

  var LIMITE_PIXEL = 42 * 1000 * 1000;

  function disponibile() {
    return !!(imaging && typeof imaging.putPixels === "function" &&
              typeof imaging.createImageDataFromBuffer === "function");
  }

  /* Rumore a reticolo con interpolazione morbida: la cella determina
     la dimensione apparente del granulo. */
  function ottava(larghezza, altezza, cella, rand) {
    var gw = Math.max(2, Math.ceil(larghezza / cella) + 2);
    var gh = Math.max(2, Math.ceil(altezza / cella) + 2);
    var g = new Float32Array(gw * gh);
    for (var i = 0; i < g.length; i++) g[i] = rand();
    return { g: g, gw: gw, gh: gh, cella: cella };
  }

  function campiona(o, x, y) {
    var fx = x / o.cella, fy = y / o.cella;
    var x0 = Math.floor(fx), y0 = Math.floor(fy);
    var tx = fx - x0, ty = fy - y0;
    tx = tx * tx * (3 - 2 * tx);
    ty = ty * ty * (3 - 2 * ty);
    var x1 = Math.min(o.gw - 1, x0 + 1), y1 = Math.min(o.gh - 1, y0 + 1);
    x0 = Math.min(o.gw - 1, Math.max(0, x0));
    y0 = Math.min(o.gh - 1, Math.max(0, y0));
    var a = o.g[y0 * o.gw + x0], b = o.g[y0 * o.gw + x1];
    var c = o.g[y1 * o.gw + x0], d = o.g[y1 * o.gw + x1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  }

  /* Buffer RGB a 8 bit centrato sul grigio neutro 128. */
  function generaBuffer(larghezza, altezza, grana) {
    var rand = U.rng(grana.seme || 1);
    var dim = U.clamp(grana.dimensione || 1, 0.4, 3);
    var ruvidita = U.clamp(grana.ruvidita == null ? 50 : grana.ruvidita, 0, 100) / 100;
    var ampiezza = U.clamp(grana.quantita || 0, 0, 100) / 100;

    var base = ottava(larghezza, altezza, Math.max(1, dim * 1.6), rand);
    var fine = ottava(larghezza, altezza, Math.max(1, dim * 0.7), rand);
    var grossa = ottava(larghezza, altezza, Math.max(2, dim * 3.4), rand);

    /* Il contrasto del granulo cresce con la ruvidita. */
    var guadagno = 1.1 + ruvidita * 2.6;
    var pesoFine = 0.25 + ruvidita * 0.35;
    var pesoGrossa = 0.30 - ruvidita * 0.18;

    var buf = new Uint8Array(larghezza * altezza * 3);
    var k = 0;
    for (var y = 0; y < altezza; y++) {
      for (var x = 0; x < larghezza; x++) {
        var v = campiona(base, x, y) * 1.0
              + campiona(fine, x, y) * pesoFine
              + campiona(grossa, x, y) * pesoGrossa;
        v = v / (1 + pesoFine + pesoGrossa);
        v = 0.5 + (v - 0.5) * guadagno;
        v = U.clamp(v, 0, 1);
        var valore = Math.round(128 + (v - 0.5) * 255 * ampiezza * 0.85);
        valore = valore < 0 ? 0 : (valore > 255 ? 255 : valore);
        buf[k++] = valore; buf[k++] = valore; buf[k++] = valore;
      }
    }
    return buf;
  }

  async function procedurale(ricetta, nome) {
    if (!disponibile()) throw new Error("API imaging non disponibile");
    var doc = P.documento();
    var w = Math.round(doc.width), h = Math.round(doc.height);
    if (w * h > LIMITE_PIXEL) {
      throw new Error("documento da " + Math.round(w * h / 1e6) + " Mpixel: oltre il limite del motore procedurale");
    }

    await P.creaLivelloNeutro(nome, "softLight");
    var livello = P.documento().activeLayers[0];
    var g = ricetta.grana || {};

    var buffer = generaBuffer(w, h, g);
    var dati = await imaging.createImageDataFromBuffer(buffer, {
      width: w,
      height: h,
      components: 3,
      chunky: true,
      colorSpace: "RGB"
    });

    await imaging.putPixels({
      documentID: doc.id,
      layerID: livello.id,
      imageData: dati,
      replace: true,
      targetBounds: { left: 0, top: 0, right: w, bottom: h }
    });
    if (dati.dispose) dati.dispose();

    var ombre = U.clamp(g.ombre == null ? 70 : g.ombre, 0, 100);
    var mezzi = U.clamp(g.mezzitoni == null ? 100 : g.mezzitoni, 0, 100);
    var luci = U.clamp(g.luci == null ? 45 : g.luci, 0, 100);
    if (ombre !== 100 || mezzi !== 100 || luci !== 100) {
      await BN.pipeline.mascheraLuminosita(livello.id, [
        [0, Math.round(ombre * 2.55)],
        [64, Math.round(U.lerp(ombre, mezzi, 0.5) * 2.55)],
        [128, Math.round(mezzi * 2.55)],
        [192, Math.round(U.lerp(mezzi, luci, 0.5) * 2.55)],
        [255, Math.round(luci * 2.55)]
      ]);
    }
    await P.impostaFusione(livello.id, "softLight", 100);
    return livello;
  }

  BN.grana = { disponibile: disponibile, procedurale: procedurale, generaBuffer: generaBuffer };
})(this);
