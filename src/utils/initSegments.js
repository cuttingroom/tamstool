import { EMPTY_PATTERNS, TIMERANGE_REGEX } from "@/utils/timerange";

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
  // `== null` so an explicit null still reads as "the store did not say",
  // which is the blank the Flows column reserves for unknown.
  if (declared != null) return Boolean(declared);

  const tag = flow?.tags?.init_segment;
  if (Array.isArray(tag)) return tag.length > 0;
  return Boolean(tag);
};

/**
 * Whether a segment listing entry is the pre-8.2 init object rather than media.
 * Such an entry carries no media, so it is not a segment the user can play.
 *
 * The bounds are read from the string rather than from parseTimerange, which
 * collapses "zero-length", "inverted" and "did not parse" onto the same 0n..0n
 * result — trusting it would badge a segment whose timerange is merely corrupt.
 */
export const isInitSegmentEntry = (segment) => {
  if (segment?.init_object) return false;

  const { timerange } = segment ?? {};
  if (typeof timerange !== "string" || !timerange) return false;
  if (EMPTY_PATTERNS.has(timerange)) return true;

  const match = TIMERANGE_REGEX.exec(timerange);
  if (!match) return false;

  const { startSeconds, startNanos, endSeconds, endNanos } = match.groups;
  const hasStart = startSeconds != null || startNanos != null;
  const hasEnd = endSeconds != null || endNanos != null;
  if (!hasStart) return false;

  // A bare timestamp with no range separator is a single point, so zero-length.
  if (!timerange.includes("_")) return true;
  if (!hasEnd) return false;

  return startSeconds === endSeconds && startNanos === endNanos;
};
