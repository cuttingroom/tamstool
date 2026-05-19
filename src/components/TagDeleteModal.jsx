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
import useAlertsStore from "@/stores/useAlertsStore";

const TagDeleteModal = ({
  modalVisible,
  setModalVisible,
  entityType,
  entity,
  tagName,
  basePath,
}) => {
  const [propagate, setPropagate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { del } = useDelete(entityType, entity.id, basePath);
  const { propagateTagAction } = useTagPropagation();
  const addAlertItem = useAlertsStore((state) => state.addAlertItem);
  const delAlertItem = useAlertsStore((state) => state.delAlertItem);
  const canPropagate = entityType === "flows" || entityType === "sources";

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await del({ name: tagName });
      if (propagate && canPropagate) {
        await propagateTagAction(entityType, entity, tagName, null, "delete");
      }
    } catch (error) {
      const id = crypto.randomUUID();
      addAlertItem({
        type: "error",
        dismissible: true,
        dismissLabel: "Dismiss message",
        content: `Failed to delete tag: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        id,
        onDismiss: () => delAlertItem(id),
      });
    } finally {
      handleDismiss();
    }
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
        {canPropagate && (
          <Checkbox
            checked={propagate}
            onChange={({ detail }) => setPropagate(detail.checked)}
          >
            Propagate
          </Checkbox>
        )}
      </SpaceBetween>
    </Modal>
  );
};

export default TagDeleteModal;
