import Phaser from 'phaser'

// Creates a reusable player character.
export function createPlayerCharacter(
  scene: Phaser.Scene,
  x: number,
  y: number,
  name: string,
) {
  // Create placeholder human character
  const player = scene.add.container(x, y)

  const body = scene.add.graphics()
  const arms = scene.add.container(0, 0)
  const legs = scene.add.container(0, 0)

  const leftArm = scene.add.graphics() as Phaser.GameObjects.Graphics
  const rightArm = scene.add.graphics() as Phaser.GameObjects.Graphics

  const leftLeg = scene.add.graphics() as Phaser.GameObjects.Graphics
  const rightLeg = scene.add.graphics() as Phaser.GameObjects.Graphics

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
  const nameLabel = scene.add.text(0, 30, name, {
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
export function startWalkingAnimation(
  scene: Phaser.Scene,
  character: Phaser.GameObjects.Container,
) {
  const legs = character.getAt(0) as Phaser.GameObjects.Container
  const arms = character.getAt(2) as Phaser.GameObjects.Container

  const leftLeg = legs.getAt(0) as Phaser.GameObjects.Graphics
  const rightLeg = legs.getAt(1) as Phaser.GameObjects.Graphics

  const leftArm = arms.getAt(0) as Phaser.GameObjects.Graphics
  const rightArm = arms.getAt(1) as Phaser.GameObjects.Graphics

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
