import { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormField,
  Input,
  Modal,
  SpaceBetween,
} from "@cloudscape-design/components";
import { useUpdate } from "@/hooks/useTags";
import { useTagPropagation } from "@/hooks/useTagPropagation";
import useAlertsStore from "@/stores/useAlertsStore";

const TagAddModal = ({
  modalVisible,
  setModalVisible,
  entityType,
  entity,
  basePath,
}) => {
  const [tagName, setTagName] = useState("");
  const [tagValue, setTagValue] = useState("");
  const [propagate, setPropagate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { update } = useUpdate(entityType, entity.id, basePath);
  const { propagateTagAction } = useTagPropagation();
  const addAlertItem = useAlertsStore((state) => state.addAlertItem);
  const delAlertItem = useAlertsStore((state) => state.delAlertItem);
  const canPropagate = entityType === "flows" || entityType === "sources";

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await update({
        name: tagName,
        value: tagValue.includes(",")
          ? tagValue.split(",").map((s) => s.trim())
          : tagValue,
      });
      if (propagate && canPropagate) {
        await propagateTagAction(
          entityType,
          entity,
          tagName,
          tagValue,
          "update"
        );
      }
    } catch (error) {
      const id = crypto.randomUUID();
      addAlertItem({
        type: "error",
        dismissible: true,
        dismissLabel: "Dismiss message",
        content: `Failed to add tag: ${
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
    setTagName("");
    setTagValue("");
    setPropagate(false);
    setIsLoading(false);
    setModalVisible(false);
  };

  return (
    <Modal
      onDismiss={handleDismiss}
      visible={modalVisible}
      header="Add tag"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" disabled={isLoading} onClick={handleDismiss}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={isLoading}
              onClick={handleConfirm}
            >
              Add
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="xs">
        <FormField description="Provide a name for the tag." label="Name">
          <Input
            value={tagName}
            onChange={({ detail }) => setTagName(detail.value)}
          />
        </FormField>
        <FormField description="Provide a value for the tag." label="Value">
          <Input
            value={tagValue}
            onChange={({ detail }) => setTagValue(detail.value)}
          />
        </FormField>
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

export default TagAddModal;
