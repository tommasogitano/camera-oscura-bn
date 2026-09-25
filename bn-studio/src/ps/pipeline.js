/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Camera Oscura BN — costruzione della pila di livelli non distruttiva.
   La ricetta diventa un gruppo di livelli con nomi fissi: quando un
   parametro cambia, il livello corrispondente viene aggiornato invece
   di essere ricreato, cosi la lavorazione resta fluida. */
(function (global) {
  "use strict";
  var BN = global.BN || (global.BN = {});
  var U = BN.util;
  var P = BN.ps;

  var NOMI = {
    gruppo: "Camera Oscura BN",
    conversione: "BN · Conversione",
    curva: "BN · Curva",
    lumDinamica: "BN · Luminosita dinamica",
    struttura: "BN · Struttura",
    strutturaFine: "BN · Struttura fine",
    chiarezza: "BN · Chiarezza",
    zone: "BN · Zone",
    viraggio: "BN · Viraggio",
    split: "BN · Split toning",
    vignetta: "BN · Vignetta",
    radiale: "BN · Radiale",
    grana: "BN · Grana",
    bordo: "BN · Bordo"
  };

  var ZONE_NOMI = ["Zona 0", "Zona I", "Zona II", "Zona III", "Zona IV", "Zona V",
                   "Zona VI", "Zona VII", "Zona VIII", "Zona IX", "Zona X"];

  function log(m) { if (BN.log) BN.log.info(m); }
  function avviso(m) { if (BN.log) BN.log.avviso(m); }

  async function selezionaCima() {
    return P.esegui({
      _obj: "select",
      _target: [{ _ref: "layer", _enum: "ordinal", _value: "front" }],
      makeVisible: false
    }, "seleziona livello in cima");
  }

  async function aggiungiASelezione(id) {
    return P.esegui({
      _obj: "select",
      _target: [{ _ref: "layer", _id: id }],
      selectionModifier: { _enum: "selectionModifierType", _value: "addToSelection" },
      makeVisible: false
    }, "aggiungi alla selezione");
  }

  async function raggruppaSelezionati(nome) {
    return P.esegui({
      _obj: "make",
      _target: [{ _ref: "layerSection" }],
      from: { _ref: "layer", _enum: "ordinal", _value: "targetEnum" },
      using: { _obj: "layerSection", name: nome }
    }, "raggruppa");
  }

  /* Curva applicata direttamente al canale attivo (serve sulle maschere). */
  async function curvaSuCanale(punti) {
    var lista = punti.map(function (p) {
      return { _obj: "paint", horizontal: Math.round(p[0]), vertical: Math.round(p[1]) };
    });
    /* Su una maschera il canale "composite" non esiste: Photoshop rifiuta il
       comando. Si prova prima il canale bersaglio, poi i nomi del canale
       unico, infine la curva senza canale. La variante buona si ricorda. */
    var varianti = [
      { _ref: "channel", _enum: "ordinal", _value: "targetEnum" },
      { _ref: "channel", _enum: "channel", _value: "gray" },
      { _ref: "channel", _enum: "channel", _value: "black" },
      null
    ];
    var ordine = curvaSuCanale.buona != null
      ? [curvaSuCanale.buona].concat([0, 1, 2, 3].filter(function (i) { return i !== curvaSuCanale.buona; }))
      : [0, 1, 2, 3];
    var ultimo = null;
    for (var k = 0; k < ordine.length; k++) {
      var i = ordine[k];
      var regolazione = { _obj: "curvesAdjustment", curve: lista };
      if (varianti[i]) regolazione.channel = varianti[i];
      try {
        var r = await P.esegui({
          _obj: "curves",
          presetKind: { _enum: "presetKindType", _value: "presetKindCustom" },
          adjustment: [regolazione]
        }, "curva su canale");
        if (curvaSuCanale.buona !== i) log("Curva su maschera: variante " + i + " accettata.");
        curvaSuCanale.buona = i;
        return r;
      } catch (e) { ultimo = e; }
    }
    throw ultimo;
  }

  /* Maschera di luminosita calcolata sul composito SENZA il livello in
     questione: si nasconde il livello, si carica la selezione, lo si
     rimostra e si applica la maschera con la curva di ponderazione. */
  async function mascheraLuminosita(id, puntiPeso) {
    await P.visibilita(id, false);
    await P.selezionaLuminosita();
    await P.visibilita(id, true);
    await P.selezionaPerId(id);
    await P.aggiungiMaschera(true);
    /* Si deseleziona prima della curva: con la selezione attiva la curva
       agirebbe solo in parte sulla maschera, falsando i pesi. */
    await P.deseleziona();
    await P.selezionaMaschera();
    if (puntiPeso && puntiPeso.length >= 2) await curvaSuCanale(puntiPeso);
    await P.selezionaCompositoRGB();
  }

  /* Punti di una curva di maschera a partire dai pesi 0..1 di ombre,
     mezzitoni e alte luci. */
  function puntiDaFasce(pesi) {
    function q(v) { return Math.round(U.clamp(v, 0, 1) * 255); }
    return [[0, q(pesi[0])], [64, q((pesi[0] + pesi[1]) / 2)], [128, q(pesi[1])],
            [192, q((pesi[1] + pesi[2]) / 2)], [255, q(pesi[2])]];
  }

  async function inverti() {
    return P.esegui({ _obj: "invert" }, "inverti");
  }

  /* ------------------------------------------------------------------ */
  /* Singoli stadi                                                       */
  /* ------------------------------------------------------------------ */

  async function stadioConversione(ricetta) {
    var mix = BN.bn.mixEffettivo(ricetta);
    return P.creaBiancoNero(NOMI.conversione, mix);
  }

  async function stadioCurva(ricetta) {
    var punti = BN.curve.puntiPerPhotoshop(ricetta.tono, 16);
    return P.creaCurve(NOMI.curva, punti);
  }

  /* Luminosita dinamica: una curva di schiarita (o di bruciatura) con una
     maschera di luminosita molto sfocata. Agisce sulle zone scure o chiare
     nel loro insieme, non sul singolo pixel: rispetta il modellato. */
  async function stadioLuminositaDinamica(ricetta) {
    var v = U.clamp((ricetta.tono || {}).luminositaDinamica || 0, -100, 100);
    if (!v) return null;
    var k = v / 100;
    var punti = [[0, 0], [64, U.clamp(64 + k * 40, 0, 255)], [128, U.clamp(128 + k * 46, 0, 255)],
                 [192, U.clamp(192 + k * 30, 0, 255)], [255, 255]];
    var livello = await P.creaCurve(NOMI.lumDinamica, punti);
    var id = livello.id;
    var doc = P.documento();
    var raggio = U.clamp(Math.max(doc.width, doc.height) / 40, 8, 250);

    await P.visibilita(id, false);
    await P.selezionaLuminosita();
    await P.visibilita(id, true);
    await P.selezionaPerId(id);
    await P.aggiungiMaschera(true);
    await P.deseleziona();
    await P.selezionaMaschera();
    /* Per schiarire servono le zone scure: la maschera si inverte. */
    if (k > 0) await inverti();
    await P.sfocaturaGaussiana(raggio);
    await P.selezionaCompositoRGB();
    return livello;
  }

  /* Livello di contrasto locale: timbro del visibile, accentua passaggio,
     fusione a luce soffusa. segno negativo ammorbidisce. */
  async function livelloDettaglio(nome, raggio, segno, opacita) {
    await P.timbroVisibile(nome);
    var livello = P.documento().activeLayers[0];
    await P.desatura();
    await P.accentuaPassaggio(raggio);
    if (segno < 0) await inverti();
    await P.impostaFusione(livello.id, "softLight", U.clamp(Math.round(opacita), 1, 100));
    return livello;
  }

  /* Struttura: generale piu scarto per fascia tonale. Se le fasce vanno in
     versi opposti nascono due livelli, uno che accentua e uno che ammorbidisce,
     ciascuno con la sua maschera di luminosita. */
  async function stadioStruttura(ricetta) {
    var t = ricetta.tono || {};
    var base = t.struttura || 0;
    var fasce = [base + (t.strutturaOmbre || 0), base + (t.strutturaMezzitoni || 0), base + (t.strutturaLuci || 0)]
      .map(function (v) { return U.clamp(v, -100, 100); });
    var doc = P.documento();
    var raggio = Math.max(1.5, Math.max(doc.width, doc.height) / 900);
    var creati = [];
    var segni = [1, -1];
    for (var s = 0; s < segni.length; s++) {
      var segno = segni[s];
      var pesi = fasce.map(function (v) { return Math.max(0, v * segno); });
      var max = Math.max(pesi[0], pesi[1], pesi[2]);
      if (!max) continue;
      var nome = NOMI.struttura + (segno < 0 ? " · morbida" : "");
      var livello = await livelloDettaglio(nome, raggio, segno, max);
      var uniforme = pesi[0] === pesi[1] && pesi[1] === pesi[2];
      if (!uniforme) {
        await mascheraLuminosita(livello.id, puntiDaFasce(pesi.map(function (p) { return p / max; })));
      }
      creati.push(livello);
    }
    return creati;
  }

  /* Struttura fine: lo stesso principio su un raggio molto piccolo,
     per la trama minuta (pietra, tessuto, pelle). */
  async function stadioStrutturaFine(ricetta) {
    var v = U.clamp((ricetta.tono || {}).strutturaFine || 0, -100, 100);
    if (!v) return null;
    var doc = P.documento();
    var raggio = Math.max(0.6, Math.max(doc.width, doc.height) / 2800);
    return livelloDettaglio(NOMI.strutturaFine, raggio, v < 0 ? -1 : 1, Math.abs(v));
  }

  /* Contrasto locale: timbro del visibile, accentua passaggio, fusione a luce soffusa. */
  async function stadioDettaglio(ricetta, tipo) {
    var t = ricetta.tono || {};
    var valore = tipo === "struttura" ? (t.struttura || 0) : (t.chiarezza || 0);
    if (!valore) return null;
    var nome = tipo === "struttura" ? NOMI.struttura : NOMI.chiarezza;
    var doc = P.documento();
    var lato = Math.max(doc.width, doc.height);
    /* Il raggio scala con la dimensione del file: la struttura lavora sul
       dettaglio fine, la chiarezza sul modellato di media scala. */
    var raggio = tipo === "struttura" ? Math.max(1.5, lato / 900) : Math.max(6, lato / 130);

    await P.timbroVisibile(nome);
    var livello = P.documento().activeLayers[0];
    await P.desatura();
    await P.accentuaPassaggio(raggio);
    if (valore < 0) await inverti();
    await P.impostaFusione(livello.id, "softLight", Math.min(100, Math.abs(valore)));
    return livello;
  }

  /* Sistema zonale: un livello Curve per zona, mascherato sulla fascia tonale. */
  async function stadioZone(ricetta) {
    var z = ricetta.zone || {};
    if (!z.attivo) return [];
    var creati = [];
    var ampiezza = U.clamp(z.ampiezza == null ? 55 : z.ampiezza, 15, 100);

    for (var i = 0; i < z.valori.length; i++) {
      var v = z.valori[i];
      if (!v) continue;
      var centro = Math.round(i * 255 / (z.valori.length - 1));
      var spostamento = v / 100 * 42;   /* fino a circa 42 livelli di scarto */
      var punti = [[0, 0], [255, 255]];
      var y = U.clamp(centro + spostamento, 0, 255);
      punti = [[0, 0], [Math.max(1, centro - 60), Math.max(0, centro - 60)], [centro, y],
               [Math.min(254, centro + 60), Math.min(255, centro + 60)], [255, 255]];
      punti.sort(function (a, b) { return a[0] - b[0]; });

      var livello = await P.creaCurve(NOMI.zone + " · " + ZONE_NOMI[i], punti);
      /* Maschera a campana centrata sulla zona. */
      var larghezza = ampiezza * 1.3;
      var camp = [];
      for (var x = 0; x <= 255; x += 17) {
        var d = Math.abs(x - centro) / larghezza;
        var peso = Math.exp(-d * d * 2.2);
        camp.push([x, Math.round(U.clamp(peso * 255, 0, 255))]);
      }
      if (camp.length > 16) {
        var ridotti = [];
        var passo = Math.ceil(camp.length / 14);
        for (var k = 0; k < camp.length; k += passo) ridotti.push(camp[k]);
        if (ridotti[ridotti.length - 1][0] !== 255) ridotti.push([255, camp[camp.length - 1][1]]);
        camp = ridotti;
      }
      await mascheraLuminosita(livello.id, camp);
      creati.push(livello);
    }
    return creati;
  }

  async function stadioViraggio(ricetta) {
    var f = ricetta.finiture || {};
    if (!f.viraggio || f.viraggio === "nessuno") return null;
    var v = BN.viraggi.trova(f.viraggio);
    var livello = await P.creaMappaSfumatura(NOMI.viraggio, v.stops);
    await P.impostaFusione(livello.id, "normal", U.clamp(f.intensitaViraggio == null ? 60 : f.intensitaViraggio, 0, 100));
    return livello;
  }

  async function stadioSplit(ricetta) {
    var sp = (ricetta.finiture || {}).split || {};
    if (!sp.ombreSat && !sp.luciSat) return null;
    function daHue(hue, sat) {
      if (!sat) return [0, 0, 0];
      var rgb = U.hslToRgb(hue, 1, 0.5);
      var media = (rgb[0] + rgb[1] + rgb[2]) / 3;
      var k = U.clamp(sat, 0, 100) / 100 * 60;
      return [Math.round((rgb[0] - media) * k), Math.round((rgb[1] - media) * k), Math.round((rgb[2] - media) * k)];
    }
    var ombre = daHue(sp.ombreTinta || 0, sp.ombreSat || 0);
    var luci = daHue(sp.luciTinta || 0, sp.luciSat || 0);
    return P.creaBilanciamento(NOMI.split, ombre, [0, 0, 0], luci);
  }

  async function stadioVignetta(ricetta) {
    var vig = (ricetta.finiture || {}).vignetta || {};
    if (!vig.quantita) return null;
    var doc = P.documento();
    var q = U.clamp(vig.quantita, -100, 100);
    var delta = q / 100 * 70;
    var punti = [[0, U.clamp(0 - delta * 0.25, 0, 255)],
                 [64, U.clamp(64 - delta * 0.7, 0, 255)],
                 [128, U.clamp(128 - delta, 0, 255)],
                 [192, U.clamp(192 - delta * 0.75, 0, 255)],
                 [255, U.clamp(255 - delta * 0.2, 0, 255)]];
    var livello = await P.creaCurve(NOMI.vignetta, punti);

    await P.aggiungiMaschera(false);
    await P.selezionaMaschera();
    var cx = doc.width / 2, cy = doc.height / 2;
    var raggio = Math.sqrt(cx * cx + cy * cy) * U.clamp((vig.centro == null ? 50 : vig.centro) / 50, 0.4, 1.8);
    var morbidezza = U.clamp((vig.morbidezza == null ? 60 : vig.morbidezza) / 100, 0, 1);
    var meta = U.clamp(0.30 + morbidezza * 0.45, 0.1, 0.9);
    var stops = [[0, "#000000"], [meta, "#3a3a3a"], [1, "#ffffff"]];
    await P.sfumaturaRadiale(cx, cy, raggio, stops, false);
    await P.selezionaCompositoRGB();
    return livello;
  }

  /* ------------------------------------------------------------------ */
  /* Maschera radiale                                                    */
  /* ------------------------------------------------------------------ */

  /* Nomi dei livelli della maschera radiale. Il verso della struttura sta
     nel nome: se cambia segno serve ricostruire, altrimenti basta
     l'opacita. */
  function nomeRadialeTono(lato) { return NOMI.radiale + " · " + lato; }
  function nomeRadialeStruttura(lato, v) {
    return NOMI.radiale + " · struttura" + (v < 0 ? " morbida" : "") + " " + lato;
  }

  /* Elenco dei livelli che la ricetta richiede, nell'ordine di costruzione. */
  function livelliRadialeAttesi(r) {
    var R = BN.radiale;
    var elenco = [];
    if (!R.attiva(r)) return elenco;
    ["dentro", "fuori"].forEach(function (lato) {
      var v = U.clamp(r[lato].struttura || 0, -100, 100);
      if (v) elenco.push({ nome: nomeRadialeStruttura(lato, v), lato: lato, tipo: "struttura", valore: v });
    });
    ["dentro", "fuori"].forEach(function (lato) {
      if (R.latoAttivoTono(r, lato)) elenco.push({ nome: nomeRadialeTono(lato), lato: lato, tipo: "tono" });
    });
    return elenco;
  }

  /* Sfocatura della maschera anche oltre il limite di 1000 px del filtro:
     due sfocature gaussiane in fila equivalgono a una sola di raggio
     sqrt(a² + b²). */
  async function sfumaMaschera(sigma) {
    var restante = sigma;
    var passaggi = 0;
    while (restante > 1000 && passaggi < 3) {
      await P.sfocaturaGaussiana(1000);
      restante = Math.sqrt(restante * restante - 1000 * 1000);
      passaggi++;
    }
    if (restante >= 0.5) await P.sfocaturaGaussiana(Math.min(1000, restante));
  }

  /* Disegna la maschera ellittica sul livello: bianca dentro per il lato
     "dentro", invertita per il lato "fuori". nuova: il livello non ha
     ancora la sua maschera definitiva. */
  async function mascheraRadiale(id, g, lato, nuova) {
    var dentro = lato === "dentro";
    await P.selezionaPerId(id);
    if (nuova) await P.aggiungiMaschera(false);
    await P.deseleziona();
    await P.selezionaMaschera();
    await P.riempiNeutro(dentro ? "nero" : "bianco");
    await P.selezioneEllittica(g.cx - g.rx, g.cy - g.ry, g.cx + g.rx, g.cy + g.ry);
    if (Math.abs(g.angolo) >= 0.05) {
      /* Prima scelta: Trasforma selezione. Se questa versione di Photoshop
         rifiuta il descrittore, l'ellisse ruotata si traccia come poligono
         a 180 lati: dopo la sfocatura la differenza non si vede. La scelta
         buona si ricorda. */
      var ruotata = false;
      if (!mascheraRadiale.poligono) {
        try { await P.ruotaSelezione(g.angolo); ruotata = true; }
        catch (e) {
          mascheraRadiale.poligono = true;
          log("Trasforma selezione rifiutato (" + ((e && e.message) || String(e)) + "): uso il poligono.");
        }
      }
      if (!ruotata) {
        await P.deseleziona();
        await P.selezionePoligono(BN.radiale.contorno(g, 1, 180).slice(0, 180));
      }
    }
    await P.riempiNeutro(dentro ? "bianco" : "nero");
    await P.deseleziona();
    await sfumaMaschera(g.sigma);
    await P.selezionaCompositoRGB();
  }

  async function stadioRadiale(ricetta) {
    var r = (ricetta.locale || {}).radiale;
    var attesi = livelliRadialeAttesi(r);
    if (!attesi.length) return [];
    var doc = P.documento();
    var g = BN.radiale.geometria(r, doc.width, doc.height);
    var raggioStruttura = Math.max(1.5, Math.max(doc.width, doc.height) / 900);
    var creati = [];
    for (var i = 0; i < attesi.length; i++) {
      var a = attesi[i];
      var livello;
      if (a.tipo === "struttura") {
        livello = await livelloDettaglio(a.nome, raggioStruttura, a.valore < 0 ? -1 : 1, Math.abs(a.valore));
      } else {
        livello = await P.creaCurve(a.nome, BN.curve.puntiPerPhotoshop(BN.radiale.tonoLato(r, a.lato), 12));
      }
      await mascheraRadiale(livello.id, g, a.lato, true);
      creati.push(livello);
    }
    return creati;
  }

  /* Aggiornamento leggero della maschera radiale. Restituisce false se la
     pila va ricostruita (livelli da aggiungere o togliere, verso della
     struttura cambiato). */
  async function aggiornaRadiale(ricetta, cambiamento, gruppo) {
    var r = (ricetta.locale || {}).radiale;
    var attesi = livelliRadialeAttesi(r);
    var presenti = [];
    (gruppo.layers || []).forEach(function (l) {
      if (l.name && l.name.indexOf(NOMI.radiale) === 0) presenti.push(l);
    });
    if (presenti.length !== attesi.length) return false;
    var trovati = [];
    for (var i = 0; i < attesi.length; i++) {
      var l = P.cercaLivello(attesi[i].nome, gruppo);
      if (!l) return false;
      trovati.push(l);
    }
    if (!attesi.length) return true;

    var parti = String(cambiamento).split(".");
    var chiave = parti[2];
    var sotto = parti[3];
    var k;
    if (BN.radiale.soloForma(chiave) || chiave === "forma") {
      var doc = P.documento();
      var g = BN.radiale.geometria(r, doc.width, doc.height);
      for (k = 0; k < attesi.length; k++) await mascheraRadiale(trovati[k].id, g, attesi[k].lato, false);
      return true;
    }
    if ((chiave === "dentro" || chiave === "fuori") && sotto) {
      for (k = 0; k < attesi.length; k++) {
        var a = attesi[k];
        if (a.lato !== chiave) continue;
        if (a.tipo === "struttura" && sotto === "struttura") {
          await P.impostaFusione(trovati[k].id, "softLight", U.clamp(Math.round(Math.abs(a.valore)), 1, 100));
        } else if (a.tipo === "tono" && sotto !== "struttura") {
          await P.aggiornaCurve(trovati[k].id, BN.curve.puntiPerPhotoshop(BN.radiale.tonoLato(r, a.lato), 12));
        }
      }
      return true;
    }
    return false;
  }

  async function stadioGrana(ricetta) {
    var g = ricetta.grana || {};
    if (!g.attiva || !g.quantita) return null;

    if (g.motore === "procedurale" && BN.grana && BN.grana.disponibile()) {
      try {
        return await BN.grana.procedurale(ricetta, NOMI.grana);
      } catch (e) {
        avviso("Grana procedurale non riuscita (" + ((e && e.message) || String(e)) + "): uso il motore nativo.");
      }
    }

    var livello = await P.creaLivelloNeutro(NOMI.grana, "softLight");
    var id = P.documento().activeLayers[0].id;

    var quantitaDisturbo = U.clamp(g.quantita * 0.5 + 3, 1, 90);
    await P.aggiungiDisturbo(quantitaDisturbo, true);

    /* La dimensione del granulo si ottiene aggregando il disturbo:
       prima si ammorbidisce, poi si rinforza il contrasto locale. */
    var dim = U.clamp(g.dimensione || 1, 0.4, 3);
    if (dim > 0.7) {
      await P.sfocaturaGaussiana(U.clamp((dim - 0.5) * 0.9, 0.2, 2.4));
      var forza = 120 + U.clamp(g.ruvidita || 50, 0, 100) * 2.6;
      await P.maschera(forza, U.clamp(dim * 0.75, 0.3, 2.5), 0);
    }

    /* Distribuzione tonale: la grana si vede piu nelle ombre e meno nelle luci. */
    var ombre = U.clamp(g.ombre == null ? 70 : g.ombre, 0, 100);
    var mezzi = U.clamp(g.mezzitoni == null ? 100 : g.mezzitoni, 0, 100);
    var luci = U.clamp(g.luci == null ? 45 : g.luci, 0, 100);
    if (ombre !== 100 || mezzi !== 100 || luci !== 100) {
      await mascheraLuminosita(id, [
        [0, Math.round(ombre * 2.55)],
        [64, Math.round(U.lerp(ombre, mezzi, 0.5) * 2.55)],
        [128, Math.round(mezzi * 2.55)],
        [192, Math.round(U.lerp(mezzi, luci, 0.5) * 2.55)],
        [255, Math.round(luci * 2.55)]
      ]);
    }

    await P.impostaFusione(id, "softLight", 100);
    return P.documento().activeLayers[0];
  }

  /* ------------------------------------------------------------------ */
  /* Costruzione e aggiornamento                                         */
  /* ------------------------------------------------------------------ */

  function gruppoEsistente() {
    return P.cercaLivello(NOMI.gruppo);
  }

  async function rimuoviGruppo() {
    var g = gruppoEsistente();
    if (g) await P.elimina(g.id);
  }

  async function costruisci(ricetta) {
    var doc = P.documento();
    if (!doc) throw new Error("Nessun documento aperto.");

    await rimuoviGruppo();
    await selezionaCima();

    var ids = [];
    async function raccogli(promessa) {
      var l = await promessa;
      if (l) {
        if (Array.isArray(l)) l.forEach(function (x) { ids.push(x.id); });
        else ids.push(l.id);
      }
      return l;
    }

    var cimaIniziale = null;
    try { cimaIniziale = P.documento().layers[0].id; } catch (e) {}
    try {
      await raccogli(stadioConversione(ricetta));
      await raccogli(stadioCurva(ricetta));
      await raccogli(stadioLuminositaDinamica(ricetta));
      await raccogli(stadioZone(ricetta));
      await raccogli(stadioStruttura(ricetta));
      await raccogli(stadioStrutturaFine(ricetta));
      await raccogli(stadioDettaglio(ricetta, "chiarezza"));
      await raccogli(stadioRadiale(ricetta));
      await raccogli(stadioViraggio(ricetta));
      await raccogli(stadioSplit(ricetta));
      await raccogli(stadioVignetta(ricetta));
      await raccogli(stadioGrana(ricetta));
    } catch (e) {
      /* Ricostruzione spezzata: si eliminano i livelli gia creati (tutto cio
         che sta sopra la vecchia cima), perche il documento non resti con
         livelli sciolti. */
      try { await P.deseleziona(); } catch (x) {}
      var daTogliere = [];
      var strati = P.documento().layers;
      for (var j = 0; j < strati.length; j++) {
        if (strati[j].id === cimaIniziale) break;
        daTogliere.push(strati[j].id);
      }
      for (var q = 0; q < daTogliere.length; q++) {
        try { await P.elimina(daTogliere[q]); } catch (x) {}
      }
      throw e;
    }

    if (!ids.length) return null;

    await P.selezionaPerId(ids[0]);
    for (var i = 1; i < ids.length; i++) await aggiungiASelezione(ids[i]);
    await raggruppaSelezionati(NOMI.gruppo);
    return P.documento().activeLayers[0];
  }

  /* Aggiornamento leggero: tocca solo i livelli gia presenti.
     Restituisce false se serve una ricostruzione completa. */
  async function aggiorna(ricetta, cambiamento) {
    var gruppo = gruppoEsistente();
    if (!gruppo) return false;

    if (cambiamento && String(cambiamento).indexOf("locale.radiale") === 0) {
      return aggiornaRadiale(ricetta, cambiamento, gruppo);
    }

    var strutturali = ["grana", "zone", "tono.chiarezza", "tono.struttura", "tono.luminositaDinamica",
                       "finiture.vignetta", "finiture.bordo", "pellicola", "sostituzione", "azzeramento"];
    var serveRicostruzione = !cambiamento || strutturali.some(function (s) {
      return String(cambiamento).indexOf(s) === 0;
    });
    if (serveRicostruzione) return false;

    var conv = P.cercaLivello(NOMI.conversione, gruppo);
    if (conv) await P.aggiornaBiancoNero(conv.id, BN.bn.mixEffettivo(ricetta));

    var cur = P.cercaLivello(NOMI.curva, gruppo);
    if (cur) await P.aggiornaCurve(cur.id, BN.curve.puntiPerPhotoshop(ricetta.tono, 16));

    var f = ricetta.finiture || {};
    var vir = P.cercaLivello(NOMI.viraggio, gruppo);
    if (vir) {
      if (!f.viraggio || f.viraggio === "nessuno") return false;
      await P.aggiornaMappaSfumatura(vir.id, BN.viraggi.trova(f.viraggio).stops);
      await P.impostaFusione(vir.id, "normal", U.clamp(f.intensitaViraggio, 0, 100));
    } else if (f.viraggio && f.viraggio !== "nessuno") {
      return false;
    }

    var sp = f.split || {};
    var spl = P.cercaLivello(NOMI.split, gruppo);
    if (spl) {
      if (!sp.ombreSat && !sp.luciSat) return false;
      function daHue(hue, sat) {
        if (!sat) return [0, 0, 0];
        var rgb = U.hslToRgb(hue, 1, 0.5);
        var media = (rgb[0] + rgb[1] + rgb[2]) / 3;
        var k = U.clamp(sat, 0, 100) / 100 * 60;
        return [Math.round((rgb[0] - media) * k), Math.round((rgb[1] - media) * k), Math.round((rgb[2] - media) * k)];
      }
      await P.aggiornaBilanciamento(spl.id, daHue(sp.ombreTinta, sp.ombreSat), [0, 0, 0], daHue(sp.luciTinta, sp.luciSat));
    } else if (sp.ombreSat || sp.luciSat) {
      return false;
    }

    return true;
  }

  /* Applica: aggiorna se possibile, altrimenti ricostruisce. */
  async function applica(ricetta, cambiamento) {
    return P.modale(async function () {
      try {
        var fatto = await aggiorna(ricetta, cambiamento);
        if (!fatto) await costruisci(ricetta);
        return true;
      } finally {
        /* Nessuna selezione deve restare attiva dopo lo sviluppo,
           nemmeno quando uno stadio si ferma a meta. */
        try { await P.deseleziona(); await P.selezionaCompositoRGB(); } catch (e) {}
      }
    }, "Camera Oscura BN — sviluppo");
  }

  /* Rigenera solo la grana con un nuovo seme. */
  async function rigeneraGrana(ricetta) {
    return P.modale(async function () {
      var gruppo = gruppoEsistente();
      if (!gruppo) { await costruisci(ricetta); return true; }
      var vecchia = P.cercaLivello(NOMI.grana, gruppo);
      if (vecchia) await P.elimina(vecchia.id);
      var strati = gruppo.layers;
      if (strati && strati.length) await P.selezionaPerId(strati[0].id);
      await stadioGrana(ricetta);
      return true;
    }, "Camera Oscura BN — grana");
  }

  /* Bordo e cornice: modificano il quadro, quindi vivono fuori dal gruppo. */
  async function applicaBordo(ricetta) {
    var b = (ricetta.finiture || {}).bordo || {};
    if (!b.tipo || b.tipo === "nessuno") return false;
    return P.modale(async function () {
      var doc = P.documento();
      var lato = Math.min(doc.width, doc.height);
      var spessore = Math.max(1, Math.round(lato * (b.spessore || 2) / 100));
      var vecchio = P.cercaLivello(NOMI.bordo);
      if (vecchio) await P.elimina(vecchio.id);

      if (b.tipo === "cornice" || b.tipo === "passepartout") {
        var extra = b.tipo === "passepartout" ? spessore * 3 : spessore * 2;
        await P.dimensioneQuadro(extra, extra, true);
      }
      await selezionaCima();
      var rgb = U.hexToRgb(b.colore || "#000000");
      var livello = await P.creaTintaUnita(NOMI.bordo, rgb);
      var id = P.documento().activeLayers[0].id;
      var d = P.documento();

      /* La maschera lascia visibile solo la fascia perimetrale. */
      await P.esegui({
        _obj: "set",
        _target: [{ _ref: "channel", _property: "selection" }],
        to: {
          _obj: "rectangle",
          top: { _unit: "pixelsUnit", _value: spessore },
          left: { _unit: "pixelsUnit", _value: spessore },
          bottom: { _unit: "pixelsUnit", _value: d.height - spessore },
          right: { _unit: "pixelsUnit", _value: d.width - spessore }
        }
      }, "selezione rettangolare");
      await P.invertiSelezione();
      await P.aggiungiMaschera(true);
      await P.deseleziona();
      await P.selezionaCompositoRGB();
      return id;
    }, "Camera Oscura BN — bordo");
  }

  BN.pipeline = {
    NOMI: NOMI,
    ZONE_NOMI: ZONE_NOMI,
    costruisci: costruisci,
    applica: applica,
    aggiorna: aggiorna,
    rigeneraGrana: rigeneraGrana,
    applicaBordo: applicaBordo,
    rimuoviGruppo: rimuoviGruppo,
    gruppoEsistente: gruppoEsistente,
    stadioGrana: stadioGrana,
    mascheraLuminosita: mascheraLuminosita
  };
})(this);
