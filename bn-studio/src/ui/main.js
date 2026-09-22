/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Camera Oscura BN — collegamento fra interfaccia e motore. */
(function (global) {
  "use strict";
  var BN = global.BN || (global.BN = {});
  var U = BN.util;

  var aggiornandoUI = false;
  var pipelineAttiva = false;      /* diventa vero dopo il primo sviluppo */
  var proviniScelti = null;

  function $(id) { return document.getElementById(id); }
  function tutti(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  /* ------------------------------------------------------------------ */
  /* Applicazione a Photoshop                                            */
  /* ------------------------------------------------------------------ */

  /* Gli sviluppi non possono sovrapporsi: una ricostruzione con struttura
     e grana dura decine di secondi, e un secondo sviluppo avviato nel mezzo
     la spezza lasciando livelli sciolti. Mentre uno lavora, le modifiche
     successive si accumulano in una sola richiesta, eseguita alla fine. */
  var sviluppoInCorso = false;
  var richiestaInAttesa = null;

  /* Segnale visibile di lavoro in corso. Mentre Photoshop esegue uno
     sviluppo lungo (struttura, grana: decine di secondi) il pannello non
     riceve i movimenti dei cursori: meglio dirlo chiaramente, spegnere i
     controlli e riaccenderli alla fine, invece di perdere modifiche in
     silenzio. I controlli gia spenti per conto loro restano spenti. */
  var SELETTORE_CONTROLLI = "sp-slider, sp-button, sp-action-button, sp-dropdown, sp-checkbox, sp-textfield";
  var spentiDaNoi = [];
  var inizioLavoro = 0;
  var orologioLavoro = null;
  var lavoriAperti = 0;

  function mostraLavoro(testo) {
    var riga = $("statoSviluppo");
    var etichetta = $("testoSviluppo");
    if (etichetta) etichetta.textContent = testo;
    if (riga) riga.classList.remove("nascosto");
    var app = document.querySelector(".app");
    if (app) app.classList.add("occupato");
  }

  function aggiornaOrologio(testo) {
    var sec = Math.floor((Date.now() - inizioLavoro) / 1000);
    var etichetta = $("testoSviluppo");
    if (etichetta) etichetta.textContent = testo + (sec >= 2 ? " · " + sec + " s" : "");
  }

  function iniziaLavoro(testo) {
    lavoriAperti++;
    if (lavoriAperti > 1) { mostraLavoro(testo); return; }
    inizioLavoro = Date.now();
    spentiDaNoi = [];
    tutti(SELETTORE_CONTROLLI).forEach(function (el) {
      if (el.id === "btnPulisciLog") return;
      if (el.hasAttribute("disabled")) return;
      el.setAttribute("disabled", "true");
      spentiDaNoi.push(el);
    });
    mostraLavoro(testo);
    if (orologioLavoro) clearInterval(orologioLavoro);
    orologioLavoro = setInterval(function () { aggiornaOrologio(testo); }, 1000);
  }

  function fineLavoro() {
    lavoriAperti = Math.max(0, lavoriAperti - 1);
    if (lavoriAperti > 0) return;
    if (orologioLavoro) { clearInterval(orologioLavoro); orologioLavoro = null; }
    spentiDaNoi.forEach(function (el) { el.removeAttribute("disabled"); });
    spentiDaNoi = [];
    var riga = $("statoSviluppo");
    if (riga) riga.classList.add("nascosto");
    var app = document.querySelector(".app");
    if (app) app.classList.remove("occupato");
  }

  /* UXP ridisegna il pannello solo quando il codice cede il passo: se si
     chiama subito Photoshop, il pannello si blocca prima di aver mostrato
     il segnale. Una breve pausa gli lascia il tempo di dipingerlo. */
  function lasciaDipingere() {
    return new Promise(function (fatto) { setTimeout(fatto, 120); });
  }

  /* Esegue un lavoro lungo con il segnale acceso; lo spegne sempre. */
  async function conSegnale(testo, lavoro) {
    iniziaLavoro(testo);
    await lasciaDipingere();
    try { return await lavoro(); }
    finally { fineLavoro(); }
  }

  function occupato() { return lavoriAperti > 0; }

  function unisci(attesa, nuovo) {
    if (!attesa) return { cambiamento: nuovo };
    if (attesa.cambiamento !== nuovo) return { cambiamento: undefined };
    return attesa;
  }

  async function applicaOra(cambiamento) {
    if (!BN.ps.documento()) {
      BN.log.avviso("Apri un documento prima di sviluppare.");
      return;
    }
    if (sviluppoInCorso) {
      richiestaInAttesa = unisci(richiestaInAttesa, cambiamento);
      return;
    }
    sviluppoInCorso = true;
    iniziaLavoro(pipelineAttiva ? "Sviluppo in corso" : "Primo sviluppo in corso");
    try {
      await lasciaDipingere();
      try {
        await BN.pipeline.applica(BN.stato.ricetta(), cambiamento);
        pipelineAttiva = true;
      } catch (e) {
        BN.log.errore("Sviluppo non riuscito: " + ((e && e.message) || String(e)));
      } finally {
        sviluppoInCorso = false;
      }
      if (richiestaInAttesa) {
        var prossima = richiestaInAttesa;
        richiestaInAttesa = null;
        await applicaOra(prossima.cambiamento);
      }
    } finally {
      fineLavoro();
    }
  }

  var applicaRitardata = U.debounce(function (cambiamento) {
    if (!pipelineAttiva || !BN.stato.live()) return;
    applicaOra(cambiamento);
  }, 320);

  /* ------------------------------------------------------------------ */
  /* Costruzione dei controlli                                           */
  /* ------------------------------------------------------------------ */

  function riempiMenu(idDropdown, voci, valoreCorrente) {
    var dd = $(idDropdown);
    if (!dd) return;
    var menu = dd.querySelector("sp-menu");
    if (!menu) return;
    menu.innerHTML = "";
    voci.forEach(function (v, i) {
      var item = document.createElement("sp-menu-item");
      item.setAttribute("value", v.id);
      item.textContent = v.nome;
      if (v.id === valoreCorrente) item.setAttribute("selected", "true");
      menu.appendChild(item);
    });
    dd.__voci = voci;
  }

  function valoreMenu(dd) {
    var voci = dd.__voci;
    var indice = dd.selectedIndex;
    if (voci && indice != null && indice >= 0 && voci[indice]) return voci[indice].id;
    var sel = dd.querySelector("sp-menu-item[selected]");
    return sel ? sel.getAttribute("value") : null;
  }

  function selezionaMenu(dd, valore) {
    if (!dd) return;
    var voci = dd.__voci;
    if (voci) {
      for (var i = 0; i < voci.length; i++) {
        if (voci[i].id === valore) { dd.selectedIndex = i; return; }
      }
      return;
    }
    var items = dd.querySelectorAll("sp-menu-item");
    for (var k = 0; k < items.length; k++) {
      if (items[k].getAttribute("value") === String(valore)) { dd.selectedIndex = k; return; }
    }
  }

  function costruisciGrigliaPellicole() {
    function pastiglie(contenitore, elenco) {
      var c = $(contenitore);
      if (!c) return;
      c.innerHTML = "";
      elenco.forEach(function (p) {
        var b = document.createElement("div");
        b.className = "pastiglia";
        b.setAttribute("data-pellicola", p.id);
        b.textContent = p.marca && p.marca !== "—" ? p.marca + " " + p.nome : p.nome;
        b.addEventListener("click", function () { applicaPellicola(p.id); });
        c.appendChild(b);
      });
    }
    pastiglie("grigliaPellicole", BN.pellicole.elenco);
    pastiglie("grigliaInterpretazioni", BN.pellicole.interpretazioni);
  }

  function applicaPellicola(id) {
    var p = BN.pellicole.trova(id);
    if (!p) return;
    var nuova = U.merge(U.clone(BN.stato.base), U.clone(BN.stato.ricetta()));
    U.merge(nuova, U.clone(p.patch || {}));
    nuova.pellicola = id;
    nuova.nome = p.nome;
    nuova.note = p.nota || "";
    BN.stato.sostituisci(nuova, "pellicola." + id);
    if (pipelineAttiva) applicaOra("pellicola");
  }

  function costruisciCursoriZone() {
    var c = $("cursoriZone");
    if (!c) return;
    c.innerHTML = "";
    BN.pipeline.ZONE_NOMI.forEach(function (nome, i) {
      var riga = document.createElement("div");
      riga.className = "riga cursore";
      var lab = document.createElement("label");
      lab.textContent = nome;
      var s = document.createElement("sp-slider");
      s.setAttribute("min", "-100");
      s.setAttribute("max", "100");
      s.setAttribute("step", "1");
      s.setAttribute("data-p", "zone.valori." + i);
      var val = document.createElement("span");
      val.className = "val";
      riga.appendChild(lab); riga.appendChild(s); riga.appendChild(val);
      c.appendChild(riga);
      agganciaCursore(s);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Cursori generici                                                    */
  /* ------------------------------------------------------------------ */

  function leggiPercorso(percorso) {
    var parti = percorso.split(".");
    var nodo = BN.stato.ricetta();
    for (var i = 0; i < parti.length; i++) {
      if (nodo == null) return undefined;
      nodo = nodo[parti[i]];
    }
    return nodo;
  }

  function scriviPercorso(percorso, valore) {
    /* Gli array (le zone) hanno indici numerici nel percorso. */
    var parti = percorso.split(".");
    if (parti[0] === "zone" && parti[1] === "valori") {
      var valori = (BN.stato.leggi("zone.valori") || []).slice();
      valori[parseInt(parti[2], 10)] = valore;
      BN.stato.imposta("zone.valori", valori);
      return;
    }
    /* Muovere la tinta vuol dire scegliere il filtro a ruota. */
    if (percorso === "conversione.tintaFiltro" && BN.stato.leggi("conversione.filtro") !== "tinta") {
      BN.stato.imposta("conversione.filtro", "tinta", { senzaCronologia: true });
    }
    BN.stato.imposta(percorso, valore);
  }

  function agganciaCursore(s) {
    var percorso = s.getAttribute("data-p");
    if (!percorso) return;
    function gestisci(e) {
      if (aggiornandoUI) return;
      var v = parseFloat(e.target.value);
      if (isNaN(v)) return;
      scriviPercorso(percorso, v);
    }
    s.addEventListener("input", gestisci);
    s.addEventListener("change", gestisci);
  }

  function agganciaTuttiICursori() {
    tutti("sp-slider[data-p]").forEach(agganciaCursore);
  }

  function aggiornaCursori() {
    tutti("sp-slider[data-p]").forEach(function (s) {
      var percorso = s.getAttribute("data-p");
      var v;
      var parti = percorso.split(".");
      if (parti[0] === "zone" && parti[1] === "valori") {
        v = (BN.stato.leggi("zone.valori") || [])[parseInt(parti[2], 10)] || 0;
      } else {
        v = leggiPercorso(percorso);
      }
      if (v == null || isNaN(v)) v = 0;
      s.value = v;
      var riga = s.parentNode;
      var val = riga ? riga.querySelector(".val") : null;
      if (val) val.textContent = (Math.abs(v) < 10 && String(v).indexOf(".") >= 0) ? U.round(v, 2) : Math.round(v);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Altezza dell'area scorrevole                                        */
  /* ------------------------------------------------------------------ */

  /* Rete di sicurezza: se in questa versione di UXP il calcolo flessibile
     non assegna un'altezza al contenitore, gliela si assegna a mano, cosi
     la barra di scorrimento compare comunque. */
  function adattaAltezza() {
    var contenuto = document.querySelector(".contenuto");
    if (!contenuto) return;
    var disponibile = (document.body && document.body.clientHeight) || window.innerHeight || 0;
    if (disponibile < 120) return;
    var intestazione = document.querySelector(".intestazione");
    var schede = document.querySelector(".schede");
    var occupato = (intestazione ? intestazione.offsetHeight : 0) + (schede ? schede.offsetHeight : 0);
    contenuto.style.height = Math.max(100, disponibile - occupato) + "px";
    contenuto.style.overflowY = "auto";
  }

  /* ------------------------------------------------------------------ */
  /* Schede                                                              */
  /* ------------------------------------------------------------------ */

  function mostraScheda(nome) {
    tutti(".pannello").forEach(function (p) {
      if (p.getAttribute("data-pannello") === nome) p.classList.remove("nascosto");
      else p.classList.add("nascosto");
    });
    tutti(".scheda").forEach(function (b) {
      if (b.getAttribute("data-scheda") === nome) b.classList.add("attiva");
      else b.classList.remove("attiva");
    });
    /* Le tele vanno ridisegnate DOPO che UXP ha impaginato la scheda appena
       mostrata: un disegno sincrono su una tela ancora nascosta va perso e la
       tela resta scura. Due passaggi, per le macchine lente. */
    function ridisegna() {
      if (nome === "tono" || nome === "finiture") BN.curvaUI.disegna();
      if (nome === "conversione") disegnaTinta();
    }
    ridisegna();
    setTimeout(ridisegna, 60);
    setTimeout(ridisegna, 300);
    var contenuto = document.querySelector(".contenuto");
    if (contenuto) contenuto.scrollTop = 0;
    adattaAltezza();
  }

  /* Striscia della ruota di tinta, con il segno sulla tinta scelta. */
  function disegnaTinta() {
    var t = $("telaTinta");
    if (!t) return;
    var c;
    try { c = t.getContext("2d"); } catch (e) { return; }
    if (!c) return;
    var w = t.width, h = t.height;
    var r = BN.stato.ricetta();
    var attiva = r.conversione.filtro === "tinta";
    for (var x = 0; x < w; x++) {
      var rgb = U.hslToRgb(x / w * 360, attiva ? 0.8 : 0.25, 0.5);
      c.fillStyle = U.rgbToHex(rgb[0], rgb[1], rgb[2]);
      c.fillRect(x, 0, 1, h);
    }
    var pos = Math.round(((r.conversione.tintaFiltro || 0) % 360) / 360 * w);
    c.fillStyle = "#000000";
    c.fillRect(Math.max(0, pos - 2), 0, 5, h);
    c.fillStyle = "#ffffff";
    c.fillRect(Math.max(0, pos - 1), 0, 3, h);
  }

  /* ------------------------------------------------------------------ */
  /* Sincronizzazione completa dell'interfaccia                          */
  /* ------------------------------------------------------------------ */

  function sincronizza() {
    aggiornandoUI = true;
    try {
      var r = BN.stato.ricetta();

      var nome = $("nomeRicetta");
      if (nome && nome.value !== r.nome) nome.value = r.nome || "";

      aggiornaCursori();

      selezionaMenu($("ddFiltro"), r.conversione.filtro);
      selezionaMenu($("ddViraggio"), r.finiture.viraggio);
      selezionaMenu($("ddMotore"), r.grana.motore);
      selezionaMenu($("ddBordo"), r.finiture.bordo.tipo);

      var chkG = $("chkGrana"); if (chkG) chkG.checked = !!r.grana.attiva;
      var chkZ = $("chkZone"); if (chkZ) chkZ.checked = !!r.zone.attivo;

      var seme = $("semeCorrente");
      if (seme) seme.textContent = "seme " + r.grana.seme;

      tutti("[data-pellicola]").forEach(function (b) {
        if (b.getAttribute("data-pellicola") === r.pellicola) b.classList.add("attiva");
        else b.classList.remove("attiva");
      });

      var np = $("notaPellicola");
      var p = BN.pellicole.trova(r.pellicola);
      if (np) np.textContent = p ? (p.ispirata ? "Ispirata a " + p.ispirata + ". " : "") + p.nota : "Ricetta personalizzata.";

      var nf = $("notaFiltro");
      var f = BN.filtri.trova(r.conversione.filtro);
      if (nf) {
        if (f.id === "tinta") nf.textContent = "Tinta " + Math.round(r.conversione.tintaFiltro || 0) + "°: " + f.nota;
        else nf.textContent = f.wratten ? f.nome + " (" + f.wratten + "): " + f.nota : f.nota;
      }
      disegnaTinta();

      var nv = $("notaViraggio");
      var v = BN.viraggi.trova(r.finiture.viraggio);
      if (nv) nv.textContent = v.nota;

      BN.curvaUI.disegna();
    } finally {
      aggiornandoUI = false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Esportazioni                                                        */
  /* ------------------------------------------------------------------ */

  async function esportaXmp(inCartella) {
    var r = BN.stato.ricetta();
    var xml = BN.xmp.genera(r, { gruppo: "Camera Oscura BN" });
    var nomeFile = U.slug(r.nome) + ".xmp";
    try {
      if (inCartella) {
        var cartella = await BN.file.cartellaPresetRaw(true);
        if (!cartella) return;
        var f = await BN.file.scriviInCartella(cartella, nomeFile, xml);
        BN.log.info("Preset salvato: " + f.name + " — riavvia Camera Raw o Lightroom per vederlo comparire.");
        aggiornaStatoRaw(cartella);
      } else {
        var file = await BN.file.salvaConDialogo(xml, nomeFile);
        if (file) BN.log.info("Preset salvato: " + file.name);
      }
    } catch (e) {
      BN.log.errore("Preset .xmp — " + ((e && e.message) || String(e)));
    }
  }

  async function aggiornaStatoRaw(cartellaNota) {
    var el = $("statoRaw");
    if (!el) return;
    var c = cartellaNota || await BN.file.cartellaPresetRaw(false);
    el.textContent = c
      ? "Cartella preset: " + (c.nativePath || c.name)
      : "Cartella preset non ancora scelta. Su Windows di solito e AppData\\Roaming\\Adobe\\CameraRaw\\Settings.";
  }

  async function esportaLut() {
    var r = BN.stato.ricetta();
    var dd = $("ddLutDim");
    var dim = parseInt(dd && dd.selectedIndex != null ? [17, 33, 65][dd.selectedIndex] : 33, 10) || 33;
    BN.log.info("Genero la LUT " + dim + "×" + dim + "×" + dim + "…");
    try {
      var testo = BN.lut.genera(r, dim);
      var file = await BN.file.salvaConDialogo(testo, U.slug(r.nome) + "-" + dim + ".cube");
      if (file) BN.log.info("LUT salvata: " + file.name);
    } catch (e) {
      BN.log.errore("LUT — " + ((e && e.message) || String(e)));
    }
  }

  async function mostraLibreria() {
    var velo = $("velo");
    var elenco = $("elencoLibreria");
    if (!velo || !elenco) return;
    elenco.innerHTML = "";
    try {
      var voci = await BN.file.elencoLibreria();
      if (!voci.length) {
        var vuoto = document.createElement("div");
        vuoto.className = "nota";
        vuoto.textContent = "La libreria e vuota: salva una ricetta per ritrovarla qui.";
        elenco.appendChild(vuoto);
      }
      voci.forEach(function (voce) {
        var riga = document.createElement("div");
        riga.className = "voceLibreria";
        var nome = document.createElement("div");
        nome.className = "nome";
        nome.textContent = voce.nome;
        var carica = document.createElement("sp-action-button");
        carica.setAttribute("quiet", "true");
        carica.textContent = "Carica";
        carica.addEventListener("click", function () {
          BN.stato.sostituisci(voce.ricetta, "sostituzione");
          velo.classList.add("nascosto");
          if (pipelineAttiva) applicaOra("sostituzione");
        });
        var togli = document.createElement("sp-action-button");
        togli.setAttribute("quiet", "true");
        togli.textContent = "Elimina";
        togli.addEventListener("click", async function () {
          await BN.file.eliminaDallaLibreria(voce);
          mostraLibreria();
        });
        riga.appendChild(nome); riga.appendChild(carica); riga.appendChild(togli);
        elenco.appendChild(riga);
      });
    } catch (e) {
      BN.log.errore("Libreria — " + ((e && e.message) || String(e)));
    }
    velo.classList.remove("nascosto");
  }

  /* ------------------------------------------------------------------ */
  /* Stato del documento                                                 */
  /* ------------------------------------------------------------------ */

  function aggiornaStatoDocumento() {
    var el = $("statoDoc");
    if (!el) return;
    var doc = null;
    try { doc = BN.ps.documento(); } catch (e) { doc = null; }
    if (!doc) {
      el.textContent = "Nessun documento aperto.";
      return;
    }
    var gruppo = null;
    try { gruppo = BN.pipeline.gruppoEsistente(); } catch (e) {}
    el.textContent = doc.name + " · " + Math.round(doc.width) + "×" + Math.round(doc.height) +
      " px · " + (gruppo ? "gruppo BN presente" : "nessun gruppo BN");
    if (gruppo) pipelineAttiva = true;
  }

  /* ------------------------------------------------------------------ */
  /* Avvio                                                               */
  /* ------------------------------------------------------------------ */

  function agganciaPulsanti() {
    tutti(".scheda").forEach(function (b) {
      b.addEventListener("click", function () { mostraScheda(b.getAttribute("data-scheda")); });
    });

    $("btnApplica").addEventListener("click", function () { applicaOra("manuale"); });
    $("btnAnnulla").addEventListener("click", function () { if (BN.stato.annulla() && pipelineAttiva) applicaOra("annulla"); });
    $("btnRipristina").addEventListener("click", function () { if (BN.stato.ripristina() && pipelineAttiva) applicaOra("ripristina"); });
    $("btnAzzera").addEventListener("click", function () { BN.stato.azzera(); if (pipelineAttiva) applicaOra("azzeramento"); });

    $("chkLive").addEventListener("change", function (e) { BN.stato.live(!!e.target.checked); });

    $("nomeRicetta").addEventListener("input", function (e) {
      if (aggiornandoUI) return;
      BN.stato.imposta("nome", e.target.value, { mantieniPellicola: true });
    });

    $("ddFiltro").addEventListener("change", function (e) {
      if (aggiornandoUI) return;
      BN.stato.imposta("conversione.filtro", valoreMenu(e.target));
    });
    $("ddViraggio").addEventListener("change", function (e) {
      if (aggiornandoUI) return;
      BN.stato.imposta("finiture.viraggio", valoreMenu(e.target));
    });
    $("ddMotore").addEventListener("change", function (e) {
      if (aggiornandoUI) return;
      BN.stato.imposta("grana.motore", valoreMenu(e.target));
    });
    $("ddBordo").addEventListener("change", function (e) {
      if (aggiornandoUI) return;
      BN.stato.imposta("finiture.bordo.tipo", valoreMenu(e.target));
    });

    $("chkGrana").addEventListener("change", function (e) {
      if (aggiornandoUI) return;
      BN.stato.imposta("grana.attiva", !!e.target.checked);
    });
    $("chkZone").addEventListener("change", function (e) {
      if (aggiornandoUI) return;
      BN.stato.imposta("zone.attivo", !!e.target.checked);
    });

    $("btnZoneAzzera").addEventListener("click", function () {
      BN.stato.imposta("zone.valori", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    });

    $("btnCurvaAzzera").addEventListener("click", function () {
      BN.stato.imposta("tono.curva", [[0, 0], [255, 255]]);
    });
    $("btnCurvaS").addEventListener("click", function () {
      BN.stato.imposta("tono.curva", [[0, 0], [64, 54], [128, 128], [192, 202], [255, 255]]);
    });
    $("btnCurvaPunto").addEventListener("click", function () { BN.curvaUI.eliminaPuntoAttivo(); });

    $("btnNuovoSeme").addEventListener("click", async function () {
      BN.stato.imposta("grana.seme", Math.floor(Math.random() * 100000));
      if (pipelineAttiva) {
        try { await conSegnale("Nuova grana in corso", function () { return BN.pipeline.rigeneraGrana(BN.stato.ricetta()); }); }
        catch (e) { BN.log.errore("Grana — " + ((e && e.message) || String(e))); }
      }
    });

    $("btnApplicaBordo").addEventListener("click", async function () {
      try {
        var fatto = await conSegnale("Bordo in corso", function () { return BN.pipeline.applicaBordo(BN.stato.ricetta()); });
        BN.log.info(fatto === false ? "Nessun bordo selezionato." : "Bordo applicato.");
      } catch (e) { BN.log.errore("Bordo — " + ((e && e.message) || String(e))); }
    });
    $("btnBordoNero").addEventListener("click", function () { BN.stato.imposta("finiture.bordo.colore", "#000000"); });
    $("btnBordoBianco").addEventListener("click", function () { BN.stato.imposta("finiture.bordo.colore", "#ffffff"); });

    $("btnXmpSalva").addEventListener("click", function () { esportaXmp(false); });
    $("btnXmpCartella").addEventListener("click", function () { esportaXmp(true); });
    $("btnLut").addEventListener("click", esportaLut);

    $("btnRicettaSalva").addEventListener("click", async function () {
      try {
        var f = await BN.file.salvaInLibreria(BN.stato.ricetta());
        BN.log.info("Ricetta salvata in libreria: " + f.name);
      } catch (e) { BN.log.errore("Libreria — " + ((e && e.message) || String(e))); }
    });
    $("btnRicettaEsporta").addEventListener("click", async function () {
      var r = BN.stato.ricetta();
      try {
        var f = await BN.file.salvaConDialogo(JSON.stringify(r, null, 2), U.slug(r.nome) + ".bnricetta.json");
        if (f) BN.log.info("Ricetta esportata: " + f.name);
      } catch (e) { BN.log.errore("Esportazione — " + ((e && e.message) || String(e))); }
    });
    $("btnRicettaImporta").addEventListener("click", async function () {
      try {
        var r = await BN.file.apriConDialogo(["json"]);
        if (!r) return;
        BN.stato.sostituisci(JSON.parse(r.testo), "sostituzione");
        if (pipelineAttiva) applicaOra("sostituzione");
        BN.log.info("Ricetta importata: " + r.file.name);
      } catch (e) { BN.log.errore("Importazione — " + ((e && e.message) || String(e))); }
    });

    $("btnLibreria").addEventListener("click", mostraLibreria);
    $("btnChiudiLibreria").addEventListener("click", function () { $("velo").classList.add("nascosto"); });

    $("btnProvini").addEventListener("click", async function () {
      var scelte = proviniScelti || BN.pellicole.elenco.slice(0, 8);
      BN.log.info("Costruisco i provini su " + scelte.length + " ricette: puo richiedere qualche minuto.");
      try {
        await conSegnale("Provini in corso", function () {
          return BN.provini.crea(scelte.map(function (p) {
            return { id: p.id, nome: (p.marca && p.marca !== "—" ? p.marca + " " : "") + p.nome, patch: p.patch };
          }), BN.stato.ricetta(), { lato: 620 });
        });
        BN.log.info("Provini pronti.");
      } catch (e) { BN.log.errore("Provini — " + ((e && e.message) || String(e))); }
    });

    $("btnProviniScelta").addEventListener("click", function () {
      proviniScelti = BN.pellicole.elenco.concat(BN.pellicole.interpretazioni);
      BN.log.info("I provini useranno tutte le " + proviniScelti.length + " ricette disponibili.");
    });

    $("btnLottoAperti").addEventListener("click", async function () {
      try {
        var n = await conSegnale("Sviluppo dei documenti aperti", function () { return BN.lotto.documentiAperti(BN.stato.ricetta(), false); });
        BN.log.info("Documenti sviluppati: " + n);
      } catch (e) { BN.log.errore("Lotto — " + ((e && e.message) || String(e))); }
    });
    $("btnLottoCartella").addEventListener("click", async function () {
      try {
        var n = await conSegnale("Elaborazione della cartella", function () { return BN.lotto.cartella(BN.stato.ricetta(), {}); });
        BN.log.info("Immagini elaborate: " + n);
      } catch (e) { BN.log.errore("Lotto cartella — " + ((e && e.message) || String(e))); }
    });

    $("btnPulisciLog").addEventListener("click", function () { BN.log.pulisci(); });
    $("btnRimuoviGruppo").addEventListener("click", async function () {
      try {
        await BN.ps.modale(async function () { await BN.pipeline.rimuoviGruppo(); }, "Rimozione gruppo BN");
        pipelineAttiva = false;
        BN.log.info("Gruppo rimosso.");
        aggiornaStatoDocumento();
      } catch (e) { BN.log.errore("Rimozione — " + ((e && e.message) || String(e))); }
    });
  }

  BN.interfaccia = { occupato: occupato, conSegnale: conSegnale };

  function avvia() {
    BN.log.aggancia();
    BN.log.info("Camera Oscura BN pronto.");

    riempiMenu("ddFiltro", BN.filtri.elenco.map(function (f) {
      return { id: f.id, nome: f.wratten ? f.nome + " · " + f.wratten : f.nome };
    }), BN.stato.leggi("conversione.filtro"));
    riempiMenu("ddViraggio", BN.viraggi.elenco.map(function (v) {
      return { id: v.id, nome: v.nome };
    }), BN.stato.leggi("finiture.viraggio"));

    costruisciGrigliaPellicole();
    costruisciCursoriZone();
    agganciaTuttiICursori();
    agganciaPulsanti();
    BN.curvaUI.inizializza();

    BN.stato.osserva(function (ricetta, motivo) {
      sincronizza();
      applicaRitardata(motivo);
    });

    sincronizza();
    mostraScheda("pellicola");
    adattaAltezza();
    window.addEventListener("resize", adattaAltezza);
    setTimeout(adattaAltezza, 300);
    aggiornaStatoDocumento();
    aggiornaStatoRaw();
    setInterval(aggiornaStatoDocumento, 2000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", avvia);
  } else {
    setTimeout(avvia, 0);
  }
})(this);
