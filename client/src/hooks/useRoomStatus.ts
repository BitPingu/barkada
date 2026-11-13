import { useEffect, useState } from 'react'
import type { Room } from '@colyseus/sdk'
import client from '../game/colyseus'

// Defines the room status information returned by the server.
type RoomStatus = {
  roomName: string
  playerCount: number
}

// Fetches server availability and room information.
function useRoomStatus(roomRef: { current: Room | null }) {
  const [isServerOnline, setIsServerOnline] = useState<boolean | null>(null)
  const [playerCount, setPlayerCount] = useState<number | null>(null)
  const [roomName, setRoomName] = useState<string | null>(null)

  // Check server availability and fetch room information.
  useEffect(() => {
    let isActive = true

    async function fetchRoomStatus() {
      try {
        const response = await client.http.get<RoomStatus>('/api/room-status')

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
    void fetchRoomStatus()

    const intervalId = window.setInterval(fetchRoomStatus, 5000)

    return () => {
      // Prevent pending requests from updating state after cleanup.
      isActive = false
      window.clearInterval(intervalId)
    }
  }, [roomRef])

  return {
    isServerOnline,
    playerCount,
    setPlayerCount,
    roomName,
  }
}

export default useRoomStatus
