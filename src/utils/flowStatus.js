// TAMS 8.2 promotes the `flow_status` tag to a core Flow `status` attribute.
export const FLOW_STATUS = {
  AWAITING_CONTENT: "awaiting_content",
  INGESTING: "ingesting",
  REPLICATION_IN_PROGRESS: "replication_in_progress",
  CLOSED_COMPLETE: "closed_complete",
};

export const FLOW_STATUS_VALUES = Object.values(FLOW_STATUS);

// An ingest that dies without closing its Flow leaves `status` reading
// "ingesting" forever, so recent segment activity is still required before we
// present a Flow as live.
export const GROWING_STALE_MS = 10 * 60 * 1000;

/**
 * Read a Flow's status, preferring the 8.2 attribute and falling back to the
 * deprecated tag for 8.0/8.1 stores and for clients that have not migrated.
 * The tag is a freeform string or a list of strings.
 */
export const getFlowStatus = (flow) => {
  if (typeof flow?.status === "string" && flow.status) return flow.status;

  const tag = flow?.tags?.flow_status;
  if (typeof tag === "string" && tag) return tag;
  if (Array.isArray(tag)) {
    return FLOW_STATUS_VALUES.find((value) => tag.includes(value)) ?? tag[0] ?? null;
  }
  return null;
};

/**
 * Whether a Flow is actively receiving content. The spec is explicit that
 * `status` is client-maintained and therefore indicative rather than
 * authoritative, so an ingesting Flow that has not moved recently is treated as
 * abandoned.
 *
 * `segments_updated` is the only field that measures ingest activity, so where
 * it is absent the reported status is taken at face value rather than guessed
 * at from `created` — a long-running ingest is not a stale one. Note that
 * paginationFetcher strips `segments_updated`, so a Flow from a listing always
 * takes the face-value path; pass a Flow from the detail endpoint where the
 * distinction matters.
 */
export const isFlowGrowing = (flow, now = Date.now()) => {
  const status = getFlowStatus(flow);
  if (status === FLOW_STATUS.CLOSED_COMPLETE) return false;
  if (
    status !== FLOW_STATUS.INGESTING &&
    status !== FLOW_STATUS.REPLICATION_IN_PROGRESS
  ) {
    return false;
  }

  const lastActivity = flow?.segments_updated;
  if (!lastActivity) return true;

  const timestamp = new Date(lastActivity).getTime();
  if (Number.isNaN(timestamp)) return true;
  return now - timestamp < GROWING_STALE_MS;
};

export const isFlowClosed = (flow) =>
  getFlowStatus(flow) === FLOW_STATUS.CLOSED_COMPLETE;
