import Phaser from 'phaser'

// Manages chat and emoji bubbles above player characters.
export default class BubbleManager {
  private scene: Phaser.Scene

  // Tracks the active bubble for each player.
  private activeBubbles = new Map<string, Phaser.GameObjects.Container>()

  // Tracks the expiration timestamp for each player's active bubble.
  private bubbleExpirations = new Map<string, number>()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  // Displays a chat message above a player's character.
  showChatBubble(
    sessionId: string,
    character: Phaser.GameObjects.Container,
    message: string,
    expiresAt: number,
  ) {
    const text = this.scene.add.text(0, 0, message, {
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

    this.createBubble(
      sessionId,
      character,
      text,
      width,
      height,
      expiresAt,
      verticalOffset,
    )
  }

  // Displays an emoji above a player's character.
  showEmojiBubble(
    sessionId: string,
    character: Phaser.GameObjects.Container,
    emoji: string,
    expiresAt: number,
  ) {
    const textureKey = `fluent-emoji-${Array.from(emoji)
      .map((character) => character.codePointAt(0)?.toString(16))
      .join('-')}`

    // Stop if the emoji texture hasn't loaded.
    if (!this.scene.textures.exists(textureKey)) return

    const emojiImage = this.scene.add.image(0, 0, textureKey)
    emojiImage.setDisplaySize(32, 32)

    const size = 44

    this.createBubble(
      sessionId,
      character,
      emojiImage,
      size,
      size,
      expiresAt,
      0,
      true,
    )
  }

  // Creates and displays a bubble above a player's character.
  private createBubble(
    sessionId: string,
    character: Phaser.GameObjects.Container,
    content: Phaser.GameObjects.GameObject,
    width: number,
    height: number,
    expiresAt: number,
    verticalOffset = 0,
    circular = false,
  ) {
    // Remove the player's previous bubble, if one exists.
    this.removeBubble(sessionId)

    const bubble = this.scene.add.container(0, -108 + verticalOffset)
    const background = this.scene.add.graphics()

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

    bubble.add([background, content])
    character.add(bubble)

    this.activeBubbles.set(sessionId, bubble)
    this.bubbleExpirations.set(sessionId, expiresAt)
  }

  // Checks whether a bubble has expired and fades it out if necessary.
  private checkBubbleExpiration(
    sessionId: string,
    bubble: Phaser.GameObjects.Container,
    expiresAt: number,
  ) {
    // Stop if this bubble has already been replaced or removed.
    if (this.activeBubbles.get(sessionId) !== bubble) return

    // Wait until the server expiration time has been reached.
    if (Date.now() < expiresAt) return

    this.bubbleExpirations.delete(sessionId)

    // Fade out the expired bubble.
    this.scene.tweens.add({
      targets: bubble,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        bubble.destroy()

        if (this.activeBubbles.get(sessionId) === bubble) {
          this.activeBubbles.delete(sessionId)
        }
      },
    })
  }

  // Checks all active bubbles against their expiration timestamps.
  update() {
    for (const [sessionId, expiresAt] of this.bubbleExpirations) {
      const bubble = this.activeBubbles.get(sessionId)

      // Remove references to bubbles that no longer exist.
      if (!bubble || !bubble.active) {
        this.activeBubbles.delete(sessionId)
        this.bubbleExpirations.delete(sessionId)
        continue
      }

      this.checkBubbleExpiration(sessionId, bubble, expiresAt)
    }
  }

  // Removes a player's active bubble and any running fade tween.
  removeBubble(sessionId: string) {
    this.bubbleExpirations.delete(sessionId)

    const bubble = this.activeBubbles.get(sessionId)

    if (bubble) {
      this.scene.tweens.killTweensOf(bubble)
      bubble.destroy()
      this.activeBubbles.delete(sessionId)
    }
  }
}
