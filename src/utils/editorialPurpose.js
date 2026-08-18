// TAMS 8.2 makes the collection `role` optional and points clients at the
// `editorial_purpose` tag instead (AppNote0025). Values are freeform, but the
// app note publishes a recommended list; these are the ones tamstool reasons
// about when it has to pick a Flow or Source out of a collection itself.
export const EDITORIAL_PURPOSE = {
  PROGRAMME: "programme",
  PROGRAMME_SIGNED: "programme_signed",
  CLEANFEED: "cleanfeed",
  PRIMARY: "primary",
};

// Preference order when looking for the main video of a multi-Source.
const VIDEO_PURPOSES = [
  EDITORIAL_PURPOSE.PROGRAMME,
  EDITORIAL_PURPOSE.CLEANFEED,
  EDITORIAL_PURPOSE.PROGRAMME_SIGNED,
];

export const VIDEO_FORMAT = "urn:x-nmos:format:video";

/** Read the editorial_purpose tag from a Source or Flow. */
export const getEditorialPurpose = (entity) => {
  const tag = entity?.tags?.editorial_purpose;
  if (typeof tag === "string" && tag) return tag;
  if (Array.isArray(tag)) return tag[0] ?? null;
  return null;
};

/**
 * Describe a collected entity in the terms the store actually gave us:
 * the 8.2 editorial_purpose tag where present, otherwise the legacy role.
 */
export const describeCollectionMember = (member, entity) =>
  getEditorialPurpose(entity) ?? member?.role ?? null;

/**
 * Pick the video entity from a set of collected Sources or Flows.
 *
 * `role === "video"` is checked first because it needs no extra request, but
 * 8.2 stores may omit `role` entirely, so fall back to the editorial_purpose
 * tag and finally to the NMOS video format.
 */
export const findVideoMember = (collection = [], entitiesById = new Map()) => {
  const byRole = collection.find((member) => member?.role === "video");
  if (byRole) return byRole.id;

  for (const purpose of VIDEO_PURPOSES) {
    const match = collection.find(
      (member) => getEditorialPurpose(entitiesById.get(member.id)) === purpose
    );
    if (match) return match.id;
  }

  const byFormat = collection.find(
    (member) => entitiesById.get(member.id)?.format === VIDEO_FORMAT
  );
  return byFormat?.id ?? null;
};
