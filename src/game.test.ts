import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { describeMove, outcome, playMove } from './game.js'

describe('playMove', () => {
  it('moves the only piece of a type that can reach the square', () => {
    const chess = new Chess()
    const result = playMove(chess, 'pawn', 'e4', 'q')
    expect(result).toMatchObject({ move: { from: 'e2', to: 'e4' } })
  })

  it('moves the piece on the given square', () => {
    const chess = new Chess()
    const result = playMove(chess, 'g1', 'f3', 'q')
    expect(result).toMatchObject({ move: { from: 'g1', to: 'f3', piece: 'n' } })
  })

  it('rejects a piece name when more than one piece can reach the square', () => {
    const chess = new Chess('k7/8/8/8/8/8/8/1N3N1K w - - 0 1')
    expect(playMove(chess, 'knight', 'd2', 'q')).toEqual({
      error: 'More than one knight can reach d2 (b1, f1). Use its square instead.',
    })
  })

  it('rejects illegal moves', () => {
    const chess = new Chess()
    expect(playMove(chess, 'b2', 'c2', 'q')).toEqual({ error: "You can't move b2 to c2." })
  })

  it("rejects moving the opponent's piece", () => {
    const chess = new Chess()
    expect(playMove(chess, 'e7', 'e5', 'q')).toEqual({ error: "You can't move e7 to e5." })
  })

  it('rejects moves that leave the king in check', () => {
    const chess = new Chess('k3r3/8/8/8/8/8/4B3/4K3 w - - 0 1')
    expect(playMove(chess, 'bishop', 'd3', 'q')).toEqual({ error: "You can't move bishop to d3." })
  })

  it('promotes to the chosen piece', () => {
    const chess = new Chess('k7/4P3/8/8/8/8/8/7K w - - 0 1')
    playMove(chess, 'e7', 'e8', 'n')
    expect(chess.get('e8')).toEqual({ type: 'n', color: 'w' })
  })
})

describe('describeMove and outcome', () => {
  it('describes a capture and hands the turn over', () => {
    const chess = new Chess()
    chess.move('e4')
    chess.move('d5')
    const result = playMove(chess, 'pawn', 'd5', 'q')
    if ('error' in result) throw new Error(result.error)
    expect(describeMove(chess, result.move, 'lara', 'lemon')).toBe(
      "<@lara> moved their Pawn from E4 to D5 and took <@lemon>'s Pawn. <@lemon>, your turn.",
    )
    expect(outcome(chess, 'lara')).toEqual({ status: 'active', winnerId: null })
  })

  it('announces check', () => {
    const chess = new Chess('k7/8/8/8/8/8/8/1R5K w - - 0 1')
    const result = playMove(chess, 'rook', 'a1', 'q')
    if ('error' in result) throw new Error(result.error)
    expect(describeMove(chess, result.move, 'lara', 'lemon')).toBe(
      '<@lara> moved their Rook from B1 to A1. <@lemon> is in check!',
    )
  })

  it('ends the game with a winner on checkmate', () => {
    const chess = new Chess()
    chess.move('f3')
    chess.move('e5')
    chess.move('g4')
    const result = playMove(chess, 'queen', 'h4', 'q')
    if ('error' in result) throw new Error(result.error)
    expect(describeMove(chess, result.move, 'lemon', 'lara')).toBe(
      '<@lemon> moved their Queen from D8 to H4. Checkmate! <@lemon> wins.',
    )
    expect(outcome(chess, 'lemon')).toEqual({ status: 'won', winnerId: 'lemon' })
  })

  it('ends the game as a draw on stalemate', () => {
    const chess = new Chess('k7/8/8/8/8/8/1Q6/7K w - - 0 1')
    const result = playMove(chess, 'queen', 'b6', 'q')
    if ('error' in result) throw new Error(result.error)
    expect(describeMove(chess, result.move, 'lara', 'lemon')).toBe(
      "<@lara> moved their Queen from B2 to B6. It's a draw.",
    )
    expect(outcome(chess, 'lara')).toEqual({ status: 'drawn', winnerId: null })
  })
})
