/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Camera Oscura BN — registro visibile nel pannello.
   Serve soprattutto quando un descrittore di Photoshop cambia fra
   versioni: l'errore resta scritto invece di sparire in console. */
(function (global) {
  "use strict";
  var BN = global.BN || (global.BN = {});
  var righe = [];
  var elemento = null;

  function orario() {
    var d = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }

  function scrivi(testo, classe) {
    righe.push({ testo: orario() + "  " + testo, classe: classe || "" });
    if (righe.length > 300) righe.shift();
    disegna();
    if (classe === "errore") console.error(testo);
    else console.log(testo);
  }

  function disegna() {
    if (!elemento) elemento = document.getElementById("registro");
    if (!elemento) return;
    elemento.innerHTML = "";
    righe.slice(-120).forEach(function (r) {
      var div = document.createElement("div");
      if (r.classe) div.className = r.classe;
      div.textContent = r.testo;
      elemento.appendChild(div);
    });
    elemento.scrollTop = elemento.scrollHeight;
  }

  BN.log = {
    info: function (t) { scrivi(t, ""); },
    avviso: function (t) { scrivi(t, "avviso"); },
    errore: function (t) { scrivi(t, "errore"); },
    pulisci: function () { righe.length = 0; disegna(); },
    aggancia: function () { elemento = document.getElementById("registro"); disegna(); }
  };
})(this);
