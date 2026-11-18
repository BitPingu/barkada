import assert from 'assert'

import { GameRoomState } from '../src/rooms/schema/GameRoomState.js'
import { setupGameRoomTests } from './helpers/testSetup.js'

describe('GameRoom movement', () => {
  const testSetup = setupGameRoomTests()

  it('updates a player position when receiving a movement request', async () => {
    // Create a new room instance.
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect a client to the room.
    const client = await testSetup.colyseus.connectTo(room, {
      displayName: 'Guest 1',
    })

    // Wait until the synchronized player state reflects the new position.
    const positionPromise = new Promise<void>((resolve) => {
      client.onStateChange((state) => {
        const player = state.players.get(client.sessionId)

        if (player?.x === 600 && player.y === 400) {
          resolve()
        }
      })
    })

    // Request a new player position.
    client.send('move', { x: 600, y: 400 })

    // Verify the synchronized position was updated.
    await positionPromise

    const player = room.state.players.get(client.sessionId)

    assert.ok(player)
    assert.strictEqual(player.x, 600)
    assert.strictEqual(player.y, 400)

    // Disconnect the client.
    await client.leave()
  })

  it('clamps player coordinates to the game boundaries', async () => {
    // Create a new room instance.
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect a client to the room.
    const client = await testSetup.colyseus.connectTo(room, {
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
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect a client to the room.
    const client = await testSetup.colyseus.connectTo(room, {
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
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect a client to the room.
    const client = await testSetup.colyseus.connectTo(room, {
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
})
