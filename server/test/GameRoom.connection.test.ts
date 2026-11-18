import assert from 'assert'

import { GameRoomState } from '../src/rooms/schema/GameRoomState.js'
import { setupGameRoomTests } from './helpers/testSetup.js'

describe('GameRoom connection', () => {
  const testSetup = setupGameRoomTests()

  it('connects to a room and registers a player', async () => {
    // Create a new room instance.
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect a client to the room.
    const client1 = await testSetup.colyseus.connectTo(room, {
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
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect a client with a display name containing whitespace.
    const client = await testSetup.colyseus.connectTo(room, {
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
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Connect a client using the girl character type.
    const client = await testSetup.colyseus.connectTo(room, {
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
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Verify the server rejects the connection.
    await assert.rejects(
      testSetup.colyseus.connectTo(room, {}),
      /A display name is required/,
    )

    // Verify no player was registered.
    assert.strictEqual(room.state.players.size, 0)
  })

  it('rejects a non-string display name', async () => {
    // Create a new room instance.
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Verify the server rejects a non-string display name.
    await assert.rejects(
      testSetup.colyseus.connectTo(room, {
        displayName: 123 as unknown as string,
      }),
    )

    // Verify no player was registered.
    assert.strictEqual(room.state.players.size, 0)
  })

  it('rejects an empty display name', async () => {
    // Create a new room instance.
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Verify the server rejects an empty display name.
    await assert.rejects(
      testSetup.colyseus.connectTo(room, {
        displayName: '',
      }),
    )

    // Verify no player was registered.
    assert.strictEqual(room.state.players.size, 0)
  })

  it('rejects a whitespace-only display name', async () => {
    // Create a new room instance.
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Verify the server rejects a whitespace-only display name.
    await assert.rejects(
      testSetup.colyseus.connectTo(room, {
        displayName: '   ',
      }),
    )

    // Verify no player was registered.
    assert.strictEqual(room.state.players.size, 0)
  })

  it('rejects a display name longer than 16 characters', async () => {
    // Create a new room instance.
    const room = await testSetup.colyseus.createRoom<GameRoomState>(
      'main_room',
      {},
    )

    // Verify the server rejects a display name exceeding 16 characters.
    await assert.rejects(
      testSetup.colyseus.connectTo(room, {
        displayName: 'A'.repeat(17),
      }),
    )

    // Verify no player was registered.
    assert.strictEqual(room.state.players.size, 0)
  })
})
