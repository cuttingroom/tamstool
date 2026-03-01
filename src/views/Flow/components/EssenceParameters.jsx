import { Table } from "@cloudscape-design/components";

const EssenceParameters = ({ essenceParameters }) => {
  const hierarchicalEssenceParameters = essenceParameters
    ? Object.entries(essenceParameters).map(([key, value]) => ({
        key,
        value: typeof value === "object" ? undefined : value,
        children:
          typeof value === "object"
            ? Object.entries(value).map(([childKey, childValue]) => ({
                key: childKey,
                value: childValue,
              }))
            : undefined,
      }))
    : undefined;

  return essenceParameters ? (
    <Table
      trackBy="key"
      variant="borderless"
      columnDefinitions={[
        {
          id: "key",
          header: "Key",
          cell: (item) => item.key,
          isRowHeader: true,
        },
        {
          id: "value",
          header: "Value",
          cell: (item) => item.value,
        },
      ]}
      expandableRows={{
        getItemChildren: (item) => item.children,
        isItemExpandable: (item) => Boolean(item.children),
        expandedItems: hierarchicalEssenceParameters
          .filter((param) => Boolean(param.children))
          .map((param) => ({ key: param.key })),
      }}
      contentDensity="compact"
      items={hierarchicalEssenceParameters}
      sortingDisabled
    />
  ) : (
    "No Essence Parameters"
  );
};

export default EssenceParameters;
