import {
  Alert,
  Box,
  Button,
  SpaceBetween,
  Spinner,
  TextContent,
} from "@cloudscape-design/components";
import { useNavigate, useParams } from "react-router-dom";
import { useRef, useState } from "react";

import CytoscapeComponent from "react-cytoscapejs";
import Legend from "./components/Legend";
import { buildStylesheet } from "./constants.js";
import { getElements } from "./utils";
import { useEffect } from "react";
import { useApi } from "@/hooks/useApi";

const Diagram = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const cyRef = useRef();
  const [elements, setElements] = useState([]);
  const [error, setError] = useState(null);
  const api = useApi();

  useEffect(() => {
    const loadData = async () => {
      setError(null);
      try {
        const elems = await getElements(api, `/${type}/${id}`);
        setElements(elems);
        cyRef.current?.fit();
      } catch (err) {
        setError(err);
      }
    };
    loadData();

    return () => cyRef.current?.removeAllListeners();
  }, [type, id, api]);

  const handleZoom = (action) => {
    const zoom = cyRef.current?.zoom();
    const { x1, x2, y1, y2 } = cyRef.current?.extent();
    const level = action === "in" ? zoom * 1.2 : zoom / 1.2;
    cyRef.current?.zoom({
      level,
      position: { x: (x2 - x1) / 2 + x1, y: (y2 - y1) / 2 + y1 },
    });
  };

  if (error) {
    return (
      <Alert type="error" header="Could not connect to TAMS store">
        Failed to load diagram data from the active store. Check that the endpoint URL is correct and the store is reachable.
        <Box margin={{ top: "xs" }} color="text-body-secondary" fontSize="body-s">
          {error.message}
        </Box>
      </Alert>
    );
  }

  return (
    <SpaceBetween size="xs">
      <Box>
        {elements.length > 0 ? (
          <SpaceBetween size="xs">
            <SpaceBetween direction="horizontal" size="xs" alignItems="center">
              <Button
                iconName="zoom-in"
                variant="inline-icon"
                ariaLabel="zoom in"
                onClick={() => handleZoom("in")}
              />
              <Button
                iconName="zoom-out"
                variant="inline-icon"
                ariaLabel="zoom out"
                onClick={() => handleZoom("out")}
              />
              <Button
                iconName="zoom-to-fit"
                variant="inline-icon"
                ariaLabel="zoom to fit"
                onClick={() => cyRef.current?.fit()}
              />
            </SpaceBetween>
            <CytoscapeComponent
              elements={elements}
              style={{
                width: "100%",
                height: "66vh",
              }}
              stylesheet={buildStylesheet()}
              wheelSensitivity={0.1}
              cy={(cy) => {
                cyRef.current = cy;

                cy.on("dbltap", "node", ({ target }) => {
                  navigate(`/${target.id()}`);
                });

                cy.on("resize", () => {
                  cy.fit();
                });
              }}
            />
            <TextContent>
              <small>(Double-click on an entity to view details)</small>
            </TextContent>
            <hr />
            <Legend />
          </SpaceBetween>
        ) : (
          <Box textAlign="center">
            <Spinner size="large" />
          </Box>
        )}
      </Box>
    </SpaceBetween>
  );
};

export default Diagram;
