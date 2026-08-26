import { useApi } from "@/hooks/useApi";
import useSWR from "swr";
import { useCapabilities } from "@/hooks/useService";
import useEntityListing from "@/hooks/useEntityListing";
import buildQuery from "@/utils/buildQuery";
import paginationFetcher from "@/utils/paginationFetcher";
import {
  SOURCES_POLLING_INTERVAL,
  TAMS_PAGE_LIMIT,
  TAMS_POLLING_INTERVAL,
} from "@/constants";

export const useSources = (options = {}) => {
  const { items, ...rest } = useEntityListing("sources", {
    refreshInterval: SOURCES_POLLING_INTERVAL,
    ...options,
  });

  return { sources: items, ...rest };
};

export const useSource = (sourceId) => {
  const api = useApi();
  const {
    data: response,
    mutate,
    error,
    isLoading,
    isValidating,
  } = useSWR(
    api.endpoint ? [api.endpoint, "/sources", sourceId] : null,
    ([, path, id]) => api.get(`${path}/${id}`),
    {
      refreshInterval: TAMS_POLLING_INTERVAL,
    }
  );

  return {
    source: response?.data,
    mutate,
    isLoading,
    isValidating,
    error,
  };
};

export const useSourceFlows = (sourceId) => {
  const api = useApi();
  const {
    data: response,
    mutate,
    error,
    isLoading,
    isValidating,
  } = useSWR(
    api.endpoint ? [api.endpoint, "/flows", sourceId] : null,
    ([, path, id]) => api.get(`${path}?source_id=${id}`),
    {
      refreshInterval: TAMS_POLLING_INTERVAL,
    }
  );

  return {
    flows: response?.data,
    mutate,
    isLoading,
    isValidating,
    error,
  };
};

/**
 * Fetch the Sources or Flows collected by `parentId` in a single request.
 *
 * Needs the 8.2 collected_by_ids filter; without it the caller only has the
 * ids and roles carried in the parent's own collection list.
 */
export const useCollectionMembers = (entityType, parentId) => {
  const api = useApi();
  const { collectedByIds: supported, resolved } = useCapabilities();

  const path = buildQuery(`/${entityType}`, {
    limit: TAMS_PAGE_LIMIT,
    collected_by_ids: parentId,
  });

  const { data, error, isLoading } = useSWR(
    api.endpoint && resolved && supported && parentId
      ? [api.endpoint, "collected-by", path]
      : null,
    () => paginationFetcher(path, TAMS_PAGE_LIMIT, api)
  );

  return {
    members: data?.items,
    supported: supported && resolved,
    isLoading,
    error,
  };
};
