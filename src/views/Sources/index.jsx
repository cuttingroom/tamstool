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
  Table,
  TextFilter,
  Toggle,
} from "@cloudscape-design/components";

import { Link } from "react-router-dom";
import { useCollection } from "@cloudscape-design/collection-hooks";
import { useSources } from "@/hooks/useSources";
import { SERVER_SORT_FIELDS, toReverseOrder } from "@/hooks/useEntityListing";
import usePreferencesStore from "@/stores/usePreferencesStore";
import { getEditorialPurpose } from "@/utils/editorialPurpose";
import {
  PAGE_SIZE_PREFERENCE,
  RESULT_PAGE_SIZE,
  VIEW_MODE,
} from "@/constants";

const VIEW_MODE_OPTIONS = [
  {
    value: VIEW_MODE.ALL,
    label: "All sources",
    description: "Every source in the store",
  },
  {
    value: VIEW_MODE.TOP_LEVEL,
    label: "Top-level only",
    description: "Sources that are not collected by another source",
  },
  {
    value: VIEW_MODE.MULTI_ONLY,
    label: "Multi-sources only",
    description: "Top-level sources that collect other sources",
  },
];

const columnDefinitions = [
  {
    id: "id",
    header: "Id",
    cell: (item) => (
      <>
        <Link to={`/sources/${item.id}`}>{item.id}</Link>
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
    id: "format",
    header: "Format",
    cell: (item) => item.format,
    sortingField: "format",
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
    id: "updated",
    header: "Updated",
    cell: (item) => item.updated,
    sortingField: "updated",
  },
  {
    id: "editorial_purpose",
    header: "Editorial purpose",
    cell: (item) => getEditorialPurpose(item),
    sortingField: "editorial_purpose",
  },
  {
    id: "tags",
    header: "Tags",
    cell: (item) => item.tags,
    sortingField: "tags",
  },
  {
    id: "source_collection",
    header: "Source collection",
    cell: (item) => item.source_collection,
    sortingField: "source_collection",
  },
  {
    id: "collected_by",
    header: "Collected by",
    cell: (item) => item.collected_by,
    sortingField: "collected_by",
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

const Sources = () => {
  const preferences = usePreferencesStore((state) => state.sourcesPreferences);
  const setPreferences = usePreferencesStore(
    (state) => state.setSourcesPreferences
  );
  const showHierarchy = usePreferencesStore(
    (state) => state.sourcesShowHierarchy
  );
  const setShowHierarchy = usePreferencesStore(
    (state) => state.setSourcesShowHierarchy
  );
  const viewMode = usePreferencesStore((state) => state.sourcesViewMode);
  const setViewMode = usePreferencesStore((state) => state.setSourcesViewMode);

  // Mirrors the table's sorting state so it can be pushed into the query. The
  // table stays the single sorting control; this just reads what it is doing.
  const [sorting, setSorting] = useState(defaultSorting);
  const [maxResults, setMaxResults] = useState(RESULT_PAGE_SIZE);

  const sortField = sorting.sortingColumn?.sortingField;
  const sortBy = SERVER_SORT_FIELDS.sources.includes(sortField)
    ? sortField
    : undefined;

  // The hierarchy needs children in the item set, which the scoped views exclude.
  const hierarchical = showHierarchy && viewMode === VIEW_MODE.ALL;

  const { sources, hasMore, loadedCount, capabilities, treeMode, isLoading, error } =
    useSources({
      viewMode,
      hierarchical,
      sortBy,
      reverseOrder: sortBy
        ? toReverseOrder(sortBy, sorting.isDescending)
        : false,
      maxResults,
    });

  const loadedIds = useMemo(
    () => new Set((sources ?? []).map((source) => source.id)),
    [sources]
  );

  const { items, collectionProps, filterProps, paginationProps } =
    useCollection(isLoading || error ? [] : sources ?? [], {
      expandableRows: hierarchical && {
        getId: (item) => item.id,
        // Prefer a parent that is actually loaded: a source may be collected by
        // several sources, and only some of them may be in view.
        getParentId: (item) =>
          item.collected_by?.find((id) => loadedIds.has(id)) ?? null,
      },
      filtering: {
        empty: (
          <Box margin={{ vertical: "xs" }} textAlign="center" color="inherit">
            <b>No sources</b>
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

  let description;
  if (!capabilities.sortBy) {
    description = `Store reports TAMS ${
      capabilities.apiVersion ?? "8.0 or earlier"
    }; all sources are loaded and sorted in the browser.`;
  } else if (treeMode) {
    description =
      "Hierarchical view fetches the tree by structure, so all columns sort the loaded rows.";
  } else {
    description =
      "Sorted by the store. Sort on Created, Updated or Label to re-query; other columns sort the loaded rows.";
  }

  if (error) {
    return (
      <Alert type="error" header="Could not connect to TAMS store">
        Failed to load sources from the active store. Check that the endpoint URL is correct and the store is reachable.
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
            </SpaceBetween>
          }
        >
          Sources
        </Header>
      }
      {...collectionProps}
      onSortingChange={(event) => {
        setSorting(event.detail);
        collectionProps.onSortingChange?.(event);
      }}
      selectionType="single"
      variant="borderless"
      loadingText="Loading resources"
      loading={isLoading}
      trackBy="id"
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

export default Sources;
