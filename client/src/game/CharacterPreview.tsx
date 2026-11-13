import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import {
  createPlayerCharacter,
  type CharacterType,
} from './objects/PlayerCharacter'

interface CharacterPreviewProps {
  characterType: CharacterType
}

// Renders a Phaser character preview for the selected character type.
export default function CharacterPreview({
  characterType,
}: CharacterPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null)

  // Initialize the Phaser preview and recreate it when the character type changes.
  useEffect(() => {
    if (!previewRef.current) return

    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      width: 160,
      height: 160,
      parent: previewRef.current,
      transparent: true,
      scene: {
        create() {
          const character = createPlayerCharacter(
            this,
            80,
            140,
            '',
            characterType,
            false,
          )

          character.setScale(1.4)
        },
      },
    })

    // Destroy the Phaser instance when the preview is removed or updated.
    return () => {
      game.destroy(true)
    }
  }, [characterType])

  return <div ref={previewRef} />
}
