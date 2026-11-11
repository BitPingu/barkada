import type { CharacterType } from '../game/objects/PlayerCharacter'
import CharacterPreview from '../game/CharacterPreview'
import { useEffect, useRef } from 'react'

type CharacterSelectionProps = {
  characterType: CharacterType | null
  setCharacterType: (type: CharacterType) => void
  displayName: string
  setDisplayName: (name: string) => void
  isJoining: boolean
  joinError: string | null
  onJoin: () => void
}

function CharacterSelection({
  characterType,
  setCharacterType,
  displayName,
  setDisplayName,
  isJoining,
  joinError,
  onJoin,
}: CharacterSelectionProps) {
  // Reference the display-name input.
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Clear any existing text selection when joining begins.
  useEffect(() => {
    if (isJoining) {
      // Remove any selected text from the page.
      window.getSelection()?.removeAllRanges()

      // Remove focus from the display-name input.
      nameInputRef.current?.blur()
    }
  }, [isJoining])

  return (
    <section className="character-selection">
      <h2>Welcome to barkada!</h2>

      <div className="display-name-field">
        <label htmlFor="display-name">What should we call you?</label>
        <input
          ref={nameInputRef}
          id="display-name"
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Enter a name"
          maxLength={16}
          disabled={isJoining}
        />
      </div>

      <p>Choose a character</p>

      <div
        className="character-options"
        onContextMenu={(event) => event.preventDefault()}
      >
        <button
          className={`character-option ${
            characterType === 'boy' ? 'selected' : ''
          }`}
          onClick={() => setCharacterType('boy')}
          aria-pressed={characterType === 'boy'}
          disabled={isJoining}
        >
          <CharacterPreview characterType="boy" />
        </button>

        <button
          className={`character-option ${
            characterType === 'girl' ? 'selected' : ''
          }`}
          onClick={() => setCharacterType('girl')}
          aria-pressed={characterType === 'girl'}
          disabled={isJoining}
        >
          <CharacterPreview characterType="girl" />
        </button>
      </div>

      <button
        className="join-button"
        onClick={onJoin}
        disabled={!characterType || !displayName.trim() || isJoining}
      >
        {isJoining ? 'Joining...' : 'Join Game'}
      </button>
      <p className={`join-error ${joinError ? 'visible' : ''}`}>
        {joinError || '\u00A0'}
      </p>
    </section>
  )
}

export default CharacterSelection
