# Verso Silver Efex: analisi delle differenze e piano di lavoro

Obiettivo dichiarato: portare Camera Oscura BN ad avere tutte le funzioni di
Nik Silver Efex Pro 3, mantenendo il lessico italiano da camera oscura e
l'architettura attuale (livelli nativi di Photoshop, nessun formato chiuso).

Questo documento serve a due cose: sapere a che punto siamo e sapere cosa
manca. Va aggiornato a ogni blocco chiuso.

## Quadro d'insieme

Silver Efex organizza il lavoro in cinque famiglie. Ecco come stiamo.

| Famiglia | Stato |
|---|---|
| Preset e browser | Parziale: la libreria esiste, mancano miniature e categorie |
| Regolazioni globali | Completo nel codice, da collaudare |
| Regolazioni selettive (punti di controllo) | Assente |
| Filtro colore | Completo nel codice, da collaudare |
| Tipo di pellicola | Buono: tredici emulsioni contro diciotto |
| Finiture | Parziale: viraggio e vignetta grossolani, bordi bruciati assenti |
| Sistema zonale | Parziale: le zone si regolano, non si vedono |

## Dettaglio funzione per funzione

### Regolazioni globali

| Silver Efex | Nostro nome | Stato |
|---|---|---|
| Brightness | Luminosita | Assente come cursore autonomo (c'e gamma) |
| Brightness > Highlights / Midtones / Shadows | Luminosita per fascia | Assente |
| Dynamic Brightness | Luminosita dinamica | Assente |
| Contrast | Contrasto | Presente (`tono.contrasto`) |
| Soft Contrast | Contrasto morbido | Assente |
| Amplify Whites | Esalta bianchi | Presente (`tono.esaltaBianchi`) |
| Amplify Blacks | Esalta neri | Presente (`tono.esaltaNeri`) |
| Structure | Struttura | Presente (`tono.struttura`) |
| Structure > Highlights / Midtones / Shadows | Struttura per fascia | Assente |
| Fine Structure | Struttura fine | Assente |
| Tonality Protection (Shadows, Highlights) | Protezione tonale | Assente |
| Levels & Curves | Livelli e curva | Presente, con editor grafico |

### Filtro colore

| Silver Efex | Stato |
|---|---|
| Sei filtri preimpostati | Presente, anzi nove |
| Ruota di tinta continua 0-360 | Assente |
| Cursore di intensita | Presente (`conversione.intensitaFiltro`) |

### Tipo di pellicola

| Silver Efex | Stato |
|---|---|
| Diciotto emulsioni | Tredici presenti |
| Sensibilita per canale | Presente come sei cursori di conversione |
| Grana legata all'ISO | Parziale: la grana c'e, non e legata all'ISO dichiarato |
| Curva caratteristica per pellicola | Presente |

### Finiture

| Silver Efex | Stato |
|---|---|
| Ventitre viraggi | Dieci presenti |
| Tinta argento, intensita, bilanciamento | Parziale: un solo cursore di intensita |
| Tinta carta, intensita, bilanciamento | Assente |
| Vignetta: quantita, dimensione, centro | Presente in forma semplice |
| Vignetta: quattro cadute d'obiettivo | Assente |
| Vignetta: forma cerchio o rettangolo | Assente |
| Bordi bruciati sui quattro lati | Assente |
| Quattordici bordi immagine | Assente: oggi solo cornice piena |
| Bordo: diffusione, ruvidita, dissolvenza, variazione | Assente |

### Regolazioni selettive

| Silver Efex | Stato |
|---|---|
| Punti di controllo U Point | Assente |
| Per punto: luminosita, contrasto, struttura | Assente |
| Per punto: esalta bianchi e neri, struttura fine | Assente |
| Colorazione selettiva | Assente |
| Gruppi di punti | Assente |

### Interfaccia

| Silver Efex | Stato |
|---|---|
| Browser dei preset con miniature | Assente: elenco testuale |
| Anteprima nel pannello | Assente: si giudica sul documento |
| Confronto prima e dopo, diviso o affiancato | Assente |
| Istogramma | Assente |
| Cronologia navigabile | Parziale: annulla e ripristina, senza elenco |
| Sistema zonale visibile con avvisi di taglio | Assente |
| Lente di ingrandimento | Assente, e in Photoshop non serve |

## Stato dei blocchi (22 settembre 2026)

- Blocco 0: chiuso. Il pannello carica. Scoperto che Photoshop legge il registro
  `%APPDATA%\Adobe\UXP\PluginsInfo\v1\PS.json`: `installa-plugin.bat` ora vi scrive
  la voce del plugin (se il file contiene altri plugin non lo tocca e avvisa).
- Blocco 1: scritto e installato, da collaudare su un documento. Luminosita generale e
  per fascia, contrasto morbido e protezione tonale stanno nella curva (`core/curve.js`,
  sedici punti); luminosita dinamica, struttura per fascia e struttura fine sono livelli
  in `ps/pipeline.js`. Corretto anche `mascheraLuminosita`: la curva sulla maschera
  ora si applica senza selezione attiva.
- Blocco 2: scritto e installato, da collaudare. Voce "Tinta libera (ruota)" nel menu
  dei filtri e cursore Tinta 0-359; muovere il cursore attiva la ruota.
- Collaudo del 22 settembre 2026 su `prove/DJI_0245.DNG` (drone DJI, lago), Photoshop 27.10:
  sviluppo completo con Tri-X 400, filtro rosso 25A dal vivo, cursori ombre e alte luci
  dal vivo, viraggio platino-palladio. Registro pulito. Difetti trovati e corretti:
  - `aggiungiMaschera` usava le chiavi `_new`/`_target`: le giuste sono `new`/`at`.
    Effetto: la grana restava senza maschera e la selezione restava attiva.
  - La curva sulla maschera non accetta il canale "composite": ora si prova prima
    `ordinal/targetEnum` (accettato), poi le alternative.
  - `applica` ora deseleziona sempre, anche se uno stadio si ferma a meta.
  - Il registro scriveva "undefined": gli errori senza `.message` ora si leggono.
  - Tele scure: non era un difetto di disegno. Il ridisegno al cambio di scheda
    partiva prima che UXP impaginasse la tela; ora si ripete a 60 e 300 ms. Risolto.
  Seconda tornata, stesso giorno: provate la ruota "Tinta libera" (a 214 gradi il
  cielo schiarisce come con un vetro blu), la luminosita dinamica, la struttura, la
  struttura fine e la struttura per fascia. Altri due difetti trovati e corretti:
  - I livelli di regolazione nascono con una maschera bianca: `aggiungiMaschera`
    falliva ("Crea non disponibile"). Ora, se la maschera c'e gia, la elimina e la
    ricrea dalla selezione.
  - Due sviluppi sovrapposti (un cursore mosso mentre il precedente lavorava) si
    spezzavano a vicenda e lasciavano livelli sciolti fuori dal gruppo. Ora gli
    sviluppi si mettono in fila in `ui/main.js` (le richieste in attesa si fondono
    in una sola), e `costruisci` elimina i livelli gia creati se si ferma a meta.
  Blocchi 1 e 2 collaudati per intero.
- Da rifinire: durante uno sviluppo lungo (struttura, grana: 20-40 secondi) Photoshop
  blocca il pannello e i cursori mossi in quel momento vanno persi senza avviso.
  Serve un segnale visibile "sviluppo in corso".
- Da rifinire: il punto della curva utente resta dove lo si e messo mentre la curva
  composta (con i cursori per fascia) passa altrove; da chiarire graficamente.
- Verifiche automatiche: 35, tutte superate (`node strumenti/test-core.js`).

## Piano di lavoro

I blocchi sono ordinati per dipendenza, non per importanza. Ogni blocco si
chiude con il collaudo dentro Photoshop prima di aprire il successivo.

### Blocco 0. Far partire il plugin

Il codice e completo ma non ha mai girato. Manifest, `index.html` e
`entrypoints.js` sono stati riletti e non presentano le cause note di
"Load command failed". Resta da eseguire il caricamento e leggere il
registro nella scheda Esporta.

### Blocco 1. Regolazioni globali per fascia tonale

Luminosita generale e per fascia, luminosita dinamica, contrasto morbido,
struttura per fascia, struttura fine, protezione tonale.

In Photoshop: un livello Curve per fascia, mascherato con le maschere di
luminosita che `pipeline.mascheraLuminosita` sa gia costruire. La struttura
per fascia nasce da un livello di accentuazione passaggio con maschera di
fascia. La protezione tonale e una curva di richiamo applicata per ultima,
che riporta dentro il tracciato i valori spinti oltre.

Tocca: `core/curve.js`, `core/state.js`, `ps/pipeline.js`, `ui/main.js`.

### Blocco 2. Filtro colore con ruota di tinta

Oltre ai nove filtri, una tinta continua da 0 a 360 gradi con intensita.
Il miscelatore a sei valori si ricava interpolando fra i primari secondo la
posizione sulla ruota, esattamente come fa un filtro reale davanti
all'obiettivo.

Tocca: `core/filtri.js`, `ui/main.js`.

### Blocco 3. Pellicole e grana legata all'ISO

Portare le emulsioni a diciotto aggiungendo le mancanti del catalogo Nik.
Aggiungere il campo ISO alla ricetta: da quello discendono quantita e
dimensione del granulo, cosi che cambiare pellicola cambi la grana in modo
coerente invece che per valori scritti a mano.

Tocca: `core/pellicole.js`, `ps/grana.js`, `strumenti/genera-preset.js`.

### Blocco 4. Finiture complete

Viraggio separato in argento e carta, con tinta, intensita e bilanciamento
per ciascuno, e catalogo portato a ventitre. Vignetta con le quattro cadute
d'obiettivo, forma a cerchio o rettangolo e centro spostabile. Bordi bruciati
indipendenti sui quattro lati. Bordi immagine: quattordici tipi con
diffusione, ruvidita, dissolvenza e variazione.

Tocca: `core/viraggi.js`, nuovo `core/bordi.js`, `ps/pipeline.js`, `ps/actions.js`.

### Blocco 5. Sistema zonale visibile

Sovrapposizione che evidenzia la zona sotto il puntatore e segnala i pixel
schiacciati sul nero pieno e sul bianco puro.

Tocca: `ui/main.js`, dipende dalla miniatura del blocco 6.

### Blocco 6. Anteprima, istogramma, confronto, cronologia, preset

La miniatura estratta con `imaging.getPixels` e il perno di tutto il resto:
da li nascono l'istogramma, il confronto prima e dopo, le miniature del
browser dei preset e la superficie su cui si posano i punti di controllo.
La cronologia navigabile e quasi gratis: lo store tiene gia sessanta stati.

Tocca: nuovo `ui/anteprima.js`, nuovo `core/rendering.js`, `ui/main.js`.

### Blocco 7. Punti di controllo

Il cuore di Silver Efex. Ogni punto porta una posizione, un raggio e i suoi
cursori. La maschera si costruisce pixel per pixel come prodotto di tre
somiglianze: distanza dal punto, vicinanza di luminanza, vicinanza di colore.
Il risultato va in `imaging.putPixels` come maschera di un gruppo di livelli
dedicato, cosi che il documento resti leggibile anche senza il plugin.

Tocca: nuovo `core/upoint.js`, nuovo `ps/punti.js`, `ui/anteprima.js`, `ui/main.js`.

## Cosa resta fuori per scelta

La lente di ingrandimento: dentro Photoshop lo zoom del documento fa gia
quel lavoro. L'interfaccia a finestra intera: il pannello agganciato e piu
utile di una finestra modale che copre l'immagine.
