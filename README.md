# Pokemon Battle Simulator

A deployable React + TypeScript app that pulls Pokemon data from [PokeAPI](https://pokeapi.co/) and uses fetched stats to simulate a turn-based battle.

## Tech Stack

- Vite
- React
- TypeScript
- PokeAPI browser client

## Getting Started

```bash
npm install
npm run dev
```

## Scripts

```bash
npm run dev      # Start local development server
npm run build    # Type-check and build production assets
npm run preview  # Preview the production build locally
npm run lint     # Run ESLint
```

## Deployment

This app builds to static assets in `dist/`, so it can be deployed on Netlify, Vercel, Cloudflare Pages, GitHub Pages, or any static host.

## Battle Model

The first implementation uses PokeAPI base stats:

- HP initializes each fighter's health.
- Speed decides who attacks first.
- Attack and special attack drive damage.
- Defense and special defense reduce damage.
- A deterministic variance keeps matchups from feeling flat while making repeated simulations reproducible.
