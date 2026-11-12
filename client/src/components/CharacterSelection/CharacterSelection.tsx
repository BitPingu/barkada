import type { CharacterType } from '../../game/objects/PlayerCharacter'
import CharacterPreview from '../../game/CharacterPreview'
import { useEffect, useRef } from 'react'
import useScaledStage from '../../hooks/useScaledStage'
import './CharacterSelection.css'

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
  // Scale the character-selection layout to fit the available space.
  const { containerRef: selectionViewportRef, scale } =
    useScaledStage<HTMLElement>()

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
    <section className="character-selection" ref={selectionViewportRef}>
      <div
        className="character-selection-stage"
        style={{
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <div className="character-selection-group">
          <div className="character-selection-content">
            {/* Welcome heading */}
            <h2>Welcome to barkada!</h2>

            {/* Character selection */}
            <div className="character-selection-field">
              <p>Choose a character</p>
              <div
                className="character-options"
                role="group"
                aria-label="Choose your character"
                onContextMenu={(event) => event.preventDefault()}
              >
                <button
                  type="button"
                  className={`character-option ${
                    characterType === 'boy' ? 'selected' : ''
                  }`}
                  onClick={() => setCharacterType('boy')}
                  aria-label="Boy character"
                  aria-pressed={characterType === 'boy'}
                  disabled={isJoining}
                >
                  <CharacterPreview characterType="boy" />
                </button>

                <button
                  type="button"
                  className={`character-option ${
                    characterType === 'girl' ? 'selected' : ''
                  }`}
                  onClick={() => setCharacterType('girl')}
                  aria-label="Girl character"
                  aria-pressed={characterType === 'girl'}
                  disabled={isJoining}
                >
                  <CharacterPreview characterType="girl" />
                </button>
              </div>
            </div>

            {/* Display name field */}
            <div className="display-name-field">
              <label htmlFor="display-name">
                Choose a name for your character
              </label>
              <input
                ref={nameInputRef}
                id="display-name"
                type="text"
                autoComplete="off"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Enter a name"
                maxLength={16}
                disabled={isJoining}
              />
            </div>

            {/* Join Game button */}
            <button
              type="button"
              className="join-button"
              onClick={onJoin}
              disabled={!characterType || !displayName.trim() || isJoining}
            >
              {isJoining ? 'Joining...' : 'Join Game'}
            </button>
          </div>

          {/* Display join errors independently of the main content. */}
          <p
            className={`join-error ${joinError ? 'visible' : ''}`}
            role="alert"
          >
            {joinError || ''}
          </p>
        </div>
      </div>
    </section>
  )
}

export default CharacterSelection
