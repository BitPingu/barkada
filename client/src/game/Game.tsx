import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import type { Room } from '@colyseus/sdk'
import type { MyRoomState } from './types'
import TownScene from './scenes/TownScene'
import type { CharacterType } from './objects/PlayerCharacter'
import { MousePointerClick } from 'lucide-react'

// Defines the props passed from React.
interface GameProps {
  room: Room<MyRoomState> // require Colyseus room
  characterType: CharacterType
  displayName: string
  onReady: () => void
}

// Initializes and manages the Phaser game.
export default function Game({
  room,
  characterType,
  displayName,
  onReady,
}: GameProps) {
  // Reference to div.
  const gameRef = useRef<HTMLDivElement>(null)

  // Stores the current game notification.
  const [notification, setNotification] = useState<string | null>(null)

  // Controls whether the movement hint is displayed.
  const [showMovementHint, setShowMovementHint] = useState(true)

  // Tracks whether the movement hint is fading out.
  const [isMovementHintFading, setIsMovementHintFading] = useState(false)

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

      // Register the town scene without starting it.
      game.scene.add('TownScene', TownScene, false)

      const townScene = game.scene.getScene('TownScene')

      // Wait until the town has finished creating.
      townScene.events.once(Phaser.Scenes.Events.CREATE, () => {
        if (active) {
          onReady()
        }
      })

      // Start the town scene.
      game.scene.start('TownScene', {
        room,
        characterType,
        displayName,
        onPlayerJoined: (name: string) => {
          setNotification(`${name} joined the game!`)
        },
        onPlayerLeft: (name: string) => {
          setNotification(`${name} left the game!`)
        },
        onFirstMovement: () => {
          setIsMovementHintFading(true)
        },
      })
    })

    // Clean up.
    return () => {
      active = false
      game.destroy(true)
      game.canvas?.remove()
    }
  }, [room, characterType, displayName, onReady])

  // Automatically dismisses the current game notification.
  useEffect(() => {
    if (!notification) return

    // Remove the notification after 3 seconds.
    const timeout = window.setTimeout(() => {
      setNotification(null)
    }, 3000)

    // Clear the timer when the notification changes or the component unmounts.
    return () => {
      window.clearTimeout(timeout)
    }
  }, [notification])

  // HTML element Phaser uses as parent
  return (
    <div ref={gameRef} className="game-canvas-container">
      {/* Display the current game notification. */}
      {notification && (
        <div className="game-notification">
          <strong>{notification}</strong>
        </div>
      )}

      {/* Display the movement hint. */}
      {showMovementHint && (
        <div
          className={`movement-hint ${isMovementHintFading ? 'fading' : ''}`}
          onAnimationEnd={() => setShowMovementHint(false)}
        >
          <MousePointerClick className="movement-hint-icon" />
          <strong>Click anywhere to move</strong>
        </div>
      )}
    </div>
  )
}
