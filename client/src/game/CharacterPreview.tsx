import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import {
  createPlayerCharacter,
  type CharacterType,
} from './objects/PlayerCharacter'

interface CharacterPreviewProps {
  characterType: CharacterType
}

export default function CharacterPreview({
  characterType,
}: CharacterPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null)

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
            120,
            '',
            characterType,
            false,
          )

          character.setScale(1.4)
        },
      },
    })

    return () => {
      game.destroy(true)
      game.canvas?.remove()
    }
  }, [characterType])

  return <div ref={previewRef} />
}
