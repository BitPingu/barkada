import {
  defineServer,
  defineRoom,
  monitor,
  playground,
  createRouter,
  createEndpoint,
  matchMaker,
} from 'colyseus'

import { GameRoom } from './rooms/GameRoom.js'

const server = defineServer({
  rooms: {
    main_room: defineRoom(GameRoom),
  },

  beforeListen: async () => {
    // Wait until the Colyseus matchmaker is initialized.
    await matchMaker.onReady

    // Create the main room when the server starts.
    await matchMaker.createRoom('main_room', {})

    console.log('Town Square is ready.')
  },

  routes: createRouter({
    api_room_status: createEndpoint(
      '/api/room-status',
      { method: 'GET' },
      async () => {
        // Find all active main rooms.
        const rooms = await matchMaker.query({ name: 'main_room' })

        // Add up the number of connected players.
        const playerCount = rooms.reduce(
          (total, room) => total + room.clients,
          0,
        )

        return {
          roomName: 'Town Square',
          playerCount,
        }
      },
    ),
  }),

  express: (app) => {
    /**
     * Use @colyseus/monitor
     * If you expose it in production, make sure to protect it with a password:
     * https://docs.colyseus.io/tools/monitoring#password-protection
     */
    if (process.env.NODE_ENV !== 'production') {
      app.use('/monitor', monitor())
      app.use('/', playground())
    }
  },
})

export default server
