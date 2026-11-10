import type { Room } from '@colyseus/sdk'

type GameHeaderProps = {
  roomName: string
  playerCount: number
  connectionError: string | null
  isReconnecting: boolean
  room: Room | null
}

function GameHeader({
  roomName,
  playerCount,
  connectionError,
  isReconnecting,
  room,
}: GameHeaderProps) {
  return (
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
  )
}

export default GameHeader
