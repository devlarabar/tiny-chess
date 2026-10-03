// Glyphs from the 04b03 pixel font by Yuji Oshimoto: https://www.dafont.com/04b-03.font
const FILE_GLYPHS = [
  ['.##.', '#..#', '#..#', '####', '#..#'],
  ['###.', '#..#', '###.', '#..#', '###.'],
  ['.##', '#..', '#..', '#..', '.##'],
  ['###.', '#..#', '#..#', '#..#', '###.'],
  ['###', '#..', '###', '#..', '###'],
  ['###', '#..', '###', '#..', '#..'],
  ['.###', '#...', '#.##', '#..#', '.###'],
  ['#..#', '#..#', '####', '#..#', '#..#'],
]
const RANK_GLYPHS = [
  ['##', '.#', '.#', '.#', '.#'],
  ['###.', '...#', '.##.', '#...', '####'],
  ['###.', '...#', '.##.', '...#', '###.'],
  ['..#.', '.##.', '#.#.', '####', '..#.'],
  ['####', '#...', '###.', '...#', '###.'],
  ['.##.', '#...', '###.', '#..#', '.##.'],
  ['####', '...#', '..#.', '.#..', '.#..'],
  ['.##.', '#..#', '.##.', '#..#', '.##.'],
]
const GLYPH_HEIGHT_PX = 5
const INK_RGBA = 0x000000ff
const STROKE_RGBA = 0xffffffff

export type Label = { input: Buffer; raw: { width: number; height: number; channels: 4 } }

function touchesInk(ink: Set<string>, x: number, y: number): boolean {
  return [-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => ink.has(`${x + dx},${y + dy}`)))
}

function rasterize(glyphs: string[][]): Label {
  const ink = new Set<string>()
  let width = 1
  for (const glyph of glyphs) {
    glyph.forEach((row, top) =>
      [...row].forEach((pixel, column) => {
        if (pixel === '#') ink.add(`${width + column},${top + 1}`)
      }),
    )
    width += Math.max(...glyph.map((row) => row.length)) + 1
  }
  const height = GLYPH_HEIGHT_PX + 2
  const input = Buffer.alloc(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4
      if (ink.has(`${x},${y}`)) input.writeUInt32BE(INK_RGBA, offset)
      else if (touchesInk(ink, x, y)) input.writeUInt32BE(STROKE_RGBA, offset)
    }
  }
  return { input, raw: { width, height, channels: 4 } }
}

export const SQUARE_LABELS = RANK_GLYPHS.toReversed().flatMap((rank) => FILE_GLYPHS.map((file) => rasterize([file, rank])))
