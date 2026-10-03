import { waitUntil } from '@vercel/functions'
import type { Chess } from 'chess.js'
import { InteractionResponseFlags, InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions'
import { chooseColor, move, newgame, scoreboard, suggestMoves } from '../src/commands.js'
import { interactionSchema, type Reply } from '../src/discord.js'
import { env } from '../src/env.js'
import { renderBoard } from '../src/render.js'

const commands = { move, newgame, scoreboard }

function messageData({ content, ephemeral, components, ping }: Reply) {
  return {
    content,
    components,
    flags: ephemeral ? InteractionResponseFlags.EPHEMERAL : undefined,
    allowed_mentions: { users: ping ? [ping] : [] },
  }
}

async function editWithBoard(applicationId: string, token: string, reply: Reply, board: Chess): Promise<void> {
  const form = new FormData()
  form.append('payload_json', JSON.stringify({ ...messageData(reply), attachments: [{ id: 0, filename: 'board.png' }] }))
  form.append('files[0]', new Blob([new Uint8Array(await renderBoard(board))], { type: 'image/png' }), 'board.png')
  const response = await fetch(`https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`, {
    method: 'PATCH',
    body: form,
  })
  if (!response.ok) throw new Error(`Discord rejected the board update: ${response.status} ${await response.text()}`)
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.text()
  const signature = request.headers.get('x-signature-ed25519')
  const timestamp = request.headers.get('x-signature-timestamp')
  if (!signature || !timestamp || !(await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY))) {
    return new Response('Invalid request signature', { status: 401 })
  }

  const interaction = interactionSchema.parse(JSON.parse(body))
  if (interaction.type === InteractionType.PING) return Response.json({ type: InteractionResponseType.PONG })
  if (interaction.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
    return Response.json({
      type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
      data: { choices: await suggestMoves(interaction) },
    })
  }

  const reply =
    interaction.type === InteractionType.APPLICATION_COMMAND
      ? await commands[interaction.data.name](interaction)
      : await chooseColor(interaction)
  if (!reply.board) {
    return Response.json({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: messageData(reply) })
  }

  // Discord drops interactions that aren't acknowledged within 3 seconds, so render after deferring.
  waitUntil(editWithBoard(interaction.application_id, interaction.token, reply, reply.board))
  return Response.json({ type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE })
}
