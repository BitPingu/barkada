
import { useEffect, useRef } from "react";
import Phaser from "phaser";

class TownScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private destinationMarker?: Phaser.GameObjects.Arc;

  constructor() {
    super("TownScene");
  }

  create() {
    // Background
    this.add.rectangle(
      480, 270, 960, 540, 0xccecff
    );

    // Snow-covered ground
    this.add.rectangle(
      480, 300, 960, 480, 0xf2f8fc
    );

    // Walking path
    const path = this.add.graphics();
    path.fillStyle(0xd8e1e8);
    path.fillEllipse(480, 330, 650, 160);

    // Simple buildings
    this.add.rectangle(
      180, 115, 180, 120, 0x8bafd0
    );

    this.add.rectangle(
      480, 100, 200, 150, 0xb7a2d8
    );

    this.add.rectangle(
      790, 115, 180, 120, 0x91bda7
    );

    // Create placeholder penguin
    this.player = this.add.container(480, 320);

    const penguin = this.add.graphics();

    // Body
    penguin.fillStyle(0x26384b);
    penguin.fillEllipse(0, 5, 48, 60);

    // Belly
    penguin.fillStyle(0xffffff);
    penguin.fillEllipse(0, 10, 30, 42);

    // Head
    penguin.fillStyle(0x26384b);
    penguin.fillCircle(0, -25, 22);

    // Eyes
    penguin.fillStyle(0xffffff);
    penguin.fillCircle(-8, -29, 5);
    penguin.fillCircle(8, -29, 5);

    // Pupils
    penguin.fillStyle(0x111827);
    penguin.fillCircle(-8, -29, 2);
    penguin.fillCircle(8, -29, 2);

    // Beak
    penguin.fillStyle(0xffa500);
    penguin.fillTriangle(
      -6, -20, 6, -20, 0, -13
    );

    // Feet
    penguin.fillStyle(0xffa500);
    penguin.fillEllipse(-11, 34, 17, 8);
    penguin.fillEllipse(11, 34, 17, 8);

    this.player.add(penguin);
    this.player.setDepth(this.player.y);

    // Point-and-click movement
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const x = Phaser.Math.Clamp(pointer.worldX, 25, 935);
      const y = Phaser.Math.Clamp(pointer.worldY, 80, 490);

      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        x,
        y
      );

      if (distance < 5) return;

      // Face the direction of movement
      this.player.setScale(
        x < this.player.x ? -1 : 1,
        1
      );

      // Remove previous movement
      this.tweens.killTweensOf(this.player);

      // Show destination marker
      this.destinationMarker?.destroy();

      this.destinationMarker = this.add.circle(
        x, y, 6, 0x3498db, 0.6
      );

      // Walk to destination
      this.tweens.add({
        targets: this.player,
        x,
        y,
        duration: (distance / 180) * 1000,
        ease: "Linear",
        onUpdate: () => {
          this.player.setDepth(this.player.y);
        },
        onComplete: () => {
          this.destinationMarker?.destroy();
          this.destinationMarker = undefined;
        }
      });
    });
  }
}

export default function Game() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 960,
      height: 540,
      parent: gameRef.current,
      backgroundColor: "#ccecff",
      scene: [TownScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    });

    return () => {
      game.destroy(true);
    };
  }, []);

  return <div ref={gameRef} />;
}
