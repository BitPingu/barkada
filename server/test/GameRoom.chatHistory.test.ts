import assert from 'assert'

import { GameRoomState } from '../src/rooms/schema/GameRoomState.js'
import type { ChatHistoryMessage } from '../src/rooms/GameRoom.js'
import { setupGameRoomTests } from './helpers/testSetup.js'

describe('GameRoom chat history', () => {
  const testSetup = setupGameRoomTests()

  it('stores chat messages and returns them when requested', async () => {
    // Create a new room instance.
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect a client to the room.
    const client1 = await testSetup.colyseus.connectTo(room, {
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
    const historyPromise = new Promise<ChatHistoryMessage[]>((resolve) => {
      client1.onMessage('chat-history', resolve)
    })

    // Request the room's chat history.
    client1.send('chat-history-request')

    // Verify the stored message was returned.
    const history = await historyPromise

    assert.strictEqual(history.length, 2)
    assert.strictEqual(history[0].type, 'join')
    assert.strictEqual(history[1].type, 'chat')
    assert.strictEqual(history[1].sessionId, client1.sessionId)
    assert.strictEqual(history[1].name, 'Guest 1')
    assert.strictEqual(history[1].text, 'Hello, world!')
    assert.strictEqual(history[1].timestamp, liveMessage.timestamp)

    // Disconnect the client.
    await client1.leave()
  })

  it('retains only the 100 most recent chat messages', async () => {
    // Create a new room instance.
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect a client to the room.
    const client1 = await testSetup.colyseus.connectTo(room, {
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
      const historyPromise = new Promise<ChatHistoryMessage[]>((resolve) => {
        client1.onMessage('chat-history', resolve)
      })

      // Request the room's chat history.
      client1.send('chat-history-request')

      // Verify only the 100 most recent messages were retained.
      const history = await historyPromise

      assert.strictEqual(history.length, 100)
      assert.strictEqual(history[0].type, 'chat')
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
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect the first client.
    const client1 = await testSetup.colyseus.connectTo(room, {
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
    const client2 = await testSetup.colyseus.connectTo(room, {
      displayName: 'Guest 2',
    })

    // Listen for the chat history response.
    const historyPromise = new Promise<ChatHistoryMessage[]>((resolve) => {
      client2.onMessage('chat-history', resolve)
    })

    // Request the room's chat history.
    client2.send('chat-history-request')

    // Verify the previous session's history was cleared.
    const history = await historyPromise

    assert.strictEqual(history.length, 1)
    assert.strictEqual(history[0].type, 'join')
    assert.strictEqual(history[0].name, 'Guest 2')

    // Disconnect the new player.
    await client2.leave()
  })

  it('preserves chat history when a player reconnects', async () => {
    // Create a new room instance.
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect a client to the room.
    const client1 = await testSetup.colyseus.connectTo(room, {
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
      await testSetup.colyseus.sdk.reconnect<GameRoomState>(reconnectionToken)

    // Verify the original player session was restored.
    assert.strictEqual(reconnectedClient.sessionId, client1.sessionId)
    assert.strictEqual(room.state.players.has(client1.sessionId), true)

    // Listen for the chat history response.
    const historyPromise = new Promise<ChatHistoryMessage[]>((resolve) => {
      reconnectedClient.onMessage('chat-history', resolve)
    })

    // Request the room's chat history.
    reconnectedClient.send('chat-history-request')

    // Verify the previous message is still available.
    const history = await historyPromise

    assert.strictEqual(history.length, 2)
    assert.strictEqual(history[0].type, 'join')
    assert.strictEqual(history[1].type, 'chat')
    assert.strictEqual(history[1].sessionId, client1.sessionId)
    assert.strictEqual(history[1].name, 'Guest 1')
    assert.strictEqual(history[1].text, 'Hello, world!')

    // Disconnect the reconnected client.
    await reconnectedClient.leave()
  })
})
