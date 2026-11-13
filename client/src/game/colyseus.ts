import { Client } from '@colyseus/sdk'

// Creates a shared Colyseus client using the configured server URL.
const client = new Client(import.meta.env.VITE_SERVER_URL)

export default client
