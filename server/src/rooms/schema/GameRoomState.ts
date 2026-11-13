import { schema, t, type SchemaType } from '@colyseus/schema'
import { Player } from './Player.js'

// Defines the shared state of a multiplayer room.
export const GameRoomState = schema({
  // Stores all players currently in the room.
  // Each player will be stored using their Colyseus session ID as the key.
  players: t.map(Player), // Declare a synchronized map of Player objects.
})

export type GameRoomState = SchemaType<typeof GameRoomState>
