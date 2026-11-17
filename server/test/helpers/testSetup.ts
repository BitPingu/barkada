import { after, before, beforeEach } from 'mocha'
import { boot } from '@colyseus/testing'
import type { ColyseusTestServer } from '@colyseus/testing'

import appConfig from '../../src/app.config.js'

let colyseus!: ColyseusTestServer<typeof appConfig>

// Start the test server once before running the test suites.
before(async () => {
  colyseus = await boot(appConfig)
})

// Shut down the test server after all test suites finish.
after(async () => {
  await colyseus.shutdown()
})

// Clean up rooms before each test.
beforeEach(async () => {
  await colyseus.cleanup()
})

// Provide access to the shared test server.
export function setupGameRoomTests() {
  return {
    get colyseus() {
      return colyseus
    },
  }
}
