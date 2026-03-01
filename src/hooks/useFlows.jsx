import { useApi } from "@/hooks/useApi";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import paginationFetcher from "@/utils/paginationFetcher";

const useFlowsQuery = (url) => {
  const api = useApi();
  const { data, mutate, error, isLoading, isValidating } = useSWR(
    api.endpoint && url ? [api.endpoint, url] : null,
    ([, path]) => paginationFetcher(path, null, api),
    {
      refreshInterval: 3000,
    }
  );

  return {
    flows: data,
    mutate,
    isLoading,
    isValidating,
    error,
  };
};

export const useFlows = () => useFlowsQuery("/flows?limit=300");

export const useFlowsBySource = (sourceId) =>
  useFlowsQuery(sourceId ? `/flows?source_id=${sourceId}` : null);

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
    ([, path, flowId]) => api.get(`${path}/${flowId}?include_timerange=true`),
    {
      refreshInterval: 3000,
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

export const useFlowStatusTag = () => {
  const api = useApi();
  const { trigger, isMutating } = useSWRMutation(
    api.endpoint ? [api.endpoint, "/flows"] : null,
    ([, path], { arg }) =>
      api.put(`${path}/${arg.flowId}/tags/flow_status`, arg.status).then(
        (response) => response.data
      )
  );

  return {
    update: trigger,
    isUpdating: isMutating,
  };
};
