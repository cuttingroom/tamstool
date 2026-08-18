import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CollectionPreferences,
  CopyToClipboard,
  Header,
  Pagination,
  Select,
  SpaceBetween,
  StatusIndicator,
  Table,
  TextFilter,
  Toggle,
} from "@cloudscape-design/components";
import { useFlows } from "@/hooks/useFlows";
import { Link } from "react-router-dom";
import { useCollection } from "@cloudscape-design/collection-hooks";
import { SERVER_SORT_FIELDS, toReverseOrder } from "@/hooks/useEntityListing";
import usePreferencesStore from "@/stores/usePreferencesStore";
import FlowActionsButton from "@/components/FlowActionsButton";
import { getEditorialPurpose } from "@/utils/editorialPurpose";
import { hasInitSegments } from "@/utils/initSegments";
import { MAX_DEPTH } from "@/utils/fetchEntityTree";
import { FLOW_STATUS_VALUES, getFlowStatus } from "@/utils/flowStatus";
import {
  FLOW_STATUS_MAPPINGS,
  PAGE_SIZE_PREFERENCE,
  RESULT_PAGE_SIZE,
  VIEW_MODE,
} from "@/constants";

const VIEW_MODE_OPTIONS = [
  {
    value: VIEW_MODE.ALL,
    label: "All flows",
    description: "Every flow in the store",
  },
  {
    value: VIEW_MODE.TOP_LEVEL,
    label: "Top-level only",
    description: "Flows that are not collected by another flow",
  },
  {
    value: VIEW_MODE.MULTI_ONLY,
    label: "Multi-flows only",
    description: "Top-level flows that collect other flows",
  },
];

const ANY_STATUS = "__any__";

