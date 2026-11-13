import { useCallback, useEffect, useRef, useState } from 'react'
import type { Room } from '@colyseus/sdk'
import client from '../game/colyseus'
import type { CharacterType } from '../game/objects/PlayerCharacter'
import type { NotificationMessage } from '../game/types'
import useNotifications from './useNotifications'
import useSessionRecovery from './useSessionRecovery'
import useRoomStatus from './useRoomStatus'

function useGameConnection() {
  // Manage notifications received from the room.
  const { notifications, addNotification, clearNotifications } =
    useNotifications()

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

  // Stores the message displayed when a room session ends or expires.
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Store the error message displayed when joining fails.
  const [joinError, setJoinError] = useState<string | null>(null)

  // Stores the estimated difference between the server and local clocks.
  const serverClockOffset = useRef<number | null>(null)

  // Track the currently active room connection.
  const roomRef = useRef<Room | null>(null)

  // Fetch server availability and room information.
  const { isServerOnline, playerCount, setPlayerCount, roomName } =
    useRoomStatus(roomRef)

  // Set up event handlers for a room connection.
  const setupRoomConnection = useCallback(
    (connection: Room) => {
      // Track the active room connection.
      roomRef.current = connection
      setRoom(connection)

      // Reset the clock offset for the new connection.
      serverClockOffset.current = null

      // Listen for the server's clock synchronization response.
      connection.onMessage(
        'time-sync',
        (message: { clientSentAt: number; serverNow: number }) => {
          // Ignore responses from connections that are no longer active.
          if (roomRef.current !== connection) return

          const clientReceivedAt = Date.now()

          // Estimate the server clock offset using the round-trip midpoint.
          serverClockOffset.current =
            message.serverNow - (message.clientSentAt + clientReceivedAt) / 2
        },
      )

      // Send a clock synchronization request.
      const clientSentAt = Date.now()

      connection.send('time-sync', { clientSentAt })

      // Listen for notifications from the room.
      connection.onMessage('notification', (message: NotificationMessage) => {
        // Ignore notifications from connections that are no longer active.
        if (roomRef.current !== connection) return

        // Use the synchronized clock offset, falling back to the notification timestamp.
        const clockOffset =
          serverClockOffset.current ?? message.serverNow - Date.now()

        // Convert the server timestamps into the local clock's time.
        const startAt = message.startAt - clockOffset
        const expiresAt = message.expiresAt - clockOffset

        addNotification(message.message, startAt, expiresAt)
      })

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
        clearNotifications()
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
    },
    [clearNotifications, addNotification, setPlayerCount],
  )

  // Manage automatic session recovery.
  useSessionRecovery({
    roomRef,
    setupRoomConnection,
    setIsJoining,
    setIsReconnecting,
    setIsDisconnected,
    setCharacterType,
    setConnectionError,
  })

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
      const connection = await client.join('main_room', {
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
      const errorCode =
        typeof error === 'object' && error !== null && 'code' in error
          ? error.code
          : undefined

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

  // Leave the current room and reset the connection state.
  function returnToCharacterSelection() {
    const connection = roomRef.current

    // Clear the room reference immediately to prevent further connection attempts.
    roomRef.current = null
    clearNotifications()

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
    clearNotifications()

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
    notifications,
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
