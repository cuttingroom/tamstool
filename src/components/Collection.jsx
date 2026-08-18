import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Box, Table } from "@cloudscape-design/components";
import { useCollectionMembers } from "@/hooks/useSources";
import { getEditorialPurpose } from "@/utils/editorialPurpose";

/**
 * A Source or Flow collection.
 *
 * TAMS 8.2 made the collection `role` optional in favour of the collected
 * entity's `editorial_purpose` tag, and requires the order of the collection to
 * be preserved — so the rows are rendered in the order the store returned them
 * rather than sorted, and `role` is only shown where a store still sets it.
 *
 * Where the store supports `collected_by_ids` the collected entities are
 * fetched in a single request, which is what makes the label, format and
 * editorial purpose columns possible at all.
 */
const Collection = ({ entityType, collection, parentId }) => {
  // Only worth a request when there is actually a collection to describe.
  const { members } = useCollectionMembers(
    entityType,
    collection?.length ? parentId : null
  );

  const membersById = useMemo(
    () => new Map((members ?? []).map((member) => [member.id, member])),
    [members]
  );

  const items = useMemo(
    () =>
      (collection ?? []).map((item) => {
        const entity = membersById.get(item.id);
        return {
          ...item,
          label: entity?.label,
          format: entity?.format,
          editorial_purpose: getEditorialPurpose(entity),
        };
      }),
    [collection, membersById]
  );

  const hasRole = items.some((item) => item.role !== undefined);

  const columnDefinitions = [
    {
      id: "id",
      header: "Id",
      cell: (item) => <Link to={`/${entityType}/${item.id}`}>{item.id}</Link>,
      isRowHeader: true,
    },
    {
      id: "label",
      header: "Label",
      cell: (item) => item.label,
    },
    {
      id: "editorial_purpose",
      header: "Editorial purpose",
      cell: (item) => item.editorial_purpose,
    },
    {
      id: "format",
      header: "Format",
      cell: (item) => item.format,
    },
    ...(hasRole
      ? [
          {
            id: "role",
            header: "Role",
            cell: (item) => item.role,
          },
        ]
      : []),
  ];

  if (!collection) return `No ${entityType} collection(s)`;

  return (
    <Table
      trackBy="id"
      variant="borderless"
      columnDefinitions={columnDefinitions}
      contentDensity="compact"
      items={items}
      sortingDisabled
      empty={
        <Box margin={{ vertical: "xs" }} textAlign="center" color="inherit">
          <b>Empty collection</b>
        </Box>
      }
    />
  );
};

export default Collection;
