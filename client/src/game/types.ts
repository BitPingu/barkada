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
