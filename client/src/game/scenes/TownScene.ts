import Phaser from 'phaser'
import type { Room } from '@colyseus/sdk'
import type { ChatMessage, EmojiMessage, MyRoomState } from '../types'
import {
  createPlayerCharacter,
  startWalkingAnimation,
} from '../objects/PlayerCharacter'
import type { CharacterType } from '../objects/PlayerCharacter'
import { getFluentEmojiCDN } from '@lobehub/fluent-emoji'

const EMOJI_BUBBLE_ASSETS = [
  '😀',
  '😂',
  '😭',
  '😮',
  '😡',
  '🥺',
  '❤️',
  '🔥',
  '🎶',
  '👍',
  '👋',
  '🙏',
]

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

  // Handles notifications when another player joins the room.
  private onPlayerJoined!: (displayName: string) => void

  // Handles notifications when another player leaves the room.
  private onPlayerLeft!: (displayName: string) => void

  // Handles the player's first movement click.
  private onFirstMovement!: () => void

  // Tracks whether the initial player synchronization has completed.
  private hasSyncedPlayers = false

  // Stores characters belonging to other players.
  private remotePlayers = new Map<string, Phaser.GameObjects.Container>()

  // Stores the display names of remote players.
  private remotePlayerNames = new Map<string, string>()

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
    onPlayerJoined: (displayName: string) => void
    onPlayerLeft: (displayName: string) => void
    onFirstMovement: () => void
  }) {
    // Store the room connection, selected character type, and display name.
    this.room = data.room
    this.characterType = data.characterType
    this.displayName = data.displayName
    this.onPlayerJoined = data.onPlayerJoined
    this.onPlayerLeft = data.onPlayerLeft
    this.onFirstMovement = data.onFirstMovement
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
    const body = character.getByName('body') as Phaser.GameObjects.Graphics
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
    const textureKey = `fluent-emoji-${Array.from(emoji)
      .map((character) => character.codePointAt(0)?.toString(16))
      .join('-')}`

    // Stop if the emoji texture hasn't loaded.
    if (!this.textures.exists(textureKey)) return

    // Create the Fluent Emoji image.
    const emojiImage = this.add.image(0, 0, textureKey)
    emojiImage.setDisplaySize(32, 32)

    // Calculate the circular bubble dimensions.
    const size = 44

    // Create and display the emoji bubble.
    this.createBubble(
      sessionId,
      character,
      emojiImage,
      size,
      size,
      5000,
      0,
      true,
    )
  }

  // Create and display a bubble above a player's character.
  private createBubble(
    sessionId: string,
    character: Phaser.GameObjects.Container,
    content: Phaser.GameObjects.GameObject,
    width: number,
    height: number,
    displayDuration: number,
    verticalOffset = 0,
    circular = false,
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

    if (circular) {
      // Draw the circular bubble.
      background.fillCircle(0, 0, width / 2)
      background.strokeCircle(0, 0, width / 2)

      // Cover the circular border where the tail connects.
      background.fillStyle(0xffffff, 1)
      background.fillTriangle(
        -8,
        height / 2 - 2,
        8,
        height / 2 - 2,
        0,
        height / 2 + 9,
      )

      // Draw the tail.
      background.lineStyle(2, 0x526477, 1)
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
    } else {
      // Draw the rounded rectangular bubble.
      background.fillRoundedRect(-width / 2, -height / 2, width, height, 8)
      background.strokeRoundedRect(-width / 2, -height / 2, width, height, 8)

      // Draw the tail.
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
    }

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
    const sky = this.add.rectangle(480, 270, 960, 540, 0x9bd8f5)
    sky.setDepth(0)

    // Clouds.
    const clouds = this.add.graphics()

    clouds.fillStyle(0xffffff, 0.8)

    // Left cloud.
    clouds.fillEllipse(310, 65, 55, 24)
    clouds.fillEllipse(325, 57, 38, 30)
    clouds.fillEllipse(340, 66, 45, 22)

    // Right cloud.
    clouds.fillEllipse(620, 65, 55, 24)
    clouds.fillEllipse(635, 57, 38, 30)
    clouds.fillEllipse(650, 66, 45, 22)

    clouds.setDepth(1)

    // Grassy ground.
    const ground = this.add.rectangle(480, 350, 960, 380, 0x78bd62)
    ground.setDepth(2)

    // Grass variation.
    const grass = this.add.graphics()

    grass.fillStyle(0x6eae59, 0.25)
    grass.fillEllipse(120, 220, 180, 70)
    grass.fillEllipse(820, 250, 220, 90)
    grass.fillEllipse(500, 480, 500, 100)

    grass.fillStyle(0x91cc72, 0.3)
    grass.fillEllipse(300, 200, 160, 60)
    grass.fillEllipse(700, 420, 240, 70)

    grass.setDepth(2)

    // Walking path.
    const path = this.add.graphics()

    path.fillStyle(0xd8c49a)
    path.fillEllipse(480, 350, 680, 170)

    path.fillStyle(0xe8d6ae, 0.7)
    path.fillEllipse(480, 340, 620, 125)

    path.setDepth(3)

    // Buildings.
    const buildings = this.add.graphics()

    // Left building.
    buildings.fillStyle(0xe8a66b)
    buildings.fillRect(90, 55, 180, 120)

    buildings.fillStyle(0xb85c45)
    buildings.fillTriangle(90, 55, 180, -5, 270, 55)

    // Left building details.

    // Door.
    buildings.fillStyle(0x9b634b)
    buildings.fillRect(158, 105, 45, 70)

    // Windows.
    buildings.fillStyle(0xb9e4ed)
    buildings.fillRect(110, 80, 35, 30)
    buildings.fillRect(215, 80, 35, 30)

    // Middle building.
    buildings.fillStyle(0xf0d18a)
    buildings.fillRect(380, 25, 200, 150)

    buildings.fillStyle(0x9b634b)
    buildings.fillTriangle(380, 25, 480, -50, 580, 25)

    // Middle building details.

    // Door.
    buildings.fillStyle(0x9b634b)
    buildings.fillRect(455, 105, 50, 70)

    // Windows.
    buildings.fillStyle(0xb9e4ed)
    buildings.fillRect(400, 65, 40, 35)
    buildings.fillRect(520, 65, 40, 35)

    // Right building.
    buildings.fillStyle(0xb5d99b)
    buildings.fillRect(700, 55, 180, 120)

    buildings.fillStyle(0x658b58)
    buildings.fillTriangle(700, 55, 790, -5, 880, 55)

    // Right building details.

    // Door.
    buildings.fillStyle(0x658b58)
    buildings.fillRect(768, 105, 45, 70)

    // Windows.
    buildings.fillStyle(0xb9e4ed)
    buildings.fillRect(720, 80, 35, 30)
    buildings.fillRect(825, 80, 35, 30)

    buildings.setDepth(4)
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

  // Synchronize player positions when returning to the game.
  private syncPlayerPositions() {
    const players = this.room.state?.players

    if (!players) return

    players.forEach((player, sessionId) => {
      const character =
        sessionId === this.room.sessionId
          ? this.player
          : this.remotePlayers.get(sessionId)

      if (!character) return

      // Stop any outdated movement animation.
      this.tweens.killTweensOf(character)

      // Stop the walking animation on the character's limbs.
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

      // Move directly to the latest synchronized position.
      character.setPosition(player.x, player.y)
      character.setDepth(player.y)

      // Update the last known destination.
      this.playerTargets.set(sessionId, {
        x: player.x,
        y: player.y,
      })
    })

    // Remove the outdated destination marker.
    if (this.destinationMarker) {
      this.tweens.killTweensOf(this.destinationMarker)
      this.destinationMarker.destroy()
      this.destinationMarker = undefined
    }
  }

  // Handle returning to the game after switching tabs or windows.
  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.syncPlayers()
      this.syncPlayerPositions()
    }
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

          // Store the remote player's display name.
          this.remotePlayerNames.set(sessionId, player.name)

          // Store the initial position without triggering movement.
          this.playerTargets.set(sessionId, {
            x: player.x,
            y: player.y,
          })

          // Notify React when a new player joins after initial synchronization.
          if (this.hasSyncedPlayers) {
            this.onPlayerJoined(player.name)
          }
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
        // Notify React when a remote player leaves.
        const displayName = this.remotePlayerNames.get(sessionId)

        if (displayName) {
          this.onPlayerLeft(displayName)
        }

        character.destroy()
        this.remotePlayers.delete(sessionId)
        this.remotePlayerNames.delete(sessionId)
        this.playerTargets.delete(sessionId)
      }
    }

    // Mark the initial player synchronization as complete.
    this.hasSyncedPlayers = true
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
  private setupMovementControls() {
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

      // Hide the movement hint after the first valid movement click.
      this.onFirstMovement()

      const direction = x < this.player.x ? -1 : 1

      // Flip only the character graphics.
      const playerGraphics = this.player.getByName(
        'body',
      ) as Phaser.GameObjects.Graphics
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

  // Preload Fluent Emoji assets used in chat reactions.
  preload() {
    EMOJI_BUBBLE_ASSETS.forEach((emoji) => {
      const textureKey = `fluent-emoji-${Array.from(emoji)
        .map((character) => character.codePointAt(0)?.toString(16))
        .join('-')}`

      const url = getFluentEmojiCDN(emoji, { cdn: 'unpkg', type: 'flat' })

      this.load.image(textureKey, url)
    })
  }

  // Automatically called when the scene starts.
  create() {
    // Create the town environment.
    this.createTownEnvironment()

    // Create the local player.
    this.createLocalPlayer()

    // Listen for synchronized player updates.
    this.room.onStateChange(() => this.syncPlayers())

    // Synchronize the initial room state.
    this.syncPlayers()

    // Notify the local player that they joined the town.
    this.onPlayerJoined(this.displayName)

    // Set up chat and emoji message listeners.
    this.setupMessageHandlers()

    // Point-and-click movement.
    this.setupMovementControls()

    // Synchronize player positions when returning to the game.
    document.addEventListener('visibilitychange', this.handleVisibilityChange)

    // Remove the listener when the scene shuts down.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener(
        'visibilitychange',
        this.handleVisibilityChange,
      )
    })
  }
}
