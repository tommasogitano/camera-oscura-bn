# Contribuire a Camera Oscura BN

Grazie di voler dare una mano. Camera Oscura BN e un progetto libero, nato per
amore della fotografia in bianco e nero: ogni contributo, piccolo o grande, e
benvenuto.

## Senza scrivere codice

* **Segnalare un problema.** Apri una segnalazione (issue) e indica: versione di
  Photoshop, sistema operativo, cosa hai fatto, cosa ti aspettavi e cosa e
  successo. Allega il testo della `Diagnostica` (scheda `Esporta`, in fondo).
* **Proporre una ricetta.** Esporta la ricetta dal pannello (`Esporta file`,
  formato `.bnricetta.json`) e allegala con due righe su come e perche l'hai
  costruita, e se possibile un'immagine prima e dopo.
* **Provare su altre configurazioni.** Il plugin e collaudato su Photoshop 27.10
  per Windows. Prove su Mac e su versioni precedenti sono preziose.
* **Migliorare guida e traduzioni.** Il pannello e la documentazione sono in
  italiano; una versione inglese e tra i passi previsti.

## Scrivendo codice

1. Leggi prima [docs/ARCHITETTURA.md](docs/ARCHITETTURA.md): spiega come e
   diviso il codice.
2. Regole di casa:
   * nessun passaggio di compilazione: script classici caricati in ordine da
     `bn-studio/index.html`, spazio dei nomi globale `BN`;
   * `bn-studio/src/core/` e matematica pura, verificabile con Node;
     `bn-studio/src/ps/` e l'unico posto che parla con Photoshop;
   * tutti i descrittori batchPlay stanno in `bn-studio/src/ps/actions.js`;
   * il lessico del pannello e quello italiano della camera oscura.
3. Prima di proporre una modifica esegui le verifiche:
   `node strumenti/test-core.js`.
4. Prova la modifica in Photoshop: con Photoshop chiuso esegui
   `strumenti/installa-plugin.bat`, che crea il pacchetto e lo installa.
5. Proponi la modifica (pull request) descrivendo cosa cambia e come l'hai
   provata.

Il piano di sviluppo sta in [docs/SILVER-EFEX.md](docs/SILVER-EFEX.md): si
procede a blocchi, e un blocco nuovo si apre solo quando il precedente e
collaudato in Photoshop.

## Licenza dei contributi

Proponendo un contributo accetti che venga distribuito con la stessa licenza
del progetto, la GNU GPL 3.0 (file [LICENSE](LICENSE)).

## Tono

Rispetto, pazienza e gentilezza. Qui si impara insieme.
