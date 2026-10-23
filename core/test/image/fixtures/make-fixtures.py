#!/usr/bin/env python3
"""Writes the image fixtures with encoders other than kittex's own.

The decoder is checked against an outside reading of each format: Pillow for
the JPEGs (baseline, progressive, grayscale, every EXIF orientation, and the
upright pixels Pillow's exif_transpose gives for each), ImageMagick for the
interlaced PNGs, from raw sources the tests compare against.

Run from this directory: python3 make-fixtures.py (needs Pillow and magick).
"""

import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageOps

# Quadrants red, blue / green, white, 32 x 16: each JPEG block holds one colour.
QUADS = [(220, 30, 30), (30, 30, 220), (30, 200, 30), (250, 250, 250)]
# 13 x 11: no Adam7 pass is a whole multiple of its step.
W, H = 13, 11
COLORS = [(255, 0, 0, 255), (0, 128, 255, 255), (20, 220, 90, 128), (0, 0, 0, 0), (250, 240, 10, 255), (90, 30, 160, 64)]


def magick(*args: str) -> None:
    binary = shutil.which("magick")
    if binary is None:
        raise SystemExit("make-fixtures: magick is not on PATH")
    subprocess.run([binary, *args], check=True, timeout=60)


def main() -> None:
    quad = Image.new("RGB", (32, 16))
    for y in range(16):
        for x in range(32):
            quad.putpixel((x, y), QUADS[(y // 8) * 2 + x // 16])
    quad.save("quad.jpg", quality=95, subsampling=0)
    quad.save("quad-progressive.jpg", quality=95, subsampling=0, progressive=True)
    quad.convert("L").save("quad-gray.jpg", quality=95)
    for n in range(1, 9):
        exif = Image.Exif()
        exif[0x0112] = n
        quad.save(f"orient-{n}.jpg", quality=95, subsampling=0, exif=exif)
        with Image.open(f"orient-{n}.jpg") as im:
            ImageOps.exif_transpose(im).convert("RGBA").save(f"orient-{n}.png")

    Path("pattern.rgba").write_bytes(bytes(v for y in range(H) for x in range(W) for v in (x * 19, y * 23, (x * y * 7) & 255, 40 + (x + y) * 9)))
    Path("palette.rgba").write_bytes(bytes(v for y in range(H) for x in range(W) for v in COLORS[(x + 2 * y) % len(COLORS)]))
    Path("bw.gray").write_bytes(bytes(255 if (x + y) % 3 == 0 else 0 for y in range(H) for x in range(W)))

    size = f"{W}x{H}"
    common = ["-interlace", "PNG", "-strip"]
    magick("-size", size, "-depth", "8", "rgba:pattern.rgba", *common, "-define", "png:color-type=6", "interlaced-rgba8.png")
    magick("-size", size, "-depth", "8", "rgba:pattern.rgba", *common, "PNG64:interlaced-rgba16.png")
    magick("-size", size, "-depth", "8", "rgba:palette.rgba", *common, "-type", "PaletteAlpha", "-define", "png:bit-depth=4", "interlaced-palette4.png")
    magick("-size", size, "-depth", "8", "gray:bw.gray", *common, "-define", "png:bit-depth=1", "-define", "png:color-type=0", "interlaced-gray1.png")


if __name__ == "__main__":
    main()
