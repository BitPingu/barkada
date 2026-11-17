import Phaser from 'phaser'
import type { Room } from '@colyseus/sdk'
import type { GameRoomState } from '../types'

// Handles point-and-click movement input for the local player.
export default class MovementController {
  // Stores the active Phaser scene.
  private scene: Phaser.Scene

  // Stores the Colyseus room connection.
  private room: Room<GameRoomState>

  // Stores the local player's character.
  private player: Phaser.GameObjects.Container

  // Handles the player's first movement callback.
  private onFirstMovement: () => void

  // Tracks whether the movement controller is ready to accept input.
  private isReady = false

  constructor(
    scene: Phaser.Scene,
    room: Room<GameRoomState>,
    player: Phaser.GameObjects.Container,
    onFirstMovement: () => void,
  ) {
    this.scene = scene
    this.room = room
    this.player = player
    this.onFirstMovement = onFirstMovement
  }

  // Set up point-and-click movement controls.
  setup() {
    this.scene.input.on('pointerdown', this.handlePointerDown)

    // Enable movement after the scene completes its first update cycle.
    this.scene.events.once(Phaser.Scenes.Events.POST_UPDATE, () => {
      this.isReady = true
    })
  }

  // Handle clicks that request player movement.
  private handlePointerDown = (pointer: Phaser.Input.Pointer) => {
    // Ignore movement input until the scene is fully initialized.
    if (!this.isReady) return

    // Get the original browser pointer event.
    const pointerEvent = pointer.event

    // Get the first touch when the event is a touch event.
    const touch =
      'changedTouches' in pointerEvent
        ? pointerEvent.changedTouches[0]
        : undefined

    // Get the browser coordinates of the pointer.
    const clientX =
      'clientX' in pointerEvent ? pointerEvent.clientX : touch?.clientX
    const clientY =
      'clientY' in pointerEvent ? pointerEvent.clientY : touch?.clientY

    // Get the canvas boundaries.
    const canvasBounds = this.scene.game.canvas.getBoundingClientRect()

    // Ignore pointer input with invalid browser coordinates.
    if (
      clientX === undefined ||
      clientY === undefined ||
      canvasBounds.width <= 0 ||
      canvasBounds.height <= 0
    ) {
      return
    }

    // Convert browser coordinates into game world coordinates.
    const worldX = ((clientX - canvasBounds.left) / canvasBounds.width) * 960
    const worldY = ((clientY - canvasBounds.top) / canvasBounds.height) * 540

    // Keep the destination within the walkable area.
    const x = Phaser.Math.Clamp(worldX, 25, 935)
    const y = Phaser.Math.Clamp(worldY, 170, 520)

    // Calculate distance to destination.
    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      x,
      y,
    )

    // Ignore movement requests that are too close.
    if (distance < 5) return

    // Hide the movement hint after the first valid movement click.
    this.onFirstMovement()

    const direction = x < this.player.x ? -1 : 1

    // Flip only the character graphics.
    const playerGraphics = this.player.getByName('body')

    if (playerGraphics instanceof Phaser.GameObjects.Graphics) {
      playerGraphics.setScale(direction, 1)
    }

    // Send the movement request to the server.
    this.room.send('move', { x, y })
  }

  // Remove the movement input listener.
  destroy() {
    this.scene.input.off('pointerdown', this.handlePointerDown)
  }
}
