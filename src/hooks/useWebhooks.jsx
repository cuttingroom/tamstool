import { useApi } from "@/hooks/useApi";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

export const useWebhooks = () => {
  const api = useApi();
  const { data: response, mutate, error, isLoading, isValidating } = useSWR(
    api.endpoint ? [api.endpoint, "/webhooks"] : null,
    ([, path]) => api.get(path),
    {
      refreshInterval: 5000,
    }
  );

  return {
    webhooks: response?.data,
    mutate,
    isLoading,
    isValidating,
    error,
  };
};

export const useDeleteWebhook = () => {
  const api = useApi();
  const { trigger, isMutating } = useSWRMutation(
    api.endpoint ? [api.endpoint, "/webhooks"] : null,
    ([, path], { arg }) =>
      api.del(`${path}/${arg.webhookId}`).then((response) => response.data)
  );

  return {
    del: trigger,
    isDeleting: isMutating,
  };
};
