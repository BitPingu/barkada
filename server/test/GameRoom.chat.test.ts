import assert from 'assert'

import { GameRoomState } from '../src/rooms/schema/GameRoomState.js'
import type { ChatHistoryMessage } from '../src/rooms/GameRoom.js'
import { setupGameRoomTests } from './helpers/testSetup.js'

describe('GameRoom chat', () => {
  const testSetup = setupGameRoomTests()

  it('ignores empty and whitespace-only chat messages', async () => {
    // Create a new room instance.
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect a client to the room.
    const client = await testSetup.colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Register handlers for messages this test does not inspect.
    client.onMessage('notification', () => {})
    client.onMessage('chat-history-update', () => {})
    client.onMessage('chat', () => {})

    // Send empty and whitespace-only chat messages.
    client.send('chat', { text: '' })
    client.send('chat', { text: '   ' })

    // Allow the server to process the messages.
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Verify that no messages were added to chat history.
    const historyPromise = new Promise<ChatHistoryMessage[]>((resolve) => {
      client.onMessage('chat-history', resolve)
    })
    client.send('chat-history-request', {})

    // Verify no chat messages were added to history.
    const history = await historyPromise

    assert.strictEqual(history.length, 1)
    assert.strictEqual(history[0].type, 'join')
    assert.strictEqual(history[0].name, 'Guest 1')

    // Disconnect the client.
    await client.leave()
  })

  it('ignores chat messages with non-string text', async () => {
    // Create a new room instance.
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect a client to the room.
    const client = await testSetup.colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Register handlers for messages this test does not inspect.
    client.onMessage('notification', () => {})
    client.onMessage('chat-history-update', () => {})
    client.onMessage('chat', () => {})

    // Send a chat message with non-string text.
    client.send('chat', { text: 123 } as unknown as { text: string })

    // Allow the server to process the message.
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Request chat history.
    const historyPromise = new Promise<ChatHistoryMessage[]>((resolve) => {
      client.onMessage('chat-history', resolve)
    })
    client.send('chat-history-request', {})

    // Verify no chat messages were added to history.
    const history = await historyPromise

    assert.strictEqual(history.length, 1)
    assert.strictEqual(history[0].type, 'join')
    assert.strictEqual(history[0].name, 'Guest 1')

    // Disconnect the client.
    await client.leave()
  })

  it('ignores chat messages longer than 100 characters', async () => {
    // Create a new room instance.
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect a client to the room.
    const client = await testSetup.colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Register handlers for messages this test does not inspect.
    client.onMessage('notification', () => {})
    client.onMessage('chat-history-update', () => {})
    client.onMessage('chat', () => {})

    // Send a chat message exceeding the character limit.
    client.send('chat', { text: 'A'.repeat(101) })

    // Allow the server to process the message.
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Request chat history.
    const historyPromise = new Promise<ChatHistoryMessage[]>((resolve) => {
      client.onMessage('chat-history', resolve)
    })
    client.send('chat-history-request', {})

    // Verify no chat messages were added to history.
    const history = await historyPromise

    assert.strictEqual(history.length, 1)
    assert.strictEqual(history[0].type, 'join')
    assert.strictEqual(history[0].name, 'Guest 1')

    // Disconnect the client.
    await client.leave()
  })

  it('trims whitespace from chat messages', async () => {
    // Create a new room instance.
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect a client to the room.
    const client = await testSetup.colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Register handlers for messages this test does not inspect.
    client.onMessage('notification', () => {})
    client.onMessage('chat-history-update', () => {})

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
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect a client to the room.
    const client = await testSetup.colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Register handlers for messages this test does not inspect.
    client.onMessage('notification', () => {})
    client.onMessage('chat-history-update', () => {})

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
      const historyPromise = new Promise<ChatHistoryMessage[]>((resolve) => {
        client.onMessage('chat-history', resolve)
      })

      // Send another message within the cooldown period.
      client.send('chat', { text: 'Second message' })

      // Request chat history.
      client.send('chat-history-request')

      // Verify the second message was rejected.
      const history = await historyPromise

      assert.strictEqual(history.length, 2)
      assert.strictEqual(history[0].type, 'join')
      assert.strictEqual(history[1].text, 'First message')
    } finally {
      // Restore the original clock.
      Date.now = originalNow

      // Disconnect the client.
      await client.leave()
    }
  })

  it('accepts chat messages after the cooldown period', async () => {
    // Create a new room instance.
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect a client to the room.
    const client = await testSetup.colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Register handlers for messages this test does not inspect.
    client.onMessage('notification', () => {})
    client.onMessage('chat-history-update', () => {})

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

  it('broadcasts chat messages to all players in the room', async () => {
    // Create a new room instance.
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect the first client.
    const firstClient = await testSetup.colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Register handlers for messages this test does not inspect.
    firstClient.onMessage('notification', () => {})
    firstClient.onMessage('chat-history-update', () => {})
    firstClient.onMessage('chat', () => {})

    let secondClient!: typeof firstClient

    try {
      // Connect the second client.
      secondClient = await testSetup.colyseus.connectTo(room, {
        displayName: 'Guest 2',
      })

      // Register handlers for messages this test does not inspect.
      secondClient.onMessage('notification', () => {})
      secondClient.onMessage('chat-history-update', () => {})

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
})
