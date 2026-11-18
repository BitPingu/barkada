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

// Defines the structure of a stored chat history message.
export type ChatHistoryMessage = {
  type: 'chat' | 'emoji' | 'join' | 'leave'
  sessionId: string
  name: string
  text: string
  timestamp: number
}

// Maximum number of entries retained in room history.
const MAX_CHAT_HISTORY = 100

// Time before an inactivity warning is sent.
const INACTIVITY_WARNING_MS = 2 * 60 * 1000

// Time before an inactive player is disconnected.
const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000

// Frequency of inactivity checks.
const INACTIVITY_CHECK_INTERVAL_MS = 1000

// Custom close code for inactivity disconnections.
const INACTIVITY_DISCONNECT_CODE = 4020

export class GameRoom extends Room<{ state: GameRoomState }> {
  // Maximum number of players allowed in one room.
  maxClients = 20

  // Initialize the synchronized room state.
  state = new GameRoomState()

  // Tracks the last time each player sent a chat message.
  private lastChatMessage = new Map<string, number>()

  // Tracks the last recorded activity time for each player.
  private lastActivity = new Map<string, number>()

  // Tracks players who have already received an inactivity warning.
  private warnedInactive = new Set<string>()

  // Tracks pending reconnection reservations so they can be rejected when needed.
  private reconnectionRejectors = new Map<string, () => void>()

  // Stores recent chat messages for the current room session.
  private chatHistory: ChatHistoryMessage[] = []

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

  // Add a message to room history and broadcast the update.
  private addChatHistoryMessage(
    message: ChatHistoryMessage,
    excludedClient?: Client,
  ) {
    this.chatHistory.push(message)

    // Remove the oldest messages when the history limit is exceeded.
    if (this.chatHistory.length > MAX_CHAT_HISTORY) {
      this.chatHistory.shift()
    }

    // Notify other players about the history update.
    this.broadcast(
      'chat-history-update',
      message,
      excludedClient ? { except: excludedClient } : undefined,
    )
  }

  // Reset a player's inactivity timer.
  private resetInactivityTimer(client: Client) {
    const sessionId = client.sessionId

    // Ignore clients that don't have an active player entry.
    if (!this.state.players.has(sessionId)) {
      return
    }

    // Reset the player's inactivity timestamp.
    this.lastActivity.set(sessionId, Date.now())
  }

  // Get a valid chat sender and update their message cooldown.
  private getChatSender(
    client: Client,
    now: number,
  ): InstanceType<typeof Player> | undefined {
    const player = this.state.players.get(client.sessionId)

    // Ignore clients without a player entry.
    if (!player) {
      return
    }

    // Enforce a 500 ms cooldown between chat messages and emojis.
    const lastMessage = this.lastChatMessage.get(client.sessionId) ?? 0

    if (now - lastMessage < 500) {
      return
    }

    // Update the player's activity and last message timestamp.
    this.resetInactivityTimer(client)
    this.lastChatMessage.set(client.sessionId, now)

    return player
  }

