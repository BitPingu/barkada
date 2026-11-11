type LeaveGameDialogProps = {
  onConfirm: () => void
  onCancel: () => void
}

function LeaveGameDialog({ onConfirm, onCancel }: LeaveGameDialogProps) {
  return (
    <div className="game-dialog-overlay leave-game-dialog-overlay">
      <div
        className="game-dialog leave-game-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-game-title"
      >
        <h2 id="leave-game-title">Leave Game?</h2>
        <p>
          Are you sure you want to leave? You'll return to character selection.
        </p>

        <div className="leave-game-actions">
          <button
            className="game-dialog-button"
            type="button"
            onClick={onCancel}
          >
            Stay
          </button>

          <button
            className="game-dialog-button leave-game-confirm-button"
            type="button"
            onClick={onConfirm}
          >
            Leave Game
          </button>
        </div>
      </div>
    </div>
  )
}

export default LeaveGameDialog
