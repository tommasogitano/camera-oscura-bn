# Camera Oscura BN: punto di ripresa

Aggiornato il 22 settembre 2026, sera.

## Dove siamo

- Blocchi 0, 1 e 2 del piano Silver Efex collaudati in Photoshop 27.10 su `prove/DJI_0245.DNG`.
- Fatto nel pomeriggio, collaudato in Photoshop:
  1. Segnale "sviluppo in corso" (`ui/main.js`: `iniziaLavoro`, `fineLavoro`, `conSegnale`): riga ambra con secondi trascorsi sotto lo stato del documento, controlli spenti e contenuto attenuato finche lo sviluppo non finisce. Vale anche per nuova grana, bordo, provini e lotti. Serve una pausa di 120 ms (`lasciaDipingere`) prima di chiamare Photoshop, altrimenti il pannello si blocca senza aver dipinto il segnale.
  2. Curva: traccia ambra della sola curva utente (i punti stanno su questa) sotto la curva chiara complessiva. Mentre il pannello e occupato la curva non accetta clic.
  3. Pellicole con nomi propri (Strada 400, Nebbia 400, Notte 3200, Seta 100, Lama 100, Tabulare 400, Cristallo 50, Classica 125, Incisa 100, Quotidiana 400, Bottega 100, Infrarosso 400). Campo `ispirata` in `core/pellicole.js`, mostrato nella nota come "Ispirata a ...". Gli `id` sono invariati: le ricette salvate restano compatibili.
  4. `ricette/` rigenerata con i nuovi nomi (le vecchie in `_da-eliminare/ricette-vecchie/`).
  5. Manifest e `installa-plugin.bat`: `minVersion` 27.0.0 (l'unica versione collaudata).
  6. README e `docs/INSTALLAZIONE.md` riscritti per chi riceve il plugin (le vecchie versioni in `_da-eliminare/docs-vecchie/`).
  7. `strumenti/crea-ccx.bat` (+ `crea-ccx.ps1`): crea `dist/CameraOscuraBN-<versione>.ccx` con voci zip a barra "/".
  8. Pacchetto pronto: `dist/CameraOscuraBN-1.0.0.ccx`.
- Verifiche automatiche: tutte superate (`node strumenti/test-core.js`).

## Installazione dal .ccx (22 settembre, sera)

- Copia di sviluppo rimossa (spostata in `_da-eliminare/installazione-sviluppo/`), .ccx installato con `UnifiedPluginInstallerAgent.exe /install`: Photoshop lo carica da `%APPDATA%\Adobe\UXP\Plugins\External\it.tommasoscicchitano.cameraoscura_1.0.0`. Sviluppo provato: funziona.
- `strumenti/installa-plugin.bat` ora crea il .ccx e lo installa con lo stesso installatore (il vecchio copiava i file in una cartella che Photoshop non legge piu).

## Cosa resta (decisioni di Tommaso)

1. Scegliere il canale: distribuzione diretta da tommasoautore.it (consigliata per la 1.0) o Marketplace Adobe.
2. Distribuzione gratuita e libera, aperta alla collaborazione (decisione di Tommaso, 22 settembre).
3. Licenza: scelta GPL-3.0 (22 settembre). Prossimo passo: pubblicare il repository (GitHub) e il .ccx come release.
4. Facoltativo: prova su Mac e su Photoshop 2025, poi abbassare `minVersion`.

## Ciclo di lavoro

1. Modificare i file in `bn-studio/`.
2. Desktop Commander, shell cmd: `taskkill /IM Photoshop.exe /F & ping -n 10 127.0.0.1 >nul & echo.| "C:\Users\donto\Documents\Claude\Projects\App BN\strumenti\installa-plugin.bat" & start "" "C:\Program Files\Adobe\Adobe Photoshop 2026\Photoshop.exe" "C:\Users\donto\Documents\Claude\Projects\App BN\prove\DJI_0245.DNG"`.
3. Dopo circa 45-60 s si apre Camera Raw: "Apri", poi "Usa il profilo incorporato" e OK.
4. La ricetta riparte da "Base neutra"; il "live" funziona solo dopo il primo "Sviluppa".
5. Errori: scheda Esporta, in fondo, "Diagnostica".
6. Nel collaudo con gli strumenti di schermo: lo zoom dentro un batch usa la schermata precedente, per vedere cambiamenti servono schermate vere.

## Pulizia

- `_da-eliminare/` si puo cancellare (pezzi del DNG, ricette e documenti vecchi).
