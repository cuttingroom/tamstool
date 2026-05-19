import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal, TextContent } from "@cloudscape-design/components";
import CancelModalFooter from "@/components/CancelModalFooter";
import useAlertsStore from "@/stores/useAlertsStore";
import { useDelete } from "@/hooks/useWebhooks";

const WebhookDeleteModal = ({
  modalVisible,
  setModalVisible,
  selectedItems,
}) => {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const { del } = useDelete();
  const addAlertItems = useAlertsStore((state) => state.addAlertItems);
  const delAlertItem = useAlertsStore((state) => state.delAlertItem);

  const handleDismiss = () => {
    setIsDeleting(false);
    setModalVisible(false);
    navigate("/webhooks");
  };

  const deleteWebhooks = async () => {
    setIsDeleting(true);
    try {
      await Promise.all(
        selectedItems.map((item) => del({ webhookId: item.id }))
      );
      const id = crypto.randomUUID();
      addAlertItems(
        selectedItems.map((webhook, n) => ({
          type: "success",
          dismissible: true,
          dismissLabel: "Dismiss message",
          content: `Webhook ${webhook.id} is being deleted. This will happen asynchronously`,
          id: `${id}-${n}`,
          onDismiss: () => delAlertItem(`${id}-${n}`),
        }))
      );
    } catch {
      // Alert emitted by useApi
    } finally {
      handleDismiss();
    }
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
