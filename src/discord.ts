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

const optionsSchema = z
  .array(z.object({ name: z.string(), value: z.string(), focused: z.boolean().optional() }))
  .default([])

type CommandOption = z.infer<typeof optionsSchema>[number]

function toValues(options: CommandOption[]): Record<string, string> {
  return Object.fromEntries(options.map(({ name, value }) => [name, value]))
}

const commandSchema = baseSchema.extend({
  type: z.literal(InteractionType.APPLICATION_COMMAND),
  data: z.object({
    name: z.enum(['move', 'newgame', 'scoreboard']),
    options: optionsSchema.transform(toValues),
  }),
})

const autocompleteSchema = baseSchema.extend({
  type: z.literal(InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE),
  data: z.object({ options: optionsSchema }).transform(({ options }) => ({
    focused: options.find((option) => option.focused)?.name,
    options: toValues(options),
  })),
})

const buttonSchema = baseSchema.extend({
  type: z.literal(InteractionType.MESSAGE_COMPONENT),
  data: z.object({ custom_id: z.string() }),
})

export const interactionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal(InteractionType.PING) }),
  commandSchema,
  autocompleteSchema,
  buttonSchema,
])

export type CommandInteraction = z.infer<typeof commandSchema>
export type AutocompleteInteraction = z.infer<typeof autocompleteSchema>
export type ButtonInteraction = z.infer<typeof buttonSchema>

export type Reply = {
  content: string
  ephemeral?: boolean
  components?: ActionRow[]
  board?: Chess
  ping?: string
}

export type Choice = { name: string; value: string }

export function mention(userId: string): string {
  return `<@${userId}>`
}
