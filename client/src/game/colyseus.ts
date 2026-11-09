import { Client } from '@colyseus/sdk'

const client = new Client(import.meta.env.VITE_SERVER_URL)

export default client
