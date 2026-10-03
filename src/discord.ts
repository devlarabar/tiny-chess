import type { Chess } from 'chess.js'
import { type ActionRow, InteractionType } from 'discord-interactions'
import { z } from 'zod'

const baseSchema = z.object({
  application_id: z.string(),
  token: z.string(),
  guild_id: z.string(),
  channel_id: z.string(),
  member: z.object({ user: z.object({ id: z.string() }) }),
})

const commandSchema = baseSchema.extend({
  type: z.literal(InteractionType.APPLICATION_COMMAND),
  data: z.object({
    name: z.enum(['move', 'newgame', 'scoreboard']),
    options: z
      .array(z.object({ name: z.string(), value: z.string() }))
      .default([])
      .transform((options) => Object.fromEntries(options.map(({ name, value }) => [name, value]))),
  }),
})

const buttonSchema = baseSchema.extend({
  type: z.literal(InteractionType.MESSAGE_COMPONENT),
  data: z.object({ custom_id: z.string() }),
})

export const interactionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal(InteractionType.PING) }),
  commandSchema,
  buttonSchema,
])

export type CommandInteraction = z.infer<typeof commandSchema>
export type ButtonInteraction = z.infer<typeof buttonSchema>

export type Reply = {
  content: string
  ephemeral?: boolean
  components?: ActionRow[]
  board?: Chess
  ping?: string
}

export function mention(userId: string): string {
  return `<@${userId}>`
}
