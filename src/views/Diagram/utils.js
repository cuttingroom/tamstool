import { formatPrecedence, nodeSize } from "./constants";
import { TAMS_PAGE_LIMIT } from "@/constants";

/**
 * Fetch every Source or Flow collected by `id` in one request and seed them into
 * the prefetch cache, so the traversal below can walk the collection without a
 * request per member. Needs the TAMS 8.2 collected_by_ids filter.
 */
const prefetchCollection = async (api, entityType, id, prefetched) => {
  try {
    const { data } = await api.get(
      `/${entityType}?collected_by_ids=${id}&limit=${TAMS_PAGE_LIMIT}`
    );
    if (!Array.isArray(data)) return;
    data.forEach((entity) =>
      prefetched.set(`/${entityType}/${entity.id}`, entity)
    );
  } catch {
    // Fall back to fetching members individually.
  }
};

const getEntities = async (
  api,
  path,
  graph = {},
  canQueryCollections = false,
  prefetched = new Map()
) => {
  // If we've already processed this path, return
  if (graph[path]) return graph;

  // Fetch current path data, unless a collection query already returned it
  let resp = prefetched.get(path);
  if (!resp) {
    ({ data: resp } = await api.get(path));
  }
  graph[path] = resp;

  // Collect all promises for parallel execution
  const promises = [];

  if (resp.source_id) {
    const sourcePath = `/sources/${resp.source_id}`;
    if (!graph[sourcePath]) {
      promises.push(
        getEntities(api, sourcePath, graph, canQueryCollections, prefetched)
      );
    }
  } else {
    // Handle source flows in parallel
    const { data: source_flows } = await api.get(`/flows?source_id=${resp.id}`);
    if (Array.isArray(source_flows)) {
      source_flows.forEach((flow) => {
        const flowPath = `/flows/${flow.id}`;
        graph[flowPath] = flow;
      });
    }
  }

  // Handle collected_by
  if (Array.isArray(resp.collected_by)) {
    const type = resp.source_id ? "flows" : "sources";
    const collectedPromises = resp.collected_by
      .filter((collection) => !graph[`/${type}/${collection}`])
      .map((collection) =>
        getEntities(
          api,
          `/${type}/${collection}`,
          graph,
          canQueryCollections,
          prefetched
        )
      );
    promises.push(...collectedPromises);
  }

  // Handle flow collections
  if (Array.isArray(resp.flow_collection) && resp.flow_collection.length > 0) {
    if (canQueryCollections) {
      await prefetchCollection(api, "flows", resp.id, prefetched);
    }
    const flowPromises = resp.flow_collection
      .filter((collection) => !graph[`/flows/${collection.id}`])
      .map((collection) =>
        getEntities(
          api,
          `/flows/${collection.id}`,
          graph,
          canQueryCollections,
          prefetched
        )
      );
    promises.push(...flowPromises);
  }

  // Handle source collections
  if (Array.isArray(resp.source_collection) && resp.source_collection.length > 0) {
    if (canQueryCollections) {
      await prefetchCollection(api, "sources", resp.id, prefetched);
    }
    const sourcePromises = resp.source_collection
      .filter((collection) => !graph[`/sources/${collection.id}`])
      .map((collection) =>
        getEntities(
          api,
          `/sources/${collection.id}`,
          graph,
          canQueryCollections,
          prefetched
        )
      );
    promises.push(...sourcePromises);
  }

  // Wait for all recursive calls to complete
  await Promise.all(promises);

  return graph;
};

const getPositions = (entities) => {
  const nodeSpacing = {
    horizontal: 30,
    vertical: 15,
  };
  const rows = [
    entities
      .filter(
        (elem) => !elem.source_id && elem.format === "urn:x-nmos:format:multi"
      )
      .map((elem) => elem.id),
    formatPrecedence
      .map((format) =>
        entities
          .filter((elem) => !elem.source_id && elem.format === format)
          .map((elem) => elem.id)
      )
      .flat(),
    entities
      .filter(
        (elem) => elem.source_id && elem.format === "urn:x-nmos:format:multi"
      )
      .map((elem) => elem.id),
    formatPrecedence
      .map((format) =>
        entities
          .filter((elem) => elem.source_id && elem.format === format)
          .map((elem) => elem.id)
      )
      .flat(),
  ];
  const rowLength = Math.max(...rows.map((row) => row.length));
  return Object.fromEntries(
    rows.flatMap((row, y) =>
      row.map((id, x) => [
        id,
        {
          x:
            (nodeSize.width + nodeSpacing.horizontal) *
            ((rowLength - row.length) / 2 + x),
          y: (nodeSize.height + nodeSpacing.vertical) * y,
        },
      ])
    )
  );
};

export const getElements = async (api, path, canQueryCollections = false) => {
  // Get a list of all Sources and Flows related to the input entity.
  const entities = await getEntities(api, path, {}, canQueryCollections).then(
    (graph) => Object.values(graph)
  );
  const positions = getPositions(entities);

  // Create a lookup to allow translation of flowId -> sourceId
  const flowSourceMap = Object.fromEntries(
    entities
      .filter((elem) => elem.source_id)
      .map((flow) => [flow.id, flow.source_id])
  );

  // Create list of Elements representing the nodes alone
  const nodes = entities.map((node) => {
    const type = node.source_id ? "flow" : "source";
    const formatType = node.format?.split(":")[3] ?? "unknown";
    const classes = [type, formatType];
    if (node.container) classes.push("container");
    return {
      data: {
        id: `${type}s/${node.id}`,
        label: `${type.toUpperCase()} (${formatType})\n\nid: ${
          node.id
        }\n\ndesc: ${node.description}\n\nlabel: ${node.label}`,
      },
      selectable: false,
      selected: node.id == path.split("/")[2],
      classes,
      position: positions[node.id],
    };
  });

  // Create list of elements representing the collects relationships, either for Flows or Sources
  const collectsEdges = entities
    .filter((elem) => elem.source_id)
    .flatMap((flow) =>
      flow.flow_collection?.flatMap((col) => [
        {
          data: {
            source: `flows/${flow.id}`,
            target: `flows/${col.id}`,
            id: `${flow.id}|${col.id}`,
          },
          classes: ["collects"],
        },
        {
          data: {
            source: `sources/${flowSourceMap[flow.id]}`,
            target: `sources/${flowSourceMap[col.id]}`,
            id: `${flowSourceMap[flow.id]}|${flowSourceMap[col.id]}`,
          },
          classes: ["collects", "implied"],
        },
      ])
    )
    .filter((elem) => elem)
    .filter(
      (value, index, self) =>
        index === self.findIndex((t) => t.data.id === value.data.id)
    );

  // Create list of elements representing the represents relationships
  const representsEdges = entities
    .filter((elem) => elem.source_id)
    .map((flow) => ({
      data: {
        source: `flows/${flow.id}`,
        target: `sources/${flow.source_id}`,
        id: `${flow.id}|${flow.source_id}`,
      },
      classes: ["represents"],
    }));

  // return combined list of all elements
  return [...nodes, ...collectsEdges, ...representsEdges];
};

export default getElements;
