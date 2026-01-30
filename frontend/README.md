# Frontend

React + Vite + TypeScript. Tailwind for styling; Zustand for state; centralized style constants in `src/styles/`.

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

## Structure

```
src/
├── components/   # layout, pages, stages (Stage1–5), ui primitives, common
├── constants/    # app constants (e.g. tripod)
├── contexts/     # Auth, Sidebar
├── hooks/        # useOptions, etc.
├── services/     # api.ts (Axios client)
├── stores/       # passageStore (Zustand)
├── styles/       # main.css + centralized style constants (cards, badges, states, layout)
├── types/        # shared TypeScript types
├── utils/        # cn, etc.
├── App.tsx
└── main.tsx
```
