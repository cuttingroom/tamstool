import { useApi } from "@/hooks/useApi";
import useSWRMutation from "swr/mutation";

export const useUpdate = (entityType, id) => {
  const { put } = useApi();
  const { trigger, isMutating } = useSWRMutation(
    [`/${entityType}`, id],
    ([path, id], { arg }) =>
      put(`${path}/${id}/tags/${arg.name}`, arg.value).then(
        (response) => response.data
      )
  );

  return {
    update: trigger,
    isUpdating: isMutating,
  };
};

export const useDelete = (entityType, id) => {
  const { del } = useApi();
  const { trigger, isMutating } = useSWRMutation(
    [`/${entityType}`, id],
    ([path, id], { arg }) =>
      del(`${path}/${id}/tags/${arg.name}`).then((response) => response.data)
  );

  return {
    del: trigger,
    isDeleting: isMutating,
  };
};

export const useBulkUpdate = (entityType) => {
  const { put } = useApi();
  const { trigger, isMutating } = useSWRMutation(
    [`/tags/bulk-update`, entityType],
    ([path, entityType], { arg }) => {
      const promises = arg.entityIds.map((entityId) =>
        put(
          `/${entityType}/${entityId}/tags/${arg.tagName}`,
          arg.tagValue
        ).then((response) => response.data)
      );

      return Promise.all(promises);
    }
  );

  return {
    bulkUpdate: trigger,
    isBulkUpdating: isMutating,
  };
};

export const useBulkDelete = (entityType) => {
  const { del } = useApi();
  const { trigger, isMutating } = useSWRMutation(
    [`/tags/bulk-delete`, entityType],
    ([path, entityType], { arg }) => {
      const promises = arg.entityIds.map((entityId) =>
        del(`/${entityType}/${entityId}/tags/${arg.tagName}`).then(
          (response) => response.data
        )
      );

      return Promise.all(promises);
    }
  );

  return {
    bulkDelete: trigger,
    isBulkDeleting: isMutating,
  };
};
