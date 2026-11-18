import '../GameDialog/GameDialog.css'
import './InactivityOverlay.css'

// Define the props required by the inactivity overlay.
type InactivityOverlayProps = {
  onConfirm: () => void
}

// Display a confirmation dialog when the player becomes inactive.
function InactivityOverlay({ onConfirm }: InactivityOverlayProps) {
  return (
    <div className="game-dialog-overlay">
      <div
        className="game-dialog inactivity-dialog"
        role="alertdialog"
        aria-labelledby="inactivity-dialog-title"
        aria-describedby="inactivity-dialog-description"
      >
        <h2 id="inactivity-dialog-title">Are you still there?</h2>
        <p id="inactivity-dialog-description">
          You've been inactive for a while. Are you still playing?
        </p>
        <button
          className="game-dialog-button"
          type="button"
          onClick={onConfirm}
          autoFocus
        >
          Yes
        </button>
      </div>
    </div>
  )
}

export default InactivityOverlay
