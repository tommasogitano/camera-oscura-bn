/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Camera Oscura BN — simulazione pellicole e interpretazioni d'autore.
   Ogni voce e una ricetta parziale: viene fusa sulla ricetta corrente,
   quindi lascia intatto cio che non dichiara. I valori di grana sono
   tarati sul formato 24x36 stampato attorno ai 30 cm di lato lungo. */
(function (global) {
  "use strict";
  var BN = global.BN || (global.BN = {});

  var PELLICOLE = [
    {
      id: "neutra", nome: "Digitale neutro", marca: "—", iso: "—",
      nota: "Conversione pulita, senza carattere: il punto di partenza per costruire una resa propria.",
      patch: {
        conversione: { rosso: 40, giallo: 60, verde: 40, ciano: 60, blu: 20, magenta: 80 },
        tono: { contrasto: 0, esaltaNeri: 0, esaltaBianchi: 0, curva: [[0, 0], [255, 255]] },
        grana: { attiva: false, quantita: 0 }
      }
    },
    {
      id: "trix400", nome: "Strada 400", ispirata: "Kodak Tri-X 400", marca: "—", iso: "400",
      nota: "La pellicola del reportage: neri pieni, mezzitoni robusti, grana disegnata e ben visibile. Perdona l'esposizione approssimativa.",
      patch: {
        conversione: { rosso: 46, giallo: 66, verde: 40, ciano: 54, blu: 24, magenta: 84 },
        tono: {
          contrasto: 14, esaltaNeri: 22, esaltaBianchi: 10,
          curva: [[0, 0], [32, 26], [64, 58], [128, 132], [192, 204], [224, 232], [255, 252]]
        },
        grana: { attiva: true, quantita: 34, dimensione: 1.25, ruvidita: 62, ombre: 72, mezzitoni: 100, luci: 46 }
      }
    },
    {
      id: "hp5", nome: "Nebbia 400", ispirata: "Ilford HP5 Plus 400", marca: "—", iso: "400",
      nota: "Cugina inglese della Strada 400, piu gentile nelle ombre e piu lunga nelle luci: ottima con la luce dura del mezzogiorno.",
      patch: {
        conversione: { rosso: 42, giallo: 64, verde: 42, ciano: 58, blu: 22, magenta: 80 },
        tono: {
          contrasto: 8, esaltaNeri: 12, esaltaBianchi: 18,
          curva: [[0, 4], [32, 30], [64, 62], [128, 128], [192, 196], [255, 250]]
        },
        grana: { attiva: true, quantita: 29, dimensione: 1.2, ruvidita: 55, ombre: 66, mezzitoni: 100, luci: 44 }
      }
    },
    {
      id: "delta3200", nome: "Notte 3200", ispirata: "Ilford Delta 3200", marca: "—", iso: "3200",
      nota: "Notte, interni, concerti. Grana grossa e presente, neri che non arrivano mai davvero al nero: e proprio quello il suo fascino.",
      patch: {
        conversione: { rosso: 44, giallo: 62, verde: 44, ciano: 56, blu: 28, magenta: 78 },
        tono: {
          contrasto: 20, esaltaNeri: 0, esaltaBianchi: 24,
          curva: [[0, 15], [32, 41], [64, 69], [128, 133], [192, 201], [255, 252]]
        },
        grana: { attiva: true, quantita: 72, dimensione: 1.95, ruvidita: 78, ombre: 92, mezzitoni: 100, luci: 62 }
      }
    },
    {
      id: "acros100", nome: "Seta 100", ispirata: "Fujifilm Acros 100", marca: "—", iso: "100",
      nota: "Grana quasi invisibile e una spalla lunghissima nelle alte luci: la scelta per il paesaggio in luce morbida e per la lunga posa.",
      patch: {
        conversione: { rosso: 38, giallo: 62, verde: 44, ciano: 62, blu: 18, magenta: 78 },
        tono: {
          contrasto: 14, esaltaNeri: 26, esaltaBianchi: 8,
          curva: [[0, 0], [24, 16], [64, 56], [128, 132], [192, 206], [232, 238], [255, 254]]
        },
        grana: { attiva: true, quantita: 8, dimensione: 0.72, ruvidita: 34, ombre: 40, mezzitoni: 100, luci: 30 }
      }
    },
    {
      id: "tmax100", nome: "Lama 100", ispirata: "Kodak T-Max 100", marca: "—", iso: "100",
      nota: "Cristallo tabulare: risposta quasi lineare, dettaglio chirurgico. Se serve leggere ogni sfumatura di una parete, e questa.",
      patch: {
        conversione: { rosso: 40, giallo: 60, verde: 42, ciano: 60, blu: 20, magenta: 80 },
        tono: { contrasto: 9, esaltaNeri: 14, esaltaBianchi: 8, curva: [[0, 0], [64, 60], [128, 130], [192, 198], [255, 255]] },
        grana: { attiva: true, quantita: 7, dimensione: 0.65, ruvidita: 30, ombre: 38, mezzitoni: 100, luci: 28 }
      }
    },
    {
      id: "tmax400", nome: "Tabulare 400", ispirata: "Kodak T-Max 400", marca: "—", iso: "400",
      nota: "La sensibilita della Strada 400 con la grana della Lama 100: compromesso moderno fra rapidita e pulizia.",
      patch: {
        conversione: { rosso: 43, giallo: 62, verde: 41, ciano: 58, blu: 22, magenta: 81 },
        tono: { contrasto: 12, esaltaNeri: 18, esaltaBianchi: 10, curva: [[0, 0], [32, 27], [128, 130], [192, 200], [255, 254]] },
        grana: { attiva: true, quantita: 18, dimensione: 0.95, ruvidita: 46, ombre: 54, mezzitoni: 100, luci: 36 }
      }
    },
    {
      id: "panf50", nome: "Cristallo 50", ispirata: "Ilford Pan F Plus 50", marca: "—", iso: "50",
      nota: "Contrasto alto e grana minuscola: cavalletto, luce controllata, stampe grandi.",
      patch: {
        conversione: { rosso: 38, giallo: 58, verde: 40, ciano: 62, blu: 16, magenta: 82 },
        tono: {
          contrasto: 26, esaltaNeri: 32, esaltaBianchi: 12,
          curva: [[0, 0], [32, 19], [64, 51], [128, 132], [192, 209], [255, 255]]
        },
        grana: { attiva: true, quantita: 5, dimensione: 0.6, ruvidita: 28, ombre: 32, mezzitoni: 100, luci: 24 }
      }
    },
    {
      id: "fp4", nome: "Classica 125", ispirata: "Ilford FP4 Plus 125", marca: "—", iso: "125",
      nota: "L'equilibrio classico inglese: nulla di estremo, tutto al posto giusto. Il cavallo da lavoro del medio formato.",
      patch: {
        conversione: { rosso: 41, giallo: 61, verde: 41, ciano: 60, blu: 20, magenta: 80 },
        tono: { contrasto: 11, esaltaNeri: 16, esaltaBianchi: 12, curva: [[0, 1], [64, 60], [128, 129], [192, 199], [255, 253]] },
        grana: { attiva: true, quantita: 13, dimensione: 0.88, ruvidita: 42, ombre: 48, mezzitoni: 100, luci: 34 }
      }
    },
    {
      id: "delta100", nome: "Incisa 100", ispirata: "Ilford Delta 100", marca: "—", iso: "100",
      nota: "Mordente e incisiva, con microcontrasto marcato: architettura, still life, dettagli di pietra.",
      patch: {
        conversione: { rosso: 39, giallo: 60, verde: 43, ciano: 61, blu: 18, magenta: 79 },
        tono: { contrasto: 17, esaltaNeri: 24, esaltaBianchi: 10, curva: [[0, 0], [32, 24], [128, 131], [192, 203], [255, 255]], struttura: 12 },
        grana: { attiva: true, quantita: 9, dimensione: 0.7, ruvidita: 36, ombre: 42, mezzitoni: 100, luci: 30 }
      }
    },
    {
      id: "kentmere400", nome: "Quotidiana 400", ispirata: "Harman Kentmere 400", marca: "—", iso: "400",
      nota: "Economica e volutamente piatta: lascia molto spazio alla stampa. Grana ruvida, un po' scolastica, molto onesta.",
      patch: {
        conversione: { rosso: 44, giallo: 64, verde: 40, ciano: 56, blu: 26, magenta: 80 },
        tono: { contrasto: 2, esaltaNeri: 6, esaltaBianchi: 8, curva: [[0, 7], [64, 64], [128, 126], [192, 190], [255, 246]] },
        grana: { attiva: true, quantita: 38, dimensione: 1.35, ruvidita: 70, ombre: 78, mezzitoni: 100, luci: 52 }
      }
    },
    {
      id: "apx100", nome: "Bottega 100", ispirata: "Agfa APX 100", marca: "—", iso: "100",
      nota: "Contrasto teutonico e neri asciutti: geometrie, ombre nette, sole di taglio.",
      patch: {
        conversione: { rosso: 40, giallo: 58, verde: 42, ciano: 62, blu: 17, magenta: 82 },
        tono: { contrasto: 22, esaltaNeri: 30, esaltaBianchi: 6, curva: [[0, 0], [32, 20], [64, 53], [128, 133], [192, 207], [255, 255]] },
        grana: { attiva: true, quantita: 11, dimensione: 0.8, ruvidita: 40, ombre: 46, mezzitoni: 100, luci: 30 }
      }
    },
    {
      id: "rolleiIR", nome: "Infrarosso 400", ispirata: "Rollei Infrared 400", marca: "—", iso: "400",
      nota: "Con filtro infrarosso: fogliame bianco, cielo nero, alone luminoso. Vale la pena solo se nella scena c'e verde vivo.",
      patch: {
        conversione: { rosso: 46, giallo: 66, verde: 42, ciano: 54, blu: 24, magenta: 82, filtro: "infrarosso", intensitaFiltro: 85 },
        tono: { contrasto: 24, esaltaNeri: 18, esaltaBianchi: 30, curva: [[0, 2], [32, 24], [128, 136], [192, 214], [255, 255]] },
        grana: { attiva: true, quantita: 30, dimensione: 1.3, ruvidita: 64, ombre: 70, mezzitoni: 100, luci: 58 }
      }
    }
  ];

  /* Interpretazioni: non emulano un supporto ma un modo di stampare. */
  var INTERPRETAZIONI = [
    {
      id: "zonale", nome: "Paesaggio zonale", nota: "Massima scala tonale: neri chiusi ma leggibili, bianchi trattenuti sotto la zona IX. Per stampa fine art.",
      patch: {
        conversione: { rosso: 40, giallo: 60, verde: 40, ciano: 60, blu: 20, magenta: 80, filtro: "giallo", intensitaFiltro: 70 },
        tono: { contrasto: 10, esaltaNeri: 28, esaltaBianchi: 14, chiarezza: 14, struttura: 10, curva: [[0, 0], [24, 14], [64, 56], [128, 130], [192, 202], [232, 234], [255, 248]] },
        grana: { attiva: true, quantita: 12, dimensione: 0.85, ruvidita: 40, ombre: 44, mezzitoni: 100, luci: 30 },
        zone: { attivo: false }
      }
    },
    {
      id: "reportage", nome: "Reportage ad alta grana", nota: "Stampa tirata: contrasto duro, grana in evidenza, mezzitoni sacrificati alla forza del gesto.",
      patch: {
        conversione: { rosso: 48, giallo: 68, verde: 38, ciano: 52, blu: 26, magenta: 86, filtro: "giallo", intensitaFiltro: 40 },
        tono: { contrasto: 32, esaltaNeri: 34, esaltaBianchi: 22, chiarezza: 20, curva: [[0, 0], [32, 20], [64, 52], [128, 134], [192, 212], [255, 255]] },
        grana: { attiva: true, quantita: 52, dimensione: 1.5, ruvidita: 74, ombre: 84, mezzitoni: 100, luci: 58 }
      }
    },
    {
      id: "ritratto", nome: "Ritratto in luce di finestra", nota: "Incarnati chiari e morbidi, ombre aperte, nessuna durezza sulla pelle. Il filtro verde tiene le labbra dove devono stare.",
      patch: {
        conversione: { rosso: 52, giallo: 78, verde: 52, ciano: 56, blu: 20, magenta: 72, filtro: "gialloVerde", intensitaFiltro: 45 },
        tono: { contrasto: 4, esaltaNeri: 8, esaltaBianchi: 16, chiarezza: -12, struttura: -8, curva: [[0, 6], [48, 52], [128, 134], [200, 208], [255, 250]] },
        grana: { attiva: true, quantita: 14, dimensione: 0.9, ruvidita: 38, ombre: 40, mezzitoni: 90, luci: 26 },
        finiture: { viraggio: "seppiaLeggero", intensitaViraggio: 22 }
      }
    },
    {
      id: "notturno", nome: "Notturno urbano", nota: "Lampioni, asfalto bagnato, neri profondi con grana viva: la citta dopo la pioggia.",
      patch: {
        conversione: { rosso: 44, giallo: 60, verde: 40, ciano: 58, blu: 30, magenta: 76 },
        tono: { contrasto: 26, esaltaNeri: 44, esaltaBianchi: 28, chiarezza: 10, curva: [[0, 0], [32, 14], [64, 44], [128, 128], [192, 210], [255, 255]] },
        grana: { attiva: true, quantita: 58, dimensione: 1.7, ruvidita: 72, ombre: 96, mezzitoni: 100, luci: 44 },
        finiture: { split: { ombreTinta: 215, ombreSat: 14, luciTinta: 44, luciSat: 6, bilanciamento: -10 } }
      }
    },
    {
      id: "pietra", nome: "Architettura di pietra", nota: "Intonaco, tufo, granito: microcontrasto alto e cielo trattenuto dal filtro arancio.",
      patch: {
        conversione: { rosso: 42, giallo: 62, verde: 40, ciano: 58, blu: 20, magenta: 80, filtro: "arancio", intensitaFiltro: 75 },
        tono: { contrasto: 18, esaltaNeri: 24, esaltaBianchi: 12, chiarezza: 26, struttura: 22, curva: [[0, 0], [32, 22], [128, 132], [192, 204], [255, 252]] },
        grana: { attiva: true, quantita: 16, dimensione: 0.9, ruvidita: 48, ombre: 50, mezzitoni: 100, luci: 34 }
      }
    },
    {
      id: "platino", nome: "Stampa al platino", nota: "Scala lunga e delicata, neri caldi che non chiudono mai del tutto: la resa delle stampe al platino-palladio.",
      patch: {
        conversione: { rosso: 40, giallo: 64, verde: 44, ciano: 60, blu: 22, magenta: 78 },
        tono: { contrasto: -6, esaltaNeri: 0, esaltaBianchi: 10, chiarezza: -6, curva: [[0, 16], [64, 74], [128, 134], [192, 194], [255, 244]] },
        grana: { attiva: true, quantita: 10, dimensione: 1.1, ruvidita: 30, ombre: 50, mezzitoni: 80, luci: 40 },
        finiture: { viraggio: "platino", intensitaViraggio: 70 }
      }
    }
  ];

  function trova(id) {
    var tutte = PELLICOLE.concat(INTERPRETAZIONI);
    for (var i = 0; i < tutte.length; i++) if (tutte[i].id === id) return tutte[i];
    return null;
  }

  BN.pellicole = { elenco: PELLICOLE, interpretazioni: INTERPRETAZIONI, trova: trova };
})(this);
