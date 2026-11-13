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
})
