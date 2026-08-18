import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Mode } from "@cloudscape-design/global-styles";
import { PAGE_SIZE, VIEW_MODE } from "@/constants";

const DEFAULT_FLOWS_COLUMNS = [
  { id: "id", visible: true },
  { id: "label", visible: true },
  { id: "description", visible: true },
  { id: "format", visible: true },
  { id: "created_by", visible: false },
  { id: "updated_by", visible: false },
  { id: "created", visible: true },
  { id: "status", visible: true },
  { id: "editorial_purpose", visible: false },
  { id: "init_segments", visible: false },
  { id: "profile_id", visible: false },
  { id: "tags", visible: false },
  { id: "flow_collection", visible: false },
  { id: "collected_by", visible: false },
  { id: "source_id", visible: false },
  { id: "metadata_version", visible: false },
  { id: "generation", visible: false },
  { id: "metadata_updated", visible: false },
  { id: "read_only", visible: false },
  { id: "codec", visible: false },
  { id: "container", visible: false },
  { id: "avg_bit_rate", visible: false },
  { id: "max_bit_rate", visible: false },
];

const DEFAULT_SOURCES_COLUMNS = [
  { id: "id", visible: true },
  { id: "label", visible: true },
  { id: "description", visible: true },
  { id: "format", visible: true },
  { id: "created_by", visible: false },
  { id: "updated_by", visible: false },
  { id: "created", visible: true },
  { id: "updated", visible: false },
  { id: "editorial_purpose", visible: false },
  { id: "tags", visible: false },
  { id: "source_collection", visible: false },
  { id: "collected_by", visible: false },
];

const DEFAULT_WEBHOOKS_COLUMNS = [
  { id: "id", visible: true },
  { id: "url", visible: true },
  { id: "api_key_name", visible: false },
  { id: "status", visible: true },
  { id: "events", visible: true },
  { id: "flow_ids", visible: false },
  { id: "source_ids", visible: false },
  { id: "flow_collected_by_ids", visible: false },
  { id: "source_collected_by_ids", visible: false },
  { id: "accept_get_urls", visible: false },
  { id: "accept_storage_ids", visible: false },
  { id: "include_object_timerange", visible: false },
  { id: "presigned", visible: false },
  { id: "verbose_storage", visible: false },
];

const DEFAULT_PROFILES_COLUMNS = [
  { id: "id", visible: true },
  { id: "label", visible: true },
  { id: "description", visible: true },
  { id: "format", visible: true },
  { id: "codec", visible: true },
  { id: "container", visible: false },
  { id: "created_by", visible: false },
  { id: "created", visible: true },
];

const DEFAULT_SEGMENTS_COLUMNS = [
  { id: "id", visible: true },
  { id: "timerange", visible: true },
  { id: "ts_offset", visible: false },
  { id: "last_duration", visible: false },
  { id: "object_timerange", visible: false },
  { id: "init_object", visible: false },
  { id: "sample_offset", visible: false },
  { id: "sample_count", visible: false },
  { id: "key_frame_count", visible: false },
  { id: "timerange_start", visible: true },
  { id: "timerange_end", visible: true },
];

const DEFAULT_FFMPEG_EXPORTS_COLUMNS = [
  { id: "executionArn", visible: true },
  { id: "timerange", visible: true },
  { id: "flowIds", visible: true },
  { id: "command", visible: false },
  { id: "outputFormat", visible: true },
  { id: "output", visible: true },
  { id: "status", visible: true },
  { id: "startDate", visible: false },
  { id: "stopDate", visible: false },
];

const DEFAULT_FFMPEG_JOBS_COLUMNS = [
  { id: "id", visible: true },
  { id: "sourceTimerange", visible: true },
  { id: "command", visible: true },
  { id: "outputFormat", visible: false },
  { id: "outputFlow", visible: true },
  { id: "status", visible: true },
  { id: "startDate", visible: false },
  { id: "stopDate", visible: false },
];

