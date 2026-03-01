import { Link } from "react-router-dom";
import { TextContent } from "@cloudscape-design/components";

const CollectedBy = ({ entityType, collectedBy }) => {
  return collectedBy ? (
    <TextContent>
      <ul>
        {collectedBy.map((item) => (
          <li key={item}>
            <Link to={`/${entityType}/${item}`}>{item}</Link>
          </li>
        ))}
      </ul>
    </TextContent>
  ) : (
    "Not collected by any flow"
  );
};

export default CollectedBy;
