/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Verifica dei moduli di calcolo puri (senza Photoshop).
   Uso:  node strumenti/test-core.js  */
const fs = require("fs");
const path = require("path");

const base = path.join(__dirname, "..", "bn-studio", "src", "core");
const moduli = ["util.js", "curve.js", "filtri.js", "bn.js", "viraggi.js", "pellicole.js", "state.js", "lut.js", "xmp.js"];
const sorgente = moduli.map((m) => fs.readFileSync(path.join(base, m), "utf8")).join("\n;\n");

const g = {};
new Function(sorgente).call(g);
const BN = g.BN;

let errori = 0;
function verifica(nome, condizione, dettaglio) {
  if (condizione) { console.log("  ok   " + nome); }
  else { errori++; console.log("  KO   " + nome + (dettaglio ? "  → " + dettaglio : "")); }
}

console.log("\nModuli caricati:", Object.keys(BN).join(", "), "\n");

// --- conversione ---
verifica("il grigio resta grigio", (() => {
  const mix = BN.filtri.NEUTRO;
  for (let v = 0; v <= 1.0001; v += 0.1) {
    const y = BN.bn.grigio(v, v, v, mix);
    if (Math.abs(y - v) > 0.02) return false;
  }
  return true;
})());

verifica("il filtro rosso schiarisce il rosso e scurisce il blu", (() => {
  const mix = BN.filtri.applica(BN.filtri.NEUTRO, "rosso", 100);
  const rosso = BN.bn.grigio(0.8, 0.15, 0.15, mix);
  const blu = BN.bn.grigio(0.15, 0.15, 0.8, mix);
  return rosso > blu;
})());

verifica("il filtro blu inverte il rapporto", (() => {
  const mix = BN.filtri.applica(BN.filtri.NEUTRO, "blu", 100);
  const rosso = BN.bn.grigio(0.8, 0.15, 0.15, mix);
  const blu = BN.bn.grigio(0.15, 0.15, 0.8, mix);
  return blu > rosso;
})());

// --- curve ---
verifica("la curva identita non altera i valori", (() => {
  const t = BN.curve.tabella({ neroInput: 0, biancoInput: 255, curva: [[0, 0], [255, 255]] });
  for (let i = 0; i < 256; i += 17) if (Math.abs(t[i] - i) > 1.5) return false;
  return true;
})());

verifica("la curva composta resta monotona", (() => {
  const t = BN.curve.tabella({
    neroInput: 12, biancoInput: 244, contrasto: 45, esaltaNeri: 40, esaltaBianchi: 35,
    curva: [[0, 0], [64, 52], [128, 130], [192, 205], [255, 255]]
  });
  for (let i = 1; i < 256; i++) if (t[i] < t[i - 1] - 0.6) return false;
  return true;
})());

verifica("i punti per Photoshop sono al massimo 16 e crescenti", (() => {
  const p = BN.curve.puntiPerPhotoshop({ contrasto: 30, curva: [[0, 0], [255, 255]] }, 12);
  if (p.length > 16) return false;
  for (let i = 1; i < p.length; i++) if (p[i][0] <= p[i - 1][0]) return false;
  return p.every((q) => q[1] >= 0 && q[1] <= 255);
})());

verifica("esalta i neri abbassa le ombre senza toccare le luci", (() => {
  const senza = BN.curve.tabella({ curva: [[0, 0], [255, 255]] });
  const con = BN.curve.tabella({ esaltaNeri: 80, curva: [[0, 0], [255, 255]] });
  return con[40] < senza[40] - 3 && Math.abs(con[230] - senza[230]) < 2;
})());

// --- pellicole ---
verifica("tutte le pellicole hanno patch valide", BN.pellicole.elenco.concat(BN.pellicole.interpretazioni).every((p) => {
  if (!p.id || !p.nome || !p.patch) return false;
  if (p.patch.tono && p.patch.tono.curva) {
    const c = p.patch.tono.curva;
    for (let i = 1; i < c.length; i++) if (c[i][0] <= c[i - 1][0]) return false;
    if (c.some((q) => q[0] < 0 || q[0] > 255 || q[1] < 0 || q[1] > 255)) return false;
  }
  return true;
}));