  onCreate() {
    // Keep the room available when everyone leaves.
    this.autoDispose = false

    console.log('Room created:', this.roomId)

    // Check connected players and pending reconnection reservations for inactivity.
    this.clock.setInterval(() => {
      const now = Date.now()

      // Check every player with a recorded activity timestamp.
      for (const [sessionId, lastActivityAt] of this.lastActivity) {
        const inactiveDuration = now - lastActivityAt

        // Find the player's currently connected client, if one exists.
        const client = this.clients.find(
          (connectedClient) => connectedClient.sessionId === sessionId,
        )

        // Disconnect players who exceed the inactivity timeout.
        if (inactiveDuration >= INACTIVITY_TIMEOUT_MS) {
          // Reject a pending reconnection reservation immediately.
          const rejectReconnection = this.reconnectionRejectors.get(sessionId)

          if (rejectReconnection) {
            this.reconnectionRejectors.delete(sessionId)
            rejectReconnection()
          } else if (client) {
            // Disconnect players who are still connected.
            client.leave(INACTIVITY_DISCONNECT_CODE)
          }

          continue
        }

        // Warn connected players once they reach the warning threshold.
        if (
          client &&
          inactiveDuration >= INACTIVITY_WARNING_MS &&
          !this.warnedInactive.has(sessionId)
        ) {
          this.warnedInactive.add(sessionId)
          client.send('inactivity-warning')
        }
      }
    }, INACTIVITY_CHECK_INTERVAL_MS)

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

      // Reset the player's inactivity timer after valid movement.
      this.resetInactivityTimer(client)

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

      // Get the sender's player information and enforce the message cooldown.
      const now = Date.now()
      const player = this.getChatSender(client, now)

      // Ignore messages from clients that aren't eligible to send.
      if (!player) {
        return
      }

      // Calculate when the chat bubble should expire.
      const displayDuration = Math.min(
        12000,
        Math.max(4000, 3000 + text.length * 60),
      )

      // Create the chat message with its timestamp.
      const chatMessage: ChatHistoryMessage = {
        type: 'chat',
        sessionId: client.sessionId,
        name: player.name,
        text,
        timestamp: now,
      }

      // Add the message to room history.
      this.addChatHistoryMessage(chatMessage)

      // Broadcast the message with its expiration timestamp.
      this.broadcast('chat', {
        ...chatMessage,
        expiresAt: now + displayDuration,
      })
    })

    // Handle requests for the room's chat history.
    this.onMessage('chat-history-request', (client) => {
      // Ignore requests from clients without a player entry.
      if (!this.state.players.has(client.sessionId)) {
        return
      }

      // Send the current chat history to the requesting client.
      client.send('chat-history', this.chatHistory)
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

      // Get the sender's player information and enforce the message cooldown.
      const now = Date.now()
      const player = this.getChatSender(client, now)

      // Ignore messages from clients that aren't eligible to send.
      if (!player) {
        return
      }

      // Create the emoji message with its timestamp.
      const emojiMessage: ChatHistoryMessage = {
        type: 'emoji',
        sessionId: client.sessionId,
        name: player.name,
        text: message.emoji,
        timestamp: now,
      }

      // Add the emoji message to room history.
      this.addChatHistoryMessage(emojiMessage)

      // Broadcast the emoji with its expiration timestamp.
      this.broadcast('emoji', {
        sessionId: client.sessionId,
        name: player.name,
        emoji: message.emoji,
        expiresAt: now + 5000,
      })
    })

    // Handle player interactions that indicate activity.
    this.onMessage('activity', (client) => {
      console.log(
        new Date().toISOString(),
        client.sessionId,
        'activity received',
      )

      this.resetInactivityTimer(client)
    })

    // Handle confirmation that a player is still present.
    this.onMessage('inactivity-confirm', (client) => {
      // Reset the player's inactivity timer.
      this.resetInactivityTimer(client)

      // Dismiss the warning if the player had received one.
      if (this.warnedInactive.delete(client.sessionId)) {
        client.send('inactivity-reset')
      }
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

    // Initialize the player's inactivity timer.
    this.resetInactivityTimer(client)

    // Add a player join event to room history.
    this.addChatHistoryMessage(
      {
        type: 'join',
        sessionId: client.sessionId,
        name: displayName,
        text: `${displayName} joined the game!`,
        timestamp: Date.now(),
      },
      client,
    )

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

    // Create a reconnection reservation for the disconnected player.
    const reconnection = this.allowReconnection(client, 60)

    // Immediately reject reconnection for players disconnected due to inactivity.
    if (code === (INACTIVITY_DISCONNECT_CODE as CloseCode)) {
      // Handle the expected rejection without logging a failed reconnection.
      reconnection.catch(() => {})
      reconnection.reject()
      return
    }

    // Store a way to reject this reservation if the player reaches the inactivity timeout.
    this.reconnectionRejectors.set(client.sessionId, () =>
      reconnection.reject(),
    )

    // Log successful reconnections.
    reconnection
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
      .finally(() => {
        // Remove the reservation once the reconnection attempt has finished.
        this.reconnectionRejectors.delete(client.sessionId)
      })
  }

  // When a player successfully reconnects.
  onReconnect(client: Client) {
    // Reset the inactivity timer after reconnecting.
    this.resetInactivityTimer(client)

    console.log(client.sessionId, 'reconnected!')
  }

  // When a player leaves.
  onLeave(client: Client, code: CloseCode) {
    // Get the player's information before removing them.
    const player = this.state.players.get(client.sessionId)

    // Record the player's departure in room history.
    if (player) {
      this.addChatHistoryMessage({
        type: 'leave',
        sessionId: client.sessionId,
        name: player.name,
        text: `${player.name} left the game!`,
        timestamp: Date.now(),
      })

      // Notify everyone that this player left.
      this.broadcastNotification(`${player.name} left the game!`)
    }

    // Remove the player from the synchronized room state.
    this.state.players.delete(client.sessionId)

    // Remove the player's chat cooldown when they leave.
    this.lastChatMessage.delete(client.sessionId)

    // Remove the player's inactivity tracking when they leave.
    this.lastActivity.delete(client.sessionId)
    this.warnedInactive.delete(client.sessionId)

    // Remove any pending reconnection tracking when the player leaves.
    this.reconnectionRejectors.delete(client.sessionId)

    // Clear chat history when the room becomes empty.
    if (this.state.players.size === 0) {
      this.chatHistory = []
    }

    console.log(client.sessionId, 'left!', code)
  }

  onDispose() {
    console.log('Room', this.roomId, 'disposing...')
  }
}
