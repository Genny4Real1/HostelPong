# HostelPong

Pong multiplayer 1v1 in tempo reale per ostelli. Crea una stanza, condividi il codice (o il QR), il secondo giocatore si unisce e si gioca.

MVP: due telefoni, scansione QR, partita in 2 secondi.

## Stack

- Node.js 18+, Express, Socket.IO 4
- Client: vanilla JS, Canvas, PWA (service worker incluso)
- Zero database, zero account, zero build step lato client

## Sviluppo locale

```bash
npm install
npm start
# apri http://localhost:3000 su due dispositivi
```

## Test in produzione

L'app è deployata su Railway:

**https://<your-app>.up.railway.app**

Per testare il multiplayer:

1. Apri l'URL sul **dispositivo A** → tocca `Crea Stanza` → ricevi un codice a 4 cifre e un QR.
2. Scansiona il QR (o apri l'URL sul **dispositivo B** e digita il codice) → tocca `Unisciti`.
3. La partita inizia automaticamente. Il primo a 5 punti vince. `Rematch` per rigiocare.

Note per i tester:

- Funziona meglio in **landscape** (l'UI mostra un overlay "ruota il dispositivo" in portrait).
- Sono supportati **touch drag** (mobile) e tastiera (desktop: W/S per P1, ↑/↓ per P2).
- Per testare da due postazioni diverse serve che **entrambi** aprano lo stesso URL Railway (è già pubblico).
- Niente account, niente dati salvati: chiudere la pagina libera la stanza.

## Deploy

Il deploy è automatico via Railway: push su `main` → build con Nixpacks → `npm start`. Nessuna variabile d'ambiente richiesta.

Per cambiare l'URL pubblico: Railway dashboard → Settings → Networking → Generate Domain o aggiungi un dominio custom.

## Licenza

GNU GPL v3.0 — vedi [LICENSE](LICENSE) per il testo completo.
