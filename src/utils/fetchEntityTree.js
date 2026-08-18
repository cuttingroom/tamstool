import buildQuery from "@/utils/buildQuery";
import paginationFetcher from "@/utils/paginationFetcher";
import { TAMS_PAGE_LIMIT } from "@/constants";

// Keep collected_by_ids URLs to a sane length — each id is 36 characters.
const IDS_PER_REQUEST = 40;
const MAX_DEPTH = 4;

const batchIds = (ids, size) => {
  const batches = [];
  for (let index = 0; index < ids.length; index += size) {
    batches.push(ids.slice(index, index + size));
  }
  return batches;
};

/**
 * Load a Source or Flow collection tree using the 8.2 `collected_by_ids` filter.
 *
 * Starts from the top-level entities (`collected_by_ids=` selects those in no
 * collection) and descends one level at a time, asking for every id at that
 * level in a single request. Cloudscape only renders an expand control for rows
 * whose children are already in the item set, so the tree is fetched by depth
 * rather than on expand — that is still a handful of requests instead of one
 * per collection, and unlike the previous client-side tree it is correct across
 * page boundaries.
 */
const fetchEntityTree = async (entityType, api, maxResults = TAMS_PAGE_LIMIT) => {
  const rootPath = buildQuery(`/${entityType}`, {
    limit: TAMS_PAGE_LIMIT,
    collected_by_ids: "",
  });
  const roots = await paginationFetcher(rootPath, maxResults, api);

  const items = [...roots.items];
  const seen = new Set(items.map((item) => item.id));
  let frontier = items.map((item) => item.id);

  for (let depth = 0; depth < MAX_DEPTH && frontier.length > 0; depth += 1) {
    const batches = batchIds(frontier, IDS_PER_REQUEST);
    const responses = await Promise.all(
      batches.map((batch) =>
        paginationFetcher(
          buildQuery(`/${entityType}`, {
            limit: TAMS_PAGE_LIMIT,
            collected_by_ids: batch.join(","),
          }),
          maxResults,
          api
        )
      )
    );

    const fresh = responses
      .flatMap((response) => response.items)
      .filter((item) => !seen.has(item.id));

    fresh.forEach((item) => seen.add(item.id));
    items.push(...fresh);
    frontier = fresh.map((item) => item.id);
  }

  return { items, hasMore: roots.hasMore };
};

export default fetchEntityTree;
