import { describe, expect, it } from 'vitest';
import { analyzeCentralRed, isRed, type Rgba } from './topoImage';

const BLUE = [40, 90, 220];
const YELLOW = [240, 220, 60];
const RED = [225, 30, 30];
const WHITE = [255, 255, 255];

/**
 * A fake post-wear map: blue flattened centre, yellow transition, red ring
 * between 2.5 and 3.5 mm from the treatment centre, white outside 5 mm.
 * `shiftMm` moves the treatment zone right, as a decentred lens would.
 */
function fakeMap(shiftMm: number, pxPerMm = 20, sizeMm = 12): Rgba {
  const size = sizeMm * pxPerMm;
  const data = new Uint8ClampedArray(size * size * 4);
  const cx = size / 2 + shiftMm * pxPerMm;
  const cy = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dMap = Math.hypot(x - size / 2, y - size / 2) / pxPerMm;
      const d = Math.hypot(x - cx, y - cy) / pxPerMm;
      const colour = dMap > 5 ? WHITE : d < 1.8 ? BLUE : d < 2.5 ? YELLOW : d < 3.5 ? RED : YELLOW;
      data.set([...colour, 255], (y * size + x) * 4);
    }
  }
  return { data, width: size, height: size };
}

describe('isRed', () => {
  it('accepts map reds and rejects blue, yellow, white, grey and black', () => {
    expect(isRed(225, 30, 30)).toBe(true);
    expect(isRed(240, 70, 40)).toBe(true);
    expect(isRed(40, 90, 220)).toBe(false);
    expect(isRed(240, 220, 60)).toBe(false);
    expect(isRed(255, 255, 255)).toBe(false);
    expect(isRed(150, 140, 140)).toBe(false);
    expect(isRed(60, 0, 0)).toBe(false);
  });
});

describe('analyzeCentralRed', () => {
  const pxPerMm = 20;
  const centre = { x: 120, y: 120 };

  it('a centred lens: no red inside the central 3 mm, so no flag', () => {
    const r = analyzeCentralRed(fakeMap(0), centre, pxPerMm);
    expect(r.redFraction).toBe(0);
    expect(r.flagged).toBe(false);
    expect(r.redCentroidOffsetMm!.distance).toBeLessThan(0.1);
  });

  it('a lens decentred by 1.5 mm: red enters the central zone and is flagged', () => {
    const r = analyzeCentralRed(fakeMap(1.5), centre, pxPerMm);
    expect(r.redFraction).toBeGreaterThan(0.05);
    expect(r.flagged).toBe(true);
  });

  it('reports red on the side opposite to where the treatment zone moved', () => {
    // Zone moved right, so the left part of the red ring now crosses the centre.
    const r = analyzeCentralRed(fakeMap(1.5), centre, pxPerMm);
    expect(r.redCentroidOffsetMm!.x).toBeLessThan(0);
  });
});
