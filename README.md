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

### Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/BitPingu/barkada.git
cd barkada

npm install
npm install --prefix client
npm install --prefix server
```

### Running Locally

Start the multiplayer server in one terminal:

```bash
npm run server:dev
```

Start the client in another terminal:

```bash
npm run client:dev
```

Open the local URL provided by Vite, typically `http://localhost:5173`.

The Colyseus server runs on port `2567`.

### Accessing from Other Devices

barkada also supports access from other devices on the same local network.

1. Start the client and server using the commands above.
2. Find the **Network** URL displayed in the Vite terminal.
3. Open that URL on another device connected to the same Wi-Fi network.

The client automatically connects to the Colyseus server using the hostname in the browser's address bar. No additional environment configuration is required.

If you cannot connect, check that your firewall allows incoming connections on ports `5173` and `2567`.

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
