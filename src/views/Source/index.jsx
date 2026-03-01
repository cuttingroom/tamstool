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
import Collection from "@/components/Collection";
import EntityHeader from "@/components/EntityHeader";
import EntityDetails from "@/components/EntityDetails";
import FlowsTab from "./components/FlowsTab";
import Tags from "@/components/Tags";
import { useSource } from "@/hooks/useSources";

const Source = () => {
  const { sourceId } = useParams();
  const { source, isLoading: loadingSource, error } = useSource(sourceId);

  if (error) {
    return (
      <Alert type="error" header="Could not connect to TAMS store">
        Failed to load source from the active store. Check that the endpoint URL is correct and the store is reachable.
        <Box margin={{ top: "xs" }} color="text-body-secondary" fontSize="body-s">
          {error.message}
        </Box>
      </Alert>
    );
  }

  return !loadingSource ? (
    source ? (
      <SpaceBetween size="l">
        <Header variant="h2">
          <EntityHeader type="Source" entity={source} />
        </Header>
        <EntityDetails entityType="sources" entity={source} />
        <Tabs
          tabs={[
            {
              label: "Tags",
              id: "tags",
              content: <Tags entityType="sources" entity={source} />,
            },
            {
              label: "Source collections",
              id: "source_collection",
              content: (
                <Collection
                  entityType="sources"
                  collection={source.source_collection}
                />
              ),
            },
            {
              label: "Collected by",
              id: "collected_by",
              content: (
                <CollectedBy
                  entityType="sources"
                  collectedBy={source.collected_by}
                />
              ),
            },
            {
              label: "Flows",
              id: "flows",
              content: <FlowsTab sourceId={sourceId} />,
            },
          ]}
        />
      </SpaceBetween>
    ) : (
      `No source found with the id ${sourceId}`
    )
  ) : (
    <Box textAlign="center">
      <Spinner />
    </Box>
  );
};

export default Source;
