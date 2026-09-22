/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Camera Oscura BN — registrazione degli entrypoint.
   UXP pretende che il plugin dichiari i propri pannelli subito dopo il
   caricamento: se questa chiamata manca, o arriva tardi, Photoshop
   rifiuta il plugin con un generico "Load command failed".
   Per questo il file e il primo script caricato da index.html. */
(function (global) {
  "use strict";
  var BN = global.BN || (global.BN = {});

  try {
    var entrypoints = require("uxp").entrypoints;
    entrypoints.setup({
      panels: {
        cameraOscuraPanel: {
          create: function () { /* il contenuto del pannello e gia nel documento */ },
          show: function () { if (BN.curvaUI && BN.curvaUI.disegna) { try { BN.curvaUI.disegna(); } catch (e) {} } },
          hide: function () {},
          destroy: function () {}
        }
      }
    });
    BN.entrypointsRegistrati = true;
  } catch (e) {
    BN.entrypointsRegistrati = false;
    console.error("Registrazione degli entrypoint non riuscita: " + (e && e.message));
  }
})(this);
