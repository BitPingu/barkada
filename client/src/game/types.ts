// TypeScript data structures shared by the client-side game code.

// Defines the synchronized data for an individual player.
export interface PlayerState {
  x: number
  y: number
  name: string
}

// Defines the shared state of a multiplayer room.
export interface MyRoomState {
  players: Map<string, PlayerState>
}

// Represents a chat message received from the server.
export interface ChatMessage {
  sessionId: string
  name: string
  text: string
}

// Represents an emoji message received from the server.
export interface EmojiMessage {
  sessionId: string
  name: string
  emoji: string
}
