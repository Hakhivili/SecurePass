"""生成 SecurePass 应用图标（build/icon.png 与 build/icon.ico）。

设计：圆角方形渐变底（靛蓝）+ 白色盾牌 + 钥匙孔镂空。
用法：python tools/generate-icon.py
"""

from __future__ import annotations

import os

from PIL import Image, ImageDraw

SIZE = 1024
ACCENT_TOP = (122, 140, 246)
ACCENT_BOTTOM = (62, 78, 194)
RADIUS = 210


def vertical_gradient(size: int, top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    image = Image.new("RGB", (1, size))
    draw = ImageDraw.Draw(image)
    for y in range(size):
        ratio = y / max(1, size - 1)
        color = tuple(round(top[i] + (bottom[i] - top[i]) * ratio) for i in range(3))
        draw.point((0, y), fill=color)
    return image.resize((size, size), Image.BILINEAR)


def shield_points(size: int) -> list[tuple[float, float]]:
    scale = size / 1024
    points = [
        (256, 246),
        (512, 150),
        (768, 246),
        (768, 520),
        (512, 846),
        (256, 520),
    ]
    return [(x * scale, y * scale) for x, y in points]


def build_icon(size: int = SIZE) -> Image.Image:
    canvas = vertical_gradient(size, ACCENT_TOP, ACCENT_BOTTOM).convert("RGBA")

    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size - 1, size - 1), radius=round(RADIUS * size / 1024), fill=255
    )
    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    icon.paste(canvas, (0, 0), mask)

    draw = ImageDraw.Draw(icon)
    draw.polygon(shield_points(size), fill=(255, 255, 255, 255))

    # 钥匙孔：圆 + 下收的柄
    cx, cy = 512 * size / 1024, 428 * size / 1024
    r = 74 * size / 1024
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=ACCENT_BOTTOM + (255,))
    stem = [
        (476, 470),
        (548, 470),
        (572, 636),
        (452, 636),
    ]
    draw.polygon([(x * size / 1024, y * size / 1024) for x, y in stem], fill=ACCENT_BOTTOM + (255,))

    return icon


def main() -> None:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(root, "build")
    os.makedirs(out_dir, exist_ok=True)

    icon = build_icon()
    icon.resize((512, 512), Image.LANCZOS).save(os.path.join(out_dir, "icon.png"))
    icon.save(
        os.path.join(out_dir, "icon.ico"),
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    icon.save(os.path.join(out_dir, "icon-1024.png"))
    print("wrote build/icon.png, build/icon.ico, build/icon-1024.png")


if __name__ == "__main__":
    main()
