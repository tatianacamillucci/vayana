# Architettura Vayana

## Overview
Project management tool ispirato ad Asana — gestione attività, progetti, team, portfolio.
UI dark mode con palette personalizzata Vayana.

---

## Stack tecnico

### Frontend (`src/`)
- **Framework**: React 18 + TypeScript + Vite
- **Stili**: TailwindCSS v4 (dark mode)
- **Routing**: React Router v7
- **Data fetching**: TanStack Query v5 (hooks in `src/lib/hooks/`)
- **Feature flag**: `VITE_USE_BACKEND` (`.env`) — `true` = backend reale, `false` = sql.js fallback

### Backend (`vayana-api/src/`)
- **Framework**: NestJS 11 + TypeScript
- **ORM**: Prisma 7
- **DB**: PostgreSQL
- **Auth**: JWT via HTTP-only cookies
- **Multi-tenancy**: `TenantGuard` → CLS → `PrismaService.forTenant()` inietta `organizationId`
- **Documentazione API**: Swagger (BearerAuth attivo)

---

## Modello Task — confronto con Asana

### Asana
- Un task esiste sempre in almeno una "section" di un progetto **oppure** in "My Tasks" (area personale privata, non è un progetto)
- **Multi-homing**: un task può appartenere a più progetti contemporaneamente
- `assignee` è opzionale; "My Tasks" mostra i task dove sei assignee
- Dashboard home filtra per utente corrente senza bisogno di projectId

### Vayana (attuale)
- Un task ha sempre **un solo** `projectId` (no multi-homing)
- `projectId` opzionale in creazione: se omesso, il task finisce in **"Attività personali"** (progetto inbox auto-creato per utente), esattamente come "My Tasks" di Asana
- Il DTO di creazione accetta `projectId` opzionale; il DTO di query (`QueryTasksDto`) invece **lo richiede** (limitazione: non usabile per vista cross-project)
- Vista cross-project: `GET /tasks/search/advanced?assignedToMe=true` (usa `SearchTasksDto`, projectId opzionale)
- Dashboard usa `useMyTasks()` → `GET /tasks/search/advanced?assignedToMe=true`

### Differenze rispetto ad Asana
| Feature | Asana | Vayana |
|---|---|---|
| Multi-homing | ✅ | ❌ (un solo projectId) |
| Task senza progetto | "My Tasks" (area privata) | "Attività personali" (progetto inbox) |
| Dashboard personale | filtro per assignee, no projectId | `searchAdvanced?assignedToMe=true` |
| Progetto obbligatorio | No | No (auto-inbox) |

---

## Struttura frontend

```
src/
  pages/           # Pagine principali
  lib/
    hooks/         # TanStack Query hooks (pattern: useProjects.ts)
  components/      # Componenti UI riusabili
```

### Pagine implementate
| Pagina | Route | Note |
|---|---|---|
| LoginPage | `/login` | Auth JWT |
| RegisterPage | `/register` | |
| Dashboard (Home) | `/` | My tasks range settimana/mese, useMyTasks() |
| ProjectsPage | `/projects` | Lista progetti |
| ProjectBoardPage | `/projects/:id` | Tab Bacheca + Impostazioni |
| TasksPage | `/tasks` | Cross-project, filtri status/priority |
| MyActivitiesPage | `/my-activities` | Bucket: scaduti/oggi/prossimi/dopo |
| PortfoliosPage | `/portfolios` | |
| TeamsPage | `/teams` | |
| TeamOverviewPage | `/teams/:id` | |
| ProfilePage | `/profile` | jobTitle persistito su backend |

### Hook TanStack Query principali
| Hook | Endpoint | Note |
|---|---|---|
| `useMyTasks()` | `GET /tasks/search/advanced?assignedToMe=true` | Dashboard home |
| `useTasks(projectId)` | `GET /tasks?projectId=...` | Board progetto |
| `useProjects()` | `GET /projects` | Lista progetti |
| `useSearchTasks(params)` | `GET /tasks/search/advanced` | Ricerca globale |

