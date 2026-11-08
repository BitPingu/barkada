import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import type { Room } from '@colyseus/sdk'
import type { MyRoomState } from './types'

// Defines the props passed from React.
interface GameProps {
  room: Room<MyRoomState> // require Colyseus room
}

// Initializes Phaser and creates the game canvas.

// Creates and manages the town environment.
class TownScene extends Phaser.Scene {
  // Stores a reference to the player's character.
  private player!: Phaser.GameObjects.Container

  // Stores the Colyseus room connection.
  private room!: Room<MyRoomState>

  // Stores characters belonging to other players.
  private remotePlayers = new Map<string, Phaser.GameObjects.Container>()

  // Stores the last synchronized destination for each player.
  private playerTargets = new Map<string, { x: number; y: number }>()

  // Stores the circle displayed when the player clicks somewhere to move.
  private destinationMarker?: Phaser.GameObjects.Container

  // Initialize the scene.
  constructor() {
    super('TownScene')
  }

  // Receives the Colyseus room connection.
  init(data: { room: Room<MyRoomState> }) {
    // access to room connection
    this.room = data.room
    console.log('Connected to room:', data.room.roomId)
  }

  // Creates a reusable player character.
  private createPlayerCharacter(x: number, y: number, name: string) {
    // Create placeholder human character
    const player = this.add.container(x, y)

    const body = this.add.graphics()
    const arms = this.add.container(0, 0)
    const legs = this.add.container(0, 0)

    const leftArm = this.add.graphics() as Phaser.GameObjects.Graphics
    const rightArm = this.add.graphics() as Phaser.GameObjects.Graphics

    const leftLeg = this.add.graphics() as Phaser.GameObjects.Graphics
    const rightLeg = this.add.graphics() as Phaser.GameObjects.Graphics

    // Draw the left leg.
    leftLeg.fillStyle(0x26384b)
    leftLeg.fillRoundedRect(-8, -3, 7, 17, 3)

    // Draw the left shoe.
    leftLeg.fillStyle(0x59402e)
    leftLeg.fillEllipse(-5, 14, 13, 7)

    // Draw the right leg.
    rightLeg.fillStyle(0x26384b)
    rightLeg.fillRoundedRect(1, -3, 7, 17, 3)

    // Draw the right shoe.
    rightLeg.fillStyle(0x59402e)
    rightLeg.fillEllipse(5, 14, 13, 7)

    // Add both legs to the legs container.
    legs.add([leftLeg, rightLeg])

    // Position the left arm at the shoulder.
    leftArm.setPosition(-12.5, -23)

    // Draw the left arm and hand.
    leftArm.fillStyle(0x3979b8)
    leftArm.fillRoundedRect(-4.5, 0, 9, 22, 5)

    leftArm.fillStyle(0xe8b18b)
    leftArm.fillCircle(0, 21, 5)

    // Position the right arm at the shoulder.
    rightArm.setPosition(12.5, -23)

    // Draw the right arm and hand.
    rightArm.fillStyle(0x3979b8)
    rightArm.fillRoundedRect(-4.5, 0, 9, 22, 5)

    rightArm.fillStyle(0xe8b18b)
    rightArm.fillCircle(0, 21, 5)

    // Add both arms to the arms container.
    arms.add([leftArm, rightArm])

    // Small body
    body.fillStyle(0x3979b8)
    body.fillRoundedRect(-11, -27, 22, 29, 8)

    // Neck
    body.fillStyle(0xe8b18b)
    body.fillRoundedRect(-5, -34, 10, 10, 3)

    // Ears
    body.fillStyle(0xe8b18b)
    body.fillCircle(-19, -45, 5)
    body.fillCircle(19, -45, 5)

    // Oversized head
    body.fillStyle(0xe8b18b)
    body.fillCircle(0, -48, 22)

    // Hair
    body.fillStyle(0x38251b)
    body.fillEllipse(0, -62, 40, 21)
    body.fillEllipse(-14, -56, 14, 19)
    body.fillEllipse(14, -56, 14, 19)

    // Hair fringe
    body.fillTriangle(-15, -55, 0, -49, -5, -61)
    body.fillTriangle(0, -55, 14, -49, 8, -62)

    // Eyes
    body.fillStyle(0xffffff)
    body.fillEllipse(-8, -46, 8, 11)
    body.fillEllipse(8, -46, 8, 11)

    body.fillStyle(0x26384b)
    body.fillCircle(-8, -45, 3)
    body.fillCircle(8, -45, 3)

    // Eye highlights
    body.fillStyle(0xffffff)
    body.fillCircle(-9, -47, 1.5)
    body.fillCircle(7, -47, 1.5)

    // Blush
    body.fillStyle(0xe98b83, 0.6)
    body.fillEllipse(-14, -37, 7, 4)
    body.fillEllipse(14, -37, 7, 4)

    // Small smile
    body.lineStyle(1.5, 0x8c493c)
    body.beginPath()
    body.arc(0, -36, 3, 0.2, Math.PI - 0.2, false)
    body.strokePath()

    // Display the player's name above their character.
    const nameLabel = this.add.text(0, 30, name, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
      stroke: '#26384b',
      strokeThickness: 3,
      align: 'center',
    })

