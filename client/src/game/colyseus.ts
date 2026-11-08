import { Client } from '@colyseus/sdk'

const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:2567'

const client = new Client(serverUrl)

export default client
