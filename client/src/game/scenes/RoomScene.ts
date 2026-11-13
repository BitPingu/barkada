import Phaser from 'phaser'
import type { Room } from '@colyseus/sdk'
import type { ChatMessage, EmojiMessage, GameRoomState } from '../types'
import { createPlayerCharacter } from '../objects/PlayerCharacter'
import type { CharacterType } from '../objects/PlayerCharacter'
import { getFluentEmojiCDN } from '@lobehub/fluent-emoji'
import BubbleManager from '../objects/BubbleManager'
import PlayerManager from '../objects/PlayerManager'
import MovementController from '../objects/MovementController'

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

// Creates and manages the room environment.
export default class RoomScene extends Phaser.Scene {
  // Stores a reference to the player's character.
  private player!: Phaser.GameObjects.Container

  // Stores the Colyseus room connection.
  private room!: Room<GameRoomState>

  // Manages chat and emoji bubbles.
  private bubbleManager!: BubbleManager

  // Manages remote players and synchronizes their positions.
  private playerManager!: PlayerManager

  // Handles point-and-click movement input.
  private movementController!: MovementController

  // Stores the selected character type.
  private characterType!: CharacterType

  // Stores the player's display name.
  private displayName!: string

  // Handles the player's first movement click.
  private onFirstMovement!: () => void

  // Initialize the scene.
  constructor() {
    super('RoomScene')
  }

  // Receives the Colyseus room connection, selected character type, and display name.
  init(data: {
    room: Room<GameRoomState>
    characterType: CharacterType
    displayName: string
    onFirstMovement: () => void
  }) {
    // Store the room connection, selected character type, and display name.
    this.room = data.room
    this.characterType = data.characterType
    this.displayName = data.displayName
    this.onFirstMovement = data.onFirstMovement
  }

  // Create the town environment.
  private createEnvironment() {
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

  // Check active bubbles against their server expiration timestamps.
  update() {
    this.bubbleManager.update()
  }

  // Handle returning to the game after switching tabs or windows.
  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // Check active bubbles against their server expiration timestamps.
      this.bubbleManager.update()

      this.playerManager.syncPlayers()
      this.playerManager.syncPlayerPositions()
    }
  }

  // Set up chat and emoji message listeners.
  private setupMessageHandlers() {
    // Listen for chat messages received from other players.
    this.room.onMessage('chat', (message: ChatMessage) => {
      // Find the character belonging to the player who sent the message.
      const character = this.playerManager.getPlayer(message.sessionId)

      // Display the message above the character if they exist.
      if (character) {
        this.bubbleManager.showChatBubble(
          message.sessionId,
          character,
          message.text,
          message.expiresAt,
        )
      }
    })

    // Listen for emoji messages received from other players.
    this.room.onMessage('emoji', (message: EmojiMessage) => {
      // Find the character belonging to the player who sent the emoji.
      const character = this.playerManager.getPlayer(message.sessionId)

      // Display the emoji above the character if they exist.
      if (character) {
        this.bubbleManager.showEmojiBubble(
          message.sessionId,
          character,
          message.emoji,
          message.expiresAt,
        )
      }
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
    // Initialize the bubble manager.
    this.bubbleManager = new BubbleManager(this)

    // Create the room environment.
    this.createEnvironment()

    // Create the local player.
    this.createLocalPlayer()

    // Initialize the player manager.
    this.playerManager = new PlayerManager(
      this,
      this.room,
      this.player,
      (sessionId) => this.bubbleManager.removeBubble(sessionId),
    )

    // Initialize the movement controller.
    this.movementController = new MovementController(
      this,
      this.room,
      this.player,
      this.onFirstMovement,
    )

    // Set up point-and-click movement controls.
    this.movementController.setup()

    // Listen for synchronized player updates.
    this.room.onStateChange(() => this.playerManager.syncPlayers())

    // Synchronize the initial room state.
    this.playerManager.syncPlayers()

    // Set up chat and emoji message listeners.
    this.setupMessageHandlers()

    // Synchronize player positions when returning to the game.
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    window.addEventListener('focus', this.handleVisibilityChange)

    // Remove the listener when the scene shuts down.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      // Remove the movement input listener.
      this.movementController.destroy()

      document.removeEventListener(
        'visibilitychange',
        this.handleVisibilityChange,
      )
      window.removeEventListener('focus', this.handleVisibilityChange)
    })
  }
}
