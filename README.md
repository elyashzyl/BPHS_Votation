# SBO Election System — Baguio Patriotic High School

A Vue 3 single-page application for managing school elections at Baguio Patriotic High School. Supports **SBO**, **Classroom**, and **Club** officer elections with grade/section/club-restricted voting, an admin panel, and a trained FAQ chatbot.

## Features

- **Three election types** — SBO (school-wide), Classroom (per grade & section), Club (per club)
- **Grade & section filtering** — Classroom candidates and voters restricted to their own section
- **Club voting** — Voters select their club; candidates filtered accordingly
- **Admin panel** — Dashboard, positions, candidates, voting logs, results, reports, settings
- **Per-type activation toggles** — Independently enable/disable SBO, Classroom, and Club elections
- **FAQ chatbot** — Keyword-trained bot answers common questions; "Report a Problem" tab logs issues to the admin panel
- **Dark/light theme** — Persistent toggle with system preference detection
- **Year-based data isolation** — Each school year stores its own positions, candidates, voters, votes, and settings
- **Device-based voting guard** — One vote per device per election type
- **PDF-ready print output** — Formal bond-paper style with per-election-type and per-club pages
- **Mobile responsive** — Bottom navigation bar, compact tables, fluid layouts
- **IndexedDB persistence** — Data survives page refresh; localStorage fallback

## Tech Stack

- **Vue 3** (Composition API, reactive state)
- **Vue Router** (client-side routing)
- **Vite** (build tool)
- **Chart.js + vue-chartjs** (dashboard area chart)
- **IndexedDB** (primary data store)
- **localStorage** (fallback store + theme persistence)

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Usage

### Student Voting
1. Open the app — landing page shows four cards: **SBO**, **Classroom**, **Club**, **Admin**
2. Click an election type (must be enabled in Settings)
3. Enter your name and select your grade & section (and club if Club election)
4. Vote for candidates in each position
5. Review and confirm your ballot
6. Done — one vote per device per election type

### Admin Panel
1. Click **Admin** on the landing page (password defaults to `admin`)
2. Navigate via sidebar (desktop) or bottom bar (mobile)
3. **Settings** — Set school year, admin password, toggle election types, manage grades/sections/clubs
4. **Positions** — Add/edit positions per election type
5. **Candidates** — Add/edit candidates with grade/section/club filters
6. **Dashboard** — View vote counts, recent reports, votes-over-time chart
7. **Results** — View per-type and per-club results; PDF export via browser print
8. **Logs** — View and manage voter records
9. **Reports** — View, reply, resolve, and bulk-manage student reports from the chatbot

## Project Structure

```
src/
├── assets/           # Static assets
├── components/       # Vue components
│   ├── base/         # Custom UI primitives (dropdown, toggle)
│   ├── Admin*.vue    # Admin panel sub-views
│   ├── ChatBot.vue   # FAQ chatbot with report mode
│   └── ModalDialog.vue
├── db/               # IndexedDB + localStorage persistence layer
├── router/           # Vue Router configuration
├── store/            # Reactive state store (data, auth, theme)
├── utils/            # Helper utilities
├── views/            # Page-level view components
│   ├── HomeView.vue
│   ├── StudentLoginView.vue
│   ├── VotingBoothView.vue
│   ├── ConfirmationView.vue
│   ├── SuccessView.vue
│   ├── AdminLoginView.vue
│   └── AdminPanelView.vue
├── App.vue
└── main.js
```

## Data Persistence

Data is stored in the browser's **IndexedDB** (with localStorage fallback). This means:
- All data is local to each device — **there is no server**.
- Data is scoped by school year. Use **Settings** to switch or create years.
- To share data across devices, data must be manually re-entered or a backend server added.

## Notes

- The app uses `createWebHistory()` — a production server must be configured to fall back to `index.html` for client-side routing.
- Admin password is set in Settings (default: `admin`).
- Classroom positions are shared across all grades; candidates are filtered by grade/section.
- Clubs are configured as a comma-separated list in Settings.
