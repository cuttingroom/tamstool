import buildQuery from "@/utils/buildQuery";
import paginationFetcher from "@/utils/paginationFetcher";
import { TAMS_PAGE_LIMIT } from "@/constants";

// 40 ids x 37 chars is ~1.5 kB of query string, well inside the 8 kB request
// line that proxies commonly cap at.
const IDS_PER_REQUEST = 40;
// Collections nested deeper than this are not loaded; the caller is told via
// `truncated` so the gap is visible rather than looking like an empty branch.
export const MAX_DEPTH = 4;

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
 * per collection.
 *
 * `maxResults` applies per request, so `items` can exceed it once descendants
 * are included. `truncated` reports that the tree is incomplete, either because
 * the depth cap stopped the descent or because a level had more children than
 * one page.
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
  let childrenTruncated = false;

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

    if (responses.some((response) => response.hasMore)) childrenTruncated = true;

    const fresh = responses
      .flatMap((response) => response.items)
      .filter((item) => !seen.has(item.id));

    fresh.forEach((item) => seen.add(item.id));
    items.push(...fresh);
    frontier = fresh.map((item) => item.id);
  }

  // A non-empty frontier means the depth cap stopped the descent before those
  // items were probed for children. They may be leaves, so this reports "not
  // verified" rather than "definitely more" — the copy is hedged to match.
  const depthUnverified = frontier.length > 0;

  return {
    items,
    hasMore: roots.hasMore || childrenTruncated,
    truncated: depthUnverified || childrenTruncated,
  };
};

export default fetchEntityTree;
