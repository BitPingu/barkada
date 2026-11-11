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

  // Stores the player's display name.
  private displayName!: string

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

  // Receives the Colyseus room connection, selected character type, and display name.
  init(data: {
    room: Room<MyRoomState>
    characterType: CharacterType
    displayName: string
  }) {
    // Store the room connection, selected character type, and display name.
    this.room = data.room
    this.characterType = data.characterType
    this.displayName = data.displayName
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

        // Fade the destination marker when the local player arrives.
        if (character === this.player) {
          this.fadeDestinationMarker()
        }

        // Stop the walking animation.
        const legs = character.getByName('legs') as Phaser.GameObjects.Container
        const arms = character.getByName('arms') as Phaser.GameObjects.Container

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

  // Fades out the current destination marker.
  private fadeDestinationMarker() {
    const marker = this.destinationMarker

    if (!marker) return

    this.tweens.add({
      targets: marker,
      scale: 0,
      alpha: 0,
      duration: 300,
      ease: 'Sine.easeIn',
      onComplete: () => {
        marker.destroy()

        if (this.destinationMarker === marker) {
          this.destinationMarker = undefined
        }
      },
    })
  }

  // Displays a chat message above a player's character.
  private showChatBubble(
    sessionId: string,
    character: Phaser.GameObjects.Container,
    message: string,
  ) {
    // Create the chat message text.
    const text = this.add.text(0, 0, message, {
      fontSize: '14px',
      color: '#26384b',
      fontFamily: 'Arial',
      align: 'center',
      wordWrap: { width: 180 },
      resolution: 3,
    })

    text.setOrigin(0.5)

    // Calculate the bubble dimensions based on the text.
    const paddingX = 15
    const paddingY = 10
    const width = Math.max(60, text.width + paddingX * 2)
    const height = text.height + paddingY * 2

    // Move taller chat bubbles higher above the character.
    const verticalOffset = -Math.max(0, height - 36) / 2

    // Calculate display duration based on message length.
    const displayDuration = Phaser.Math.Clamp(
      3000 + message.length * 60,
      4000,
      12000,
    )

    // Create and display the chat bubble.
    this.createBubble(
      sessionId,
      character,
      text,
      width,
      height,
      displayDuration,
      verticalOffset,
    )
  }

  // Display an emoji above a player's character.
  private showEmojiBubble(
    sessionId: string,
    character: Phaser.GameObjects.Container,
    emoji: string,
  ) {
    // Create the emoji text.
    const emojiText = this.add.text(0, 0, emoji, {
      fontSize: '28px',
      fontFamily: 'Arial',
      resolution: 3,
    })

    emojiText.setOrigin(0.5)

    // Calculate the bubble dimensions.
    const padding = 8
    const width = emojiText.width + padding * 2
    const height = emojiText.height + padding * 2

    // Create and display the emoji bubble.
    this.createBubble(sessionId, character, emojiText, width, height, 5000)
  }

  // Create and display a bubble above a player's character.
  private createBubble(
    sessionId: string,
    character: Phaser.GameObjects.Container,
    content: Phaser.GameObjects.Text,
    width: number,
    height: number,
    displayDuration: number,
    verticalOffset = 0,
  ) {
    // Remove the player's previous bubble, if one exists.
    const previousBubble = this.activeBubbles.get(sessionId)

    if (previousBubble) {
      previousBubble.destroy()
    }

    // Create the bubble container.
    const bubble = this.add.container(0, -108 + verticalOffset)

    // Create the bubble background.
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

    // Add the background and content to the bubble.
    bubble.add([background, content])

    // Attach the bubble to the player's character.
    character.add(bubble)

    // Track the player's active bubble.
    this.activeBubbles.set(sessionId, bubble)

    // Remove the bubble after its display duration.
    this.time.delayedCall(displayDuration, () => {
      bubble.destroy()

      // Only remove the entry if it still belongs to this bubble.
      if (this.activeBubbles.get(sessionId) === bubble) {
        this.activeBubbles.delete(sessionId)
      }
    })
  }

  // Create the town environment.
  private createTownEnvironment() {
    // Sky background.
    this.add.rectangle(480, 270, 960, 540, 0x9bd8f5)

    // Grassy ground.
    this.add.rectangle(480, 350, 960, 380, 0x78bd62)

    // Grass variation.
    const grass = this.add.graphics()

    grass.fillStyle(0x6eae59, 0.5)
    grass.fillEllipse(120, 220, 180, 70)
    grass.fillEllipse(820, 250, 220, 90)
    grass.fillEllipse(500, 480, 500, 100)

    grass.fillStyle(0x91cc72, 0.5)
    grass.fillEllipse(300, 200, 160, 60)
    grass.fillEllipse(700, 420, 240, 70)

    // Walking path.
    const path = this.add.graphics()

    path.fillStyle(0xd8c49a)
    path.fillEllipse(480, 350, 680, 170)

    path.fillStyle(0xe8d6ae, 0.7)
    path.fillEllipse(480, 340, 620, 125)

    // Buildings.
    const buildings = this.add.graphics()

    // Left building.
    buildings.fillStyle(0xe8a66b)
    buildings.fillRect(90, 55, 180, 120)

    buildings.fillStyle(0xb85c45)
    buildings.fillTriangle(90, 55, 180, -5, 270, 55)

    // Middle building.
    buildings.fillStyle(0xf0d18a)
    buildings.fillRect(380, 25, 200, 150)

    buildings.fillStyle(0x9b634b)
    buildings.fillTriangle(380, 25, 480, -50, 580, 25)

    // Right building.
    buildings.fillStyle(0xb5d99b)
    buildings.fillRect(700, 55, 180, 120)

    buildings.fillStyle(0x658b58)
    buildings.fillTriangle(700, 55, 790, -5, 880, 55)
  }

  // Create the local player character.
  private createLocalPlayer() {
    const localPlayer = createPlayerCharacter(
      this,
      480,
      320,
      this.displayName,
      this.characterType,
      true,
      true,
    )

    this.player = localPlayer
  }

  // Create the movement hint.
  private createMovementHint() {
    const movementHint = this.add.container(480, 50)

    const hintBackground = this.add.graphics()

    // Soft white background with a subtle blue border.
    hintBackground.fillStyle(0xffffff, 0.94)
    hintBackground.lineStyle(1, 0x9bbce0, 1)
    hintBackground.fillRoundedRect(-120, -24, 240, 48, 12)
    hintBackground.strokeRoundedRect(-120, -24, 240, 48, 12)

    const hintText = this.add.text(0, 0, 'Click anywhere to move!', {
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#526477',
      fontFamily: 'Arial',
      resolution: 3,
    })

    hintText.setOrigin(0.5)

    movementHint.add([hintBackground, hintText])
    movementHint.setDepth(1000)

    return movementHint
  }

  // Synchronize remote players with the Colyseus room.
  private syncPlayers() {
    const players = this.room.state?.players

    // Wait until the initial room state is available.
    if (!players) return

    // Keep track of remote players currently in the room.
    const currentSessionIds = new Set<string>()

    // Iterate through all synchronized players.
    players.forEach((player, sessionId) => {
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

          // Store the initial position without triggering movement.
          this.playerTargets.set(sessionId, {
            x: player.x,
            y: player.y,
          })
        }

        character = remoteCharacter
      }

      // Check whether the player's destination has changed.
      const previousTarget = this.playerTargets.get(sessionId)

      if (!previousTarget) {
        // Set the initial position without animation.
        character.setPosition(player.x, player.y)

        this.playerTargets.set(sessionId, {
          x: player.x,
          y: player.y,
        })
      } else if (
        previousTarget.x !== player.x ||
        previousTarget.y !== player.y
      ) {
        this.playerTargets.set(sessionId, {
          x: player.x,
          y: player.y,
        })

        // Animate toward the updated synchronized position.
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

  // Set up chat and emoji message listeners.
  private setupMessageHandlers() {
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
  }

  // Set up point-and-click movement controls.
  private setupMovementControls(movementHint: Phaser.GameObjects.Container) {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
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

      // Fade the marker if the destination is too close.
      if (distance < 5) {
        this.fadeDestinationMarker()
        return
      }

      // Hide the movement hint after the player's first move.
      if (movementHint.active) {
        this.tweens.add({
          targets: movementHint,
          alpha: 0,
          duration: 200,
          onComplete: () => movementHint.destroy(),
        })
      }

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
      const ring = this.add.ellipse(0, 0, 36, 22, 0x6cc8ff, 0)
      ring.setStrokeStyle(2, 0x6cc8ff, 0.8)

      // Inner dot.
      const dot = this.add.circle(0, 0, 3, 0x6cc8ff, 1)

      marker.add([ring, dot])
      marker.setDepth(y - 1)

      this.destinationMarker = marker

      // Briefly pulse the outer ring.
      this.tweens.add({
        targets: ring,
        scale: 1.25,
        alpha: 0.4,
        duration: 150,
        ease: 'Sine.easeOut',
        yoyo: true,
      })

      // Send the movement request to the server.
      this.room.send('move', { x, y })
    })
  }

  // Automatically called when the scene starts.
  create() {
    // Create the town environment.
    this.createTownEnvironment()

    // Create the local player.
    this.createLocalPlayer()

    // Show a movement hint for new players.
    const movementHint = this.createMovementHint()

    // Listen for synchronized player updates.
    this.room.onStateChange(() => this.syncPlayers())

    // Synchronize the initial room state.
    this.syncPlayers()

    // Set up chat and emoji message listeners.
    this.setupMessageHandlers()

    // Point-and-click movement.
    this.setupMovementControls(movementHint)
  }
}
