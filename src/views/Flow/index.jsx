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
import EssenceParameters from "./components/EssenceParameters";
import SegmentsTab from "./components/SegmentsTab";
import Tags from "@/components/Tags";
import { useFlow } from "@/hooks/useFlows";

const Flow = () => {
  const { flowId } = useParams();
  const { flow, isLoading: loadingFlow, error } = useFlow(flowId);

  if (error) {
    return (
      <Alert type="error" header="Could not connect to TAMS store">
        Failed to load flow from the active store. Check that the endpoint URL is correct and the store is reachable.
        <Box margin={{ top: "xs" }} color="text-body-secondary" fontSize="body-s">
          {error.message}
        </Box>
      </Alert>
    );
  }

  return !loadingFlow ? (
    flow ? (
      <SpaceBetween size="l">
        <Header variant="h2">
          <EntityHeader type="Flow" entity={flow} />
        </Header>
        <EntityDetails entityType="flows" entity={flow} />
        <Tabs
          tabs={[
            {
              label: "Essence Parameters",
              id: "essence",
              content: (
                <EssenceParameters
                  essenceParameters={flow?.essence_parameters}
                />
              ),
            },
            {
              label: "Tags",
              id: "tags",
              content: <Tags entityType="flows" entity={flow} />,
            },
            {
              label: "Flow collections",
              id: "flow_collection",
              content: (
                <Collection
                  entityType="flows"
                  collection={flow.flow_collection}
                />
              ),
            },
            {
              label: "Collected by",
              id: "collected_by",
              content: (
                <CollectedBy
                  entityType="flows"
                  collectedBy={flow.collected_by}
                />
              ),
            },
            {
              label: "Segments",
              id: "segments",
              content: <SegmentsTab flowId={flowId} />,
            },
          ]}
        />
      </SpaceBetween>
    ) : (
      `No flow found with the id ${flowId}`
    )
  ) : (
    <Box textAlign="center">
      <Spinner />
    </Box>
  );
};

export default Flow;
