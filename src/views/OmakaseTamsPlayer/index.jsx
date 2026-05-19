import "@byomakase/omakase-player/dist/style.css";
import "@byomakase/omakase-react-components/dist/omakase-react-components.css";
import "./style.css";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { Alert, Box, Grid } from "@cloudscape-design/components";
import {
  OmakaseMarkerListComponent,
  TimeRangeUtil,
  OmakasePlayerTimelineControlsToolbar,
  OmakaseTimeRangePicker,
} from "@byomakase/omakase-react-components";
import usePreferencesStore from "@/stores/usePreferencesStore";
import useStoreManager from "@/stores/useStoreManager";
import { useOmakasePlayer } from "./hooks/useOmakasePlayer";
import MarkerListHeader from "./components/MarkerListHeader";
import { renumberSegmentationLanes } from "./utils";
import {
  SEGMENTATION_PERIOD_MARKER_STYLE,
  THEME,
  MARKER_LIST_CONFIG,
  ROW_TEMPLATE_HTML,
  EMPTY_TEMPLATE_HTML,
  HEADER_TEMPLATE_HTML,
  TIME_RANGE_PICKER_CONFIG,
} from "./constants";

const OmakaseTamsPlayer = () => {
  const { type, id } = useParams();
  const activeStore = useStoreManager((s) => s.getActiveStore());
  const mode = usePreferencesStore((s) => s.mode);
  const [error, setError] = useState(null);
  const [tokenError, setTokenError] = useState(null);
  const [clientCredentialsToken, setClientCredentialsToken] = useState(null);
  const [timerange, setTimerange] = useState();
  const [maxTimerange, setMaxTimerange] = useState();
  const [omakasePlayer, setOmakasePlayer] = useState();
  const [segmentationLanes, setSegmentationLanes] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState();
  const [sourceMarkerList, setSourceMarkerList] = useState();
  const [currentSource, setCurrentSource] = useState();
  const [mediaStartTime, setMediaStartTime] = useState(0);
  const [flows, setFlows] = useState([]);
  const segmentationLanesRef = useRef(segmentationLanes);
  const currentSourceRef = useRef(currentSource);

  const authType = activeStore?.authType ?? "none";

  // For client_credentials, the player's "custom" headers callback is sync,
  // so we have to pre-fetch the bearer token. (We could reuse useApi's token
  // cache, but the cache is module-local and not exposed; doing the OAuth
  // call directly is simpler and the token cache will catch up on the next
  // useApi request anyway.)
  useEffect(() => {
    if (authType !== "client_credentials") {
      setClientCredentialsToken(null);
      setTokenError(null);
      return;
    }
    const tokenUrl = activeStore?.tokenUrl;
    const clientId = activeStore?.clientId;
    const clientSecret = activeStore?.clientSecret;
    if (!tokenUrl || !clientId || !clientSecret) {
      setTokenError("Missing OAuth credentials in store config");
      return;
    }
    let cancelled = false;
    setTokenError(null);
    fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: "grant_type=client_credentials",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Token request failed: ${response.status}`);
        }
        const data = await response.json();
        if (!cancelled) setClientCredentialsToken(data.access_token);
      })
      .catch((err) => {
        if (!cancelled) {
          setTokenError(err?.message ?? "Failed to fetch access token");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    authType,
    activeStore?.tokenUrl,
    activeStore?.clientId,
    activeStore?.clientSecret,
  ]);

  const setSelectedMarkerWithSync = useCallback((action) => {
    if (typeof action !== "function" && action) {
      const owning = segmentationLanesRef.current.find((l) =>
        l.getMarker(action.id)
      );
      if (owning) {
        if (owning.getSelectedMarker()?.id !== action.id) {
          owning.toggleMarker(action.id);
        }
        if (currentSourceRef.current?.id !== owning.id) {
          setCurrentSource(owning);
        }
      }
    }
    setSelectedMarker(action);
  }, []);

  const handleSegmentationTabClick = useCallback((lane) => {
    setCurrentSource(lane);
    setSelectedMarker(undefined);
  }, []);

  useEffect(() => {
    segmentationLanesRef.current = segmentationLanes;
    currentSourceRef.current = currentSource;
  }, [segmentationLanes, currentSource]);

  useEffect(() => {
    renumberSegmentationLanes(segmentationLanes);
  }, [segmentationLanes]);

  useEffect(() => {
    segmentationLanes.forEach((lane) => {
      const laneSelected = lane.getSelectedMarker();
      if (laneSelected && laneSelected.id !== selectedMarker?.id) {
        lane.toggleMarker(laneSelected.id);
      }
    });

    if (selectedMarker) {
      const owningLane = segmentationLanes.find((l) =>
        l.getMarker(selectedMarker.id)
      );
      if (
        owningLane &&
        owningLane.getSelectedMarker()?.id !== selectedMarker.id
      ) {
        owningLane.toggleMarker(selectedMarker.id);
      }
    }

    if (sourceMarkerList) {
      const wantId =
        selectedMarker && currentSource?.getMarker(selectedMarker.id)
          ? selectedMarker.id
          : undefined;
      const listSelected = sourceMarkerList.getSelectedMarker();
      if (listSelected && listSelected.id !== wantId) {
        sourceMarkerList.toggleMarker(listSelected.id);
      }
    }
  }, [selectedMarker, segmentationLanes, sourceMarkerList, currentSource]);

  useEffect(() => {
    if (!sourceMarkerList) return;
    const sub = sourceMarkerList.onMarkerClick$.subscribe({
      next: (event) => {
        const marker = currentSourceRef.current?.getMarker(event.marker.id);
        if (marker) setSelectedMarkerWithSync(marker);
      },
    });
    return () => sub.unsubscribe();
  }, [sourceMarkerList, setSelectedMarkerWithSync]);

  useEffect(() => {
    if (!omakasePlayer || !sourceMarkerList || !currentSource) return;

    const labels = [
      "Go to Marker Start ( [ )",
      "Go to Marker End ( ] )",
      "Set Marker Start to Playhead ( i )",
      "Set Marker End to Playhead ( o )",
      "Mark In / Out ( m )",
      "Delete Marker ( n )",
      "Split Marker ( . )",
      "Loop Marker ( p )",
      "Rewind 3s & Play ( Cmd/Win+← )",
      "Play 3s & Rewind ( Cmd/Win+→ )",
    ];

    const panel = document.querySelector(
      ".omakase-tams-player .control-panel-wrapper > .control-panel:first-child"
    );
    if (!panel) return;

    const buttons = panel.querySelectorAll("button");
    buttons.forEach((btn, i) => {
      if (labels[i]) btn.title = labels[i];
    });
  }, [omakasePlayer, sourceMarkerList, currentSource]);

  const toolbarConstants = useMemo(
    () => ({
      PERIOD_MARKER_STYLE: {
        ...SEGMENTATION_PERIOD_MARKER_STYLE,
        color: THEME[mode].colors.segmentationMarker,
      },
      HIGHLIGHTED_PERIOD_MARKER_STYLE: {
        ...SEGMENTATION_PERIOD_MARKER_STYLE,
        color: THEME[mode].colors.segmentationMarkerHighlighted,
      },
      TIMELINE_LANE_STYLE: THEME[mode].timelineLaneStyle,
      MARKER_LANE_TEXT_LABEL_STYLE: THEME[mode].markerLaneTextLabelStyle,
    }),
    [mode]
  );

  const paletteVars = {
    "--omakase-background": THEME[mode].colors.background,
    "--omakase-textFill": THEME[mode].text.fill,
    "--omakase-laneBackground": THEME[mode].colors.laneBackground,
    "--omakase-scrollbarHandle": THEME[mode].colors.scrollbarHandle,
    "--omakase-scrollbarBorder": THEME[mode].colors.scrollbarBorder,
  };

  const handleTimerangeChange = (currentTimerange, maxTimerangeStr) => {
    setTimerange(currentTimerange);
    setMaxTimerange(maxTimerangeStr);
  };

  const handleSegmentationLaneCreated = (lane) => {
    setSegmentationLanes((prev) => {
      const idx = prev.findIndex((l) => l.id === lane.id);
      if (idx < 0) return [...prev, lane];
      const next = [...prev];
      next[idx] = lane;
      return next;
    });
    setCurrentSource((prev) => (!prev || prev.id === lane.id ? lane : prev));
  };

  const { reloadWithTimerange } = useOmakasePlayer({
    type,
    id,
    activeStore,
    clientCredentialsToken,
    mode,
    segmentationLanes,
    onError: setError,
    onTimerangeChange: handleTimerangeChange,
    onSegmentationLaneCreated: handleSegmentationLaneCreated,
    onMarkerClick: setSelectedMarkerWithSync,
    onPlayerReady: setOmakasePlayer,
    onMediaStartTimeCalculated: setMediaStartTime,
    onFlowsCalculated: setFlows,
  });

  const handleTimeRangePickerChange = (start, end) => {
    const startMoment = TimeRangeUtil.secondsToTimeMoment(start);
    const endMoment = TimeRangeUtil.secondsToTimeMoment(end);
    const range = TimeRangeUtil.toTimeRange(startMoment, endMoment, true, false);
    reloadWithTimerange(TimeRangeUtil.formatTimeRangeExpr(range));
  };

  if (!activeStore || !activeStore.endpoint) {
    return (
      <Alert type="info" header="No active store">
        Select a TAMS store first.
      </Alert>
    );
  }

  if (tokenError) {
    return (
      <Alert type="error" header="Authentication failed">
        Could not obtain an access token: {tokenError}
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert type="error" header="Could not load player">
        {error}
      </Alert>
    );
  }

  return (
    <div className="omakase-tams-player" style={paletteVars}>
      <Grid gridDefinition={[{ colspan: 5 }, { colspan: 7 }]}>
        <div id="omakase-marker-list">
          {omakasePlayer && currentSource && (
            <>
              <MarkerListHeader
                segmentationLanes={segmentationLanes}
                source={currentSource}
                sourceMarkerList={sourceMarkerList}
                onSegmentationClickCallback={handleSegmentationTabClick}
                sourceId={id || ""}
                flows={flows}
                markerOffset={mediaStartTime}
                omakasePlayer={omakasePlayer}
                onSegmentationLanesChange={setSegmentationLanes}
              />
              <template
                id="header-template"
                dangerouslySetInnerHTML={{ __html: HEADER_TEMPLATE_HTML }}
              />
              <template
                id="row-template"
                dangerouslySetInnerHTML={{ __html: ROW_TEMPLATE_HTML }}
              />
              <template
                id="empty-template"
                dangerouslySetInnerHTML={{ __html: EMPTY_TEMPLATE_HTML }}
              />
              <OmakaseMarkerListComponent
                omakasePlayer={omakasePlayer}
                config={{
                  ...MARKER_LIST_CONFIG,
                  source: currentSource,
                  mode: "CUTLIST",
                  thumbnailVttFile: omakasePlayer.timeline?.thumbnailVttFile,
                }}
                onCreateMarkerListCallback={setSourceMarkerList}
              />
            </>
          )}
        </div>
        <Box>
          <div id="omakase-video-container" />
          {timerange && maxTimerange && (
            <OmakaseTimeRangePicker
              {...TIME_RANGE_PICKER_CONFIG}
              timeRange={timerange}
              maxTimeRange={maxTimerange}
              onCheckmarkClickCallback={handleTimeRangePickerChange}
            />
          )}
        </Box>
      </Grid>
      <Box>
        {omakasePlayer && sourceMarkerList && currentSource && (
          <OmakasePlayerTimelineControlsToolbar
            selectedMarker={selectedMarker}
            omakasePlayer={omakasePlayer}
            markerListApi={sourceMarkerList}
            setSegmentationLanes={setSegmentationLanes}
            setSelectedMarker={setSelectedMarkerWithSync}
            onMarkerClickCallback={setSelectedMarkerWithSync}
            segmentationLanes={segmentationLanes}
            source={currentSource}
            setSource={setCurrentSource}
            enableHotKeys={true}
            constants={toolbarConstants}
          />
        )}
      </Box>
      <div id="omakase-timeline" />
    </div>
  );
};

export default OmakaseTamsPlayer;
