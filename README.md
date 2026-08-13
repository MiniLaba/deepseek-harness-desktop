# DeepSeek Harness Desktop

An unofficial desktop wrapper for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). It starts the bundled `@deepseek-ai/dsh` runtime on loopback only and presents its web interface in a native desktop window.

## Install

Download the installer for your system from the GitHub Releases page:

- macOS Apple Silicon: `arm64` DMG or ZIP
- macOS Intel: `x64` DMG or ZIP
- Windows: NSIS installer or portable EXE

The installers are unsigned. macOS Gatekeeper and Windows SmartScreen may require an explicit confirmation before first use.

## Development

```sh
npm ci
npm start
```

## Release

Push a version tag such as `v0.1.0`. GitHub Actions builds macOS Intel, macOS Apple Silicon, and Windows x64 packages, then attaches them to a GitHub Release.

## Data and privacy

The app binds DeepSeek Harness to `127.0.0.1` and stores its local state in the operating-system application-data directory. It does not expose the server on the local network.

## License and attribution

This wrapper is MIT licensed. DeepSeek Harness is an independent MIT-licensed project maintained by DeepSeek AI; see its [repository](https://github.com/deepseek-ai/deepseek-harness) and third-party notices for its licenses.
