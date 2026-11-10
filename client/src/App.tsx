import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { Room } from '@colyseus/sdk'
import client from './game/colyseus'
import type { CharacterType } from './game/objects/PlayerCharacter'
import CharacterPreview from './game/CharacterPreview'
import './App.css'

// Lazy-load the Phaser game component.
// This prevents the game engine from being loaded until needed.
const Game = lazy(() => import('./game/Game'))

// Emojis available in the picker.
const EMOJIS = [
  '😀',
  '😂',
  '😭',
  '😮',
  '😡',
  '🥺',
  '❤️',
  '🔥',
  '🎶',
  '👍',
  '👋',
  '🙏',
]

// Render application and Game component
function App() {
  // Store the active Colyseus room connection.
  const [room, setRoom] = useState<Room | null>(null)

  // Store the selected character type.
  const [characterType, setCharacterType] = useState<CharacterType | null>(null)

  // Tracks whether the player is joining the game.
  const [isJoining, setIsJoining] = useState(false)

  // Tracks whether the client is attempting to reconnect.
  const [isReconnecting, setIsReconnecting] = useState(false)

  // Stores an error if the connection cannot be restored.
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Reuse an in-progress session recovery request.
  const recoveryPromiseRef = useRef<Promise<Room> | null>(null)

  // Store an error message if joining the room fails.
  const [joinError, setJoinError] = useState<string | null>(null)

  // Track the currently active room connection.
  const roomRef = useRef<Room | null>(null)

  // Disable toolbar interactions while a dialogue is open.
  const isDialogueOpen = isReconnecting || Boolean(connectionError)

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

  // Set up event handlers for a room connection.
  const setupRoomConnection = useCallback((connection: Room) => {
    // Track the active room connection.
    roomRef.current = connection
    setRoom(connection)

    connection.onDrop((code, reason) => {
      if (roomRef.current !== connection) return

      console.warn('Connection dropped:', code, reason)
      setIsReconnecting(true)
      setConnectionError(null)
    })

    connection.onReconnect(() => {
      if (roomRef.current !== connection) return

      console.log('Reconnected to room')
      setIsReconnecting(false)
      setConnectionError(null)

      queueMicrotask(() => {
        if (roomRef.current !== connection) return

        const refreshedToken = connection.reconnectionToken

        sessionStorage.setItem('barkada-reconnection-token', refreshedToken)
      })
    })

    connection.onLeave((code, reason) => {
      if (roomRef.current !== connection) return

      console.warn('Left room:', code, reason)

      roomRef.current = null
      setIsReconnecting(false)
      setConnectionError('Your connection was lost. Please rejoin.')

      sessionStorage.removeItem('barkada-reconnection-token')
      sessionStorage.removeItem('barkada-character-type')
    })

    // Update the count whenever the room state changes.
    connection.onStateChange((state) => {
      if (roomRef.current !== connection) return

      setPlayerCount(state.players.size)
    })
  }, [])

  // Join the game using the selected character type.
  async function joinGame() {
    // Clear any previous join error.
    setJoinError(null)

    if (!characterType || isJoining) return

    setIsJoining(true)

    try {
      // Join the room and send the selected character type.
      const connection = await client.join('town_square', {
        characterType,
      })

      sessionStorage.setItem(
        'barkada-reconnection-token',
        connection.reconnectionToken,
      )

      sessionStorage.setItem('barkada-character-type', characterType)

      setupRoomConnection(connection)
    } catch (error) {
      // Display an error message if joining fails.
      console.error('Failed to join room:', error)

      const errorCode = (error as { code?: number }).code

      if (errorCode === 521) {
        setJoinError('Sorry! The server is currently full.')
      } else {
        setJoinError('Unable to join. Please try again.')
      }

      setIsJoining(false)
    }
  }

  // Leave the room when the application unmounts.
  useEffect(() => {
    return () => {
      room?.leave()
    }
  }, [room])

  // Attempt to restore an existing session after a page refresh.
  useEffect(() => {
    let isActive = true

    async function recoverSession() {
      const token = sessionStorage.getItem('barkada-reconnection-token')
      const savedCharacterType = sessionStorage.getItem(
        'barkada-character-type',
      )

      if (!token || !savedCharacterType) return

      setIsJoining(true)
      setCharacterType(savedCharacterType as CharacterType)

      try {
        if (!recoveryPromiseRef.current) {
          recoveryPromiseRef.current = client.reconnect(token)
        }

        const connection = await recoveryPromiseRef.current

        if (!isActive) return

        setupRoomConnection(connection)

        sessionStorage.setItem(
          'barkada-reconnection-token',
          connection.reconnectionToken,
        )

        setIsJoining(false)
      } catch (error) {
        if (!isActive) return

        console.error('Failed to recover session:', error)
        sessionStorage.removeItem('barkada-reconnection-token')
        sessionStorage.removeItem('barkada-character-type')
        setIsJoining(false)
      } finally {
        recoveryPromiseRef.current = null
      }
    }

    void recoverSession()

    return () => {
      isActive = false
    }
  }, [setupRoomConnection])

  // Fetch the Room player count while not connected.
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
          <div className="brand-mark">b</div>
          <h1>barkada</h1>
        </div>

        <div className="room-info">
          <div className="room-name">
            <span>{roomName || 'Room'}</span>
          </div>

          <div className="room-player-count">
            {playerCount} {playerCount === 1 ? 'player' : 'players'} online
          </div>
        </div>

        <div className="connection-status">
          <span
            className={
              connectionError
                ? 'status-dot'
                : isReconnecting
                  ? 'status-dot reconnecting'
                  : room
                    ? 'status-dot connected'
                    : 'status-dot connecting'
            }
          />
          <span>
            {connectionError
              ? 'Disconnected'
              : isReconnecting
                ? 'Reconnecting...'
                : room
                  ? 'Connected'
                  : 'Connecting...'}
          </span>
        </div>
      </header>

      {!room ? (
        // Character selection screen.
        <section className="character-selection">
          <h2>Welcome to barkada!</h2>
          <p>Select a character to enter.</p>

          <div
            className="character-options"
            onContextMenu={(event) => event.preventDefault()}
          >
            <button
              className={`character-option ${
                characterType === 'boy' ? 'selected' : ''
              }`}
              onClick={() => setCharacterType('boy')}
              aria-pressed={characterType === 'boy'}
            >
              <CharacterPreview characterType="boy" />
            </button>

            <button
              className={`character-option ${
                characterType === 'girl' ? 'selected' : ''
              }`}
              onClick={() => setCharacterType('girl')}
              aria-pressed={characterType === 'girl'}
            >
              <CharacterPreview characterType="girl" />
            </button>
          </div>

          <button
            className="join-button"
            onClick={joinGame}
            disabled={!characterType || isJoining}
          >
            {isJoining ? 'Joining...' : 'Join Game'}
          </button>
          <p className={`join-error ${joinError ? 'visible' : ''}`}>
            {joinError || '\u00A0'}
          </p>
        </section>
      ) : (
        // Game interface.
        <>
          <div
            className="game-container"
            onPointerDown={(event) => {
              if (
                event.target instanceof HTMLCanvasElement &&
                document.activeElement instanceof HTMLElement
              ) {
                document.activeElement.blur()
              }
            }}
          >
            {/* Load the game separately from the app bundle
              after the room connection is established. */}
            <Suspense
              fallback={
                <div className="loading-screen">
                  <div className="loading-spinner" />
                  <p>Loading {roomName || 'Room'}...</p>
                </div>
              }
            >
              <Game room={room} characterType={characterType!} />
            </Suspense>

            {isReconnecting && (
              <div className="connection-overlay">
                <div className="connection-dialog">
                  <h2>Reconnecting...</h2>
                  <p>
                    Trying to restore your connection to {roomName || 'Room'}.
                  </p>
                </div>
              </div>
            )}

            {connectionError && (
              <div className="connection-overlay">
                <div className="connection-dialog">
                  <h2>Connection Lost</h2>
                  <p>{connectionError}</p>
                  <button
                    className="connection-button"
                    onClick={() => {
                      roomRef.current = null
                      setRoom(null)
                      setIsJoining(false)
                      setIsReconnecting(false)
                      setConnectionError(null)
                    }}
                  >
                    Return to Character Selection
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Disable the toolbar while a connection dialogue is open. */}
          <div className="chat-bar" inert={isDialogueOpen}>
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
