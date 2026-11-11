type ConnectionOverlayProps = {
  isReconnecting: boolean
  connectionError: string | null
  roomName: string
  onReturn: () => void
}

function ConnectionOverlay({
  isReconnecting,
  connectionError,
  roomName,
  onReturn,
}: ConnectionOverlayProps) {
  if (!isReconnecting && !connectionError) return null

  return (
    <div className="game-dialog-overlay">
      <div className="game-dialog connection-dialog">
        {isReconnecting ? (
          <>
            <div className="loading-spinner" aria-hidden="true" />
            <h2>Reconnecting...</h2>
            <p>
              Restoring your connection to {roomName || 'Room'}. Please wait a
              moment.
            </p>
          </>
        ) : (
          <>
            <div className="connection-lost-icon" aria-hidden="true">
              !
            </div>
            <h2>Connection Lost</h2>
            <p>
              {connectionError ||
                'Your connection was interrupted. Please return to character selection.'}
            </p>
            <button
              className="game-dialog-button"
              type="button"
              onClick={onReturn}
            >
              Return to Character Selection
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default ConnectionOverlay
