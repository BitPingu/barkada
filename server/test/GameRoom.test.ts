import assert from 'assert'
import { ColyseusTestServer, boot } from '@colyseus/testing'

import appConfig from '../src/app.config.js'
import { GameRoomState } from '../src/rooms/schema/GameRoomState.js'

describe('GameRoom', () => {
  let colyseus: ColyseusTestServer<typeof appConfig>

  before(async () => (colyseus = await boot(appConfig)))
  after(async () => colyseus.shutdown())

  beforeEach(async () => {
    await colyseus.cleanup()
  })

  it('connects to a room and registers a player', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect a client to the room.
    const client1 = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Verify the client successfully joined.
    assert.strictEqual(client1.sessionId, room.clients[0].sessionId)

    // Verify the player was registered.
    const player = room.state.players.get(client1.sessionId)

    assert.ok(player, 'Player should exist in room state')
    assert.strictEqual(player.name, 'Guest 1')
    assert.strictEqual(player.x, 480)
    assert.strictEqual(player.y, 320)

    // Verify the client received the synchronized player state.
    assert.deepStrictEqual(client1.state.toJSON(), {
      players: {
        [client1.sessionId]: {
          name: 'Guest 1',
          x: 480,
          y: 320,
          characterType: 'boy',
        },
      },
    })

    // Disconnect the client.
    await client1.leave()

    // Verify the player was removed from the room.
    assert.strictEqual(room.state.players.has(client1.sessionId), false)
  })

  it('trims whitespace from a player display name', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect a client with a display name containing whitespace.
    const client = await colyseus.connectTo(room, {
      displayName: '  Guest 1  ',
    })

    // Verify the stored display name was trimmed.
    const player = room.state.players.get(client.sessionId)

    assert.ok(player)
    assert.strictEqual(player.name, 'Guest 1')

    // Disconnect the client.
    await client.leave()
  })

  it('registers a player with the girl character type', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect a client using the girl character type.
    const client = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
      characterType: 'girl',
    })

    // Verify the selected character type was registered.
    const player = room.state.players.get(client.sessionId)

    assert.ok(player)
    assert.strictEqual(player.characterType, 'girl')

    // Disconnect the client.
    await client.leave()
  })

  it('rejects a player without a display name', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Verify the server rejects the connection.
    await assert.rejects(
      colyseus.connectTo(room, {}),
      /A display name is required/,
    )

    // Verify no player was registered.
    assert.strictEqual(room.state.players.size, 0)
  })

  it('rejects a non-string display name', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Verify the server rejects a non-string display name.
    await assert.rejects(
      colyseus.connectTo(room, {
        displayName: 123 as unknown as string,
      }),
    )

    // Verify no player was registered.
    assert.strictEqual(room.state.players.size, 0)
  })

  it('rejects an empty display name', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Verify the server rejects an empty display name.
    await assert.rejects(
      colyseus.connectTo(room, {
        displayName: '',
      }),
    )

    // Verify no player was registered.
    assert.strictEqual(room.state.players.size, 0)
  })

  it('rejects a whitespace-only display name', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Verify the server rejects a whitespace-only display name.
    await assert.rejects(
      colyseus.connectTo(room, {
        displayName: '   ',
      }),
    )

    // Verify no player was registered.
    assert.strictEqual(room.state.players.size, 0)
  })

  it('rejects a display name longer than 16 characters', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Verify the server rejects a display name exceeding 16 characters.
    await assert.rejects(
      colyseus.connectTo(room, {
        displayName: 'A'.repeat(17),
      }),
    )

    // Verify no player was registered.
    assert.strictEqual(room.state.players.size, 0)
  })

  it('updates a player position when receiving a movement request', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect a client to the room.
    const client = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Request a new player position.
    client.send('move', { x: 600, y: 400 })

    // Allow the server to process the movement request.
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Verify the player's position was updated.
    const player = room.state.players.get(client.sessionId)

    assert.ok(player)
    assert.strictEqual(player.x, 600)
    assert.strictEqual(player.y, 400)

    // Disconnect the client.
    await client.leave()
  })

  it('clamps player coordinates to the game boundaries', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect a client to the room.
    const client = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Request a position outside the game boundaries.
    client.send('move', { x: 1000, y: 100 })

    // Allow the server to process the movement request.
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Verify the position was clamped to the game boundaries.
    const player = room.state.players.get(client.sessionId)

    assert.ok(player)
    assert.strictEqual(player.x, 935)
    assert.strictEqual(player.y, 170)

    // Disconnect the client.
    await client.leave()
  })

  it('ignores movement requests with invalid coordinates', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect a client to the room.
    const client = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Send movement requests with invalid coordinates.
    client.send('move', { x: '600', y: 400 })
    client.send('move', { x: NaN, y: 400 })
    client.send('move', { x: 600, y: Infinity })

    // Allow the server to process the movement requests.
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Verify the player's position remains unchanged.
    const player = room.state.players.get(client.sessionId)

    assert.ok(player)
    assert.strictEqual(player.x, 480)
    assert.strictEqual(player.y, 320)

    // Disconnect the client.
    await client.leave()
  })

  it('ignores movement requests with missing coordinates', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect a client to the room.
    const client = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Send a movement request without coordinates.
    client.send('move', {})

    // Allow the server to process the movement request.
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Verify the player's position remains unchanged.
    const player = room.state.players.get(client.sessionId)

    assert.ok(player)
    assert.strictEqual(player.x, 480)
    assert.strictEqual(player.y, 320)

    // Disconnect the client.
    await client.leave()
  })

  it('ignores empty and whitespace-only chat messages', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect a client to the room.
    const client = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Send empty and whitespace-only chat messages.
    client.send('chat', { text: '' })
    client.send('chat', { text: '   ' })

    // Allow the server to process the messages.
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Verify that no messages were added to chat history.
    const historyPromise = new Promise<unknown[]>((resolve) => {
      client.onMessage('chat-history', resolve)
    })
    client.send('chat-history-request', {})

    assert.deepStrictEqual(await historyPromise, [])

    // Disconnect the client.
    await client.leave()
  })

  it('ignores chat messages with non-string text', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect a client to the room.
    const client = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Send a chat message with non-string text.
    client.send('chat', { text: 123 } as unknown as { text: string })

    // Allow the server to process the message.
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Request chat history.
    const historyPromise = new Promise<unknown[]>((resolve) => {
      client.onMessage('chat-history', resolve)
    })
    client.send('chat-history-request', {})

    // Verify that no message was added to chat history.
    assert.deepStrictEqual(await historyPromise, [])

    // Disconnect the client.
    await client.leave()
  })

  it('ignores chat messages longer than 100 characters', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect a client to the room.
    const client = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Send a chat message exceeding the character limit.
    client.send('chat', { text: 'A'.repeat(101) })

    // Allow the server to process the message.
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Request chat history.
    const historyPromise = new Promise<unknown[]>((resolve) => {
      client.onMessage('chat-history', resolve)
    })
    client.send('chat-history-request', {})

    // Verify that no message was added to chat history.
    assert.deepStrictEqual(await historyPromise, [])

    // Disconnect the client.
    await client.leave()
  })

  it('trims whitespace from chat messages', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect a client to the room.
    const client = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Listen for the live chat message.
    const messagePromise = new Promise<{ text: string }>((resolve) => {
      client.onMessage('chat', resolve)
    })

    // Send a message containing surrounding whitespace.
    client.send('chat', { text: '  Hello, world!  ' })

    // Verify the broadcast message was trimmed.
    const message = await messagePromise
    assert.strictEqual(message.text, 'Hello, world!')

    // Disconnect the client.
    await client.leave()
  })

  it('rejects chat messages sent within the cooldown period', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect a client to the room.
    const client = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Preserve the original clock and use a controlled timestamp.
    const originalNow = Date.now
    let currentTime = originalNow()

    try {
      Date.now = () => currentTime

      // Listen for the first chat message.
      const messagePromise = new Promise<{ text: string }>((resolve) => {
        client.onMessage('chat', resolve)
      })

      // Send the first message.
      client.send('chat', { text: 'First message' })

      // Verify the first message was accepted.
      const message = await messagePromise
      assert.strictEqual(message.text, 'First message')

      // Advance time by less than the cooldown period.
      currentTime += 499

      // Listen for the chat history response.
      const historyPromise = new Promise<{ text: string }[]>((resolve) => {
        client.onMessage('chat-history', resolve)
      })

      // Send another message within the cooldown period.
      client.send('chat', { text: 'Second message' })

      // Request chat history.
      client.send('chat-history-request')

      // Verify the second message was rejected.
      const history = await historyPromise

      assert.strictEqual(history.length, 1)
      assert.strictEqual(history[0].text, 'First message')
    } finally {
      // Restore the original clock.
      Date.now = originalNow

      // Disconnect the client.
      await client.leave()
    }
  })

  it('accepts chat messages after the cooldown period', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect a client to the room.
    const client = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Preserve the original clock and use a controlled timestamp.
    const originalNow = Date.now
    let currentTime = originalNow()

    try {
      Date.now = () => currentTime

      // Send the first message.
      const firstMessagePromise = new Promise<{ text: string }>((resolve) => {
        client.onMessage('chat', resolve)
      })

      client.send('chat', { text: 'First message' })
      await firstMessagePromise

      // Advance time by the full cooldown period.
      currentTime += 500

      // Listen for the second chat message.
      const secondMessagePromise = new Promise<{ text: string }>((resolve) => {
        client.onMessage('chat', resolve)
      })

      // Send the second message.
      client.send('chat', { text: 'Second message' })

      // Verify the second message was accepted.
      const secondMessage = await secondMessagePromise
      assert.strictEqual(secondMessage.text, 'Second message')
    } finally {
      // Restore the original clock.
      Date.now = originalNow

      // Disconnect the client.
      await client.leave()
    }
  })

  it('stores chat messages and returns them when requested', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect a client to the room.
    const client1 = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Listen for the live chat message.
    const liveMessagePromise = new Promise<{
      sessionId: string
      name: string
      text: string
      timestamp: number
      expiresAt: number
    }>((resolve) => {
      client1.onMessage('chat', resolve)
    })

    // Send a chat message.
    client1.send('chat', { text: 'Hello, world!' })

    // Verify the live chat message was received.
    const liveMessage = await liveMessagePromise

    assert.strictEqual(liveMessage.sessionId, client1.sessionId)
    assert.strictEqual(liveMessage.name, 'Guest 1')
    assert.strictEqual(liveMessage.text, 'Hello, world!')
    assert.strictEqual(typeof liveMessage.timestamp, 'number')
    assert.strictEqual(typeof liveMessage.expiresAt, 'number')

    // Listen for the chat history response.
    const historyPromise = new Promise<
      {
        sessionId: string
        name: string
        text: string
        timestamp: number
      }[]
    >((resolve) => {
      client1.onMessage('chat-history', resolve)
    })

    // Request the room's chat history.
    client1.send('chat-history-request')

    // Verify the stored message was returned.
    const history = await historyPromise

    assert.strictEqual(history.length, 1)
    assert.deepStrictEqual(history[0], {
      sessionId: client1.sessionId,
      name: 'Guest 1',
      text: 'Hello, world!',
      timestamp: liveMessage.timestamp,
    })

    // Disconnect the client.
    await client1.leave()
  })

  it('retains only the 100 most recent chat messages', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect a client to the room.
    const client1 = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Preserve the original clock and use a controlled timestamp.
    const originalNow = Date.now
    let currentTime = originalNow()

    try {
      Date.now = () => currentTime

      // Send 101 messages, advancing past the chat cooldown each time.
      for (let i = 1; i <= 101; i++) {
        const messagePromise = new Promise<void>((resolve) => {
          client1.onMessage('chat', () => resolve())
        })

        client1.send('chat', { text: `Message ${i}` })

        await messagePromise
        currentTime += 501
      }

      // Listen for the chat history response.
      const historyPromise = new Promise<
        {
          sessionId: string
          name: string
          text: string
          timestamp: number
        }[]
      >((resolve) => {
        client1.onMessage('chat-history', resolve)
      })

      // Request the room's chat history.
      client1.send('chat-history-request')

      // Verify only the 100 most recent messages were retained.
      const history = await historyPromise

      assert.strictEqual(history.length, 100)
      assert.strictEqual(history[0].text, 'Message 2')
      assert.strictEqual(history[99].text, 'Message 101')
    } finally {
      // Restore the original clock.
      Date.now = originalNow

      // Disconnect the client.
      await client1.leave()
    }
  })

  it('clears chat history when the room becomes empty', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect the first client.
    const client1 = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Send a chat message.
    const messagePromise = new Promise<void>((resolve) => {
      client1.onMessage('chat', () => resolve())
    })

    client1.send('chat', { text: 'Hello, world!' })
    await messagePromise

    // Disconnect the last player.
    await client1.leave()

    // Connect a new player to the same room.
    const client2 = await colyseus.connectTo(room, {
      displayName: 'Guest 2',
    })

    // Listen for the chat history response.
    const historyPromise = new Promise<
      {
        sessionId: string
        name: string
        text: string
        timestamp: number
      }[]
    >((resolve) => {
      client2.onMessage('chat-history', resolve)
    })

    // Request the room's chat history.
    client2.send('chat-history-request')

    // Verify the previous session's history was cleared.
    const history = await historyPromise

    assert.deepStrictEqual(history, [])

    // Disconnect the new player.
    await client2.leave()
  })

  it('preserves chat history when a player reconnects', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect a client to the room.
    const client1 = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Send a chat message.
    const messagePromise = new Promise<void>((resolve) => {
      client1.onMessage('chat', () => resolve())
    })

    client1.send('chat', { text: 'Hello, world!' })
    await messagePromise

    // Store the reconnection token before disconnecting.
    const reconnectionToken = client1.reconnectionToken

    // Simulate an unexpected disconnection.
    await client1.leave(false)

    // Verify the player remains in the room during the reconnection window.
    assert.strictEqual(room.state.players.has(client1.sessionId), true)

    // Reconnect using the saved token.
    const reconnectedClient =
      await colyseus.sdk.reconnect<GameRoomState>(reconnectionToken)

    // Verify the original player session was restored.
    assert.strictEqual(reconnectedClient.sessionId, client1.sessionId)
    assert.strictEqual(room.state.players.has(client1.sessionId), true)

    // Listen for the chat history response.
    const historyPromise = new Promise<
      {
        sessionId: string
        name: string
        text: string
        timestamp: number
      }[]
    >((resolve) => {
      reconnectedClient.onMessage('chat-history', resolve)
    })

    // Request the room's chat history.
    reconnectedClient.send('chat-history-request')

    // Verify the previous message is still available.
    const history = await historyPromise

    assert.strictEqual(history.length, 1)
    assert.strictEqual(history[0].sessionId, client1.sessionId)
    assert.strictEqual(history[0].name, 'Guest 1')
    assert.strictEqual(history[0].text, 'Hello, world!')

    // Disconnect the reconnected client.
    await reconnectedClient.leave()
  })

  it('broadcasts valid emoji reactions to the room', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect a client to the room.
    const client = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    try {
      // Listen for the emoji reaction.
      const emojiPromise = new Promise<{
        sessionId: string
        name: string
        emoji: string
        expiresAt: number
      }>((resolve) => {
        client.onMessage('emoji', resolve)
      })

      // Send an emoji reaction.
      client.send('emoji', { emoji: '❤️' })

      // Verify the reaction was broadcast.
      const emoji = await emojiPromise
      assert.strictEqual(emoji.sessionId, client.sessionId)
      assert.strictEqual(emoji.name, 'Guest 1')
      assert.strictEqual(emoji.emoji, '❤️')
      assert.strictEqual(typeof emoji.expiresAt, 'number')
    } finally {
      await client.leave()
    }
  })

  it('ignores invalid emoji reactions', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect a client to the room.
    const client = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    let receivedEmoji = false

    try {
      // Listen for emoji reactions.
      client.onMessage('emoji', () => {
        receivedEmoji = true
      })

      // Send unsupported and non-string emoji values.
      client.send('emoji', { emoji: 'not-an-emoji' })
      client.send('emoji', { emoji: 123 })

      // Allow the server to process both requests.
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Verify neither reaction was broadcast.
      assert.strictEqual(receivedEmoji, false)
    } finally {
      await client.leave()
    }
  })

  it('broadcasts join notifications to existing players', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect the first client.
    const firstClient = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    try {
      // Listen for notifications from the second player's arrival.
      const notificationPromise = new Promise<{
        message: string
        startAt: number
        expiresAt: number
        serverNow: number
      }>((resolve) => {
        firstClient.onMessage('notification', resolve)
      })

      // Connect the second client.
      const secondClient = await colyseus.connectTo(room, {
        displayName: 'Guest 2',
      })

      try {
        // Verify the join notification was broadcast.
        const notification = await notificationPromise
        assert.strictEqual(notification.message, 'Guest 2 joined the game!')
        assert.strictEqual(typeof notification.startAt, 'number')
        assert.strictEqual(typeof notification.expiresAt, 'number')
        assert.strictEqual(typeof notification.serverNow, 'number')
      } finally {
        await secondClient.leave()
      }
    } finally {
      await firstClient.leave()
    }
  })

  it('broadcasts leave notifications to remaining players', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect both clients.
    const firstClient = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    const secondClient = await colyseus.connectTo(room, {
      displayName: 'Guest 2',
    })

    try {
      // Listen for the second player's departure.
      const notificationPromise = new Promise<{
        message: string
      }>((resolve) => {
        firstClient.onMessage('notification', resolve)
      })

      // Disconnect the second client.
      await secondClient.leave()

      // Verify the leave notification was broadcast.
      const notification = await notificationPromise
      assert.strictEqual(notification.message, 'Guest 2 left the game!')
    } finally {
      await firstClient.leave()
    }
  })

  it('responds to time synchronization requests', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect a client to the room.
    const client = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    try {
      // Listen for the time synchronization response.
      const timeSyncPromise = new Promise<{
        clientSentAt: number
        serverNow: number
      }>((resolve) => {
        client.onMessage('time-sync', resolve)
      })

      // Send a time synchronization request.
      client.send('time-sync', { clientSentAt: 123456789 })

      // Verify the server response.
      const response = await timeSyncPromise
      assert.strictEqual(response.clientSentAt, 123456789)
      assert.strictEqual(typeof response.serverNow, 'number')
      assert.ok(Number.isFinite(response.serverNow))
    } finally {
      await client.leave()
    }
  })

  it('ignores time synchronization requests with invalid timestamps', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect a client to the room.
    const client = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    let receivedResponse = false

    try {
      // Listen for time synchronization responses.
      client.onMessage('time-sync', () => {
        receivedResponse = true
      })

      // Send requests with invalid timestamps.
      client.send('time-sync', { clientSentAt: 'invalid' })
      client.send('time-sync', {})

      // Allow the server to process both requests.
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Verify neither request received a response.
      assert.strictEqual(receivedResponse, false)
    } finally {
      await client.leave()
    }
  })

  it('broadcasts chat messages to all players in the room', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect both clients.
    const firstClient = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    const secondClient = await colyseus.connectTo(room, {
      displayName: 'Guest 2',
    })

    try {
      // Listen for chat messages on the second client.
      const chatPromise = new Promise<{
        sessionId: string
        name: string
        text: string
      }>((resolve) => {
        secondClient.onMessage('chat', resolve)
      })

      // Send a chat message from the first client.
      firstClient.send('chat', { text: 'Hello everyone!' })

      // Verify the second client received the message.
      const message = await chatPromise
      assert.strictEqual(message.sessionId, firstClient.sessionId)
      assert.strictEqual(message.name, 'Guest 1')
      assert.strictEqual(message.text, 'Hello everyone!')
    } finally {
      await firstClient.leave()
      await secondClient.leave()
    }
  })

  it('shares the cooldown between chat messages and emoji reactions', async () => {
    // Create a new room instance.
    const room = await colyseus.createRoom<GameRoomState>('main_room', {})

    // Connect a client to the room.
    const client = await colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    const originalNow = Date.now
    let currentTime = originalNow()
    let receivedEmoji = false

    try {
      Date.now = () => currentTime

      // Send a chat message.
      const chatPromise = new Promise<void>((resolve) => {
        client.onMessage('chat', () => resolve())
      })

      client.send('chat', { text: 'Hello!' })
      await chatPromise

      // Listen for emoji reactions.
      client.onMessage('emoji', () => {
        receivedEmoji = true
      })

      // Immediately send an emoji reaction.
      client.send('emoji', { emoji: '❤️' })

      // Allow the server to process the reaction.
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Verify the shared cooldown rejected the reaction.
      assert.strictEqual(receivedEmoji, false)
    } finally {
      Date.now = originalNow
      await client.leave()
    }
  })
})
