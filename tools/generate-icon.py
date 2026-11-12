"""生成 SecurePass 应用图标（build/icon.png、build/icon.ico、build/icon-1024.png）。

设计：深色圆角底（#15171b，与深色主题同色）+ 蓝色圆角描边框（#6b8afd）+ 钥匙孔。
几何参数取自 build/icon-source.png（512×512 参考稿）：外框 (96,108)-(415,403)、
圆角 56、描边 35，钥匙孔圆 r=40 @(255.5,235) 与下宽梯形合并。

用法：python tools/generate-icon.py
"""

from __future__ import annotations

import os

from PIL import Image, ImageDraw

BASE = 512
CANVAS_RADIUS = 110
BACKGROUND = (21, 23, 27, 255)
ACCENT = (107, 138, 253, 255)

FRAME_BOX = (96, 108, 415, 403)
FRAME_RADIUS = 56
FRAME_WIDTH = 35

KEYHOLE_CENTER = (255.5, 235.0)
KEYHOLE_RADIUS = 40.0
KEYHOLE_STEM = [(233.0, 262.0), (278.0, 262.0), (287.0, 314.0), (224.0, 314.0)]

ICO_SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def build_icon(size: int = BASE, supersample: int = 4) -> Image.Image:
    """按目标尺寸绘制；先放大 supersample 倍再缩小，保证小尺寸的边缘也干净。"""
    scale = size / BASE
    big = size * supersample

    def s(value: float) -> float:
        return value * scale * supersample

    icon = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(icon)

    draw.rounded_rectangle(
        (0, 0, big - 1, big - 1), radius=round(CANVAS_RADIUS * scale * supersample), fill=BACKGROUND
    )

    left, top, right, bottom = FRAME_BOX
    draw.rounded_rectangle(
        (s(left), s(top), s(right), s(bottom)),
        radius=round(FRAME_RADIUS * scale * supersample),
        outline=ACCENT,
        width=max(1, round(FRAME_WIDTH * scale * supersample)),
    )

    cx, cy = KEYHOLE_CENTER
    r = KEYHOLE_RADIUS
    draw.ellipse((s(cx - r), s(cy - r), s(cx + r), s(cy + r)), fill=ACCENT)
    draw.polygon([(s(x), s(y)) for x, y in KEYHOLE_STEM], fill=ACCENT)

    return icon.resize((size, size), Image.LANCZOS)


def main() -> None:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(root, "build")
    os.makedirs(out_dir, exist_ok=True)

    # Windows 资源管理器/任务栏优先使用 ico 里的各档尺寸，这里每档单独绘制，避免缩小糊掉
    ico_images = [build_icon(size) for size, _ in ICO_SIZES]
    ico_images[-1].save(
        os.path.join(out_dir, "icon.ico"),
        sizes=ICO_SIZES,
        append_images=ico_images[:-1],
    )

    build_icon(512).save(os.path.join(out_dir, "icon.png"))
    build_icon(1024, supersample=2).save(os.path.join(out_dir, "icon-1024.png"))
    print("wrote build/icon.png, build/icon.ico, build/icon-1024.png")


if __name__ == "__main__":
    main()
