import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import type { Room } from '@colyseus/sdk'
import type { MyRoomState } from './types'
import TownScene from './scenes/TownScene'
import type { CharacterType } from './objects/PlayerCharacter'
import { MousePointerClick } from 'lucide-react'

// Defines the props passed from React.
interface GameProps {
  room: Room<MyRoomState> // require Colyseus room
  notifications: {
    id: number
    message: string
  }[]
  characterType: CharacterType
  displayName: string
  onReady: () => void
}

// Initializes and manages the Phaser game.
export default function Game({
  room,
  notifications,
  characterType,
  displayName,
  onReady,
}: GameProps) {
  // Reference to div.
  const gameRef = useRef<HTMLDivElement>(null)

  // Tracks the notification stack container.
  const notificationStackRef = useRef<HTMLDivElement>(null)

  // Stores notification positions before the layout changes.
  const previousPositions = useRef(new Map<number, number>())

  // Tracks active notification position animations.
  const notificationAnimations = useRef(new Map<number, Animation>())

  // Controls whether the movement hint is displayed.
  const [showMovementHint, setShowMovementHint] = useState(true)

  // Tracks whether the movement hint is fading out.
  const [isMovementHintFading, setIsMovementHintFading] = useState(false)

  // Animates notifications when their positions change.
  useLayoutEffect(() => {
    const stack = notificationStackRef.current
    if (!stack) return

    // Cancel previous animations before measuring the new layout.
    notificationAnimations.current.forEach((animation) => {
      animation.cancel()
    })

    notificationAnimations.current.clear()

    const elements = stack.querySelectorAll<HTMLElement>(
      '.game-notification-wrapper',
    )

    // Store positions for the current layout.
    const currentPositions = new Map<number, number>()

    elements.forEach((element) => {
      const id = Number(element.dataset.notificationId)
      const currentTop = element.getBoundingClientRect().top
      const previousTop = previousPositions.current.get(id)

      currentPositions.set(id, currentTop)

      if (previousTop === undefined) return

      const offsetY = previousTop - currentTop

      if (offsetY === 0) return

      const animation = element.animate(
        [
          { transform: `translateY(${offsetY}px)` },
          { transform: 'translateY(0)' },
        ],
        {
          duration: 300,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        },
      )

      notificationAnimations.current.set(id, animation)

      // Remove the animation once it finishes.
      animation.onfinish = () => {
        notificationAnimations.current.delete(id)
      }
    })

    // Save positions for comparison with the next layout.
    previousPositions.current = currentPositions
  }, [notifications])

  // Clean up notification animations when the component unmounts.
  useEffect(() => {
    const animations = notificationAnimations.current

    return () => {
      animations.forEach((animation) => {
        animation.cancel()
      })

      animations.clear()
    }
  }, [])

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

  // HTML element Phaser uses as parent
  return (
    <div ref={gameRef} className="game-canvas-container">
      {/* Display active game notifications. */}
      <div className="game-notifications" ref={notificationStackRef}>
        {notifications.slice(0, 3).map(({ id, message }) => (
          <div
            className="game-notification-wrapper"
            data-notification-id={id}
            key={id}
          >
            <div className="game-notification">
              <strong>{message}</strong>
            </div>
          </div>
        ))}
      </div>

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
