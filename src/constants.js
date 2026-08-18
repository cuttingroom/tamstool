import { FLOW_STATUS } from "@/utils/flowStatus";

export const PAGE_SIZE = 20;
export const PAGE_SIZE_PREFERENCE = {
  title: "Select page size",
  options: [
    { value: 10, label: "10 resources" },
    { value: 20, label: "20 resources" },
    { value: 50, label: "50 resources" },
    { value: 100, label: "100 resources" },
  ],
};
export const TAMS_PAGE_LIMIT = 300;
export const TAMS_POLLING_INTERVAL = 3000;
export const SOURCES_POLLING_INTERVAL = 5000;
export const SEGMENT_COUNT = 30;

// How many records the listing views hold before offering to load more. Only
// meaningful on stores that sort server-side; older stores still fetch in full.
export const RESULT_PAGE_SIZE = TAMS_PAGE_LIMIT;

export const WEBHOOK_STATUS_MAPPINGS = {
  created: { type: "pending" },
  started: { type: "in-progress", colorOverride: "green" },
  disabled: { type: "stopped", colorOverride: "yellow" },
  error: { type: "error" },
};

export const FLOW_STATUS_MAPPINGS = {
  [FLOW_STATUS.AWAITING_CONTENT]: { type: "pending" },
  [FLOW_STATUS.INGESTING]: { type: "in-progress", colorOverride: "green" },
  [FLOW_STATUS.REPLICATION_IN_PROGRESS]: {
    type: "in-progress",
    colorOverride: "blue",
  },
  [FLOW_STATUS.CLOSED_COMPLETE]: { type: "success" },
};

// Listing scopes offered where the store supports the collected_by_ids filter.
export const VIEW_MODE = {
  ALL: "all",
  TOP_LEVEL: "top_level",
  MULTI_ONLY: "multi_only",
};

export const DATE_FORMAT = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
};
export const CONTAINER_FILE_EXTENSION = {
  MP4: "mp4",
  M2TS: "ts",
};
