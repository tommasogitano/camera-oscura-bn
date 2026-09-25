/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Camera Oscura BN — strato di accesso a Photoshop.
   Tutte le operazioni passano da batchPlay: qui stanno i descrittori,
   raccolti in un solo file per poterli correggere in un punto solo. */
(function (global) {
  "use strict";
  var BN = global.BN || (global.BN = {});

  var ps = require("photoshop");
  var app = ps.app;
  var core = ps.core;
  var azione = ps.action;

  var GRUPPO = "Camera Oscura BN";

  function log(msg) { if (BN.log) BN.log.info(msg); }

  /* Esecuzione di uno o piu descrittori. Restituisce l'array di risposte. */
  async function esegui(comandi, nome) {
    var lista = Array.isArray(comandi) ? comandi : [comandi];
    var risposta = await azione.batchPlay(lista, {
      synchronousExecution: false,
      modalBehavior: "execute"
    });
    var errore = null;
    risposta.forEach(function (r) {
      if (r && r.message && r._obj === "error") errore = r.message;
    });
    if (errore) throw new Error((nome ? nome + ": " : "") + errore);
    return risposta;
  }

  /* Ogni modifica al documento deve stare dentro executeAsModal. */
  async function modale(fn, nomeComando) {
    return core.executeAsModal(async function (executionContext) {
      var sospensione = null;
      try {
        sospensione = await executionContext.hostControl.suspendHistory({
          documentID: app.activeDocument.id,
          name: nomeComando || "Camera Oscura BN"
        });
      } catch (e) { /* la sospensione della cronologia e un lusso, non un obbligo */ }
      try {
        return await fn(executionContext);
      } finally {
        if (sospensione != null) {
          try { await executionContext.hostControl.resumeHistory(sospensione); } catch (e) {}
        }
      }
    }, { commandName: nomeComando || "Camera Oscura BN" });
  }

  function documento() {
    if (!app.documents || app.documents.length === 0) return null;
    return app.activeDocument;
  }

  /* ------------------------------------------------------------------ */
  /* Selezione e ricerca di livelli                                      */
  /* ------------------------------------------------------------------ */

  function cercaLivello(nome, contenitore) {
    var doc = contenitore || documento();
    if (!doc) return null;
    var strati = doc.layers;
    for (var i = 0; i < strati.length; i++) {
      var l = strati[i];
      if (l.name === nome) return l;
      if (l.layers && l.layers.length) {
        var dentro = cercaLivello(nome, l);
        if (dentro) return dentro;
      }
    }
    return null;
  }

  async function selezionaPerId(id) {
    return esegui({
      _obj: "select",
      _target: [{ _ref: "layer", _id: id }],
      makeVisible: false,
      layerID: [id]
    }, "selezione livello");
  }

  async function rinomina(id, nome) {
    await selezionaPerId(id);
    return esegui({
      _obj: "set",
      _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
      to: { _obj: "layer", name: nome }
    }, "rinomina");
  }

  async function elimina(id) {
    return esegui({ _obj: "delete", _target: [{ _ref: "layer", _id: id }] }, "eliminazione livello");
  }

  async function impostaFusione(id, modo, opacita) {
    await selezionaPerId(id);
    var to = { _obj: "layer" };
    if (modo) to.mode = { _enum: "blendMode", _value: modo };
    if (opacita != null) to.opacity = { _unit: "percentUnit", _value: Math.round(opacita) };
    return esegui({
      _obj: "set",
      _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
      to: to
    }, "fusione");
  }

  async function visibilita(id, visibile) {
    return esegui({
      _obj: visibile ? "show" : "hide",
      _target: [{ _ref: "layer", _id: id }]
    }, "visibilita");
  }

  /* ------------------------------------------------------------------ */
  /* Gruppi                                                              */
  /* ------------------------------------------------------------------ */

  async function creaGruppo(nome) {
    await esegui({
      _obj: "make",
      _target: [{ _ref: "layerSection" }],
      using: { _obj: "layerSection", name: nome }
    }, "creazione gruppo");
    return documento().activeLayers[0];
  }

  /* ------------------------------------------------------------------ */
  /* Livelli di regolazione                                              */
  /* ------------------------------------------------------------------ */

  function descrittoreBiancoNero(mix) {
    return {
      _obj: "blackAndWhite",
      presetKind: { _enum: "presetKindType", _value: "presetKindCustom" },
      red: Math.round(mix.rosso),
      yellow: Math.round(mix.giallo),
      green: Math.round(mix.verde),
      cyan: Math.round(mix.ciano),
      blue: Math.round(mix.blu),
      magenta: Math.round(mix.magenta),
      useTint: false,
      tintColor: { _obj: "RGBColor", red: 225, grain: 211, blue: 179 }
    };
  }

  async function creaBiancoNero(nome, mix) {
    await esegui({
      _obj: "make",
      _target: [{ _ref: "adjustmentLayer" }],
      using: { _obj: "adjustmentLayer", name: nome, type: descrittoreBiancoNero(mix) }
    }, "creazione Bianco e nero");
    return documento().activeLayers[0];
  }

  async function aggiornaBiancoNero(id, mix) {
    await selezionaPerId(id);
    return esegui({
      _obj: "set",
      _target: [{ _ref: "adjustmentLayer", _enum: "ordinal", _value: "targetEnum" }],
      to: descrittoreBiancoNero(mix)
    }, "aggiornamento Bianco e nero");
  }

  function descrittoreCurve(punti) {
    var lista = punti.map(function (p) {
      return { _obj: "paint", horizontal: Math.round(p[0]), vertical: Math.round(p[1]) };
    });
    return {
      _obj: "curves",
      presetKind: { _enum: "presetKindType", _value: "presetKindCustom" },
      adjustment: [{
        _obj: "curvesAdjustment",
        channel: { _ref: "channel", _enum: "channel", _value: "composite" },
        curve: lista
      }]
    };
  }

  async function creaCurve(nome, punti) {
    await esegui({
      _obj: "make",
      _target: [{ _ref: "adjustmentLayer" }],
      using: {
        _obj: "adjustmentLayer", name: nome,
        type: { _obj: "curves", presetKind: { _enum: "presetKindType", _value: "presetKindDefault" } }
      }
    }, "creazione Curve");
    var livello = documento().activeLayers[0];
    if (punti && punti.length >= 2) await aggiornaCurve(livello.id, punti);
    return livello;
  }

  async function aggiornaCurve(id, punti) {
    await selezionaPerId(id);
    return esegui({
      _obj: "set",
      _target: [{ _ref: "adjustmentLayer", _enum: "ordinal", _value: "targetEnum" }],
      to: descrittoreCurve(punti)
    }, "aggiornamento Curve");
  }

  function coloreRGB(rgb) {
    return {
      _obj: "RGBColor",
      red: Math.round(rgb[0] * 255),
      grain: Math.round(rgb[1] * 255),   /* "grain" e il nome storico del canale verde nei descrittori */
      blue: Math.round(rgb[2] * 255)
    };
  }

  function descrittoreSfumatura(stops) {
    var colori = stops.map(function (s) {
      return {
        _obj: "colorStop",
        color: coloreRGB(BN.util.hexToRgb(s[1])),
        type: { _enum: "colorStopType", _value: "userStop" },
        location: Math.round(s[0] * 4096),
        midpoint: 50
      };
    });
    return {
      _obj: "gradientClassEvent",
      name: "Camera Oscura BN",
      gradientForm: { _enum: "gradientForm", _value: "customStops" },
      interfaceIconFrameDimmed: 4096,
      colors: colori,
      transparency: [
        { _obj: "transferSpec", opacity: { _unit: "percentUnit", _value: 100 }, location: 0, midpoint: 50 },
        { _obj: "transferSpec", opacity: { _unit: "percentUnit", _value: 100 }, location: 4096, midpoint: 50 }
      ]
    };
  }

  async function creaMappaSfumatura(nome, stops) {
    await esegui({
      _obj: "make",
      _target: [{ _ref: "adjustmentLayer" }],
      using: {
        _obj: "adjustmentLayer", name: nome,
        type: {
          _obj: "gradientMapClass",
          gradientsInterpolationMethod: { _enum: "gradientInterpolationMethodType", _value: "perceptual" },
          gradient: descrittoreSfumatura(stops)
        }
      }
    }, "creazione Mappa sfumatura");
    return documento().activeLayers[0];
  }

  async function aggiornaMappaSfumatura(id, stops) {
    await selezionaPerId(id);
    return esegui({
      _obj: "set",
      _target: [{ _ref: "adjustmentLayer", _enum: "ordinal", _value: "targetEnum" }],
      to: {
        _obj: "gradientMapClass",
        gradientsInterpolationMethod: { _enum: "gradientInterpolationMethodType", _value: "perceptual" },
        gradient: descrittoreSfumatura(stops)
      }
    }, "aggiornamento Mappa sfumatura");
  }

  function descrittoreBilanciamento(ombre, mezzi, luci) {
    return {
      _obj: "colorBalance",
      shadowLevels: ombre,
      midtoneLevels: mezzi,
      highlightLevels: luci,
      preserveLuminosity: true
    };
  }

  async function creaBilanciamento(nome, ombre, mezzi, luci) {
    await esegui({
      _obj: "make",
      _target: [{ _ref: "adjustmentLayer" }],
      using: { _obj: "adjustmentLayer", name: nome, type: descrittoreBilanciamento(ombre, mezzi, luci) }
    }, "creazione Bilanciamento colore");
    return documento().activeLayers[0];
  }

  async function aggiornaBilanciamento(id, ombre, mezzi, luci) {
    await selezionaPerId(id);
    return esegui({
      _obj: "set",
      _target: [{ _ref: "adjustmentLayer", _enum: "ordinal", _value: "targetEnum" }],
      to: descrittoreBilanciamento(ombre, mezzi, luci)
    }, "aggiornamento Bilanciamento colore");
  }

  async function creaTintaUnita(nome, rgb) {
    await esegui({
      _obj: "make",
      _target: [{ _ref: "contentLayer" }],
      using: {
        _obj: "contentLayer", name: nome,
        type: { _obj: "solidColorLayer", color: coloreRGB(rgb) }
      }
    }, "creazione Tinta unita");
    return documento().activeLayers[0];
  }

  /* ------------------------------------------------------------------ */
  /* Livelli pixel, filtri, maschere                                     */
  /* ------------------------------------------------------------------ */

  async function creaLivelloNeutro(nome, modo) {
    await esegui({
      _obj: "make",
      _target: [{ _ref: "layer" }],
      using: {
        _obj: "layer",
        name: nome,
        mode: { _enum: "blendMode", _value: modo || "overlay" },
        opacity: { _unit: "percentUnit", _value: 100 },
        fillNeutral: true
      }
    }, "creazione livello neutro");
    return documento().activeLayers[0];
  }

  async function creaLivelloVuoto(nome) {
    await esegui({
      _obj: "make",
      _target: [{ _ref: "layer" }],
      using: { _obj: "layer", name: nome }
    }, "creazione livello");
    return documento().activeLayers[0];
  }

  /* Timbro del visibile: crea un livello con la fusione di quanto e visibile. */
  async function timbroVisibile(nome) {
    var l = await creaLivelloVuoto(nome || "Timbro");
    await esegui({ _obj: "mergeVisible", duplicate: true }, "timbro del visibile");
    return documento().activeLayers[0] || l;
  }

  async function aggiungiDisturbo(quantita, monocromatico) {
    return esegui({
      _obj: "addNoise",
      distribution: { _enum: "distribution", _value: "gaussianDistribution" },
      noise: { _unit: "percentUnit", _value: Number(quantita.toFixed(2)) },
      monochromatic: monocromatico !== false
    }, "aggiungi disturbo");
  }

  async function sfocaturaGaussiana(raggio) {
    return esegui({
      _obj: "gaussianBlur",
      radius: { _unit: "pixelsUnit", _value: Number(raggio.toFixed(2)) }
    }, "sfocatura gaussiana");
  }

  async function maschera(quantita, raggio, soglia) {
    return esegui({
      _obj: "unsharpMask",
      amount: { _unit: "percentUnit", _value: Math.round(quantita) },
      radius: { _unit: "pixelsUnit", _value: Number(raggio.toFixed(2)) },
      threshold: Math.round(soglia || 0)
    }, "maschera di contrasto");
  }

  async function accentuaPassaggio(raggio) {
    return esegui({
      _obj: "highPass",
      radius: { _unit: "pixelsUnit", _value: Number(raggio.toFixed(2)) }
    }, "accentua passaggio");
  }

  async function desatura() {
    return esegui({
      _obj: "desaturate",
      _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }]
    }, "desatura");
  }

  /* Carica la luminosita del composito come selezione (equivale a Ctrl+Alt+2). */
  /* ------------------------------------------------------------------ */
  /* Punti presi sulla foto (maschera radiale)                           */
  /* ------------------------------------------------------------------ */

  /* Strumento attivo, per poterlo rimettere dopo. Null se non leggibile. */
  async function strumentoAttivo() {
    try {
      if (app.currentTool && app.currentTool.id) return app.currentTool.id;
    } catch (e) { /* si prova con batchPlay */ }
    try {
      var r = await azione.batchPlay([{
        _obj: "get",
        _target: [{ _property: "tool" }, { _ref: "application", _enum: "ordinal", _value: "targetEnum" }]
      }], { synchronousExecution: false });
      var t = r && r[0] && r[0].tool;
      if (!t) return null;
      if (typeof t === "string") return t;
      return t._value || t._enum || null;
    } catch (e) { return null; }
  }

  async function selezionaStrumento(nome) {
    if (!nome) return;
    var comando = { _obj: "select", _target: [{ _ref: nome }] };
    try {
      await azione.batchPlay([comando], { synchronousExecution: false });
    } catch (e) {
      await core.executeAsModal(function () {
        return azione.batchPlay([comando], { synchronousExecution: false, modalBehavior: "execute" });
      }, { commandName: "Camera Oscura BN: strumento" });
    }
  }

  /* Punti del campionatore colore presenti nel documento, in pixel. */
  function puntiCampionatore() {
    var doc = documento();
    if (!doc || !doc.colorSamplers) return [];
    var elenco = [];
    for (var i = 0; i < doc.colorSamplers.length; i++) {
      var p = doc.colorSamplers[i].position;
      if (p) elenco.push([Number(p.x), Number(p.y)]);
    }
    return elenco;
  }

  async function rimuoviCampionatori() {
    var doc = documento();
    if (!doc || !doc.colorSamplers || !doc.colorSamplers.length) return;
    await core.executeAsModal(async function () {
      try { doc.colorSamplers.removeAll(); }
      catch (e) {
        for (var i = doc.colorSamplers.length - 1; i >= 0; i--) {
          try { doc.colorSamplers[i].remove(); } catch (e2) {}
        }
      }
    }, { commandName: "Camera Oscura BN: punto" });
  }

  /* Rettangolo che contiene la selezione attiva, in pixel; null se non c'e. */
  async function limitiSelezione() {
    var doc = documento();
    if (!doc) return null;
    try {
      var r = await azione.batchPlay([{
        _obj: "get",
        _target: [{ _property: "selection" }, { _ref: "document", _enum: "ordinal", _value: "targetEnum" }]
      }], { synchronousExecution: false });
      var sel = r && r[0] && r[0].selection;
      if (!sel || sel.left == null) return null;
      var risoluzione = Number(doc.resolution) || 72;
      var px = function (v) {
        if (v == null) return 0;
        if (typeof v === "number") return v;
        if (v._unit === "distanceUnit") return v._value * risoluzione / 72;
        return v._value;
      };
      var b = { sinistra: px(sel.left), alto: px(sel.top), destra: px(sel.right), basso: px(sel.bottom) };
      if (b.destra - b.sinistra < 2 || b.basso - b.alto < 2) return null;
      return b;
    } catch (e) { return null; }
  }

  async function selezionaLuminosita() {
    return esegui({
      _obj: "set",
      _target: [{ _ref: "channel", _property: "selection" }],
      to: { _ref: "channel", _enum: "channel", _value: "RGB" }
    }, "selezione luminosita");
  }

  async function invertiSelezione() {
    return esegui({ _obj: "inverse" }, "inverti selezione");
  }

  async function deseleziona() {
    return esegui({
      _obj: "set",
      _target: [{ _ref: "channel", _property: "selection" }],
      to: { _enum: "ordinal", _value: "none" }
    }, "deseleziona");
  }

  async function aggiungiMaschera(daSelezione) {
    var comando = {
      _obj: "make",
      "new": { _class: "channel" },
      at: { _ref: "channel", _enum: "channel", _value: "mask" },
      using: { _enum: "userMaskEnabled", _value: daSelezione ? "revealSelection" : "revealAll" }
    };
    try {
      return await esegui(comando, "aggiungi maschera");
    } catch (e) {
      /* I livelli di regolazione nascono gia con una maschera bianca e
         Photoshop rifiuta di crearne una seconda: si toglie quella vuota
         (la selezione resta attiva) e si crea quella giusta. */
      await esegui({
        _obj: "delete",
        _target: [{ _ref: "channel", _enum: "channel", _value: "mask" }]
      }, "elimina maschera vuota");
      return esegui(comando, "aggiungi maschera");
    }
  }

  async function selezionaMaschera() {
    return esegui({
      _obj: "select",
      _target: [{ _ref: "channel", _enum: "channel", _value: "mask" }],
      makeVisible: false
    }, "seleziona maschera");
  }

  async function selezionaCompositoRGB() {
    return esegui({
      _obj: "select",
      _target: [{ _ref: "channel", _enum: "channel", _value: "RGB" }],
      makeVisible: false
    }, "seleziona composito");
  }

  /* Sfumatura radiale, usata per la vignettatura sulla maschera. */
  async function sfumaturaRadiale(cx, cy, raggio, stops, inverti) {
    return esegui({
      _obj: "gradientClassEvent",
      from: { _obj: "paint", horizontal: { _unit: "pixelsUnit", _value: cx }, vertical: { _unit: "pixelsUnit", _value: cy } },
      to: { _obj: "paint", horizontal: { _unit: "pixelsUnit", _value: cx + raggio }, vertical: { _unit: "pixelsUnit", _value: cy } },
      type: { _enum: "gradientType", _value: "radial" },
      dither: true,
      reverse: !!inverti,
      gradient: descrittoreSfumatura(stops)
    }, "sfumatura radiale");
  }

  async function riempi(rgb) {
    return esegui({
      _obj: "fill",
      using: { _enum: "fillContents", _value: "color" },
      color: coloreRGB(rgb),
      opacity: { _unit: "percentUnit", _value: 100 },
      mode: { _enum: "blendMode", _value: "normal" }
    }, "riempimento");
  }

  /* Riempie il canale o il livello attivo di nero, bianco o grigio 50%
     (serve sulle maschere, dove un colore RGB non ha senso). */
  async function riempiNeutro(quale) {
    return esegui({
      _obj: "fill",
      using: { _enum: "fillContents", _value: quale === "bianco" ? "white" : quale === "grigio" ? "gray" : "black" },
      opacity: { _unit: "percentUnit", _value: 100 },
      mode: { _enum: "blendMode", _value: "normal" }
    }, "riempimento " + quale);
  }

  /* Selezione ellittica inscritta nel rettangolo dato, in pixel. */
  async function selezioneEllittica(sinistra, alto, destra, basso) {
    return esegui({
      _obj: "set",
      _target: [{ _ref: "channel", _property: "selection" }],
      to: {
        _obj: "ellipse",
        top: { _unit: "pixelsUnit", _value: Number(alto.toFixed(2)) },
        left: { _unit: "pixelsUnit", _value: Number(sinistra.toFixed(2)) },
        bottom: { _unit: "pixelsUnit", _value: Number(basso.toFixed(2)) },
        right: { _unit: "pixelsUnit", _value: Number(destra.toFixed(2)) }
      },
      antiAlias: true
    }, "selezione ellittica");
  }

  /* Selezione poligonale da una lista di punti [x, y] in pixel. */
  async function selezionePoligono(punti) {
    return esegui({
      _obj: "set",
      _target: [{ _ref: "channel", _property: "selection" }],
      to: {
        _obj: "polygon",
        points: punti.map(function (p) {
          return {
            _obj: "paint",
            horizontal: { _unit: "pixelsUnit", _value: Number(p[0].toFixed(2)) },
            vertical: { _unit: "pixelsUnit", _value: Number(p[1].toFixed(2)) }
          };
        })
      },
      antiAlias: true
    }, "selezione poligonale");
  }

  /* Ruota la selezione attiva attorno al suo centro (Trasforma selezione).
     Angolo in gradi, positivo in senso orario. */
  async function ruotaSelezione(gradi) {
    return esegui({
      _obj: "transform",
      _target: [{ _ref: "channel", _property: "selection" }],
      freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
      offset: {
        _obj: "offset",
        horizontal: { _unit: "pixelsUnit", _value: 0 },
        vertical: { _unit: "pixelsUnit", _value: 0 }
      },
      angle: { _unit: "angleUnit", _value: Number(gradi.toFixed(2)) }
    }, "ruota selezione");
  }

  async function dimensioneQuadro(larghezza, altezza, relativo) {
    var d = {
      _obj: "canvasSize",
      width: { _unit: "pixelsUnit", _value: Math.round(larghezza) },
      height: { _unit: "pixelsUnit", _value: Math.round(altezza) },
      horizontal: { _enum: "horizontalLocation", _value: "center" },
      vertical: { _enum: "verticalLocation", _value: "center" },
      canvasExtensionColorType: { _enum: "canvasExtensionColorType", _value: "backgroundColor" }
    };
    if (relativo) d.relative = true;
    return esegui(d, "dimensione quadro");
  }

  async function convertiInOggettoAvanzato() {
    return esegui({ _obj: "newPlacedLayer" }, "converti in oggetto avanzato");
  }

  BN.ps = {
    GRUPPO: GRUPPO,
    ps: ps, app: app, core: core,
    esegui: esegui,
    modale: modale,
    documento: documento,
    cercaLivello: cercaLivello,
    selezionaPerId: selezionaPerId,
    rinomina: rinomina,
    elimina: elimina,
    impostaFusione: impostaFusione,
    visibilita: visibilita,
    creaGruppo: creaGruppo,
    creaBiancoNero: creaBiancoNero,
    aggiornaBiancoNero: aggiornaBiancoNero,
    creaCurve: creaCurve,
    aggiornaCurve: aggiornaCurve,
    creaMappaSfumatura: creaMappaSfumatura,
    aggiornaMappaSfumatura: aggiornaMappaSfumatura,
    creaBilanciamento: creaBilanciamento,
    aggiornaBilanciamento: aggiornaBilanciamento,
    creaTintaUnita: creaTintaUnita,
    creaLivelloNeutro: creaLivelloNeutro,
    creaLivelloVuoto: creaLivelloVuoto,
    timbroVisibile: timbroVisibile,
    aggiungiDisturbo: aggiungiDisturbo,
    sfocaturaGaussiana: sfocaturaGaussiana,
    maschera: maschera,
    accentuaPassaggio: accentuaPassaggio,
    desatura: desatura,
    selezionaLuminosita: selezionaLuminosita,
    invertiSelezione: invertiSelezione,
    deseleziona: deseleziona,
    aggiungiMaschera: aggiungiMaschera,
    selezionaMaschera: selezionaMaschera,
    selezionaCompositoRGB: selezionaCompositoRGB,
    sfumaturaRadiale: sfumaturaRadiale,
    riempi: riempi,
    riempiNeutro: riempiNeutro,
    selezioneEllittica: selezioneEllittica,
    ruotaSelezione: ruotaSelezione,
    selezionePoligono: selezionePoligono,
    dimensioneQuadro: dimensioneQuadro,
    convertiInOggettoAvanzato: convertiInOggettoAvanzato,
    coloreRGB: coloreRGB,
    strumentoAttivo: strumentoAttivo,
    selezionaStrumento: selezionaStrumento,
    puntiCampionatore: puntiCampionatore,
    rimuoviCampionatori: rimuoviCampionatori,
    limitiSelezione: limitiSelezione
  };
})(this);