verifica("il numero di ricette disponibili", BN.pellicole.elenco.length + BN.pellicole.interpretazioni.length >= 18,
  BN.pellicole.elenco.length + " + " + BN.pellicole.interpretazioni.length);

// --- stato ---
BN.stato.imposta("grana.quantita", 44);
verifica("lo stato registra il valore", BN.stato.leggi("grana.quantita") === 44);
verifica("la modifica manuale rende la ricetta personalizzata", BN.stato.leggi("pellicola") === "personalizzata");
BN.stato.annulla();
verifica("l'annullamento ripristina il valore", BN.stato.leggi("grana.quantita") === 24, String(BN.stato.leggi("grana.quantita")));

// --- LUT ---
const ricettaProva = JSON.parse(JSON.stringify(BN.stato.base));
Object.assign(ricettaProva.conversione, { filtro: "arancio", intensitaFiltro: 80 });
ricettaProva.finiture.viraggio = "seppia";
ricettaProva.finiture.intensitaViraggio = 70;
ricettaProva.tono.contrasto = 20;

const cube = BN.lut.genera(ricettaProva, 17, "Prova");
const righe = cube.trim().split("\n");
const numeriche = righe.filter((r) => /^[0-9]/.test(r));
verifica("la LUT ha 17³ voci", numeriche.length === 17 * 17 * 17, String(numeriche.length));
verifica("i valori della LUT stanno in 0..1", numeriche.every((r) => r.split(" ").every((v) => {
  const n = parseFloat(v); return n >= 0 && n <= 1.000001;
})));
verifica("l'intestazione dichiara la dimensione", /LUT_3D_SIZE 17/.test(cube));
verifica("il viraggio seppia scalda le alte luci", (() => {
  const c = BN.lut.curvaRisultante(ricettaProva)[230];
  return c[0] > c[2] + 0.02;
})());

// --- XMP ---
const xmp = BN.xmp.genera(ricettaProva, { gruppo: "Prova" });
verifica("l'XMP e ben formato nelle marcature principali", /<x:xmpmeta/.test(xmp) && /<\/x:xmpmeta>/.test(xmp) && /crs:ConvertToGrayscale="True"/.test(xmp));
verifica("l'XMP contiene gli otto canali del miscelatore",
  ["Red", "Orange", "Yellow", "Green", "Aqua", "Blue", "Purple", "Magenta"].every((c) => xmp.indexOf("crs:GrayMixer" + c + "=") >= 0));
verifica("i valori del miscelatore stanno in -100..100", (() => {
  const m = BN.xmp.mixCameraRaw(BN.bn.mixEffettivo(ricettaProva));
  return Object.keys(m).every((k) => m[k] >= -100 && m[k] <= 100);
})());
verifica("la curva tonale e presente nell'XMP", /<crs:ToneCurvePV2012>/.test(xmp));
verifica("le virgolette nei nomi non rompono l'XML", (() => {
  const r = JSON.parse(JSON.stringify(ricettaProva));
  r.nome = 'Prova "difficile" & <strana>';
  const x = BN.xmp.genera(r, {});
  return x.indexOf('&quot;') > 0 && x.indexOf('&amp;') > 0 && x.indexOf('&lt;strana&gt;') > 0;
})());

