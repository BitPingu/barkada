import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { Room } from '@colyseus/sdk'
import client from './game/colyseus'
import type { CharacterType } from './game/objects/PlayerCharacter'
import GameHeader from './components/GameHeader'
import CharacterSelection from './components/CharacterSelection'
import ConnectionOverlay from './components/ConnectionOverlay'
import ChatBar from './components/ChatBar'
import './App.css'

// Lazy-load the Phaser game component.
// This prevents the game engine from being loaded until needed.
const Game = lazy(() => import('./game/Game'))

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
      setConnectionError(
        'Your previous session expired. Please rejoin the game.',
      )
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

  // Restore an existing session after a page refresh or when returning to the tab.
  useEffect(() => {
    let isActive = true
    let isRecovering = false

    async function recoverSession() {
      // Avoid duplicate attempts or reconnecting an existing room.
      if (isRecovering || roomRef.current) return

      const token = sessionStorage.getItem('barkada-reconnection-token')
      const savedCharacterType = sessionStorage.getItem(
        'barkada-character-type',
      )

      if (!token || !savedCharacterType) return

      isRecovering = true
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

        setConnectionError(
          'Your previous session expired. Please select a character to rejoin.',
        )

        setIsJoining(false)
      } finally {
        recoveryPromiseRef.current = null
        isRecovering = false
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void recoverSession()
      }
    }

    // Recover immediately when the app loads.
    void recoverSession()

    // Also attempt recovery when the user returns to the browser tab.
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isActive = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
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

  return (
    <main className="game-page">
      <GameHeader
        roomName={roomName}
        playerCount={playerCount}
        connectionError={connectionError}
        isReconnecting={isReconnecting}
        room={room}
      />

      {!room ? (
        // Character selection screen.
        <CharacterSelection
          characterType={characterType}
          setCharacterType={setCharacterType}
          isJoining={isJoining}
          joinError={joinError}
          onJoin={joinGame}
        />
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

            <ConnectionOverlay
              isReconnecting={isReconnecting}
              connectionError={connectionError}
              roomName={roomName}
              onReturn={() => {
                roomRef.current = null
                setRoom(null)
                setIsJoining(false)
                setIsReconnecting(false)
                setConnectionError(null)
              }}
            />
          </div>

          {/* Disable the toolbar while a connection dialogue is open. */}
          <ChatBar room={room} isDisabled={isDialogueOpen} />
        </>
      )}
    </main>
  )
}

export default App