---

## Struttura backend

```
vayana-api/src/
  auth/            # Login, register, refresh token
  users/           # Profilo utente
  projects/        # CRUD progetti
  tasks/           # CRUD task, move, reorder, filtri avanzati
  phases/          # Fasi di progetto
  sections/        # Sezioni dentro fasi
  teams/           # Team
  portfolios/      # Portfolio
  attachments/     # Upload file (Multer)
  stories/         # Commenti + activity log
  tags/            # Tag
  followers/       # Follower su task/progetti
  notifications/   # Notifiche
  custom-fields/   # Campi personalizzati
  task-dependencies/ # Dipendenze tra task
  task-views/      # Viste salvate
  webhooks/        # Webhook esterni
  batch/           # Operazioni batch
  tenant/          # Multi-tenancy (CLS)
  prisma/          # PrismaService
  common/          # Guard, decorator, utility
```

### Endpoint task rilevanti
| Metodo | URL | DTO | Note |
|---|---|---|---|
| `GET` | `/tasks` | `QueryTasksDto` | `projectId` **required** — solo uso nel board |
| `GET` | `/tasks/search/advanced` | `SearchTasksDto` | tutto opzionale; supporta `assignedToMe`, `dueFrom/dueTo` |
| `POST` | `/tasks` | `CreateTaskDto` | `projectId` opzionale → auto-inbox |
| `PATCH` | `/tasks/:id` | `UpdateTaskDto` | |
| `POST` | `/tasks/:id/move` | `MoveTaskDto` | cambio fase/status con reorder |

---

## Multi-tenancy
- Ogni request passa per `TenantGuard` che legge `organizationId` dal JWT
- Il context CLS propaga `organizationId` a `PrismaService.forTenant()`
- Tutte le query sono scoped all'organizzazione corrente

---

## Deploy

### Infrastruttura
- **Server**: VPS `<indirizzo-server>` (DigitalOcean / Linux)
- **Process manager**: PM2 (`vayana-api/ecosystem.config.js`)
- **Frontend**: servito come static files da Nginx (o da Express nel processo PM2)
- **Backend**: NestJS su porta configurata in PM2

### Pipeline CI/CD (GitHub Actions)
- File: `.github/workflows/deploy.yml`
- Trigger: push su branch `master`
- Runner: `ubuntu-latest`
- Action: `appleboy/ssh-action@v1.0.3` — si connette via SSH con chiave privata in `SSH_PRIVATE_KEY` secret
- Script eseguito sul server: `/home/vayana/vayana/deploy.sh`

### Script di deploy (`deploy.sh`) — step dettagliati
```bash
# 1. Pull del codice
git config --global --add safe.directory /home/vayana/vayana
cd /home/vayana/vayana
git fetch origin
git reset --hard origin/master

# 2. Build backend
cd vayana-api
npm ci                      # installa dipendenze (ci = clean install)
npx prisma generate         # genera Prisma client
npm run build               # compila NestJS → dist/
npx prisma migrate deploy   # esegue migrazioni DB pendenti

# 3. Build frontend
cd /home/vayana/vayana
npm ci
npm run build               # Vite → dist/

# 4. Riavvio API
pm2 restart vayana-api
```

### Variabili d'ambiente richieste sul server
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — chiave JWT
- `JWT_REFRESH_SECRET` — chiave refresh token
- `PORT` — porta NestJS (default in ecosystem.config.js)

### Segreti GitHub Actions
- `SSH_PRIVATE_KEY` â€” chiave privata SSH per accedere al server come `root`

---

## Update auth & onboarding (2026-03-17)
- Se un utente non ha organization membership, al login/refresh viene creata una organization personale (inbox di default).
- Nuovo endpoint: `PATCH /users/me/onboarding` per salvare nome/cognome e nome organizzazione.
- Profilo utente esteso con `jobTitle`.
