type SessionExpiredDialogProps = {
  message: string
  onContinue: () => void
}

function SessionExpiredDialog({
  message,
  onContinue,
}: SessionExpiredDialogProps) {
  return (
    <div className="game-dialog-overlay session-expired-dialog-overlay">
      <div
        className="game-dialog session-expired-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
      >
        <h2 id="session-expired-title">Session Expired</h2>
        <p>{message}</p>

        <div className="session-expired-actions">
          <button
            className="game-dialog-button"
            type="button"
            onClick={onContinue}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

export default SessionExpiredDialog
