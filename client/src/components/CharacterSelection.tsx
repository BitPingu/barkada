import type { CharacterType } from '../game/objects/PlayerCharacter'
import CharacterPreview from '../game/CharacterPreview'

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
  return (
    <section className="character-selection">
      <h2>Welcome to barkada!</h2>

      <div className="display-name-field">
        <label htmlFor="display-name">What should we call you?</label>
        <input
          id="display-name"
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Enter a name"
          maxLength={16}
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
        >
          <CharacterPreview characterType="boy" />
        </button>

        <button
          className={`character-option ${
            characterType === 'girl' ? 'selected' : ''
          }`}
          onClick={() => setCharacterType('girl')}
          aria-pressed={characterType === 'girl'}
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
