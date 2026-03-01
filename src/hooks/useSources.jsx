import { useApi } from "@/hooks/useApi";
import useSWR from "swr";
import paginationFetcher from "@/utils/paginationFetcher";

export const useSources = () => {
  const api = useApi();
  const { data, mutate, error, isLoading, isValidating } = useSWR(
    api.endpoint ? [api.endpoint, "/sources?limit=300"] : null,
    ([, path]) => paginationFetcher(path, null, api),
    {
      refreshInterval: 3000,
    }
  );

  return {
    sources: data,
    mutate,
    isLoading,
    isValidating,
    error,
  };
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
    ([, path, sourceId]) => api.get(`${path}/${sourceId}`),
    {
      refreshInterval: 3000,
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
    ([, path, sourceId]) => api.get(`${path}?source_id=${sourceId}`),
    {
      refreshInterval: 3000,
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
