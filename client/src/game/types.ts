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
export interface GameRoomState {
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

// Represents a notification received from the server.
export interface NotificationMessage {
  message: string
  startAt: number
  expiresAt: number
  serverNow: number
}

// Represents a notification displayed in the game interface.
export interface Notification {
  id: number
  message: string
}
