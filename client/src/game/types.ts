import type { MapSchema } from '@colyseus/schema'

// TypeScript data structures shared by the client-side game code.

// Defines the synchronized data for an individual player.
export interface PlayerState {
  x: number
  y: number
  name: string
  characterType: 'boy' | 'girl'
}

// Defines the shared state of a multiplayer room.
export interface MyRoomState {
  players: MapSchema<PlayerState>
}

// Represents a chat message received from the server.
export interface ChatMessage {
  sessionId: string
  name: string
  text: string
  expiresAt: number
}

// Represents an emoji message received from the server.
export interface EmojiMessage {
  sessionId: string
  name: string
  emoji: string
  expiresAt: number
}
