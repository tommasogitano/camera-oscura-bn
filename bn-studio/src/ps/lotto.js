/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Camera Oscura BN — lavorazione a lotti.
   Applica la ricetta corrente a tutti i documenti aperti oppure a una
   cartella di immagini, salvando le copie sviluppate accanto agli originali. */
(function (global) {
  "use strict";
  var BN = global.BN || (global.BN = {});
  var P = BN.ps;
  var ps = require("photoshop");
  var uxp = require("uxp");
  var fsl = uxp.storage.localFileSystem;

  function log(m) { if (BN.log) BN.log.info(m); }

  async function documentiAperti(ricetta, appiattisci) {
    var elenco = ps.app.documents;
    var fatti = 0;
    for (var i = 0; i < elenco.length; i++) {
      var doc = elenco[i];
      try {
        ps.app.activeDocument = doc;
        await P.modale(async function () {
          await BN.pipeline.costruisci(ricetta);
          if (appiattisci) await P.esegui({ _obj: "flattenImage" }, "unifica");
        }, "Camera Oscura BN — lotto");
        fatti++;
        log("Sviluppato: " + doc.name);
      } catch (e) {
        if (BN.log) BN.log.errore(doc.name + ": " + ((e && e.message) || String(e)));
      }
    }
    return fatti;
  }

  var ESTENSIONI = ["jpg", "jpeg", "png", "tif", "tiff", "psd", "dng", "cr2", "cr3", "nef", "arw", "raf", "orf", "rw2"];

  async function cartella(ricetta, opzioni) {
    opzioni = opzioni || {};
    var sorgente = await fsl.getFolder();
    if (!sorgente) return 0;
    var destinazione = opzioni.stessaCartella ? sorgente : await fsl.getFolder();
    if (!destinazione) return 0;

    var voci = await sorgente.getEntries();
    var immagini = voci.filter(function (v) {
      if (!v.isFile) return false;
      var e = v.name.split(".").pop().toLowerCase();
      return ESTENSIONI.indexOf(e) >= 0;
    });

    var fatti = 0;
    for (var i = 0; i < immagini.length; i++) {
      var voce = immagini[i];
      try {
        var doc = await ps.app.open(voce);
        await P.modale(async function () {
          await BN.pipeline.costruisci(ricetta);
          await P.esegui({ _obj: "flattenImage" }, "unifica");
        }, "Camera Oscura BN — lotto cartella");

        var nomeBase = voce.name.replace(/\.[^.]+$/, "");
        var uscita = await destinazione.createFile(nomeBase + "_BN.jpg", { overwrite: true });
        await P.modale(async function () {
          await P.esegui({
            _obj: "save",
            as: { _obj: "JPEG", extendedQuality: 10, matteColor: { _enum: "matteColor", _value: "none" } },
            in: { _path: uscita.nativePath, _kind: "local" },
            lowerCase: true
          }, "salvataggio JPEG");
        }, "Camera Oscura BN — salvataggio");
        await doc.closeWithoutSaving();
        fatti++;
        log("Esportato: " + nomeBase + "_BN.jpg");
      } catch (e) {
        if (BN.log) BN.log.errore(voce.name + ": " + ((e && e.message) || String(e)));
      }
    }
    return fatti;
  }

  BN.lotto = { documentiAperti: documentiAperti, cartella: cartella, ESTENSIONI: ESTENSIONI };
})(this);
