import ReactMarkdown from "react-markdown";
import {
  Box,
  Button,
  Container,
  Header,
  SpaceBetween,
  TextContent,
} from "@cloudscape-design/components";
import remarkGfm from "remark-gfm";
import { useNavigate } from "react-router-dom";

const pageMarkdown = `
**TAMS Store Browser** lets you explore [Time-Addressable Media Store](https://github.com/bbc/tams) endpoints directly from your browser -- no backend, no infrastructure, no sign-up required.

[CuttingRoom](https://cuttingroom.com) believes in open standards and interoperability, and is hosting this tool to make it easy for anyone to explore TAMS.

The source code is at [github.com/cuttingroom/tamstool](https://github.com/cuttingroom/tamstool) -- contributions, forks, and issues are welcome.

### Why this tool?

This project is a fork of [AWS TAMS Tools](https://github.com/aws-samples/time-addressable-media-store-tools), an open-source project by **Amazon Web Services** (MIT-0 license). The AWS tool is great, but it is designed to be deployed as part of an AWS stack, which means you need your own infrastructure to run it. We wanted a version that **anyone can use immediately** -- hosted for free, no deployment, no AWS account, no setup. Just open the page, point it at a TAMS endpoint, and start browsing.

TAMS itself is a [BBC initiative](https://github.com/bbc/tams) for time-addressable media.

### TAMS versions

This tool targets [TAMS 8.2](https://bbc.github.io/tams/8.2/index.html) and works against 8.0 and 8.1 stores too. It reads \`api_version\` from the store's \`/service\` endpoint and only uses newer query parameters where the store advertises support -- the detected version is shown next to **Manage Stores** in the sidebar. On an 8.2 store you additionally get:

- Server-side sorting, so the newest sources arrive in the first request instead of after downloading the whole store
- Scoped listings -- **Top-level only** and **Multi-sources only** -- built on the \`collected_by_ids\` filter
- Ingest status from the flow's \`status\` attribute rather than the deprecated \`flow_status\` tag
- Flow Profiles, init segments, and storage-backend tag filters

### Features

- **Sources** -- Browse all sources in the active TAMS store, with filtering, sorting, scoped views, and column customisation.
- **Flows** -- Browse flows, filter by ingest status, manage timeranges, and view detailed metadata.
- **Profiles** -- Browse Flow Profiles and the technical metadata they apply (TAMS 8.2 stores).
- **Webhooks** -- List, register, update, and delete TAMS webhooks; inspect delivery errors.
- **Omakase Player** -- Advanced video player with timeline visualisation and markers.
- **Diagram View** -- Interactive graph of TAMS entity relationships (sources, flows, segments).

### Quick Start

1. Click **Manage Stores** (or use the sidebar)
2. Enter a name and the base URL of your TAMS API endpoint
3. Add authentication -- OAuth2 client credentials by default, or a Bearer token, or none for public endpoints
4. Click **Add**, then browse Sources and Flows

### Privacy

All store endpoints and credentials are stored **only** in your browser's \`localStorage\`. Nothing is sent to any server other than the TAMS endpoints you configure.

### Heads up

This is a development and exploration tool -- not something you should point at a production TAMS store and hope for the best. It can delete flows and timeranges, and it will happily do so if you click the button. There is no undo.

We provide this tool as-is, with no warranty or guarantees of any kind. CuttingRoom and the contributors to this project accept no responsibility for data loss, broken workflows, or any other damage resulting from its use. Use it for development, testing, and learning. If you need production tooling, build something with proper safeguards.
`;

const Home = () => {
  const navigate = useNavigate();

  return (
    <SpaceBetween size="l">
      <Container
        header={<Header variant="h1">Welcome to TAMS Store Browser</Header>}
      >
        <TextContent>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {pageMarkdown}
          </ReactMarkdown>
        </TextContent>
        <Box margin={{ top: "l" }}>
          <Button variant="primary" onClick={() => navigate("/stores")}>
            Manage Stores
          </Button>
        </Box>
      </Container>
      <Box textAlign="center" color="text-body-secondary" fontSize="body-s">
        Based on{" "}
        <a
          href="https://github.com/aws-samples/time-addressable-media-store-tools"
          target="_blank"
          rel="noopener noreferrer"
        >
          AWS TAMS Tools
        </a>{" "}
        |{" "}
        <a
          href="https://github.com/bbc/tams"
          target="_blank"
          rel="noopener noreferrer"
        >
          TAMS by BBC
        </a>{" "}
        |{" "}
        Hosted by{" "}
        <a
          href="https://cuttingroom.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          CuttingRoom
        </a>
      </Box>
    </SpaceBetween>
  );
};

export default Home;
