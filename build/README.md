# Build Resources

打包时 `electron-builder.yml` 会把本目录作为 `buildResources`，其中包含：

| 文件              | 用途                                                         |
| ----------------- | ------------------------------------------------------------ |
| `icon-source.png` | 512×512 的**设计原稿**（唯一需要手工维护的图标文件）         |
| `icon.png`        | 512×512 通用图标（Linux 打包基准）                           |
| `icon.ico`        | Windows 图标，含 16/24/32/48/64/128/256 多尺寸，每档单独绘制 |
| `icon-1024.png`   | 1024×1024，便于导出其他规格                                  |

`icon.png` / `icon.ico` / `icon-1024.png` 都由 `python tools/generate-icon.py`（需要 Pillow）按
`icon-source.png` 的几何参数绘制生成，因此小尺寸不会因为缩小而糊掉。改动设计时：先替换
`icon-source.png`，再按新稿量一下外框/钥匙孔的坐标，更新脚本里的 `FRAME_BOX`、`KEYHOLE_*`，
然后重新运行脚本。

造型：深色圆角底（`#15171b`，与深色主题同色）+ 蓝色圆角描边框（`#6b8afd`）+ 钥匙孔。

macOS 的 `.icns` 由 electron-builder 在打包时从 `icon.png` 自动转换，无需单独维护。
