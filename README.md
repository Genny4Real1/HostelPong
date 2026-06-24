# HostelPong V1.0

Pong multiplayer 1v1 in tempo reale. Crea una stanza, condividi il codice (o il QR) e gioca con il tuo compagno di stanza.
Prova anche gli effetti "Party Mode", tra frigoriferi, palle ubriache, terremoti e tanto altro (in sviluppo).

## Stack

- Node.js 18+, Express, Socket.IO 4
- Client: vanilla JS, Canvas, PWA (service worker incluso)

## Sviluppo locale

```bash
npm install
npm start
# apri http://localhost:3000 su due dispositivi
```

## Test in produzione

L'app è deployata su Railway:

https://hostelpong-production.up.railway.app/

Per testare il multiplayer:

1. Apri l'URL sul **dispositivo A** → tocca `Crea Stanza` → ricevi un codice a 4 cifre e un QR.
2. Scansiona il QR (o apri l'URL sul **dispositivo B** e digita il codice) → tocca `Unisciti`.
3. La partita inizia automaticamente. Il primo a 5 punti vince. `Rematch` per rigiocare.

Note per i tester:

- Funziona in modalità **landscape** (mobile) 
- Input supportato: **touch drag**
- Per testare da due postazioni diverse serve che **entrambi** i dispositivi aprano lo stesso URL 
- Niente account, niente dati salvati: chiudere la pagina libera la stanza.

## App installabile (PWA)

HostelPong è una PWA e può essere installata sulla home del telefono per un'esperienza migliore (fullscreen landscape, niente barra del browser che ruba spazio verticale, icona dedicata).

- **Android / Chrome**: dal menu del browser → `Installa app` (oppure `Aggiungi a schermata Home`). Su Chrome appare anche un prompt nativo la prima volta che la PWA soddisfa i criteri di installabilità.
- **iPhone / Safari**: tocca `Condividi` (icona quadrato con freccia) → `Aggiungi a Home`. iOS non supporta il prompt automatico.

Dopo l'installazione l'app si apre direttamente a tutto schermo, senza barra URL, e mantiene l'orientamento landscape.

## Deploy

Il deploy è automatico via Railway: push su `main` → build con Nixpacks → `npm start`. Nessuna variabile d'ambiente richiesta.

Per cambiare l'URL pubblico: Railway dashboard → Settings → Networking → Generate Domain o aggiungi un dominio custom.

## Licenza

GNU GPL v3.0 — vedi [LICENSE](LICENSE) per il testo completo.
