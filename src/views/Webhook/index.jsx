import {
  Alert,
  Box,
  Header,
  SpaceBetween,
  Spinner,
  Tabs,
} from "@cloudscape-design/components";
import { useParams } from "react-router-dom";

import CollectedBy from "@/components/CollectedBy";
import WebhookActionsButton from "@/components/WebhookActionsButton";
import EntityDetails from "@/components/EntityDetails";
import Tags from "@/components/Tags";
import ErrorTab from "./components/ErrorTab";
import { useWebhook } from "@/hooks/useWebhooks";

const Webhook = () => {
  const { webhookId } = useParams();
  const { webhook, isLoading, error } = useWebhook(webhookId);

  if (!webhookId) return null;

  if (error) {
    return (
      <Alert type="error" header="Could not load webhook">
        Failed to load webhook from the active store. The store may not
        support webhooks, or the endpoint may be unreachable.
        <Box
          margin={{ top: "xs" }}
          color="text-body-secondary"
          fontSize="body-s"
        >
          {error.message}
        </Box>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Box textAlign="center">
        <Spinner />
      </Box>
    );
  }

  if (!webhook) {
    return `No webhook found with the id ${webhookId}`;
  }

  return (
    <SpaceBetween size="l">
      <Header
        variant="h2"
        actions={<WebhookActionsButton selectedItems={[webhook]} />}
      >
        Webhook details
      </Header>
      <EntityDetails entityType="webhooks" entity={webhook} />
      <Tabs
        tabs={[
          {
            label: "Tags",
            id: "tags",
            content: (
              <Tags
                entityType="webhooks"
                entity={webhook}
                basePath="/service/webhooks"
              />
            ),
          },
          {
            label: "Flow ids",
            id: "flow_ids",
            content: (
              <CollectedBy
                entityType="flows"
                collectedBy={webhook.flow_ids ?? []}
              />
            ),
          },
          {
            label: "Source ids",
            id: "source_ids",
            content: (
              <CollectedBy
                entityType="sources"
                collectedBy={webhook.source_ids ?? []}
              />
            ),
          },
          {
            label: "Flow collected by ids",
            id: "flow_collected_by_ids",
            content: (
              <CollectedBy
                entityType="flows"
                collectedBy={webhook.flow_collected_by_ids ?? []}
              />
            ),
          },
          {
            label: "Source collected by ids",
            id: "source_collected_by_ids",
            content: (
              <CollectedBy
                entityType="sources"
                collectedBy={webhook.source_collected_by_ids ?? []}
              />
            ),
          },
          ...(webhook.error
            ? [
                {
                  label: "Error",
                  id: "error",
                  content: <ErrorTab error={webhook.error} />,
                },
              ]
            : []),
        ]}
      />
    </SpaceBetween>
  );
};

export default Webhook;
