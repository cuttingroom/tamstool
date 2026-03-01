import { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Modal,
  SpaceBetween,
  TextContent,
} from "@cloudscape-design/components";
import { useDelete } from "@/hooks/useTags";
import { useTagPropagation } from "@/hooks/useTagPropagation";

const TagDeleteModal = ({
  modalVisible,
  setModalVisible,
  entityType,
  entity,
  tagName,
}) => {
  const [propagate, setPropagate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { del } = useDelete(entityType, entity.id);
  const { propagateTagAction } = useTagPropagation();

  const handleConfirm = async () => {
    setIsLoading(true);
    await del({ name: tagName });
    if (propagate) {
      await propagateTagAction(entityType, entity, tagName, null, "delete");
    }
    handleDismiss();
  };

  const handleDismiss = () => {
    setPropagate(false);
    setIsLoading(false);
    setModalVisible(false);
  };

  return (
    <Modal
      onDismiss={handleDismiss}
      visible={modalVisible}
      header="Delete tag"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" disabled={isLoading} onClick={handleDismiss}>
              No
            </Button>
            <Button
              variant="primary"
              loading={isLoading}
              onClick={handleConfirm}
            >
              Yes
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="xs">
        <TextContent>
          Are you sure you wish to delete the {tagName} tag?
        </TextContent>
        <Checkbox
          checked={propagate}
          onChange={({ detail }) => setPropagate(detail.checked)}
        >
          Propagate
        </Checkbox>
      </SpaceBetween>
    </Modal>
  );
};

export default TagDeleteModal;
