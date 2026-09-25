# Architettura

## Scelte di fondo

**Nessun passaggio di compilazione.** I file sono script classici caricati in
ordine da `index.html`, ognuno dei quali estende un unico oggetto globale `BN`.
Non servono npm, bundler o transpilatori: si modifica un file e si preme
`Reload` in UDT. Il prezzo e la disciplina sull'ordine di caricamento.

**Separazione fra calcolo e Photoshop.** Tutto cio che sta in `src/core/` e
matematica pura, senza alcuna dipendenza da Photoshop: si esegue con Node e si
verifica automaticamente. Tutto cio che parla con Photoshop sta in `src/ps/`.
Questa separazione e la ragione per cui `strumenti/test-core.js` puo controllare
conversione, curve, LUT e XMP senza aprire Photoshop.

**Un solo posto per i descrittori.** Ogni chiamata a `batchPlay` vive in
`src/ps/actions.js`. I descrittori di Photoshop cambiano fra versioni: quando
uno smette di funzionare, si corregge li e tutto il resto continua a valere.

## Mappa dei file

### src/core (calcolo puro)

| File | Responsabilita |
|---|---|
| `util.js` | Funzioni di servizio: clamp, fusione ricorsiva, generatore pseudocasuale deterministico, conversioni di colore |
| `curve.js` | Interpolazione cubica monotona (Fritsch-Carlson), composizione di livelli, contrasto, esaltazione di neri e bianchi; produce sia i punti per Photoshop sia la tabella a 256 valori |
| `filtri.js` | I nove filtri fotografici, ciascuno come set di sei valori del miscelatore |
| `bn.js` | Algoritmo di conversione: scomposizione del colore nella coppia primario/secondario, come fa il livello Bianco e nero |
| `viraggi.js` | Dieci rampe di viraggio e la funzione che colora un grigio, split toning compreso |
| `pellicole.js` | Tredici emulsioni e sei interpretazioni di stampa, ognuna come ricetta parziale |
| `state.js` | La ricetta, lo store con osservatori, la cronologia di annulla e ripristina |
| `lut.js` | Generatore .cube e curva risultante per l'anteprima |
| `xmp.js` | Generatore di preset Camera Raw, compresa la traduzione da sei a otto canali |
| `radiale.js` | Maschera radiale: geometria dell'ellisse in pixel, peso della maschera sfocata, contorni per il disegno |
| `file.js` | Lettura e scrittura su disco, cartelle memorizzate con token persistenti, libreria delle ricette |

### src/ps (dialogo con Photoshop)

| File | Responsabilita |
|---|---|
| `actions.js` | Tutti i descrittori batchPlay e l'involucro `executeAsModal` con sospensione della cronologia |
| `pipeline.js` | Costruzione e aggiornamento della pila di livelli; decide quando basta aggiornare e quando serve ricostruire |
| `grana.js` | Motore di grana procedurale con l'API `imaging`, rumore a tre ottave con reticolo interpolato |
| `provini.js` | Foglio di provini a contatto: duplica il documento, applica ogni ricetta, unifica, ridimensiona e riporta il livello nel foglio |
| `lotto.js` | Applicazione a tutti i documenti aperti e a intere cartelle |

### src/ui

| File | Responsabilita |
|---|---|
| `log.js` | Registro visibile nel pannello, indispensabile per diagnosticare i descrittori |
| `curva.js` | Editor grafico della curva su canvas, con sole primitive supportate da UXP |
| `radiale.js` | Editor grafico della maschera radiale su canvas, con quattro maniglie |
| `main.js` | Collegamento fra controlli e stato, schede, esportazioni |

## Il flusso di una modifica

1. L'utente muove un cursore. `main.js` legge `data-p` e chiama `BN.stato.imposta`.
2. Lo store registra il valore nella cronologia e avvisa gli osservatori.
3. L'osservatore in `main.js` risincronizza l'interfaccia e ridisegna la curva.
4. La stessa funzione chiama `applicaRitardata`, che dopo 320 millisecondi
   invoca `BN.pipeline.applica` con il nome del parametro cambiato.
5. `pipeline.aggiorna` decide: se il parametro tocca un livello di regolazione
   gia esistente lo aggiorna; se tocca la struttura (grana, zone, chiarezza,
   vignetta) restituisce `false` e la pila viene ricostruita da zero.

Il ritardo di 320 millisecondi e il compromesso trovato fra reattivita e
sovraccarico: piu corto e Photoshop accumula operazioni, piu lungo e la
lavorazione sembra scollegata dal gesto.

## Punti delicati

**Le maschere di luminosita.** Caricare la luminosita del composito significa
includere anche il livello che si sta mascherando. La funzione
`pipeline.mascheraLuminosita` nasconde il livello, carica la selezione, lo
rimostra e solo allora applica la maschera. Senza questo passaggio la grana
influenzerebbe la propria maschera.

**Il canale verde nei descrittori.** Nei descrittori di Photoshop il colore RGB
si scrive `{red, grain, blue}`: `grain` e il nome storico del canale verde e non
ha nulla a che vedere con la grana fotografica. E scritto anche nel commento del
codice, perche e la prima cosa che confonde chi ci mette mano.

**Il limite dei punti curva.** Photoshop accetta al massimo sedici punti di
controllo. `curve.puntiPerPhotoshop` campiona la funzione composta in dodici
punti: la spline di Photoshop ricostruisce il resto con uno scarto inferiore a
un livello su 255, verificato dal test.

**La dimensione della grana procedurale.** Un buffer RGB a piena risoluzione per
un file da 42 megapixel occupa circa 126 megabyte. Oltre quella soglia il motore
procedurale rifiuta e la pipeline ricade su quello nativo, con un avviso nel
registro invece di un errore.

## Come aggiungere una pellicola

In `src/core/pellicole.js`, aggiungi una voce all'array con `id`, `nome`,
`marca`, `iso`, `nota` e una `patch` che dichiara solo cio che cambia. La
griglia nel pannello, i provini e il generatore di preset la prendono da soli.
Poi `node strumenti/genera-preset.js` per produrne .xmp, .cube e .json.

## Verifiche automatiche

`strumenti/test-core.js` controlla ventidue proprieta: che un grigio resti
grigio, che i filtri agiscano nel verso giusto, che le curve composte restino
monotone, che le LUT abbiano il numero esatto di voci con valori in 0..1, che
l'XMP resti XML valido anche con virgolette e caratteri speciali nel nome.
Si esegue con `node strumenti/test-core.js` e non richiede Photoshop.
