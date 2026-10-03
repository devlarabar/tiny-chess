import type { Chess, Move, PieceSymbol } from 'chess.js'
import { type Choice, mention } from './discord.js'

const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King',
}

const MAX_CHOICES = 25

export type MoveResult = { move: Move } | { error: string }

export type Outcome = { status: 'active' | 'won' | 'drawn'; winnerId: string | null }

function isFrom(move: Move, from: string): boolean {
  return move.from === from || PIECE_NAMES[move.piece].toLowerCase() === from
}

function matching(choices: Choice[], typed: string): Choice[] {
  return [...new Map(choices.map((choice) => [choice.name, choice])).values()]
    .filter(({ name, value }) => value.startsWith(typed) || name.toLowerCase().startsWith(typed))
    .slice(0, MAX_CHOICES)
}

export function suggestOrigins(chess: Chess, typed: string): Choice[] {
  const choices = chess.moves({ verbose: true }).map((move) => ({
    name: `${PIECE_NAMES[move.piece]} on ${move.from.toUpperCase()}`,
    value: move.from,
  }))
  return matching(choices, typed)
}

export function suggestDestinations(chess: Chess, from: string, typed: string): Choice[] {
  const choices = chess
    .moves({ verbose: true })
    .filter((move) => !from || isFrom(move, from))
    .map((move) => {
      const capture = move.captured ? `, takes ${PIECE_NAMES[move.captured]}` : ''
      return {
        name: `${move.to.toUpperCase()} (${PIECE_NAMES[move.piece]} from ${move.from.toUpperCase()}${capture})`,
        value: move.to,
      }
    })
  return matching(choices, typed)
}

export function playMove(chess: Chess, from: string, to: string, promotion: PieceSymbol): MoveResult {
  const origins = new Set(
    chess
      .moves({ verbose: true })
      .filter((move) => move.to === to && isFrom(move, from))
      .map((move) => move.from),
  )
  const [origin, ...others] = origins
  if (!origin) return { error: `You can't move ${from} to ${to}.` }
  if (others.length > 0) {
    return { error: `More than one ${from} can reach ${to} (${[...origins].join(', ')}). Use its square instead.` }
  }
  return { move: chess.move({ from: origin, to, promotion }) }
}

export function outcome(chess: Chess, moverId: string): Outcome {
  if (chess.isCheckmate()) return { status: 'won', winnerId: moverId }
  if (chess.isDraw()) return { status: 'drawn', winnerId: null }
  return { status: 'active', winnerId: null }
}

export function describeMove(chess: Chess, move: Move, moverId: string, opponentId: string): string {
  const capture = move.captured ? ` and took ${mention(opponentId)}'s ${PIECE_NAMES[move.captured]}` : ''
  const summary = `${mention(moverId)} moved their ${PIECE_NAMES[move.piece]} from ${move.from.toUpperCase()} to ${move.to.toUpperCase()}${capture}.`
  if (chess.isCheckmate()) return `${summary} Checkmate! ${mention(moverId)} wins.`
  if (chess.isDraw()) return `${summary} It's a draw.`
  if (chess.isCheck()) return `${summary} ${mention(opponentId)} is in check!`
  return `${summary} ${mention(opponentId)}, your turn.`
}
