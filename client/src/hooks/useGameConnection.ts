import { useCallback, useEffect, useRef, useState } from 'react'
import type { Room } from '@colyseus/sdk'
import client from '../game/colyseus'
import type { CharacterType } from '../game/objects/PlayerCharacter'

function useGameConnection() {
  // Store the active Colyseus room connection.
  const [room, setRoom] = useState<Room | null>(null)

  // Store the selected character type.
  const [characterType, setCharacterType] = useState<CharacterType | null>(null)

  // Store the player's display name, restoring it from the current session.
  const [displayName, setDisplayName] = useState(
    () => sessionStorage.getItem('barkada-display-name') ?? '',
  )

  // Tracks whether the player is joining the game.
  const [isJoining, setIsJoining] = useState(false)

  // Tracks whether the client is attempting to reconnect.
  const [isReconnecting, setIsReconnecting] = useState(false)

  // Tracks whether the player is disconnected from the room.
  const [isDisconnected, setIsDisconnected] = useState(false)

  // Tracks whether the server is reachable.
  const [isServerOnline, setIsServerOnline] = useState<boolean | null>(null)

  // Stores the message displayed when a room session ends or expires.
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Store an error message if joining the room fails.
  const [joinError, setJoinError] = useState<string | null>(null)

  // Store the player count.
  const [playerCount, setPlayerCount] = useState<number | null>(null)

  // Stores the room's display name.
  const [roomName, setRoomName] = useState<string | null>(null)

  // Reuse an in-progress session recovery request.
  const recoveryPromiseRef = useRef<Promise<Room> | null>(null)

  // Track the currently active room connection.
  const roomRef = useRef<Room | null>(null)

  // Set up event handlers for a room connection.
  const setupRoomConnection = useCallback((connection: Room) => {
    // Track the active room connection.
    roomRef.current = connection
    setRoom(connection)

    connection.onDrop((code, reason) => {
      // Ignore events from connections that are no longer active.
      if (roomRef.current !== connection) return

      console.warn('Connection dropped:', code, reason)
      setIsDisconnected(true)
      setIsReconnecting(true)
      setConnectionError(null)
    })

    connection.onReconnect(() => {
      // Ignore events from connections that are no longer active.
      if (roomRef.current !== connection) return

      setIsDisconnected(false)
      setIsReconnecting(false)
      setConnectionError(null)

      // Save the refreshed token after the reconnection callback completes.
      queueMicrotask(() => {
        if (roomRef.current !== connection) return

        const refreshedToken = connection.reconnectionToken

        sessionStorage.setItem('barkada-reconnection-token', refreshedToken)
      })
    })

    connection.onLeave((code, reason) => {
      // Ignore events from connections that are no longer active.
      if (roomRef.current !== connection) return

      console.warn('Left room:', code, reason)

      roomRef.current = null
      setRoom(null)
      setIsDisconnected(true)

      // Clear saved session data because this room can no longer be recovered.
      sessionStorage.removeItem('barkada-reconnection-token')
      sessionStorage.removeItem('barkada-character-type')

      setIsReconnecting(false)
      setConnectionError("You've lost your connection to the game.")
    })

    // Update the count whenever the room state changes.
    connection.onStateChange((state) => {
      // Ignore updates from connections that are no longer active.
      if (roomRef.current !== connection) return

      setPlayerCount(state.players.size)
    })
  }, [])

  // Join the game using the selected character type and display name.
  async function joinGame() {
    // Clear any previous join error.
    setJoinError(null)

    if (!characterType || isJoining) return

    const trimmedDisplayName = displayName.trim()

    if (!trimmedDisplayName) {
      setJoinError('Please enter a display name.')
      return
    }

    setIsJoining(true)

    try {
      // Join the room and send the selected character type.
      const connection = await client.join('town_square', {
        characterType,
        displayName: trimmedDisplayName,
      })

      setIsDisconnected(false)
      setIsReconnecting(false)
      setConnectionError(null)

      // Save the session details to support reconnection after a refresh.
      sessionStorage.setItem(
        'barkada-reconnection-token',
        connection.reconnectionToken,
      )

      sessionStorage.setItem('barkada-character-type', characterType)
      sessionStorage.setItem('barkada-display-name', trimmedDisplayName)

      setupRoomConnection(connection)
      setIsJoining(false)
    } catch (error) {
      // Display an error message if joining fails.
      const errorCode = (error as { code?: number }).code

      // Handle a full room separately from other connection errors.
      if (errorCode === 521) {
        setJoinError('Sorry! The server is currently full.')
      } else {
        setJoinError('Unable to join. Please try again.')
      }

      setIsJoining(false)
    }
  }

  // Clean up the active room connection when the application unmounts.
  useEffect(() => {
    return () => {
      const connection = roomRef.current

      // Clear the room reference to prevent further connection callbacks.
      roomRef.current = null

      if (connection) {
        void connection.leave()
      }
    }
  }, [])

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

      // Skip recovery if no saved session exists.
      if (!token && !savedCharacterType) return

      // Clear incomplete session data.
      if (!token || !savedCharacterType) {
        sessionStorage.removeItem('barkada-reconnection-token')
        sessionStorage.removeItem('barkada-character-type')

        setConnectionError('Your previous session expired.')
        return
      }

      isRecovering = true
      setIsJoining(true)
      setIsReconnecting(true)
      setCharacterType(savedCharacterType as CharacterType)

      try {
        // Reuse an ongoing recovery attempt if one already exists.
        if (!recoveryPromiseRef.current) {
          recoveryPromiseRef.current = client.reconnect(token)
        }

        const connection = await recoveryPromiseRef.current

        // Ignore results if the component has been unmounted.
        if (!isActive) return

        setupRoomConnection(connection)

        setIsDisconnected(false)
        setIsReconnecting(false)
        setConnectionError(null)

        // Save the refreshed reconnection token.
        sessionStorage.setItem(
          'barkada-reconnection-token',
          connection.reconnectionToken,
        )

        setIsJoining(false)
      } catch (error) {
        if (!isActive) return

        console.warn('Session recovery failed:', {
          code: (error as { code?: number }).code,
          message: error instanceof Error ? error.message : error,
        })

        const errorCode = (error as { code?: number }).code
        const errorMessage =
          error instanceof Error ? error.message : String(error)

        const isInvalidTokenFormat = errorMessage.includes(
          'Invalid reconnection token format',
        )

        if (errorCode === 524 || errorCode === 522 || isInvalidTokenFormat) {
          // Clear invalid session data so the player can join a new room.
          sessionStorage.removeItem('barkada-reconnection-token')
          sessionStorage.removeItem('barkada-character-type')

          setConnectionError('Your previous session expired.')
        }

        setIsReconnecting(false)
        setIsJoining(false)
      } finally {
        // Reset recovery state regardless of the outcome.
        recoveryPromiseRef.current = null
        isRecovering = false
      }
    }

    // Attempt session recovery when the player returns to the tab.
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
      // Prevent pending recovery attempts from updating an unmounted component.
      isActive = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [setupRoomConnection])

  // Check server availability and fetch room information.
  useEffect(() => {
    let isActive = true

    async function fetchPlayerCount() {
      try {
        const response = await client.http.get('/api/town-status')

        if (isActive) {
          setIsServerOnline(true)

          // Only update room information when not connected to a room.
          if (!roomRef.current) {
            setRoomName(response.data.roomName)
            setPlayerCount(response.data.playerCount)
          }
        }
      } catch {
        if (isActive) {
          setIsServerOnline(false)

          // Preserve the room player count while connected.
          if (!roomRef.current) {
            setPlayerCount(null)
          }
        }
      }
    }

    // Fetch immediately, then refresh every five seconds.
    void fetchPlayerCount()

    const intervalId = window.setInterval(fetchPlayerCount, 5000)

    return () => {
      // Prevent pending requests from updating state after cleanup.
      isActive = false
      window.clearInterval(intervalId)
    }
  }, [])

  // Leave the current room and reset the connection state.
  function returnToCharacterSelection() {
    const connection = roomRef.current

    // Clear the room reference immediately to prevent further connection attempts.
    roomRef.current = null

    // Clear any saved reconnection data.
    sessionStorage.removeItem('barkada-reconnection-token')
    sessionStorage.removeItem('barkada-character-type')

    setRoom(null)
    setIsJoining(false)
    setIsReconnecting(false)
    setIsDisconnected(false)
    setConnectionError(null)

    if (connection) {
      void connection.leave()
    }
  }

  // Intentionally leave the game and return to character selection.
  async function leaveGame() {
    const connection = roomRef.current

    // Clear the room reference so onLeave doesn't report an expired session.
    roomRef.current = null

    // Clear the saved reconnection data.
    sessionStorage.removeItem('barkada-reconnection-token')
    sessionStorage.removeItem('barkada-character-type')

    // Reset the connection state.
    setRoom(null)
    setIsJoining(false)
    setIsReconnecting(false)
    setIsDisconnected(false)
    setConnectionError(null)

    // Leave the Colyseus room.
    if (connection) {
      await connection.leave()
    }
  }

  return {
    room,
    characterType,
    setCharacterType,
    displayName,
    setDisplayName,
    isJoining,
    isReconnecting,
    isDisconnected,
    isServerOnline,
    connectionError,
    joinError,
    playerCount,
    roomName,
    joinGame,
    returnToCharacterSelection,
    leaveGame,
  }
}

export default useGameConnection
