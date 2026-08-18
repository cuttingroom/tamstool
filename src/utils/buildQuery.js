/**
 * Build a TAMS query string. Keys with an `undefined` or `null` value are
 * dropped; an empty string is kept, because TAMS gives it meaning of its own —
 * `collected_by_ids=` selects resources that are in no collection at all.
 */
const buildQuery = (path, params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    search.append(key, typeof value === "boolean" ? String(value) : value);
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export default buildQuery;
