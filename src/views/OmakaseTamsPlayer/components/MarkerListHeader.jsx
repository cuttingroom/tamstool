import { useState, useCallback, useSyncExternalStore } from "react";
import { Tabs } from "@cloudscape-design/components";
import { PeriodMarker } from "@byomakase/omakase-player";
import DeleteModal from "./DeleteModal";
import { segmentationNameFor } from "../utils";

const MarkerListHeader = ({
  segmentationLanes,
  source,
  onSegmentationClickCallback,
  flows,
  omakasePlayer,
  onSegmentationLanesChange,
}) => {
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [laneToDelete, setLaneToDelete] = useState(null);

  // Subscribed for parity with upstream (used by the Export button in v4.2).
  // Kept here so future Export-via-TAMS-API work can reuse it.
  const subscribeToMarkerChanges = useCallback(
    (onChange) => {
      if (!source) return () => {};
      const subs = [
        source.onMarkerCreate$.subscribe({ next: onChange }),
        source.onMarkerUpdate$.subscribe({ next: onChange }),
        source.onMarkerDelete$.subscribe({ next: onChange }),
      ];
      return () => subs.forEach((s) => s.unsubscribe());
    },
    [source]
  );

  const getHasValidMarker = useCallback(() => {
    if (!source) return false;
    return source
      .getMarkers()
      .some(
        (m) =>
          m instanceof PeriodMarker &&
          m.timeObservation.start != null &&
          m.timeObservation.end != null
      );
  }, [source]);

  useSyncExternalStore(subscribeToMarkerChanges, getHasValidMarker);

  const handleDismissTab = (laneId) => {
    setLaneToDelete(laneId);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = () => {
    if (!laneToDelete || !onSegmentationLanesChange) return;
    if (omakasePlayer.timeline) {
      omakasePlayer.timeline.removeTimelineLane(laneToDelete);
    }
    const newLanes = segmentationLanes.filter((l) => l.id !== laneToDelete);
    onSegmentationLanesChange(newLanes);
    if (source?.id === laneToDelete && newLanes.length > 0) {
      onSegmentationClickCallback(newLanes[0]);
    }
    setLaneToDelete(null);
  };

  const hasVideoFlow = flows.some(
    (flow) => flow.format === "urn:x-nmos:format:video"
  );

  if (!source || !hasVideoFlow) {
    return null;
  }

  const labelForLane = (lane) =>
    segmentationNameFor(segmentationLanes.indexOf(lane));

  const deleteModalLaneName = laneToDelete
    ? (() => {
        const lane = segmentationLanes.find((l) => l.id === laneToDelete);
        return lane ? labelForLane(lane) : "";
      })()
    : "";

  return (
    <>
      <Tabs
        disableContentPaddings
        activeTabId={source.id}
        onChange={({ detail }) => {
          const lane = segmentationLanes.find(
            (l) => l.id === detail.activeTabId
          );
          if (lane) onSegmentationClickCallback(lane);
        }}
        tabs={segmentationLanes.map((lane) => {
          const label = labelForLane(lane);
          return {
            id: lane.id,
            label,
            dismissible: segmentationLanes.length > 1,
            dismissLabel: `Remove ${label}`,
            onDismiss: () => handleDismissTab(lane.id),
            content: null,
          };
        })}
      />

      <DeleteModal
        modalVisible={deleteModalVisible}
        setModalVisible={setDeleteModalVisible}
        laneName={deleteModalLaneName}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

export default MarkerListHeader;
