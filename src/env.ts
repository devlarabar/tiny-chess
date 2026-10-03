import { z } from 'zod'

export const env = z
  .object({ DATABASE_URL: z.string(), DISCORD_PUBLIC_KEY: z.string() })
  .parse(process.env)
