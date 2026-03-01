import { useState } from "react";
import { ButtonDropdown } from "@cloudscape-design/components";
import FlowActionsModal from "@/components/FlowActionsModal";

const FlowActionsButton = ({ selectedItems }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [actionId, setActionId] = useState("");

  const handleOnClick = ({ detail }) => {
    setActionId(detail.id);
    setModalVisible(true);
  };

  const items = [
    {
      text: "Delete",
      id: "delete",
      disabled: !(selectedItems.length > 0),
    },
    {
      text: "Timerange delete",
      id: "timerange",
      disabled: !(selectedItems.length > 0),
    },
  ];

  return (
    <>
      <ButtonDropdown
        onItemClick={handleOnClick}
        disabled={selectedItems.length === 0}
        items={items}
      >
        Actions
      </ButtonDropdown>
      <FlowActionsModal
        selectedItems={selectedItems}
        actionId={actionId}
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
      />
    </>
  );
};

export default FlowActionsButton;
