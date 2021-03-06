import { store } from "index";

export const loadingStart = () =>
  store.dispatch({
    type: "LOADING_STARTED",
    data: { loading: true },
  });

export const loadingFinish = () =>
  store.dispatch({
    type: "LOADING_FINISHED",
    data: { loading: false },
  });

export const toggleRepeat = repeat =>
  store.dispatch({
    type: "TOGGLE_REPEAT",
    data: { repeat },
  });

export const playing = () =>
  store.dispatch({
    type: "PLAYING",
  });

export const paused = () =>
  store.dispatch({
    type: "PAUSED",
  });

export const setCurrentTrack = trackIndex =>
  store.dispatch({
    type: "SET_CURRENT_TRACK",
    data: {
      trackIndex,
    },
  });

export const addTracks = tracks =>
  store.dispatch({
    type: "ADD_TRACKS",
    data: {
      tracks,
    },
  });

export const arrangeTracks = playlist =>
  store.dispatch({
    type: "ARRANGE_TRACKS",
    data: {
      playlist,
    },
  });

export const removeTrack = trackIndex =>
  store.dispatch({
    type: "REMOVE_TRACK",
    data: {
      trackIndex,
    },
  });
