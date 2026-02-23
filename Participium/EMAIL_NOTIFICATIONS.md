# Sistema di Notifiche Email

## Panoramica

Il sistema di notifiche email permette ai cittadini di ricevere alert via email in aggiunta alle notifiche sulla piattaforma. Le email vengono inviate automaticamente quando:

- Lo stato di un report seguito cambia (STATUS_CHANGE)
- Un officer invia un messaggio riguardo a un report (OFFICER_MESSAGE)
- Viene creata qualsiasi altra notifica generica

## Configurazione SMTP

Il sistema utilizza nodemailer con configurazione SMTP definita in `server/src/config/config.ts`:

```typescript
SMTP_CONFIG: {
  HOST: "smtp.gmail.com",
  PORT: 587, // STARTTLS
  USER: "participium.g16@gmail.com",
  PASS: "dipbicxsehqbzedo",
  ALLOW_SELF_SIGNED: false
}
```

## Preferenze Utente

Ogni utente può abilitare/disabilitare le notifiche email tramite il campo `emailNotifications` nel proprio profilo.

### Default
- **Valore predefinito**: `true` (abilitato)
- Gli utenti possono modificare questa preferenza tramite il pannello di configurazione

### Modifica delle Preferenze

**Endpoint**: `PATCH /api/v1/users/me`

**Request Body** (multipart/form-data):
```json
{
  "emailNotifications": true  // o false
}
```

**Esempio con curl**:
```bash
curl -X PATCH "http://localhost:5000/api/v1/users/me" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "emailNotifications=false"
```

## Architettura

### 1. Servizio di Notifica Email (`notificationService.ts`)

Il servizio `sendNotificationEmail` gestisce l'invio delle email:

- Verifica se l'utente ha abilitato `emailNotifications`
- Genera contenuto HTML e testo in base al tipo di notifica
- Invia l'email tramite SMTP
- Gestisce gli errori senza bloccare il flusso principale

### 2. Repository delle Notifiche (`NotificationRepository.ts`)

Il repository è stato aggiornato per inviare automaticamente email quando vengono create notifiche:

- `createNotification()`: Notifiche generiche
- `createStatusChangeNotification()`: Cambio stato report
- `createOfficerMessageNotification()`: Messaggi da officer

### 3. Template Email

Il sistema include template HTML professionali con:
- Intestazione colorata in base al tipo di notifica
- Contenuto formattato con box evidenziati
- Footer con istruzioni per disabilitare le notifiche
- Versione testo semplice per client email legacy

#### Tipi di Template

1. **STATUS_CHANGE** (verde #4CAF50)
   - Notifica cambio stato del report
   - Include numero report e nuovo stato
   - Per report declined, mostra anche la ragione

2. **OFFICER_MESSAGE** (blu #2196F3)
   - Messaggio dall'officer
   - Include numero report e testo del messaggio

3. **GENERIC** (grigio #607D8B)
   - Notifiche generiche
   - Contenuto personalizzabile

## Flusso di Notifica

1. Un evento scatena la creazione di una notifica (es. cambio stato report)
2. Il repository salva la notifica nel database
3. Il repository recupera i dati dell'utente
4. Se `user.emailNotifications === true`:
   - Il servizio genera il contenuto email
   - L'email viene inviata tramite SMTP
5. Eventuali errori nell'invio email vengono loggati ma non bloccano il processo

## Gestione Errori

- Gli errori SMTP vengono loggati nella console
- Le notifiche vengono sempre salvate nel database, anche se l'email fallisce
- Il sistema continua a funzionare anche se il server SMTP non è disponibile

## Testing

### Test Manuale

1. Crea un utente con email valida
2. Assicurati che `emailNotifications` sia `true`
3. Crea un report e cambia il suo stato
4. Verifica che l'email arrivi nella casella di posta

### Disabilitare le Notifiche Email

```bash
curl -X PATCH "http://localhost:5000/api/v1/users/me" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "emailNotifications=false"
```

### Riabilitare le Notifiche Email

```bash
curl -X PATCH "http://localhost:5000/api/v1/users/me" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "emailNotifications=true"
```

## File Modificati/Creati

1. **Nuovo**: `server/src/services/notificationService.ts`
   - Servizio per l'invio delle email di notifica
   - Template HTML e testo

2. **Modificato**: `server/src/repositories/NotificationRepository.ts`
   - Integrazione con `notificationService`
   - Invio automatico email per tutte le notifiche

## Sicurezza e Privacy

- Le email vengono inviate solo agli utenti che hanno esplicitamente abilitato la funzionalità
- Ogni email include istruzioni per disabilitare le notifiche
- Le credenziali SMTP sono gestite tramite variabili d'ambiente (o config)
- Il sistema rispetta il GDPR consentendo agli utenti di controllare le comunicazioni

## Note di Produzione

⚠️ **Importante**: Prima del deploy in produzione:

1. Spostare le credenziali SMTP in variabili d'ambiente
2. Utilizzare un servizio SMTP affidabile (SendGrid, AWS SES, ecc.)
3. Implementare rate limiting per prevenire spam
4. Considerare l'utilizzo di una coda (Redis/RabbitMQ) per l'invio asincrono
5. Monitorare i log per errori SMTP frequenti
6. Implementare retry logic per email fallite

## Esempio di Configurazione Produzione

```typescript
SMTP_CONFIG: {
  HOST: process.env.SMTP_HOST,
  PORT: parseInt(process.env.SMTP_PORT || "587"),
  USER: process.env.SMTP_USER,
  PASS: process.env.SMTP_PASS,
  ALLOW_SELF_SIGNED: false
}
```

## Future Implementazioni

- [ ] Coda per invio asincrono delle email
- [ ] Template personalizzabili per diverse lingue
- [ ] Digest email (riassunto giornaliero invece di email immediate)
- [ ] Preferenze granulari (es. solo cambio stato, non messaggi)
- [ ] Analytics per tracciare aperture email (opzionale)
