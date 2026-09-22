# Camera Oscura BN

Plugin per Adobe Photoshop dedicato al bianco e nero d'autore, pensato con il
lessico della camera oscura: conversione per canali con i filtri colorati
classici, regolazioni per fasce tonali, curva e sistema zonale, grana,
rese di pellicola, viraggi e finiture di stampa.

Tutto lavora su livelli di regolazione non distruttivi, raccolti in un gruppo
che si puo riaprire e ritoccare. La stessa ricetta puo uscire come preset
Camera Raw e Lightroom (.xmp) o come LUT 3D (.cube) per Premiere e DaVinci.

Di Tommaso Scicchitano, [tommasoautore.it](https://tommasoautore.it).

**Software libero e gratuito**, nato per amore della fotografia e aperto a chi
vuole usarlo, studiarlo, migliorarlo e condividerlo. Si distribuisce con
licenza GNU GPL 3.0. Codice e versioni:
[github.com/tommasogitano/camera-oscura-bn](https://github.com/tommasogitano/camera-oscura-bn).

## Requisiti

* Adobe Photoshop 2026 (versione 27) su Windows. E la configurazione su cui il
  plugin e stato collaudato; versioni precedenti e macOS non sono ancora
  provati.
* Creative Cloud Desktop, che installa il pacchetto.

## Installazione

1. Scarica il file `CameraOscuraBN-1.0.0.ccx` dalla pagina delle
   [versioni](https://github.com/tommasogitano/camera-oscura-bn/releases/latest).
2. Fai doppio clic sul file: Creative Cloud chiede conferma e installa il plugin.
   Poiche il plugin non arriva dal Marketplace Adobe, compare un avviso: va
   accettato una volta sola.
3. Apri Photoshop e scegli `Plugin > Camera Oscura BN`.

Dettagli e soluzione dei problemi: [docs/INSTALLAZIONE.md](docs/INSTALLAZIONE.md).

## Primo uso

1. Apri una fotografia.
2. Scegli una resa nella scheda `Pellicola`, oppure parti da `Digitale neutro`.
3. Premi `Sviluppa`. Da quel momento, con `live` attivo, ogni modifica si
   riflette in Photoshop.
4. Durante gli sviluppi lunghi (struttura, grana: anche decine di secondi)
   compare una riga ambra "Sviluppo in corso" e i comandi si spengono: tornano
   attivi da soli alla fine.

La guida completa sta in [docs/GUIDA-USO.md](docs/GUIDA-USO.md).

## Preset senza plugin

La cartella `ricette/` contiene le 19 ricette gia pronte come preset .xmp,
LUT .cube e file .json importabili nel pannello. I preset .xmp funzionano
anche da soli in Camera Raw e Lightroom Classic (gruppo "Camera Oscura BN").

## Le rese di pellicola

Le rese hanno nomi propri (Strada 400, Nebbia 400, Seta 100...). Ciascuna e
un'interpretazione ispirata al carattere di una pellicola storica, indicata
nella nota della resa. I nomi delle pellicole citate sono marchi dei
rispettivi produttori, usati solo per descrivere l'ispirazione: il plugin non
e affiliato ad alcun produttore e le ricette non sono riproduzioni
certificate.

## Per chi sviluppa

| Percorso | Contenuto |
|---|---|
| `bn-studio/` | Il plugin (manifest, interfaccia, motore) |
| `strumenti/installa-plugin.bat` | Installa la cartella di sviluppo in Photoshop, con Photoshop chiuso |
| `strumenti/crea-ccx.bat` | Crea `dist/CameraOscuraBN-<versione>.ccx` da distribuire |
| `strumenti/test-core.js` | Verifiche automatiche dei calcoli (`node strumenti/test-core.js`) |
| `strumenti/genera-preset.js` | Rigenera `ricette/` |
| `docs/` | Installazione, guida d'uso, architettura, piano di sviluppo |

## Collaborare

Il progetto e aperto: fotografe e fotografi, sviluppatrici e sviluppatori sono
benvenuti. Si puo contribuire in molti modi, anche senza scrivere codice:
segnalare un problema, proporre una ricetta, provare il plugin su Mac o su
altre versioni di Photoshop, migliorare la guida, tradurre il pannello.

Come fare sta in [CONTRIBUIRE.md](CONTRIBUIRE.md). Il piano di sviluppo, blocco
per blocco, sta in [docs/SILVER-EFEX.md](docs/SILVER-EFEX.md) e in
[docs/MIGLIORIE.md](docs/MIGLIORIE.md).

## Licenza

Copyright (C) 2026 Tommaso Scicchitano.

Camera Oscura BN e software libero: puoi ridistribuirlo e modificarlo secondo i
termini della GNU General Public License, versione 3, pubblicata dalla Free
Software Foundation. Chi distribuisce versioni modificate deve rilasciarle con
la stessa licenza e con il codice sorgente, cosi il plugin resta di tutti.

Il programma e distribuito nella speranza che sia utile, ma SENZA ALCUNA
GARANZIA. Il testo completo della licenza e nel file [LICENSE](LICENSE).

La licenza vale anche per ricette, preset .xmp, LUT e documentazione.
