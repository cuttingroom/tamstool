import "./TamsVersion.css";

// Colour carried the "unreachable" vs "advertises no version" distinction while
// this was a Badge; without it the two states need to differ in wording.
const versionLabel = (apiVersion, detectionFailed) => {
  if (detectionFailed) return "unreachable";
  return apiVersion || "version unknown";
};

/**
 * The store's TAMS API version, with the official mono lockup standing in for
 * the word "TAMS". A span, not a div: SideNavigation renders its header inside
 * a span, where only phrasing content is valid.
 */
const TamsVersion = ({ apiVersion, detectionFailed }) => (
  <span className="tams-version">
    <span className="tams-version__lockup" role="img" aria-label="TAMS" />
    {versionLabel(apiVersion, detectionFailed)}
  </span>
);

export default TamsVersion;
