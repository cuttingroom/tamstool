import { Box } from "@cloudscape-design/components";

const ValueWithLabel = ({ label, children }) => (
  <>
    <Box variant="awsui-key-label">{label}</Box>
    <>{children}</>
  </>
);

export default ValueWithLabel;
