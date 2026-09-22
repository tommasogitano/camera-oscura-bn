/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Camera Oscura BN — filtri colorati fotografici.
   Ogni filtro e espresso come set di sei valori del miscelatore
   Bianco e nero di Photoshop (rosso, giallo, verde, ciano, blu, magenta).
   I valori sono tarati per riprodurre la resa dei filtri Wratten
   avvitati davanti all'obiettivo su pellicola pancromatica. */
(function (global) {
  "use strict";
  var BN = global.BN || (global.BN = {});
  var U = BN.util;

  var NEUTRO = { rosso: 40, giallo: 60, verde: 40, ciano: 60, blu: 20, magenta: 80 };

  var FILTRI = [
    {
      id: "nessuno", nome: "Nessuno (pancromatico)", wratten: "",
      mix: NEUTRO,
      nota: "Resa neutra di riferimento: nessun filtro davanti all'obiettivo."
    },
    {
      id: "giallo", nome: "Giallo chiaro", wratten: "K2 / Wratten 8",
      mix: { rosso: 60, giallo: 95, verde: 50, ciano: 35, blu: -10, magenta: 70 },
      nota: "Il filtro classico da paesaggio: separa appena le nuvole dal cielo e mantiene naturali gli incarnati. Se ne monta uno solo, e questo."
    },
    {
      id: "gialloVerde", nome: "Giallo-verde", wratten: "X0 / Wratten 11",
      mix: { rosso: 25, giallo: 85, verde: 105, ciano: 65, blu: 5, magenta: 45 },
      nota: "Schiarisce il fogliame e trattiene il cielo: ritratto in esterni e verde vegetale."
    },
    {
      id: "arancio", nome: "Arancio", wratten: "G / Wratten 15",
      mix: { rosso: 95, giallo: 110, verde: 40, ciano: 10, blu: -25, magenta: 80 },
      nota: "Cielo deciso, foschia ridotta, pietra e intonaco che guadagnano corpo. L'architettura del centro storico chiede quasi sempre questo."
    },
    {
      id: "rosso", nome: "Rosso", wratten: "25A",
      mix: { rosso: 130, giallo: 120, verde: 20, ciano: -20, blu: -50, magenta: 95 },
      nota: "Cielo drammatico quasi nero, nuvole scolpite. Attenzione agli incarnati, che diventano lattiginosi."
    },
    {
      id: "rossoProfondo", nome: "Rosso profondo", wratten: "29",
      mix: { rosso: 165, giallo: 115, verde: 0, ciano: -40, blu: -75, magenta: 105 },
      nota: "Estremo: cielo nero, contrasto teatrale. Costa circa tre stop di luce sulla pellicola reale."
    },
    {
      id: "verde", nome: "Verde", wratten: "X1 / Wratten 58",
      mix: { rosso: 10, giallo: 70, verde: 125, ciano: 80, blu: 10, magenta: 30 },
      nota: "Schiarisce l'erba e scurisce le labbra: molto usato per il ritratto maschile e per la vegetazione."
    },
    {
      id: "blu", nome: "Blu", wratten: "47",
      mix: { rosso: -20, giallo: 10, verde: 30, ciano: 110, blu: 150, magenta: 60 },
      nota: "Enfatizza la foschia e ammorbidisce l'atmosfera: resa ortocromatica, da primo Novecento."
    },
    {
      id: "infrarosso", nome: "Simulazione infrarosso", wratten: "IR 720",
      mix: { rosso: 185, giallo: 205, verde: 195, ciano: -50, blu: -85, magenta: 70 },
      nota: "Fogliame bianco luminoso, cielo nero: effetto Wood. Funziona solo se nella scena c'e clorofilla."
    }
  ];

  /* Voce speciale: tinta libera sulla ruota dei colori. */
  FILTRI.push({
    id: "tinta", nome: "Tinta libera (ruota)", wratten: "",
    mix: null,
    nota: "Un filtro di tinta qualsiasi, da 0 a 360 gradi: schiarisce i colori vicini alla tinta scelta e scurisce i complementari, come un vetro colorato davanti all'obiettivo."
  });

  /* Tinte dei sei cursori sulla ruota dei colori. */
  var ANGOLI = { rosso: 0, giallo: 60, verde: 120, ciano: 180, blu: 240, magenta: 300 };

  /* Miscelatore di un filtro di tinta continua, 0..360 gradi. */
  function mixDaTinta(tinta) {
    var h = (((tinta || 0) % 360) + 360) % 360;
    var out = {};
    Object.keys(ANGOLI).forEach(function (k) {
      var d = (h - ANGOLI[k]) * Math.PI / 180;
      out[k] = U.round(NEUTRO[k] + 85 * Math.cos(d), 1);
    });
    return out;
  }

  function trova(id) {
    for (var i = 0; i < FILTRI.length; i++) if (FILTRI[i].id === id) return FILTRI[i];
    return FILTRI[0];
  }

  /* Miscelazione fra il set base della ricetta e quello del filtro,
     in modo che l'intensita 0..100 si comporti come un filtro piu o meno denso. */
  function applicaFiltro(mixBase, idFiltro, intensita, tinta) {
    var f = trova(idFiltro);
    var mixFiltro = f.id === "tinta" ? mixDaTinta(tinta) : f.mix;
    var t = U.clamp((intensita == null ? 100 : intensita) / 100, 0, 1);
    var out = {};
    ["rosso", "giallo", "verde", "ciano", "blu", "magenta"].forEach(function (k) {
      var a = mixBase && mixBase[k] != null ? mixBase[k] : NEUTRO[k];
      out[k] = U.round(U.lerp(a, mixFiltro[k], t), 1);
    });
    return out;
  }

  BN.filtri = { elenco: FILTRI, trova: trova, applica: applicaFiltro, mixDaTinta: mixDaTinta, NEUTRO: NEUTRO };
})(this);
