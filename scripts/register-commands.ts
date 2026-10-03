import { z } from 'zod'

const { DISCORD_APP_ID, DISCORD_TOKEN } = z
  .object({ DISCORD_APP_ID: z.string(), DISCORD_TOKEN: z.string() })
  .parse(process.env)

const STRING = 3
const USER = 6
const GUILD_ONLY = [0]

const commands = [
  {
    name: 'move',
    description: 'Move one of your pieces',
    contexts: GUILD_ONLY,
    options: [
      {
        type: STRING,
        name: 'from',
        description: 'A square like e2, or a piece name like pawn',
        required: true,
        autocomplete: true,
      },
      { type: STRING, name: 'to', description: 'The square to move to, like e4', required: true, autocomplete: true },
      {
        type: STRING,
        name: 'promote',
        description: 'What a pawn turns into on the last row (Queen if left empty)',
        choices: [
          { name: 'Queen', value: 'q' },
          { name: 'Rook', value: 'r' },
          { name: 'Bishop', value: 'b' },
          { name: 'Knight', value: 'n' },
        ],
      },
    ],
  },
  {
    name: 'newgame',
    description: 'Start a new chess game in this channel',
    contexts: GUILD_ONLY,
    options: [{ type: USER, name: 'opponent', description: 'Who you want to play', required: true }],
  },
  { name: 'scoreboard', description: 'Show wins, losses, and ties in this server', contexts: GUILD_ONLY },
]

const response = await fetch(`https://discord.com/api/v10/applications/${DISCORD_APP_ID}/commands`, {
  method: 'PUT',
  headers: { Authorization: `Bot ${DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(commands),
})
if (!response.ok) throw new Error(`Registering commands failed: ${response.status} ${await response.text()}`)
console.log('Registered /move, /newgame and /scoreboard')
