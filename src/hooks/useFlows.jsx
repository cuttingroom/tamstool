import { useApi } from "@/hooks/useApi";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import useEntityListing from "@/hooks/useEntityListing";
import { useCapabilities } from "@/hooks/useService";
import buildQuery from "@/utils/buildQuery";
import paginationFetcher from "@/utils/paginationFetcher";
import { FLOW_STATUS } from "@/utils/flowStatus";
import { TAMS_PAGE_LIMIT, TAMS_POLLING_INTERVAL } from "@/constants";

export const useFlows = (options = {}) => {
  const { items, ...rest } = useEntityListing("flows", {
    refreshInterval: TAMS_POLLING_INTERVAL,
    ...options,
  });

  return { flows: items, ...rest };
};

export const useFlowsBySource = (sourceId) => {
  const api = useApi();
  const path = sourceId ? `/flows?source_id=${sourceId}` : null;

  const { data, mutate, error, isLoading, isValidating } = useSWR(
    api.endpoint && path ? [api.endpoint, path] : null,
    ([, requestPath]) => paginationFetcher(requestPath, null, api),
    {
      refreshInterval: TAMS_POLLING_INTERVAL,
    }
  );

  return {
    flows: data?.items,
    mutate,
    isLoading,
    isValidating,
    error,
  };
};

/**
 * Flows currently receiving content, via the 8.2 `status` filter.
 *
 * Returns `supported: false` on older stores, where the caller has to fall back
 * to inspecting the deprecated flow_status tag on each Flow it already holds.
 */
export const useIngestingFlows = (enabled = true) => {
  const api = useApi();
  const { flowStatus: supported, resolved } = useCapabilities();

  const path = buildQuery("/flows", {
    limit: TAMS_PAGE_LIMIT,
    status: FLOW_STATUS.INGESTING,
  });

  const { data, error, isLoading } = useSWR(
    api.endpoint && resolved && supported && enabled
      ? [api.endpoint, "ingesting", path]
      : null,
    () => paginationFetcher(path, TAMS_PAGE_LIMIT, api),
    { refreshInterval: TAMS_POLLING_INTERVAL }
  );

  return {
    flows: data?.items,
    supported: supported && resolved,
    isLoading,
    error,
  };
};

export const useFlow = (flowId) => {
  const api = useApi();
  const {
    data: response,
    mutate,
    error,
    isLoading,
    isValidating,
  } = useSWR(
    api.endpoint ? [api.endpoint, "/flows", flowId] : null,
    ([, path, id]) => api.get(`${path}/${id}?include_timerange=true`),
    {
      refreshInterval: TAMS_POLLING_INTERVAL,
    }
  );

  return {
    flow: response?.data,
    mutate,
    isLoading,
    isValidating,
    error,
  };
};

export const useDelete = () => {
  const api = useApi();
  const { trigger, isMutating } = useSWRMutation(
    api.endpoint ? [api.endpoint, "/flows"] : null,
    ([, path], { arg }) =>
      api.del(`${path}/${arg.flowId}`).then((response) =>
        new Promise(resolve => setTimeout(() => resolve(response.data), 1000))
      ) // setTimeout used to artificially wait until basic deletes are complete.
  );

  return {
    del: trigger,
    isDeleting: isMutating,
  };
};

export const useDeleteTimerange = () => {
  const api = useApi();
  const { trigger, isMutating } = useSWRMutation(
    api.endpoint ? [api.endpoint, "/flows"] : null,
    ([, path], { arg }) =>
      api.del(`${path}/${arg.flowId}/segments?timerange=${arg.timerange}`).then(
        (response) => response.data
      )
  );

  return {
    delTimerange: trigger,
    isDeletingTimerange: isMutating,
  };
};
