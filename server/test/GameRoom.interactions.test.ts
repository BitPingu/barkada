import assert from 'assert'

import { GameRoomState } from '../src/rooms/schema/GameRoomState.js'
import { setupGameRoomTests } from './helpers/testSetup.js'

describe('GameRoom interactions', () => {
  const testSetup = setupGameRoomTests()

  it('broadcasts valid emoji reactions to the room', async () => {
    // Create a new room instance.
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect a client to the room.
    const client = await testSetup.colyseus.connectTo(room, {
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
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect a client to the room.
    const client = await testSetup.colyseus.connectTo(room, {
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
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect the first client.
    const firstClient = await testSetup.colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    try {
      // Wait for the notification announcing the second player's arrival.
      const notificationPromise = new Promise<{
        message: string
        startAt: number
        expiresAt: number
        serverNow: number
      }>((resolve) => {
        // Listen for join notifications from the room.
        firstClient.onMessage(
          'notification',
          (notification: {
            message: string
            startAt: number
            expiresAt: number
            serverNow: number
          }) => {
            // Ignore Guest 1's own join notification.
            if (notification.message === 'Guest 2 joined the game!') {
              resolve(notification)
            }
          },
        )
      })

      // Listen for the second player's join event in chat history.
      const historyUpdatePromise = new Promise<{
        type: string
        sessionId: string
        name: string
        text: string
        timestamp: number
      }>((resolve) => {
        firstClient.onMessage(
          'chat-history-update',
          (message: {
            type: string
            sessionId: string
            name: string
            text: string
            timestamp: number
          }) => {
            if (message.type === 'join' && message.name === 'Guest 2') {
              resolve(message)
            }
          },
        )
      })

      // Connect the second client.
      const secondClient = await testSetup.colyseus.connectTo(room, {
        displayName: 'Guest 2',
      })

      try {
        // Verify the second player's join notification was broadcast.
        const notification = await notificationPromise

        // Verify the second player's join event was added to chat history.
        const historyUpdate = await historyUpdatePromise

        assert.strictEqual(historyUpdate.type, 'join')
        assert.strictEqual(historyUpdate.sessionId, secondClient.sessionId)
        assert.strictEqual(historyUpdate.name, 'Guest 2')
        assert.strictEqual(historyUpdate.text, 'Guest 2 joined the game!')
        assert.strictEqual(typeof historyUpdate.timestamp, 'number')
        assert.strictEqual(notification.message, 'Guest 2 joined the game!')
        assert.strictEqual(typeof notification.startAt, 'number')
        assert.strictEqual(typeof notification.expiresAt, 'number')
        assert.strictEqual(typeof notification.serverNow, 'number')
      } finally {
        // Disconnect the second client.
        await secondClient.leave()
      }
    } finally {
      // Disconnect the first client.
      await firstClient.leave()
    }
  })

  it('broadcasts leave notifications to remaining players', async () => {
    // Create a new room instance.
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect the first client.
    const firstClient = await testSetup.colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    try {
      // Listen for the second player's departure.
      const notificationPromise = new Promise<{
        message: string
      }>((resolve) => {
        firstClient.onMessage(
          'notification',
          (notification: { message: string }) => {
            if (notification.message === 'Guest 2 left the game!') {
              resolve(notification)
            }
          },
        )
      })

      // Listen for the second player's leave event in chat history.
      const historyUpdatePromise = new Promise<{
        type: string
        sessionId: string
        name: string
        text: string
        timestamp: number
      }>((resolve) => {
        firstClient.onMessage(
          'chat-history-update',
          (message: {
            type: string
            sessionId: string
            name: string
            text: string
            timestamp: number
          }) => {
            if (message.type === 'leave') {
              resolve(message)
            }
          },
        )
      })

      // Connect the second client after registering the message listeners.
      const secondClient = await testSetup.colyseus.connectTo(room, {
        displayName: 'Guest 2',
      })

      // Disconnect the second client.
      await secondClient.leave()

      // Verify the leave notification was broadcast.
      const notification = await notificationPromise

      // Verify the second player's leave event was added to chat history.
      const historyUpdate = await historyUpdatePromise

      assert.strictEqual(historyUpdate.type, 'leave')
      assert.strictEqual(historyUpdate.sessionId, secondClient.sessionId)
      assert.strictEqual(historyUpdate.name, 'Guest 2')
      assert.strictEqual(historyUpdate.text, 'Guest 2 left the game!')
      assert.strictEqual(typeof historyUpdate.timestamp, 'number')
      assert.strictEqual(notification.message, 'Guest 2 left the game!')
    } finally {
      await firstClient.leave()
    }
  })

  it('responds to time synchronization requests', async () => {
    // Create a new room instance.
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect a client to the room.
    const client = await testSetup.colyseus.connectTo(room, {
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
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect a client to the room.
    const client = await testSetup.colyseus.connectTo(room, {
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

  it('shares the cooldown between chat messages and emoji reactions', async () => {
    // Create a new room instance.
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect a client to the room.
    const client = await testSetup.colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Register a handler for chat history updates this test does not inspect.
    client.onMessage('chat-history-update', () => {})

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
