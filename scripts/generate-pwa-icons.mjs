// One-time PWA icon generation — run manually with `node scripts/generate-pwa-icons.mjs`
// whenever the source brand assets in public/ change. Not part of the build;
// output is committed like any other static asset.
//
// Source assets already in public/ (per the Expo app's own icon convention —
// these filenames match duka-vendors/assets/ exactly, so the brand assets
// are shared across both apps):
//   icon.png                    — flat 512x512 app icon
//   android-icon-foreground.png — adaptive icon foreground layer, 512x512
//   android-icon-background.png — adaptive icon background layer, 512x512
//   splash-icon.png             — 1024x1024, used for the iOS splash screens
//
// Brand background color (#f97316) matches app.json's existing
// adaptiveIcon.backgroundColor / splash.backgroundColor in duka-vendors.

import sharp from "sharp";
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");
const ICONS_DIR = join(PUBLIC, "icons");
const BRAND_BG = "#f97316";

async function main() {
  if (!existsSync(ICONS_DIR)) mkdirSync(ICONS_DIR, { recursive: true });

  const iconSrc = join(PUBLIC, "icon.png");
  const fgSrc = join(PUBLIC, "android-icon-foreground.png");
  const bgSrc = join(PUBLIC, "android-icon-background.png");
  const splashSrc = join(PUBLIC, "splash-icon.png");

  for (const [label, path] of [["icon.png", iconSrc], ["android-icon-foreground.png", fgSrc], ["android-icon-background.png", bgSrc], ["splash-icon.png", splashSrc]]) {
    if (!existsSync(path)) throw new Error(`Missing source asset: ${label} (expected at ${path})`);
  }

  // ── Standard manifest icons (any-purpose) ──────────────────────────────
  await sharp(iconSrc).resize(192, 192).png().toFile(join(ICONS_DIR, "icon-192.png"));
  await sharp(iconSrc).resize(512, 512).png().toFile(join(ICONS_DIR, "icon-512.png"));
  console.log("✓ icon-192.png, icon-512.png (any-purpose)");

  // ── Maskable icon ────────────────────────────────────────────────────────
  // Android/maskable spec requires content to sit inside the center ~80%
  // "safe zone" or OS launchers clip it when masking into a circle/squircle.
  // The foreground/background layers already carry Expo's own adaptive-icon
  // safe-zone padding baked in (same convention as the native Android app),
  // so a direct composite at full canvas size is correct here — no extra
  // scaling needed on top of what's already in the source layers.
  await sharp(bgSrc)
    .resize(512, 512)
    .composite([{ input: await sharp(fgSrc).resize(512, 512).toBuffer() }])
    .png()
    .toFile(join(ICONS_DIR, "icon-maskable-512.png"));
  console.log("✓ icon-maskable-512.png");

  // ── Apple touch icon ─────────────────────────────────────────────────────
  // iOS applies its own rounding/shine to touch icons and expects a fully
  // opaque square — flattening any transparency onto the brand background
  // avoids the black-box artifact iOS renders behind a transparent PNG.
  await sharp(iconSrc)
    .resize(180, 180)
    .flatten({ background: BRAND_BG })
    .png()
    .toFile(join(PUBLIC, "..", "src", "app", "apple-icon.png"));
  console.log("✓ src/app/apple-icon.png (Next.js auto-wires the <link> tag)");

  // ── Favicon-equivalent for Next's own file convention ───────────────────
  await sharp(iconSrc).resize(32, 32).png().toFile(join(__dirname, "..", "src", "app", "icon.png"));
  console.log("✓ src/app/icon.png (Next.js auto-wires the <link> tag)");

  // ── iOS splash screens ────────────────────────────────────────────────────
  // Not exhaustive per-device-model coverage (that's dozens of exact pixel
  // variants for diminishing returns) — covers the common modern iPhone
  // portrait breakpoints via media-query-scoped <link> tags in layout.tsx.
  //
  // splash-icon.png is already a complete, well-designed asset as-is —
  // orange mark on a white background, good contrast. Letterboxing it onto
  // white (matching its own background) to fit each target size, rather
  // than extracting just the mark and recompositing onto a solid brand-color
  // canvas: that route was tried and produced a visibly low-contrast result
  // (orange mark on orange canvas reads as almost invisible regardless of
  // exact color values — confirmed visually before switching approach).
  const splashSizes = [
    { name: "splash-1170x2532.png", width: 1170, height: 2532 }, // iPhone 12/13/14
    { name: "splash-1179x2556.png", width: 1179, height: 2556 }, // iPhone 15/16
    { name: "splash-1284x2778.png", width: 1284, height: 2778 }, // iPhone Pro Max (older)
    { name: "splash-1290x2796.png", width: 1290, height: 2796 }, // iPhone 15/16 Pro Max
  ];
  for (const { name, width, height } of splashSizes) {
    await sharp(splashSrc)
      .resize(Math.round(width * 0.45), Math.round(width * 0.45), {
        fit: "contain",
        background: "#ffffff",
      })
      .resize(width, height, { fit: "contain", background: "#ffffff" })
      .flatten({ background: "#ffffff" })
      .png()
      .toFile(join(ICONS_DIR, name));
  }
  console.log(`✓ ${splashSizes.length} iOS splash screens`);

  console.log("\nDone. Generated files are ordinary static assets — commit them like any other.");
}

main().catch((err) => {
  console.error("Icon generation failed:", err.message);
  process.exit(1);
});
