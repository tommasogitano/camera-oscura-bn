/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Camera Oscura BN — lettura e scrittura su disco.
   Tre destinazioni: la cartella dati del plugin (libreria di ricette),
   una cartella scelta dall'utente e memorizzata (preset di Camera Raw),
   e il salvataggio con finestra di dialogo per LUT ed esportazioni. */
(function (global) {
  "use strict";
  var BN = global.BN || (global.BN = {});
  var U = BN.util;

  var uxp = require("uxp");
  var fsl = uxp.storage.localFileSystem;
  var formats = uxp.storage.formats;

  var CHIAVE_RAW = "cameraOscuraBN.cartellaPresetRaw";
  var CHIAVE_LUT = "cameraOscuraBN.cartellaLut";

  async function salvaConDialogo(contenuto, nomeSuggerito) {
    var file = await fsl.getFileForSaving(nomeSuggerito);
    if (!file) return null;
    await file.write(contenuto, { format: formats.utf8 });
    return file;
  }

  async function apriConDialogo(estensioni) {
    var file = await fsl.getFileForOpening({ types: estensioni || ["json", "bnricetta"] });
    if (!file) return null;
    var testo = await file.read({ format: formats.utf8 });
    return { file: file, testo: testo };
  }

  /* ---- cartelle memorizzate ---- */

  async function cartellaMemorizzata(chiave) {
    var token = null;
    try { token = localStorage.getItem(chiave); } catch (e) { token = null; }
    if (!token) return null;
    try {
      return await fsl.getEntryForPersistentToken(token);
    } catch (e) {
      try { localStorage.removeItem(chiave); } catch (e2) {}
      return null;
    }
  }

  async function scegliCartella(chiave) {
    var cartella = await fsl.getFolder();
    if (!cartella) return null;
    try {
      var token = await fsl.createPersistentToken(cartella);
      localStorage.setItem(chiave, token);
    } catch (e) { /* la cartella resta valida per questa sessione */ }
    return cartella;
  }

  async function cartellaPresetRaw(chiediSeManca) {
    var c = await cartellaMemorizzata(CHIAVE_RAW);
    if (c) return c;
    if (!chiediSeManca) return null;
    return scegliCartella(CHIAVE_RAW);
  }

  async function cartellaLut(chiediSeManca) {
    var c = await cartellaMemorizzata(CHIAVE_LUT);
    if (c) return c;
    if (!chiediSeManca) return null;
    return scegliCartella(CHIAVE_LUT);
  }

  async function scriviInCartella(cartella, nomeFile, contenuto) {
    var file = await cartella.createFile(nomeFile, { overwrite: true });
    await file.write(contenuto, { format: formats.utf8 });
    return file;
  }

  /* ---- libreria di ricette nella cartella dati del plugin ---- */

  async function cartellaLibreria() {
    var dati = await fsl.getDataFolder();
    var voci = await dati.getEntries();
    for (var i = 0; i < voci.length; i++) {
      if (voci[i].name === "ricette" && voci[i].isFolder) return voci[i];
    }
    return dati.createFolder("ricette");
  }

  async function salvaInLibreria(ricetta) {
    var cartella = await cartellaLibreria();
    var nome = U.slug(ricetta.nome) + ".bnricetta.json";
    return scriviInCartella(cartella, nome, JSON.stringify(ricetta, null, 2));
  }

  async function elencoLibreria() {
    var cartella = await cartellaLibreria();
    var voci = await cartella.getEntries();
    var fuori = [];
    for (var i = 0; i < voci.length; i++) {
      var v = voci[i];
      if (!v.isFile || v.name.indexOf(".bnricetta.json") < 0) continue;
      try {
        var testo = await v.read({ format: formats.utf8 });
        var r = JSON.parse(testo);
        fuori.push({ nome: r.nome || v.name, file: v, ricetta: r });
      } catch (e) { /* voce illeggibile: si ignora */ }
    }
    fuori.sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome)); });
    return fuori;
  }

  async function eliminaDallaLibreria(voce) {
    if (voce && voce.file && voce.file.delete) return voce.file.delete();
    return false;
  }

  BN.file = {
    salvaConDialogo: salvaConDialogo,
    apriConDialogo: apriConDialogo,
    cartellaPresetRaw: cartellaPresetRaw,
    cartellaLut: cartellaLut,
    scegliCartellaPresetRaw: function () { return scegliCartella(CHIAVE_RAW); },
    scegliCartellaLut: function () { return scegliCartella(CHIAVE_LUT); },
    scriviInCartella: scriviInCartella,
    salvaInLibreria: salvaInLibreria,
    elencoLibreria: elencoLibreria,
    eliminaDallaLibreria: eliminaDallaLibreria
  };
})(this);
