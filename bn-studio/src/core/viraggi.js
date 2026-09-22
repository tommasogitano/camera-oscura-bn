/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Camera Oscura BN — viraggi di camera oscura.
   Ogni viraggio e una rampa di colore dalle ombre alle alte luci,
   usata sia dal livello Mappa sfumatura in Photoshop sia dal
   generatore di LUT e di preset Camera Raw. */
(function (global) {
  "use strict";
  var BN = global.BN || (global.BN = {});
  var U = BN.util;

  var VIRAGGI = [
    { id: "nessuno", nome: "Nessuno", stops: [[0, "#000000"], [1, "#ffffff"]],
      nota: "Grigio neutro puro." },
    { id: "seppiaLeggero", nome: "Seppia leggero", stops: [[0, "#1a1409"], [0.5, "#8c8069"], [1, "#f8f1e2"]],
      nota: "Un velo di calore, appena percepibile: invecchia senza gridare." },
    { id: "seppia", nome: "Seppia", stops: [[0, "#1d1204"], [0.5, "#8a7047"], [1, "#f6e7c6"]],
      nota: "Il viraggio classico al solfuro: bruno caldo, archivio di famiglia." },
    { id: "selenio", nome: "Selenio", stops: [[0, "#161320"], [0.45, "#6f6a7a"], [1, "#f0eff4"]],
      nota: "Ombre fredde con riflesso violaceo e neri piu profondi: il viraggio che i fotografi usano per la conservazione." },
    { id: "platino", nome: "Platino-palladio", stops: [[0, "#241d15"], [0.5, "#8d8474"], [1, "#f4efe3"]],
      nota: "Bruno-grigio caldo e scala lunghissima: la nobilta della stampa a contatto." },
    { id: "oro", nome: "Oro", stops: [[0, "#191725"], [0.5, "#8a8177"], [1, "#fff5df"]],
      nota: "Ombre appena bluastre e alte luci dorate: eleganza fredda e calda insieme." },
    { id: "ferro", nome: "Blu di ferro (cianotipia)", stops: [[0, "#04101f"], [0.5, "#3f6f96"], [1, "#dcebf6"]],
      nota: "Azzurro Prussia: gelo, notte, distanza." },
    { id: "rame", nome: "Rame", stops: [[0, "#1d0d06"], [0.5, "#9a6144"], [1, "#ffe6cd"]],
      nota: "Caldo intenso, quasi rosso: il calore della terra e del mattone." },
    { id: "verdeOliva", nome: "Verde oliva", stops: [[0, "#0c1710"], [0.5, "#6c7a5f"], [1, "#eef2e4"]],
      nota: "Freddo vegetale: ulivi, muschio, pietra umida." },
    { id: "cianoAmbra", nome: "Ciano e ambra", stops: [[0, "#08161f"], [0.5, "#7b7a75"], [1, "#ffeccd"]],
      nota: "Ombre ciano e luci ambrate: la separazione cromatica del cinema contemporaneo." }
  ];

  function trova(id) {
    for (var i = 0; i < VIRAGGI.length; i++) if (VIRAGGI[i].id === id) return VIRAGGI[i];
    return VIRAGGI[0];
  }

  /* Valuta la rampa a una data luminanza 0..1 e restituisce [r,g,b] in 0..1. */
  function valuta(idViraggio, t) {
    var v = trova(idViraggio);
    var s = v.stops;
    t = U.clamp(t, 0, 1);
    for (var i = 0; i < s.length - 1; i++) {
      if (t >= s[i][0] && t <= s[i + 1][0]) {
        var d = (s[i + 1][0] - s[i][0]) || 1;
        var k = (t - s[i][0]) / d;
        var a = U.hexToRgb(s[i][1]), b = U.hexToRgb(s[i + 1][1]);
        return [U.lerp(a[0], b[0], k), U.lerp(a[1], b[1], k), U.lerp(a[2], b[2], k)];
      }
    }
    return U.hexToRgb(s[s.length - 1][1]);
  }

  /* Colore virato completo: rampa piu split toning, con intensita. */
  function coloraGrigio(grigio, finiture) {
    var t = U.clamp(grigio, 0, 1);
    var out = [t, t, t];
    var f = finiture || {};

    if (f.viraggio && f.viraggio !== "nessuno") {
      var c = valuta(f.viraggio, t);
      var k = U.clamp((f.intensitaViraggio == null ? 60 : f.intensitaViraggio) / 100, 0, 1);
      out = [U.lerp(out[0], c[0], k), U.lerp(out[1], c[1], k), U.lerp(out[2], c[2], k)];
    }

    var sp = f.split;
    if (sp && (sp.ombreSat || sp.luciSat)) {
      var bil = U.clamp((sp.bilanciamento || 0) / 100, -1, 1);
      var soglia = 0.5 + bil * 0.35;
      var pesoLuci = U.clamp((t - soglia) / Math.max(0.05, 1 - soglia), 0, 1);
      var pesoOmbre = U.clamp((soglia - t) / Math.max(0.05, soglia), 0, 1);

      if (sp.ombreSat) {
        var co = U.hslToRgb(sp.ombreTinta || 0, U.clamp(sp.ombreSat / 100, 0, 1), 0.5);
        var ko = pesoOmbre * U.clamp(sp.ombreSat / 100, 0, 1) * 0.6;
        out = [U.lerp(out[0], out[0] * 0.5 + co[0] * 0.5, ko),
               U.lerp(out[1], out[1] * 0.5 + co[1] * 0.5, ko),
               U.lerp(out[2], out[2] * 0.5 + co[2] * 0.5, ko)];
      }
      if (sp.luciSat) {
        var cl = U.hslToRgb(sp.luciTinta || 0, U.clamp(sp.luciSat / 100, 0, 1), 0.5);
        var kl = pesoLuci * U.clamp(sp.luciSat / 100, 0, 1) * 0.6;
        out = [U.lerp(out[0], out[0] * 0.5 + cl[0] * 0.5, kl),
               U.lerp(out[1], out[1] * 0.5 + cl[1] * 0.5, kl),
               U.lerp(out[2], out[2] * 0.5 + cl[2] * 0.5, kl)];
      }
    }

    return [U.clamp(out[0], 0, 1), U.clamp(out[1], 0, 1), U.clamp(out[2], 0, 1)];
  }

  BN.viraggi = { elenco: VIRAGGI, trova: trova, valuta: valuta, colora: coloraGrigio };
})(this);
