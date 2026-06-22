# assets/

Drop your real PNG artwork here. The game generates procedural placeholders
for any missing file, so it always runs during development.

## File list & specs

### ships/
| File | Size | Notes |
|------|------|-------|
| raijin-x.png   | 256×256 | Transparent PNG, nose pointing UP (+Y = tail) |
| viper-ii.png   | 256×256 | Transparent PNG, nose pointing UP |
| thunder-9.png  | 256×256 | Transparent PNG, nose pointing UP |
| shield-ring.png| 128×128 | Transparent ring, drawn centred |
| exhaust.png    | 32×64  | Engine flame strip, tip at top |

### enemies/
| File | Size | Notes |
|------|------|-------|
| fighter-sheet.png  | 384×96  | 4 frames × 96×96, idle bob animation |
| bomber-sheet.png   | 384×96  | 4 frames × 96×96 |
| gunship-sheet.png  | 384×96  | 4 frames × 96×96 |
| boss-sheet.png     | 1536×192| 8 frames × 192×192, facing DOWN |

### bullets/
| File | Size | Notes |
|------|------|-------|
| bullet-player.png  | 24×24  | Glowing orb, centred |
| bullet-enemy.png   | 20×20  | Glowing orb, centred |
| laser-strip.png    | 16×64  | Tileable vertical laser beam |
| missile.png        | 16×32  | Rocket, nose at top |
| plasma-orb.png     | 32×32  | Large glowing orb |

### fx/
| File | Size | Notes |
|------|------|-------|
| explosion-sheet.png | 512×512 | 4×4 grid of 128×128 frames, 16 total |
| shockwave-sheet.png | 768×128 | 6 frames × 128×128, ring expansion |
| spark.png           | 8×8    | Single spark particle |
| pickup-weapon.png   | 48×48  | W bubble |
| pickup-bomb.png     | 48×48  | B bubble |
| pickup-health.png   | 48×48  | + bubble |

### bg/
| File | Size | Notes |
|------|------|-------|
| stage1.png | 390×1400 | Deep space — scrolls vertically, seamless tile |
| stage2.png | 390×1400 | Lava world |
| stage3.png | 390×1400 | Nebula green |
| stage4.png | 390×1400 | Purple gas giant |
| stage5.png | 390×1400 | Crimson sector |
| nebula-overlay.png | 390×700 | Semi-transparent nebula overlay |

## Art pipeline recommendations

### AI generation (fastest)
1. Prompt Midjourney: "top-down orthographic sci-fi fighter jet, transparent background,
   game sprite, isolated, dramatic lighting, Raiden IV style --no background --ar 1:1"
2. Remove background: remove.bg or Photoshop Select Subject
3. Export as PNG-24 with alpha

### Blender (highest quality)
1. Model ship → Camera: Orthographic, above (+Z), pointing down (-Z)
2. 3-point lighting: key front-left, fill right, rim from below
3. Render: PNG with alpha, RGBA 32-bit, Cycles or EEVEE
4. For sprite sheets: render each animation frame, combine in Photoshop/Aseprite

### Sprite sheets
Use TexturePacker (https://www.codeandweb.com/texturepacker) or
manually arrange frames in Photoshop/GIMP.
Frame size must match the values in assetLoader.js _sliceSheet() calls.
