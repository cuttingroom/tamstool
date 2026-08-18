// TAMS features tamstool uses that were introduced after 8.0. Stores advertise
// their spec level at GET /service as `api_version` (e.g. "8.2"), so we gate on
// that rather than probing each endpoint. Anything we cannot read is treated as
// the 8.0 baseline, which is the behaviour tamstool had before 8.2 support.
export const BASELINE_API_VERSION = "8.0";

export const parseApiVersion = (apiVersion) => {
  if (typeof apiVersion !== "string") return null;
  const match = /^(\d+)\.(\d+)$/.exec(apiVersion.trim());
  return match ? { major: Number(match[1]), minor: Number(match[2]) } : null;
};

export const isAtLeast = (apiVersion, major, minor) => {
  const parsed = parseApiVersion(apiVersion) ?? parseApiVersion(BASELINE_API_VERSION);
  return parsed.major > major || (parsed.major === major && parsed.minor >= minor);
};

export const getCapabilities = (apiVersion) => {
  const has82 = isAtLeast(apiVersion, 8, 2);
  return {
    apiVersion: parseApiVersion(apiVersion) ? apiVersion.trim() : null,
    // 8.2: sort_by / reverse_order on Source and Flow listings
    sortBy: has82,
    // 8.2: collected_by_ids on /sources and /flows (empty value = top-level only)
    collectedByIds: has82,
    // 8.2: flow_status tag promoted to the core Flow `status` attribute
    flowStatus: has82,
    // 8.2: /service/profiles and the profile_id Flow filter
    profiles: has82,
    // 8.2: init_segments Flow attribute and filter
    initSegments: has82,
    // 8.2: storage_backend_tag.{name} filters on segments and objects
    storageBackendTags: has82,
    // 8.2: editorial_purpose tag replaces the now-optional collection role
    editorialPurpose: has82,
  };
};
