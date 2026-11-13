import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import type { Room } from '@colyseus/sdk'
import type { GameRoomState, Notification } from './types'
import RoomScene from './scenes/RoomScene'
import type { CharacterType } from './objects/PlayerCharacter'
import { MousePointerClick } from 'lucide-react'

// Defines the props passed from React.
interface GameProps {
  room: Room<GameRoomState>
  notifications: Notification[]
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
  // References the container for the Phaser canvas.
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

  // Initialize the Phaser game.
  useEffect(() => {
    if (!gameRef.current) return

    let active = true

    // Create the Phaser game instance.
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 960,
      height: 540,
      parent: gameRef.current,
      backgroundColor: '#ccecff',
      antialias: true,
      scene: [],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    })

    // Start the room scene once Phaser is ready.
    game.events.once(Phaser.Core.Events.READY, () => {
      if (!active) return

      // Register the room scene without starting it.
      game.scene.add('RoomScene', RoomScene, false)

      const roomScene = game.scene.getScene('RoomScene')

      // Wait until the room scene has finished creating.
      roomScene.events.once(Phaser.Scenes.Events.CREATE, () => {
        if (active) {
          onReady()
        }
      })

      // Start the room scene.
      game.scene.start('RoomScene', {
        room,
        characterType,
        displayName,
        onFirstMovement: () => {
          setIsMovementHintFading(true)
        },
      })
    })

    // Clean up the Phaser game instance.
    return () => {
      active = false
      game.destroy(true)
    }
  }, [room, characterType, displayName, onReady])

  // Renders the Phaser canvas and game interface.
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
