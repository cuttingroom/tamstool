# TAMS Store Browser

A free, public web tool for browsing [Time-Addressable Media Store (TAMS)](https://github.com/bbc/tams) endpoints. No backend, no sign-up -- just add your TAMS store URL and start exploring.

**Live at: [cuttingroom.github.io/tamstool](https://cuttingroom.github.io/tamstool)**

## Features

- **Multi-store management** -- Connect to multiple TAMS endpoints, switch between them instantly
- **Sources & Flows browser** -- Filterable, sortable tables with customisable columns
- **Scoped listings** -- Show only top-level sources, or only the multi-sources that collect others
- **Ingest status** -- See which flows are growing, from the TAMS 8.2 `status` attribute
- **Flow Profiles** -- Browse profiles and the technical metadata they apply
- **Webhooks** -- List, register, update, and delete webhooks; inspect delivery errors
- **Omakase Player** -- Advanced video player with timeline visualisation
- **Diagram View** -- Interactive graph of TAMS entity relationships
- **Zero backend** -- Everything runs in your browser; credentials stay in localStorage

## TAMS version support

Targets **TAMS 8.2**; TAMS 8.0 and 8.1 stores are fully supported.

The tool reads `api_version` from the store's `/service` endpoint and only sends
newer query parameters to stores that advertise support for them, so pointing it
at an older store degrades cleanly rather than erroring. The detected version is
shown beside **Manage Stores** in the sidebar and in the store list.

8.2 features used where available:

| Feature | Used for |
|---|---|
| `sort_by` / `reverse_order` | Latest sources and flows in one request, sorted by the store |
| `collected_by_ids` | Top-level and multi-source scopes, collection contents, hierarchy |
| Flow `status` | Ingest/growing state, status column and filter (falls back to the deprecated `flow_status` tag) |
| `editorial_purpose` tag | Identifying collection members now that `role` is optional |
| `/service/profiles`, `profile_id` | Flow Profiles browser |
| `init_segments` | Flow attribute display and filter |
| `storage_backend_tag.{name}` | Narrowing segment `get_urls` by storage backend |
| `include_object_timerange` | Webhook registration option |

## Quick Start

1. Visit [cuttingroom.github.io/tamstool](https://cuttingroom.github.io/tamstool)
2. Click **Manage Stores**
3. Add your TAMS endpoint URL and credentials (OAuth2 client credentials by
   default; a Bearer token or no auth are also available)
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
