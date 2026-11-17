import { after, before, beforeEach } from 'mocha'
import { boot } from '@colyseus/testing'
import type { ColyseusTestServer } from '@colyseus/testing'
import { ColyseusSDK } from '@colyseus/sdk'

import appConfig from '../../src/app.config.js'

let colyseus!: ColyseusTestServer<typeof appConfig>

// Start the test server once before running the test suites.
before(async () => {
  colyseus = await boot(appConfig)

  const port = colyseus.server['port']
  colyseus.sdk = new TestColyseusSDK(`ws://127.0.0.1:${port}`)
})

// Shut down the test server after all test suites finish.
after(async () => {
  await colyseus.shutdown()
})

// Clean up rooms before each test.
beforeEach(async () => {
  await colyseus.cleanup()
})

// Registers a fallback message handler before each test room connects.
class TestColyseusSDK extends ColyseusSDK {
  protected createRoom<T>(roomName: string, rootSchema?: any) {
    const room = super.createRoom<T>(roomName, rootSchema)

    // Prevent warnings for message types that a test doesn't explicitly handle.
    room.onMessage('*', () => {})

    return room
  }
}

// Provide access to the shared test server.
export function setupGameRoomTests() {
  return {
    get colyseus() {
      return colyseus
    },
  }
}
