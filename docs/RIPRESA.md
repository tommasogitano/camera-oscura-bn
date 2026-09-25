# Camera Oscura BN: punto di ripresa

Aggiornato il 25 settembre 2026, mattina.

## Novita del 25 settembre 2026: versione 1.1.0

- Maschera radiale ispirata a Silver Efex, nella nuova scheda "Locale": ellisse con centro, larghezza, altezza, rotazione e sfumatura; luminosita, contrasto e struttura indipendenti dentro e fuori; tela con anteprima e quattro maniglie.
- Su richiesta di Tommaso, due modi di lavorare direttamente sulla foto: "Centro sulla foto" (campionatore colore: il primo clic sull'immagine diventa il centro, poi il punto viene tolto e torna lo strumento di prima) e "Dalla selezione" (centro e misure da una selezione tracciata in Photoshop).
- Collaudata in Photoshop 27.10 su `prove/DJI_0245.DNG`: maschera ellittica sfumata, applicazione dal vivo, spostamento con aggiornamento delle sole maschere, centro sulla foto, ellisse dalla selezione. Test-core: 27 verifiche superate.
- `strumenti/installa-plugin.bat` ora rimuove il plugin prima di installarlo: a parita di versione l'installatore di Creative Cloud non sovrascriveva i file.
- Da Desktop Commander la shell cmd non trova `powershell`: premettere `set "PATH=%SystemRoot%\System32\WindowsPowerShell\v1.0;%SystemRoot%\System32;%PATH%" &` al comando del ciclo di lavoro.
- Nota: la tela del pannello risponde al trascinamento; il clic singolo inviato da automazione non sposta il centro (da provare a mano).

## Dove siamo

- Versione 1.1.0 nel manifest, commit e tag `v1.1.0` sul repository pubblico https://github.com/tommasogitano/camera-oscura-bn (GPL 3.0). Pacchetto `dist/CameraOscuraBN-1.1.0.ccx`.
- Blocchi 0, 1 e 2 del piano Silver Efex collaudati; maschera radiale fuori piano collaudata.
- Il plugin sul computer di Tommaso e installato dal .ccx 1.1.0.

## Cosa resta

1. Release 1.1.0 su GitHub con il .ccx allegato (se non gia fatta).
2. Link da tommasoautore.it a https://github.com/tommasogitano/camera-oscura-bn/releases/latest.
3. Facoltativo: Marketplace Adobe gratuito; prove su Mac e Photoshop 2025; versione inglese.
4. Sviluppo: blocchi 3-7 del piano Silver Efex come aggiornamenti (nuova versione nel manifest, nuovo tag e nuova release).

## Ciclo di lavoro

1. Modificare i file in `bn-studio/`.
2. Desktop Commander, shell cmd: `set "PATH=%SystemRoot%\System32\WindowsPowerShell\v1.0;%SystemRoot%\System32;%PATH%" & taskkill /IM Photoshop.exe /F & ping -n 10 127.0.0.1 >nul & echo.| "C:\Users\donto\Documents\Claude\Projects\App BN\strumenti\installa-plugin.bat" & start "" "C:\Program Files\Adobe\Adobe Photoshop 2026\Photoshop.exe" "C:\Users\donto\Documents\Claude\Projects\App BN\prove\DJI_0245.DNG"`.
3. Dopo 45-60 s si apre Camera Raw: "Apri", poi "Usa il profilo incorporato" e OK.
4. Il "live" funziona solo dopo il primo "Sviluppa".
5. Errori: scheda Esporta, in fondo, "Diagnostica".
6. Commit e push da Windows: `git add -A && git commit -m "..." && git push`. Se git segnala `index.lock`, cancellarlo (resta dalla macchina virtuale).
