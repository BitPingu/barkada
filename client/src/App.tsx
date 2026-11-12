import { useState } from 'react'
import GameHeader from './components/GameHeader/GameHeader'
import GameInterface from './components/GameInterface/GameInterface'
import LeaveGameDialog from './components/LeaveGameDialog'
import SessionExpiredDialog from './components/SessionExpiredDialog'
import useGameConnection from './hooks/useGameConnection'
import './App.css'

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
    isDisconnected,
    isServerOnline,
    connectionError,
    joinError,
    playerCount,
    roomName,
    joinGame,
    returnToCharacterSelection,
    leaveGame,
  } = useGameConnection()

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
        isReconnecting={isReconnecting}
        isDisconnected={isDisconnected}
        isServerOnline={isServerOnline}
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
      <GameInterface
        room={room}
        characterType={characterType}
        setCharacterType={setCharacterType}
        displayName={displayName}
        setDisplayName={setDisplayName}
        isJoining={isJoining}
        joinError={joinError}
        onJoin={joinGame}
        isReconnecting={isReconnecting}
        connectionError={connectionError}
        roomName={roomName}
        onReturn={returnToCharacterSelection}
      />

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
