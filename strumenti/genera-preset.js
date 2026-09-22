/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Genera i preset .xmp per Camera Raw / Lightroom e le LUT .cube
   a partire dalle ricette incluse nel plugin.
   Uso:  node strumenti/genera-preset.js  */
const fs = require("fs");
const path = require("path");

const base = path.join(__dirname, "..", "bn-studio", "src", "core");
const moduli = ["util.js", "curve.js", "filtri.js", "bn.js", "viraggi.js", "pellicole.js", "state.js", "lut.js", "xmp.js"];
const g = {};
new Function(moduli.map((m) => fs.readFileSync(path.join(base, m), "utf8")).join("\n;\n")).call(g);
const BN = g.BN;

const uscita = path.join(__dirname, "..", "ricette");
const cartellaXmp = path.join(uscita, "xmp");
const cartellaLut = path.join(uscita, "lut");
const cartellaRic = path.join(uscita, "json");
[uscita, cartellaXmp, cartellaLut, cartellaRic].forEach((d) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const tutte = BN.pellicole.elenco.concat(BN.pellicole.interpretazioni);
let n = 0;
tutte.forEach((p) => {
  const r = BN.util.merge(BN.util.clone(BN.stato.base), BN.util.clone(p.patch || {}));
  r.nome = (p.marca && p.marca !== "—" ? p.marca + " " : "") + p.nome;
  r.pellicola = p.id;
  r.note = p.nota || "";

  const nomeFile = BN.util.slug(r.nome);
  fs.writeFileSync(path.join(cartellaXmp, nomeFile + ".xmp"), BN.xmp.genera(r, { gruppo: "Camera Oscura BN" }), "utf8");
  fs.writeFileSync(path.join(cartellaRic, nomeFile + ".bnricetta.json"), JSON.stringify(r, null, 2), "utf8");
  fs.writeFileSync(path.join(cartellaLut, nomeFile + "-33.cube"), BN.lut.genera(r, 33, r.nome), "utf8");
  n++;
});

console.log("Generati " + n + " preset .xmp, " + n + " LUT .cube e " + n + " ricette .json in " + uscita);
