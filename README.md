# TAMS Store Browser

A free, public web tool for browsing [Time-Addressable Media Store (TAMS)](https://github.com/bbc/tams) endpoints. No backend, no sign-up -- just add your TAMS store URL and start exploring.

**Live at: [cuttingroom.github.io/tamstool](https://cuttingroom.github.io/tamstool)**

## Features

- **Multi-store management** -- Connect to multiple TAMS endpoints, switch between them instantly
- **Sources & Flows browser** -- Filterable, sortable tables with customisable columns
- **Omakase Player** -- Advanced video player with timeline visualisation
- **Diagram View** -- Interactive graph of TAMS entity relationships
- **Zero backend** -- Everything runs in your browser; credentials stay in localStorage

## Quick Start

1. Visit [cuttingroom.github.io/tamstool](https://cuttingroom.github.io/tamstool)
2. Click **Manage Stores**
3. Add your TAMS endpoint URL (and optional Bearer token)
4. Browse Sources and Flows

## Local Development

```bash
npm install --legacy-peer-deps
npm run dev
```

The app runs at `http://localhost:5173/tamstool/`.

## Build

```bash
npm run build
npm run preview
```

## Attribution

This project is a fork of [AWS TAMS Tools](https://github.com/aws-samples/time-addressable-media-store-tools), an open-source project by **Amazon Web Services** released under the [MIT-0 license](LICENSE).

[TAMS (Time-Addressable Media Store)](https://github.com/bbc/tams) is a BBC initiative for time-addressable media.

Hosted and maintained by [CuttingRoom](https://cuttingroom.com) to support the TAMS community.

## Forking

You're welcome to fork this project. If you do, please remove CuttingRoom branding (logo, name, and links) and replace them with your own. The underlying code is MIT-0 licensed -- use it however you like.

## Disclaimer

This is a development and exploration tool. Do not point it at a production TAMS store -- it can delete flows and timeranges, and there is no undo. We provide it as-is, with no warranty or guarantees. CuttingRoom and the contributors accept no responsibility for data loss or any other damage resulting from its use.

## License

[MIT-0](LICENSE) (original AWS license)
