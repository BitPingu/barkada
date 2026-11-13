# Barkada Server

The multiplayer server for Barkada, a browser-based social game inspired by Club Penguin. Built with [Colyseus](https://colyseus.io/).

## Getting Started

Install dependencies:

\`\`\`bash
npm install
\`\`\`

Start the development server:

\`\`\`bash
npm run dev
\`\`\`

The server runs at `http://localhost:2567`.

During development, the Colyseus Playground is available at `/`, and the server monitor is available at `/monitor`.

## Project Structure

\`\`\`
server/
├── src/
│ ├── rooms/
│ │ ├── schema/
│ │ │ ├── GameRoomState.ts
│ │ │ └── Player.ts
│ │ └── GameRoom.ts
│ ├── app.config.ts
│ └── index.ts
├── test/
│ └── GameRoom.test.ts
└── package.json
\`\`\`

## Scripts

| Command            | Description                                          |
| ------------------ | ---------------------------------------------------- |
| `npm run dev`      | Start the development server with automatic restarts |
| `npm start`        | Start the compiled server                            |
| `npm test`         | Run the test suite                                   |
| `npm run build`    | Compile TypeScript into `build/`                     |
| `npm run clean`    | Remove the compiled build                            |
| `npm run loadtest` | Run a load test with two simulated clients           |

## Technologies

- [Colyseus](https://colyseus.io/) – Multiplayer game server framework
- [TypeScript](https://www.typescriptlang.org/) – Server-side development
- [Mocha](https://mochajs.org/) – Testing
