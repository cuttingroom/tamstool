import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal, TextContent } from "@cloudscape-design/components";
import CancelModalFooter from "@/components/CancelModalFooter";
import { useOutcomeAlerts } from "@/stores/useAlertsStore";
import { useDelete } from "@/hooks/useWebhooks";

const WebhookDeleteModal = ({
  modalVisible,
  setModalVisible,
  selectedItems,
}) => {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const { del } = useDelete();
  const reportOutcomes = useOutcomeAlerts();

  const handleDismiss = () => {
    setIsDeleting(false);
    setModalVisible(false);
    navigate("/webhooks");
  };

  const deleteWebhooks = async () => {
    setIsDeleting(true);
    const results = await Promise.allSettled(
      selectedItems.map((item) => del({ webhookId: item.id }))
    );
    reportOutcomes(results, selectedItems, {
      success: (webhook) =>
        `Webhook ${webhook.id} is being deleted. This will happen asynchronously`,
      failure: (webhook, reason) =>
        `Failed to delete webhook ${webhook.id}: ${reason}`,
    });
    handleDismiss();
  };

  return (
    <Modal
      onDismiss={handleDismiss}
      visible={modalVisible}
      footer={
        <CancelModalFooter
          onCancel={handleDismiss}
          onSubmit={deleteWebhooks}
          submitText="Yes"
          submitLoading={isDeleting}
          cancelDisabled={isDeleting}
        />
      }
      header="Confirmation"
    >
      <TextContent>
        Are you sure you wish to DELETE the selected Webhook(s)?
      </TextContent>
    </Modal>
  );
};

export default WebhookDeleteModal;
