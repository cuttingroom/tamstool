/**
 * Follow TAMS `Link: rel="next"` cursors, accumulating records.
 *
 * Returns `hasMore` so callers can tell a complete result set apart from one
 * truncated by `maxResults` — with 8.2 server-side sorting the first page is
 * usually enough, and the views offer to load further pages on demand.
 */
const paginationFetcher = async (path, maxResults, api) => {
  const { get, endpoint } = api;
  let response = await get(path);
  let records = response.data;

  if (!Array.isArray(records)) {
    throw new Error("Unexpected response from TAMS store");
  }

  while (response.nextLink && (!maxResults || records.length < maxResults)) {
    const nextPath = response.nextLink.slice(endpoint.length);
    response = await get(nextPath);
    if (Array.isArray(response.data)) {
      records = records.concat(response.data);
    }
  }

  const truncated = Boolean(maxResults) && records.length > maxResults;
  const hasMore = Boolean(response.nextLink) || truncated;

  if (maxResults) {
    records = records.slice(0, maxResults);
  }

  // segments_updated changes on every ingested segment. Dropping it from list
  // responses keeps SWR from re-rendering the whole table every poll; views that
  // need ingest recency read it from the flow detail endpoint instead.
  const items = records.map(({ segments_updated, ...remainder }) => remainder);

  return { items, hasMore };
};

export default paginationFetcher;
