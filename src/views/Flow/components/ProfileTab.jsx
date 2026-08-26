import { Box, SpaceBetween, Spinner } from "@cloudscape-design/components";
import { Link } from "react-router-dom";
import EssenceParameters from "./EssenceParameters";
import { useProfile } from "@/hooks/useService";

/**
 * The Flow carries only `profile_id`, so the Profile itself is fetched to show
 * the technical metadata it applied to this Flow.
 */
const ProfileTab = ({ profileId }) => {
  const { profile, supported, resolved, detectionFailed, isLoading, error } =
    useProfile(profileId);

  if (!resolved || isLoading) {
    return (
      <Box textAlign="center">
        <Spinner />
      </Box>
    );
  }

  return (
    <SpaceBetween size="s">
      <Link to={`/profiles/${profileId}`}>
        {profile?.label || profileId}
      </Link>
      {error ? (
        <Box color="text-status-error">
          Could not load profile: {error.message}
        </Box>
      ) : detectionFailed || !supported ? (
        <Box color="text-status-inactive">
          {detectionFailed
            ? "Profile metadata unavailable: could not read the store's capabilities."
            : "This store does not advertise Flow Profiles, so its metadata cannot be shown."}
        </Box>
      ) : (
        <EssenceParameters essenceParameters={profile?.flow_metadata} />
      )}
    </SpaceBetween>
  );
};

export default ProfileTab;
