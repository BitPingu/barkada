import Phaser from 'phaser'
import type { Room } from '@colyseus/sdk'
import type { GameRoomState } from '../types'

// Handles point-and-click movement input for the local player.
export default class MovementController {
  private scene: Phaser.Scene
  private room: Room<GameRoomState>
  private player: Phaser.GameObjects.Container
  private onFirstMovement: () => void

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
  }

  // Handle clicks that request player movement.
  private handlePointerDown = (pointer: Phaser.Input.Pointer) => {
    // Get pointer coordinates.
    const x = Phaser.Math.Clamp(pointer.worldX, 25, 935)
    const y = Phaser.Math.Clamp(pointer.worldY, 170, 520)

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
