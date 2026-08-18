import { useState } from "react";
import {
  Badge,
  Box,
  CollectionPreferences,
  FormField,
  Select,
  SpaceBetween,
  Table,
} from "@cloudscape-design/components";
import usePreferencesStore from "@/stores/usePreferencesStore";

import { SEGMENT_COUNT, DATE_FORMAT } from "@/constants";
import { parseTimerangeDateTime } from "@/utils/timerange";
import { isInitSegmentEntry } from "@/utils/initSegments";
import { useLastN } from "@/hooks/useSegments";
import { useStorageBackends } from "@/hooks/useService";

const ANY = "__any__";
const ANY_OPTION = { value: ANY, label: "Any" };

const SegmentsTab = ({ flowId }) => {
  const preferences = usePreferencesStore((state) => state.segmentsPreferences);
  const setPreferences = usePreferencesStore((state) => state.setSegmentsPreferences);

  // 8.2 storage_backend_tag filters narrow which storage backends' get_urls are
  // returned. The options come from the tags the store's backends actually carry.
  const { tags: storageTags, supported: supportsStorageTags } = useStorageBackends();
  const [tagName, setTagName] = useState(ANY);
  const [tagValue, setTagValue] = useState(ANY);

  const selectedTag = storageTags.find((tag) => tag.name === tagName);
  const { segments, isLoading: loadingSegments } = useLastN(
    flowId,
    SEGMENT_COUNT,
    tagName === ANY
      ? undefined
      : { name: tagName, value: tagValue === ANY ? undefined : tagValue }
  );

  const columnDefinitions = [
    {
      id: "id",
      header: "Object Id",
      cell: (item) => item.object_id,
      isRowHeader: true,
    },
    {
      id: "timerange",
      header: "Timerange",
      cell: (item) => item.timerange,
    },
    {
      id: "ts_offset",
      header: "TS Offset",
      cell: (item) => item.ts_offset,
    },
    {
      id: "last_duration",
      header: "Last Duration",
      cell: (item) => item.last_duration,
    },
    {
      id: "object_timerange",
      header: "Object Timerange",
      cell: (item) => item.object_timerange,
    },
    {
      id: "init_object",
      header: "Init Object",
      // Pre-8.2 stores have no init_object; they list the init object itself as
      // a zero-length entry, which is easily mistaken for a media segment.
      cell: (item) =>
        item.init_object?.object_id ??
        (isInitSegmentEntry(item) ? <Badge>init segment</Badge> : null),
    },
    {
      id: "sample_offset",
      header: "Sample Offset",
      cell: (item) => item.sample_offset,
    },
    {
      id: "sample_count",
      header: "Sample Count",
      cell: (item) => item.sample_count,
    },
    {
      id: "key_frame_count",
      header: "Key Frame Count",
      cell: (item) => item.key_frame_count,
    },
    {
      id: "timerange_start",
      header: "Timerange Start",
      cell: (item) => item.datetimeTimerange.start?.toLocaleString(DATE_FORMAT),
    },
    {
      id: "timerange_end",
      header: "Timerange End",
      cell: (item) => item.datetimeTimerange.end?.toLocaleString(DATE_FORMAT),
    },
  ];
  const collectionPreferencesProps = {
    contentDisplayPreference: {
      title: "Column preferences",
      description: "Customize the columns visibility and order.",
      options: columnDefinitions.map(({ id, header }) => ({
        id,
        label: header,
        alwaysVisible: id === "id",
      })),
    },
    cancelLabel: "Cancel",
    confirmLabel: "Confirm",
    title: "Preferences",
  };


  return (
    <SpaceBetween size="xs">
      <i>Showing last {SEGMENT_COUNT} segments</i>
      {supportsStorageTags && storageTags.length > 0 && (
        <SpaceBetween size="xs" direction="horizontal" alignItems="end">
          <FormField label="Storage backend tag">
            <Select
              selectedOption={
                tagName === ANY
                  ? ANY_OPTION
                  : { value: tagName, label: tagName }
              }
              onChange={({ detail }) => {
                setTagName(detail.selectedOption.value);
                setTagValue(ANY);
              }}
              options={[
                ANY_OPTION,
                ...storageTags.map((tag) => ({
                  value: tag.name,
                  label: tag.name,
                })),
              ]}
            />
          </FormField>
          <FormField label="Value">
            <Select
              disabled={tagName === ANY}
              selectedOption={
                tagValue === ANY ? ANY_OPTION : { value: tagValue, label: tagValue }
              }
              onChange={({ detail }) => setTagValue(detail.selectedOption.value)}
              options={[
                ANY_OPTION,
                ...(selectedTag?.values ?? []).map((value) => ({
                  value,
                  label: value,
                })),
              ]}
            />
          </FormField>
        </SpaceBetween>
      )}
      <Table
        trackBy="object_id"
        variant="borderless"
        columnDefinitions={columnDefinitions}
        columnDisplay={preferences.contentDisplay}
        contentDensity="compact"
        items={
          segments &&
          segments.map((segment) => ({
            ...segment,
            datetimeTimerange: parseTimerangeDateTime(segment.timerange),
          }))
        }
        sortingDisabled
        loading={loadingSegments}
        loadingText="Loading segments..."
        empty={
          <Box margin={{ vertical: "xs" }} textAlign="center" color="inherit">
            <b>No segments</b>
          </Box>
        }
        preferences={
          <CollectionPreferences
            {...collectionPreferencesProps}
            preferences={preferences}
            onConfirm={({ detail }) => setPreferences(detail)}
          />
        }
      />
    </SpaceBetween>
  );
};

export default SegmentsTab;
