import type { CSSProperties } from 'react'
import type { Room } from '@colyseus/sdk'
import { LogOut, User, Users } from 'lucide-react'
import './GameHeader.css'

// Define the props required by the game header.
type GameHeaderProps = {
  roomName: string | null
  playerCount: number | null
  displayName: string
  isReconnecting: boolean
  isDisconnected: boolean
  isServerOnline: boolean | null
  room: Room | null
  onLeaveGame: () => void
  interfaceScale: number
}

function GameHeader({
  roomName,
  playerCount,
  displayName,
  isReconnecting,
  isDisconnected,
  isServerOnline,
  room,
  onLeaveGame,
  interfaceScale,
}: GameHeaderProps) {
  // Determine the displayed connection status based on connection state.
  const connectionStatus = isReconnecting
    ? 'reconnecting'
    : isServerOnline === false
      ? 'offline'
      : isDisconnected
        ? 'disconnected'
        : room
          ? 'connected'
          : isServerOnline
            ? 'online'
            : 'checking'

  const statusLabel = {
    reconnecting: 'Reconnecting...',
    offline: 'Offline',
    disconnected: 'Disconnected',
    connected: 'Connected',
    online: 'Online',
    checking: 'Checking...',
  }[connectionStatus]

  return (
    // Match the header width to the scaled game interface.
    <header
      className="game-header"
      style={
        {
          '--interface-width': `${1100 * interfaceScale}px`,
        } as CSSProperties
      }
    >
      <div className="header-top-row">
        <div className="brand">
          <div className="brand-mark">b</div>
          <h1>barkada</h1>
        </div>

        {/* Show the leave button only while connected to a room. */}
        {room && (
          <button
            className="leave-game-button"
            type="button"
            onClick={onLeaveGame}
            aria-label="Leave Game"
          >
            <LogOut size={18} />
            <span className="leave-game-label">Leave Game</span>
          </button>
        )}
      </div>

      <div className="header-bottom-row">
        <div className="header-status-group">
          {/* Display the current server and room connection status. */}
          <div className={`connection-status ${connectionStatus}`}>
            <span className={`status-dot ${connectionStatus}`} />
            <span>{statusLabel}</span>
          </div>

          {/* Show the player's display name once they enter the game. */}
          {room && displayName && (
            <div className="player-info">
              <User size={14} />
              <span>{displayName}</span>
            </div>
          )}
        </div>

        {/* Show room information only when both values are available. */}
        {roomName && playerCount !== null && (
          <div className="room-info">
            <span className="room-name">{roomName}</span>
            <span className="room-player-count">
              <Users size={14} />
              {playerCount} {playerCount === 1 ? 'player' : 'players'} online
            </span>
          </div>
        )}
      </div>
    </header>
  )
}

export default GameHeader
