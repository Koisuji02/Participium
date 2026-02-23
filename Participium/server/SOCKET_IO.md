# SOCKET.IO (libreria come usare e come impatta il progetto)

## Come funziona Socket.IO:
Client e server stabiliscono una connessione WebSocket (con fallback su long-polling se necessario).
Il server gestisce “stanze” (rooms) per isolare flussi — qui usiamo report:${reportId}.
Il client invia join-report con l’ID del report; il server lo mette nella stanza.
Quando salviamo un messaggio interno, il controller emette internal-message:new verso quella stanza; solo i client che l’hanno “joinata” lo ricevono.


## Perché bastano poche righe di modifica al progetto?
Hai già tutto il flusso REST e l’ACL in posto. Socket.IO qui è solo uno “strato push” sopra la logica esistente: non cambia DTO, rotte o repository.
Servono tre pezzi minimi:
- Condividere l’istanza (ioService con setIO/getIO).
- Inizializzare Socket.IO una volta nel bootstrap e definire l’evento di join.
- Emettere l’evento dopo il save.

## app.listen(...) vs httpServer.listen(...):
app.listen() internamente crea un http.Server e lo mette in ascolto su app. Noi facciamo la stessa cosa in modo esplicito: const httpServer = http.createServer(app); httpServer.listen(...).
Attaccando Socket.IO a httpServer, tutte le richieste Express continuano a funzionare esattamente come prima, perché l’httpServer inoltra le HTTP al tuo app (Express).
Quindi non “rompi” nulla: le rotte REST, middleware, uploads, ecc. restano invariati. In più, il server ora gestisce anche il canale WebSocket.
In sintesi: è funzionalmente equivalente, solo che ora abbiamo accesso all’istanza io per il realtime.