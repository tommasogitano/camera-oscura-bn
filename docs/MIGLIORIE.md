# Integrazione con la suite Adobe e sviluppi possibili

## Parte prima: dove il plugin si innesta nella suite

### Photoshop (implementato)

E la sede naturale del pannello. Tutto il lavoro avviene su livelli di
regolazione nativi, quindi il documento resta leggibile e modificabile anche da
chi non ha il plugin. Nessun formato proprietario, nessuna dipendenza nascosta:
se un domani il plugin sparisce, i file restano lavorabili.

Cosa e stato scelto di non fare: il filtro Camera Raw guidato da script. Sarebbe
possibile invocarlo via `batchPlay`, ma i suoi parametri viaggiano in un blocco
serializzato non documentato, che cambia fra versioni. Un preset .xmp ottiene lo
stesso risultato in modo stabile e verificabile.

### Camera Raw e Lightroom Classic (implementato)

Il ponte e il preset .xmp, che il pannello scrive direttamente nella cartella
dei preset. Da li la ricetta e disponibile su qualsiasi RAW, applicabile a un
rullino intero e sincronizzabile fra immagini.

Il limite reale: Camera Raw ragiona su otto canali cromatici, Photoshop su sei.
La traduzione in `xmp.js` mappa rosso, giallo, verde, ciano, blu e magenta sui
corrispondenti, e ricava arancio e viola come media dei vicini. Su una scena
con arance o violette molto sature lo scarto fra pannello e Camera Raw si vede:
in quei casi conviene rifinire il canale arancio direttamente in Camera Raw.

### Lightroom nella versione cloud

Non accetta file .xmp copiati in una cartella. L'unica via e Lightroom Classic
con la sincronizzazione attiva: i preset importati in Classic compaiono anche
sui dispositivi. Non e una limitazione del plugin ma dell'architettura di Adobe.

### Adobe Bridge

Nessuna integrazione necessaria: Bridge applica i preset di Camera Raw a
selezioni di file senza aprirli. Una volta scritto il preset, e gia lo strumento
piu rapido per trattare un intero servizio.

### Premiere Pro, After Effects, DaVinci Resolve (implementato)

La LUT .cube porta il look su materiale video. Utile in concreto quando una
fotografia e un video nascono dallo stesso sopralluogo e devono somigliarsi.
Restano fuori grana e vignetta, che in video vanno rifatte con gli strumenti
del montaggio, dove hanno senso in movimento e non fisse sul fotogramma.

### InDesign

Non c'e integrazione e per ora non serve. Diventerebbe interessante per un
libro fotografico: esportare da una cartella di stampe un IDML gia impaginato,
con didascalie prese dai metadati. E un progetto a se, non un'estensione di
questo pannello.

### Adobe Express e Firefly

Fuori perimetro. Sono strumenti generativi e di impaginazione veloce: possono
servire per adattare una stampa ai formati social, non per costruirne la resa
tonale. Se serve, quel passaggio conviene farlo a valle, sul file finito.

## Parte seconda: migliorie possibili, in ordine di utilita reale

### Primo orizzonte: quello che manca davvero

**Anteprima dentro il pannello.** Oggi si giudica guardando il documento. Con
`imaging.getPixels` si puo estrarre una miniatura da 400 pixel, applicarle la
ricetta in JavaScript (il codice di `lut.js` fa gia esattamente questo calcolo)
e disegnarla nel pannello. Diventa possibile provare venti ricette in pochi
secondi, senza toccare il documento. E la miglioria che cambierebbe di piu il
modo di lavorare.

**Istogramma con allarme di taglio.** Dalla stessa miniatura si ricava
l'istogramma del risultato, con evidenza dei pixel schiacciati sul nero pieno e
sul bianco puro. Nel bianco e nero l'errore piu frequente e proprio quello: neri
chiusi che in stampa diventano una macchia senza dettaglio.

**Confronto prima e dopo, e istantanee.** Un pulsante che spegne il gruppo per
un istante, e la possibilita di salvare due o tre stati della ricetta da
confrontare. Poco codice, molto guadagno.

**Grana in funzione della dimensione di stampa.** Oggi i valori sono tarati su
una stampa da trenta centimetri. La grana e un fenomeno fisico: la sua
dimensione apparente dipende dal rapporto fra risoluzione del file e dimensione
finale. Un campo "stampa prevista in centimetri" permetterebbe di mantenere la
stessa resa passando da un 20x30 a un 70x100.

### Secondo orizzonte: fedelta e controllo

**Maschere di intervallo nel preset .xmp.** Camera Raw supporta correzioni
locali con maschera di intervallo di luminanza. Tradurre il sistema zonale in
maschere di questo tipo porterebbe anche sui RAW il lavoro per zone, che oggi
resta confinato a Photoshop. E la lacuna piu seria della traduzione attuale.

**Profilo creativo invece che preset.** Un profilo di Camera Raw e un .xmp che
contiene una tabella di look tridimensionale. Rispetto al preset ha due
vantaggi: si applica prima delle regolazioni, quindi non le sovrascrive, e
Lightroom gli affianca un cursore di intensita. La tabella la sappiamo gia
generare, e quella della LUT: manca solo l'involucro.

**Split toning con curve per canale.** Il Bilanciamento colore attuale e un
mezzo onesto ma grossolano. Tre curve separate su rosso, verde e blu darebbero
il controllo che serve per un viraggio al selenio credibile, dove le ombre
virano e i mezzitoni no.

**Maschere di soggetto.** Photoshop espone la selezione automatica del soggetto
e del cielo. Un pulsante "brucia solo il cielo" o "schiarisci il volto" userebbe
quelle selezioni come maschera di un livello Curve dedicato, con la stessa
logica dei livelli per zona.

**Simulazione della carta.** Baritata, opaca, perlata: ciascuna ha un nero
massimo diverso e una gamma tonale diversa. Una curva di compensazione per tipo
di carta, applicata come ultimo livello e attivabile solo per la stampa,
eviterebbe la delusione classica del nero che sullo schermo era profondo e sulla
carta e grigio.

### Terzo orizzonte: contorno e comodita

**Bordi da negativo.** Il bordo irregolare della pellicola con i codici di
bordo, come si vede nelle stampe a tutto negativo. Serve una libreria di
maschere in immagine, non calcolabili: e piu un lavoro di materiali che di
codice.

**Esportazione come azione di Photoshop.** Una ricetta convertita in file .atn
permetterebbe di usarla in Photoshop senza il plugin, per esempio su un altro
computer.

**Registrazione del dodge and burn a pennello.** Oggi il lavoro locale e per
valore tonale. Il lavoro per posizione, cioe il pennello, resta manuale: si
potrebbe registrare come tracciato e riapplicarlo a immagini simili.

**Verifiche automatiche sui descrittori.** I test attuali coprono la matematica.
Una seconda serie che apra un documento di prova e verifichi che ogni
descrittore batchPlay funzioni sulla versione di Photoshop installata renderebbe
indolori gli aggiornamenti annuali di Adobe.

## Nota di metodo

Le ricette delle pellicole sono interpretazioni, non misurazioni. Sono costruite
sul comportamento noto di ciascuna emulsione, curva caratteristica, resa della
grana, risposta spettrale, ma nessuno ha densitometrato una Tri-X per ricavarle.
Chi volesse fare quel passo dovrebbe fotografare una scala di grigi calibrata su
pellicola, scansionarla e ricavare la curva reale: il plugin e gia predisposto ad
accogliere quei numeri, perche una pellicola e solo un oggetto con una curva e
tre parametri di grana.