const STATUS_OPTIONS = [
  { value: ANY_STATUS, label: "Any status" },
  ...FLOW_STATUS_VALUES.map((value) => ({ value, label: value })),
];

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
    id: "status",
    header: "Status",
    // 8.2 core attribute, falling back to the deprecated flow_status tag.
    cell: (item) => {
      const status = getFlowStatus(item);
      return status ? (
        <StatusIndicator {...(FLOW_STATUS_MAPPINGS[status] ?? {})}>
          {status}
        </StatusIndicator>
      ) : null;
    },
    sortingComparator: (a, b) =>
      (getFlowStatus(a) ?? "").localeCompare(getFlowStatus(b) ?? ""),
  },
  {
    id: "editorial_purpose",
    header: "Editorial purpose",
    cell: (item) => getEditorialPurpose(item),
    sortingComparator: (a, b) =>
      (getEditorialPurpose(a) ?? "").localeCompare(getEditorialPurpose(b) ?? ""),
  },
  {
    id: "init_segments",
    header: "Init segments",
    // 8.2 puts this under essence_parameters, not on the Flow; pre-8.2 stores
    // use the tags.init_segment Flow tag instead.
    cell: (item) => {
      if (hasInitSegments(item)) return "true";
      return item.essence_parameters?.init_segments === undefined
        ? null
        : "false";
    },
    sortingComparator: (a, b) =>
      Number(hasInitSegments(a)) - Number(hasInitSegments(b)),
  },
  {
    id: "profile_id",
    header: "Profile",
    cell: (item) =>
      item.profile_id ? (
        <Link to={`/profiles/${item.profile_id}`}>{item.profile_id}</Link>
      ) : null,
    sortingField: "profile_id",
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

const defaultSorting = {
  sortingColumn: columnDefinitions.find((col) => col.id === "created"),
  isDescending: true,
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
  const viewMode = usePreferencesStore((state) => state.flowsViewMode);
  const setViewMode = usePreferencesStore((state) => state.setFlowsViewMode);

  const [sorting, setSorting] = useState(defaultSorting);
  const [maxResults, setMaxResults] = useState(RESULT_PAGE_SIZE);
  const [statusFilter, setStatusFilter] = useState(ANY_STATUS);

  const sortField = sorting.sortingColumn?.sortingField;
  const sortBy = SERVER_SORT_FIELDS.flows.includes(sortField)
    ? sortField
    : undefined;

  const hierarchical = showHierarchy && viewMode === VIEW_MODE.ALL;

  const {
    flows,
    hasMore,
    truncated,
    loadedCount,
    capabilities,
    treeMode,
    isLoading,
    error,
  } = useFlows({
      viewMode,
      hierarchical,
      sortBy,
      reverseOrder: sortBy
        ? toReverseOrder(sortBy, sorting.isDescending)
        : false,
      status: statusFilter === ANY_STATUS ? undefined : statusFilter,
      maxResults,
    });

  // Filter locally unless the store did it: older stores have no status query
  // parameter, and hierarchical mode fetches by structure without sending one.
  const serverFiltered = capabilities.flowStatus && !treeMode;
  const visibleFlows = useMemo(() => {
    if (!flows) return flows;
    if (statusFilter === ANY_STATUS || serverFiltered) return flows;
    return flows.filter((flow) => getFlowStatus(flow) === statusFilter);
  }, [flows, statusFilter, serverFiltered]);

  const loadedIds = useMemo(
    () => new Set((visibleFlows ?? []).map((flow) => flow.id)),
    [visibleFlows]
  );

  const { items, collectionProps, filterProps, paginationProps } =
    useCollection(isLoading || error ? [] : visibleFlows ?? [], {
      expandableRows: hierarchical && {
        getId: (item) => item.id,
        getParentId: (item) =>
          item.collected_by?.find((id) => loadedIds.has(id)) ?? null,
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
      sorting: { defaultState: defaultSorting },
      selection: {},
    });
  const { selectedItems } = collectionProps;

  let description;
  if (capabilities.detectionFailed) {
    description = `Could not read the store's api_version (${capabilities.error.message}); falling back to TAMS 8.0 behaviour.`;
  } else if (!capabilities.flowStatus) {
    description = `Store reports TAMS ${
      capabilities.apiVersion ?? "8.0 or earlier"
    }; status is read from the deprecated flow_status tag.`;
  } else if (treeMode) {
    description =
      "Status comes from the flow's status attribute. Hierarchical view fetches the tree by structure, so filtering and sorting apply to the loaded rows.";
  } else {
    description =
      "Status comes from the flow's status attribute; the store applies the status filter and the Created, Metadata updated and Label sorts.";
  }

  if (truncated) {
    description = `${description} The hierarchy is incomplete: it is nested deeper than ${MAX_DEPTH} levels, or a collection has more children than one page.`;
  }

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
          counter={
            isLoading ? undefined : `(${loadedCount}${hasMore ? "+" : ""})`
          }
          description={description}
          actions={
            <SpaceBetween
              size="xs"
              direction="horizontal"
              alignItems="center"
            >
              {hasMore && (
                <Button
                  onClick={() => setMaxResults((current) => current + RESULT_PAGE_SIZE)}
                  loading={isLoading}
                >
                  Load more
                </Button>
              )}
              <Select
                selectedOption={
                  STATUS_OPTIONS.find((option) => option.value === statusFilter) ??
                  STATUS_OPTIONS[0]
                }
                onChange={({ detail }) =>
                  setStatusFilter(detail.selectedOption.value)
                }
                options={STATUS_OPTIONS}
              />
              <Select
                selectedOption={
                  VIEW_MODE_OPTIONS.find((option) => option.value === viewMode) ??
                  VIEW_MODE_OPTIONS[0]
                }
                onChange={({ detail }) =>
                  setViewMode(detail.selectedOption.value)
                }
                options={VIEW_MODE_OPTIONS}
              />
              <Toggle
                onChange={({ detail }) => setShowHierarchy(detail.checked)}
                checked={showHierarchy}
                disabled={viewMode !== VIEW_MODE.ALL}
              >
                Hierarchical View
              </Toggle>
              <FlowActionsButton selectedItems={selectedItems} />
            </SpaceBetween>
          }
        >
          Flows
        </Header>
      }
      {...collectionProps}
      onSortingChange={(event) => {
        setSorting(event.detail);
        collectionProps.onSortingChange?.(event);
      }}
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
