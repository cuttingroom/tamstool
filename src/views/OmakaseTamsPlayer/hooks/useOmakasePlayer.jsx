import { useCallback, useEffect, useRef } from "react";
import { OmakaseTamsPlayer as TamsPlayer } from "@byomakase/omakase-tams-player";
import { Subject } from "rxjs";
import {
  createTimelineWithLanes,
  calculateTimerangeFromVideo,
  createAuthenticationConfig,
  snapshotSegmentationLanes,
} from "../utils";

// activeStore drives the TAMS endpoint and the auth config; clientCredentialsToken
// is the pre-fetched bearer token used only for client_credentials auth (the
// player's "custom" headers callback is synchronous so we can't fetch on demand).
export const useOmakasePlayer = ({
  type,
  id,
  activeStore,
  clientCredentialsToken,
  mode,
  segmentationLanes,
  onError,
  onTimerangeChange,
  onSegmentationLaneCreated,
  onMarkerClick,
  onPlayerReady,
  onMediaStartTimeCalculated,
  onFlowsCalculated,
}) => {
  const endpoint = activeStore?.endpoint?.replace(/\/+$/, "") ?? null;
  const authType = activeStore?.authType ?? "none";
  const playerRef = useRef(null);
  const videoDataRef = useRef(null);
  const timelineDestroyRef = useRef(null);
  const callbacks = {
    onError,
    onTimerangeChange,
    onSegmentationLaneCreated,
    onMarkerClick,
    onPlayerReady,
    onMediaStartTimeCalculated,
    onFlowsCalculated,
  };
  const callbacksRef = useRef(callbacks);
  const modeRef = useRef(mode);
  const segmentationLanesRef = useRef(segmentationLanes);
  useEffect(() => {
    callbacksRef.current = callbacks;
    modeRef.current = mode;
    segmentationLanesRef.current = segmentationLanes;
  });

  const swapTimelineDestroy = useCallback(() => {
    timelineDestroyRef.current?.next();
    timelineDestroyRef.current?.complete();
    const next$ = new Subject();
    timelineDestroyRef.current = next$;
    return next$;
  }, []);

  const loadAndBuildTimeline = useCallback(
    (tamsUrl, options) => {
      const player = playerRef.current;
      if (!player) return;

      player.loadVideo(tamsUrl, options).subscribe({
        next: (video) => {
          videoDataRef.current = video;
          const cb = callbacksRef.current;

          const timerangeData = calculateTimerangeFromVideo(video);
          if (timerangeData) {
            cb.onTimerangeChange(
              timerangeData.timerange,
              timerangeData.maxTimerange
            );
          }

          if ("mediaStartTime" in video && video.mediaStartTime !== undefined) {
            cb.onMediaStartTimeCalculated?.(video.mediaStartTime);
          }

          if ("tamsMediaData" in video && video.tamsMediaData?.subflows) {
            cb.onFlowsCalculated?.(video.tamsMediaData.subflows);
          }

          player.timeline?.destroy();
          const destroy$ = swapTimelineDestroy();
          createTimelineWithLanes({
            video,
            player,
            mode: modeRef.current,
            destroy$,
            onSegmentationLaneCreated: cb.onSegmentationLaneCreated,
            onMarkerClick: cb.onMarkerClick,
          });

          cb.onPlayerReady?.(player);
        },
        error: (err) => {
          console.error("Error loading TAMS video:", err);
          callbacksRef.current.onError(err.message || "Failed to load video");
        },
      });
    },
    [swapTimelineDestroy]
  );

  useEffect(() => {
    if (!endpoint || !type || !id) return;
    if (authType === "client_credentials" && !clientCredentialsToken) {
      // wait for the parent component to resolve the bearer token
      return;
    }

    const player = new TamsPlayer({
      playerHTMLElementId: "omakase-video-container",
    });
    playerRef.current = player;

    player.setTamsEndpoint(endpoint);
    const auth = createAuthenticationConfig(activeStore, clientCredentialsToken);
    if (auth) player.setAuthentication(auth);

    const tamsUrl = `${endpoint}/${type}/${id}`;
    loadAndBuildTimeline(tamsUrl, {
      returnTamsMediaData: true,
      duration: 300,
    });

    return () => {
      timelineDestroyRef.current?.next();
      timelineDestroyRef.current?.complete();
      timelineDestroyRef.current = null;
      playerRef.current?.destroy();
      playerRef.current = null;
      videoDataRef.current = null;
    };
  }, [
    type,
    id,
    endpoint,
    authType,
    activeStore,
    clientCredentialsToken,
    loadAndBuildTimeline,
  ]);

  useEffect(() => {
    const player = playerRef.current;
    const video = videoDataRef.current;
    if (!player || !video) return;

    const snapshot = snapshotSegmentationLanes(segmentationLanesRef.current);

    player.timeline?.destroy();
    const destroy$ = swapTimelineDestroy();
    createTimelineWithLanes({
      video,
      player,
      mode,
      destroy$,
      onSegmentationLaneCreated: callbacksRef.current.onSegmentationLaneCreated,
      onMarkerClick: callbacksRef.current.onMarkerClick,
      segmentationSnapshot: snapshot,
    });
  }, [mode, swapTimelineDestroy]);

  const reloadWithTimerange = useCallback(
    (timerange) => {
      if (!type || !id || !endpoint) return;
      const tamsUrl = `${endpoint}/${type}/${id}`;
      loadAndBuildTimeline(tamsUrl, {
        returnTamsMediaData: true,
        timerange,
      });
    },
    [type, id, endpoint, loadAndBuildTimeline]
  );

  return { playerRef, reloadWithTimerange };
};
