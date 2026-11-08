import { lazy, Suspense, useEffect } from 'react'
import client from './game/colyseus'

// Lazy-load the Phaser game component.
// This prevents the game engine from being loaded until needed.
const Game = lazy(() => import('./game/Game'))

// Render application and Game component
function App() {
  // Connect to a Colyseus room when the React component mounts.
  useEffect(() => {
    // Track whether this effect instance is still active.
    let active = true

    async function joinRoom() {
      try {
        // Join an existing room or create one if none exists.
        const room = await client.joinOrCreate('my_room')

        // Ignore the connection if this effect was cleaned up.
        if (!active) {
          room.leave()
          return
        }

        // Log the room and session information for testing.
        console.log('Joined room:', room.roomId)
        console.log('Session ID:', room.sessionId)

        // Listen for changes to the synchronized room state.
        room.onStateChange((state) => {
          console.log('Players in room:', state.players.size)
          console.log('Player data:', state.players)
        })
      } catch (error) {
        // Log any errors encountered while connecting.
        console.error('Failed to join room:', error)
      }
    }

    joinRoom()

    // Clean up the connection when the effect is removed.
    return () => {
      active = false
    }
  }, [])

  return (
    <main className="game-page">
      <h1>Welcome to Barkada</h1>
      <div className="game-container">
        {/* Load game separately from app bundle */}
        <Suspense fallback={<div>Loading game...</div>}>
          <Game />
        </Suspense>
      </div>
    </main>
  )
}

export default App
