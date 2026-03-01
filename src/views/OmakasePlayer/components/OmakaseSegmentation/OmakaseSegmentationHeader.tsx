import {
  MarkerLane,
  MarkerListApi,
  OmakasePlayer,
  PeriodMarker,
} from "@byomakase/omakase-player";
import React from "react";
import { PopUpIcon } from "../../icons/PopUpIcon";
import "./OmakaseSegmentationHeader.css";
import { Flow, FlowSegment } from "@byomakase/omakase-react-components";

type OmakaseSegmentationHeaderProps = {
  segmentationLanes: MarkerLane[];
  source: MarkerLane | undefined;
  sourceMarkerList: MarkerListApi | undefined;
  onSegementationClickCallback: (markerLane: MarkerLane) => void;
  sourceId: string;
  flows: Flow[];
  flowSegments: Map<string, FlowSegment[]>;
  markerOffset: number;
  omakasePlayer: OmakasePlayer;
};

const OmakaseSegmentationHeader = ({
  segmentationLanes,
  source,
  onSegementationClickCallback,
}: OmakaseSegmentationHeaderProps) => {
  const segmentationNamesClassName =
    segmentationLanes.length < 3
      ? "segmentation-names"
      : "segmentation-names segmentation-names-smaller";

  const segmentationHeaderClassName =
    segmentationLanes.length > 1
      ? "segmentation-header"
      : "segmentation-header segmentation-header-export-only";

  return (
    <div className={segmentationHeaderClassName}>
      {segmentationLanes.length > 1 && (
        <div className={segmentationNamesClassName}>
          {segmentationLanes.map((lane) => (
            <div
              className={
                source?.id === lane.id ? "highlighted-segmentation" : ""
              }
              key={lane.id}
              onClick={() => onSegementationClickCallback(lane)}
            >
              {lane.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OmakaseSegmentationHeader;
