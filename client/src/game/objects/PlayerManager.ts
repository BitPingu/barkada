import Phaser from 'phaser'
import type { Room } from '@colyseus/sdk'
import type { GameRoomState } from '../types'
import { createPlayerCharacter } from './PlayerCharacter'
import { moveCharacter } from '../utils/playerMovement'

// Manages remote players and synchronizes their positions.
export default class PlayerManager {
  // Stores a reference to the Phaser scene.
  private scene: Phaser.Scene

  // Stores the Colyseus room connection.
  private room: Room<GameRoomState>

  // Stores a reference to the local player's character.
  private localPlayer: Phaser.GameObjects.Container

  // Handles bubble cleanup when a remote player leaves.
  private onPlayerRemoved: (sessionId: string) => void

  // Stores characters belonging to other players.
  private remotePlayers = new Map<string, Phaser.GameObjects.Container>()

  // Stores the last synchronized destination for each player.
  private playerTargets = new Map<string, { x: number; y: number }>()

  // Initialize the player manager with the scene, room, and local player.
  constructor(
    scene: Phaser.Scene,
    room: Room<GameRoomState>,
    localPlayer: Phaser.GameObjects.Container,
    onPlayerRemoved: (sessionId: string) => void,
  ) {
    this.scene = scene
    this.room = room
    this.localPlayer = localPlayer
    this.onPlayerRemoved = onPlayerRemoved
  }

  // Get a player's character by their session ID.
  getPlayer(sessionId: string) {
    if (sessionId === this.room.sessionId) {
      return this.localPlayer
    }

    return this.remotePlayers.get(sessionId)
  }

  // Synchronize player positions when returning to the game.
  syncPlayerPositions() {
    const players = this.room.state?.players

    if (!players) return

    players.forEach((player, sessionId) => {
      const character =
        sessionId === this.room.sessionId
          ? this.localPlayer
          : this.remotePlayers.get(sessionId)

      if (!character || !character.active) return

      // Get the character's limb containers.
      const legs = character.getByName('legs')
      const arms = character.getByName('arms')

      // Skip characters whose limb containers are unavailable.
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

      // Stop any outdated movement animation.
      this.scene.tweens.killTweensOf(character)

      // Stop the walking animation on the character's limbs.
      this.scene.tweens.killTweensOf([leftLeg, rightLeg, leftArm, rightArm])

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
  }

  // Synchronize remote players with the Colyseus room.
  syncPlayers() {
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
        character = this.localPlayer
      } else {
        currentSessionIds.add(sessionId)

        // Look for an existing remote character.
        let remoteCharacter = this.remotePlayers.get(sessionId)

        // Create a character if one doesn't exist.
        if (!remoteCharacter) {
          remoteCharacter = createPlayerCharacter(
            this.scene,
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
        moveCharacter(this.scene, character, player.x, player.y)
      }
    })

    // Remove characters belonging to players who left.
    for (const [sessionId, character] of this.remotePlayers) {
      if (!currentSessionIds.has(sessionId)) {
        // Remove the player's active bubble before destroying their character.
        this.onPlayerRemoved(sessionId)

        character.destroy()
        this.remotePlayers.delete(sessionId)
        this.playerTargets.delete(sessionId)
      }
    }
  }
}
