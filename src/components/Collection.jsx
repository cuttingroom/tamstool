import { Link } from "react-router-dom";
import { Table } from "@cloudscape-design/components";
import { useCollection } from "@cloudscape-design/collection-hooks";

const Collection = ({ entityType, collection }) => {
  const columnDefinitions = [
    {
      id: "id",
      header: "Id",
      cell: (item) => <Link to={`/${entityType}/${item.id}`}>{item.id}</Link>,
      isRowHeader: true,
      sortingField: "id",
    },
    {
      id: "role",
      header: "Role",
      cell: (item) => item.role,
      sortingField: "role",
    },
  ]

  const { items, collectionProps } = useCollection(
    collection ?? [],
    {
      sorting: {},
    }
  );

  return collection ? (
    <Table
      {...collectionProps}
      trackBy="id"
      variant="borderless"
      columnDefinitions={columnDefinitions}
      contentDensity="compact"
      items={items}
    />
  ) : (
    `No ${entityType} collection(s)`
  );
};

export default Collection;
