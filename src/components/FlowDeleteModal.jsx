import { useState } from "react";
import {
  Box,
  Button,
  Modal,
  SpaceBetween,
  TextContent,
} from "@cloudscape-design/components";
import { useOutcomeAlerts } from "@/stores/useAlertsStore";
import { useDelete } from "@/hooks/useFlows";

const FlowDeleteModal = ({
  modalVisible,
  setModalVisible,
  selectedItems,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { del } = useDelete();
  const reportOutcomes = useOutcomeAlerts();

  const deleteFlow = async () => {
    setIsDeleting(true);
    const results = await Promise.allSettled(
      selectedItems.map((item) => del({ flowId: item.id }))
    );
    reportOutcomes(results, selectedItems, {
      success: (flow) =>
        `Flow ${flow.id} is being deleted. This will happen asynchronously`,
      failure: (flow, reason) => `Failed to delete flow ${flow.id}: ${reason}`,
    });
    setIsDeleting(false);
    setModalVisible(false);
  };

  const handleDismiss = () => {
    setModalVisible(false);
  };

  return (
    <Modal
      onDismiss={handleDismiss}
      visible={modalVisible}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              variant="link"
              disabled={isDeleting}
              onClick={handleDismiss}
            >
              No
            </Button>
            <Button variant="primary" loading={isDeleting} onClick={deleteFlow}>
              Yes
            </Button>
          </SpaceBetween>
        </Box>
      }
      header="Confirmation"
    >
      <TextContent>
        Are you sure you wish to DELETE the selected Flow(s)?
      </TextContent>
    </Modal>
  );
};

export default FlowDeleteModal;
