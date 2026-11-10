import { useEffect, useRef, useState } from 'react'
import type { Room } from '@colyseus/sdk'

type ChatBarProps = {
  room: Room
  isDisabled: boolean
}

// Emojis available in the picker.
const EMOJIS = [
  '😀',
  '😂',
  '😭',
  '😮',
  '😡',
  '🥺',
  '❤️',
  '🔥',
  '🎶',
  '👍',
  '👋',
  '🙏',
]

function ChatBar({ room, isDisabled }: ChatBarProps) {
  // Store the message currently being typed.
  const [chatInput, setChatInput] = useState('')

  // Tracks whether the chat is currently on cooldown.
  const [isChatCoolingDown, setIsChatCoolingDown] = useState(false)

  // Tracks whether the emoji picker is visible.
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)

  // References the emoji button and picker.
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  // Close the emoji picker when clicking outside the emoji controls.
  useEffect(() => {
    // Handle clicks anywhere on the page.
    function handleClickOutside(event: MouseEvent) {
      // Check whether the click happened outside the emoji controls.
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        // Close the emoji picker.
        setIsEmojiPickerOpen(false)
      }
    }

    // Listen for mouse clicks.
    document.addEventListener('mousedown', handleClickOutside)

    // Remove the listener when the component unmounts.
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Close the emoji picker when pressing Escape.
  useEffect(() => {
    // Handle keyboard input.
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsEmojiPickerOpen(false)
      }
    }

    // Listen for keyboard input.
    document.addEventListener('keydown', handleKeyDown)

    // Remove the listener when the component unmounts.
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Send a chat message to the server.
  function sendMessage() {
    const text = chatInput.trim()

    // Don't send empty messages or messages when disconnected or cooling down.
    if (!text || !room || isChatCoolingDown) {
      return
    }

    // Send the message to the Colyseus room.
    room.send('chat', { text })

    // Activate the chat cooldown.
    setIsChatCoolingDown(true)

    // Re-enable chat after 0.6 seconds.
    setTimeout(() => {
      setIsChatCoolingDown(false)
    }, 600)

    // Clear the input after sending.
    setChatInput('')
  }

  // Send an emoji to the server.
  function sendEmoji(emoji: string) {
    // Don't send emojis when disconnected or cooling down.
    if (!room || isChatCoolingDown) {
      return
    }

    // Send the selected emoji to the server.
    room.send('emoji', { emoji })

    // Activate the chat cooldown.
    setIsChatCoolingDown(true)

    // Re-enable chat after 0.6 seconds.
    setTimeout(() => {
      setIsChatCoolingDown(false)
    }, 600)

    // Close the emoji picker.
    setIsEmojiPickerOpen(false)
  }

  return (
    <div className="chat-bar" inert={isDisabled}>
      {/* Emoji controls */}
      <div className="emoji-controls" ref={emojiPickerRef}>
        {/* Emoji button */}
        <button
          className="chat-action"
          aria-label="Emojis"
          title="Emojis"
          onClick={() => setIsEmojiPickerOpen((open) => !open)}
          disabled={!room}
        >
          ☺
        </button>

        {/* Emoji picker */}
        {isEmojiPickerOpen && (
          <div className="emoji-picker">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                className="emoji-option"
                onClick={() => sendEmoji(emoji)}
                disabled={isChatCoolingDown}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Message input */}
      <input
        type="text"
        placeholder="Say something..."
        aria-label="Chat message"
        value={chatInput}
        onChange={(event) => setChatInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            sendMessage()
          }
        }}
        maxLength={100}
        disabled={!room}
      />

      {/* Send button */}
      <button
        className="chat-action send-button"
        onClick={sendMessage}
        disabled={!room || !chatInput.trim() || isChatCoolingDown}
      >
        Send
      </button>

      {/* Player list — functionality will be added later. */}
      <button className="chat-action" aria-label="Players" title="Players">
        👥
      </button>

      {/* Profile — functionality will be added later. */}
      <button
        className="chat-action"
        aria-label="My Profile"
        title="My Profile"
      >
        👤
      </button>

      {/* Settings — functionality will be added later. */}
      <button className="chat-action" aria-label="Settings" title="Settings">
        ⚙
      </button>
    </div>
  )
}

export default ChatBar
