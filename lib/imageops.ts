/**
 * Pixel-level adjustments on RGBA buffers (Uint8ClampedArray, 4 bytes per pixel).
 * Written by hand so they behave the same in every browser, including Safari.
 * No imports, so they can be unit tested directly.
 */

export interface Adjustments {
  brightness: number; // −100 … 100
  contrast: number;   // −100 … 100
  saturation: number; // −100 … 100
}

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

export function applyAdjustments(data: Uint8ClampedArray, adj: Adjustments): void {
  const b = (adj.brightness / 100) * 255;
  const c = (adj.contrast / 100) * 255;
  const contrastFactor = (259 * (c + 255)) / (255 * (259 - c));
  const s = adj.saturation / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] + b;
    let g = data[i + 1] + b;
    let bl = data[i + 2] + b;

    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    bl = contrastFactor * (bl - 128) + 128;

    if (s !== 0) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * bl;
      r = gray + (r - gray) * (1 + s);
      g = gray + (g - gray) * (1 + s);
      bl = gray + (bl - gray) * (1 + s);
    }

    data[i] = clamp255(r);
    data[i + 1] = clamp255(g);
    data[i + 2] = clamp255(bl);
  }
}

/** Stretches luminance so the darkest 0.5% becomes black and the brightest 0.5% becomes white. */
export function autoLevels(data: Uint8ClampedArray): void {
  const hist = new Uint32Array(256);
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    hist[lum]++;
    total++;
  }
  if (total === 0) return;

  const cutoff = total * 0.005;
  let lo = 0;
  let acc = 0;
  while (lo < 255 && acc + hist[lo] <= cutoff) acc += hist[lo++];
  let hi = 255;
  acc = 0;
  while (hi > 0 && acc + hist[hi] <= cutoff) acc += hist[hi--];
  if (hi <= lo) return;

  const scale = 255 / (hi - lo);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp255((data[i] - lo) * scale);
    data[i + 1] = clamp255((data[i + 1] - lo) * scale);
    data[i + 2] = clamp255((data[i + 2] - lo) * scale);
  }
}

/**
 * Unsharp mask: subtracts a 3×3 box blur to boost edges. amount 0 = none, 1 = strong.
 * Alpha is left unchanged.
 */
export function sharpen(data: Uint8ClampedArray, width: number, height: number, amount: number): void {
  if (amount <= 0) return;
  const src = new Uint8ClampedArray(data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        let sum = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= height) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= width) continue;
            sum += src[(yy * width + xx) * 4 + ch];
            n++;
          }
        }
        const blur = sum / n;
        data[idx + ch] = clamp255(src[idx + ch] + amount * (src[idx + ch] - blur));
      }
    }
  }
}
