import { useState } from "react";
import { ButtonDropdown } from "@cloudscape-design/components";
import WebhookActionsModal from "@/components/WebhookActionsModal";

const WebhookActionsButton = ({ selectedItems }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [actionId, setActionId] = useState("");

  const handleOnClick = ({ detail }) => {
    setActionId(detail.id);
    setModalVisible(true);
  };

  const items = [
    {
      text: "Update",
      id: "update",
      disabled: selectedItems.length !== 1,
    },
    {
      text: "Delete",
      id: "delete",
      disabled: !(selectedItems.length > 0),
    },
  ];

  return (
    <>
      <ButtonDropdown
        onItemClick={handleOnClick}
        disabled={selectedItems.length === 0}
        expandableGroups
        items={items}
      >
        Actions
      </ButtonDropdown>
      <WebhookActionsModal
        selectedItems={selectedItems}
        actionId={actionId}
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
      />
    </>
  );
};

export default WebhookActionsButton;
