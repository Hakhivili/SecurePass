# Build Resources

打包时 `electron-builder.yml` 会把本目录作为 `buildResources`，其中包含：

- `icon.png`：512×512 的通用图标（Linux、macOS 打包基准）
- `icon.ico`：Windows 图标（含 16/24/32/48/64/128/256 多尺寸）
- `icon-1024.png`：1024×1024 源图，便于再导出其他规格

这三个文件由 `python tools/generate-icon.py` 生成（需要 Pillow），
设计为「靛蓝渐变圆角底 + 白色盾牌 + 钥匙孔」。修改配色或造型后重新运行该脚本即可。

macOS 的 `.icns` 由 electron-builder 在打包时从 `icon.png` 自动转换，无需单独维护。
