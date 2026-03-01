import { useBulkUpdate, useBulkDelete } from "@/hooks/useTags";
import { useApi } from "@/hooks/useApi";
import {
  collectFlowPropagationEntities,
  collectSourcePropagationEntities,
} from "@/utils/tagPropagation";

export const useTagPropagation = () => {
  const { bulkUpdate: bulkUpdateFlows } = useBulkUpdate("flows");
  const { bulkUpdate: bulkUpdateSources } = useBulkUpdate("sources");
  const { bulkDelete: bulkDeleteFlows } = useBulkDelete("flows");
  const { bulkDelete: bulkDeleteSources } = useBulkDelete("sources");
  const { get } = useApi();

  const createApiFunctions = () => ({
    fetchFlow: async (flowId) => {
      const response = await get(`/flows/${flowId}?include_timerange=true`);
      return response.data;
    },
    fetchFlowsBySource: async (sourceId) => {
      const response = await get(`/flows?source_id=${sourceId}`);
      return response.data;
    },
  });

  const propagateTagAction = async (
    entityType,
    entity,
    tagName,
    tagValue,
    action
  ) => {
    const { fetchFlow, fetchFlowsBySource } = createApiFunctions();

    const entities =
      entityType === "flows"
        ? await collectFlowPropagationEntities(entity, fetchFlow)
        : await collectSourcePropagationEntities(
            entity.id,
            fetchFlow,
            fetchFlowsBySource
          );

    const entityGroups = [
      {
        ids: entities.flowIds,
        bulkFn: action === "update" ? bulkUpdateFlows : bulkDeleteFlows,
      },
      {
        ids: entities.sourceIds,
        bulkFn: action === "update" ? bulkUpdateSources : bulkDeleteSources,
      },
    ];

    const promises = entityGroups
      .filter((group) => group.ids.size > 0)
      .map(async (group) => {
        try {
          await group.bulkFn({
            entityIds: Array.from(group.ids),
            tagName,
            ...(action === "update" && { tagValue }),
          });
        } catch (error) {
          // Silently ignore errors during bulk actions
          console.error(error);
        }
      });

    await Promise.all(promises);
  };

  return { propagateTagAction };
};
