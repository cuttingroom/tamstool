import { useMemo } from "react";
import useSWR from "swr";
import { useApi } from "@/hooks/useApi";
import { useCapabilities } from "@/hooks/useService";
import buildQuery from "@/utils/buildQuery";
import fetchEntityTree from "@/utils/fetchEntityTree";
import paginationFetcher from "@/utils/paginationFetcher";
import { RESULT_PAGE_SIZE, TAMS_PAGE_LIMIT, VIEW_MODE } from "@/constants";

// Fields TAMS 8.2 can sort on, keyed by the column ids used in the listing views.
export const SERVER_SORT_FIELDS = {
  sources: ["created", "updated", "label"],
  flows: ["created", "metadata_updated", "label"],
};

/**
 * Translate a table's sort direction into TAMS `reverse_order`.
 *
 * 8.2 defines the natural order per field rather than as a single direction:
 * `created`/`updated`/`metadata_updated` come back most recent first, while
 * `label` comes back alphabetically.
 */
export const toReverseOrder = (sortBy, isDescending) =>
  sortBy === "label" ? Boolean(isDescending) : !isDescending;

const COLLECTION_FIELD = {
  sources: "source_collection",
  flows: "flow_collection",
};

/**
 * Shared listing hook for /sources and /flows.
 *
 * On an 8.2 store the store does the work: `sort_by`/`reverse_order` put the
 * most relevant records first so only the first page is fetched, and
 * `collected_by_ids=` narrows the listing to top-level entities. Older stores
 * keep the previous behaviour of walking every page and sorting in the browser,
 * because their first page arrives in no guaranteed order.
 *
 * Hierarchical mode is the exception: the tree is fetched by structure, so the
 * query filters and sort are not sent. Callers must apply them to the loaded
 * rows instead, which is what `treeMode` in the return value is for.
 */
export const useEntityListing = (entityType, options = {}) => {
  const {
    viewMode = VIEW_MODE.ALL,
    hierarchical = false,
    sortBy,
    reverseOrder = false,
    status,
    profileId,
    initSegments,
    maxResults = RESULT_PAGE_SIZE,
    refreshInterval,
  } = options;

  const api = useApi();
  const capabilities = useCapabilities();

  const scoped = capabilities.collectedByIds && viewMode !== VIEW_MODE.ALL;
  const treeMode = capabilities.collectedByIds && hierarchical;

  const path = buildQuery(`/${entityType}`, {
    limit: TAMS_PAGE_LIMIT,
    sort_by: capabilities.sortBy ? sortBy : undefined,
    reverse_order: capabilities.sortBy && reverseOrder ? true : undefined,
    collected_by_ids: scoped ? "" : undefined,
    status: capabilities.flowStatus ? status : undefined,
    profile_id: capabilities.profiles ? profileId : undefined,
    init_segments: capabilities.initSegments ? initSegments : undefined,
  });

  const limit = capabilities.sortBy ? maxResults : null;

  const { data, mutate, error, isLoading, isValidating } = useSWR(
    api.endpoint && capabilities.resolved
      ? [api.endpoint, entityType, treeMode ? "tree" : path, limit]
      : null,
    () =>
      treeMode
        ? fetchEntityTree(entityType, api, limit ?? RESULT_PAGE_SIZE)
        : paginationFetcher(path, limit, api),
    { refreshInterval, keepPreviousData: true }
  );

  // Applied client-side as well as through the query so that the scopes still
  // work against stores that do not implement collected_by_ids. Memoised because
  // the filtered array is a dependency of effects in the consuming views.
  const items = useMemo(() => {
    if (!data) return undefined;
    if (viewMode === VIEW_MODE.ALL) return data.items;
    const topLevel = data.items.filter((item) => !item.collected_by?.length);
    if (viewMode === VIEW_MODE.TOP_LEVEL) return topLevel;
    return topLevel.filter(
      (item) => (item[COLLECTION_FIELD[entityType]]?.length ?? 0) > 0
    );
  }, [data, viewMode, entityType]);

  return {
    items,
    hasMore: data?.hasMore ?? false,
    loadedCount: data?.items.length ?? 0,
    capabilities,
    treeMode,
    mutate,
    isLoading: isLoading || !capabilities.resolved,
    isValidating,
    error,
  };
};

export default useEntityListing;
