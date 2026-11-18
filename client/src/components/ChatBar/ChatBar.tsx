import { useEffect, useRef, useState } from 'react'
import type { Room } from '@colyseus/sdk'
import type { GameRoomState, PlayerState } from '../../game/types'
import { Smile, Send, Users, UserRound, Settings } from 'lucide-react'
import { FluentEmoji } from '@lobehub/fluent-emoji'
import './ChatBar.css'

type ChatBarProps = {
  room: Room<GameRoomState>
  currentPlayerSessionId: string
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

function ChatBar({ room, currentPlayerSessionId, isDisabled }: ChatBarProps) {
  // Store the message currently being typed.
  const [chatInput, setChatInput] = useState('')

  // Tracks which room is currently on chat cooldown.
  const [cooldownRoom, setCooldownRoom] = useState<Room | null>(null)

  // Check whether the current room is on chat cooldown.
  const isChatCoolingDown = cooldownRoom === room

  // Tracks whether the emoji picker is visible.
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)

  // Tracks whether the players panel is visible.
  const [isPlayersPanelOpen, setIsPlayersPanelOpen] = useState(false)

  // Stores the players currently connected to the room.
  const [players, setPlayers] = useState<Array<[string, PlayerState]>>([])

  // References the players button and panel.
  const playersPanelRef = useRef<HTMLDivElement>(null)

  // References the emoji button and picker.
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  // References the chat cooldown timeout.
  const cooldownTimeoutRef = useRef<number | null>(null)

  // Close the emoji picker when clicking outside the emoji controls.
  useEffect(() => {
    // Handle clicks anywhere on the page.
    function handleClickOutside(event: MouseEvent) {
      // Check whether the click happened outside the emoji controls.
      if (
        isEmojiPickerOpen &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        // Notify the server that the player interacted with the emoji picker.
        room.send('activity')

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
  }, [isEmojiPickerOpen, room])

  // Close the emoji picker when pressing Escape.
  useEffect(() => {
    // Handle keyboard input.
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isEmojiPickerOpen) {
        // Notify the server that the player interacted with the emoji picker.
        room.send('activity')

        // Close the emoji picker.
        setIsEmojiPickerOpen(false)
      }
    }

    // Listen for keyboard input.
    document.addEventListener('keydown', handleKeyDown)

    // Remove the listener when the component unmounts.
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isEmojiPickerOpen, room])

  // Close the players panel when clicking outside its controls.
  useEffect(() => {
    // Handle clicks anywhere on the page.
    function handleClickOutside(event: MouseEvent) {
      if (
        isPlayersPanelOpen &&
        playersPanelRef.current &&
        !playersPanelRef.current.contains(event.target as Node)
      ) {
        // Notify the server that the player interacted with the panel.
        room.send('activity')

        // Close the players panel.
        setIsPlayersPanelOpen(false)
      }
    }

    // Listen for mouse clicks.
    document.addEventListener('mousedown', handleClickOutside)

    // Remove the listener when the component unmounts.
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isPlayersPanelOpen, room])

  // Close the players panel when pressing Escape.
  useEffect(() => {
    // Handle keyboard input.
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isPlayersPanelOpen) {
        // Notify the server that the player interacted with the panel.
        room.send('activity')

        // Close the players panel.
        setIsPlayersPanelOpen(false)
      }
    }

    // Listen for keyboard input.
    document.addEventListener('keydown', handleKeyDown)

    // Remove the listener when the component unmounts.
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isPlayersPanelOpen, room])

  // Update the player list whenever the room state changes.
  useEffect(() => {
    // Refresh the list using the latest synchronized room state.
    const updatePlayers = () => {
      const roomPlayers = room.state?.players

      setPlayers(roomPlayers ? Array.from(roomPlayers.entries()) : [])
    }

    // Subscribe to room state updates.
    const stateChangeListener = room.onStateChange(updatePlayers)

    // Capture the current player list.
    updatePlayers()

    // Remove the listener when the room changes or component unmounts.
    return () => {
      stateChangeListener.remove(updatePlayers)
    }
  }, [room])

  // Clear the cooldown timeout when the component unmounts.
  useEffect(() => {
    return () => {
      if (cooldownTimeoutRef.current !== null) {
        window.clearTimeout(cooldownTimeoutRef.current)
      }
    }
  }, [])

  // Notify the server that the player interacted with the interface.
  function reportActivity() {
    room.send('activity')
  }

  // Activate the chat cooldown and re-enable chat after 0.6 seconds.
  function startChatCooldown() {
    // Clear any existing cooldown timeout.
    if (cooldownTimeoutRef.current !== null) {
      window.clearTimeout(cooldownTimeoutRef.current)
    }

    setCooldownRoom(room)

    cooldownTimeoutRef.current = window.setTimeout(() => {
      setCooldownRoom(null)
      cooldownTimeoutRef.current = null
    }, 600)
  }

  // Send a chat message to the server.
  function sendMessage() {
    const text = chatInput.trim()

    // Don't send empty messages or messages when cooling down.
    if (!text || isChatCoolingDown) {
      return
    }

    // Send the message to the Colyseus room.
    room.send('chat', { text })

    // Start the chat cooldown.
    startChatCooldown()

    // Clear the input after sending.
    setChatInput('')
  }

  // Send an emoji to the server.
  function sendEmoji(emoji: string) {
    // Don't send emojis when cooling down.
    if (isChatCoolingDown) {
      return
    }

    // Send the selected emoji to the server.
    room.send('emoji', { emoji })

    // Start the chat cooldown.
    startChatCooldown()

    // Close the emoji picker.
    setIsEmojiPickerOpen(false)
  }

  return (
    <div className="chat-bar" inert={isDisabled}>
      {/* Emoji controls */}
      <div className="emoji-controls" ref={emojiPickerRef}>
        {/* Emoji button */}
        <button
          type="button"
          className="chat-action"
          aria-label="Emojis"
          aria-expanded={isEmojiPickerOpen}
          aria-controls="emoji-picker"
          title="Emojis"
          onClick={() => {
            // Notify the server that the player interacted with the emoji picker.
            room.send('activity')

            setIsEmojiPickerOpen((open) => !open)
          }}
        >
          <Smile size={20} />
        </button>

        {/* Emoji picker */}
        <div
          id="emoji-picker"
          className="emoji-picker"
          role="group"
          aria-label="Choose an emoji"
          style={{ display: isEmojiPickerOpen ? undefined : 'none' }}
          aria-hidden={!isEmojiPickerOpen}
        >
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="emoji-option"
              onClick={() => sendEmoji(emoji)}
              disabled={isChatCoolingDown}
            >
              <FluentEmoji emoji={emoji} type="flat" size={28} />
            </button>
          ))}
        </div>
      </div>

      {/* Message input */}
      <input
        type="text"
        placeholder="Say something..."
        aria-label="Chat message"
        value={chatInput}
        onFocus={reportActivity}
        onChange={(event) => {
          reportActivity()
          setChatInput(event.target.value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            sendMessage()
          }
        }}
        maxLength={100}
      />

      {/* Send button */}
      <button
        type="button"
        className="chat-action send-button"
        onClick={sendMessage}
        disabled={!chatInput.trim() || isChatCoolingDown}
      >
        <Send size={18} />
      </button>

      {/* Players panel controls */}
      <div className="players-controls" ref={playersPanelRef}>
        {/* Players button */}
        <button
          type="button"
          className="chat-action"
          aria-label="Players"
          aria-expanded={isPlayersPanelOpen}
          aria-controls="players-panel"
          title="Players"
          onClick={() => {
            reportActivity()
            setIsPlayersPanelOpen((open) => !open)
          }}
        >
          <Users size={20} />
        </button>

        {/* Players panel */}
        <div
          id="players-panel"
          className="players-panel"
          role="region"
          aria-label="Connected players"
          style={{ display: isPlayersPanelOpen ? undefined : 'none' }}
          aria-hidden={!isPlayersPanelOpen}
        >
          {/* Panel heading */}
          <div className="players-panel-header">
            <span>Players</span>
            <span className="players-count">{players.length}</span>
          </div>

          {/* Connected player list */}
          <div className="players-list">
            {players.map(([sessionId, player]) => (
              <div className="player-entry" key={sessionId}>
                <div
                  className={`player-avatar player-avatar-${player.characterType}`}
                  aria-hidden="true"
                />

                <span className="player-name">{player.name || 'Guest'}</span>

                {sessionId === currentPlayerSessionId && (
                  <span className="player-you">You</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profile — functionality will be added later. */}
      <button
        type="button"
        className="chat-action"
        aria-label="My Profile"
        title="My Profile"
        onClick={reportActivity}
      >
        <UserRound size={20} />
      </button>

      {/* Settings — functionality will be added later. */}
      <button
        type="button"
        className="chat-action"
        aria-label="Settings"
        title="Settings"
        onClick={reportActivity}
      >
        <Settings size={20} />
      </button>
    </div>
  )
}

export default ChatBar
