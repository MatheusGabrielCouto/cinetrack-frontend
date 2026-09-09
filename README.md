# CineTrack Frontend

Next.js app for discovering movies/TV via TMDB and tracking them through the CineTrack API.

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4
- TMDB (direct from the browser)
- CineTrack REST API (JWT)

## Pages

| Route | Description |
|-------|-------------|
| `/` | Marketing landing |
| `/login` | Sign in |
| `/register` | Create account |
| `/discover` | TMDB search + trending |
| `/library` | Personal library with filters |
| `/stats` | Dashboard stats |
| `/title/movie/:id` | Movie detail + tracking panel |
| `/title/tv/:id` | TV detail + tracking panel |

## Setup

### 1. Install

```bash
cd cinetrack-frontend
pnpm install
```

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_key
NEXT_PUBLIC_TMDB_IMAGE_BASE=https://image.tmdb.org/t/p
```

Get a TMDB key at https://www.themoviedb.org/settings/api

### 3. Run backend

Make sure `cinetrack-backend` is running on port 3000 with CORS allowing `http://localhost:3001`.

### 4. Start frontend

```bash
pnpm dev
```

Open http://localhost:3001

Demo user (from backend seed):

- Email: `demo@cinetrack.app`
- Password: `password123`

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev server on port 3001 |
| `pnpm build` | Production build |
| `pnpm start` | Serve production build |
| `pnpm lint` | ESLint |

## Architecture notes

- Auth tokens live in `localStorage` and refresh automatically on 401
- TMDB is called from the client; the backend never stores movie metadata
- Library/stats always go through the NestJS API
