import { Room, Client, CloseCode } from 'colyseus'
import { MyRoomState } from './schema/MyRoomState.js'
import { Player } from './schema/Player.js'

export class MyRoom extends Room<{ state: MyRoomState }> {
  // Maximum number of players allowed in one room.
  maxClients = 4

  // Initialize the synchronized room state.
  state = new MyRoomState()

  onCreate(options: any) {
    console.log('Room created:', this.roomId)
  }

  // When a player joins.
  onJoin(client: Client, options: any) {
    // Create a player entry using the client's session ID.
    const player = new Player()

    // Assign the player's initial position.
    player.x = 480
    player.y = 320

    // Give the player a temporary display name.
    player.name = `Guest ${this.state.players.size + 1}`

    // Add the player to the synchronized room state.
    this.state.players.set(client.sessionId, player)

    console.log(client.sessionId, 'joined!')
  }

  // When a player leaves.
  onLeave(client: Client, code: CloseCode) {
    // Remove the player from the synchronized room state.
    this.state.players.delete(client.sessionId)

    console.log(client.sessionId, 'left!', code)
  }

  onDispose() {
    console.log('Room', this.roomId, 'disposing...')
  }
}
