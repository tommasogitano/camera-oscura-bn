/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Camera Oscura BN — provini a contatto.
   Costruisce un foglio con la stessa immagine sviluppata secondo piu
   ricette, per scegliere la resa confrontandola davvero invece che a memoria. */
(function (global) {
  "use strict";
  var BN = global.BN || (global.BN = {});
  var U = BN.util;
  var P = BN.ps;
  var ps = require("photoshop");

  async function ridimensiona(larghezza) {
    return P.esegui({
      _obj: "imageSize",
      width: { _unit: "pixelsUnit", _value: Math.round(larghezza) },
      constrainProportions: true,
      interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "automaticInterpolation" }
    }, "dimensione immagine");
  }

  async function appiattisci() {
    return P.esegui({ _obj: "flattenImage" }, "unifica immagine");
  }

  async function duplicaLivelloInDocumento(idDocumento, nome) {
    return P.esegui({
      _obj: "duplicate",
      _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
      to: { _ref: "document", _id: idDocumento },
      name: nome
    }, "duplica livello in documento");
  }

  async function spostaLivello(dx, dy) {
    return P.esegui({
      _obj: "move",
      _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
      to: {
        _obj: "offset",
        horizontal: { _unit: "pixelsUnit", _value: Math.round(dx) },
        vertical: { _unit: "pixelsUnit", _value: Math.round(dy) }
      }
    }, "sposta livello");
  }

  async function etichetta(testo, xPercento, yPercento, corpo) {
    try {
      await P.esegui({
        _obj: "make",
        _target: [{ _ref: "textLayer" }],
        using: {
          _obj: "textLayer",
          textKey: testo,
          warp: { _obj: "warp", warpStyle: { _enum: "warpStyle", _value: "warpNone" }, warpValue: 0, warpPerspective: 0, warpPerspectiveOther: 0, warpRotate: { _enum: "orientation", _value: "horizontal" } },
          textClickPoint: {
            _obj: "paint",
            horizontal: { _unit: "percentUnit", _value: xPercento },
            vertical: { _unit: "percentUnit", _value: yPercento }
          },
          textStyleRange: [{
            _obj: "textStyleRange", from: 0, to: testo.length,
            textStyle: {
              _obj: "textStyle",
              fontPostScriptName: "ArialMT",
              size: { _unit: "pointsUnit", _value: corpo },
              color: { _obj: "RGBColor", red: 30, grain: 30, blue: 30 }
            }
          }],
          paragraphStyleRange: [{
            _obj: "paragraphStyleRange", from: 0, to: testo.length,
            paragraphStyle: { _obj: "paragraphStyle", align: { _enum: "alignmentType", _value: "center" } }
          }]
        }
      }, "etichetta");
      return true;
    } catch (e) {
      return false;
    }
  }

  /* elenco: array di voci {id, nome, patch}. */
  async function costruisciProvini(elenco, ricettaCorrente, opzioni) {
    opzioni = opzioni || {};
    var origine = P.documento();
    if (!origine) throw new Error("Nessun documento aperto.");
    if (!elenco || !elenco.length) throw new Error("Nessuna ricetta selezionata per i provini.");

    var lati = opzioni.lato || 640;
    var colonne = opzioni.colonne || Math.min(4, Math.ceil(Math.sqrt(elenco.length)));
    var righe = Math.ceil(elenco.length / colonne);
    var proporzione = origine.height / origine.width;
    var cellaL = lati;
    var cellaA = Math.round(lati * proporzione);
    var margine = Math.round(lati * 0.05);
    var barra = Math.round(lati * 0.10);

    var foglioL = colonne * cellaL + (colonne + 1) * margine;
    var foglioA = righe * (cellaA + barra) + (righe + 1) * margine;

    var foglio = await ps.app.createDocument({
      width: foglioL,
      height: foglioA,
      resolution: 300,
      name: "Provini — " + (origine.name || "documento"),
      fill: "white"
    });

    var idOriginale = origine.id;
    for (var i = 0; i < elenco.length; i++) {
      var voce = elenco[i];
      var colonna = i % colonne, riga = Math.floor(i / colonne);
      var x = margine + colonna * (cellaL + margine);
      var y = margine + riga * (cellaA + barra + margine);

      var copia = null;
      try {
        var docOrig = ps.app.documents.filter(function (d) { return d.id === idOriginale; })[0];
        ps.app.activeDocument = docOrig;
        copia = await docOrig.duplicate("provino-" + voce.id);

        var ricetta = U.merge(U.clone(ricettaCorrente || BN.stato.base), voce.patch || {});
        ricetta.nome = voce.nome;
        await BN.pipeline.costruisci(ricetta);
        await appiattisci();
        await ridimensiona(cellaL);
        await duplicaLivelloInDocumento(foglio.id, voce.nome);

        ps.app.activeDocument = foglio;
        await spostaLivello(x, y);
        await etichetta(voce.nome, (x + cellaL / 2) / foglioL * 100, (y + cellaA + barra * 0.7) / foglioA * 100, Math.max(9, lati / 46));
      } finally {
        if (copia) {
          try { await copia.closeWithoutSaving(); } catch (e) {}
        }
      }
    }

    ps.app.activeDocument = foglio;
    return foglio;
  }

  async function provini(elenco, ricettaCorrente, opzioni) {
    return P.modale(async function () {
      return costruisciProvini(elenco, ricettaCorrente, opzioni);
    }, "Camera Oscura BN — provini");
  }

  BN.provini = { crea: provini };
})(this);
