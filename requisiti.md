# Analisi requisiti e struttura dell'app

## Requisiti funzionali

### Gestione attività (Task)
- CRUD completo — creazione, modifica, eliminazione, assegnazione
- Status: `TODO | IN_PROGRESS | IN_REVIEW | DONE | CANCELLED`
- Priority: `LOW | MEDIUM | HIGH | URGENT`
- **`projectId` opzionale**: se omesso in creazione, il task finisce nel progetto inbox personale "Attività personali" (pattern analogo a "My Tasks" di Asana)
- Ogni task appartiene a **un solo progetto** (no multi-homing come in Asana)
- Filtri: per progetto, status, priority, assegnatario, date
- Vista cross-project ("I miei task") → `GET /tasks/search/advanced?assignedToMe=true`
- Dashboard home filtra per settimana o mese corrente (range selector)
- Vista "Le mie attività" con bucket temporali (scaduti / oggi / prossimi / dopo)
- Dipendenze tra task, tag, allegati, commenti (Stories), follower
- Drag & drop per riordinare (posizione calcolata con `calculatePosition`)

### Gestione progetti
- CRUD progetti con membri e ruoli
- Board con fasi e sezioni
- Tab "Bacheca" (kanban/lista) e "Impostazioni"
- Indicatori priority visivi

### Portfolio
- Raggruppamento di progetti in portfolio
- Vista aggregata stato avanzamento

### Team
- CRUD team con membri
- TeamOverview per singolo team

### Utenti e autenticazione
- Registrazione, login, logout via JWT (HTTP-only cookies)
- Refresh token automatico
- Profilo utente (jobTitle persistito)
- Multi-tenancy per organizzazione

### Notifiche
- Notifica assegnazione task (`createTaskAssignedBulk`)
- Notifiche in-app (modulo `notifications/`)

### Webhook e integrazioni
- Webhook configurabili per eventi
- Custom fields per estensibilità

---

## Requisiti non funzionali
- UI dark mode coerente con palette Vayana, ispirata ad Asana
- Build TypeScript zero errori (frontend + backend)
- Multi-tenancy: ogni query scoped all'organizzazione
- Deploy su VPS (`<indirizzo-server>`) via PM2
- Feature flag `VITE_USE_BACKEND` per sviluppo locale senza backend

---

## Stato implementazione MVP (2026-03-13)
- [x] Auth (login, register, refresh, redirect loop fix)
- [x] ProjectsPage → navigazione a `/projects/:id`
- [x] ProjectBoardPage → tab Bacheca + Impostazioni, priority indicators
- [x] TasksPage → TanStack Query, project selector, enum uppercase
- [x] MyActivitiesPage → bucket temporali stile Asana
- [x] PortfoliosPage → riscritta con TanStack Query (era sql.js)
- [x] ProfilePage → jobTitle persistito su backend
- [x] Backend: `projectId` opzionale + filtro `assignedToMe` in `GET /tasks`
- [x] Custom Fields, Attachments, Stories, Tags, Sections, Followers
- [x] Webhooks, Notifications, Task Dependencies, Task Views
- [ ] Calendario (previsto)
- [ ] Ricerca globale (prevista)

---

## Aggiornamenti (2026-03-17)
- **Onboarding**: endpoint `PATCH /users/me/onboarding` per salvare nome/cognome e nome organizzazione.
- **User profile**: aggiunto `jobTitle` nel profilo utente (persistito backend).
- **Auth**: se un utente non ha organization membership, viene creata una organizzazione personale automaticamente al login/refresh.
- **Tasks**: `projectId` opzionale in creazione → task finisce in progetto inbox personale "Attività personali".
- **Ricerca utenti**: `/users/search` accetta `q` e cerca per nome/cognome/email.
