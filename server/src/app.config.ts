import {
  defineServer,
  defineRoom,
  monitor,
  playground,
  createRouter,
  createEndpoint,
  matchMaker,
} from 'colyseus'

/**
 * Import your Room files
 */
import { MyRoom } from './rooms/MyRoom.js'

const server = defineServer({
  /**
   * Define your room handlers:
   */
  rooms: {
    my_room: defineRoom(MyRoom),
  },

  /**
   * Experimental: Define API routes. Built-in integration with the "playground" and SDK.
   *
   * Usage from SDK:
   *   client.http.get("/api/hello").then((response) => {})
   *
   */
  routes: createRouter({
    api_hello: createEndpoint('/api/hello', { method: 'GET' }, async (ctx) => {
      return { message: 'Hello World' }
    }),
    api_town_status: createEndpoint(
      '/api/town-status',
      { method: 'GET' },
      async () => {
        // Find all active Town Square rooms.
        const rooms = await matchMaker.query({ name: 'my_room' })

        // Add up the number of connected players.
        const playerCount = rooms.reduce(
          (total, room) => total + room.clients,
          0,
        )

        return { playerCount }
      },
    ),
  }),

  /**
   * Bind your custom express routes here:
   * Read more: https://expressjs.com/en/starter/basic-routing.html
   */
  express: (app) => {
    app.get('/hi', (req, res) => {
      res.send("It's time to kick ass and chew bubblegum!")
    })

    /**
     * Use @colyseus/monitor
     * If you expose it in production, make sure to protect it with a password:
     * https://docs.colyseus.io/tools/monitoring#password-protection
     */
    if (process.env.NODE_ENV !== 'production') {
      app.use('/monitor', monitor())
    }

    /**
     * Use @colyseus/playground
     * (It is not recommended to expose this route in a production environment)
     */
    if (process.env.NODE_ENV !== 'production') {
      app.use('/', playground())
    }
  },
})

export default server
