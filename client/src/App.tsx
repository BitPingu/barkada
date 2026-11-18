import { useState } from 'react'
import GameHeader from './components/GameHeader/GameHeader'
import GameInterface from './components/GameInterface/GameInterface'
import useGameConnection from './hooks/useGameConnection'
import './App.css'

// Render the application and manage the game interface.
function App() {
  // Retrieve connection state and actions from the custom hook.
  const {
    room,
    notifications,
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
    recordActivity,
  } = useGameConnection()

  // Track whether the leave game confirmation dialog is open.
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false)

  // Track the scale of the game interface for responsive header sizing.
  const [interfaceScale, setInterfaceScale] = useState(1)

  // Check whether the leave game dialog should be displayed.
  const shouldShowLeaveDialog =
    isLeaveDialogOpen && !isDisconnected && !isReconnecting && !connectionError

  // Reset the leave dialog when starting a new game session.
  function handleJoinGame() {
    setIsLeaveDialogOpen(false)
    void joinGame()
  }

  // Open the leave game confirmation dialog.
  function handleLeaveGame() {
    // Prevent opening the dialog when the player is not connected.
    if (!room || isReconnecting || isDisconnected) return

    recordActivity()
    setIsLeaveDialogOpen(true)
  }

  // Confirm leaving the game.
  function handleConfirmLeaveGame() {
    setIsLeaveDialogOpen(false)
    void leaveGame()
  }

  // Cancel leaving the game and keep the session active.
  function handleCancelLeaveGame() {
    recordActivity()
    setIsLeaveDialogOpen(false)
  }

  return (
    <main className="game-page">
      {/* Header */}
      <GameHeader
        roomName={roomName}
        playerCount={playerCount}
        displayName={displayName}
        isReconnecting={isReconnecting}
        isDisconnected={isDisconnected}
        isServerOnline={isServerOnline}
        room={room}
        interfaceScale={interfaceScale}
        onLeaveGame={handleLeaveGame}
      />

      {/* Shared game interface for character selection and gameplay. */}
      <GameInterface
        room={room}
        notifications={notifications}
        characterType={characterType}
        setCharacterType={setCharacterType}
        displayName={displayName}
        setDisplayName={setDisplayName}
        isJoining={isJoining}
        canJoin={isServerOnline === true}
        joinError={joinError}
        onJoin={handleJoinGame}
        isReconnecting={isReconnecting}
        isLeaveDialogOpen={shouldShowLeaveDialog}
        onConfirmLeaveGame={handleConfirmLeaveGame}
        onCancelLeaveGame={handleCancelLeaveGame}
        recordActivity={recordActivity}
        connectionError={connectionError}
        roomName={roomName}
        onReturn={returnToCharacterSelection}
        onScaleChange={setInterfaceScale}
      />
    </main>
  )
}

export default App
