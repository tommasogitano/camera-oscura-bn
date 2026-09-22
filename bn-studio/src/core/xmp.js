/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Camera Oscura BN — generatore di preset Camera Raw / Lightroom (.xmp).
   Traduce la ricetta nei parametri crs: del modulo Sviluppo, cosi da
   poter sviluppare i file RAW direttamente dal negativo digitale. */
(function (global) {
  "use strict";
  var BN = global.BN || (global.BN = {});
  var U = BN.util;

  /* Photoshop usa sei cursori centrati sui valori 40/60/40/60/20/80;
     Camera Raw ne usa otto centrati su zero, con escursione -100..100.
     La conversione riporta ogni canale allo scarto dal suo neutro. */
  function mixCameraRaw(mix) {
    function d(valore, neutro) { return Math.round(U.clamp((valore - neutro) / 1.6, -100, 100)); }
    var rosso = d(mix.rosso, 40);
    var giallo = d(mix.giallo, 60);
    var verde = d(mix.verde, 40);
    var ciano = d(mix.ciano, 60);
    var blu = d(mix.blu, 20);
    var magenta = d(mix.magenta, 80);
    return {
      Red: rosso,
      Orange: Math.round((rosso + giallo) / 2),
      Yellow: giallo,
      Green: verde,
      Aqua: ciano,
      Blue: blu,
      Purple: Math.round((blu + magenta) / 2),
      Magenta: magenta
    };
  }

  /* Punti della curva tonale nel formato "x, y" richiesto da crs. */
  function puntiCurva(tono) {
    var punti = BN.curve.puntiPerPhotoshop(tono, 10);
    return punti.map(function (p) { return p[0] + ", " + p[1]; });
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function genera(ricetta, opzioni) {
    opzioni = opzioni || {};
    var mix = mixCameraRaw(BN.bn.mixEffettivo(ricetta));
    var t = ricetta.tono || {};
    var g = ricetta.grana || {};
    var f = ricetta.finiture || {};
    var sp = f.split || {};
    var vig = f.vignetta || {};

    /* Neri e bianchi di Camera Raw: -100..100 a partire dai punti di input. */
    var neri = Math.round(U.clamp(-(t.neroInput || 0) * 1.2 - (t.esaltaNeri || 0) * 0.45, -100, 100));
    var bianchi = Math.round(U.clamp((255 - (t.biancoInput == null ? 255 : t.biancoInput)) * 1.2 + (t.esaltaBianchi || 0) * 0.45, -100, 100));
    var contrasto = Math.round(U.clamp((t.contrasto || 0) * 0.85, -100, 100));
    var chiarezza = Math.round(U.clamp(t.chiarezza || 0, -100, 100));
    var texture = Math.round(U.clamp(t.struttura || 0, -100, 100));

    /* Grana: Camera Raw usa quantita 0..100, dimensione 0..100, frequenza 0..100. */
    var granaQta = g.attiva ? Math.round(U.clamp(g.quantita || 0, 0, 100)) : 0;
    var granaDim = Math.round(U.clamp(((g.dimensione || 1) - 0.4) / 2.6 * 100, 0, 100));
    var granaFreq = Math.round(U.clamp(100 - (g.ruvidita || 50), 0, 100));

    var viraggio = BN.viraggi.trova(f.viraggio || "nessuno");
    var lucePiuAlta = viraggio.stops[viraggio.stops.length - 1][1];
    var ombraPiuBassa = viraggio.stops[0][1];
    var tintaLuci = tonoDaHex(lucePiuAlta);
    var tintaOmbre = tonoDaHex(ombraPiuBassa);
    var forza = U.clamp((f.intensitaViraggio == null ? 60 : f.intensitaViraggio) / 100, 0, 1);

    var righe = [];
    function a(k, v) { righe.push('   crs:' + k + '="' + esc(v) + '"'); }

    a("PresetType", "Normal");
    a("UUID", U.uuid());
    a("SupportsAmount", "False");
    a("SupportsColor", "True");
    a("SupportsMonochrome", "True");
    a("SupportsHighDynamicRange", "True");
    a("SupportsNormalDynamicRange", "True");
    a("SupportsSceneReferred", "True");
    a("SupportsOutputReferred", "True");
    a("CameraModelRestriction", "");
    a("Copyright", opzioni.autore || "");
    a("ContactInfo", "");
    a("Version", "16.0");
    a("ProcessVersion", "15.4");
    a("ConvertToGrayscale", "True");
    a("Treatment", "Black & White");
    a("WhiteBalance", "As Shot");
    a("Contrast2012", contrasto);
    a("Blacks2012", neri);
    a("Whites2012", bianchi);
    a("Clarity2012", chiarezza);
    a("Texture", texture);
    a("Dehaze", 0);

    Object.keys(mix).forEach(function (k) { a("GrayMixer" + k, mix[k]); });

    a("GrainAmount", granaQta);
    if (granaQta) { a("GrainSize", granaDim); a("GrainFrequency", granaFreq); }

    a("PostCropVignetteAmount", Math.round(U.clamp(-(vig.quantita || 0), -100, 100)));
    if (vig.quantita) {
      a("PostCropVignetteMidpoint", Math.round(U.clamp(vig.centro == null ? 50 : vig.centro, 0, 100)));
      a("PostCropVignetteFeather", Math.round(U.clamp(vig.morbidezza == null ? 60 : vig.morbidezza, 0, 100)));
      a("PostCropVignetteRoundness", 0);
      a("PostCropVignetteStyle", 1);
    }

    /* Viraggio tradotto in gradazione colore: ombre, mezzitoni, luci. */
    if (f.viraggio && f.viraggio !== "nessuno") {
      a("ColorGradeShadowLum", 0);
      a("SplitToningShadowHue", tintaOmbre.tinta);
      a("SplitToningShadowSaturation", Math.round(tintaOmbre.sat * forza));
      a("SplitToningHighlightHue", tintaLuci.tinta);
      a("SplitToningHighlightSaturation", Math.round(tintaLuci.sat * forza));
      a("SplitToningBalance", 0);
      a("ColorGradeBlending", 60);
    }
    if (sp.ombreSat) {
      a("ColorGradeShadowLum", 0);
      a("SplitToningShadowHue", Math.round(sp.ombreTinta || 0));
      a("SplitToningShadowSaturation", Math.round(U.clamp(sp.ombreSat, 0, 100)));
    }
    if (sp.luciSat) {
      a("SplitToningHighlightHue", Math.round(sp.luciTinta || 0));
      a("SplitToningHighlightSaturation", Math.round(U.clamp(sp.luciSat, 0, 100)));
      a("SplitToningBalance", Math.round(U.clamp(sp.bilanciamento || 0, -100, 100)));
    }

    var curva = puntiCurva(ricetta.tono || {});
    var nome = esc(ricetta.nome || "Camera Oscura BN");
    var gruppo = esc(opzioni.gruppo || "Camera Oscura BN");

    return '<x:xmpmeta xmlns:x="adobe:ns:meta/">\n' +
      ' <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n' +
      '  <rdf:Description rdf:about=""\n' +
      '   xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"\n' +
      righe.join("\n") + ">\n" +
      '   <crs:Name>\n    <rdf:Alt>\n     <rdf:li xml:lang="x-default">' + nome + '</rdf:li>\n    </rdf:Alt>\n   </crs:Name>\n' +
      '   <crs:Group>\n    <rdf:Alt>\n     <rdf:li xml:lang="x-default">' + gruppo + '</rdf:li>\n    </rdf:Alt>\n   </crs:Group>\n' +
      '   <crs:Description>\n    <rdf:Alt>\n     <rdf:li xml:lang="x-default">' + esc(ricetta.note || "") + '</rdf:li>\n    </rdf:Alt>\n   </crs:Description>\n' +
      '   <crs:ToneCurvePV2012>\n    <rdf:Seq>\n' +
      curva.map(function (p) { return '     <rdf:li>' + p + '</rdf:li>'; }).join("\n") + "\n" +
      '    </rdf:Seq>\n   </crs:ToneCurvePV2012>\n' +
      ['Red', 'Green', 'Blue'].map(function (c) {
        return '   <crs:ToneCurvePV2012' + c + '>\n    <rdf:Seq>\n     <rdf:li>0, 0</rdf:li>\n     <rdf:li>255, 255</rdf:li>\n    </rdf:Seq>\n   </crs:ToneCurvePV2012' + c + '>';
      }).join("\n") + "\n" +
      '  </rdf:Description>\n </rdf:RDF>\n</x:xmpmeta>\n';
  }

  /* Estrae tinta e saturazione da un colore esadecimale, per il viraggio. */
  function tonoDaHex(hex) {
    var c = U.hexToRgb(hex);
    var max = Math.max(c[0], c[1], c[2]), min = Math.min(c[0], c[1], c[2]);
    var l = (max + min) / 2, d = max - min, h = 0, s = 0;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === c[0]) h = ((c[1] - c[2]) / d + (c[1] < c[2] ? 6 : 0));
      else if (max === c[1]) h = (c[2] - c[0]) / d + 2;
      else h = (c[0] - c[1]) / d + 4;
      h *= 60;
    }
    return { tinta: Math.round(h), sat: Math.round(U.clamp(s * 100, 0, 100)) };
  }

  BN.xmp = { genera: genera, mixCameraRaw: mixCameraRaw };
})(this);
