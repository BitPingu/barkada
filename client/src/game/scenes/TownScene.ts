import Phaser from 'phaser'
import type { Room } from '@colyseus/sdk'
import type { ChatMessage, EmojiMessage, MyRoomState } from '../types'
import {
  createPlayerCharacter,
  startWalkingAnimation,
} from '../objects/PlayerCharacter'
import type { CharacterType } from '../objects/PlayerCharacter'

// Creates and manages the town environment.
export default class TownScene extends Phaser.Scene {
  // Stores a reference to the player's character.
  private player!: Phaser.GameObjects.Container

  // Stores the Colyseus room connection.
  private room!: Room<MyRoomState>

  // Stores the selected character type.
  private characterType!: CharacterType

  // Stores characters belonging to other players.
  private remotePlayers = new Map<string, Phaser.GameObjects.Container>()

  // Tracks the active speech bubble for each player.
  private activeBubbles = new Map<string, Phaser.GameObjects.Container>()

  // Stores the last synchronized destination for each player.
  private playerTargets = new Map<string, { x: number; y: number }>()

  // Stores the circle displayed when the player clicks somewhere to move.
  private destinationMarker?: Phaser.GameObjects.Container

  // Initialize the scene.
  constructor() {
    super('TownScene')
  }

  // Receives the Colyseus room connection and selected character type.
  init(data: { room: Room<MyRoomState>; characterType: CharacterType }) {
    // access to room connection
    this.room = data.room
    this.characterType = data.characterType

    console.log('Connected to room:', data.room.roomId)
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
    const body = character.getAt(1) as Phaser.GameObjects.Graphics
    body.setScale(direction, 1)

    // Stop any previous movement.
    this.tweens.killTweensOf(character)

    // Start the walking animation.
    startWalkingAnimation(this, character)

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
        // Stop if the character was destroyed during the tween.
        if (!character.active) return

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

  // Displays a chat message above a player's character.
  private showChatBubble(
    sessionId: string,
    character: Phaser.GameObjects.Container,
    message: string,
  ) {
    // Remove the player's previous chat bubble, if one exists.
    const previousBubble = this.activeBubbles.get(sessionId)

    if (previousBubble) {
      previousBubble.destroy()
    }

    // Create the chat bubble container.
    const bubble = this.add.container(0, -90)

    // Create the chat message text.
    const text = this.add.text(0, 0, message, {
      fontSize: '13px',
      color: '#26384b',
      fontFamily: 'Arial',
      align: 'center',
      wordWrap: { width: 180 },
      resolution: 2,
    })

    text.setOrigin(0.5)

    // Calculate the bubble dimensions based on the text.
    const paddingX = 12
    const paddingY = 8
    const width = Math.max(60, text.width + paddingX * 2)
    const height = text.height + paddingY * 2

    // Move taller chat bubbles higher above the character.
    bubble.y -= Math.max(0, height - 36) / 2

    // Create the chat bubble background.
    const background = this.add.graphics()

    background.fillStyle(0xffffff, 1)
    background.lineStyle(2, 0x526477, 1)
    background.fillRoundedRect(-width / 2, -height / 2, width, height, 8)
    background.strokeRoundedRect(-width / 2, -height / 2, width, height, 8)

    // Draw the speech bubble tail.
    background.fillTriangle(
      -7,
      height / 2 - 1,
      7,
      height / 2 - 1,
      0,
      height / 2 + 8,
    )
    background.lineBetween(-7, height / 2 - 1, 0, height / 2 + 8)
    background.lineBetween(0, height / 2 + 8, 7, height / 2 - 1)

    // Add the background and text to the bubble.
    bubble.add([background, text])

    // Attach the bubble to the player's character.
    character.add(bubble)

    // Track the player's active chat bubble.
    this.activeBubbles.set(sessionId, bubble)

    // Calculate display duration based on message length.
    const displayDuration = Phaser.Math.Clamp(
      3000 + message.length * 60,
      4000,
      12000,
    )

    // Remove the chat bubble after the calculated duration.
    this.time.delayedCall(displayDuration, () => {
      bubble.destroy()

      // Only remove the entry if it still belongs to this bubble.
      if (this.activeBubbles.get(sessionId) === bubble) {
        this.activeBubbles.delete(sessionId)
      }
    })
  }

  // Display an emoji above a player's character.
  private showEmojiBubble(
    sessionId: string,
    character: Phaser.GameObjects.Container,
    emoji: string,
  ) {
    // Remove the player's previous emoji bubble, if one exists.
    const previousBubble = this.activeBubbles.get(sessionId)

    if (previousBubble) {
      previousBubble.destroy()
    }

    // Create a container above the player's character.
    const bubble = this.add.container(0, -90)

    // Create the emoji text.
    const emojiText = this.add.text(0, 0, emoji, {
      fontSize: '28px',
      fontFamily: 'Arial',
      resolution: 2,
    })

    emojiText.setOrigin(0.5)

    // Define the bubble dimensions.
    const padding = 8
    const width = emojiText.width + padding * 2
    const height = emojiText.height + padding * 2

    // Create the speech bubble background.
    const background = this.add.graphics()
    background.fillStyle(0xffffff, 1)
    background.lineStyle(2, 0x526477, 1)
    background.fillRoundedRect(-width / 2, -height / 2, width, height, 8)
    background.strokeRoundedRect(-width / 2, -height / 2, width, height, 8)

    // Draw the speech bubble tail.
    background.fillTriangle(
      -7,
      height / 2 - 1,
      7,
      height / 2 - 1,
      0,
      height / 2 + 8,
    )
    background.lineBetween(-7, height / 2 - 1, 0, height / 2 + 8)
    background.lineBetween(0, height / 2 + 8, 7, height / 2 - 1)

    // Add the background and emoji to the bubble.
    bubble.add([background, emojiText])
    character.add(bubble)

    // Track the player's active emoji bubble.
    this.activeBubbles.set(sessionId, bubble)

    // Remove the emoji bubble after 5 seconds.
    this.time.delayedCall(5000, () => {
      bubble.destroy()

      // Only remove the entry if it still belongs to this bubble.
      if (this.activeBubbles.get(sessionId) === bubble) {
        this.activeBubbles.delete(sessionId)
      }
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

    buildings.fillStyle(0xb85c45)
    buildings.fillTriangle(90, 55, 180, -5, 270, 55)

    // Middle building
    buildings.fillStyle(0xf0d18a)
    buildings.fillRect(380, 25, 200, 150)

    buildings.fillStyle(0x9b634b)
    buildings.fillTriangle(380, 25, 480, -50, 580, 25)

    // Right building
    buildings.fillStyle(0xb5d99b)
    buildings.fillRect(700, 55, 180, 120)

    buildings.fillStyle(0x658b58)
    buildings.fillTriangle(700, 55, 790, -5, 880, 55)

    // Create the local player.
    const localPlayer = createPlayerCharacter(
      this,
      480,
      320,
      'You',
      this.characterType,
    )
    this.player = localPlayer

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
            remoteCharacter = createPlayerCharacter(
              this,
              player.x,
              player.y,
              player.name,
              player.characterType,
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

    // Listen for chat messages received from other players.
    this.room.onMessage('chat', (message: ChatMessage) => {
      // Find the character belonging to the player who sent the message.
      const character =
        message.sessionId === this.room.sessionId
          ? this.player
          : this.remotePlayers.get(message.sessionId)

      // Display the message above the character if they exist.
      if (character) {
        this.showChatBubble(message.sessionId, character, message.text)
      }
      console.log('Received chat message:', message)
    })

    // Listen for emoji messages received from other players.
    this.room.onMessage('emoji', (message: EmojiMessage) => {
      // Find the character belonging to the player who sent the emoji.
      const character =
        message.sessionId === this.room.sessionId
          ? this.player
          : this.remotePlayers.get(message.sessionId)

      // Display the emoji above the character if they exist.
      if (character) {
        this.showEmojiBubble(message.sessionId, character, message.emoji)
      }
    })

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
      const playerGraphics = this.player.getAt(1) as Phaser.GameObjects.Graphics
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
