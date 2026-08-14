import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outputDirectory = path.join(process.cwd(), "public", "icons");

function iconSvg(size, safeZone = false) {
  const inset = Math.round(size * (safeZone ? 0.22 : 0.14));
  const markSize = size - inset * 2;
  const fontSize = Math.round(markSize * 0.34);

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="#24251f"/>
      <rect x="${inset}" y="${inset}" width="${markSize}" height="${markSize}" fill="none" stroke="#b4824a" stroke-width="${Math.max(2, Math.round(size * 0.012))}"/>
      <path d="M ${inset} ${inset + markSize * 0.18} H ${inset + markSize * 0.22}" stroke="#f6f1e8" stroke-width="${Math.max(2, Math.round(size * 0.01))}"/>
      <text x="50%" y="51%" dominant-baseline="middle" text-anchor="middle" fill="#f6f1e8" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" letter-spacing="0">AV</text>
      <rect x="${inset}" y="${inset + markSize - Math.max(3, Math.round(size * 0.018))}" width="${markSize}" height="${Math.max(3, Math.round(size * 0.018))}" fill="#b4824a"/>
    </svg>
  `);
}

await mkdir(outputDirectory, { recursive: true });

const icons = [
  { file: "arqvia-192.png", size: 192, safeZone: false },
  { file: "arqvia-512.png", size: 512, safeZone: false },
  { file: "arqvia-maskable-512.png", size: 512, safeZone: true },
  { file: "arqvia-apple-180.png", size: 180, safeZone: false },
];

await Promise.all(
  icons.map(({ file, safeZone, size }) =>
    sharp(iconSvg(size, safeZone))
      .png({ compressionLevel: 9, palette: true })
      .toFile(path.join(outputDirectory, file)),
  ),
);

console.log(`Generated ${icons.length} Arqvia PWA icons in ${outputDirectory}`);
