import Phaser from 'phaser'
import { startWalkingAnimation } from '../objects/PlayerCharacter'

// Animates a character toward a synchronized position.
export function moveCharacter(
  scene: Phaser.Scene,
  character: Phaser.GameObjects.Container,
  x: number,
  y: number,
) {
  // Calculate distance to the new position.
  const distance = Phaser.Math.Distance.Between(character.x, character.y, x, y)

  // Stop if the character is already at the destination.
  if (distance < 1) return

  const direction = x < character.x ? -1 : 1

  // Flip only the character graphics.
  const body = character.getByName('body')

  if (body instanceof Phaser.GameObjects.Graphics) {
    body.setScale(direction, 1)
  }

  // Stop any previous movement.
  scene.tweens.killTweensOf(character)

  // Start the walking animation.
  startWalkingAnimation(scene, character)

  // Animate toward the synchronized position.
  scene.tweens.add({
    targets: character,
    x,
    y,
    duration: (distance / 180) * 1000,
    ease: 'Linear',
    onUpdate: () => {
      if (character.active) {
        character.setDepth(character.y)
      }
    },
    onComplete: () => {
      // Stop if the character was destroyed during the tween.
      if (!character.active) return

      // Stop the walking animation.
      const legs = character.getByName('legs')
      const arms = character.getByName('arms')

      // Stop if the limb containers are unavailable.
      if (
        !(legs instanceof Phaser.GameObjects.Container) ||
        !(arms instanceof Phaser.GameObjects.Container)
      ) {
        return
      }

      // Get and validate the individual limbs.
      const leftLeg = legs.getAt(0)
      const rightLeg = legs.getAt(1)
      const leftArm = arms.getAt(0)
      const rightArm = arms.getAt(1)

      if (
        !(leftLeg instanceof Phaser.GameObjects.Graphics) ||
        !(rightLeg instanceof Phaser.GameObjects.Graphics) ||
        !(leftArm instanceof Phaser.GameObjects.Graphics) ||
        !(rightArm instanceof Phaser.GameObjects.Graphics)
      ) {
        return
      }

      scene.tweens.killTweensOf([leftLeg, rightLeg, leftArm, rightArm])

      // Return limbs to their idle positions.
      leftLeg.setAngle(0)
      rightLeg.setAngle(0)
      leftArm.setAngle(0)
      rightArm.setAngle(0)
    },
  })
}
