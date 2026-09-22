# Guida d'uso

## Il principio

Il pannello non modifica i pixel. Costruisce dentro il documento un gruppo
chiamato `Camera Oscura BN` con una pila di livelli di regolazione, ciascuno con
un nome fisso. Quando muovi un cursore, il plugin cerca il livello corrispondente
e lo aggiorna: la ricetta e sempre reversibile, e i livelli restano modificabili
a mano anche senza il pannello.

Ordine della pila, dal basso verso l'alto:

1. `BN · Conversione` (livello Bianco e nero, contiene miscelatore e filtro)
2. `BN · Curva` (livello Curve, contiene punti di nero e bianco, contrasto, esaltazioni)
3. `BN · Zone · …` (un livello Curve mascherato per ogni zona attiva)
4. `BN · Struttura` e `BN · Chiarezza` (livelli pixel calcolati sul visibile)
5. `BN · Viraggio` (Mappa sfumatura)
6. `BN · Split toning` (Bilanciamento colore)
7. `BN · Vignetta` (Curve con maschera radiale)
8. `BN · Grana` (livello pixel a luce soffusa, mascherato per fasce tonali)

Il bordo, quando allarga il quadro, resta fuori dal gruppo.

## Flusso di lavoro consigliato

**1. Parti da una pellicola.** Scheda `Pellicola`: tredici emulsioni e sei
interpretazioni di stampa. Un clic imposta miscelatore, curva e grana coerenti
fra loro. Serve come punto di partenza, non come punto di arrivo.

**2. Scegli il filtro.** Scheda `Canali`. Il filtro colorato e la decisione piu
importante di tutto il bianco e nero: decide come i colori della scena si
traducono in grigi. Cielo troppo pallido significa quasi sempre filtro giallo o
arancio; incarnati grigiastri significano filtro rosso di troppo.

**3. Costruisci il tono.** Scheda `Tono`. Prima i punti di nero e di bianco,
poi il contrasto generale, infine la curva a mano per il modellato. Le tacche
verticali sul grafico sono le undici zone: la V al centro e il grigio medio.

**4. Interviene sulle zone.** Scheda `Zone`, se serve. Ogni cursore schiarisce o
brucia una fascia tonale con una maschera di luminosita a campana: e il gesto
della mano sotto l'ingranditore, applicato per valore invece che per posizione.

**5. Aggiungi la grana.** Scheda `Grana`. Il motore nativo usa i filtri di
Photoshop ed e veloce; quello procedurale calcola il granulo pixel per pixel e
tiene davvero fede a dimensione e ruvidita. La distribuzione per fascia tonale
serve a non impastare le alte luci: nella pellicola vera la grana si vede molto
nelle ombre e nei mezzitoni, molto meno nel bianco.

**6. Chiudi con le finiture.** Scheda `Finiture`: viraggio, split toning,
vignettatura, bordo. La striscia sotto il viraggio mostra la scala dei grigi
risultante, viraggio compreso.

## Come lavorare sui RAW

Photoshop non applica una regolazione al negativo digitale: il RAW passa da
Camera Raw. Il modo corretto e questo.

**Metodo consigliato: preset .xmp.** Metti a punto la resa su un file gia
sviluppato, poi scheda `Esporta`, `Nella cartella preset`. Il preset compare in
Camera Raw e in Lightroom Classic sotto il gruppo `Camera Oscura BN`, e si
applica ai RAW come qualsiasi altro preset, anche a interi rullini in una volta
sola. Cosi la conversione avviene sui dati del sensore, con tutta la latitudine
disponibile su neri e alte luci.

**Metodo alternativo: oggetto avanzato.** Apri il RAW in Photoshop tenendo
premuto Maiusc sul pulsante `Apri immagine` (diventa `Apri oggetto`). Ottieni un
livello oggetto avanzato che riapre Camera Raw con un doppio clic. Sopra ci
lavori con il pannello: il filtro colorato e le zone agiscono sul risultato di
Camera Raw, mentre esposizione e recupero delle luci restano nel modulo RAW,
dove hanno piu dati su cui lavorare.

**Cosa passa e cosa non passa nel preset .xmp**

| Passa | Non passa |
|---|---|
| Miscelatore B/N tradotto negli otto canali di Camera Raw | Sistema zonale (le maschere di luminosita non esistono nei preset) |
| Curva tonale, punti di nero e bianco, contrasto | Bordi e cornici |
| Chiarezza e struttura (come Texture) | La resa esatta della grana: Camera Raw ha un proprio modello |
| Grana: quantita, dimensione, frequenza | |
| Vignettatura dopo il ritaglio | |
| Viraggio e split toning tradotti in gradazione colore | |

## LUT .cube

La scheda `Esporta` genera una LUT 3D con conversione, filtro, tono e viraggio.
Non contiene grana e vignetta, perche una LUT trasforma un colore in un altro
colore e non sa dove si trovi il pixel nel fotogramma.

Si usa in Photoshop come livello `Ricerca colore`, in Premiere Pro come effetto
Lumetri, in DaVinci Resolve come LUT di look. Utile soprattutto per portare la
stessa resa su un video girato in parallelo alle fotografie.

La dimensione: 17 punti basta per look morbidi, 33 e lo standard, 65 serve solo
se il look ha transizioni molto brusche.

## Provini a contatto

Il pulsante `Provini a contatto` sviluppa la stessa immagine con piu ricette e
le dispone su un foglio unico, con l'etichetta sotto ciascuna. Su un file da 24
megapixel e otto ricette servono alcuni minuti: ne vale la pena quando bisogna
scegliere una resa per una serie intera.

Il pulsante `…` accanto estende il confronto a tutte le diciannove ricette.

## Lavorazione a lotti

`Documenti aperti` applica la ricetta corrente a tutti i documenti aperti,
lasciando i livelli modificabili.

`Cartella…` chiede una cartella di origine e una di destinazione, apre ogni
immagine, applica la ricetta, unifica ed esporta un JPEG alla massima qualita
con il suffisso `_BN`. Gli originali non vengono toccati.

## Quando qualcosa non funziona

La scheda `Esporta` contiene in fondo un registro. Ogni operazione che fallisce
ci scrive il messaggio esatto restituito da Photoshop: e l'informazione che
serve per correggere il descrittore corrispondente in `src/ps/actions.js`.

`Rimuovi il gruppo BN` cancella la pila di livelli e riparte da capo, utile
quando il documento e stato modificato a mano e il pannello non ritrova piu i
livelli con i nomi attesi.
