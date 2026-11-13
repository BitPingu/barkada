import Phaser from 'phaser'

export type CharacterType = 'boy' | 'girl'

// Creates a reusable player character.
export function createPlayerCharacter(
  scene: Phaser.Scene,
  x: number,
  y: number,
  name: string,
  characterType: CharacterType = 'boy',
  showName: boolean = true,
  isLocalPlayer: boolean = false,
) {
  // Create the player character.
  const player = scene.add.container(x, y)

  // Create a subtle shadow beneath the character.
  const shadow = scene.add.ellipse(0, -1, 24, 9, 0x26384b, 0.2)

  // Create a subtle ring to identify the local player.
  const playerIndicator = isLocalPlayer ? scene.add.ellipse(0, 0, 38, 13) : null

  if (playerIndicator) {
    playerIndicator.setStrokeStyle(2, 0x8fd8ff, 0.8)
    playerIndicator.setFillStyle(0x000000, 0)
  }

  const body = scene.add.graphics().setName('body')
  const arms = scene.add.container(0, 0).setName('arms')
  const legs = scene.add.container(0, 0).setName('legs')

  const leftArm = scene.add.graphics()
  const rightArm = scene.add.graphics()

  const leftLeg = scene.add.graphics()
  const rightLeg = scene.add.graphics()

  // Draw the left leg.
  leftLeg.fillStyle(0x26384b)
  leftLeg.fillRoundedRect(
    characterType === 'girl' ? -7.5 : -8,
    -3,
    characterType === 'girl' ? 6 : 7,
    17,
    3,
  )

  // Draw the left shoe.
  leftLeg.fillStyle(0x59402e)
  leftLeg.fillEllipse(-5, 14, 13, 7)

  // Draw the right leg.
  rightLeg.fillStyle(0x26384b)
  rightLeg.fillRoundedRect(
    characterType === 'girl' ? 1.5 : 1,
    -3,
    characterType === 'girl' ? 6 : 7,
    17,
    3,
  )

  // Draw the right shoe.
  rightLeg.fillStyle(0x59402e)
  rightLeg.fillEllipse(5, 14, 13, 7)

  // Add both legs to the legs container.
  legs.add([leftLeg, rightLeg])

  // Position the left arm at the shoulder.
  leftArm.setPosition(characterType === 'girl' ? -10 : -12.5, -23)

  // Draw the left arm and hand.
  leftArm.fillStyle(characterType === 'girl' ? 0xd982a5 : 0x3979b8)
  leftArm.fillRoundedRect(
    characterType === 'girl' ? -3.5 : -4.5,
    0,
    characterType === 'girl' ? 7 : 9,
    20,
    5,
  )

  leftArm.fillStyle(0xe8b18b)
  leftArm.fillCircle(0, 19, 5)

  // Position the right arm at the shoulder.
  rightArm.setPosition(characterType === 'girl' ? 10 : 12.5, -23)

  // Draw the right arm and hand.
  rightArm.fillStyle(characterType === 'girl' ? 0xd982a5 : 0x3979b8)
  rightArm.fillRoundedRect(
    characterType === 'girl' ? -3.5 : -4.5,
    0,
    characterType === 'girl' ? 7 : 9,
    20,
    5,
  )

  rightArm.fillStyle(0xe8b18b)
  rightArm.fillCircle(0, 19, 5)

  // Add both arms to the arms container.
  arms.add([leftArm, rightArm])

  // Back hair.
  if (characterType === 'girl') {
    body.fillStyle(0x38251b)
    body.fillEllipse(0, -42, 46, 58)
  }

  // Draw the body and outfit.
  if (characterType === 'boy') {
    body.fillStyle(0x3979b8)
    body.fillRoundedRect(-11, -27, 22, 29, 8)

    // Decorative neckline.
    body.fillStyle(0xb8d8f2)
    body.fillTriangle(-5, -26, 5, -26, 0, -20)
  } else {
    // Slightly narrower, shaped torso.
    body.fillStyle(0xd982a5)
    body.fillRoundedRect(-10, -29, 20, 31, 7)
    body.fillRoundedRect(-11, -8, 22, 10, 5)

    // Decorative neckline.
    body.fillStyle(0xf2d6ed)
    body.fillTriangle(-5, -26, 5, -26, 0, -20)
  }

  // Draw the neck.
  body.fillStyle(0xe8b18b)
  body.fillRoundedRect(-5, -34, 10, 10, 3)

  // Draw the ears.
  body.fillStyle(0xe8b18b)
  body.fillCircle(-19, -45, 5)
  body.fillCircle(19, -45, 5)

  // Draw the head.
  body.fillStyle(0xe8b18b)
  body.fillCircle(0, -48, 22)

  // Draw the hair.
  body.fillStyle(0x38251b)

  if (characterType === 'boy') {
    // Existing boy hairstyle.
    body.fillEllipse(0, -62, 40, 21)
    body.fillEllipse(-14, -56, 14, 19)
    body.fillEllipse(14, -56, 14, 19)

    // Hair fringe.
    body.fillTriangle(-15, -55, 0, -49, -5, -61)
    body.fillTriangle(0, -55, 14, -49, 8, -62)
    body.fillTriangle(-7, -58, 7, -52, 2, -64)

    // Subtle hair highlight.
    body.fillStyle(0x59402e, 0.7)
    body.fillEllipse(-8, -64, 13, 4)
  } else {
    // Rounded top hairstyle.
    body.fillEllipse(0, -63, 43, 23)

    // Connected, slightly longer side locks.
    body.fillEllipse(-20, -38, 12, 52)
    body.fillEllipse(20, -38, 12, 52)

    // Side-swept bangs.
    body.fillTriangle(-17, -57, 5, -49, -5, -65)
    body.fillTriangle(-5, -58, 15, -51, 10, -65)

    // Subtle hair highlight.
    body.fillStyle(0x59402e, 0.7)
    body.fillEllipse(-8, -64, 13, 4)

    // Small hair accessory.
    body.fillStyle(0xe98b9b)
    body.fillCircle(15, -60, 3)
    body.fillCircle(12, -57, 2)
  }

  // Draw the eyes.
  body.fillStyle(0xffffff)
  body.fillEllipse(-8, -46, 8, 11)
  body.fillEllipse(8, -46, 8, 11)

  body.fillStyle(0x26384b)
  body.fillCircle(-8, -45, 3)
  body.fillCircle(8, -45, 3)

  // Add eye highlights.
  body.fillStyle(0xffffff)
  body.fillCircle(-9, -47, 1.5)
  body.fillCircle(7, -47, 1.5)

  // Add blush.
  body.fillStyle(0xe98b83, 0.6)
  body.fillEllipse(-14, -37, 7, 4)
  body.fillEllipse(14, -37, 7, 4)

  // Draw a small smile.
  body.lineStyle(1.5, 0x8c493c)
  body.beginPath()
  body.arc(0, -36, 3, 0.2, Math.PI - 0.2, false)
  body.strokePath()

  // Align the character's feet with the container's ground position.
  legs.setY(-18)
  body.setY(-18)
  arms.setY(-18)

  // Add the player's name below their character.
  if (showName) {
    const nameLabel = scene.add.text(0, 15, name, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
      stroke: '#526477',
      strokeThickness: 3,
      align: 'center',
      resolution: 3,
      shadow: {
        offsetX: 0,
        offsetY: 2,
        color: '#26384b',
        blur: 4,
        fill: true,
      },
    })

    // Center the name label below the character.
    nameLabel.setOrigin(0.5, 0.5)

    // Assemble the player character.
    player.add([shadow, legs, body, arms, nameLabel])
  } else {
    player.add([shadow, legs, body, arms])
  }

  if (playerIndicator) {
    player.addAt(playerIndicator, 0)
  }

  // Set the player's rendering depth.
  player.setDepth(y)

  return player
}

