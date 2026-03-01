import {
  ColumnLayout,
  SpaceBetween,
  CopyToClipboard,
} from "@cloudscape-design/components";

import { Link } from "react-router-dom";
import ValueWithLabel from "@/components/ValueWithLabel";
import EditableField from "@/components/EditableField";
import { DATE_FORMAT } from "@/constants";
import chunkArray from "@/utils/chunkArray";
import { parseTimerangeDateTime } from "@/utils/timerange";

const excludedFields = [
  "source_collection",
  "flow_collection",
  "collected_by",
  "essence_parameters",
  "tags",
];

const editableFields = ["label", "description"];

const EntityDetails = ({ entityType, entity }) => {
  if (!entity) return null;

  const processEntityData = (entity) => {
    const filteredEntity = Object.entries(entity).filter(
      ([key]) => !excludedFields.includes(key)
    );

    // Separate primitive and object values
    const keyValues = filteredEntity.filter(
      ([key, value]) => typeof value !== "object" && key !== "timerange"
    );

    // Add stringified object values
    filteredEntity
      .filter(([, value]) => typeof value === "object")
      .forEach(([key, value]) => keyValues.push([key, JSON.stringify(value)]));

    // Add timerange fields
    if (entity.timerange) {
      keyValues.push(["timerange", entity.timerange]);
      if (entity.timerange !== "()") {
        const { start, end } = parseTimerangeDateTime(entity.timerange);
        keyValues.push(
          ["timerange_start", start?.toLocaleString(DATE_FORMAT)],
          ["timerange_end", end?.toLocaleString(DATE_FORMAT)]
        );
      }
    }

    return keyValues;
  };

  const renderFieldValue = (label, value) => {
    if (editableFields.includes(label)) {
      return (
        <EditableField
          entityType={entityType}
          entityId={entity.id}
          field={label}
          value={value}
        >
          {value}
        </EditableField>
      );
    }

    // Handle special cases
    if (label === "source_id") {
      return <Link to={`/sources/${value}`}>{value}</Link>;
    }

    if (typeof value === "boolean") {
      return value.toString();
    }

    return (
      <>
        {value}
        {label === "id" && (
          <CopyToClipboard
            copyButtonAriaLabel="Copy Id"
            copyErrorText="Id failed to copy"
            copySuccessText="Id copied"
            textToCopy={value}
            variant="icon"
          />
        )}
      </>
    );
  };

  const keyValues = processEntityData(entity);
  const keyValueColumns = chunkArray(keyValues, 2);

  return (
    <ColumnLayout columns={2} variant="text-grid">
      {keyValueColumns.map((chunk, index) => (
        <SpaceBetween key={index} size="l">
          {chunk.map(([label, value]) => (
            <ValueWithLabel key={label} label={label}>
              {renderFieldValue(label, value)}
            </ValueWithLabel>
          ))}
        </SpaceBetween>
      ))}
    </ColumnLayout>
  );
};

export default EntityDetails;