    // Center the name label below the character.
    nameLabel.setOrigin(0.5, 0.5)

    // Assemble the player character.
    player.add([legs, body, arms, nameLabel])

    // Set the player's rendering depth.
    player.setDepth(y)

    return player
  }

  // Animates the player's limbs while walking.
  private startWalkingAnimation(character: Phaser.GameObjects.Container) {
    const legs = character.getAt(0) as Phaser.GameObjects.Container
    const arms = character.getAt(2) as Phaser.GameObjects.Container

    const leftLeg = legs.getAt(0) as Phaser.GameObjects.Graphics
    const rightLeg = legs.getAt(1) as Phaser.GameObjects.Graphics

    const leftArm = arms.getAt(0) as Phaser.GameObjects.Graphics
    const rightArm = arms.getAt(1) as Phaser.GameObjects.Graphics

    // Stop any previous limb animations.
    this.tweens.killTweensOf([leftLeg, rightLeg, leftArm, rightArm])

    // Reset limbs to their idle positions.
    leftLeg.setAngle(0)
    rightLeg.setAngle(0)
    leftArm.setAngle(0)
    rightArm.setAngle(0)

    // Swing opposite limbs in alternating directions.
    this.tweens.add({
      targets: [leftLeg, rightArm],
      angle: -12,
      duration: 180,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    this.tweens.add({
      targets: [rightLeg, leftArm],
      angle: 12,
      duration: 180,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  // Animates a character toward a synchronized position.
  private moveCharacter(
    character: Phaser.GameObjects.Container,
    x: number,
    y: number,
  ) {
    // Calculate distance to the new position.
    const distance = Phaser.Math.Distance.Between(
      character.x,
      character.y,
      x,
      y,
    )

    // Stop if the character is already at the destination.
    if (distance < 1) return

    const direction = x < character.x ? -1 : 1

    // Flip only the character graphics.
    const body = character.getAt(0) as Phaser.GameObjects.Graphics
    body.setScale(direction, 1)

    // Stop any previous movement.
    this.tweens.killTweensOf(character)

    // Start the walking animation.
    this.startWalkingAnimation(character)

    // Animate toward the synchronized position.
    this.tweens.add({
      targets: character,
      x,
      y,
      duration: (distance / 180) * 1000,
      ease: 'Linear',
      onUpdate: () => {
        character.setDepth(character.y)
      },
      onComplete: () => {
        // Stop the walking animation.
        const legs = character.getAt(0) as Phaser.GameObjects.Container
        const arms = character.getAt(2) as Phaser.GameObjects.Container

        const leftLeg = legs.getAt(0) as Phaser.GameObjects.Graphics
        const rightLeg = legs.getAt(1) as Phaser.GameObjects.Graphics
        const leftArm = arms.getAt(0) as Phaser.GameObjects.Graphics
        const rightArm = arms.getAt(1) as Phaser.GameObjects.Graphics

        this.tweens.killTweensOf([leftLeg, rightLeg, leftArm, rightArm])

        // Return limbs to their idle positions.
        leftLeg.setAngle(0)
        rightLeg.setAngle(0)
        leftArm.setAngle(0)
        rightArm.setAngle(0)
      },
    })
  }

  // Automatically called when the scene starts.
  create() {
    // Sky background
    this.add.rectangle(480, 270, 960, 540, 0x9bd8f5)

    // Grassy ground
    this.add.rectangle(480, 350, 960, 380, 0x78bd62)

    // Grass variation
    const grass = this.add.graphics()

    grass.fillStyle(0x6eae59, 0.5)
    grass.fillEllipse(120, 220, 180, 70)
    grass.fillEllipse(820, 250, 220, 90)
    grass.fillEllipse(500, 480, 500, 100)

    grass.fillStyle(0x91cc72, 0.5)
    grass.fillEllipse(300, 200, 160, 60)
    grass.fillEllipse(700, 420, 240, 70)

    // Walking path
    const path = this.add.graphics()

    path.fillStyle(0xd8c49a)
    path.fillEllipse(480, 350, 680, 170)

    path.fillStyle(0xe8d6ae, 0.7)
    path.fillEllipse(480, 340, 620, 125)

    // Buildings
    const buildings = this.add.graphics()

    // Left building
    buildings.fillStyle(0xe8a66b)
    buildings.fillRect(90, 55, 180, 120)

    // Left roof
    buildings.fillStyle(0xb85c45)
    buildings.fillTriangle(90, 55, 180, -5, 270, 55)

    // Middle building
    buildings.fillStyle(0xf0d18a)
    buildings.fillRect(380, 25, 200, 150)

    // Middle roof
    buildings.fillStyle(0x9b634b)
    buildings.fillTriangle(380, 25, 480, -50, 580, 25)

    // Right building
    buildings.fillStyle(0xb5d99b)
    buildings.fillRect(700, 55, 180, 120)

    // Right roof
    buildings.fillStyle(0x658b58)
    buildings.fillTriangle(700, 55, 790, -5, 880, 55)

    // Create the local player.
    this.player = this.createPlayerCharacter(480, 320, 'You')

    // Synchronize remote players with the Colyseus room.
    const syncPlayers = () => {
      // Keep track of remote players currently in the room.
      const currentSessionIds = new Set<string>()

      // Iterate through all synchronized players.
      this.room.state.players.forEach((player, sessionId) => {
        let character: Phaser.GameObjects.Container

        // Use the existing character for the local player.
        if (sessionId === this.room.sessionId) {
          character = this.player
        } else {
          currentSessionIds.add(sessionId)

          // Look for an existing remote character.
          let remoteCharacter = this.remotePlayers.get(sessionId)

          // Create a character if one doesn't exist.
          if (!remoteCharacter) {
            remoteCharacter = this.createPlayerCharacter(
              player.x,
              player.y,
              player.name,
            )

            this.remotePlayers.set(sessionId, remoteCharacter)
          }

          character = remoteCharacter
        }

        // Check whether the player's destination has changed.
        const previousTarget = this.playerTargets.get(sessionId)

        if (
          !previousTarget ||
          previousTarget.x !== player.x ||
          previousTarget.y !== player.y
        ) {
          this.playerTargets.set(sessionId, {
            x: player.x,
            y: player.y,
          })

          // Animate toward the synchronized position.
          this.moveCharacter(character, player.x, player.y)
        }
      })

      // Remove characters belonging to players who left.
      for (const [sessionId, character] of this.remotePlayers) {
        if (!currentSessionIds.has(sessionId)) {
          character.destroy()
          this.remotePlayers.delete(sessionId)
          this.playerTargets.delete(sessionId)
        }
      }
    }

    // Listen for synchronized player updates.
    this.room.onStateChange(syncPlayers)

    // Synchronize the initial room state.
    syncPlayers()

    // Point-and-click movement
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Get pointer coordinates
      const x = Phaser.Math.Clamp(pointer.worldX, 25, 935)
      const y = Phaser.Math.Clamp(pointer.worldY, 160, 490)

      // Calculate distance to destination
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        x,
        y,
      )

      // Stop if already at destination
      if (distance < 5) return

      const direction = x < this.player.x ? -1 : 1

      // Flip only the character graphics.
      const playerGraphics = this.player.getAt(0) as Phaser.GameObjects.Graphics
      playerGraphics.setScale(direction, 1)

      // Remove the previous destination marker.
      if (this.destinationMarker) {
        this.tweens.killTweensOf(this.destinationMarker)
        this.destinationMarker.destroy()
      }

      // Create a new destination marker.
      const marker = this.add.container(x, y)

      // Outer ring.
      const ring = this.add.circle(0, 0, 18, 0x6cc8ff, 0)
      ring.setStrokeStyle(2, 0x6cc8ff, 0.8)

      marker.add([ring])
      marker.setDepth(y - 1)

      this.destinationMarker = marker

      // Keep the ring at full size briefly.
      this.time.delayedCall(100, () => {
        // Shrink and fade out the marker.
        this.tweens.add({
          targets: marker,
          scale: 0,
          alpha: 0,
          duration: 400,
          ease: 'Sine.easeIn',
          onComplete: () => {
            marker.destroy()

            if (this.destinationMarker === marker) {
              this.destinationMarker = undefined
            }
          },
        })
      })

      // Send the movement request to the server.
      this.room.send('move', { x, y })
    })
  }
}

// Creates the Phaser game.
export default function Game({ room }: GameProps) {
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
      scene: [], // scenes to load
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    })

    // Wait until Phaser is ready before adding the scene.
    game.events.once(Phaser.Core.Events.READY, () => {
      if (!active) return

      // Pass the Colyseus room connection to the scene.
      game.scene.add('TownScene', TownScene, true, { room })
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
