import {
  Button,
  Input,
  SpaceBetween,
  Table,
  TextContent,
} from "@cloudscape-design/components";
import { useCollection } from "@cloudscape-design/collection-hooks";
import { useUpdate } from "@/hooks/useTags";
import TagAddModal from "./TagAddModal";
import TagDeleteModal from "./TagDeleteModal";
import { useState } from "react";

const Tags = ({ entityType, entity }) => {
  const { update } = useUpdate(entityType, entity.id);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionId, setActionId] = useState("");
  const [tagName, setTagName] = useState("");

  const handleAdd = () => {
    setActionId("add");
    setModalVisible(true);
  };

  const handleDelete = (tagKey) => {
    setActionId("delete");
    setTagName(tagKey);
    setModalVisible(true);
  };

  const columnDefinitions = [
    {
      id: "key",
      header: "Key",
      cell: (item) => item.key,
      isRowHeader: true,
      sortingField: "key",
    },
    {
      id: "value",
      header: "Value",
      cell: (item) => item.value,
      sortingField: "value",
      editConfig: {
        editingCell: (item, { currentValue, setValue }) => {
          return (
            <Input
              autoFocus
              value={currentValue ?? item.value}
              onChange={({ detail }) => setValue(detail.value)}
            />
          );
        },
      },
    },
    {
      id: "delete",
      cell: (item) => (
        <Button
          iconName="remove"
          variant="icon"
          onClick={() => handleDelete(item.key)}
        />
      ),
      width: 32,
    },
  ];

  const { items, collectionProps } = useCollection(
    entity.tags
      ? Object.entries(entity.tags).map(([key, value]) => ({ key, value }))
      : [],
    { sorting: {} }
  );

  return (
    <>
      <SpaceBetween size="xs">
        {entity.tags ? (
          <Table
            {...collectionProps}
            trackBy="key"
            variant="borderless"
            columnDefinitions={columnDefinitions}
            contentDensity="compact"
            items={items}
            submitEdit={async (item, _, newValue) => {
              await update({ name: item.key, value: newValue });
            }}
          />
        ) : (
          <TextContent>No tags</TextContent>
        )}
        <Button iconName="add-plus" variant="normal" onClick={handleAdd}>
          Add Tag
        </Button>
      </SpaceBetween>
      {
        {
          add: (
            <TagAddModal
              modalVisible={modalVisible}
              setModalVisible={setModalVisible}
              entityType={entityType}
              entity={entity}
            />
          ),
          delete: (
            <TagDeleteModal
              modalVisible={modalVisible}
              setModalVisible={setModalVisible}
              entityType={entityType}
              entity={entity}
              tagName={tagName}
            />
          ),
        }[actionId]
      }
    </>
  );
};

export default Tags;
