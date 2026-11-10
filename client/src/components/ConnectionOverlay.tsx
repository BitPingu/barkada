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
      <div className="game-dialog">
        {isReconnecting ? (
          <>
            <h2>Reconnecting...</h2>
            <p>Trying to restore your connection to {roomName || 'Room'}.</p>
          </>
        ) : (
          <>
            <h2>Connection Lost</h2>
            <p>{connectionError}</p>
            <button className="game-dialog-button" onClick={onReturn}>
              Return to Character Selection
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default ConnectionOverlay
