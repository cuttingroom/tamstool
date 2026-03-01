const validateJson = (jsonString) => {
  try {
    JSON.parse(jsonString);
    return { isValid: true, error: null };
  } catch (error) {
    // Parse the error message to get line and column information
    const match = error.message.match(/at position (\d+)/);
    const position = match ? parseInt(match[1]) : null;

    // Find the line and column number from the position
    if (position !== null) {
      const lines = jsonString.slice(0, position).split("\n");
      const lineNumber = lines.length;
      const columnNumber = lines[lines.length - 1].length + 1;

      return {
        isValid: false,
        error: {
          message: error.message,
          line: lineNumber,
          column: columnNumber,
          details: `Error on line ${lineNumber}, column ${columnNumber}: ${error.message}`,
        },
      };
    }

    return {
      isValid: false,
      error: {
        message: error.message,
        details: error.message,
      },
    };
  }
};

export default validateJson;
