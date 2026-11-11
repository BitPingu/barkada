import { lazy, Suspense, useState } from 'react'
import GameHeader from './components/GameHeader'
import CharacterSelection from './components/CharacterSelection'
import ConnectionOverlay from './components/ConnectionOverlay'
import ChatBar from './components/ChatBar'
import LeaveGameDialog from './components/LeaveGameDialog'
import SessionExpiredDialog from './components/SessionExpiredDialog'
import useGameConnection from './hooks/useGameConnection'
import './App.css'

// Lazy-load the Phaser game component.
// This prevents the game engine from being loaded until needed.
const Game = lazy(() => import('./game/Game'))

// Render the application and manage the game interface.
function App() {
  // Retrieve connection state and actions from the custom hook.
  const {
    room,
    characterType,
    setCharacterType,
    isJoining,
    isReconnecting,
    connectionError,
    joinError,
    playerCount,
    roomName,
    joinGame,
    returnToCharacterSelection,
    leaveGame,
  } = useGameConnection()

  // Disable toolbar interactions while a dialogue is open.
  const isDialogueOpen = isReconnecting || Boolean(connectionError)

  // Track whether the leave game confirmation dialog is open.
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false)

  // Open the leave game confirmation dialog.
  function handleLeaveGame() {
    setIsLeaveDialogOpen(true)
  }

  // Confirm leaving the game.
  function handleConfirmLeaveGame() {
    setIsLeaveDialogOpen(false)
    void leaveGame()
  }

  return (
    <main className="game-page">
      {/* Header */}
      <GameHeader
        roomName={roomName}
        playerCount={playerCount}
        connectionError={connectionError}
        isReconnecting={isReconnecting}
        room={room}
        onLeaveGame={handleLeaveGame}
      />

      {/* Leave game confirmation dialog. */}
      {isLeaveDialogOpen && (
        <LeaveGameDialog
          onConfirm={handleConfirmLeaveGame}
          onCancel={() => setIsLeaveDialogOpen(false)}
        />
      )}

      {!room ? (
        <>
          <CharacterSelection
            characterType={characterType}
            setCharacterType={setCharacterType}
            isJoining={isJoining}
            joinError={joinError}
            onJoin={joinGame}
          />

          {connectionError && (
            <SessionExpiredDialog
              message={connectionError}
              onContinue={returnToCharacterSelection}
            />
          )}
        </>
      ) : (
        // Game interface.
        <div className="game-interface">
          {/* Canvas */}
          <div className="canvas-wrapper">
            <div
              className="game-container"
              onPointerDown={(event) => {
                if (
                  event.target instanceof HTMLCanvasElement &&
                  document.activeElement instanceof HTMLElement
                ) {
                  document.activeElement.blur()
                }
              }}
            >
              {/* Load the game separately from the app bundle
                after the room connection is established. */}
              <Suspense
                fallback={
                  <div className="loading-screen">
                    <div className="loading-spinner" />
                    <p>Loading {roomName || 'Room'}...</p>
                  </div>
                }
              >
                <Game room={room} characterType={characterType!} />
              </Suspense>
            </div>
          </div>

          {/* Chat Bar */}
          <ChatBar room={room} isDisabled={isDialogueOpen} />

          {/* Display connection status and recovery options. */}
          <ConnectionOverlay
            isReconnecting={isReconnecting}
            connectionError={connectionError}
            roomName={roomName}
            onReturn={returnToCharacterSelection}
          />
        </div>
      )}
    </main>
  )
}

export default App
