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

const TagAddModal = ({ modalVisible, setModalVisible, entityType, entity }) => {
  const [tagName, setTagName] = useState("");
  const [tagValue, setTagValue] = useState("");
  const [propagate, setPropagate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { update } = useUpdate(entityType, entity.id);
  const { propagateTagAction } = useTagPropagation();

  const handleConfirm = async () => {
    setIsLoading(true);
    await update({ name: tagName, value: tagValue });
    if (propagate) {
      await propagateTagAction(entityType, entity, tagName, tagValue, "update");
    }
    handleDismiss();
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

export default TagAddModal;
