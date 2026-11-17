# barkada

barkada is a browser-based multiplayer social game set in a shared virtual world where players can meet, chat, and explore together. The goal is to create an online space where players can interact, make connections, and enjoy a variety of social experiences.

The project draws inspiration from some of my favourite online games growing up, including Club Penguin, Woogi World, and the social games found on Facebook. It aims to capture the sense of community and nostalgia that made these experiences memorable while building something of its own.

## Features

- 2D browser-based virtual world
- Real-time multiplayer and player synchronization
- Point-and-click movement
- Chat system with speech bubbles and chat history
- Emoji reactions
- Player join and leave notifications
- Automatic session reconnection

## Tech Stack

- React
- TypeScript
- Phaser
- Vite
- Node.js
- Colyseus

## Project Structure

```text
barkada/
├── client/   # React frontend and Phaser game
└── server/   # Colyseus multiplayer server
```

## Getting Started

### Prerequisites

- Node.js (22 or later)
- npm

### 1. Clone the repository

```bash
git clone https://github.com/BitPingu/barkada.git
cd barkada
```

### 2. Install dependencies

From the repository root:

```bash
npm install
npm install --prefix client
npm install --prefix server
```

### 3. Configure the client

Create a `.env.local` file in the `client/` directory:

```env
VITE_SERVER_URL=http://localhost:2567
```

### 4. Start the server

From the repository root:

```bash
npm run server:dev
```

### 5. Start the client

In a separate terminal, from the repository root:

```bash
npm run client:dev
```

Open the local URL provided by Vite in your browser.

The frontend runs through Vite, while the Colyseus server listens on `http://localhost:2567` by default.

## Scripts

All commands can be run from the repository root using the root `package.json`.

| Command                   | Description                                             |
| ------------------------- | ------------------------------------------------------- |
| `npm run client:dev`      | Starts the Vite development server                      |
| `npm run client:lint`     | Runs ESLint on the client                               |
| `npm run client:build`    | Builds the client for production                        |
| `npm run client:preview`  | Previews the production client build                    |
| `npm run server:dev`      | Starts the Colyseus development server                  |
| `npm run server:test`     | Runs server tests                                       |
| `npm run server:build`    | Builds the server for production                        |
| `npm run server:start`    | Starts the production server                            |
| `npm run server:loadtest` | Runs the multiplayer load test                          |
| `npm run format`          | Formats the project using Prettier                      |
| `npm run format:check`    | Checks project formatting                               |
| `npm run lint`            | Runs client linting                                     |
| `npm run check`           | Runs all formatting, linting, testing, and build checks |

### Recommended Workflow

Run `npm run format` to format files when needed.

Run `npm run check` before committing changes to verify formatting, linting, tests, and production builds.
