import { Room, Client, CloseCode } from 'colyseus'
import { MyRoomState } from './schema/MyRoomState.js'
import { Player } from './schema/Player.js'

// Emojis players are allowed to send.
const ALLOWED_EMOJIS = [
  '😀',
  '😂',
  '😭',
  '😮',
  '😡',
  '🥺',
  '❤️',
  '🔥',
  '🎶',
  '👍',
  '👋',
  '🙏',
]

export class MyRoom extends Room<{ state: MyRoomState }> {
  // Maximum number of players allowed in one room.
  maxClients = 20

  // Initialize the synchronized room state.
  state = new MyRoomState()

  // Tracks the last time each player sent a chat message.
  private lastChatMessage = new Map<string, number>()

  onCreate(options: any) {
    console.log('Room created:', this.roomId)

    // Handle player movement requests.
    this.onMessage('move', (client, message: { x: number; y: number }) => {
      // Find the player associated with the client.
      const player = this.state.players.get(client.sessionId)

      // Ignore requests from clients without a player entry.
      if (!player) return

      // Validate the requested coordinates.
      if (
        typeof message.x !== 'number' ||
        typeof message.y !== 'number' ||
        !Number.isFinite(message.x) ||
        !Number.isFinite(message.y)
      ) {
        return
      }

      // Clamp coordinates to the game boundaries.
      player.x = Math.max(25, Math.min(935, message.x))
      player.y = Math.max(170, Math.min(520, message.y))
    })

    // Handle incoming chat messages.
    this.onMessage('chat', (client, message: { text: string }) => {
      // Remove leading and trailing whitespace.
      const text = message.text?.trim()

      // Reject empty messages and messages longer than 100 characters.
      if (!text || text.length > 100) {
        return
      }

      // Get the sender's player information.
      const player = this.state.players.get(client.sessionId)

      // Ignore messages from clients that aren't in the room.
      if (!player) {
        return
      }

      // Enforce a 0.5-second cooldown between chat messages.
      const now = Date.now()
      const lastMessage = this.lastChatMessage.get(client.sessionId) ?? 0

      if (now - lastMessage < 500) {
        return
      }

      // Update the player's last message timestamp.
      this.lastChatMessage.set(client.sessionId, now)

      // Broadcast the message to all players in the room.
      this.broadcast('chat', {
        sessionId: client.sessionId,
        name: player.name,
        text,
      })
    })

    // Handle incoming emoji selections.
    this.onMessage('emoji', (client, message: { emoji: string }) => {
      // Reject emojis that aren't in the allowed list.
      if (!ALLOWED_EMOJIS.includes(message.emoji)) {
        return
      }

      // Get the sender's player information.
      const player = this.state.players.get(client.sessionId)

      // Ignore messages from clients that aren't in the room.
      if (!player) {
        return
      }

      // Enforce the same 500 ms cooldown used for chat messages.
      const now = Date.now()
      const lastMessage = this.lastChatMessage.get(client.sessionId) ?? 0

      if (now - lastMessage < 500) {
        return
      }

      // Update the player's last message timestamp.
      this.lastChatMessage.set(client.sessionId, now)

      // Broadcast the emoji to all players.
      this.broadcast('emoji', {
        sessionId: client.sessionId,
        name: player.name,
        emoji: message.emoji,
      })
    })
  }

  // When a player joins.
  onJoin(client: Client, options: { characterType?: string }) {
    // Create a player entry using the client's session ID.
    const player = new Player()

    // Assign the player's initial position.
    player.x = 480
    player.y = 320

    // Give the player a temporary display name.
    player.name = `Guest ${this.state.players.size + 1}`

    // Assign the selected character type.
    player.characterType = options.characterType === 'girl' ? 'girl' : 'boy'

    // Add the player to the synchronized room state.
    this.state.players.set(client.sessionId, player)

    console.log(client.sessionId, 'joined!')
  }

  // When a player unexpectedly disconnects.
  onDrop(client: Client, code: CloseCode) {
    console.log(client.sessionId, 'dropped connection!', code)

    // Allow the player 30 seconds to reconnect.
    this.allowReconnection(client, 30)
  }

  // When a player leaves.
  onLeave(client: Client, code: CloseCode) {
    // Remove the player from the synchronized room state.
    this.state.players.delete(client.sessionId)

    // Remove the player's chat cooldown when they leave.
    this.lastChatMessage.delete(client.sessionId)

    console.log(client.sessionId, 'left!', code)
  }

  onDispose() {
    console.log('Room', this.roomId, 'disposing...')
  }
}
