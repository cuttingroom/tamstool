import { PAGE_SIZE_PREFERENCE } from "@/constants";
import {
  Alert,
  Box,
  CollectionPreferences,
  CopyToClipboard,
  Header,
  Pagination,
  SpaceBetween,
  Table,
  TextFilter,
  Toggle,
} from "@cloudscape-design/components";
import { useFlows } from "@/hooks/useFlows";
import { Link } from "react-router-dom";
import { useCollection } from "@cloudscape-design/collection-hooks";
import usePreferencesStore from "@/stores/usePreferencesStore";
import FlowActionsButton from "@/components/FlowActionsButton";

const columnDefinitions = [
  {
    id: "id",
    header: "Id",
    cell: (item) => (
      <>
        <Link to={`/flows/${item.id}`}>{item.id}</Link>
        <CopyToClipboard
          copyButtonAriaLabel="Copy Id"
          copyErrorText="Id failed to copy"
          copySuccessText="Id copied"
          textToCopy={item.id}
          variant="icon"
        />
      </>
    ),
    sortingField: "id",
    isRowHeader: true,
    width: 360,
  },
  {
    id: "label",
    header: "Label",
    cell: (item) => item.label,
    sortingField: "label",
  },
  {
    id: "description",
    header: "Description",
    cell: (item) => item.description,
    sortingField: "description",
  },
  {
    id: "format",
    header: "Format",
    cell: (item) => item.format,
    sortingField: "format",
  },
  {
    id: "created_by",
    header: "Created by",
    cell: (item) => item.created_by,
    sortingField: "created_by",
  },
  {
    id: "updated_by",
    header: "Modified by",
    cell: (item) => item.updated_by,
    sortingField: "updated_by",
  },
  {
    id: "created",
    header: "Created",
    cell: (item) => item.created,
    sortingField: "created",
  },
  {
    id: "tags",
    header: "Tags",
    cell: (item) => item.tags,
    sortingField: "tags",
  },
  {
    id: "flow_collection",
    header: "Flow collection",
    cell: (item) => item.flow_collection,
    sortingField: "flow_collection",
  },
  {
    id: "collected_by",
    header: "Collected by",
    cell: (item) => item.collected_by,
    sortingField: "collected_by",
  },
  {
    id: "source_id",
    header: "Source id",
    cell: (item) => item.source_id,
    sortingField: "source_id",
  },
  {
    id: "metadata_version",
    header: "Metadata version",
    cell: (item) => item.metadata_version,
    sortingField: "metadata_version",
  },
  {
    id: "generation",
    header: "Generation",
    cell: (item) => item.generation,
    sortingField: "generation",
  },
  {
    id: "metadata_updated",
    header: "Metadata updated",
    cell: (item) => item.metadata_updated,
    sortingField: "metadata_updated",
  },
  {
    id: "read_only",
    header: "Read only",
    cell: (item) => item.read_only,
    sortingField: "read_only",
  },
  {
    id: "codec",
    header: "Codec",
    cell: (item) => item.codec,
    sortingField: "codec",
  },
  {
    id: "container",
    header: "Container",
    cell: (item) => item.container,
    sortingField: "container",
  },
  {
    id: "avg_bit_rate",
    header: "Avg bit rate",
    cell: (item) => item.avg_bit_rate,
    sortingField: "avg_bit_rate",
  },
  {
    id: "max_bit_rate",
    header: "Max bit rate",
    cell: (item) => item.max_bit_rate,
    sortingField: "max_bit_rate",
  },
];
const collectionPreferencesProps = {
  pageSizePreference: PAGE_SIZE_PREFERENCE,
  contentDisplayPreference: {
    title: "Column preferences",
    description: "Customize the columns visibility and order.",
    options: columnDefinitions.map(({ id, header }) => ({
      id,
      label: header,
      alwaysVisible: id === "id",
    })),
  },
  cancelLabel: "Cancel",
  confirmLabel: "Confirm",
  title: "Preferences",
};

const Flows = () => {
  const preferences = usePreferencesStore((state) => state.flowsPreferences);
  const setPreferences = usePreferencesStore(
    (state) => state.setFlowsPreferences
  );
  const showHierarchy = usePreferencesStore(
    (state) => state.flowsShowHierarchy
  );
  const setShowHierarchy = usePreferencesStore(
    (state) => state.setFlowsShowHierarchy
  );
  const { flows, isLoading, error } = useFlows();
  const { items, collectionProps, filterProps, paginationProps } =
    useCollection(isLoading || error ? [] : flows ?? [], {
      expandableRows: showHierarchy && {
        getId: (item) => item.id,
        getParentId: (item) =>
          item.collected_by ? item.collected_by[0] : null,
      },
      filtering: {
        empty: (
          <Box margin={{ vertical: "xs" }} textAlign="center" color="inherit">
            <b>No flows</b>
          </Box>
        ),
        noMatch: (
          <Box margin={{ vertical: "xs" }} textAlign="center" color="inherit">
            <b>No matches</b>
          </Box>
        ),
      },
      pagination: { pageSize: preferences.pageSize },
      sorting: {
        defaultState: {
          sortingColumn: columnDefinitions.find((col) => col.id === "created"),
          isDescending: true,
        },
      },
      selection: {},
    });
  const { selectedItems } = collectionProps;

  if (error) {
    return (
      <Alert type="error" header="Could not connect to TAMS store">
        Failed to load flows from the active store. Check that the endpoint URL is correct and the store is reachable.
        <Box margin={{ top: "xs" }} color="text-body-secondary" fontSize="body-s">
          {error.message}
        </Box>
      </Alert>
    );
  }

  return (
    <Table
      header={
        <Header
          actions={
            <SpaceBetween
              size="xs"
              direction="horizontal"
              alignItems="center"
            >
              <FlowActionsButton selectedItems={selectedItems} />
              <Toggle
                onChange={({ detail }) => setShowHierarchy(detail.checked)}
                checked={showHierarchy}
              >
                Hierarchical View
              </Toggle>
            </SpaceBetween>
          }
        >
          Flows
        </Header>
      }
      {...collectionProps}
      variant="borderless"
      loadingText="Loading resources"
      loading={isLoading}
      trackBy="id"
      selectionType="multi"
      columnDefinitions={columnDefinitions}
      columnDisplay={preferences.contentDisplay}
      contentDensity="compact"
      items={items}
      pagination={<Pagination {...paginationProps} />}
      filter={<TextFilter {...filterProps} />}
      preferences={
        <CollectionPreferences
          {...collectionPreferencesProps}
          preferences={preferences}
          onConfirm={({ detail }) => setPreferences(detail)}
        />
      }
    />
  );
};

export default Flows;
