// ---------------------------------------------------------------------------
// IMAGE I/O + INFERENCE-PARITY PREPROCESSING
//
// The deployed app never sees raw pixels. It hands an <img> element to
// @teachablemachine/image, which (utils/canvas.js cropTo + utils/tf.js capture):
//
//   1. scales the image so its SHORT side equals imageSize (224), using ceil()
//   2. draws it centred at offset -floor(overflow / 2), cropping to 224x224
//   3. reads the canvas back as 8-bit RGB and normalises with  x / 127 - 1
//
// Training must reproduce those three steps exactly. The previous trainer did
// neither: it stretched the whole image to 64x64 (distorting aspect ratio) and
// normalised with x / 255, so even a well-trained model would have been fed
// differently-shaped, differently-scaled inputs once deployed.
//
// PREPROCESS_VERSION is part of the feature-cache key. Bump it whenever any
// function here changes, or stale cached features will be reused.
// ---------------------------------------------------------------------------
import jpeg from "jpeg-js";
import { PNG } from "pngjs";

export const PREPROCESS_VERSION = 4;
export const IMAGE_SIZE = 224;

// --- decoding --------------------------------------------------------------

// Browsers apply EXIF orientation before drawing an <img> to a canvas, so the
// app always classifies an upright photo. jpeg-js ignores EXIF, which would
// feed sideways phone photos to training. Read the tag and rotate to match.
const readExifOrientation = (buf) => {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return 1;
  let offset = 2;
  while (offset + 4 < buf.length) {
    if (buf[offset] !== 0xff) break;
    const marker = buf[offset + 1];
    const length = buf.readUInt16BE(offset + 2);
    if (marker === 0xe1 && buf.toString("ascii", offset + 4, offset + 8) === "Exif") {
      const tiff = offset + 10;
      const little = buf.toString("ascii", tiff, tiff + 2) === "II";
      const u16 = (o) => (little ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
      const u32 = (o) => (little ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
      const ifd = tiff + u32(tiff + 4);
      if (ifd + 2 > buf.length) return 1;
      const entries = u16(ifd);
      for (let i = 0; i < entries; i += 1) {
        const entry = ifd + 2 + i * 12;
        if (entry + 12 > buf.length) break;
        if (u16(entry) === 0x0112) {
          const value = u16(entry + 8);
          return value >= 1 && value <= 8 ? value : 1;
        }
      }
      return 1;
    }
    if (marker === 0xda) break; // start of scan — no EXIF after this
    offset += 2 + length;
  }
  return 1;
};

const applyOrientation = (img, orientation) => {
  if (orientation === 1) return img;
  const { width: w, height: h, data } = img;
  const swap = orientation >= 5;
  const outW = swap ? h : w;
  const outH = swap ? w : h;
  const out = new Uint8Array(outW * outH * 4);
  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      let sx; let sy;
      switch (orientation) {
        case 2: sx = w - 1 - x; sy = y; break;
        case 3: sx = w - 1 - x; sy = h - 1 - y; break;
        case 4: sx = x; sy = h - 1 - y; break;
        case 5: sx = y; sy = x; break;
        case 6: sx = y; sy = h - 1 - x; break;
        case 7: sx = w - 1 - y; sy = h - 1 - x; break;
        case 8: sx = w - 1 - y; sy = x; break;
        default: sx = x; sy = y;
      }
      const s = (sy * w + sx) * 4;
      const d = (y * outW + x) * 4;
      out[d] = data[s]; out[d + 1] = data[s + 1]; out[d + 2] = data[s + 2]; out[d + 3] = data[s + 3];
    }
  }
  return { width: outW, height: outH, data: out };
};

/** Decode JPEG/PNG bytes to upright RGBA. Throws on anything else. */
export const decodeImage = (buf) => {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) {
    const raw = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 1024 });
    return applyOrientation({ width: raw.width, height: raw.height, data: raw.data }, readExifOrientation(buf));
  }
  if (buf.length > 8 && buf.toString("hex", 0, 4) === "89504e47") {
    const png = PNG.sync.read(buf);
    // A canvas reads fully transparent pixels back as black.
    const data = new Uint8Array(png.data);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 0) { data[i - 3] = 0; data[i - 2] = 0; data[i - 1] = 0; }
    }
    return { width: png.width, height: png.height, data };
  }
  throw new Error(`unsupported encoding (${buf.toString("hex", 0, 4)})`);
};

