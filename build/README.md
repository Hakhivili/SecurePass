# Build Resources

Place platform icons and signing assets in this directory:

- `icon.ico` for Windows
- `icon.icns` for macOS
- `icon.png` for Linux

`electron-builder.yml` uses this directory as `buildResources`. No binary icons are committed in the
initial scaffold; add the final production icons before packaging a release.
