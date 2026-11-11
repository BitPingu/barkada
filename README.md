# barkada

barkada is a browser-based multiplayer social game set in a shared virtual world where players can meet, chat, and explore together. The goal is to create an online space where players can interact, make connections, and enjoy a variety of social experiences.

The project draws inspiration from some of my favourite online games growing up, including Club Penguin, Woogi World, and the social games found on Facebook. It aims to capture the sense of community and nostalgia that made these experiences memorable while building something of its own.

## Features

- 2D browser-based virtual world
- Real-time multiplayer
- Chat system and emoji reactions
- And more...

## Tech Stack

- React
- TypeScript
- Phaser
- Vite
- Node.js
- Colyseus
- PostgreSQL (planned)

## Project Structure

```text
barkada/
├── client/   # React frontend and Phaser game
└── server/   # Colyseus multiplayer server
```

## Getting Started

### Prerequisites

- Node.js
- npm

### 1. Clone the repository

```bash
git clone https://github.com/BitPingu/barkada.git
cd barkada
```

### 2. Set up the server

```bash
cd server
npm install
npm run dev
```

### 3. Set up the client

In a separate terminal:

```bash
cd client
npm install
```

Create a `.env.local` file in the `client/` directory:

```env
VITE_SERVER_URL=http://localhost:2567
```

Start the development server:

```bash
npm run dev
```

Open the local URL provided by Vite in your browser.

The frontend runs through Vite, while the Colyseus server listens on `http://localhost:2567` by default.
