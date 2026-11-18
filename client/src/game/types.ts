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

// Represents the shared data for a chat history message.
export interface ChatHistoryMessage {
  type: 'chat' | 'emoji' | 'join' | 'leave'
  sessionId: string
  name: string
  text: string
  timestamp: number
}

// Represents a live chat message received from the server.
export interface ChatMessage extends ChatHistoryMessage {
  type: 'chat'
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