const DEFAULT_COLUMNS_BY_KEY = {
  flowsPreferences: DEFAULT_FLOWS_COLUMNS,
  sourcesPreferences: DEFAULT_SOURCES_COLUMNS,
  webhooksPreferences: DEFAULT_WEBHOOKS_COLUMNS,
  profilesPreferences: DEFAULT_PROFILES_COLUMNS,
  segmentsPreferences: DEFAULT_SEGMENTS_COLUMNS,
  ffmpegExportsPreferences: DEFAULT_FFMPEG_EXPORTS_COLUMNS,
  ffmpegJobsPreferences: DEFAULT_FFMPEG_JOBS_COLUMNS,
};

/**
 * Column preferences are persisted per browser, so columns added by a release
 * are absent from a returning user's stored list and would never appear. Keep
 * the user's order and visibility choices and append whatever is new.
 */
const mergeColumns = (persisted, defaults) => {
  if (!Array.isArray(persisted)) return defaults;
  const known = new Set(persisted.map((column) => column.id));
  return [...persisted, ...defaults.filter((column) => !known.has(column.id))];
};

const migratePreferences = (state) => {
  if (!state) return state;
  const migrated = { ...state };
  Object.entries(DEFAULT_COLUMNS_BY_KEY).forEach(([key, defaults]) => {
    if (!migrated[key]) return;
    migrated[key] = {
      ...migrated[key],
      contentDisplay: mergeColumns(migrated[key].contentDisplay, defaults),
    };
  });
  return migrated;
};

const usePreferencesStore = create(
  persist(
    (set) => ({
      mode: Mode.Dark,
      setMode: (mode) => set({ mode }),

      flowsShowHierarchy: true,
      setFlowsShowHierarchy: (hierarchy) =>
        set({ flowsShowHierarchy: hierarchy }),

      sourcesShowHierarchy: true,
      setSourcesShowHierarchy: (hierarchy) =>
        set({ sourcesShowHierarchy: hierarchy }),

      sourcesViewMode: VIEW_MODE.ALL,
      setSourcesViewMode: (viewMode) => set({ sourcesViewMode: viewMode }),

      flowsViewMode: VIEW_MODE.ALL,
      setFlowsViewMode: (viewMode) => set({ flowsViewMode: viewMode }),

      flowsPreferences: {
        pageSize: PAGE_SIZE,
        contentDisplay: DEFAULT_FLOWS_COLUMNS,
      },
      setFlowsPreferences: (preferences) =>
        set({ flowsPreferences: preferences }),

      sourcesPreferences: {
        pageSize: PAGE_SIZE,
        contentDisplay: DEFAULT_SOURCES_COLUMNS,
      },
      setSourcesPreferences: (preferences) =>
        set({ sourcesPreferences: preferences }),

      webhooksPreferences: {
        pageSize: PAGE_SIZE,
        contentDisplay: DEFAULT_WEBHOOKS_COLUMNS,
      },
      setWebhooksPreferences: (preferences) =>
        set({ webhooksPreferences: preferences }),

      profilesPreferences: {
        pageSize: PAGE_SIZE,
        contentDisplay: DEFAULT_PROFILES_COLUMNS,
      },
      setProfilesPreferences: (preferences) =>
        set({ profilesPreferences: preferences }),

      segmentsPreferences: {
        contentDisplay: DEFAULT_SEGMENTS_COLUMNS,
      },
      setSegmentsPreferences: (preferences) =>
        set({ segmentsPreferences: preferences }),

      ffmpegExportsPreferences: {
        pageSize: PAGE_SIZE,
        contentDisplay: DEFAULT_FFMPEG_EXPORTS_COLUMNS,
      },
      setFfmpegExportsPreferences: (preferences) =>
        set({ ffmpegExportsPreferences: preferences }),

      ffmpegJobsPreferences: {
        pageSize: PAGE_SIZE,
        contentDisplay: DEFAULT_FFMPEG_JOBS_COLUMNS,
      },
      setFfmpegJobsPreferences: (preferences) =>
        set({ ffmpegJobsPreferences: preferences }),
    }),
    {
      name: "tams-ui-preferences",
      version: 1,
      migrate: migratePreferences,
    }
  )
);

export default usePreferencesStore;
