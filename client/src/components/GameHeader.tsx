import type { Room } from '@colyseus/sdk'

type GameHeaderProps = {
  roomName: string
  playerCount: number
  connectionError: string | null
  isReconnecting: boolean
  room: Room | null
  onLeaveGame: () => void
}

function GameHeader({
  roomName,
  playerCount,
  connectionError,
  isReconnecting,
  room,
  onLeaveGame,
}: GameHeaderProps) {
  return (
    <header className="game-header">
      <div className="header-top-row">
        <div className="brand">
          <div className="brand-mark">b</div>
          <h1>barkada</h1>
        </div>

        {room && (
          <button
            className="leave-game-button"
            type="button"
            onClick={onLeaveGame}
            aria-label="Leave Game"
          >
            <span className="leave-game-icon" aria-hidden="true">
              ↪
            </span>
            <span className="leave-game-label">Leave Game</span>
          </button>
        )}
      </div>

      <div className="header-bottom-row">
        <div className="connection-status">
          <span
            className={
              connectionError
                ? 'status-dot disconnected'
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

        <div className="room-info">
          <span className="room-name">{roomName || 'Room'}</span>
          <span className="room-player-count">
            {playerCount} {playerCount === 1 ? 'player' : 'players'} online
          </span>
        </div>
      </div>
    </header>
  )
}

export default GameHeader
