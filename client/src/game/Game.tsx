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

  // Tracks the notification stack container.
  const notificationStackRef = useRef<HTMLDivElement>(null)

  // Stores notification positions before the stack changes.
  const previousPositions = useRef(new Map<number, DOMRect>())

  // Stores the active game notifications.
  const [notifications, setNotifications] = useState<
    { id: number; message: string }[]
  >([])

  // Generates unique IDs for notifications.
  const notificationId = useRef(0)

  // Tracks the timeout for each notification.
  const notificationTimeouts = useRef(new Map<number, number>())

  // Controls whether the movement hint is displayed.
  const [showMovementHint, setShowMovementHint] = useState(true)

  // Tracks whether the movement hint is fading out.
  const [isMovementHintFading, setIsMovementHintFading] = useState(false)

  // Adds a notification to the notification list.
  function addNotification(message: string) {
    const id = ++notificationId.current

    setNotifications((current) => [...current, { id, message }])
  }

  // Clears any remaining notification timers when the component unmounts.
  useEffect(() => {
    const timeouts = notificationTimeouts.current

    return () => {
      timeouts.forEach((timeout) => {
        window.clearTimeout(timeout)
      })

      timeouts.clear()
    }
  }, [])

  // Starts the dismissal timer for each of the first three notifications.
  useEffect(() => {
    notifications.slice(0, 3).forEach(({ id }) => {
      // Don't restart a timer if the notification is already visible.
      if (notificationTimeouts.current.has(id)) return

      const timeout = window.setTimeout(() => {
        setNotifications((current) =>
          current.filter((notification) => notification.id !== id),
        )

        notificationTimeouts.current.delete(id)
      }, 3000)

      notificationTimeouts.current.set(id, timeout)
    })
  }, [notifications])

  // Animates notifications when their positions change.
  useLayoutEffect(() => {
    const stack = notificationStackRef.current
    if (!stack) return

    const elements = stack.querySelectorAll<HTMLElement>(
      '.game-notification-wrapper',
    )

    const currentPositions = new Map<number, DOMRect>()

    elements.forEach((element) => {
      const id = Number(element.dataset.notificationId)
      const currentPosition = element.getBoundingClientRect()
      const previousPosition = previousPositions.current.get(id)

      currentPositions.set(id, currentPosition)

      if (!previousPosition) return

      const offsetY = previousPosition.top - currentPosition.top

      if (offsetY === 0) return

      // Temporarily move the notification back to its previous position.
      element.style.transition = 'none'
      element.style.transform = `translateY(${offsetY}px)`

      // Force the browser to apply the starting position.
      element.getBoundingClientRect()

      // Animate the notification into its new position.
      requestAnimationFrame(() => {
        element.style.transition =
          'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)'
        element.style.transform = ''
      })
    })

    previousPositions.current = currentPositions
  }, [notifications])

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
          addNotification(`${name} joined the game!`)
        },
        onPlayerLeft: (name: string) => {
          addNotification(`${name} left the game!`)
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
