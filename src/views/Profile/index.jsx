import {
  Alert,
  Box,
  Header,
  SpaceBetween,
  Spinner,
  Tabs,
} from "@cloudscape-design/components";
import { useParams } from "react-router-dom";

import EntityDetails from "@/components/EntityDetails";
import EssenceParameters from "@/views/Flow/components/EssenceParameters";
import { useProfile } from "@/hooks/useService";

const Profile = () => {
  const { profileId } = useParams();
  const { profile, supported, isLoading, error } = useProfile(profileId);

  if (!supported) {
    return (
      <Alert type="info" header="Flow Profiles are not available">
        Flow Profiles were introduced in TAMS 8.2. The active store does not
        advertise support for them.
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert type="error" header="Could not load profile">
        Failed to load profile from the active store.
        <Box margin={{ top: "xs" }} color="text-body-secondary" fontSize="body-s">
          {error.message}
        </Box>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Box textAlign="center">
        <Spinner />
      </Box>
    );
  }

  if (!profile) return `No profile found with the id ${profileId}`;

  return (
    <SpaceBetween size="l">
      <Header variant="h2">{profile.label || profile.id}</Header>
      <EntityDetails entityType="profiles" entity={profile} />
      <Tabs
        tabs={[
          {
            label: "Flow metadata",
            id: "flow_metadata",
            content: <EssenceParameters essenceParameters={profile.flow_metadata} />,
          },
        ]}
      />
    </SpaceBetween>
  );
};

export default Profile;
