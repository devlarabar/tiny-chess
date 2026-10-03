import { neon, NeonDbError } from '@neondatabase/serverless'
import { z } from 'zod'
import { env } from './env.js'
import type { Outcome } from './game.js'

const sql = neon(env.DATABASE_URL)

const gameSchema = z.object({ id: z.number(), whiteId: z.string(), blackId: z.string(), pgn: z.string() })
const forfeitSchema = z.object({ winnerId: z.string() })
const recordSchema = z.object({ playerId: z.string(), wins: z.number(), losses: z.number(), ties: z.number() })

const UNIQUE_VIOLATION = '23505'

export type Game = z.infer<typeof gameSchema>
export type PlayerRecord = z.infer<typeof recordSchema>

export type NewGame = {
  guildId: string
  channelId: string
  whiteId: string
  blackId: string
  starterId: string
  pgn: string
  abandonedGameId: number | undefined
}

export type StartResult = { status: 'busy' } | { status: 'started'; forfeitWinnerId: string | undefined }

export async function findActiveGame(channelId: string): Promise<Game | undefined> {
  const rows = await sql`
    select id, white_id as "whiteId", black_id as "blackId", pgn
    from games
    where channel_id = ${channelId} and status = 'active'`
  return gameSchema.array().parse(rows)[0]
}

export async function saveMove(game: Game, pgn: string, { status, winnerId }: Outcome): Promise<boolean> {
  const rows = await sql`
    update games set pgn = ${pgn}, status = ${status}, winner_id = ${winnerId}
    where id = ${game.id} and pgn = ${game.pgn}
    returning id`
  return rows.length > 0
}

export async function startGame(newGame: NewGame): Promise<StartResult> {
  try {
    const [forfeits] = await sql.transaction([
      sql`
        update games
        set status = 'won', winner_id = case when white_id = ${newGame.starterId} then black_id else white_id end
        where id = ${newGame.abandonedGameId ?? null} and status = 'active'
        returning winner_id as "winnerId"`,
      sql`
        insert into games (guild_id, channel_id, white_id, black_id, pgn)
        values (${newGame.guildId}, ${newGame.channelId}, ${newGame.whiteId}, ${newGame.blackId}, ${newGame.pgn})`,
    ])
    return { status: 'started', forfeitWinnerId: forfeitSchema.array().parse(forfeits)[0]?.winnerId }
  } catch (error) {
    if (error instanceof NeonDbError && error.code === UNIQUE_VIOLATION) return { status: 'busy' }
    throw error
  }
}

export async function findRecords(guildId: string): Promise<PlayerRecord[]> {
  const rows = await sql`
    select
      player_id as "playerId",
      count(*) filter (where winner_id = player_id)::int as wins,
      count(*) filter (where winner_id <> player_id)::int as losses,
      count(*) filter (where status = 'drawn')::int as ties
    from games cross join lateral (values (white_id), (black_id)) as players (player_id)
    where guild_id = ${guildId} and status <> 'active' and white_id <> black_id
    group by player_id
    order by wins desc`
  return recordSchema.array().parse(rows)
}
