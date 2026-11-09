import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { Room } from '@colyseus/sdk'
import client from './game/colyseus'
import type { CharacterType } from './game/objects/PlayerCharacter'
import './App.css'

// Lazy-load the Phaser game component.
// This prevents the game engine from being loaded until needed.
const Game = lazy(() => import('./game/Game'))

// Emojis available in the picker.
const EMOJIS = ['😀', '😂', '😢', '😮', '❤️', '👋']

// Render application and Game component
function App() {
  // Store the active Colyseus room connection.
  const [room, setRoom] = useState<Room | null>(null)

  // Store the selected character type.
  const [characterType, setCharacterType] = useState<CharacterType | null>(null)

  // Tracks whether the player is joining the game.
  const [isJoining, setIsJoining] = useState(false)

  // Store the player count.
  const [playerCount, setPlayerCount] = useState(0)

  // Stores the room's display name.
  const [roomName, setRoomName] = useState('')

  // Store the message currently being typed.
  const [chatInput, setChatInput] = useState('')

  // Tracks whether the chat is currently on cooldown.
  const [isChatCoolingDown, setIsChatCoolingDown] = useState(false)

  // Tracks whether the emoji picker is visible.
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)

  // References the emoji button and picker.
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  // Join the game using the selected character type.
  async function joinGame() {
    if (!characterType || isJoining) return

    setIsJoining(true)

    try {
      // Join the room and send the selected character type.
      const connection = await client.joinOrCreate('my_room', {
        characterType,
      })

      setRoom(connection)

      // Update the count whenever the room state changes.
      connection.onStateChange((state) => {
        setPlayerCount(state.players.size)
      })

      // Log the room and session information for testing.
      console.log('Joined room:', connection.roomId)
      console.log('Session ID:', connection.sessionId)
    } catch (error) {
      // Log any errors encountered while connecting.
      console.error('Failed to join room:', error)
      setIsJoining(false)
    }
  }

  // Leave the room when the application unmounts.
  useEffect(() => {
    return () => {
      room?.leave()
    }
  }, [room])

  // Fetch the Town Square player count while not connected.
  useEffect(() => {
    if (room) return

    let isActive = true

    async function fetchPlayerCount() {
      try {
        const response = await client.http.get('/api/town-status')

        if (isActive) {
          setRoomName(response.data.roomName)
          setPlayerCount(response.data.playerCount)
        }
      } catch (error) {
        console.error('Failed to fetch player count:', error)
      }
    }

    // Fetch immediately, then refresh every five seconds.
    void fetchPlayerCount()

    const intervalId = window.setInterval(fetchPlayerCount, 5000)

    return () => {
      isActive = false
      window.clearInterval(intervalId)
    }
  }, [room])

  // Close the emoji picker when clicking outside the emoji controls.
  useEffect(() => {
    // Handle clicks anywhere on the page.
    function handleClickOutside(event: MouseEvent) {
      // Check whether the click happened outside the emoji controls.
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        // Close the emoji picker.
        setIsEmojiPickerOpen(false)
      }
    }

    // Listen for mouse clicks.
    document.addEventListener('mousedown', handleClickOutside)

    // Remove the listener when the component unmounts.
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Close the emoji picker when pressing Escape.
  useEffect(() => {
    // Handle keyboard input.
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsEmojiPickerOpen(false)
      }
    }

    // Listen for keyboard input.
    document.addEventListener('keydown', handleKeyDown)

    // Remove the listener when the component unmounts.
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
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

    // Re-enable chat after 0.6 seconds.
    setTimeout(() => {
      setIsChatCoolingDown(false)
    }, 600)

    // Clear the input after sending.
    setChatInput('')
  }

  // Send an emoji to the server.
  function sendEmoji(emoji: string) {
    // Don't send emojis when disconnected or cooling down.
    if (!room || isChatCoolingDown) {
      return
    }

    // Send the selected emoji to the server.
    room.send('emoji', { emoji })

    // Activate the chat cooldown.
    setIsChatCoolingDown(true)

    // Re-enable chat after 0.6 seconds.
    setTimeout(() => {
      setIsChatCoolingDown(false)
    }, 600)

    // Close the emoji picker.
    setIsEmojiPickerOpen(false)
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
          <span className={room ? 'status-dot connected' : 'status-dot'} />
          <span>{roomName}</span>
        </div>

        <div className="room-player-count">
          {playerCount} {playerCount === 1 ? 'player' : 'players'} online
        </div>
      </div>

      {!room ? (
        // Character selection screen.
        <section className="character-selection">
          <h2>Choose Your Character</h2>
          <p>Select a character to enter the town.</p>

          <div className="character-options">
            <button
              className={`character-option ${
                characterType === 'boy' ? 'selected' : ''
              }`}
              onClick={() => setCharacterType('boy')}
              aria-pressed={characterType === 'boy'}
            >
              Boy
            </button>

            <button
              className={`character-option ${
                characterType === 'girl' ? 'selected' : ''
              }`}
              onClick={() => setCharacterType('girl')}
              aria-pressed={characterType === 'girl'}
            >
              Girl
            </button>
          </div>

          <button
            className="join-button"
            onClick={joinGame}
            disabled={!characterType || isJoining}
          >
            {isJoining ? 'Joining...' : 'Join Game'}
          </button>
        </section>
      ) : (
        // Game interface.
        <>
          <div className="game-container">
            {/* Load the game separately from the app bundle
              after the room connection is established. */}
            <Suspense
              fallback={
                <div className="loading-screen">
                  Loading {roomName || 'Room'}...
                </div>
              }
            >
              <Game room={room} characterType={characterType!} />
            </Suspense>
          </div>

          <div className="chat-bar">
            {/* Emoji controls */}
            <div className="emoji-controls" ref={emojiPickerRef}>
              {/* Emoji button */}
              <button
                className="chat-action"
                aria-label="Emojis"
                title="Emojis"
                onClick={() => setIsEmojiPickerOpen((open) => !open)}
                disabled={!room}
              >
                ☺
              </button>
              {/* Emoji picker */}
              {isEmojiPickerOpen && (
                <div className="emoji-picker">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      className="emoji-option"
                      onClick={() => sendEmoji(emoji)}
                      disabled={isChatCoolingDown}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
            <button
              className="chat-action"
              aria-label="Players"
              title="Players"
            >
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
            <button
              className="chat-action"
              aria-label="Settings"
              title="Settings"
            >
              ⚙
            </button>
          </div>
        </>
      )}
    </main>
  )
}

export default App
