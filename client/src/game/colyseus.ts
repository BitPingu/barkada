import { Client } from '@colyseus/sdk'

// Use the configured server URL if provided; otherwise, use the hostname
// from the browser's current address to support both local and LAN access.
const serverUrl =
  import.meta.env.VITE_SERVER_URL ||
  `${window.location.protocol}//${window.location.hostname}:2567`

// Create the Colyseus client using the resolved server URL.
const client = new Client(serverUrl)

export default client
