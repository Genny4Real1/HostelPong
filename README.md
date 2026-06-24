# HostelPong

Pong multiplayer 1v1 in tempo reale. Crea una stanza, condividi il codice o il QR) e gioca con il tuo compagno di stanza.
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

- Funziona in **landscape** 
- Sono supportati **touch drag** (mobile) e tastiera (desktop: W/S per P1, ↑/↓ per P2).
- Per testare da due postazioni diverse serve che **entrambi** aprano lo stesso URL Railway 
- Niente account, niente dati salvati: chiudere la pagina libera la stanza.

## Deploy

Il deploy è automatico via Railway: push su `main` → build con Nixpacks → `npm start`. Nessuna variabile d'ambiente richiesta.

Per cambiare l'URL pubblico: Railway dashboard → Settings → Networking → Generate Domain o aggiungi un dominio custom.

## Licenza

GNU GPL v3.0 — vedi [LICENSE](LICENSE) per il testo completo.
