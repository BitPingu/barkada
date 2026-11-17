import { useEffect, useRef } from 'react'
import type { ChatHistoryMessage } from '../../game/types'

// Defines the props required by the chat history.
interface ChatHistoryProps {
  messages: ChatHistoryMessage[]
}

// Displays the recent chat messages in the room.
export default function ChatHistory({ messages }: ChatHistoryProps) {
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
        messages.map((message, index) => (
          <div
            className="chat-history-message"
            key={`${message.sessionId}-${message.timestamp}-${index}`}
          >
            <strong>{message.name}:</strong> {message.text}
          </div>
        ))
      ) : (
        <p className="chat-history-empty">No messages yet.</p>
      )}
    </div>
  )
}
