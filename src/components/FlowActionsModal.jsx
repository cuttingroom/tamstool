import FlowDeleteModal from "@/components/FlowDeleteModal";
import FlowDeleteTimeRangeModal from "@/components/FlowDeleteTimeRangeModal";

const FlowActionsModal = ({
  selectedItems,
  actionId,
  modalVisible,
  setModalVisible,
}) => {
  return {
    delete: (
      <FlowDeleteModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        selectedItems={selectedItems}
      />
    ),
    timerange: (
      <FlowDeleteTimeRangeModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        selectedItems={selectedItems}
      />
    ),
  }[actionId];
};

export default FlowActionsModal;
