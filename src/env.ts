import { z } from 'zod'

export const env = z
  .object({
    DATABASE_URL: z.string(),
    DISCORD_PUBLIC_KEY: z.string(),
    SHOW_BOARD_FRAME: z.stringbool().default(false),
  })
  .parse(process.env)
