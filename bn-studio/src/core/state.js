/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Camera Oscura BN — stato dell'applicazione.
   Una "ricetta" e l'insieme completo dei parametri di sviluppo.
   Lo store notifica gli osservatori a ogni modifica e tiene una
   cronologia per annulla e ripristina. */
(function (global) {
  "use strict";
  var BN = global.BN || (global.BN = {});
  var U = BN.util;

  var RICETTA_BASE = {
    versione: 1,
    nome: "Base neutra",
    pellicola: "neutra",
    note: "",

    conversione: {
      rosso: 40, giallo: 60, verde: 40, ciano: 60, blu: 20, magenta: 80,
      filtro: "nessuno",
      intensitaFiltro: 100,
      tintaFiltro: 30          // gradi sulla ruota, usata dal filtro "tinta"
    },

    tono: {
      neroInput: 0,
      biancoInput: 255,
      gamma: 1,
      luminosita: 0,           // -100..100
      lumOmbre: 0,             // luminosita per fascia, -100..100
      lumMezzitoni: 0,
      lumLuci: 0,
      luminositaDinamica: 0,   // -100..100, adattiva sul vicinato
      contrasto: 0,
      contrastoMorbido: 0,     // -100..100
      esaltaNeri: 0,
      esaltaBianchi: 0,
      curva: [[0, 0], [255, 255]],
      chiarezza: 0,
      struttura: 0,
      strutturaOmbre: 0,       // struttura per fascia, -100..100, si somma alla generale
      strutturaMezzitoni: 0,
      strutturaLuci: 0,
      strutturaFine: 0,        // -100..100
      protezioneOmbre: 0,      // protezione tonale, 0..100
      protezioneLuci: 0
    },

    zone: {
      attivo: false,
      /* Undici zone del sistema zonale, da 0 (nero pieno) a X (bianco carta).
         Valore -100..100: schiarisci o brucia. */
      valori: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ampiezza: 55
    },

    grana: {
      attiva: true,
      motore: "nativo",      // nativo | procedurale
      quantita: 24,          // 0..100
      dimensione: 1.0,       // 0.4..3.0
      ruvidita: 50,          // 0..100, morbidezza contro durezza del granulo
      ombre: 70,             // presenza della grana per fascia tonale, 0..100
      mezzitoni: 100,
      luci: 45,
      seme: 2317
    },

    finiture: {
      viraggio: "nessuno",
      intensitaViraggio: 60,
      split: { ombreTinta: 210, ombreSat: 0, luciTinta: 45, luciSat: 0, bilanciamento: 0 },
      vignetta: { quantita: 0, morbidezza: 60, centro: 50 },
      bordo: { tipo: "nessuno", spessore: 2, colore: "#000000" }
    },

    locale: {
      /* Maschera radiale: un'ellisse regolabile con interventi separati
         dentro e fuori. Vedi src/core/radiale.js. */
      radiale: {
        attiva: false,
        x: 50, y: 50,            // centro, % del fotogramma
        larghezza: 60,           // semiassi, % di meta lato
        altezza: 60,
        rotazione: 0,            // gradi
        sfumatura: 50,           // 0..100
        dentro: { luminosita: 0, contrasto: 0, struttura: 0 },
        fuori: { luminosita: 0, contrasto: 0, struttura: 0 }
      }
    }
  };

  var stato = {
    ricetta: U.clone(RICETTA_BASE),
    cronologia: [],
    futuro: [],
    osservatori: [],
    liveAttivo: true,
    documentoId: null
  };

  function notifica(motivo) {
    stato.osservatori.forEach(function (fn) {
      try { fn(stato.ricetta, motivo); } catch (e) { if (BN.log) BN.log.errore("Osservatore: " + ((e && e.message) || String(e))); }
    });
  }

  function registraCronologia() {
    stato.cronologia.push(U.clone(stato.ricetta));
    if (stato.cronologia.length > 60) stato.cronologia.shift();
    stato.futuro.length = 0;
  }

  /* Imposta un valore tramite percorso puntato, es. "grana.quantita". */
  function imposta(percorso, valore, opzioni) {
    opzioni = opzioni || {};
    if (!opzioni.senzaCronologia) registraCronologia();
    var parti = percorso.split(".");
    var nodo = stato.ricetta;
    for (var i = 0; i < parti.length - 1; i++) {
      if (nodo[parti[i]] == null) nodo[parti[i]] = {};
      nodo = nodo[parti[i]];
    }
    nodo[parti[parti.length - 1]] = valore;
    if (percorso.indexOf("pellicola") !== 0 && percorso.indexOf("locale") !== 0 &&
        percorso !== "nome" && percorso !== "note") {
      // gli interventi locali dipendono dalla singola foto, non dalla pellicola;
      // qualunque altro ritocco manuale stacca la ricetta dal preset di pellicola
      if (stato.ricetta.pellicola !== "personalizzata" && !opzioni.mantieniPellicola) {
        stato.ricetta.pellicola = "personalizzata";
      }
    }
    notifica(percorso);
  }

  function leggi(percorso) {
    var parti = percorso.split(".");
    var nodo = stato.ricetta;
    for (var i = 0; i < parti.length; i++) {
      if (nodo == null) return undefined;
      nodo = nodo[parti[i]];
    }
    return nodo;
  }

  function sostituisci(nuovaRicetta, motivo) {
    registraCronologia();
    var base = U.clone(RICETTA_BASE);
    stato.ricetta = U.merge(base, nuovaRicetta || {});
    notifica(motivo || "sostituzione");
  }

  function annulla() {
    if (!stato.cronologia.length) return false;
    stato.futuro.push(U.clone(stato.ricetta));
    stato.ricetta = stato.cronologia.pop();
    notifica("annulla");
    return true;
  }

  function ripristina() {
    if (!stato.futuro.length) return false;
    stato.cronologia.push(U.clone(stato.ricetta));
    stato.ricetta = stato.futuro.pop();
    notifica("ripristina");
    return true;
  }

  function azzera() {
    sostituisci(U.clone(RICETTA_BASE), "azzeramento");
  }

  BN.stato = {
    base: RICETTA_BASE,
    ricetta: function () { return stato.ricetta; },
    imposta: imposta,
    leggi: leggi,
    sostituisci: sostituisci,
    annulla: annulla,
    ripristina: ripristina,
    azzera: azzera,
    osserva: function (fn) { stato.osservatori.push(fn); },
    live: function (v) { if (v !== undefined) stato.liveAttivo = !!v; return stato.liveAttivo; },
    puoAnnullare: function () { return stato.cronologia.length > 0; },
    puoRipristinare: function () { return stato.futuro.length > 0; }
  };
})(this);
