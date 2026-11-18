import { useEffect, useRef, useState } from 'react'
import type { Room } from '@colyseus/sdk'
import type { GameRoomState, PlayerState } from '../../game/types'
import CharacterPreview from '../../game/CharacterPreview'
import { Smile, Send, Users, UserRound } from 'lucide-react'
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

  // Tracks whether the profile panel is visible.
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false)

  // References the profile button and panel.
  const profilePanelRef = useRef<HTMLDivElement>(null)

  // Stores the players currently connected to the room.
  const [players, setPlayers] = useState<Array<[string, PlayerState]>>([])

  // Retrieve the current player's synchronized data.
  const currentPlayer = players.find(
    ([sessionId]) => sessionId === currentPlayerSessionId,
  )?.[1]

  // References the players button and panel.
  const playersPanelRef = useRef<HTMLDivElement>(null)

  // References the emoji button and picker.
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  // References the chat cooldown timeout.
  const cooldownTimeoutRef = useRef<number | null>(null)

  // Close open panels when clicking outside or pressing Escape.
  useEffect(() => {
    // Handle clicks anywhere on the page.
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      let closedPanel = false

      if (isEmojiPickerOpen && !emojiPickerRef.current?.contains(target)) {
        setIsEmojiPickerOpen(false)
        closedPanel = true
      }

      if (isPlayersPanelOpen && !playersPanelRef.current?.contains(target)) {
        setIsPlayersPanelOpen(false)
        closedPanel = true
      }

      if (isProfilePanelOpen && !profilePanelRef.current?.contains(target)) {
        setIsProfilePanelOpen(false)
        closedPanel = true
      }

      if (closedPanel) {
        room.send('activity')
      }
    }

    // Handle keyboard input.
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return
      }

      if (isEmojiPickerOpen || isPlayersPanelOpen || isProfilePanelOpen) {
        room.send('activity')
        setIsEmojiPickerOpen(false)
        setIsPlayersPanelOpen(false)
        setIsProfilePanelOpen(false)
      }
    }

    // Listen for mouse clicks and keyboard input.
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    // Remove listeners when the component updates or unmounts.
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isEmojiPickerOpen, isPlayersPanelOpen, isProfilePanelOpen, room])

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
            // Toggle the Players panel and close the Profile panel.
            setIsPlayersPanelOpen((open) => !open)
            setIsProfilePanelOpen(false)
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

      {/* Profile controls */}
      <div className="profile-controls" ref={profilePanelRef}>
        <button
          type="button"
          className="chat-action"
          aria-label="My Profile"
          aria-expanded={isProfilePanelOpen}
          aria-controls="profile-panel"
          title="My Profile"
          onClick={() => {
            // Notify the server that the player interacted with the toolbar.
            reportActivity()

            // Toggle the profile panel and close the Players panel.
            setIsProfilePanelOpen((isOpen) => !isOpen)
            setIsPlayersPanelOpen(false)
          }}
        >
          <UserRound size={20} />
        </button>

        {/* Profile panel */}
        {isProfilePanelOpen && currentPlayer && (
          <div
            id="profile-panel"
            className="profile-panel"
            role="region"
            aria-label="Your profile"
          >
            <div className="profile-panel-header">
              <span>My Profile</span>
            </div>

            <div className="profile-panel-content">
              <CharacterPreview characterType={currentPlayer.characterType} />
              <div className="profile-player-name">{currentPlayer.name}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatBar
