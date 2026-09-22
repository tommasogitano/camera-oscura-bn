# Installazione

## Requisiti

* Adobe Photoshop 2026 (versione 27 o successiva) su Windows. Il plugin e
  collaudato su Photoshop 27.10; macOS e versioni precedenti non sono ancora
  provati.
* Creative Cloud Desktop aggiornato.

## Installare dal pacchetto .ccx (per chi usa il plugin)

1. Chiudi Photoshop.
2. Fai doppio clic su `CameraOscuraBN-1.0.0.ccx`. Si apre Creative Cloud
   Desktop e chiede di confermare l'installazione.
3. Compare l'avviso che il plugin non proviene dal Marketplace Adobe: conferma.
   Succede solo la prima volta.
4. Apri Photoshop: il pannello sta in `Plugin > Camera Oscura BN`. Trascinalo
   dove preferisci, si aggancia come gli altri pannelli.

Se il doppio clic non apre nulla, apri Creative Cloud Desktop, vai in
`Plugin > Gestisci plugin`, poi nel menu `...` scegli di installare un plugin
da file e indica il `.ccx`.

## Aggiornare

Installa il nuovo `.ccx` con lo stesso procedimento: sostituisce la versione
precedente. Le ricette salvate in libreria restano.

## Disinstallare

Creative Cloud Desktop, `Plugin > Gestisci plugin`, riga di Camera Oscura BN,
`Disinstalla`. Le ricette in libreria vengono rimosse con il plugin: se ci
tieni, esportale prima dalla scheda `Esporta` con `Esporta file`.

## Prima configurazione consigliata

* Nella scheda `Esporta` premi `Nella cartella preset`. Alla prima volta scegli
  la cartella dei preset di Camera Raw, su Windows di solito
  `C:\Users\<utente>\AppData\Roaming\Adobe\CameraRaw\Settings`. Da quel momento
  i preset ci finiscono con un clic.
* Per avere subito tutte le rese in Lightroom o Camera Raw, copia il contenuto
  di `ricette/xmp/` in quella cartella e riavvia il programma.

## Se qualcosa non va

* **Il pannello non compare nel menu Plugin.** Controlla in Creative Cloud
  Desktop, `Plugin > Gestisci plugin`, che Camera Oscura BN sia installato e
  attivo, poi riavvia Photoshop.
* **Uno sviluppo non riesce.** Scheda `Esporta`, in fondo, `Diagnostica`: il
  registro riporta l'errore. Copialo e mandalo all'autore.
* **Il pannello sembra fermo.** Se c'e la riga ambra "Sviluppo in corso",
  Photoshop sta lavorando: aspetta che finisca, i comandi si riaccendono da
  soli.

## Per chi sviluppa

Dopo ogni modifica al codice:

1. Chiudi Photoshop.
2. Esegui `strumenti/installa-plugin.bat`: crea il pacchetto in `dist/` e lo
   installa con l'installatore ufficiale di Creative Cloud.
3. Riapri Photoshop.

Per creare solo il pacchetto, senza installarlo: `strumenti/crea-ccx.bat`.
Prima di rilasciare una versione nuova, aggiorna il numero in
`bn-studio/manifest.json`.
