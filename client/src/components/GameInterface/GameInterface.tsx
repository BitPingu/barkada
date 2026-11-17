import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ComponentProps,
} from 'react'
import CharacterSelection from '../CharacterSelection/CharacterSelection'
import ConnectionOverlay from '../ConnectionOverlay'
import ChatBar from '../ChatBar'
import ChatHistory from '../ChatHistory/ChatHistory'
import useScaledStage from '../../hooks/useScaledStage'
import type {
  ChatHistoryMessage,
  ChatMessage,
  Notification,
} from '../../game/types'
import './GameInterface.css'

// Lazy-load the Phaser game component.
// This prevents the game engine from being loaded until needed.
const Game = lazy(() => import('../../game/Game'))

// Reuse existing component prop types.
type CharacterSelectionProps = ComponentProps<typeof CharacterSelection>
type ConnectionOverlayProps = ComponentProps<typeof ConnectionOverlay>
type ChatBarProps = ComponentProps<typeof ChatBar>

// Define the props required by the shared game interface.
interface GameInterfaceProps {
  room: ChatBarProps['room'] | null
  notifications: Notification[]
  characterType: CharacterSelectionProps['characterType']
  setCharacterType: CharacterSelectionProps['setCharacterType']
  displayName: CharacterSelectionProps['displayName']
  setDisplayName: CharacterSelectionProps['setDisplayName']
  isJoining: CharacterSelectionProps['isJoining']
  canJoin: boolean
  joinError: CharacterSelectionProps['joinError']
  onJoin: CharacterSelectionProps['onJoin']
  isReconnecting: ConnectionOverlayProps['isReconnecting']
  connectionError: ConnectionOverlayProps['connectionError']
  roomName: string | null
  onReturn: ConnectionOverlayProps['onReturn']
  onScaleChange: (scale: number) => void
}

// Render the shared interface for character selection and gameplay.
function GameInterface({
  room,
  notifications,
  characterType,
  setCharacterType,
  displayName,
  setDisplayName,
  isJoining,
  canJoin,
  joinError,
  onJoin,
  isReconnecting,
  connectionError,
  roomName,
  onReturn,
  onScaleChange,
}: GameInterfaceProps) {
  // Track which room has finished initializing.
  const [readyRoom, setReadyRoom] = useState<GameInterfaceProps['room']>(null)

  // Stores the recent chat messages received from the server.
  const [chatMessages, setChatMessages] = useState<ChatHistoryMessage[]>([])

  // Tracks whether the chat history panel is visible.
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false)

  // Check whether the current room has finished initializing.
  const isGameReady = room !== null && readyRoom === room

  // Request chat history and listen for incoming messages.
  useEffect(() => {
    if (!room || !isGameReady) {
      setChatMessages([])
      return
    }

    // Replace the current history with the messages received from the server.
    const handleChatHistory = (messages: ChatHistoryMessage[]) => {
      setChatMessages(messages.slice(-100))
    }

    // Add incoming messages to the history.
    const handleChatMessage = (message: ChatMessage) => {
      setChatMessages((currentMessages) =>
        [
          ...currentMessages,
          {
            sessionId: message.sessionId,
            name: message.name,
            text: message.text,
            timestamp: message.timestamp,
          },
        ].slice(-100),
      )
    }

    // Register message listeners before requesting history.
    const unsubscribeHistory = room.onMessage('chat-history', handleChatHistory)

    const unsubscribeChat = room.onMessage('chat', handleChatMessage)

    // Request the existing chat history.
    room.send('chat-history-request')

    // Remove listeners when the room changes or the component unmounts.
    return () => {
      unsubscribeHistory()
      unsubscribeChat()
    }
  }, [room, isGameReady])

  // Close the chat history when leaving a room.
  useEffect(() => {
    if (!room) {
      setIsChatHistoryOpen(false)
    }
  }, [room])

  // Notify the interface when the game has finished initializing.
  const handleGameReady = useCallback(() => {
    setReadyRoom(room)
  }, [room])

  // Scale the game interface to fit the available space.
  const { containerRef: gameInterfaceViewportRef, scale: gameInterfaceScale } =
    useScaledStage<HTMLDivElement>(1100, 686.125)

  // Notify the parent whenever the game interface scale changes.
  useEffect(() => {
    onScaleChange(gameInterfaceScale)
  }, [gameInterfaceScale, onScaleChange])

  // Disable toolbar interactions while a dialogue is open.
  const isDialogueOpen = isReconnecting || Boolean(connectionError)

  return (
    // Outer viewport: measures the available space.
    <div className="game-interface-viewport" ref={gameInterfaceViewportRef}>
      {/* Inner stage: gets scaled to fit the viewport. */}
      <div
        className="game-interface"
        style={{
          transform: `translateX(-50%) scale(${gameInterfaceScale})`,
        }}
      >
        {/* Cover the entire interface while the game initializes. */}
        {room && !isGameReady && (
          <div className="loading-screen">
            <div className="loading-spinner" />
            <p>Loading {roomName || 'Room'}...</p>
          </div>
        )}

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
                <Suspense fallback={null}>
                  <Game
                    room={room}
                    notifications={notifications}
                    characterType={characterType!}
                    displayName={displayName}
                    onReady={handleGameReady}
                  />
                </Suspense>

                {/* Display chat history above the game world. */}
                {isChatHistoryOpen && (
                  <div className="chat-history-panel">
                    <ChatHistory messages={chatMessages} />
                  </div>
                )}
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
            <ChatBar
              room={room}
              isDisabled={isDialogueOpen}
              isChatHistoryOpen={isChatHistoryOpen}
              onToggleChatHistory={() =>
                setIsChatHistoryOpen((isOpen) => !isOpen)
              }
            />
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
              canJoin={canJoin}
              joinError={joinError}
              onJoin={onJoin}
            />
          </div>
        )}

        {/* Display connection status and recovery options during gameplay. */}
        {room && (
          <ConnectionOverlay
            isReconnecting={isReconnecting}
            connectionError={connectionError}
            onReturn={onReturn}
          />
        )}
      </div>
    </div>
  )
}

export default GameInterface
