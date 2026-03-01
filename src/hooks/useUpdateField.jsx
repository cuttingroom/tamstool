import { useApi } from "@/hooks/useApi";
import useSWRMutation from "swr/mutation";

export const useUpdateField = (entityType, id) => {
  const { put } = useApi();
  const { trigger, isMutating } = useSWRMutation(
    [`/${entityType}`, id],
    ([path, id], { arg }) =>
      put(`${path}/${id}/${arg.field}`, arg.value).then(
        (response) => response.data
      )
  );

  return {
    update: trigger,
    isUpdating: isMutating,
  };
};
