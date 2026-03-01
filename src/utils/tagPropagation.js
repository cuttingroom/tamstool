export const collectFlowPropagationEntities = async (
  currentFlow,
  fetchFlow
) => {
  const flowIds = new Set();
  const sourceIds = new Set([currentFlow.source_id].filter(Boolean));
  await processFlowChildren(currentFlow, flowIds, sourceIds, fetchFlow);
  return { flowIds, sourceIds };
};

export const collectSourcePropagationEntities = async (
  sourceId,
  fetchFlow,
  fetchFlowsBySource
) => {
  const flowIds = new Set();
  const sourceIds = new Set([sourceId]);
  const flows = await fetchFlowsBySource(sourceId);
  for (const flow of flows || []) {
    flowIds.add(flow.id);
    if (flow.source_id) {
      sourceIds.add(flow.source_id);
    }
    await processFlowChildren(flow, flowIds, sourceIds, fetchFlow);
  }
  return { flowIds, sourceIds };
};

const processFlowChildren = async (flow, flowIds, sourceIds, fetchFlow) => {
  if (!flow.flow_collection || !Array.isArray(flow.flow_collection)) {
    return;
  }
  for (const childRef of flow.flow_collection) {
    if (!childRef.id || flowIds.has(childRef.id)) continue;
    flowIds.add(childRef.id);
    const childFlow = await fetchFlow(childRef.id);
    if (childFlow?.source_id) sourceIds.add(childFlow.source_id);
    if (childFlow)
      await processFlowChildren(childFlow, flowIds, sourceIds, fetchFlow);
  }
};
