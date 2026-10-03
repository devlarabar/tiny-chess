# tiny-chess

Chess in a Discord channel, drawn with custom pixel art. Runs as a Vercel function backed by Neon Postgres.

## Commands

- `/newgame opponent:@someone` picks your color and starts a game in this channel. Starting over mid-game counts as your resignation.
- `/move from:pawn to:e4` moves a piece. `from` takes a square (`e2`) or a piece name when only one of your pieces of that type can reach `to`.
- `/scoreboard` shows wins, losses, and ties for this server.

## Setup

1. Put the sprite sheet at `assets/chess.png` (32px tiles: white pieces, black pieces, frame, squares).
2. Create a Discord app at https://discord.com/developers/applications.
3. Create a Neon database and run `schema.sql` in its SQL editor.
4. Deploy to Vercel with `DATABASE_URL` and `DISCORD_PUBLIC_KEY` set.
5. Set the app's Interactions Endpoint URL to `https://<your-app>.vercel.app/api/interactions`.
6. Add `DISCORD_APP_ID` and `DISCORD_TOKEN` to `.env.local`, then run `pnpm register`.
7. Invite the bot with the `applications.commands` scope.
