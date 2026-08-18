import {
  Alert,
  Box,
  CollectionPreferences,
  CopyToClipboard,
  Header,
  Pagination,
  Spinner,
  Table,
  TextFilter,
} from "@cloudscape-design/components";
import { Link } from "react-router-dom";
import { useCollection } from "@cloudscape-design/collection-hooks";
import { useProfiles } from "@/hooks/useService";
import usePreferencesStore from "@/stores/usePreferencesStore";
import { PAGE_SIZE_PREFERENCE } from "@/constants";

const columnDefinitions = [
  {
    id: "id",
    header: "Id",
    cell: (item) => (
      <>
        <Link to={`/profiles/${item.id}`}>{item.id}</Link>
        <CopyToClipboard
          copyButtonAriaLabel="Copy Id"
          copyErrorText="Id failed to copy"
          copySuccessText="Id copied"
          textToCopy={item.id}
          variant="icon"
        />
      </>
    ),
    sortingField: "id",
    isRowHeader: true,
    width: 360,
  },
  {
    id: "label",
    header: "Label",
    cell: (item) => item.label,
    sortingField: "label",
  },
  {
    id: "description",
    header: "Description",
    cell: (item) => item.description,
    sortingField: "description",
  },
  {
    id: "format",
    header: "Format",
    cell: (item) => item.flow_metadata?.format,
  },
  {
    id: "codec",
    header: "Codec",
    cell: (item) => item.flow_metadata?.codec,
  },
  {
    id: "container",
    header: "Container",
    cell: (item) => item.flow_metadata?.container,
  },
  {
    id: "created_by",
    header: "Created by",
    cell: (item) => item.created_by,
    sortingField: "created_by",
  },
  {
    id: "created",
    header: "Created",
    cell: (item) => item.created,
    sortingField: "created",
  },
];

const collectionPreferencesProps = {
  pageSizePreference: PAGE_SIZE_PREFERENCE,
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

const Profiles = () => {
  const preferences = usePreferencesStore((state) => state.profilesPreferences);
  const setPreferences = usePreferencesStore(
    (state) => state.setProfilesPreferences
  );
  const { profiles, supported, resolved, detectionFailed, isLoading, error } =
    useProfiles();

  const { items, collectionProps, filterProps, paginationProps } = useCollection(
    isLoading || error ? [] : profiles ?? [],
    {
      filtering: {
        empty: (
          <Box margin={{ vertical: "xs" }} textAlign="center" color="inherit">
            <b>No profiles</b>
          </Box>
        ),
        noMatch: (
          <Box margin={{ vertical: "xs" }} textAlign="center" color="inherit">
            <b>No matches</b>
          </Box>
        ),
      },
      pagination: { pageSize: preferences.pageSize },
      sorting: {
        defaultState: {
          sortingColumn: columnDefinitions.find((col) => col.id === "created"),
          isDescending: true,
        },
      },
    }
  );

  // Until /service answers we do not know whether the store has Profiles, so
  // wait rather than claiming it does not.
  if (!resolved) {
    return (
      <Box textAlign="center">
        <Spinner />
      </Box>
    );
  }

  if (detectionFailed) {
    return (
      <Alert type="warning" header="Could not determine store capabilities">
        Reading <code>/service</code> failed, so Flow Profile support is unknown.
      </Alert>
    );
  }

  if (!supported) {
    return (
      <Alert type="info" header="Flow Profiles are not available">
        Flow Profiles were introduced in TAMS 8.2. The active store does not
        advertise support for them at <code>/service/profiles</code>.
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert type="error" header="Could not load profiles">
        Failed to load profiles from the active store.
        <Box margin={{ top: "xs" }} color="text-body-secondary" fontSize="body-s">
          {error.message}
        </Box>
      </Alert>
    );
  }

  return (
    <Table
      header={
        <Header description="Profiles populate Flow technical metadata and can be used to filter Flow listings.">
          Profiles
        </Header>
      }
      {...collectionProps}
      variant="borderless"
      loadingText="Loading resources"
      loading={isLoading}
      trackBy="id"
      columnDefinitions={columnDefinitions}
      columnDisplay={preferences.contentDisplay}
      contentDensity="compact"
      items={items}
      pagination={<Pagination {...paginationProps} />}
      filter={<TextFilter {...filterProps} />}
      preferences={
        <CollectionPreferences
          {...collectionPreferencesProps}
          preferences={preferences}
          onConfirm={({ detail }) => setPreferences(detail)}
        />
      }
    />
  );
};

export default Profiles;
