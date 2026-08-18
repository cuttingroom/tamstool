import { useApi } from "@/hooks/useApi";
import useSWR from "swr";
import buildQuery from "@/utils/buildQuery";
import paginationFetcher from "@/utils/paginationFetcher";
import { useCapabilities } from "@/hooks/useService";
import { TAMS_POLLING_INTERVAL } from "@/constants";

/**
 * 8.2 lets clients narrow the get_urls returned for a Segment to storage
 * backends carrying a given tag. `{ name, value }` filters on the value;
 * `{ name }` alone filters on the tag being present.
 */
const storageBackendTagParams = (storageBackendTag, supported) => {
  if (!supported || !storageBackendTag?.name) return {};
  const { name, value } = storageBackendTag;
  return value
    ? { [`storage_backend_tag.${name}`]: value }
    : { [`storage_backend_tag_exists.${name}`]: true };
};

export const useLastN = (flowId, n, storageBackendTag) => {
  const api = useApi();
  const { storageBackendTags, resolved } = useCapabilities();

  const path = buildQuery(`/flows/${flowId}/segments`, {
    accept_get_urls: "",
    reverse_order: true,
    include_object_timerange: true,
    ...storageBackendTagParams(storageBackendTag, storageBackendTags),
  });

  const { data, mutate, error, isLoading, isValidating } = useSWR(
    api.endpoint && resolved ? [api.endpoint, path, n] : null,
    () => paginationFetcher(path, n, api),
    {
      refreshInterval: TAMS_POLLING_INTERVAL,
    }
  );

  return {
    segments: data?.items,
    mutate,
    isLoading,
    isValidating,
    error,
  };
};

export const useSegments = (flowId, timerange, maxResults = 3000) => {
  const api = useApi();
  const path = buildQuery(`/flows/${flowId}/segments`, {
    timerange: timerange || undefined,
    reverse_order: false,
    limit: 300,
  });

  const { data, mutate, error, isLoading, isValidating } = useSWR(
    [`/flows/${flowId}/segments`, path, maxResults],
    () => paginationFetcher(path, maxResults, api)
  );

  return {
    segments: data?.items,
    mutate,
    isLoading,
    isValidating,
    error,
  };
};

export const useFlowsSegments = (flows, timerange, maxResults = 3000) => {
  const api = useApi();
  const params = timerange
    ? `?timerange=${timerange}&reverse_order=false&limit=300`
    : `?reverse_order=false&limit=300`;

  const { data, mutate, error, isLoading, isValidating } = useSWR(
    flows?.length > 0
      ? flows.map((flow) => `/flows/${flow.id}/segments${params}`)
      : null,
    async (paths) => {
      const responses = await Promise.all(
        paths.map((path) => paginationFetcher(path, maxResults, api))
      );
      return responses.map((response) => response.items);
    }
  );

  return {
    segments: data,
    mutate,
    isLoading,
    isValidating,
    error,
  };
};
