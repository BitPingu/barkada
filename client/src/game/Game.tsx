import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import type { Room } from '@colyseus/sdk'
import type { MyRoomState } from './types'
import TownScene from './scenes/TownScene'
import type { CharacterType } from './objects/PlayerCharacter'

// Defines the props passed from React.
interface GameProps {
  room: Room<MyRoomState> // require Colyseus room
  characterType: CharacterType
}

// Initializes and manages the Phaser game.
export default function Game({ room, characterType }: GameProps) {
  // Reference to div.
  const gameRef = useRef<HTMLDivElement>(null)

  // Runs after rendering.
  useEffect(() => {
    if (!gameRef.current) return

    let active = true

    // Create Phaser game instance on a canvas.
    const game = new Phaser.Game({
      type: Phaser.AUTO, // rendering method
      width: 960,
      height: 540,
      parent: gameRef.current, // HTML element to contain the canvas
      backgroundColor: '#ccecff',
      antialias: true,
      scene: [], // scenes to load
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    })

    // Start the town scene once Phaser is ready.
    game.events.once(Phaser.Core.Events.READY, () => {
      if (!active) return

      // Pass the Colyseus room connection to the scene.
      game.scene.add('TownScene', TownScene, true, { room, characterType })
    })

    // Clean up.
    return () => {
      active = false
      game.destroy(true)
    }
  }, [room])

  // HTML element Phaser uses as parent
  return <div ref={gameRef} />
}
