# Frontend

React frontend with Vite and TypeScript.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── layout/       # Header, ProgressBar, etc.
│   │   ├── stages/       # Stage 1-5 components
│   │   └── common/       # Reusable components
│   ├── data/             # TRIPOD constants
│   ├── services/         # API client
│   ├── stores/           # Zustand state management
│   ├── types/            # TypeScript types
│   ├── styles/           # CSS
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
└── vite.config.ts
```
