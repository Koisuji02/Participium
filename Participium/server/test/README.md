# Test Suite - Participium Backend

Questa directory contiene tutti i test per il backend dell'applicazione Participium, organizzati in test di integrazione e unit test.

## 🏗️ Struttura

```
test/
├── setup/                      # Configurazione test environment
│   ├── test-datasource.ts      # Database SQLite in memoria per i test
│   ├── jest.setup.ts           # Setup globale Jest
│   └── database.test.ts        # Test di verifica configurazione database
│
├── integration/                # Test di integrazione API
│   └── api/
│       ├── auth.test.ts        # Test endpoint autenticazione
│       ├── users.test.ts       # Test endpoint utenti
│       ├── officers.test.ts    # Test endpoint officers
│       └── reports.test.ts     # Test endpoint reports
│
└── unit/                       # Unit test
    ├── controllers/            # Test dei controller
    │   ├── authController.test.ts
    │   ├── userController.test.ts
    │   └── officerController.test.ts
    │
    └── services/               # Test dei servizi
        ├── authService.test.ts
        └── mapperService.test.ts
    └── repositories/            # Test dei repository
        ├── user.repository.test.ts
        ├── officer.repository.test.ts
        └── report.repository.test.ts
```

## 🚀 Esecuzione dei Test

### Tutti i test

```bash
npm test
```

### Test in modalità watch

```bash
npm run test:watch
```

### Test con coverage

```bash
npm run test:coverage
```

### Test specifici

```bash
# Test di integrazione API
npm test -- test/integration/api/auth.test.ts
npm test -- test/integration/api/users.test.ts
npm test -- test/integration/api/officers.test.ts
npm test -- test/integration/api/reports.test.ts

# Unit test dei controller
npm test -- test/unit/controllers/authController.test.ts
npm test -- test/unit/controllers/userController.test.ts

# Unit test dei servizi
npm test -- test/unit/services/authService.test.ts
npm test -- test/unit/services/mapperService.test.ts

# Test setup database
npm test -- test/setup/database.test.ts
```

## 📋 Descrizione dei Test

### Test di Integrazione

I test di integrazione verificano il corretto funzionamento dell'intera API.

#### Auth API

- ✅ Login utente/officer
- ✅ Gestione errori autenticazione
- ✅ Validazione credenziali

#### Users API

- ✅ Creazione utente
- ✅ Validazione dati
- ✅ Logout

#### Officers API

- ✅ Gestione officer
- ✅ Review report
- ✅ Assegnazione report

#### Reports API

- ✅ Creazione report con foto
- ✅ Report anonimi
- ✅ Recupero report approvati

### Unit Test

Gli unit test verificano la logica dei singoli moduli.

#### Controllers

- authController, userController, officerController

#### Services

- authService (hash password, JWT)
- mapperService (conversioni DAO/DTO)

## 🔧 Configurazione

### Jest (`jest.config.js`)

- Test environment: node
- Coverage: src/ directory
- Path mapping per alias TypeScript

### Test Database (`test-datasource.ts`)

- SQLite in-memory
- Auto-sync delle entità
- Reset automatico tra test

## 📚 Risorse

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [TypeORM Testing](https://typeorm.io/#/testing)
