import { KeyValuePairs } from "@cloudscape-design/components";

const ErrorTab = ({ error }) => {
  return (
    <KeyValuePairs
      columns={1}
      items={[
        { label: "Time", value: error.time },
        { label: "Type", value: error.type },
        { label: "Summary", value: error.summary },
        {
          label: "Traceback",
          value: error.traceback && (
            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
              {error.traceback.join("\n")}
            </pre>
          ),
        },
      ]}
    />
  );
};

export default ErrorTab;
