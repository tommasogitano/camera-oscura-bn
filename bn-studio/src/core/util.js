/* Camera Oscura BN, Copyright (C) 2026 Tommaso Scicchitano.
   Software libero con licenza GNU GPL 3.0: vedi il file LICENSE. */
/* Camera Oscura BN — utilita di base
   Nessun modulo ES: ogni file estende il namespace globale BN. */
(function (global) {
  "use strict";
  var BN = global.BN || (global.BN = {});

  var util = {
    clamp: function (v, min, max) { return v < min ? min : (v > max ? max : v); },

    lerp: function (a, b, t) { return a + (b - a) * t; },

    round: function (v, decimali) {
      var f = Math.pow(10, decimali || 0);
      return Math.round(v * f) / f;
    },

    /* Copia profonda di strutture JSON semplici. */
    clone: function (o) { return JSON.parse(JSON.stringify(o)); },

    /* Fusione ricorsiva: le chiavi di src sovrascrivono quelle di dst. */
    merge: function (dst, src) {
      Object.keys(src || {}).forEach(function (k) {
        var v = src[k];
        if (v && typeof v === "object" && !Array.isArray(v) && dst[k] && typeof dst[k] === "object" && !Array.isArray(dst[k])) {
          util.merge(dst[k], v);
        } else {
          dst[k] = Array.isArray(v) ? v.slice() : v;
        }
      });
      return dst;
    },

    debounce: function (fn, ms) {
      var t = null;
      var wrapped = function () {
        var args = arguments, self = this;
        if (t) clearTimeout(t);
        t = setTimeout(function () { t = null; fn.apply(self, args); }, ms);
      };
      wrapped.annulla = function () { if (t) { clearTimeout(t); t = null; } };
      return wrapped;
    },

    uuid: function () {
      var s = "";
      for (var i = 0; i < 32; i++) s += "0123456789ABCDEF"[Math.floor(Math.random() * 16)];
      return s;
    },

    /* Generatore pseudocasuale deterministico (mulberry32):
       lo stesso seme produce sempre la stessa grana. */
    rng: function (seme) {
      var a = (seme >>> 0) || 1;
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },

    /* HSL -> RGB, componenti 0..1. Serve per viraggi e split toning. */
    hslToRgb: function (h, s, l) {
      h = ((h % 360) + 360) % 360 / 360;
      if (s === 0) return [l, l, l];
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      function hue(t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      }
      return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)];
    },

    rgbToHex: function (r, g, b) {
      function c(v) {
        var n = Math.round(util.clamp(v, 0, 1) * 255).toString(16);
        return n.length === 1 ? "0" + n : n;
      }
      return "#" + c(r) + c(g) + c(b);
    },

    hexToRgb: function (hex) {
      var h = String(hex).replace("#", "");
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return [parseInt(h.substr(0, 2), 16) / 255, parseInt(h.substr(2, 2), 16) / 255, parseInt(h.substr(4, 2), 16) / 255];
    },

    /* Data e ora in formato compatto per i nomi file. */
    timestamp: function () {
      var d = new Date();
      function p(n) { return (n < 10 ? "0" : "") + n; }
      return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes());
    },

    /* Nome file sicuro a partire dal nome di una ricetta. */
    slug: function (s) {
      return String(s || "ricetta")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "-") || "ricetta";
    }
  };

  BN.util = util;
})(this);