// Animates the player's limbs while walking.
export function startWalkingAnimation(
  scene: Phaser.Scene,
  character: Phaser.GameObjects.Container,
) {
  const legs = character.getByName('legs')
  const arms = character.getByName('arms')

  // Stop if the limb containers are unavailable.
  if (
    !(legs instanceof Phaser.GameObjects.Container) ||
    !(arms instanceof Phaser.GameObjects.Container)
  ) {
    return
  }

  const leftLeg = legs.getAt(0)
  const rightLeg = legs.getAt(1)
  const leftArm = arms.getAt(0)
  const rightArm = arms.getAt(1)

  // Stop if any individual limb is unavailable.
  if (
    !(leftLeg instanceof Phaser.GameObjects.Graphics) ||
    !(rightLeg instanceof Phaser.GameObjects.Graphics) ||
    !(leftArm instanceof Phaser.GameObjects.Graphics) ||
    !(rightArm instanceof Phaser.GameObjects.Graphics)
  ) {
    return
  }

  // Stop any previous limb animations.
  scene.tweens.killTweensOf([leftLeg, rightLeg, leftArm, rightArm])

  // Reset limbs to their idle positions.
  leftLeg.setAngle(0)
  rightLeg.setAngle(0)
  leftArm.setAngle(0)
  rightArm.setAngle(0)

  // Swing opposite limbs in alternating directions.
  scene.tweens.add({
    targets: [leftLeg, rightArm],
    angle: -12,
    duration: 180,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })

  scene.tweens.add({
    targets: [rightLeg, leftArm],
    angle: 12,
    duration: 180,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })
}
