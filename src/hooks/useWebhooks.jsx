import { useApi } from "@/hooks/useApi";
import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";
import paginationFetcher from "@/utils/paginationFetcher";
import { TAMS_PAGE_LIMIT, TAMS_POLLING_INTERVAL } from "@/constants";

const listKey = (endpoint) =>
  endpoint ? [endpoint, `/service/webhooks?limit=${TAMS_PAGE_LIMIT}`] : null;

const detailKey = (endpoint, webhookId) =>
  endpoint && webhookId
    ? [endpoint, "/service/webhooks", webhookId]
    : null;

export const useWebhooks = () => {
  const api = useApi();
  const { data, mutate, error, isLoading, isValidating } = useSWR(
    listKey(api.endpoint),
    ([, path]) => paginationFetcher(path, null, api),
    {
      refreshInterval: TAMS_POLLING_INTERVAL,
    }
  );

  return {
    webhooks: data,
    mutate,
    isLoading,
    isValidating,
    error,
  };
};

export const useWebhook = (webhookId) => {
  const api = useApi();
  const {
    data: response,
    mutate,
    error,
    isLoading,
    isValidating,
  } = useSWR(
    detailKey(api.endpoint, webhookId),
    ([, path, id]) => api.get(`${path}/${id}`),
    {
      refreshInterval: TAMS_POLLING_INTERVAL,
    }
  );

  return {
    webhook: response?.data,
    mutate,
    isLoading,
    isValidating,
    error,
  };
};

export const useDelete = () => {
  const api = useApi();
  const { mutate: globalMutate } = useSWRConfig();
  const { trigger, isMutating } = useSWRMutation(
    api.endpoint ? [api.endpoint, "/service/webhooks"] : null,
    ([, path], { arg }) =>
      api.del(`${path}/${arg.webhookId}`).then(
        (response) =>
          // setTimeout used to artificially wait until basic deletes are complete.
          new Promise((resolve) =>
            setTimeout(() => resolve(response.data), 1000)
          )
      ),
    {
      onSuccess: (_, __, { arg }) => {
        globalMutate(listKey(api.endpoint));
        globalMutate(detailKey(api.endpoint, arg.webhookId), undefined, {
          revalidate: false,
        });
      },
    }
  );

  return {
    del: trigger,
    isDeleting: isMutating,
  };
};

export const useRegister = () => {
  const api = useApi();
  const { mutate: globalMutate } = useSWRConfig();
  const { trigger, isMutating } = useSWRMutation(
    api.endpoint ? [api.endpoint, "/service/webhooks"] : null,
    ([, path], { arg }) =>
      api.post(path, arg).then((response) => response.data),
    {
      onSuccess: () => {
        globalMutate(listKey(api.endpoint));
      },
    }
  );

  return {
    register: trigger,
    isRegistering: isMutating,
  };
};

export const useUpdate = () => {
  const api = useApi();
  const { mutate: globalMutate } = useSWRConfig();
  const { trigger, isMutating } = useSWRMutation(
    api.endpoint ? [api.endpoint, "/service/webhooks"] : null,
    ([, path], { arg }) =>
      api.put(`${path}/${arg.id}`, arg).then((response) => response.data),
    {
      onSuccess: (_, __, { arg }) => {
        globalMutate(listKey(api.endpoint));
        globalMutate(detailKey(api.endpoint, arg.id));
      },
    }
  );

  return {
    update: trigger,
    isUpdating: isMutating,
  };
};
