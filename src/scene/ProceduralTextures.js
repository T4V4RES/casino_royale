import * as THREE from 'three';

/* ==================================================================
   ProceduralTextures
   ------------------
   Suite de texturas geradas em Canvas 2D, no espírito do ICG-07
   (Texturas) e ICG-05 (Iluminação/Sombreamento). Para cada
   superfície relevante geramos um conjunto PBR:
       map           → cor difusa (albedo)
       normalMap     → relevo, derivado de um height map por Sobel
       roughnessMap  → variação de brilho/microsuperfície

   O resultado é um casino visivelmente mais rico: carpete com
   damasco, paredes com papel-de-parede em relevo, mármore com
   veios, madeira com grão, feltro com fibras, etc.
   ================================================================== */

/* ---------- helpers ---------- */
function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
}

function asTexture(canvas, { srgb = true, repeat = [1, 1], aniso = 8 } = {}) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
    tex.anisotropy = aniso;
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    else tex.colorSpace = THREE.NoColorSpace;
    tex.needsUpdate = true;
    return tex;
}

/* Sobel-based height-to-normal converter (returns a canvas with RGB encoding).
   X = (right-left)/2 packed into R, Y into G, Z = sqrt(1-x²-y²) into B. */
function heightToNormalCanvas(heightCanvas, strength = 1.5) {
    const w = heightCanvas.width, h = heightCanvas.height;
    const src = heightCanvas.getContext('2d').getImageData(0, 0, w, h).data;
    const out = makeCanvas(w, h);
    const ctx = out.getContext('2d');
    const dst = ctx.createImageData(w, h);

    const at = (x, y) => {
        const xi = ((x % w) + w) % w;
        const yi = ((y % h) + h) % h;
        return src[(yi * w + xi) * 4] / 255; // R channel as height
    };

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            // Sobel
            const tl = at(x - 1, y - 1), t = at(x, y - 1), tr = at(x + 1, y - 1);
            const l  = at(x - 1, y),                       r = at(x + 1, y);
            const bl = at(x - 1, y + 1), b = at(x, y + 1), br = at(x + 1, y + 1);
            const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
            const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);
            // Normal vector
            let nx = -dx * strength, ny = -dy * strength, nz = 1;
            const len = Math.hypot(nx, ny, nz);
            nx /= len; ny /= len; nz /= len;
            const idx = (y * w + x) * 4;
            dst.data[idx]     = (nx * 0.5 + 0.5) * 255;
            dst.data[idx + 1] = (ny * 0.5 + 0.5) * 255;
            dst.data[idx + 2] = (nz * 0.5 + 0.5) * 255;
            dst.data[idx + 3] = 255;
        }
    }
    ctx.putImageData(dst, 0, 0);
    return out;
}

