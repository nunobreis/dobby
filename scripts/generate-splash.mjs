import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, '../public/splash');

const BG = '#8B5CF6';
const FG = 'rgba(255,255,255,0.92)';

// Portrait splash sizes: [actual px width, actual px height, CSS width, CSS height, DPR]
const sizes = [
  { w: 640,  h: 1136, cssW: 320, cssH: 568,  dpr: 2 }, // iPhone SE 1st gen
  { w: 750,  h: 1334, cssW: 375, cssH: 667,  dpr: 2 }, // iPhone 6/7/8/SE 2nd/3rd
  { w: 1242, h: 2208, cssW: 414, cssH: 736,  dpr: 3 }, // iPhone 6+/7+/8+
  { w: 1125, h: 2436, cssW: 375, cssH: 812,  dpr: 3 }, // iPhone X/XS/11 Pro
  { w: 828,  h: 1792, cssW: 414, cssH: 896,  dpr: 2 }, // iPhone XR/11
  { w: 1242, h: 2688, cssW: 414, cssH: 896,  dpr: 3 }, // iPhone XS Max/11 Pro Max
  { w: 1080, h: 2340, cssW: 360, cssH: 780,  dpr: 3 }, // iPhone 12 mini/13 mini
  { w: 1170, h: 2532, cssW: 390, cssH: 844,  dpr: 3 }, // iPhone 12/12 Pro/13/13 Pro/14
  { w: 1284, h: 2778, cssW: 428, cssH: 926,  dpr: 3 }, // iPhone 12 Pro Max/13 Pro Max/14 Plus
  { w: 1179, h: 2556, cssW: 393, cssH: 852,  dpr: 3 }, // iPhone 14 Pro/15/15 Pro/16
  { w: 1290, h: 2796, cssW: 430, cssH: 932,  dpr: 3 }, // iPhone 14 Pro Max/15 Plus/15 Pro Max/16 Plus
  { w: 1206, h: 2622, cssW: 402, cssH: 874,  dpr: 3 }, // iPhone 16 Pro
  { w: 1320, h: 2868, cssW: 440, cssH: 956,  dpr: 3 }, // iPhone 16 Pro Max
];

function makeSvg(w, h) {
  const iconSize = Math.round(w * 0.215);
  const cx = w / 2;
  const cy = h / 2;
  const iconX = cx - iconSize / 2;
  const iconY = cy - iconSize / 2;
  const scale = iconSize / 24;
  // stroke-width in icon-space units that produces ~2% of iconSize in output px
  const sw = (iconSize * 0.028) / scale;
  const gap = Math.round(iconSize * 0.2);
  const fontSize = Math.round(iconSize * 0.38);
  const textY = cy + iconSize / 2 + gap;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${BG}"/>
  <g transform="translate(${iconX}, ${iconY}) scale(${scale})">
    <circle cx="11" cy="4" r="2" fill="none" stroke="${FG}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="18" cy="8" r="2" fill="none" stroke="${FG}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="20" cy="16" r="2" fill="none" stroke="${FG}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" fill="none" stroke="${FG}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text
    x="${cx}"
    y="${textY}"
    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-size="${fontSize}"
    font-weight="700"
    fill="${FG}"
    text-anchor="middle"
    dominant-baseline="hanging"
    letter-spacing="${Math.round(fontSize * 0.02)}"
  >Dobby</text>
</svg>`;
}

await mkdir(outputDir, { recursive: true });

for (const { w, h, cssW, cssH, dpr } of sizes) {
  const filename = `apple-splash-${w}-${h}.png`;
  const svgBuffer = Buffer.from(makeSvg(w, h));
  await sharp(svgBuffer).png().toFile(join(outputDir, filename));
  console.log(`✓ ${filename}  (${cssW}×${cssH} @${dpr}x)`);
}

console.log('\nAll splash screens generated → public/splash/');
