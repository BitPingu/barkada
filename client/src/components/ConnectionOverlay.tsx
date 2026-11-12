// Define the props required by the connection overlay.
type ConnectionOverlayProps = {
  isReconnecting: boolean
  connectionError: string | null
  roomName: string | null
  onReturn: () => void
}

function ConnectionOverlay({
  isReconnecting,
  connectionError,
  roomName,
  onReturn,
}: ConnectionOverlayProps) {
  // Hide the overlay when there is no active connection issue.
  if (!isReconnecting && !connectionError) return null

  return (
    <div className="game-dialog-overlay">
      <div className="game-dialog connection-dialog">
        {isReconnecting ? (
          <>
            {/* Display a loading indicator while attempting to reconnect. */}
            <div className="loading-spinner" aria-hidden="true" />
            <h2>Reconnecting...</h2>
            <p>Hang tight! We're getting you back into the game.</p>
          </>
        ) : (
          <>
            {/* Display an error message when the connection cannot be restored. */}
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
