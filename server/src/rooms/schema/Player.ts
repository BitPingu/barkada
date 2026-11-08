import { schema, t } from '@colyseus/schema'

// Defines the synchronized data for an individual player.
export const Player = schema({
  // Player's position in the game world.
  x: t.number().default(480),
  y: t.number().default(320),

  // Player's display name.
  name: t.string().default('Guest'),
})
