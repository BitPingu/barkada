import type { CharacterType } from '../game/objects/PlayerCharacter'
import CharacterPreview from '../game/CharacterPreview'

type CharacterSelectionProps = {
  characterType: CharacterType | null
  setCharacterType: (type: CharacterType) => void
  isJoining: boolean
  joinError: string | null
  onJoin: () => void
}

function CharacterSelection({
  characterType,
  setCharacterType,
  isJoining,
  joinError,
  onJoin,
}: CharacterSelectionProps) {
  return (
    <section className="character-selection">
      <h2>Welcome to barkada!</h2>
      <p>Select a character to enter.</p>

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
        disabled={!characterType || isJoining}
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
