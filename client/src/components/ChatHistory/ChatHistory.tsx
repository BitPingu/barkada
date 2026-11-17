import { useEffect, useRef } from 'react'
import type { ChatHistoryMessage } from '../../game/types'
import './ChatHistory.css'

// Defines the props required by the chat history.
interface ChatHistoryProps {
  messages: ChatHistoryMessage[]
  currentPlayerSessionId: string
}

// Displays the recent chat messages in the room.
export default function ChatHistory({
  messages,
  currentPlayerSessionId,
}: ChatHistoryProps) {
  // Track the chat history container.
  const chatHistoryRef = useRef<HTMLDivElement>(null)

  // Scroll to the newest message whenever the history changes.
  useEffect(() => {
    const chatHistory = chatHistoryRef.current

    if (chatHistory) {
      chatHistory.scrollTop = chatHistory.scrollHeight
    }
  }, [messages])

  return (
    <div
      className="chat-history"
      ref={chatHistoryRef}
      role="log"
      aria-label="Chat history"
      aria-live="polite"
    >
      {messages.length > 0 ? (
        messages.map((message, index) => {
          // Check whether the message belongs to the current player.
          const isCurrentPlayer =
            message.type === 'chat' &&
            message.sessionId === currentPlayerSessionId

          // Check whether the message is a system event.
          const isSystemMessage = message.type !== 'chat'

          return (
            <div
              className={`chat-history-message ${
                isSystemMessage
                  ? 'system-message'
                  : isCurrentPlayer
                    ? 'current-player'
                    : ''
              }`}
              key={`${message.sessionId}-${message.timestamp}-${index}`}
            >
              {isSystemMessage ? (
                <span>{message.text}</span>
              ) : (
                <>
                  <strong>{message.name}:</strong> {message.text}
                </>
              )}
            </div>
          )
        })
      ) : (
        <p className="chat-history-empty">No messages yet.</p>
      )}
    </div>
  )
}
