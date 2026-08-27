import { useState } from "react";
import {
  Box,
  Button,
  FormField,
  Input,
  Modal,
  SpaceBetween,
} from "@cloudscape-design/components";
import { useOutcomeAlerts } from "@/stores/useAlertsStore";
import { useDeleteTimerange } from "@/hooks/useFlows";

const FlowDeleteTimeRangeModal = ({
  modalVisible,
  setModalVisible,
  selectedItems,
}) => {
  const { delTimerange, isDeletingTimerange } = useDeleteTimerange();
  const reportOutcomes = useOutcomeAlerts();
  const [timerange, setTimerange] = useState("");

  const deleteTimerange = async () => {
    const results = await Promise.allSettled(
      selectedItems.map((item) => delTimerange({ flowId: item.id, timerange }))
    );
    const allSucceeded = reportOutcomes(results, selectedItems, {
      success: (flow) =>
        `Flow segments on flow ${flow.id} within the timerange ${timerange} are being deleted. This will happen asynchronously.`,
      failure: (flow, reason) =>
        `Failed to delete segments on flow ${flow.id} within the timerange ${timerange}: ${reason}`,
    });
    setModalVisible(false);
    // Kept on failure so the timerange is still there to retry with.
    if (allSucceeded) setTimerange("");
  };

  const handleDismiss = () => {
    setModalVisible(false);
    setTimerange("");
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
              disabled={isDeletingTimerange}
              onClick={handleDismiss}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={isDeletingTimerange}
              onClick={deleteTimerange}
            >
              Delete
            </Button>
          </SpaceBetween>
        </Box>
      }
      header="Confirmation"
    >
      <FormField
        description="Provide a timerange for the segments to be deleted."
        label="Timerange"
      >
        <Input
          value={timerange}
          onChange={({ detail }) => {
            setTimerange(detail.value);
          }}
        />
      </FormField>
    </Modal>
  );
};

export default FlowDeleteTimeRangeModal;
