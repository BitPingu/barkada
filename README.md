# Barkada

A browser-based multiplayer social game where players can explore a shared virtual world, interact with others, and connect through real-time gameplay.

Inspired by some of my favourite online Flash games growing up, including Club Penguin, Woogi World, and Facebook social games.

## Tech Stack

- React
- TypeScript
- Phaser
- Vite
- Node.js
- Colyseus
- PostgreSQL (planned)

## Features

- 2D browser-based game environment
- Point-and-click player movement
- Multiplayer room connections
- Synchronized player state

## Project Structure

```text
barkada/
├── client/   # React + Phaser frontend
├── server/   # Node.js + Colyseus backend
└── README.md
```

## Development

### Frontend

```bash
cd client
npm install
npm run dev
```

### Backend

```bash
cd server
npm install
npm run start
```

The frontend runs through Vite, while the Colyseus server listens on `http://localhost:2567` by default.
