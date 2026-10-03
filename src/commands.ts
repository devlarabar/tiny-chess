import { Chess } from 'chess.js'
import { type Button, ButtonStyleTypes, MessageComponentTypes } from 'discord-interactions'
import { z } from 'zod'
import { findActiveGame, findRecords, type Game, saveMove, startGame } from './db.js'
import {
  type AutocompleteInteraction,
  type ButtonInteraction,
  type Choice,
  type CommandInteraction,
  mention,
  type Reply,
} from './discord.js'
import { describeMove, outcome, playMove, suggestDestinations, suggestOrigins } from './game.js'

const moveOptionsSchema = z.object({
  from: z.string().trim().toLowerCase(),
  to: z.string().trim().toLowerCase(),
  promote: z.enum(['q', 'r', 'b', 'n']).default('q'),
})
const newGameOptionsSchema = z.object({ opponent: z.string() })
const colorSchema = z.enum(['White', 'Black', 'Random'])
const colorButtonSchema = z.tuple([colorSchema, z.string()], z.coerce.number())

function fail(content: string): Reply {
  return { content, ephemeral: true }
}

type Turn = { game: Game; chess: Chess } | { error: string }

function isPlayer(game: Game, userId: string): boolean {
  return userId === game.whiteId || userId === game.blackId
}

async function loadTurn(channelId: string, userId: string): Promise<Turn> {
  const game = await findActiveGame(channelId)
  if (!game) return { error: 'No game in this channel. Start one with /newgame.' }
  if (!isPlayer(game, userId)) return { error: "You're not playing this game." }
  const chess = new Chess()
  chess.loadPgn(game.pgn)
  if (userId !== (chess.turn() === 'w' ? game.whiteId : game.blackId)) return { error: "It's not your turn." }
  return { game, chess }
}

export async function suggestMoves(interaction: AutocompleteInteraction): Promise<Choice[]> {
  const turn = await loadTurn(interaction.channel_id, interaction.member.user.id)
  if ('error' in turn) return []
  const { from = '', to = '' } = moveOptionsSchema.partial().parse(interaction.data.options)
  if (interaction.data.focused === 'to') return suggestDestinations(turn.chess, from, to)
  return suggestOrigins(turn.chess, from)
}

export async function move(interaction: CommandInteraction): Promise<Reply> {
  const userId = interaction.member.user.id
  const turn = await loadTurn(interaction.channel_id, userId)
  if ('error' in turn) return fail(turn.error)
  const { game, chess } = turn
  const { from, to, promote } = moveOptionsSchema.parse(interaction.data.options)
  const result = playMove(chess, from, to, promote)
  if ('error' in result) return fail(result.error)
  if (!(await saveMove(game, chess.pgn(), outcome(chess, userId)))) {
    return fail('The board changed while you were moving. Try again.')
  }
  const opponentId = userId === game.whiteId ? game.blackId : game.whiteId
  return { content: describeMove(chess, result.move, userId, opponentId), board: chess, ping: opponentId }
}

export async function newgame(interaction: CommandInteraction): Promise<Reply> {
  const userId = interaction.member.user.id
  const { opponent } = newGameOptionsSchema.parse(interaction.data.options)
  const game = await findActiveGame(interaction.channel_id)
  if (game && !isPlayer(game, userId)) {
    return fail(`${mention(game.whiteId)} and ${mention(game.blackId)} are mid-game here. Try another channel.`)
  }
  const warning = game ? 'This ends the current game and counts as your resignation. ' : ''
  const abandonedGameId = game ? `:${game.id}` : ''
  return {
    content: `${warning}Pick your color against ${mention(opponent)}:`,
    ephemeral: true,
    components: [
      {
        type: MessageComponentTypes.ACTION_ROW,
        components: colorSchema.options.map(
          (label): Button => ({
            type: MessageComponentTypes.BUTTON,
            style: ButtonStyleTypes.PRIMARY,
            label,
            custom_id: `${label}:${opponent}${abandonedGameId}`,
          }),
        ),
      },
    ],
  }
}

export async function chooseColor(interaction: ButtonInteraction): Promise<Reply> {
  const userId = interaction.member.user.id
  const [color, opponentId, abandonedGameId] = colorButtonSchema.parse(interaction.data.custom_id.split(':'))
  const starterIsWhite = color === 'White' || (color === 'Random' && Math.random() < 0.5)
  const [whiteId, blackId] = starterIsWhite ? [userId, opponentId] : [opponentId, userId]
  const chess = new Chess()
  const result = await startGame({
    guildId: interaction.guild_id,
    channelId: interaction.channel_id,
    whiteId,
    blackId,
    starterId: userId,
    pgn: chess.pgn(),
    abandonedGameId,
  })
  if (result.status === 'busy') return fail('Another game already started in this channel.')
  const forfeit = result.forfeitWinnerId
    ? `${mention(userId)} resigned the last game, so ${mention(result.forfeitWinnerId)} wins. `
    : ''
  return {
    content: `${forfeit}New game! ${mention(whiteId)} plays White, ${mention(blackId)} plays Black. ${mention(whiteId)}, your turn.`,
    board: chess,
    ping: opponentId,
  }
}

export async function scoreboard(interaction: CommandInteraction): Promise<Reply> {
  const records = await findRecords(interaction.guild_id)
  if (records.length === 0) return { content: 'No finished games yet.' }
  const lines = records.map(
    ({ playerId, wins, losses, ties }) => `${mention(playerId)}: Wins ${wins} · Losses ${losses} · Ties ${ties}`,
  )
  return { content: ['**Scoreboard**', ...lines].join('\n') }
}
