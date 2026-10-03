import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Chess, PieceSymbol } from 'chess.js'
import sharp from 'sharp'
import { SQUARE_LABELS } from './labels.js'

const SHEET_PATH = join(process.cwd(), 'assets', 'chess.png')
const SHEET_COLUMNS: PieceSymbol[] = ['r', 'n', 'b', 'q', 'k', 'p']
const SQUARE_PX = 32
const BOARD_PX = SQUARE_PX * 8
const HOLE_LEFT_PX = SQUARE_PX
const HOLE_TOP_PX = SQUARE_PX * 3
const HOLE_END_LEFT_PX = HOLE_LEFT_PX + SQUARE_PX
const HOLE_END_TOP_PX = HOLE_TOP_PX + SQUARE_PX
const FRAME_SIDE_PX = 14
const FRAME_BOTTOM_PX = 19
const BOARD_END_PX = FRAME_SIDE_PX + BOARD_PX
const IMAGE_WIDTH_PX = BOARD_END_PX + FRAME_SIDE_PX
const IMAGE_HEIGHT_PX = BOARD_END_PX + FRAME_BOTTOM_PX
const SCALE = 2

type Position = { left: number; top: number }

function position(index: number): Position {
  return {
    left: FRAME_SIDE_PX + (index % 8) * SQUARE_PX,
    top: FRAME_SIDE_PX + Math.floor(index / 8) * SQUARE_PX,
  }
}

export async function renderBoard(chess: Chess): Promise<Buffer> {
  const sheet = await readFile(SHEET_PATH)
  const crop = (left: number, top: number, width: number, height: number) =>
    sharp(sheet).extract({ left, top, width, height }).toBuffer()

  const [lightSquare, darkSquare, topLeft, topRight, bottomLeft, bottomRight, topEdge, bottomEdge, leftEdge, rightEdge] =
    await Promise.all([
      crop(SQUARE_PX * 4, SQUARE_PX * 3, SQUARE_PX, SQUARE_PX),
      crop(SQUARE_PX * 3, SQUARE_PX * 3, SQUARE_PX, SQUARE_PX),
      crop(HOLE_LEFT_PX - FRAME_SIDE_PX, HOLE_TOP_PX - FRAME_SIDE_PX, FRAME_SIDE_PX, FRAME_SIDE_PX),
      crop(HOLE_END_LEFT_PX, HOLE_TOP_PX - FRAME_SIDE_PX, FRAME_SIDE_PX, FRAME_SIDE_PX),
      crop(HOLE_LEFT_PX - FRAME_SIDE_PX, HOLE_END_TOP_PX, FRAME_SIDE_PX, FRAME_BOTTOM_PX),
      crop(HOLE_END_LEFT_PX, HOLE_END_TOP_PX, FRAME_SIDE_PX, FRAME_BOTTOM_PX),
      crop(HOLE_LEFT_PX, HOLE_TOP_PX - FRAME_SIDE_PX, SQUARE_PX, FRAME_SIDE_PX),
      crop(HOLE_LEFT_PX, HOLE_END_TOP_PX, SQUARE_PX, FRAME_BOTTOM_PX),
      crop(HOLE_LEFT_PX - FRAME_SIDE_PX, HOLE_TOP_PX, FRAME_SIDE_PX, SQUARE_PX),
      crop(HOLE_END_LEFT_PX, HOLE_TOP_PX, FRAME_SIDE_PX, SQUARE_PX),
    ])

  const edgeOffsets = Array.from({ length: 8 }, (_, index) => FRAME_SIDE_PX + index * SQUARE_PX)
  const frame = [
    { input: topLeft, left: 0, top: 0 },
    { input: topRight, left: BOARD_END_PX, top: 0 },
    { input: bottomLeft, left: 0, top: BOARD_END_PX },
    { input: bottomRight, left: BOARD_END_PX, top: BOARD_END_PX },
    ...edgeOffsets.flatMap((offset) => [
      { input: topEdge, left: offset, top: 0 },
      { input: bottomEdge, left: offset, top: BOARD_END_PX },
      { input: leftEdge, left: 0, top: offset },
      { input: rightEdge, left: BOARD_END_PX, top: offset },
    ]),
  ]

  const cells = chess.board().flat()
  const squares = cells.map((_, index) => ({
    input: ((index % 8) + Math.floor(index / 8)) % 2 === 0 ? lightSquare : darkSquare,
    ...position(index),
  }))
  const pieces = await Promise.all(
    cells.flatMap((piece, index) => {
      if (!piece) return []
      const sprite = crop(SHEET_COLUMNS.indexOf(piece.type) * SQUARE_PX, piece.color === 'w' ? 0 : SQUARE_PX, SQUARE_PX, SQUARE_PX)
      return [sprite.then((input) => ({ input, ...position(index) }))]
    }),
  )

  const labels = SQUARE_LABELS.map((label, index) => {
    const { left, top } = position(index)
    return { ...label, left: left + SQUARE_PX - label.raw.width, top: top + SQUARE_PX - label.raw.height }
  })

  const board = await sharp({
    create: { width: IMAGE_WIDTH_PX, height: IMAGE_HEIGHT_PX, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([...frame, ...squares, ...pieces, ...labels])
    .png()
    .toBuffer()
  return sharp(board)
    .resize(IMAGE_WIDTH_PX * SCALE, IMAGE_HEIGHT_PX * SCALE, { kernel: sharp.kernel.nearest })
    .png()
    .toBuffer()
}