// --- resampling ------------------------------------------------------------

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Area-average (box) resampling. For the large downscales here (~768px -> 224)
// point/bilinear sampling aliases badly; box averaging is what a browser's
// canvas downscale converges to. The choice is verified against Chrome's real
// cropTo output by scripts in this folder rather than assumed.
const sampleArea = (img, x0, y0, x1, y1) => {
  const { width: w, height: h, data } = img;
  const ix0 = clamp(Math.floor(x0), 0, w - 1);
  const iy0 = clamp(Math.floor(y0), 0, h - 1);
  const ix1 = clamp(Math.ceil(x1), ix0 + 1, w);
  const iy1 = clamp(Math.ceil(y1), iy0 + 1, h);
  let r = 0; let g = 0; let b = 0; let wsum = 0;
  for (let y = iy0; y < iy1; y += 1) {
    const wy = Math.min(y + 1, y1) - Math.max(y, y0);
    if (wy <= 0) continue;
    for (let x = ix0; x < ix1; x += 1) {
      const wx = Math.min(x + 1, x1) - Math.max(x, x0);
      if (wx <= 0) continue;
      const weight = wx * wy;
      const p = (y * w + x) * 4;
      r += data[p] * weight; g += data[p + 1] * weight; b += data[p + 2] * weight; wsum += weight;
    }
  }
  if (wsum === 0) {
    const p = (iy0 * w + ix0) * 4;
    return [data[p], data[p + 1], data[p + 2]];
  }
  return [r / wsum, g / wsum, b / wsum];
};

const sampleBilinear = (img, sx, sy) => {
  const { width: w, height: h, data } = img;
  const x = clamp(sx, 0, w - 1);
  const y = clamp(sy, 0, h - 1);
  const x0 = Math.floor(x); const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, w - 1); const y1 = Math.min(y0 + 1, h - 1);
  const fx = x - x0; const fy = y - y0;
  const out = [0, 0, 0];
  for (let c = 0; c < 3; c += 1) {
    const a = data[(y0 * w + x0) * 4 + c]; const bb = data[(y0 * w + x1) * 4 + c];
    const cc = data[(y1 * w + x0) * 4 + c]; const d = data[(y1 * w + x1) * 4 + c];
    out[c] = (a * (1 - fx) + bb * fx) * (1 - fy) + (cc * (1 - fx) + d * fx) * fy;
  }
  return out;
};

/**
 * Exact replica of @teachablemachine/image cropTo(image, size): short-side
 * scale with ceil(), centred at -floor(overflow/2). Returns 8-bit RGB
 * (size*size*3) — rounded, because a canvas stores 8-bit channels.
 *
 * resampler "auto" mirrors Chrome's canvas, measured against its real cropTo
 * output: bilinear for mild downscales (scale >= 0.5), area averaging for
 * strong ones, where Chrome switches to mipmapped filtering.
 */
export const tmCrop = (img, size = IMAGE_SIZE, resampler = "auto") => {
  const { width: w, height: h } = img;
  const scale = size / Math.min(w, h);
  const scaledW = Math.ceil(w * scale);
  const scaledH = Math.ceil(h * scale);
  const offX = Math.trunc((scaledW - size) / 2);
  const offY = Math.trunc((scaledH - size) / 2);
  const kx = w / scaledW; // source pixels per destination pixel
  const ky = h / scaledH;
  const useBilinear = resampler === "bilinear" || (resampler === "auto" && scale >= 0.5);
  const out = new Uint8Array(size * size * 3);
  for (let oy = 0; oy < size; oy += 1) {
    for (let ox = 0; ox < size; ox += 1) {
      const dx = ox + offX;
      const dy = oy + offY;
      const rgb = useBilinear
        ? sampleBilinear(img, (dx + 0.5) * kx - 0.5, (dy + 0.5) * ky - 0.5)
        : sampleArea(img, dx * kx, dy * ky, (dx + 1) * kx, (dy + 1) * ky);
      const o = (oy * size + ox) * 3;
      out[o] = Math.round(rgb[0]); out[o + 1] = Math.round(rgb[1]); out[o + 2] = Math.round(rgb[2]);
    }
  }
  return out;
};

/** capture(): x / 127 - 1, identical to utils/tf.js in the runtime library. */
export const normalizeInto = (rgb, target, offset = 0) => {
  for (let i = 0; i < rgb.length; i += 1) target[offset + i] = rgb[i] / 127 - 1;
};

// --- augmentation (training views only; never applied to evaluation) -------

// Small deterministic PRNG so every augmented view is reproducible from a seed.
export const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Geometric augmentation at native resolution: random rotation, a random
 * sub-crop (framing variation) and an optional horizontal flip. Output stays
 * near source resolution so the final downscale still goes through tmCrop —
 * the same resampling the app performs.
 */
