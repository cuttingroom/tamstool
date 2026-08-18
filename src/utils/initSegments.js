import { parseTimerange } from "@/utils/timerange";

/**
 * Two conventions exist for init segments.
 *
 * TAMS 8.2 declares them on the Flow as `essence_parameters.init_segments` and
 * hangs an `init_object` off each segment. Pre-8.2 stores instead name the init
 * object in the `tags.init_segment` Flow tag and list it at the head of the
 * segment listing as an entry with a zero-length timerange.
 */
export const hasInitSegments = (flow) => {
  const declared = flow?.essence_parameters?.init_segments;
  if (declared !== undefined) return Boolean(declared);

  const tag = flow?.tags?.init_segment;
  if (Array.isArray(tag)) return tag.length > 0;
  return Boolean(tag);
};

/**
 * Whether a segment listing entry is the pre-8.2 init object rather than media.
 * Such an entry carries no media, so it is not a segment the user can play.
 */
export const isInitSegmentEntry = (segment) => {
  if (segment?.init_object) return false;

  const { timerange } = segment ?? {};
  if (typeof timerange !== "string" || !timerange) return false;

  const { start, end } = parseTimerange(timerange);
  return start !== null && end !== null && start === end;
};