/* Deterministic pseudo-random (so textures aren't different on every reload) */
function mulberry32(seed) {
    let t = seed >>> 0;
    return () => {
        t = (t + 0x6D2B79F5) >>> 0;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function fillNoise(ctx, w, h, opts = {}) {
    const {
        baseAlpha = 0.06, density = 0.6, seed = 1,
        light = 'rgba(255,255,255,0.5)', dark = 'rgba(0,0,0,0.5)',
    } = opts;
    const rnd = mulberry32(seed);
    ctx.globalAlpha = baseAlpha;
    const count = Math.floor(w * h * density * 0.02);
    for (let i = 0; i < count; i++) {
        const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h);
        const s = 1 + rnd() * 1.6;
        ctx.fillStyle = rnd() < 0.5 ? light : dark;
        ctx.fillRect(x, y, s, s);
    }
    ctx.globalAlpha = 1;
}

/* Value-noise tile (tileable). Returns a Float32Array[w*h] in [0,1].
   Multi-octave FBM for organic detail on top of the deterministic
   patterns. Used by carpet, marble, felt etc. */
function valueNoiseTile(w, h, period = 32, seed = 0) {
    const rnd = mulberry32(seed);
    const cols = Math.ceil(w / period) + 1;
    const rows = Math.ceil(h / period) + 1;
    const grid = new Float32Array(cols * rows);
    for (let i = 0; i < grid.length; i++) grid[i] = rnd();
    // Make tileable by wrapping
    const at = (x, y) => grid[((y % rows) + rows) % rows * cols + ((x % cols) + cols) % cols];
    const out = new Float32Array(w * h);
    const smooth = t => t * t * (3 - 2 * t);
    for (let y = 0; y < h; y++) {
        const gy = y / period, y0 = Math.floor(gy), fy = smooth(gy - y0);
        for (let x = 0; x < w; x++) {
            const gx = x / period, x0 = Math.floor(gx), fx = smooth(gx - x0);
            const a = at(x0, y0), b = at(x0 + 1, y0);
            const c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
            const ab = a + (b - a) * fx;
            const cd = c + (d - c) * fx;
            out[y * w + x] = ab + (cd - ab) * fy;
        }
    }
    return out;
}

function fbmTile(w, h, opts = {}) {
    const { octaves = 4, period = 64, seed = 0, persistence = 0.55 } = opts;
    const out = new Float32Array(w * h);
    let amp = 1, total = 0;
    for (let o = 0; o < octaves; o++) {
        const layer = valueNoiseTile(w, h, period >> o, seed + o * 17);
        for (let i = 0; i < out.length; i++) out[i] += layer[i] * amp;
        total += amp;
        amp *= persistence;
    }
    for (let i = 0; i < out.length; i++) out[i] /= total;
    return out;
}

/* Apply a noise field as an overlay (multiply / add) on a canvas. */
function applyFBMOverlay(canvas, opts = {}) {
    const { mode = 'multiply', strength = 0.3, seed = 1, period = 96, octaves = 4 } = opts;
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext('2d');
    const img = ctx.getImageData(0, 0, w, h);
    const noise = fbmTile(w, h, { octaves, period, seed });
    for (let i = 0; i < noise.length; i++) {
        const n = noise[i];
        const idx = i * 4;
        if (mode === 'multiply') {
            const f = 1 - strength + n * strength;
            img.data[idx]     *= f;
            img.data[idx + 1] *= f;
            img.data[idx + 2] *= f;
        } else if (mode === 'add') {
            const d = (n - 0.5) * strength * 255;
            img.data[idx]     = Math.max(0, Math.min(255, img.data[idx] + d));
            img.data[idx + 1] = Math.max(0, Math.min(255, img.data[idx + 1] + d));
            img.data[idx + 2] = Math.max(0, Math.min(255, img.data[idx + 2] + d));
        }
    }
    ctx.putImageData(img, 0, 0);
}

/* ==================================================================
   Carpet — damasco vermelho-escuro com padrão repetido + FBM
   ================================================================== */
export function createSkinTexture(baseColor = '#FFCC99') {
    // Return a PBR set: { map, normalMap, roughnessMap }
    const size = 1024; // higher res to avoid visible pore artifacts

    // Albedo (color)
    const color = makeCanvas(size, size);
    const cctx = color.getContext('2d');
    cctx.fillStyle = baseColor;
    cctx.fillRect(0, 0, size, size);

    // Soft lighting gradient
    const light = cctx.createRadialGradient(size * 0.4, size * 0.35, 20, size / 2, size / 2, size * 1.0);
    light.addColorStop(0, 'rgba(255,245,230,0.12)');
    light.addColorStop(0.6, 'rgba(255,225,200,0.06)');
    light.addColorStop(1, 'rgba(0,0,0,0.06)');
    cctx.fillStyle = light;
    cctx.fillRect(0, 0, size, size);

    // Subtle color variation using FBM
    applyFBMOverlay(color, { mode: 'add', strength: 0.05, seed: 211, period: 160, octaves: 4 });

    // Warm/cool undertone mottling keeps repeated skin from looking plastic.
    const undertone = fbmTile(size, size, { octaves: 5, period: 96, seed: 213, persistence: 0.58 });
    const img = cctx.getImageData(0, 0, size, size);
    for (let i = 0; i < undertone.length; i++) {
        const n = undertone[i] - 0.5;
        const idx = i * 4;
        img.data[idx] = Math.max(0, Math.min(255, img.data[idx] + n * 18));
        img.data[idx + 1] = Math.max(0, Math.min(255, img.data[idx + 1] + n * 5));
        img.data[idx + 2] = Math.max(0, Math.min(255, img.data[idx + 2] - n * 10));
    }
    cctx.putImageData(img, 0, 0);

    // Pores / micro detail (smaller and less contrast, drawn onto both albedo and height)
    const poreRnd = mulberry32(421);
    const height = makeCanvas(size, size);
    const hctx = height.getContext('2d');
    hctx.fillStyle = '#808080';
    hctx.fillRect(0, 0, size, size);

    cctx.globalAlpha = 0.16;
    for (let i = 0; i < 1600; i++) {
        const x = Math.floor(poreRnd() * size) + 0.5;
        const y = Math.floor(poreRnd() * size) + 0.5;
        const r = 0.4 + poreRnd() * 1.2; // very small
        const darkness = 0.01 + poreRnd() * 0.06; // subtler
        const g = cctx.createRadialGradient(x, y, 0, x, y, r * 3);
        g.addColorStop(0, `rgba(0,0,0,${darkness})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        cctx.fillStyle = g;
        cctx.beginPath();
        cctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
        cctx.fill();

        // Height bump for normal map (very small, low contrast)
        hctx.globalAlpha = 1;
        const hv = 128 + Math.floor(darkness * 30);
        hctx.fillStyle = `rgba(${hv},${hv},${hv},1)`;
        hctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
    }
    cctx.globalAlpha = 1;

    // Very gentle freckles / color spots (for variety)
    const freRnd = mulberry32(431);
    cctx.globalAlpha = 0.05;
    for (let i = 0; i < 180; i++) {
        const x = freRnd() * size, y = freRnd() * size;
        const r = 6 + freRnd() * 18;
        const grad = cctx.createRadialGradient(x, y, 1, x, y, r);
        grad.addColorStop(0, 'rgba(160,80,60,0.12)');
        grad.addColorStop(1, 'rgba(160,80,60,0)');
        cctx.fillStyle = grad;
        cctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    cctx.globalAlpha = 1;

    // Fine expression/wrinkle lines; very low contrast so distant NPCs do not look scratched.
    const lineRnd = mulberry32(437);
    for (let i = 0; i < 22; i++) {
        const x = lineRnd() * size;
        const y = lineRnd() * size;
        const len = 18 + lineRnd() * 60;
        const curve = (lineRnd() - 0.5) * 18;
        cctx.globalAlpha = 0.012 + lineRnd() * 0.012;
        cctx.strokeStyle = lineRnd() < 0.5 ? 'rgba(80,35,25,0.32)' : 'rgba(255,235,215,0.25)';
        cctx.lineWidth = 0.7 + lineRnd() * 0.8;
        cctx.beginPath();
        cctx.moveTo(x, y);
        cctx.quadraticCurveTo(x + len * 0.5, y + curve, x + len, y + curve * 0.3);
        cctx.stroke();

        hctx.globalAlpha = 0.18;
        hctx.strokeStyle = lineRnd() < 0.5 ? '#747474' : '#8A8A8A';
        hctx.lineWidth = 1;
        hctx.beginPath();
        hctx.moveTo(x, y);
        hctx.quadraticCurveTo(x + len * 0.5, y + curve, x + len, y + curve * 0.3);
        hctx.stroke();
    }
    cctx.globalAlpha = 1;
    hctx.globalAlpha = 1;

    // Roughness map — mid roughness with subtle variation
    const rough = makeCanvas(size / 2, size / 2);
    const rctx = rough.getContext('2d');
    rctx.fillStyle = '#B0B0B0'; // ~0.69 roughness baseline
    rctx.fillRect(0, 0, rough.width, rough.height);
    applyFBMOverlay(rough, { mode: 'multiply', strength: 0.28, seed: 241, period: 64, octaves: 4 });
    rctx.globalAlpha = 0.055;
    rctx.fillStyle = '#FFFFFF';
    for (let y = 0; y < rough.height; y += 17) {
        rctx.fillRect(0, y, rough.width, 1);
    }
    rctx.globalAlpha = 1;

    // Normal map from height canvas
    const normal = heightToNormalCanvas(height, 0.45);

    return {
        map:       asTexture(color,   { srgb: true,  repeat: [1, 1], aniso: 8 }),
        normalMap: asTexture(normal,  { srgb: false, repeat: [1, 1], aniso: 4 }),
        roughnessMap: asTexture(rough,{ srgb: false, repeat: [1, 1], aniso: 4 }),
    };
}

export function createCarpetPBR(size = 512) {
    const color = makeCanvas(size, size);
    const cctx = color.getContext('2d');
    // Base burgundy
    cctx.fillStyle = '#4b101f';
    cctx.fillRect(0, 0, size, size);

    // Subtle damask-like motif by tiling a rotated diamond pattern
    cctx.fillStyle = 'rgba(80,20,28,0.12)';
    for (let y = 0; y < size; y += 48) {
        for (let x = 0; x < size; x += 48) {
            cctx.save();
            cctx.translate(x + 24, y + 24);
            cctx.rotate(Math.PI / 4);
            cctx.fillRect(-12, -12, 24, 24);
            cctx.restore();
        }
    }

    // Add FBM variation for organic look
    applyFBMOverlay(color, { mode: 'add', strength: 0.06, seed: 7, period: 128, octaves: 4 });

    // Heightmap: base mid-gray with linear highlights for pattern
    const height = makeCanvas(size, size);
    const hctx = height.getContext('2d');
    hctx.fillStyle = '#808080';
    hctx.fillRect(0, 0, size, size);
    // Create faint raised ridges for the damask.
    hctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let y = 24; y < size; y += 48) {
        for (let x = 24; x < size; x += 48) {
            hctx.beginPath();
            hctx.ellipse(x, y, 10, 18, 0, 0, Math.PI * 2);
            hctx.fill();
        }
    }
    applyFBMOverlay(height, { mode: 'add', strength: 0.32, seed: 9, period: 16, octaves: 3 });

    const normal = heightToNormalCanvas(height, 1.5);

    // Roughness map
    const rough = makeCanvas(size, size);
    const rctx = rough.getContext('2d');
    rctx.fillStyle = '#E0E0E0';
    rctx.fillRect(0, 0, size, size);
    applyFBMOverlay(rough, { mode: 'multiply', strength: 0.3, seed: 11, period: 64, octaves: 3 });

    return {
        map: asTexture(color, { srgb: true, repeat: [4, 4] }),
        normalMap: asTexture(normal, { srgb: false, repeat: [4, 4] }),
        roughnessMap: asTexture(rough, { srgb: false, repeat: [4, 4] }),
    };
}

/* ==================================================================
   Madeira (wood planks) — tampo de mesa, rodapés, prateleiras
   ================================================================== */
export function createWoodPBR(size = 512, plankCount = 4) {
    const color = makeCanvas(size, size);
    const cctx = color.getContext('2d');

    const plankH = size / plankCount;
    const rnd = mulberry32(42);

    for (let p = 0; p < plankCount; p++) {
        const y0 = p * plankH;
        // Base plank colour (slightly varying)
        const baseShade = 32 + Math.floor(rnd() * 22);
        cctx.fillStyle = `rgb(${baseShade + 30}, ${baseShade + 14}, ${baseShade})`;
        cctx.fillRect(0, y0, size, plankH);

        // Long grain streaks
        const streaks = 22 + Math.floor(rnd() * 10);
        for (let s = 0; s < streaks; s++) {
            const yy = y0 + rnd() * plankH;
            const dark = rnd() < 0.5;
            cctx.strokeStyle = dark
                ? `rgba(20,10,5,${0.10 + rnd() * 0.18})`
                : `rgba(190,140,90,${0.06 + rnd() * 0.10})`;
            cctx.lineWidth = 0.6 + rnd() * 1.4;
            cctx.beginPath();
            const segs = 6;
            cctx.moveTo(0, yy);
            for (let i = 1; i <= segs; i++) {
                const x = (i / segs) * size;
                cctx.lineTo(x, yy + (rnd() - 0.5) * 4);
            }
            cctx.stroke();
        }

        // Knots (occasional)
        if (rnd() < 0.45) {
            const kx = rnd() * size;
            const ky = y0 + plankH * 0.5 + (rnd() - 0.5) * plankH * 0.4;
            const kr = 6 + rnd() * 8;
            for (let r = kr; r > 0; r -= 1.2) {
                cctx.fillStyle = `rgba(15,8,4,${0.5 - r / kr * 0.45})`;
                cctx.beginPath();
                cctx.ellipse(kx, ky, r, r * 0.6, 0, 0, Math.PI * 2);
                cctx.fill();
            }
        }

        // Plank seam (dark line between)
        cctx.fillStyle = 'rgba(0,0,0,0.55)';
        cctx.fillRect(0, y0, size, 2);
    }
    fillNoise(cctx, size, size, { baseAlpha: 0.05, density: 0.8, seed: 13 });
    // Long-grain FBM for warm/cool variation along the plank
    applyFBMOverlay(color, { mode: 'multiply', strength: 0.45, seed: 23, period: 96, octaves: 4 });
    applyFBMOverlay(color, { mode: 'add',      strength: 0.10, seed: 25, period: 16, octaves: 3 });

    // Height: mostly flat, plank seams as troughs + grain ridges
    const height = makeCanvas(size, size);
    const hctx = height.getContext('2d');
    hctx.fillStyle = '#A0A0A0';
    hctx.fillRect(0, 0, size, size);
    // Long-grain ridges via FBM (squashed horizontally)
    {
        // Build a grain field: long horizontal streaks
        const w = size, h = size;
        const img = hctx.getImageData(0, 0, w, h);
        const grainNoise = fbmTile(w, h, { octaves: 4, period: 256, seed: 27 });
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                // Anisotropic — squash y so grain runs horizontally
                const i = y * w + x;
                const v = grainNoise[i];
                const d = (v - 0.5) * 0.6;
                img.data[i*4]   = Math.max(0, Math.min(255, img.data[i*4]   + d * 255));
                img.data[i*4+1] = Math.max(0, Math.min(255, img.data[i*4+1] + d * 255));
                img.data[i*4+2] = Math.max(0, Math.min(255, img.data[i*4+2] + d * 255));
            }
        }
        hctx.putImageData(img, 0, 0);
    }
    for (let p = 0; p < plankCount; p++) {
        const y0 = p * plankH;
        // Seam — deep trough
        hctx.fillStyle = '#000000';
        hctx.fillRect(0, y0, size, 2);
        hctx.fillStyle = 'rgba(255,255,255,0.45)';
        hctx.fillRect(0, y0 + 2, size, 1); // tiny bevel highlight
    }
    const normal = heightToNormalCanvas(height, 2.0);

    // Roughness: wood is moderate. Knots a touch glossier than open grain.
    const rough = makeCanvas(size, size);
    const rctx = rough.getContext('2d');
    rctx.fillStyle = '#7F7F7F';
    rctx.fillRect(0, 0, size, size);
    applyFBMOverlay(rough, { mode: 'multiply', strength: 0.35, seed: 17, period: 64, octaves: 3 });

    return {
        map:          asTexture(color,  { srgb: true,  repeat: [1, 1] }),
        normalMap:    asTexture(normal, { srgb: false, repeat: [1, 1] }),
        roughnessMap: asTexture(rough,  { srgb: false, repeat: [1, 1] }),
    };
}

/* ==================================================================
   Mármore — pilares, balcão do bar, faixa do chão
   ================================================================== */
export function createMarblePBR(size = 512, baseColor = '#EFE7D6') {
    const color = makeCanvas(size, size);
    const cctx = color.getContext('2d');
    cctx.fillStyle = baseColor;
    cctx.fillRect(0, 0, size, size);

    const rnd = mulberry32(99);

    // Slow undulating background tint
    const tint = cctx.createRadialGradient(size * 0.3, size * 0.3, 30, size / 2, size / 2, size);
    tint.addColorStop(0, 'rgba(255,255,255,0.18)');
    tint.addColorStop(1, 'rgba(120,100,80,0.18)');
    cctx.fillStyle = tint;
    cctx.fillRect(0, 0, size, size);

    // Veins — meandering Bezier paths
    const drawVein = (mainAlpha, color2, width) => {
        cctx.strokeStyle = color2;
        cctx.lineWidth = width;
        cctx.globalAlpha = mainAlpha;
        cctx.beginPath();
        let x = rnd() * size, y = rnd() * size;
        cctx.moveTo(x, y);
        const segments = 8 + Math.floor(rnd() * 4);
        for (let i = 0; i < segments; i++) {
            const cx1 = x + (rnd() - 0.5) * size * 0.4;
            const cy1 = y + (rnd() - 0.5) * size * 0.4;
            const cx2 = x + (rnd() - 0.5) * size * 0.6;
            const cy2 = y + (rnd() - 0.5) * size * 0.6;
            x = (x + (rnd() - 0.4) * size * 0.5 + size) % size;
            y = (y + (rnd() - 0.4) * size * 0.5 + size) % size;
            cctx.bezierCurveTo(cx1, cy1, cx2, cy2, x, y);
        }
        cctx.stroke();
        cctx.globalAlpha = 1;
    };
    for (let i = 0; i < 6; i++) drawVein(0.45, 'rgba(110,90,70,0.6)', 1.6);
    for (let i = 0; i < 10; i++) drawVein(0.22, 'rgba(80,60,40,0.55)', 0.8);
    for (let i = 0; i < 4; i++) drawVein(0.30, 'rgba(255,250,240,0.7)', 0.8);

    fillNoise(cctx, size, size, { baseAlpha: 0.05, density: 0.8, seed: 29 });
    // Subtle cloud-like FBM tonal variation
    applyFBMOverlay(color, { mode: 'multiply', strength: 0.18, seed: 99, period: 192, octaves: 5 });
    applyFBMOverlay(color, { mode: 'add',      strength: 0.07, seed: 101, period: 32, octaves: 3 });

    // Height: veins slightly raised + FBM cloud variation
    const height = makeCanvas(size, size);
    const hctx = height.getContext('2d');
    hctx.fillStyle = '#7F7F7F';
    hctx.fillRect(0, 0, size, size);
    // Reuse vein paths shape by drawing similar light/dark traces
    const rnd2 = mulberry32(99);
    for (let i = 0; i < 16; i++) {
        hctx.strokeStyle = 'rgba(255,255,255,0.18)';
        hctx.lineWidth = 1.2;
        hctx.beginPath();
        let x = rnd2() * size, y = rnd2() * size;
        hctx.moveTo(x, y);
        for (let j = 0; j < 8; j++) {
            const cx1 = x + (rnd2() - 0.5) * size * 0.4;
            const cy1 = y + (rnd2() - 0.5) * size * 0.4;
            const cx2 = x + (rnd2() - 0.5) * size * 0.6;
            const cy2 = y + (rnd2() - 0.5) * size * 0.6;
            x = (x + (rnd2() - 0.4) * size * 0.5 + size) % size;
            y = (y + (rnd2() - 0.4) * size * 0.5 + size) % size;
            hctx.bezierCurveTo(cx1, cy1, cx2, cy2, x, y);
        }
        hctx.stroke();
    }
    applyFBMOverlay(height, { mode: 'add', strength: 0.20, seed: 103, period: 96, octaves: 4 });
    const normal = heightToNormalCanvas(height, 0.65);

    // Roughness: marble is fairly polished (low roughness ~0.2)
    const rough = makeCanvas(size, size);
    const rctx = rough.getContext('2d');
    rctx.fillStyle = '#404040';
    rctx.fillRect(0, 0, size, size);
    applyFBMOverlay(rough, { mode: 'multiply', strength: 0.40, seed: 31, period: 96, octaves: 3 });

    return {
        map:          asTexture(color,  { srgb: true,  repeat: [1, 1] }),
        normalMap:    asTexture(normal, { srgb: false, repeat: [1, 1] }),
        roughnessMap: asTexture(rough,  { srgb: false, repeat: [1, 1] }),
    };
}

/* ==================================================================
   Parede — papel de parede em damasco bordeaux com ouro
   ================================================================== */
export function createWallPBR(size = 512) {
    const color = makeCanvas(size, size);
    const cctx = color.getContext('2d');
    // Background gradient
    const bg = cctx.createLinearGradient(0, 0, 0, size);
    bg.addColorStop(0, '#3A2026');
    bg.addColorStop(1, '#251119');
    cctx.fillStyle = bg;
    cctx.fillRect(0, 0, size, size);

    // Vertical pin-stripes (subtle)
    cctx.globalAlpha = 0.16;
    cctx.strokeStyle = '#6B2C36';
    cctx.lineWidth = 1;
    for (let x = 0; x < size; x += 8) {
        cctx.beginPath();
        cctx.moveTo(x, 0); cctx.lineTo(x, size);
        cctx.stroke();
    }
    cctx.globalAlpha = 1;

    // Ornamental medallions in 2x2 grid
    const drawMedallion = (cx, cy, r) => {
        cctx.save();
        cctx.translate(cx, cy);
        // Outer rosette
        cctx.fillStyle = 'rgba(196,155,60,0.34)';
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            cctx.beginPath();
            cctx.ellipse(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r * 0.35, r * 0.16, a, 0, Math.PI * 2);
            cctx.fill();
        }
        cctx.fillStyle = 'rgba(210,170,80,0.58)';
        cctx.beginPath();
        cctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
        cctx.fill();
        // Inner highlight
        cctx.fillStyle = 'rgba(255,226,150,0.32)';
        cctx.beginPath();
        cctx.arc(-r * 0.07, -r * 0.07, r * 0.12, 0, Math.PI * 2);
        cctx.fill();
        cctx.restore();
    };
    drawMedallion(size * 0.25, size * 0.25, 42);
    drawMedallion(size * 0.75, size * 0.25, 42);
    drawMedallion(size * 0.25, size * 0.75, 42);
    drawMedallion(size * 0.75, size * 0.75, 42);
    // Smaller filler ornaments at midpoints
    const drawSmallOrnament = (cx, cy, r) => {
        cctx.save();
        cctx.translate(cx, cy);
        cctx.fillStyle = 'rgba(196,155,60,0.24)';
        // Diamond
        cctx.beginPath();
        cctx.moveTo(0, -r); cctx.lineTo(r * 0.5, 0);
        cctx.lineTo(0, r); cctx.lineTo(-r * 0.5, 0);
        cctx.closePath(); cctx.fill();
        // Outline accents
        cctx.strokeStyle = 'rgba(255,220,140,0.28)';
        cctx.lineWidth = 1;
        cctx.beginPath();
        cctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
        cctx.stroke();
        cctx.restore();
    };
    drawSmallOrnament(size * 0.50, size * 0.25, 18);
    drawSmallOrnament(size * 0.50, size * 0.75, 18);
    drawSmallOrnament(size * 0.25, size * 0.50, 18);
    drawSmallOrnament(size * 0.75, size * 0.50, 18);
    drawSmallOrnament(size * 0.50, size * 0.50, 22);

    // Damask vine connecting medallions (subtle gold filigree)
    cctx.strokeStyle = 'rgba(196,155,60,0.16)';
    cctx.lineWidth = 1.2;
    cctx.beginPath();
    cctx.moveTo(size * 0.25, size * 0.25);
    cctx.bezierCurveTo(size * 0.40, size * 0.10, size * 0.60, size * 0.10, size * 0.75, size * 0.25);
    cctx.bezierCurveTo(size * 0.85, size * 0.40, size * 0.85, size * 0.60, size * 0.75, size * 0.75);
    cctx.bezierCurveTo(size * 0.60, size * 0.85, size * 0.40, size * 0.85, size * 0.25, size * 0.75);
    cctx.bezierCurveTo(size * 0.15, size * 0.60, size * 0.15, size * 0.40, size * 0.25, size * 0.25);
    cctx.stroke();

    fillNoise(cctx, size, size, { baseAlpha: 0.07, density: 0.7, seed: 53 });
    // FBM tonal — paper-like mottling and subtle aging stains
    applyFBMOverlay(color, { mode: 'multiply', strength: 0.20, seed: 53, period: 128, octaves: 4 });
    applyFBMOverlay(color, { mode: 'add',      strength: 0.06, seed: 55, period: 32, octaves: 3 });

    // Height: medallions raised
    const height = makeCanvas(size, size);
    const hctx = height.getContext('2d');
    hctx.fillStyle = '#666666';
    hctx.fillRect(0, 0, size, size);
    [[0.25,0.25],[0.75,0.25],[0.25,0.75],[0.75,0.75]].forEach(([fx,fy]) => {
        const cx = fx * size, cy = fy * size, r = 42;
        hctx.fillStyle = 'rgba(255,255,255,0.26)';
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            hctx.beginPath();
            hctx.ellipse(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6, r * 0.35, r * 0.16, a, 0, Math.PI * 2);
            hctx.fill();
        }
        hctx.fillStyle = 'rgba(255,255,255,0.38)';
        hctx.beginPath(); hctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2); hctx.fill();
    });
    const normal = heightToNormalCanvas(height, 0.65);

    // Roughness — wallpaper, low–medium gloss; gold motifs slightly more reflective
    const rough = makeCanvas(size, size);
    const rctx = rough.getContext('2d');
    rctx.fillStyle = '#A0A0A0';
    rctx.fillRect(0, 0, size, size);
    [[0.25,0.25],[0.75,0.25],[0.25,0.75],[0.75,0.75]].forEach(([fx,fy]) => {
        const grad2 = rctx.createRadialGradient(fx * size, fy * size, 5, fx * size, fy * size, 70);
        grad2.addColorStop(0, '#3A3A3A');
        grad2.addColorStop(1, 'rgba(160,160,160,0)');
        rctx.fillStyle = grad2;
        rctx.fillRect(0, 0, size, size);
    });

    return {
        map:          asTexture(color,  { srgb: true,  repeat: [3, 1] }),
        normalMap:    asTexture(normal, { srgb: false, repeat: [3, 1] }),
        roughnessMap: asTexture(rough,  { srgb: false, repeat: [3, 1] }),
    };
}

/* ==================================================================
   Feltro — superfícies das mesas (Blackjack/Poker/Roleta)
   ================================================================== */
export function createFeltPBR(size = 512, hex = '#0F5D2E') {
    const color = makeCanvas(size, size);
    const cctx = color.getContext('2d');
    cctx.fillStyle = hex;
    cctx.fillRect(0, 0, size, size);

    // Vignette — darker edges from use
    const vg = cctx.createRadialGradient(size / 2, size / 2, 40, size / 2, size / 2, size * 0.75);
    vg.addColorStop(0, 'rgba(255,255,255,0.08)');
    vg.addColorStop(1, 'rgba(0,0,0,0.42)');
    cctx.fillStyle = vg;
    cctx.fillRect(0, 0, size, size);

    // Color variation — felt aging and sun fading
    const colorVar = fbmTile(size, size, { octaves: 3, period: 120, seed: 73 });
    const imgData = cctx.createImageData(size, size);
    const data = imgData.data;
    for (let i = 0; i < colorVar.length; i++) {
        const variation = (colorVar[i] - 0.5) * 0.4;
        data[i * 4] = Math.max(0, Math.min(255, 50 + variation * 100));
        data[i * 4 + 1] = Math.max(0, Math.min(255, 100 + variation * 80));
        data[i * 4 + 2] = Math.max(0, Math.min(255, 50 + variation * 100));
        data[i * 4 + 3] = 255;
    }
    cctx.putImageData(imgData, 0, 0);
    cctx.fillStyle = hex;
    cctx.globalAlpha = 0.6;
    cctx.fillRect(0, 0, size, size);
    cctx.globalAlpha = 1;

    // High-density fibre noise — realistic felt pile
    const rnd = mulberry32(73);
    for (let i = 0; i < size * 15; i++) {
        const x = rnd() * size, y = rnd() * size;
        const len = 1.2 + rnd() * 2.8;
        const ang = rnd() * Math.PI * 2;
        const brightness = rnd();
        if (brightness < 0.45) {
            cctx.strokeStyle = 'rgba(255,255,255,0.08)';
        } else if (brightness < 0.85) {
            cctx.strokeStyle = 'rgba(0,0,0,0.12)';
        } else {
            cctx.strokeStyle = 'rgba(100,50,20,0.06)';
        }
        cctx.lineWidth = 0.5;
        cctx.beginPath();
        cctx.moveTo(x, y);
        cctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
        cctx.stroke();
    }

    // Wear marks and stains from gameplay
    cctx.globalAlpha = 0.05;
    for (let i = 0; i < 20; i++) {
        const x = rnd() * size * 0.8 + size * 0.1;
        const y = rnd() * size * 0.8 + size * 0.1;
        const r = 30 + rnd() * 80;
        const grad = cctx.createRadialGradient(x, y, 5, x, y, r);
        grad.addColorStop(0, 'rgba(0,0,0,0.2)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        cctx.fillStyle = grad;
        cctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    cctx.globalAlpha = 1;

    // FBM tonal variation
    applyFBMOverlay(color, { mode: 'multiply', strength: 0.28, seed: 73, period: 80, octaves: 5 });

    // Height — detailed micro-fibres for normal mapping
    const height = makeCanvas(size, size);
    const hctx = height.getContext('2d');
    hctx.fillStyle = '#808080';
    hctx.fillRect(0, 0, size, size);
    const rnd2 = mulberry32(74);
    for (let i = 0; i < size * 12; i++) {
        const x = rnd2() * size, y = rnd2() * size;
        const len = 1.2 + rnd2() * 2.8;
        const ang = rnd2() * Math.PI * 2;
        const brightness = rnd2();
        hctx.strokeStyle = brightness < 0.5
            ? 'rgba(255,255,255,0.22)'
            : 'rgba(0,0,0,0.22)';
        hctx.lineWidth = 0.5;
        hctx.beginPath();
        hctx.moveTo(x, y);
        hctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
        hctx.stroke();
    }
    // Add FBM for natural surface variation
    applyFBMOverlay(height, { mode: 'add', strength: 0.35, seed: 74, period: 64, octaves: 4 });
    const normal = heightToNormalCanvas(height, 0.8);

    return {
        map:       asTexture(color,  { srgb: true,  repeat: [3, 3] }),
        normalMap: asTexture(normal, { srgb: false, repeat: [3, 3] }),
    };
}

/* ==================================================================
   Tecto cofrado — moldura repetida
   ================================================================== */
export function createCeilingPBR(size = 512) {
    const color = makeCanvas(size, size);
    const cctx = color.getContext('2d');
    cctx.fillStyle = '#26231F';
    cctx.fillRect(0, 0, size, size);
    // Two coffer panels per tile (so wraps look continuous)
    const drawCoffer = (cx, cy, s) => {
        // Recessed panel with gradient (darker in centre)
        const gr = cctx.createRadialGradient(cx, cy, 4, cx, cy, s * 0.6);
        gr.addColorStop(0, '#1D1B18');
        gr.addColorStop(0.7, '#2B2823');
        gr.addColorStop(1, '#383228');
        cctx.fillStyle = gr;
        cctx.fillRect(cx - s / 2, cy - s / 2, s, s);
        // Bevel — gold inner border
        cctx.strokeStyle = '#8A6A27';
        cctx.lineWidth = 3;
        cctx.strokeRect(cx - s / 2 + 4, cy - s / 2 + 4, s - 8, s - 8);
        // Outer dark border
        cctx.strokeStyle = '#171512';
        cctx.lineWidth = 5;
        cctx.strokeRect(cx - s / 2, cy - s / 2, s, s);
        // Central rosette (8-petal)
        cctx.fillStyle = 'rgba(210,175,85,0.34)';
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            cctx.beginPath();
            cctx.ellipse(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, 4, 8, a, 0, Math.PI * 2);
            cctx.fill();
        }
        cctx.fillStyle = '#CBA84D';
        cctx.beginPath();
        cctx.arc(cx, cy, 4, 0, Math.PI * 2);
        cctx.fill();
        // Corner studs
        const off = s * 0.4;
        [[-off,-off],[off,-off],[-off,off],[off,off]].forEach(([dx, dy]) => {
            cctx.fillStyle = '#A88635';
            cctx.beginPath();
            cctx.arc(cx + dx, cy + dy, 2.5, 0, Math.PI * 2);
            cctx.fill();
        });
    };
    drawCoffer(size * 0.25, size * 0.25, size * 0.40);
    drawCoffer(size * 0.75, size * 0.25, size * 0.40);
    drawCoffer(size * 0.25, size * 0.75, size * 0.40);
    drawCoffer(size * 0.75, size * 0.75, size * 0.40);
    fillNoise(cctx, size, size, { baseAlpha: 0.035, density: 0.45, seed: 91 });
    applyFBMOverlay(color, { mode: 'multiply', strength: 0.12, seed: 91, period: 128, octaves: 3 });

    // Height — coffers recessed
    const height = makeCanvas(size, size);
    const hctx = height.getContext('2d');
    hctx.fillStyle = '#C8C8C8'; // raised surround
    hctx.fillRect(0, 0, size, size);
    [[0.25,0.25],[0.75,0.25],[0.25,0.75],[0.75,0.75]].forEach(([fx,fy]) => {
        const cx = fx * size, cy = fy * size, s = size * 0.40;
        hctx.fillStyle = '#5A5A5A'; // recessed
        hctx.fillRect(cx - s/2, cy - s/2, s, s);
    });
    const normal = heightToNormalCanvas(height, 1.0);

    return {
        map:       asTexture(color,  { srgb: true,  repeat: [3, 3] }),
        normalMap: asTexture(normal, { srgb: false, repeat: [3, 3] }),
    };
}

/* ==================================================================
   Texturas legacy mantidas (usadas por SceneElements / CasinoWorld)
   ================================================================== */
function makeCanvasTexture(width, height, drawFn) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    drawFn(ctx, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    return texture;
}

export function createPokerCenterTexture() {
    return makeCanvasTexture(512, 192, (ctx, w, h) => {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#0b4a24');
        grad.addColorStop(0.5, '#104f28');
        grad.addColorStop(1, '#08331a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        ctx.globalAlpha = 0.12;
        for (let y = 0; y < h; y += 4) {
            for (let x = 0; x < w; x += 6) {
                ctx.fillStyle = (x + y) % 2 === 0 ? '#ffffff' : '#000000';
                ctx.fillRect(x, y, 2, 2);
            }
        }
        ctx.globalAlpha = 1;

        ctx.strokeStyle = 'rgba(212,175,55,0.55)';
        ctx.lineWidth = 3;
        roundRect(ctx, 10, 10, w - 20, h - 20, 18);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(212,175,55,0.22)';
        ctx.lineWidth = 1.5;
        roundRect(ctx, 22, 22, w - 44, h - 44, 14);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 234, 150, 0.84)';
        ctx.font = 'bold 22px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('VIDEO POKER', w / 2, 58);

        ctx.font = 'bold 16px Georgia, serif';
        ctx.fillText('JACKS OR BETTER', w / 2, h - 34);

        const cardX = [w / 2 - 102, w / 2 - 48, w / 2 + 6, w / 2 + 60, w / 2 + 114];
        for (const x of cardX) {
            ctx.save();
            ctx.translate(x, h / 2 + 6);
            ctx.rotate(-0.04);
            ctx.strokeStyle = 'rgba(255,255,255,0.33)';
            ctx.lineWidth = 2;
            roundRect(ctx, -24, -34, 48, 68, 5);
            ctx.stroke();
            ctx.restore();
        }

        ctx.fillStyle = 'rgba(212,175,55,0.55)';
        ctx.font = '24px serif';
        ctx.fillText('♠', 56, 44);
        ctx.fillText('♥', w - 56, 44);
        ctx.fillText('♦', 56, h - 20);
        ctx.fillText('♣', w - 56, h - 20);
    });
}

export function createFabricTexture(baseColor = '#3949AB', accentColor = '#1F2A63') {
    return makeCanvasTexture(512, 512, (ctx, w, h) => {
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, w, h);

        // Color variation for fabric dye irregularity
        const colorNoise = fbmTile(w, h, { octaves: 3, period: 128, seed: 101 });
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        for (let i = 0; i < colorNoise.length; i++) {
            const val = colorNoise[i];
            data[i * 4] = Math.max(0, Math.min(255, data[i * 4] + (val - 0.5) * 30));
            data[i * 4 + 1] = Math.max(0, Math.min(255, data[i * 4 + 1] + (val - 0.5) * 25));
            data[i * 4 + 2] = Math.max(0, Math.min(255, data[i * 4 + 2] + (val - 0.5) * 35));
            data[i * 4 + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);

        // Warp and weft weave pattern — tight diagonal pattern
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1.5;
        for (let y = -h; y < h * 2; y += 6) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y + w);
            ctx.stroke();
        }
        for (let x = -w; x < w * 2; x += 6) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + h, h);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Cross-hatch stitching details
        ctx.globalAlpha = 0.08;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 8) {
            for (let y = 0; y < h; y += 8) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + 3, y + 3);
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;

        // Surface texture wrinkles and wear
        const wrinkles = fbmTile(w, h, { octaves: 5, period: 96, seed: 102, persistence: 0.5 });
        const woven = ctx.getImageData(0, 0, w, h);
        const wovenData = woven.data;
        for (let i = 0; i < wrinkles.length; i++) {
            const wrinkle = wrinkles[i];
            const idx = i * 4;
            if (wrinkle > 0.6) {
                const darkening = (wrinkle - 0.6) * 2 * 0.15;
                wovenData[idx] *= (1 - darkening);
                wovenData[idx + 1] *= (1 - darkening);
                wovenData[idx + 2] *= (1 - darkening);
            } else if (wrinkle < 0.36) {
                const lift = (0.36 - wrinkle) * 20;
                wovenData[idx] = Math.min(255, wovenData[idx] + lift);
                wovenData[idx + 1] = Math.min(255, wovenData[idx + 1] + lift);
                wovenData[idx + 2] = Math.min(255, wovenData[idx + 2] + lift);
            }
        }
        ctx.putImageData(woven, 0, 0);

        // Tailored cloth grain: fine vertical and horizontal yarns catch light differently.
        ctx.globalAlpha = 0.11;
        for (let x = 0; x < w; x += 4) {
            ctx.strokeStyle = x % 8 === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
            ctx.beginPath();
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += 5) {
            ctx.strokeStyle = y % 10 === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.24)';
            ctx.beginPath();
            ctx.moveTo(0, y + 0.5);
            ctx.lineTo(w, y + 0.5);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Subtle highlights for fabric luster
        ctx.globalAlpha = 0.06;
        const rnd = mulberry32(103);
        for (let i = 0; i < 200; i++) {
            const x = rnd() * w;
            const y = rnd() * h;
            const size = 0.5 + rnd() * 2;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, y, size, size);
        }
        ctx.globalAlpha = 1;

        // Vignette for depth
        const vignette = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w / 1.3);
        vignette.addColorStop(0, 'rgba(255,255,255,0.04)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.25)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, w, h);
    });
}

// `createSkinTexture` is implemented earlier as a PBR generator returning
// `{ map, normalMap, roughnessMap }`. The small canvas fallback was removed
// to avoid duplicate exports and ensure SceneElements receives the PBR set.

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}
