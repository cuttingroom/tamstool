import {
  Button,
  SpaceBetween,
} from "@cloudscape-design/components";
import { useNavigate } from "react-router-dom";
import FlowActionsButton from "@/components/FlowActionsButton";

const EntityHeader = ({ type, entity }) => {
  const entityType = `${type.toLowerCase()}s`;
  const navigate = useNavigate();

  const followLink = (e) => {
    e.preventDefault();
    navigate(e.detail.href);
  };

  return (
    <SpaceBetween size="xl" direction="horizontal">
      <span>{type} details</span>
      <Button
        href={`/player/${entityType}/${entity.id}`}
        variant="inline-link"
        onFollow={followLink}
      >
        View Player
      </Button>
      <Button
        href={`/diagram/${entityType}/${entity.id}`}
        variant="inline-link"
        onFollow={followLink}
      >
        View Diagram
      </Button>
      {entityType === "flows" && (
        <FlowActionsButton selectedItems={[entity]} />
      )}
    </SpaceBetween>
  );
};

export default EntityHeader;
