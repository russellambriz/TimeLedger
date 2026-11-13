"""Draw the TimeLedger home-screen icons and a film-grain tile."""

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "public" / "icons"
ASSET_DIR = ROOT / "src" / "assets"


def icon(size: int) -> Image.Image:
    image = Image.new("RGB", (size, size), "#0C0B0A")
    draw = ImageDraw.Draw(image)
    scale = size / 512
    center = size / 2

    def ring(radius: float, color: str, width: float) -> None:
        radius *= scale
        left = center - radius
        right = center + radius
        draw.ellipse([left, left, right, right], outline=color, width=max(1, round(width * scale)))

    def tick(angle: float, inner: float, outer: float, width: float) -> None:
        theta = math.radians(angle - 90)
        x1 = center + math.cos(theta) * inner * scale
        y1 = center + math.sin(theta) * inner * scale
        x2 = center + math.cos(theta) * outer * scale
        y2 = center + math.sin(theta) * outer * scale
        draw.line([x1, y1, x2, y2], fill="#E7D7BE", width=max(1, round(width * scale)))

    ring(176, "#D4B896", 8)
    ring(154, "#8C7350", 2)
    tick(0, 128, 150, 7)
    for angle in (90, 180, 270):
        tick(angle, 136, 150, 4)
    draw.line(
        [center, center, center, center - 78 * scale],
        fill="#E7D7BE",
        width=max(1, round(4 * scale)),
    )
    dot = 7 * scale
    draw.ellipse([center - dot, center - dot, center + dot, center + dot], fill="#D4B896")
    return image


def noise(size: int = 128) -> Image.Image:
    image = Image.new("RGBA", (size, size))
    pixels = image.load()
    rng = random.Random(7)
    for y in range(size):
        for x in range(size):
            value = rng.randint(210, 255)
            alpha = 0 if rng.random() < 0.72 else rng.randint(20, 80)
            pixels[x, y] = (value, value, value, alpha)
    return image


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    icon(192).save(ICON_DIR / "icon-192.png")
    icon(512).save(ICON_DIR / "icon-512.png")
    icon(180).save(ICON_DIR / "apple-touch-icon.png")
    noise().save(ASSET_DIR / "noise.png")


if __name__ == "__main__":
    main()
