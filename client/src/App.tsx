import { lazy, Suspense, useEffect, useState } from 'react'
import type { Room } from '@colyseus/sdk'
import client from './game/colyseus'
import './App.css'

// Lazy-load the Phaser game component.
// This prevents the game engine from being loaded until needed.
const Game = lazy(() => import('./game/Game'))

// Render application and Game component
function App() {
  // Store the active Colyseus room connection.
  const [room, setRoom] = useState<Room | null>(null)

  // Store the player count.
  const [playerCount, setPlayerCount] = useState(0)

  // Store the message currently being typed.
  const [chatInput, setChatInput] = useState('')

  // Tracks whether the chat is currently on cooldown.
  const [isChatCoolingDown, setIsChatCoolingDown] = useState(false)

  // Connect to a Colyseus room when the React component mounts.
  useEffect(() => {
    // Track whether this effect instance is still active.
    let active = true
    let joinedRoom: Room | null = null

    async function joinRoom() {
      try {
        // Join an existing room or create one if none exists.
        const connection = await client.joinOrCreate('my_room')

        // Leave if this effect has already been cleaned up.
        if (!active) {
          connection.leave()
          return
        }

        joinedRoom = connection
        setRoom(connection)

        // Listen for synchronized room state changes.
        connection.onStateChange((state) => {
          const players = state.players

          if (!players) return

          // Update the player count whenever the room changes.
          setPlayerCount(players.size)

          console.log('Updated player count:', players.size)
        })

        // Log the room and session information for testing.
        console.log('Joined room:', connection.roomId)
        console.log('Session ID:', connection.sessionId)
      } catch (error) {
        // Log any errors encountered while connecting.
        console.error('Failed to join room:', error)
      }
    }

    joinRoom()

    // Clean up the connection when the effect is removed.
    return () => {
      active = false
      joinedRoom?.leave()
    }
  }, [])

  // Send a chat message to the server.
  function sendMessage() {
    const text = chatInput.trim()

    // Don't send empty messages or messages when disconnected or cooling down.
    if (!text || !room || isChatCoolingDown) {
      return
    }

    // Send the message to the Colyseus room.
    room.send('chat', { text })

    // Activate the chat cooldown.
    setIsChatCoolingDown(true)

    // Re-enable chat after 1.1 seconds.
    setTimeout(() => {
      setIsChatCoolingDown(false)
    }, 600)

    // Clear the input after sending.
    setChatInput('')
  }

  return (
    <main className="game-page">
      <header className="game-header">
        <div className="brand">
          <div className="brand-mark">B</div>
          <h1>barkada</h1>
        </div>

        <div className="connection-status">
          <span className={room ? 'status-dot connected' : 'status-dot'} />
          <span>{room ? 'Connected' : 'Connecting...'}</span>
        </div>
      </header>

      <div className="room-info">
        <div className="room-name">
          <span className="room-indicator" />
          <span>Town Square</span>
        </div>

        <div className="room-player-count">
          {playerCount} {playerCount === 1 ? 'player' : 'players'} online
        </div>
      </div>

      <div className="game-container">
        {/* Load the game separately from the app bundle
          after the room connection is established. */}
        {room ? (
          <Suspense
            fallback={<div className="loading-screen">Loading Town...</div>}
          >
            <Game room={room} />
          </Suspense>
        ) : (
          <div className="loading-screen">Connecting to Barkada...</div>
        )}
      </div>

      <div className="chat-bar">
        {/* Emoji button — functionality will be added later. */}
        <button className="chat-action" aria-label="Emojis" title="Emojis">
          ☺
        </button>

        {/* Message input */}
        <input
          type="text"
          placeholder="Say something..."
          aria-label="Chat message"
          value={chatInput}
          onChange={(event) => setChatInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              sendMessage()
            }
          }}
          maxLength={100}
          disabled={!room}
        />

        {/* Send button */}
        <button
          className="chat-action send-button"
          onClick={sendMessage}
          disabled={!room || !chatInput.trim() || isChatCoolingDown}
        >
          Send
        </button>

        {/* Player list — functionality will be added later. */}
        <button className="chat-action" aria-label="Players" title="Players">
          👥
        </button>

        {/* Profile — functionality will be added later. */}
        <button
          className="chat-action"
          aria-label="My Profile"
          title="My Profile"
        >
          👤
        </button>

        {/* Settings — functionality will be added later. */}
        <button className="chat-action" aria-label="Settings" title="Settings">
          ⚙
        </button>
      </div>
    </main>
  )
}

export default App