// --- viraggi ---
verifica("ogni viraggio ha una rampa crescente e completa", BN.viraggi.elenco.every((v) => {
  if (v.stops[0][0] !== 0 || v.stops[v.stops.length - 1][0] !== 1) return false;
  for (let i = 1; i < v.stops.length; i++) if (v.stops[i][0] <= v.stops[i - 1][0]) return false;
  return v.stops.every((s) => /^#[0-9a-fA-F]{6}$/.test(s[1]));
}));


// --- blocco 1: regolazioni per fascia tonale ---
function crescente(tab) { for (let i = 1; i < tab.length; i++) if (tab[i] < tab[i - 1] - 1e-6) return false; return true; }
verifica("la luminosita generale schiarisce i mezzitoni e lascia fermi gli estremi", (() => {
  const t = BN.curve.tabella({ luminosita: 60 });
  return t[128] > 150 && t[0] === 0 && Math.abs(t[255] - 255) < 0.01;
})());
verifica("la luminosita delle ombre agisce piu in basso che in alto", (() => {
  const t = BN.curve.tabella({ lumOmbre: 80 });
  return (t[50] - 50) > 8 && Math.abs(t[220] - 220) < 1;
})());
verifica("la luminosita delle alte luci agisce piu in alto che in basso", (() => {
  const t = BN.curve.tabella({ lumLuci: -80 });
  return (200 - t[200]) > 8 && Math.abs(t[40] - 40) < 1;
})());
verifica("il contrasto morbido scurisce i quarti bassi e schiarisce gli alti", (() => {
  const t = BN.curve.tabella({ contrastoMorbido: 100 });
  return t[64] < 64 && t[192] > 192 && Math.abs(t[128] - 128) < 1;
})());
verifica("la protezione delle luci riduce la spinta verso il bianco", (() => {
  const senza = BN.curve.tabella({ luminosita: 80, esaltaBianchi: 80 });
  const con = BN.curve.tabella({ luminosita: 80, esaltaBianchi: 80, protezioneLuci: 100 });
  return con[230] < senza[230] - 2;
})());
verifica("la protezione delle ombre trattiene i neri", (() => {
  const senza = BN.curve.tabella({ contrasto: 80, esaltaNeri: 100 });
  const con = BN.curve.tabella({ contrasto: 80, esaltaNeri: 100, protezioneOmbre: 100 });
  return con[25] > senza[25] + 2;
})());
verifica("la curva resta crescente anche con tutti i cursori al massimo", [1, -1].every((s) => crescente(BN.curve.tabella({
  luminosita: 100 * s, lumOmbre: 100 * s, lumMezzitoni: -100 * s, lumLuci: 100 * s, contrasto: 100 * s,
  contrastoMorbido: 100 * s, esaltaNeri: 100, esaltaBianchi: 100, protezioneOmbre: 60, protezioneLuci: 60
}))));
verifica("sedici punti bastano a riprodurre le fasce", (() => {
  const tono = { lumOmbre: 70, lumLuci: -50, contrastoMorbido: 40 };
  const p = BN.curve.puntiPerPhotoshop(tono, 16);
  const f = BN.curve.interpolatore(p), t = BN.curve.tabella(tono);
  let max = 0; for (let x = 0; x < 256; x++) max = Math.max(max, Math.abs(f(x) - t[x]));
  return p.length === 16 && max < 2.5;
})());

// --- blocco 2: ruota di tinta ---
verifica("la tinta 0 si comporta come un filtro rosso", (() => {
  const mix = BN.filtri.applica(BN.filtri.NEUTRO, "tinta", 100, 0);
  return BN.bn.grigio(0.8, 0.15, 0.15, mix) > BN.bn.grigio(0.15, 0.15, 0.8, mix) + 0.2;
})());
verifica("la tinta 240 si comporta come un filtro blu", (() => {
  const mix = BN.filtri.applica(BN.filtri.NEUTRO, "tinta", 100, 240);
  return BN.bn.grigio(0.15, 0.15, 0.8, mix) > BN.bn.grigio(0.8, 0.15, 0.15, mix) + 0.2;
})());
verifica("la ruota e continua fra 359 e 0 gradi", (() => {
  const a = BN.filtri.mixDaTinta(359.5), b = BN.filtri.mixDaTinta(0);
  return Object.keys(a).every((k) => Math.abs(a[k] - b[k]) < 1.5);
})());
verifica("la tinta a intensita zero lascia il miscelatore di base", (() => {
  const mix = BN.filtri.applica(BN.filtri.NEUTRO, "tinta", 0, 120);
  return Object.keys(BN.filtri.NEUTRO).every((k) => mix[k] === BN.filtri.NEUTRO[k]);
})());
verifica("la ricetta porta il filtro a ruota fino all'XMP", (() => {
  const r = JSON.parse(JSON.stringify(BN.stato.base));
  r.conversione.filtro = "tinta"; r.conversione.tintaFiltro = 0;
  const m = BN.xmp.mixCameraRaw(BN.bn.mixEffettivo(r));
  return m.Red > m.Blue;
})());

console.log("\n" + (errori ? errori + " verifiche fallite\n" : "Tutte le verifiche superate.\n"));
process.exit(errori ? 1 : 0);
