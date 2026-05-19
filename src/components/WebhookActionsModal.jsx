import WebhookRegisterUpdateModal from "@/components/WebhookRegisterUpdateModal";
import WebhookDeleteModal from "@/components/WebhookDeleteModal";

const WebhookActionsModal = ({
  selectedItems,
  actionId,
  modalVisible,
  setModalVisible,
}) => {
  return {
    update: (
      <WebhookRegisterUpdateModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        webhook={selectedItems[0]}
      />
    ),
    delete: (
      <WebhookDeleteModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        selectedItems={selectedItems}
      />
    ),
  }[actionId];
};

export default WebhookActionsModal;
