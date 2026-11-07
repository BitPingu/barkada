import { useEffect, useRef } from "react";
import Phaser from "phaser";

// Initializes Phaser and creates the game canvas

// Creates and manages the town environment
class TownScene extends Phaser.Scene {
  // Stores a reference to the player's character
  private player!: Phaser.GameObjects.Container;

  // Stores the circle displayed when the player clicks somewhere to move
  private destinationMarker?: Phaser.GameObjects.Arc;

  // Initialize the scene
  constructor() {
    super("TownScene");
  }

  // Automatically called when the scene starts
  create() {
    // Sky background
    this.add.rectangle(
      480, 270, 960, 540, 0x9bd8f5
    );

    // Grassy ground
    this.add.rectangle(
      480, 350, 960, 380, 0x78bd62
    );

    // Grass variation
    const grass = this.add.graphics();

    grass.fillStyle(0x6eae59, 0.5);
    grass.fillEllipse(120, 220, 180, 70);
    grass.fillEllipse(820, 250, 220, 90);
    grass.fillEllipse(500, 480, 500, 100);

    grass.fillStyle(0x91cc72, 0.5);
    grass.fillEllipse(300, 200, 160, 60);
    grass.fillEllipse(700, 420, 240, 70);

    // Walking path
    const path = this.add.graphics();

    path.fillStyle(0xd8c49a);
    path.fillEllipse(480, 350, 680, 170);

    path.fillStyle(0xe8d6ae, 0.7);
    path.fillEllipse(480, 340, 620, 125);

    // Buildings
    const buildings = this.add.graphics();

    // Left building
    buildings.fillStyle(0xe8a66b);
    buildings.fillRect(90, 55, 180, 120);

    // Left roof
    buildings.fillStyle(0xb85c45);
    buildings.fillTriangle(
      90, 55,
      180, -5,
      270, 55
    );

    // Middle building
    buildings.fillStyle(0xf0d18a);
    buildings.fillRect(380, 25, 200, 150);

    // Middle roof
    buildings.fillStyle(0x9b634b);
    buildings.fillTriangle(
      380, 25,
      480, -50,
      580, 25
    );

    // Right building
    buildings.fillStyle(0xb5d99b);
    buildings.fillRect(700, 55, 180, 120);

    // Right roof
    buildings.fillStyle(0x658b58);
    buildings.fillTriangle(
      700, 55,
      790, -5,
      880, 55
    );

    // Create placeholder human character    
    this.player = this.add.container(480, 320);

    // Graphics object
    const character = this.add.graphics();

    // Legs
    character.fillStyle(0x26384b);
    character.fillRoundedRect(-8, -3, 7, 17, 3);
    character.fillRoundedRect(1, -3, 7, 17, 3);

    // Shoes
    character.fillStyle(0x59402e);
    character.fillEllipse(-5, 14, 13, 7);
    character.fillEllipse(5, 14, 13, 7);

    // Arms
    character.fillStyle(0x3979b8);
    character.fillRoundedRect(-17, -23, 9, 22, 5);
    character.fillRoundedRect(8, -23, 9, 22, 5);

    // Hands
    character.fillStyle(0xe8b18b);
    character.fillCircle(-12.5, -2, 5);
    character.fillCircle(12.5, -2, 5);

    // Small body
    character.fillStyle(0x3979b8);
    character.fillRoundedRect(-11, -27, 22, 29, 8);

    // Neck
    character.fillStyle(0xe8b18b);
    character.fillRoundedRect(-5, -34, 10, 10, 3);

    // Ears
    character.fillStyle(0xe8b18b);
    character.fillCircle(-19, -45, 5);
    character.fillCircle(19, -45, 5);

    // Oversized head
    character.fillStyle(0xe8b18b);
    character.fillCircle(0, -48, 22);

    // Hair
    character.fillStyle(0x38251b);
    character.fillEllipse(0, -62, 40, 21);
    character.fillEllipse(-14, -56, 14, 19);
    character.fillEllipse(14, -56, 14, 19);

    // Hair fringe
    character.fillTriangle(
      -15, -55,
      0, -49,
      -5, -61
    );

    character.fillTriangle(
      0, -55,
      14, -49,
      8, -62
    );

    // Eyes
    character.fillStyle(0xffffff);
    character.fillEllipse(-8, -46, 8, 11);
    character.fillEllipse(8, -46, 8, 11);

    character.fillStyle(0x26384b);
    character.fillCircle(-8, -45, 3);
    character.fillCircle(8, -45, 3);

    // Eye highlights
    character.fillStyle(0xffffff);
    character.fillCircle(-9, -47, 1.5);
    character.fillCircle(7, -47, 1.5);

    // Blush
    character.fillStyle(0xe98b83, 0.6);
    character.fillEllipse(-14, -37, 7, 4);
    character.fillEllipse(14, -37, 7, 4);

    // Small smile
    character.lineStyle(1.5, 0x8c493c);
    character.beginPath();
    character.arc(0, -36, 3, 0.2, Math.PI - 0.2, false);
    character.strokePath();

    // Add the Graphics object to the container
    this.player.add(character);

    // Render depth
    this.player.setDepth(this.player.y);

    // Point-and-click movement
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // Get pointer coordinates
      const x = Phaser.Math.Clamp(pointer.worldX, 25, 935);
      const y = Phaser.Math.Clamp(pointer.worldY, 160, 490);

      // Distance between player position and destination
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        x,
        y
      );

      // Stop
      if (distance < 5) return;

      // Face the direction of movement
      this.player.setScale(
        x < this.player.x ? -1 : 1,
        1
      );

      // Remove previous movement
      this.tweens.killTweensOf(this.player);

      // Remove previous destination marker
      this.destinationMarker?.destroy();

      // Show destination marker
      this.destinationMarker = this.add.circle(
        x, y, 6, 0x3498db, 0.6
      );

      // Walk to destination
      this.tweens.add({
        targets: this.player,  // to animate
        x,  // destination horizontal position
        y,  // destination vertical position
        duration: (distance / 180) * 1000,  // 180 pixels per second
        ease: "Linear",  // consistent speed
        onUpdate: () => {
          // update depth as it moves
          this.player.setDepth(this.player.y);
        },
        onComplete: () => {
          // remove destination marker and clear reference
          this.destinationMarker?.destroy();
          this.destinationMarker = undefined;
        }
      });
    });
  }
}

// Creates the Phaser game
export default function Game() {
  // Reference to div
  const gameRef = useRef<HTMLDivElement>(null);

  // Runs after rendering
  useEffect(() => {
    if (!gameRef.current) return;

    // Create Phaser game instance on a canvas
    const game = new Phaser.Game({
      type: Phaser.AUTO,  // rendering method
      width: 960,
      height: 540,
      parent: gameRef.current,  // HTML element to contain the canvas
      backgroundColor: "#ccecff",
      scene: [TownScene],  // scenes to load
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    });

    // Cleanup
    return () => {
      game.destroy(true);
    };
  }, []);

  // HTML element Phaser uses as parent
  return <div ref={gameRef} />;
}
