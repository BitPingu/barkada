import { Room, Client, CloseCode, ServerError } from 'colyseus'
import { GameRoomState } from './schema/GameRoomState.js'
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

export class GameRoom extends Room<{ state: GameRoomState }> {
  // Maximum number of players allowed in one room.
  maxClients = 20

  // Initialize the synchronized room state.
  state = new GameRoomState()

  // Tracks the last time each player sent a chat message.
  private lastChatMessage = new Map<string, number>()

  // Broadcasts a notification with a synchronized display schedule.
  private broadcastNotification(message: string) {
    const now = Date.now()

    this.broadcast('notification', {
      message,
      startAt: now,
      expiresAt: now + 3000,
      serverNow: now,
    })
  }

  onCreate() {
    // Keep the room available when everyone leaves.
    this.autoDispose = false

    console.log('Room created:', this.roomId)

    // Respond to client clock synchronization requests.
    this.onMessage('time-sync', (client, message: { clientSentAt: number }) => {
      // Reject invalid timestamps.
      if (
        !message ||
        typeof message.clientSentAt !== 'number' ||
        !Number.isFinite(message.clientSentAt)
      ) {
        return
      }

      // Return the original client timestamp and current server time.
      client.send('time-sync', {
        clientSentAt: message.clientSentAt,
        serverNow: Date.now(),
      })
    })

    // Handle player movement requests.
    this.onMessage('move', (client, message: { x: number; y: number }) => {
      // Find the player associated with the client.
      const player = this.state.players.get(client.sessionId)

      // Ignore requests from clients without a player entry.
      if (!player) return

      // Validate the requested coordinates.
      if (
        !message ||
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
      const text = typeof message?.text === 'string' ? message.text.trim() : ''

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

      // Calculate when the chat bubble should expire.
      const displayDuration = Math.min(
        12000,
        Math.max(4000, 3000 + text.length * 60),
      )

      // Broadcast the message with its expiration timestamp.
      this.broadcast('chat', {
        sessionId: client.sessionId,
        name: player.name,
        text,
        expiresAt: now + displayDuration,
      })
    })

    // Handle incoming emoji selections.
    this.onMessage('emoji', (client, message: { emoji: string }) => {
      // Reject emojis that aren't in the allowed list.
      if (
        typeof message?.emoji !== 'string' ||
        !ALLOWED_EMOJIS.includes(message.emoji)
      ) {
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

      // Broadcast the emoji with its expiration timestamp.
      this.broadcast('emoji', {
        sessionId: client.sessionId,
        name: player.name,
        emoji: message.emoji,
        expiresAt: now + 5000,
      })
    })
  }

  // When a player joins.
  onJoin(
    client: Client,
    options: {
      characterType?: string
      displayName?: string
    },
  ) {
    // Validate the player's display name.
    if (typeof options.displayName !== 'string') {
      throw new ServerError(400, 'A display name is required.')
    }

    const displayName = options.displayName.trim()

    if (!displayName) {
      throw new ServerError(400, 'A display name is required.')
    }

    if (displayName.length > 16) {
      throw new ServerError(400, 'Display name cannot exceed 16 characters.')
    }

    // Create a player entry using the client's session ID.
    const player = new Player()

    // Assign the player's initial position.
    player.x = 480
    player.y = 320

    // Set the player's display name.
    player.name = displayName

    // Assign the selected character type.
    player.characterType = options.characterType === 'girl' ? 'girl' : 'boy'

    // Add the player to the synchronized room state.
    this.state.players.set(client.sessionId, player)

    // Notify everyone that this player joined.
    this.broadcastNotification(`${displayName} joined the game!`)

    console.log(client.sessionId, 'joined!')
  }

  // When a player unexpectedly disconnects.
  onDrop(client: Client, code: CloseCode) {
    console.log(
      new Date().toISOString(),
      client.sessionId,
      'dropped connection!',
      code,
    )

    // Allow the player 60 seconds to reconnect.
    this.allowReconnection(client, 60)
      .then((reconnectedClient) => {
        console.log(
          new Date().toISOString(),
          reconnectedClient.sessionId,
          'reconnected successfully!',
        )
      })
      .catch(() => {
        console.log(
          new Date().toISOString(),
          client.sessionId,
          'failed to reconnect.',
        )
      })
  }

  // When a player leaves.
  onLeave(client: Client, code: CloseCode) {
    // Get the player's information before removing them.
    const player = this.state.players.get(client.sessionId)

    // Notify everyone that this player left.
    if (player) {
      this.broadcastNotification(`${player.name} left the game!`)
    }

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
