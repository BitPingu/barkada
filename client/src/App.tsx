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
    displayName,
    setDisplayName,
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

      {/* Shared game interface for character selection and gameplay. */}
      <div className="game-interface">
        {/* Main content area. */}
        <div className="interface-main">
          {room ? (
            // Display the game canvas after joining a room.
            <div className="canvas-wrapper">
              <div
                className="game-container"
                onPointerDown={(event) => {
                  // Remove focus from the chat input when the game canvas is clicked.
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
                  <Game
                    room={room}
                    characterType={characterType!}
                    displayName={displayName}
                  />
                </Suspense>
              </div>
            </div>
          ) : (
            // Reserve the main area dimensions during character selection.
            <div className="interface-main-placeholder" />
          )}
        </div>

        {/* Bottom toolbar area. */}
        <div className="interface-footer">
          {room ? (
            <ChatBar room={room} isDisabled={isDialogueOpen} />
          ) : (
            // Reserve space for the chat toolbar during character selection.
            <div className="interface-footer-placeholder" />
          )}
        </div>

        {/* Display character selection over the entire interface,
          including the reserved footer space. */}
        {!room && (
          <div className="character-selection-overlay">
            <CharacterSelection
              characterType={characterType}
              setCharacterType={setCharacterType}
              displayName={displayName}
              setDisplayName={setDisplayName}
              isJoining={isJoining}
              joinError={joinError}
              onJoin={joinGame}
            />
          </div>
        )}

        {/* Display connection status and recovery options during gameplay. */}
        {room && (
          <ConnectionOverlay
            isReconnecting={isReconnecting}
            connectionError={connectionError}
            roomName={roomName}
            onReturn={returnToCharacterSelection}
          />
        )}
      </div>

      {/* Display the session-expired dialog during reconnection recovery. */}
      {!room && connectionError && (
        <SessionExpiredDialog
          message={connectionError}
          onContinue={returnToCharacterSelection}
        />
      )}
    </main>
  )
}

export default App