const geometric = (img, rand) => {
  const { width: w, height: h } = img;
  const angle = ((rand() * 2 - 1) * 15 * Math.PI) / 180; // ±15° phone tilt
  const areaFrac = 0.6 + rand() * 0.4;                    // keep 60–100% of the frame
  const aspect = Math.exp((rand() * 2 - 1) * Math.log(4 / 3));
  const flip = rand() < 0.5;

  // Rotating a rectangle exposes empty corners; shrink the crop so it always
  // lies inside the rotated source and no fill colour enters the image.
  const cos = Math.abs(Math.cos(angle)); const sin = Math.abs(Math.sin(angle));
  const shrink = 1 / (cos + sin * Math.max(w / h, h / w));
  let cw = Math.sqrt(areaFrac * w * h * aspect) * shrink;
  let ch = Math.sqrt((areaFrac * w * h) / aspect) * shrink;
  cw = Math.max(16, Math.min(cw, w * shrink));
  ch = Math.max(16, Math.min(ch, h * shrink));
  const maxShiftX = Math.max(0, (w * shrink - cw) / 2);
  const maxShiftY = Math.max(0, (h * shrink - ch) / 2);
  const cx = w / 2 + (rand() * 2 - 1) * maxShiftX;
  const cy = h / 2 + (rand() * 2 - 1) * maxShiftY;

  const outW = Math.max(16, Math.round(cw));
  const outH = Math.max(16, Math.round(ch));
  const data = new Uint8Array(outW * outH * 4);
  const ca = Math.cos(angle); const sa = Math.sin(angle);
  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      let u = (x + 0.5) - outW / 2;
      const v = (y + 0.5) - outH / 2;
      if (flip) u = -u;
      const sx = cx + u * ca - v * sa - 0.5;
      const sy = cy + u * sa + v * ca - 0.5;
      const rgb = sampleBilinear(img, sx, sy);
      const o = (y * outW + x) * 4;
      data[o] = rgb[0]; data[o + 1] = rgb[1]; data[o + 2] = rgb[2]; data[o + 3] = 255;
    }
  }
  return { width: outW, height: outH, data };
};

/** Photometric jitter on the final 224x224 RGB: lighting, contrast, colour, focus, sensor noise. */
const photometric = (rgb, size, rand) => {
  const brightness = 0.75 + rand() * 0.5;
  const contrast = 0.75 + rand() * 0.5;
  const saturation = 0.8 + rand() * 0.4;
  const blur = rand() < 0.2;
  const noise = rand() < 0.25 ? 2 + rand() * 5 : 0;

  let src = Float32Array.from(rgb);
  if (blur) {
    const b = new Float32Array(src.length);
    for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) for (let c = 0; c < 3; c += 1) {
      let s = 0; let n = 0;
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        const yy = y + dy; const xx = x + dx;
        if (yy < 0 || yy >= size || xx < 0 || xx >= size) continue;
        s += src[(yy * size + xx) * 3 + c]; n += 1;
      }
      b[(y * size + x) * 3 + c] = s / n;
    }
    src = b;
  }

  let mean = 0;
  for (let i = 0; i < src.length; i += 1) mean += src[i];
  mean /= src.length;

  const out = new Uint8Array(src.length);
  for (let p = 0; p < src.length; p += 3) {
    let r = src[p]; let g = src[p + 1]; let bl = src[p + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * bl;
    r = gray + (r - gray) * saturation; g = gray + (g - gray) * saturation; bl = gray + (bl - gray) * saturation;
    r = (r - mean) * contrast + mean; g = (g - mean) * contrast + mean; bl = (bl - mean) * contrast + mean;
    r *= brightness; g *= brightness; bl *= brightness;
    if (noise) {
      // Box–Muller gaussian sensor noise.
      const n = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand()) * noise;
      r += n(); g += n(); bl += n();
    }
    out[p] = clamp(Math.round(r), 0, 255); out[p + 1] = clamp(Math.round(g), 0, 255); out[p + 2] = clamp(Math.round(bl), 0, 255);
  }
  return out;
};

/** One augmented training view: geometric at native res -> tmCrop -> photometric. */
export const augmentedView = (img, seed, resampler = "auto") => {
  const rand = mulberry32(seed);
  return photometric(tmCrop(geometric(img, rand), IMAGE_SIZE, resampler), IMAGE_SIZE, rand);
};

// --- perceptual hash (near-duplicate / leakage detection) ------------------

/** 64-bit difference hash on a 9x8 greyscale area-downsample. Returns a BigInt. */
export const dHash = (img) => {
  const { width: w, height: h } = img;
  const gray = new Float64Array(9 * 8);
  for (let y = 0; y < 8; y += 1) for (let x = 0; x < 9; x += 1) {
    const rgb = sampleArea(img, (x * w) / 9, (y * h) / 8, ((x + 1) * w) / 9, ((y + 1) * h) / 8);
    gray[y * 9 + x] = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
  }
  let hash = 0n;
  for (let y = 0; y < 8; y += 1) for (let x = 0; x < 8; x += 1) {
    hash = (hash << 1n) | (gray[y * 9 + x] > gray[y * 9 + x + 1] ? 1n : 0n);
  }
  return hash;
};

export const hamming = (a, b) => {
  let x = a ^ b; let n = 0;
  while (x) { n += Number(x & 1n); x >>= 1n; }
  return n;
};
