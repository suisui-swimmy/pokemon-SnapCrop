(() => {
  const CSV_PATH = "./data/pokemon-reference.csv";
  const AUTO_TEMPLATE_PATHS = {
    loading: "./assets/auto/loading-indicator.png",
    selectionTimer: "./assets/auto/selection-timer-icon.png",
    waitingTimer: "./assets/auto/waiting-timer-icon.png",
  };
  const STORAGE_KEYS = {
    my: "pokemon-snapcrop.my-crop",
    enemy: "pokemon-snapcrop.enemy-crop",
    terminalHeight: "pokemon-snapcrop.terminal-height",
    workspacePaneLeftWidth: "pokemon-snapcrop.workspace-pane-left-width",
    workspacePaneRightWidth: "pokemon-snapcrop.workspace-pane-right-width",
    videoDevice: "pokemon-snapcrop.video-device",
    audioDevice: "pokemon-snapcrop.audio-device",
    audioVolume: "pokemon-snapcrop.audio-volume",
    theme: "pokemon-snapcrop.theme",
  };
  const THEMES = {
    dark: "dark",
    light: "light",
  };
  const CROP_SIDES = ["my", "enemy"];
  const REQUIRED_HEADERS = [
    "ポケモン名",
    "タイプ1",
    "タイプ2",
    "H",
    "A",
    "B",
    "C",
    "D",
    "S",
    "とくせい1",
    "とくせい2",
    "とくせい3",
  ];
  const ASPECT_16_BY_9 = 16 / 9;
  const ASPECT_4_BY_3 = 4 / 3;
  const ASPECT_TOLERANCE = 0.02;
  const MOBILE_LAYOUT_MEDIA_QUERY = "(max-width: 1080px)";
  const WORKSPACE_PANE_MIN_WIDTH = 0;
  const WORKSPACE_CENTER_MIN_WIDTH = 280;
  const WORKSPACE_PANE_COLLAPSE_THRESHOLD = 18;
  const TERMINAL_FOCUS_RETURN_GRACE_MS = 180;
  const TERMINAL_MIN_WORKSPACE_HEIGHT = 220;
  const TERMINAL_COMPACT_VERTICAL_PADDING = 6;
  const TERMINAL_COMPACT_BUFFER = 16;
  const TERMINAL_RESIZE_STEP_FALLBACK = 18;
  const TERMINAL_AUTOSCROLL_THRESHOLD_PX = 16;
  const TERMINAL_SUGGESTION_MAX_ITEMS = 5;
  const TERMINAL_GHOST_MIN_SCORE_GAP = 120;
  const TERMINAL_COMMAND_TOKENS = new Set([
    "edit",
    "ready",
    "snap",
    "auto",
    "debug",
    "layout",
    "status",
    "help",
    "clear",
    "cls",
    "crop",
    "e",
    "r",
    "s",
    "sm",
    "se",
    "cr",
  ]);
  const PANEL_CLICK_INTERACTIVE_SELECTOR = [
    "a[href]",
    "button",
    "input",
    "label",
    "option",
    "select",
    "summary",
    "textarea",
    "[contenteditable='true']",
  ].join(", ");
  const FIXED_16_BY_9_CROP_RATIOS = {
    my: {
      x: 295 / 1920,
      y: 96 / 1080,
      width: 299 / 1920,
      height: 807 / 1080,
    },
    enemy: {
      x: 1326 / 1920,
      y: 96 / 1080,
      width: 299 / 1920,
      height: 807 / 1080,
    },
  };
  const STREAM_PROFILES = [
    { width: { exact: 1920 }, height: { exact: 1080 } },
    { width: { exact: 1280 }, height: { exact: 720 } },
    { width: { ideal: 1920 }, height: { ideal: 1080 }, aspectRatio: { ideal: ASPECT_16_BY_9 } },
    {},
  ];
  const AUTO_SNAP_CONFIG = {
    enabledByDefault: true,
    stableFrames: {
      loading: 1,
      selection: 1,
      locked: 2,
    },
    timeoutsMs: {
      loadingToSelection: 6000,
    },
    detectorSampleMaxWidth: 72,
    detectorSampleMinHeight: 28,
    detectorSampleMaxHeight: 160,
    thresholds: {
      loadingTemplate: {
        brightThreshold: 92,
        coverageMin: 0.72,
        spillMax: 0.18,
        darkBackgroundMin: 0.34,
      },
      selectionTimerIcon: {
        brightThreshold: 82,
        coverageMin: 0.72,
        spillMax: 0.28,
        darkBackgroundMin: 0.35,
      },
      locked: {
        badgeWhiteMin: 0.06,
        barBrightMin: 0.22,
        barBlueMin: 0.28,
      },
      waitingTimerIcon: {
        brightThreshold: 82,
        coverageMin: 0.74,
        spillMax: 0.26,
        darkBackgroundMin: 0.35,
      },
      battleHud: {
        hudAccentMin: 0.48,
        hudBrightMin: 0.16,
      },
    },
    rois: {
      loadingTemplate: {
        x: 0.82552,
        y: 0.89074,
        width: 0.14531,
        height: 0.05185,
      },
      selectionTimerIcon: {
        x: 0.13594,
        y: 0.03056,
        width: 0.01875,
        height: 0.03796,
      },
      selectionRight: {
        x: 0.714,
        y: 0.083,
        width: 0.281,
        height: 0.685,
      },
      leftBadgeStrip: {
        x: 0.01,
        y: 0.111,
        width: 0.052,
        height: 0.593,
      },
      bottomDoneBar: {
        x: 0.01,
        y: 0.824,
        width: 0.313,
        height: 0.162,
      },
      waitingTimerIcon: {
        x: 0.41094,
        y: 0.0963,
        width: 0.04635,
        height: 0.03611,
      },
      battleHud: {
        x: 0.758,
        y: 0.318,
        width: 0.221,
        height: 0.502,
      },
    },
  };

  const elements = {};
  const state = {
    csvHeaders: [],
    pokemonMap: new Map(),
    pokemonSearchIndex: [],
    csvReady: false,
    stream: null,
    streamInfo: null,
    videoReady: false,
    devices: [],
    audioDevices: [],
    hasObsDevice: false,
    selectedDeviceId: "",
    selectedAudioDeviceId: "",
    hasPersistedAudioSelection: false,
    deviceSelectionLocked: false,
    audioSelectionLocked: false,
    mode: "edit",
    crops: {
      my: null,
      enemy: null,
    },
    references: {
      my: null,
      enemy: null,
    },
    drag: null,
    lastCropInteractionEndedAt: 0,
    layoutResize: null,
    lastLayoutResizeEndedAt: 0,
    layoutResizeFrameId: 0,
    previewFrameId: 0,
    focusRestoreFrameId: 0,
    audioContext: null,
    audioGainNode: null,
    audioSourceNode: null,
    audioTrackStream: null,
    audioInputStream: null,
    audioMuted: false,
    audioVolume: 1,
    audioReady: false,
    theme: THEMES.dark,
    terminalNoticeKeys: new Set(),
    commandHistory: [],
    commandHistoryIndex: -1,
    suggestions: [],
    selectedSuggestionIndex: -1,
    ghostSuggestion: null,
    isComposing: false,
    suppressSuggestions: false,
    debugMode: false,
    terminalLogAutoFollow: true,
    terminalLogPendingBottomScroll: false,
    terminalForceAutoscrollDepth: 0,
    autoSnap: createAutoSnapState(),
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    restoreThemePreference();
    cacheElements();
    bindEvents();
    syncThemeToggleButton();
    restorePersistedSelections();
    restoreAudioVolume();
    setCameraState("未取得", "idle");
    renderCameraDetails();
    syncFullscreenButton();
    syncAudioControls();
    applyResponsiveWorkspacePaneLayout({ refresh: false });
    applyResponsiveTerminalLayout({ refresh: true });
    refreshDevices();
    loadAutoTemplates();
    loadPokemonCsv();
    registerServiceWorker();
    appendTerminalNotice(
      "command-hint",
      [
        "[system] edit で範囲を調整、ready で待機できます。",
        AUTO_SNAP_CONFIG.enabledByDefault
          ? "[system] 自動 snap は ON です。状態は auto status / debug status / help で確認できます。"
          : "[system] 自動 snap は OFF です。auto on で有効にできます。",
      ],
      "system",
    );
    if (!isTerminalCollapsed()) {
      window.requestAnimationFrame(() => {
        elements.terminalInput?.focus();
      });
    }
  }

  function cacheElements() {
    elements.appShell = document.querySelector(".app-shell");
    elements.workspaceTop = document.querySelector(".workspace-top");
    elements.layoutSplitter = document.getElementById("layout-splitter");
    elements.workspaceSplitterLeft = document.getElementById("workspace-splitter-left");
    elements.workspaceSplitterRight = document.getElementById("workspace-splitter-right");
    elements.myCropPanel = document.querySelector(".crop-panel--my");
    elements.livePanel = document.querySelector(".live-panel");
    elements.enemyCropPanel = document.querySelector(".crop-panel--enemy");
    elements.deviceSelect = document.getElementById("device-select");
    elements.audioSelect = document.getElementById("audio-select");
    elements.refreshDevicesButton = document.getElementById("refresh-devices");
    elements.startVideoButton = document.getElementById("start-video");
    elements.toggleFullscreenButton = document.getElementById("toggle-fullscreen");
    elements.toggleThemeButton = document.getElementById("toggle-theme");
    elements.toggleAudioMuteButton = document.getElementById("toggle-audio-mute");
    elements.audioVolume = document.getElementById("audio-volume");
    elements.cameraState = document.getElementById("camera-state");
    elements.video = document.getElementById("live-video");
    elements.videoStageShell = document.getElementById("video-stage-shell");
    elements.videoStage = document.getElementById("video-stage");
    elements.cropSlots = {
      my: {
        overlay: document.getElementById("crop-overlay-my"),
        handle: document.getElementById("crop-handle-my"),
        shell: document.getElementById("crop-preview-shell-my"),
        canvas: document.getElementById("crop-canvas-my"),
      },
      enemy: {
        overlay: document.getElementById("crop-overlay-enemy"),
        handle: document.getElementById("crop-handle-enemy"),
        shell: document.getElementById("crop-preview-shell-enemy"),
        canvas: document.getElementById("crop-canvas-enemy"),
      },
    };
    elements.autoDebugOverlays = {
      my: document.getElementById("debug-overlay-my"),
      enemy: document.getElementById("debug-overlay-enemy"),
      loading: document.getElementById("debug-overlay-loading"),
      leftBadge: document.getElementById("debug-overlay-left-badge"),
      doneBar: document.getElementById("debug-overlay-done-bar"),
      selectionTimer: document.getElementById("debug-overlay-selection-timer"),
      topTimer: document.getElementById("debug-overlay-top-timer"),
      battleHud: document.getElementById("debug-overlay-battle-hud"),
    };
    elements.terminalPanel = document.querySelector(".terminal-panel");
    elements.terminalScreen = document.getElementById("terminal-screen");
    elements.terminalForm = document.getElementById("terminal-form");
    elements.terminalInput = document.getElementById("terminal-input");
    elements.terminalGhost = document.getElementById("terminal-ghost");
    elements.terminalSuggestions = document.getElementById("terminal-suggestions");
    elements.terminalOutput = document.getElementById("terminal-output");
  }

  function bindEvents() {
    elements.refreshDevicesButton.addEventListener("click", handleRefreshDevicesButtonClick);
    elements.startVideoButton.addEventListener("click", handleStartVideoButtonClick);
    elements.toggleFullscreenButton?.addEventListener("click", handleToggleFullscreenButtonClick);
    elements.toggleThemeButton?.addEventListener("click", handleToggleThemeButtonClick);
    elements.toggleAudioMuteButton?.addEventListener("click", handleToggleAudioMuteButtonClick);
    elements.audioVolume?.addEventListener("input", handleAudioVolumeChange);
    elements.audioVolume?.addEventListener("change", handleAudioVolumeCommit);
    elements.deviceSelect.addEventListener("change", handleDeviceSelectionChangeWithFocusReturn);
    elements.audioSelect?.addEventListener("change", handleAudioSelectionChangeWithFocusReturn);
    elements.video.addEventListener("loadedmetadata", handleVideoReady);
    elements.terminalForm.addEventListener("submit", handleTerminalSubmit);
    elements.terminalInput.addEventListener("input", handleTerminalInputChange);
    elements.terminalInput.addEventListener("keydown", handleTerminalInputKeydown);
    elements.terminalInput.addEventListener("compositionstart", handleTerminalCompositionStart);
    elements.terminalInput.addEventListener("compositionend", handleTerminalCompositionEnd);
    elements.terminalOutput.addEventListener("scroll", handleTerminalLogScroll, { passive: true });
    elements.terminalScreen.addEventListener("click", focusTerminalInput);
    elements.layoutSplitter?.addEventListener("pointerdown", startLayoutResize);
    elements.workspaceSplitterLeft?.addEventListener("pointerdown", handleWorkspaceSplitterLeftPointerDown);
    elements.workspaceSplitterRight?.addEventListener("pointerdown", handleWorkspaceSplitterRightPointerDown);
    elements.workspaceTop?.addEventListener("click", handleWorkspaceTopClick);
    CROP_SIDES.forEach((side) => {
      elements.cropSlots[side].overlay?.addEventListener("pointerdown", startCropInteraction);
    });
    window.addEventListener("pointermove", updateCropInteraction);
    window.addEventListener("pointermove", updateLayoutResize);
    window.addEventListener("pointerup", finishCropInteraction);
    window.addEventListener("pointerup", finishLayoutResize);
    window.addEventListener("pointercancel", finishCropInteraction);
    window.addEventListener("pointercancel", finishLayoutResize);
    window.addEventListener("resize", handleWindowResize);
    document.addEventListener("keydown", handleGlobalKeydown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    if (navigator.mediaDevices && "addEventListener" in navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener("devicechange", refreshDevices);
    }
  }

  async function loadPokemonCsv() {
    try {
      const response = await fetch(CSV_PATH);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      const { headers, records } = parseCsv(text);
      validateHeaders(headers);

      state.csvHeaders = headers;
      state.pokemonMap.clear();
      state.pokemonSearchIndex = [];

      records.forEach((record) => {
        const normalized = normalizePokemonRecord(record);
        if (normalized) {
          state.pokemonMap.set(normalized.name, normalized);
          state.pokemonSearchIndex.push(buildPokemonSearchEntry(normalized));
        }
      });

      state.csvReady = true;
      refreshTerminalSuggestions();
    } catch (error) {
      state.csvReady = false;
      appendTerminalError(
        "[error] CSV の読み込みに失敗しました。ローカルサーバー経由で開き直してください。",
        error,
      );
    }
  }

  async function runControlActionAndRestoreTerminalFocus(action, options = {}) {
    try {
      await runWithForcedTerminalAutoscroll(action);
    } finally {
      focusTerminalInputIfAppropriate({
        ...options,
        context: "control-complete",
      });
    }
  }

  function handleRefreshDevicesButtonClick(event) {
    void runControlActionAndRestoreTerminalFocus(refreshDevices, {
      target: event.currentTarget,
    });
  }

  function handleStartVideoButtonClick(event) {
    void runControlActionAndRestoreTerminalFocus(startSelectedVideo, {
      target: event.currentTarget,
    });
  }

  function handleToggleFullscreenButtonClick(event) {
    void runControlActionAndRestoreTerminalFocus(toggleFullscreen, {
      target: event.currentTarget,
    });
  }

  function handleToggleThemeButtonClick(event) {
    void runControlActionAndRestoreTerminalFocus(toggleTheme, {
      target: event.currentTarget,
    });
  }

  function handleToggleAudioMuteButtonClick(event) {
    void runControlActionAndRestoreTerminalFocus(toggleAudioMute, {
      target: event.currentTarget,
    });
  }

  function handleDeviceSelectionChangeWithFocusReturn(event) {
    void runControlActionAndRestoreTerminalFocus(async () => {
      handleDeviceSelectionChange();
      await startSelectedVideo();
    }, {
      event,
      target: event.currentTarget,
    });
  }

  function handleAudioSelectionChangeWithFocusReturn(event) {
    void runControlActionAndRestoreTerminalFocus(async () => {
      const audioSelection = handleAudioSelectionChange();
      await applySelectedAudioInput(audioSelection);
    }, {
      event,
      target: event.currentTarget,
    });
  }

  function handleAudioVolumeCommit(event) {
    focusTerminalInputIfAppropriate({
      event,
      target: event.currentTarget,
      context: "control-complete",
    });
  }

  function handleWorkspaceSplitterLeftPointerDown(event) {
    startWorkspacePaneResize("left", event);
  }

  function handleWorkspaceSplitterRightPointerDown(event) {
    startWorkspacePaneResize("right", event);
  }

  function handleWorkspaceTopClick(event) {
    focusTerminalInputIfAppropriate({
      event,
      context: "panel-click",
    });
  }

  async function refreshDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      setCameraState("非対応", "error");
      elements.startVideoButton.disabled = true;
      elements.refreshDevicesButton.disabled = true;
      elements.deviceSelect.disabled = true;
      if (elements.audioSelect) {
        elements.audioSelect.disabled = true;
      }
      appendTerminalNotice(
        "unsupported-media-devices",
        [
          "[error] このブラウザでは映像入力を利用できません。MediaDevices API に対応したブラウザで開いてください。",
        ],
        "error",
      );
      renderCameraDetails();
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      state.devices = devices.filter((device) => device.kind === "videoinput");
      state.audioDevices = devices.filter((device) => device.kind === "audioinput");
      state.hasObsDevice = state.devices.some(isObsDevice);
      populateDeviceSelect();
      populateAudioSelect();

      if (state.devices.length === 0) {
        state.selectedDeviceId = "";
        setCameraState("未接続", "error");
        renderCameraDetails();
        return;
      }

      const hasNamedDevice = state.devices.some((device) => device.label);
      if (!hasNamedDevice && !state.videoReady) {
        setCameraState("権限待ち", "working");
        renderCameraDetails();
        return;
      }

      if (!state.videoReady) {
        setCameraState("開始待ち", "idle");
      }
      renderCameraDetails();
    } catch (error) {
      setCameraState("失敗", "error");
      appendTerminalError(
        "[error] 映像入力の一覧取得に失敗しました。ページを再読み込みして、もう一度試してください。",
        error,
      );
    }
  }

  function populateDeviceSelect() {
    const currentValue = state.selectedDeviceId || elements.deviceSelect.value;
    elements.deviceSelect.innerHTML = "";

    if (state.devices.length === 0) {
      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = "映像入力が見つかりません";
      elements.deviceSelect.append(emptyOption);
      elements.deviceSelect.disabled = true;
      elements.startVideoButton.disabled = true;
      return;
    }

    state.devices.forEach((device, index) => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.textContent = device.label || `映像入力 ${index + 1}`;
      elements.deviceSelect.append(option);
    });

    let selected = null;
    if (state.deviceSelectionLocked && currentValue) {
      selected = state.devices.find((device) => device.deviceId === currentValue) || null;
    } else if (state.stream && state.selectedDeviceId) {
      selected = state.devices.find((device) => device.deviceId === state.selectedDeviceId) || null;
    } else {
      selected = state.devices.find((device) => device.deviceId === currentValue) || findObsDevice() || state.devices[0];
    }

    elements.deviceSelect.value = selected.deviceId;
    state.selectedDeviceId = selected.deviceId;
    elements.deviceSelect.disabled = false;
    elements.startVideoButton.disabled = false;
  }

  function populateAudioSelect() {
    if (!elements.audioSelect) {
      return;
    }

    const hadOptions = elements.audioSelect.options.length > 0;
    const currentValue = state.selectedAudioDeviceId || elements.audioSelect.value;
    elements.audioSelect.innerHTML = "";

    const noneOption = document.createElement("option");
    noneOption.value = "";
    noneOption.textContent = "音声なし";
    elements.audioSelect.append(noneOption);

    state.audioDevices.forEach((device, index) => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.textContent = device.label || `音声入力 ${index + 1}`;
      elements.audioSelect.append(option);
    });

    const selectedVideoDevice = getSelectedDevice()
      || state.devices.find((device) => device.deviceId === elements.deviceSelect.value)
      || null;
    const suggestedAudioDevice = findAssociatedAudioDevice(selectedVideoDevice);

    let selectedValue = "";
    if (state.audioSelectionLocked) {
      selectedValue = state.audioDevices.some((device) => device.deviceId === currentValue) ? currentValue : "";
    } else if (currentValue && state.audioDevices.some((device) => device.deviceId === currentValue)) {
      selectedValue = currentValue;
    } else if (state.hasPersistedAudioSelection && currentValue === "") {
      selectedValue = "";
    } else if (hadOptions) {
      selectedValue = "";
    } else if (suggestedAudioDevice) {
      selectedValue = suggestedAudioDevice.deviceId;
    }

    elements.audioSelect.value = selectedValue;
    state.selectedAudioDeviceId = selectedValue;
    elements.audioSelect.disabled = state.audioDevices.length === 0;
  }

  function handleDeviceSelectionChange() {
    state.deviceSelectionLocked = true;
    state.selectedDeviceId = elements.deviceSelect.value;
    persistStoredValue(STORAGE_KEYS.videoDevice, state.selectedDeviceId);
    if (!state.audioSelectionLocked) {
      populateAudioSelect();
    }
    renderCameraDetails();
  }

  function handleAudioSelectionChange() {
    const previousSelectedAudioDeviceId = state.selectedAudioDeviceId;
    state.audioSelectionLocked = true;
    state.hasPersistedAudioSelection = true;
    state.selectedAudioDeviceId = elements.audioSelect?.value || "";
    persistStoredValue(STORAGE_KEYS.audioDevice, state.selectedAudioDeviceId);
    return {
      previousSelectedAudioDeviceId,
      nextSelectedAudioDeviceId: state.selectedAudioDeviceId,
    };
  }

  async function applySelectedAudioInput(selection = {}) {
    const {
      previousSelectedAudioDeviceId = "",
      nextSelectedAudioDeviceId = state.selectedAudioDeviceId,
    } = selection;
    const selectedAudioDeviceId = nextSelectedAudioDeviceId || "";

    if (selectedAudioDeviceId === previousSelectedAudioDeviceId && state.audioInputStream) {
      return;
    }

    stopSelectedAudioInput();

    if (!selectedAudioDeviceId) {
      return;
    }

    const audioResult = await requestSelectedAudioStream(selectedAudioDeviceId);
    if (!audioResult.stream) {
      return;
    }

    state.audioInputStream = audioResult.stream;
    const audioReady = await setupAudioPlayback({ stream: audioResult.stream });
    if (!audioReady && state.audioInputStream) {
      state.audioInputStream.getTracks().forEach((track) => track.stop());
      state.audioInputStream = null;
    }
  }

  async function startSelectedVideo() {
    if (!state.devices.length) {
      setCameraState("未接続", "error");
      appendTerminalError(
        "[error] 映像入力が見つかりません。キャプチャデバイスまたは OBS 仮想カメラを確認してください。",
      );
      return;
    }

    const selectedDeviceId = elements.deviceSelect.value || state.selectedDeviceId || undefined;
    const selectedAudioDeviceId = elements.audioSelect?.value || state.selectedAudioDeviceId || "";
    state.selectedDeviceId = selectedDeviceId || "";
    state.selectedAudioDeviceId = selectedAudioDeviceId;
    setCameraState("開始中", "working");

    try {
      await warmAudioOutput();
      stopCurrentStream();
      const videoStream = await requestPreferredStream(selectedDeviceId);
      const selectedVideoDevice = getSelectedDevice();

      state.stream = videoStream;
      elements.video.srcObject = videoStream;
      elements.video.muted = true;
      await elements.video.play();

      const activeVideoDevice = getSelectedDevice() || selectedVideoDevice;
      const activeAudioDeviceId = selectedAudioDeviceId;

      if (!activeAudioDeviceId) {
        if (!state.audioDevices.length) {
          appendTerminalEntry(
            [
              "[system] 音声入力が見つからないため、映像のみで開始しました。",
            ],
            "system",
          );
        } else if (activeVideoDevice && isObsDevice(activeVideoDevice)) {
          appendTerminalEntry(
            [
              "[system] OBS Virtual Camera は映像のみです。音が必要な場合は音声入力を別で選んでください。",
            ],
            "system",
          );
        } else {
          appendTerminalEntry(
            [
              "[system] 音声入力が未選択のため、映像のみで開始しました。",
            ],
            "system",
          );
        }
        syncAudioControls();
        await refreshDevices();
        return;
      }

      const audioResult = await requestSelectedAudioStream(activeAudioDeviceId);
      if (!audioResult.stream) {
        syncAudioControls();
        await refreshDevices();
        return;
      }

      state.audioInputStream = audioResult.stream;
      const audioReady = await setupAudioPlayback({ stream: audioResult.stream });
      if (!audioReady && state.audioInputStream) {
        state.audioInputStream.getTracks().forEach((track) => track.stop());
        state.audioInputStream = null;
      }
      await refreshDevices();
    } catch (error) {
      handleStreamError(error);
    }
  }

  async function requestPreferredStream(selectedDeviceId) {
    return requestStreamForProfiles(selectedDeviceId);
  }

  async function requestStreamForProfiles(selectedDeviceId) {
    let lastError = null;

    for (let index = 0; index < STREAM_PROFILES.length; index += 1) {
      const constraints = buildMediaConstraints(selectedDeviceId, STREAM_PROFILES[index]);

      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        lastError = error;
        if (!shouldRetryStreamRequest(error, index, STREAM_PROFILES.length)) {
          throw error;
        }
      }
    }

    throw lastError || new Error("映像入力の開始に失敗しました。");
  }

  function buildMediaConstraints(selectedDeviceId, profile) {
    const video = { ...profile };
    if (selectedDeviceId) {
      video.deviceId = { exact: selectedDeviceId };
    }

    return {
      audio: false,
      video: Object.keys(video).length > 0 ? video : true,
    };
  }

  function shouldRetryStreamRequest(error, index, total) {
    if (index >= total - 1) {
      return false;
    }

    return [
      "OverconstrainedError",
      "ConstraintNotSatisfiedError",
      "NotFoundError",
    ].includes(error?.name);
  }

  function handleStreamError(error) {
    stopCurrentStream();

    let message = "失敗";
    let terminalMessage = "[error] 映像入力の開始に失敗しました。";

    if (error && error.name === "NotAllowedError") {
      message = "拒否";
      terminalMessage = "[error] 映像入力へのアクセスが拒否されました。ブラウザの権限設定を確認してください。";
    } else if (error && error.name === "NotFoundError") {
      message = "未接続";
      terminalMessage = "[error] 選択した映像入力が見つかりません。デバイスをつなぎ直して一覧を更新してください。";
    } else if (error && error.name === "NotReadableError") {
      message = "使用中";
      terminalMessage = "[error] 選択した映像入力を利用できません。他のアプリやブラウザタブで使用中の可能性があります。";
    }

    setCameraState(message, "error");
    renderCameraDetails();
    appendTerminalError(terminalMessage, error);
  }

  function handleVideoReady() {
    const dimensions = getStreamDimensions();
    if (!dimensions.width || !dimensions.height) {
      return;
    }

    state.streamInfo = buildStreamInfo(dimensions.width, dimensions.height);
    state.videoReady = true;
    elements.videoStage.dataset.ready = "true";
    CROP_SIDES.forEach((side) => {
      elements.cropSlots[side].shell.dataset.ready = "true";
    });
    refreshWorkspaceLayout();

    CROP_SIDES.forEach((side) => {
      const initialCrop = getInitialCrop(side, dimensions.width, dimensions.height);
      updateCrop(side, initialCrop, { save: false });
    });
    setCameraState(
      state.streamInfo.inputLabel,
      state.streamInfo.isSixteenByNine ? "success" : "working",
    );
    if (state.streamInfo.isSixteenByNine) {
      appendTerminalNotice(
        "fixed-crop-16-9",
        [
          "[system] 16:9 入力を検出しました。左右クロップに固定プリセットを適用しました。",
        ],
        "system",
      );
    }
    if (!state.streamInfo.isSixteenByNine) {
      appendTerminalNotice(
        "aspect-4-3-generic",
        [
          "[system] 入力を検出しました。自動 snap を有効にするには 16:9 の映像入力が必要です。",
        ],
        "system",
      );
      appendTerminalNotice(
        "auto-unsupported-4-3",
        [
          "[auto] 自動 snap は 16:9 入力にのみ対応しています。",
        ],
        "system",
      );
    }
    renderCameraDetails();
    refreshCropPanels();
    if (state.streamInfo.isSixteenByNine && state.mode === "edit") {
      setMode("ready");
      return;
    }
    if (state.mode === "edit") {
      startPreviewLoop();
    }
    syncAutoSnapMonitoring();
  }

  function handleTerminalSubmit(event) {
    event.preventDefault();

    const rawQuery = elements.terminalInput.value.trim();
    const submission = resolveTerminalSubmission(rawQuery);
    void runWithForcedTerminalAutoscroll(() => {
      if (!submission.query) {
        if (state.mode === "ready") {
          appendTerminalEntry(["> snap both"], "command");
          return handleSnapCommand("both");
        }
        return null;
      }

      pushCommandHistory(rawQuery);
      appendTerminalEntry([`> ${rawQuery}`], "command");
      elements.terminalInput.value = "";
      clearTerminalSuggestions();

      if (handleTerminalCommand(submission.query)) {
        return null;
      }

      if (!state.csvReady) {
        appendTerminalError("[error] CSV がまだ読み込めていません。ローカルサーバー経由で開き直してください。");
        return null;
      }

      const pokemon = state.pokemonMap.get(submission.query);
      if (!pokemon) {
        appendTerminalEntry(
          [
            "[error] 該当するポケモンが見つかりません。コマンドを確認したい場合は help を入力してください。",
          ],
          "error",
        );
        return null;
      }

      appendTerminalEntry(
        [
          `タイプ: ${pokemon.types.join("/")} | 特性: ${pokemon.abilities.join("/")} | 種族値: H-${pokemon.stats.H} A-${pokemon.stats.A} B-${pokemon.stats.B} C-${pokemon.stats.C} D-${pokemon.stats.D} S-${pokemon.stats.S}`,
        ],
        "success",
      );
      return null;
    });
  }

  function handleTerminalInputChange() {
    state.commandHistoryIndex = -1;
    state.suppressSuggestions = false;
    refreshTerminalSuggestions();
  }

  function handleTerminalCompositionStart() {
    state.isComposing = true;
    dismissTerminalSuggestions();
  }

  function handleTerminalCompositionEnd() {
    state.isComposing = false;
    state.suppressSuggestions = false;
    refreshTerminalSuggestions();
  }

  function handleTerminalInputKeydown(event) {
    if (event.isComposing || state.isComposing) {
      return;
    }

    if (event.key === "Tab") {
      if (hasVisibleTerminalSuggestions()) {
        event.preventDefault();
        moveTerminalSuggestionSelection(event.shiftKey ? -1 : 1);
      }
      return;
    }

    if (event.key === "ArrowUp") {
      if (!state.commandHistory.length) {
        return;
      }

      event.preventDefault();
      if (state.commandHistoryIndex < 0) {
        state.commandHistoryIndex = state.commandHistory.length - 1;
      } else {
        state.commandHistoryIndex = Math.max(0, state.commandHistoryIndex - 1);
      }
      elements.terminalInput.value = state.commandHistory[state.commandHistoryIndex];
      moveCaretToEnd(elements.terminalInput);
      refreshTerminalSuggestions();
      return;
    }

    if (event.key === "ArrowDown") {
      if (!state.commandHistory.length || state.commandHistoryIndex < 0) {
        return;
      }

      event.preventDefault();
      if (state.commandHistoryIndex >= state.commandHistory.length - 1) {
        state.commandHistoryIndex = -1;
        elements.terminalInput.value = "";
      } else {
        state.commandHistoryIndex += 1;
        elements.terminalInput.value = state.commandHistory[state.commandHistoryIndex];
      }
      moveCaretToEnd(elements.terminalInput);
      refreshTerminalSuggestions();
      return;
    }

    if (event.key === "Escape" && hasVisibleTerminalSuggestions()) {
      event.preventDefault();
      event.stopPropagation();
      dismissTerminalSuggestions();
      return;
    }

    if (event.key === "Enter" && hasVisibleTerminalSuggestions() && getSelectedTerminalSuggestion()) {
      event.preventDefault();
      state.suppressSuggestions = false;
      elements.terminalForm?.requestSubmit();
    }
  }

  function resolveTerminalSubmission(rawQuery) {
    const query = String(rawQuery || "").trim();
    if (!query) {
      return { query: "" };
    }

    if (shouldPreferTerminalCommand(query)) {
      return { query };
    }

    const selectedSuggestion = getSelectedTerminalSuggestion();
    if (selectedSuggestion) {
      return { query: selectedSuggestion.name };
    }

    const exactPokemon = findExactPokemonMatch(query);
    if (exactPokemon) {
      return { query: exactPokemon.name };
    }

    return { query };
  }

  function moveTerminalSuggestionSelection(direction) {
    if (!state.suggestions.length) {
      return;
    }

    if (direction < 0) {
      if (state.selectedSuggestionIndex < 0) {
        state.selectedSuggestionIndex = state.suggestions.length - 1;
      } else {
        state.selectedSuggestionIndex = (state.selectedSuggestionIndex - 1 + state.suggestions.length) % state.suggestions.length;
      }
    } else if (state.selectedSuggestionIndex < 0) {
      state.selectedSuggestionIndex = 0;
    } else {
      state.selectedSuggestionIndex = (state.selectedSuggestionIndex + 1) % state.suggestions.length;
    }

    state.ghostSuggestion = null;
    renderTerminalSuggestions();
  }

  function getSelectedTerminalSuggestion() {
    if (state.selectedSuggestionIndex < 0 || state.selectedSuggestionIndex >= state.suggestions.length) {
      return null;
    }

    return state.suggestions[state.selectedSuggestionIndex];
  }

  function hasVisibleTerminalSuggestions() {
    return state.suggestions.length > 0 && !elements.terminalSuggestions?.classList.contains("is-hidden");
  }

  function dismissTerminalSuggestions() {
    state.suppressSuggestions = true;
    clearTerminalSuggestions();
  }

  function clearTerminalSuggestions() {
    state.suggestions = [];
    state.selectedSuggestionIndex = -1;
    state.ghostSuggestion = null;
    renderTerminalSuggestions();
  }

  function refreshTerminalSuggestions() {
    const inputValue = elements.terminalInput?.value || "";
    const query = inputValue.trim();

    if (!state.csvReady || !query || state.isComposing || state.suppressSuggestions || shouldSuppressPokemonSuggestions(query)) {
      clearTerminalSuggestions();
      return;
    }

    state.suggestions = getPokemonSuggestions(query);
    state.selectedSuggestionIndex = -1;
    state.ghostSuggestion = getGhostSuggestion(query, state.suggestions);
    renderTerminalSuggestions(query);
  }

  function renderTerminalSuggestions(query = elements.terminalInput?.value?.trim() || "") {
    if (elements.terminalGhost) {
      const ghostText = getGhostDisplayText(query, state.ghostSuggestion);
      elements.terminalGhost.textContent = ghostText;
    }

    if (!elements.terminalSuggestions) {
      return;
    }

    elements.terminalSuggestions.textContent = "";
    if (!state.suggestions.length) {
      elements.terminalSuggestions.classList.add("is-hidden");
      elements.terminalSuggestions.setAttribute("aria-hidden", "true");
      return;
    }

    const fragment = document.createDocumentFragment();
    state.suggestions.forEach((suggestion, index) => {
      const row = document.createElement("div");
      row.className = "terminal-suggestion";
      if (index === state.selectedSuggestionIndex) {
        row.classList.add("is-selected");
      }

      const name = document.createElement("span");
      name.className = "terminal-suggestion__name";
      appendHighlightedSuggestionName(name, suggestion.name, query);

      const types = document.createElement("span");
      types.className = "terminal-suggestion__types";
      types.textContent = suggestion.types.length ? suggestion.types.join("/") : "-";

      row.append(name, types);
      fragment.append(row);
    });

    elements.terminalSuggestions.append(fragment);
    elements.terminalSuggestions.classList.remove("is-hidden");
    elements.terminalSuggestions.setAttribute("aria-hidden", "false");
  }

  function appendHighlightedSuggestionName(container, name, query) {
    const matchRange = findSuggestionHighlightRange(name, query);
    if (!matchRange) {
      container.textContent = name;
      return;
    }

    const { start, end } = matchRange;
    if (start > 0) {
      container.append(document.createTextNode(name.slice(0, start)));
    }

    const highlight = document.createElement("span");
    highlight.className = "terminal-suggestion__match";
    highlight.textContent = name.slice(start, end);
    container.append(highlight);

    if (end < name.length) {
      container.append(document.createTextNode(name.slice(end)));
    }
  }

  function findSuggestionHighlightRange(name, query) {
    const trimmedQuery = String(query || "").trim();
    if (!trimmedQuery) {
      return null;
    }

    const directIndex = name.indexOf(trimmedQuery);
    if (directIndex >= 0) {
      return { start: directIndex, end: directIndex + trimmedQuery.length };
    }

    const normalizedName = normalizePokemonDisplayText(name);
    const normalizedQuery = normalizePokemonDisplayText(trimmedQuery);
    const normalizedIndex = normalizedName.indexOf(normalizedQuery);
    if (normalizedIndex < 0 || normalizedIndex + normalizedQuery.length > name.length) {
      return null;
    }

    return { start: normalizedIndex, end: normalizedIndex + normalizedQuery.length };
  }

  function getGhostDisplayText(query, suggestion) {
    if (!suggestion) {
      return "";
    }

    const prefixLength = getGhostPrefixLength(query, suggestion.name);
    if (prefixLength <= 0 || prefixLength >= suggestion.name.length) {
      return "";
    }

    return `${" ".repeat(prefixLength)}${suggestion.name.slice(prefixLength)}`;
  }

  function getGhostPrefixLength(query, name) {
    const trimmedQuery = String(query || "").trim();
    if (!trimmedQuery) {
      return 0;
    }

    const directPrefix = name.startsWith(trimmedQuery) ? trimmedQuery.length : 0;
    if (directPrefix > 0) {
      return directPrefix;
    }

    const normalizedName = normalizePokemonDisplayText(name);
    const normalizedQuery = normalizePokemonDisplayText(trimmedQuery);
    if (!normalizedQuery || !normalizedName.startsWith(normalizedQuery)) {
      return 0;
    }

    return Math.min(trimmedQuery.length, name.length);
  }

  function handleGlobalKeydown(event) {
    if (event.ctrlKey && !event.altKey && !event.metaKey && event.key === "Enter") {
      event.preventDefault();
      void runWithForcedTerminalAutoscroll(() => {
        appendTerminalEntry(["> snap both"], "command");
        return handleSnapCommand("both");
      });
      return;
    }

    if (event.key === "Escape" && state.mode === "edit") {
      event.preventDefault();
      setMode("ready");
    }
  }

  function handleTerminalCommand(query) {
    const normalizedQuery = normalizeTerminalAlias(query.toLowerCase().trim());
    const [command = "", arg = "", extra = ""] = normalizedQuery.split(/\s+/).filter(Boolean);

    if (command === "edit") {
      setMode("edit");
      return true;
    }

    if (command === "ready") {
      setMode("ready");
      return true;
    }

    if (command === "help") {
      appendTerminalEntry(
        [
          "利用可能なコマンド: edit / ready / snap / snap my / snap enemy / snap both / auto on / auto off / auto status / auto reset / debug on / debug off / debug status / status / clear / cls / crop reset [my|enemy|both] / help",
          "短縮コマンド: edit = e / ready = r / snap both = s / snap my = sm / snap enemy = se / crop reset = cr",
          "ショートカット: Ctrl + Enter = snap both / Esc = ready",
        ],
        "system",
      );
      return true;
    }

    if (command === "status") {
      appendTerminalEntry(getTerminalStatusLines(), "system");
      return true;
    }

    if (command === "clear" || command === "cls") {
      clearTerminalOutput();
      appendTerminalEntry(
        [
          "[system] terminal の表示をクリアしました。",
        ],
        "system",
      );
      return true;
    }

    if (command === "auto") {
      handleAutoCommand(arg);
      return true;
    }

    if (command === "debug") {
      handleDebugCommand(arg);
      return true;
    }

    if (command === "layout") {
      if (arg !== "reset" || extra) {
        appendTerminalEntry(
          [
            "[error] layout は reset を指定できます。",
          ],
          "error",
        );
        return true;
      }

      handleLayoutResetCommand();
      return true;
    }

    if (command === "snap") {
      const target = ["", "both"].includes(arg) ? "both" : arg;
      if (!["my", "enemy", "both"].includes(target)) {
        appendTerminalEntry(
          [
            "[error] snap は my / enemy / both を指定できます。",
          ],
          "error",
        );
        return true;
      }

      void runWithForcedTerminalAutoscroll(() => handleSnapCommand(target));
      return true;
    }

    if (command === "crop") {
      if (arg !== "reset") {
        appendTerminalEntry(
          [
            "[error] crop は reset を指定できます。",
          ],
          "error",
        );
        return true;
      }

      const target = ["", "both"].includes(extra) ? "both" : extra;
      if (!["my", "enemy", "both"].includes(target)) {
        appendTerminalEntry(
          [
            "[error] crop reset は my / enemy / both を指定できます。",
          ],
          "error",
        );
        return true;
      }

      handleCropResetCommand(target);
      return true;
    }

    return false;
  }

  function normalizeTerminalAlias(query) {
    const aliasMap = {
      e: "edit",
      r: "ready",
      s: "snap both",
      sm: "snap my",
      se: "snap enemy",
      cr: "crop reset",
      lr: "layout reset",
    };

    return aliasMap[query] || query;
  }

  function shouldPreferTerminalCommand(query) {
    const trimmed = String(query || "").trim();
    if (!trimmed) {
      return false;
    }

    const normalizedQuery = normalizeTerminalAlias(trimmed.toLowerCase());
    const [command = ""] = normalizedQuery.split(/\s+/).filter(Boolean);
    return TERMINAL_COMMAND_TOKENS.has(command);
  }

  function shouldSuppressPokemonSuggestions(query) {
    const trimmed = String(query || "").trim();
    if (!trimmed) {
      return true;
    }

    if (/^[a-z0-9\s]+$/i.test(trimmed)) {
      return true;
    }

    return shouldPreferTerminalCommand(trimmed);
  }

  function findExactPokemonMatch(query) {
    const normalizedQuery = normalizePokemonSearchText(query);
    if (!normalizedQuery) {
      return null;
    }

    let bestEntry = null;
    let bestScore = -1;
    let isAmbiguous = false;

    state.pokemonSearchIndex.forEach((entry) => {
      entry.searchKeys.forEach((searchKey) => {
        if (searchKey.normalized !== normalizedQuery) {
          return;
        }

        const score = getExactMatchScore(searchKey.kind);
        if (score > bestScore) {
          bestEntry = entry;
          bestScore = score;
          isAmbiguous = false;
          return;
        }

        if (score === bestScore && bestEntry && bestEntry.name !== entry.name) {
          isAmbiguous = true;
        }
      });
    });

    if (isAmbiguous) {
      return null;
    }

    return bestEntry;
  }

  function getPokemonSuggestions(query) {
    const normalizedQuery = normalizePokemonSearchText(query);
    if (!normalizedQuery) {
      return [];
    }

    return state.pokemonSearchIndex
      .map((entry) => scorePokemonSuggestion(entry, normalizedQuery))
      .filter(Boolean)
      .sort((left, right) => {
      if (right.score !== left.score) {
          return right.score - left.score;
        }
        if (left.matchLength !== right.matchLength) {
          return left.matchLength - right.matchLength;
        }
        if (left.sortWeight !== right.sortWeight) {
          return left.sortWeight - right.sortWeight;
        }
        return left.name.localeCompare(right.name, "ja");
      })
      .slice(0, TERMINAL_SUGGESTION_MAX_ITEMS);
  }

  function scorePokemonSuggestion(entry, normalizedQuery) {
    let bestMatch = null;

    entry.searchKeys.forEach((searchKey) => {
      const score = getPokemonSuggestionScore(searchKey, normalizedQuery);
      if (!score) {
        return;
      }

      if (!bestMatch || score.score > bestMatch.score || (score.score === bestMatch.score && searchKey.sortWeight < bestMatch.sortWeight)) {
        bestMatch = {
          score: score.score,
          matchType: score.matchType,
          matchLength: searchKey.normalized.length,
          sortWeight: searchKey.sortWeight,
        };
      }
    });

    if (!bestMatch) {
      return null;
    }

    return {
      name: entry.name,
      types: entry.types,
      score: bestMatch.score,
      matchType: bestMatch.matchType,
      matchLength: bestMatch.matchLength,
      sortWeight: bestMatch.sortWeight,
    };
  }

  function getPokemonSuggestionScore(searchKey, normalizedQuery) {
    const { normalized, kind } = searchKey;
    if (!normalized || !normalizedQuery) {
      return null;
    }

    if (normalized === normalizedQuery) {
      return { score: getExactMatchScore(kind), matchType: "exact" };
    }

    if (normalized.startsWith(normalizedQuery)) {
      return { score: getPrefixMatchScore(kind), matchType: "prefix" };
    }

    if (normalized.includes(normalizedQuery)) {
      return { score: getPartialMatchScore(kind), matchType: "partial" };
    }

    return null;
  }

  function getExactMatchScore(kind) {
    switch (kind) {
      case "official":
        return 1000;
      case "base":
        return 860;
      case "form":
        return 780;
      default:
        return 720;
    }
  }

  function getPrefixMatchScore(kind) {
    switch (kind) {
      case "official":
        return 660;
      case "base":
        return 540;
      case "form":
        return 500;
      default:
        return 440;
    }
  }

  function getPartialMatchScore(kind) {
    switch (kind) {
      case "official":
        return 280;
      case "base":
        return 220;
      case "form":
        return 190;
      default:
        return 150;
    }
  }

  function getGhostSuggestion(query, suggestions) {
    if (!suggestions.length || state.selectedSuggestionIndex >= 0) {
      return null;
    }

    const [first, second] = suggestions;
    if (!first || first.matchType !== "prefix") {
      return null;
    }

    if (getGhostPrefixLength(query, first.name) <= 0) {
      return null;
    }

    if (second && first.score - second.score < TERMINAL_GHOST_MIN_SCORE_GAP) {
      return null;
    }

    return first;
  }

  function pushCommandHistory(command) {
    state.commandHistory.push(command);
    if (state.commandHistory.length > 50) {
      state.commandHistory.shift();
    }
    state.commandHistoryIndex = -1;
  }

  function focusTerminalInput(event) {
    if (event.target === elements.terminalInput) {
      return;
    }

    focusTerminalInputIfAppropriate({
      event,
      context: "terminal-panel",
    });
  }

  function moveCaretToEnd(input) {
    const nextPosition = input.value.length;
    input.setSelectionRange(nextPosition, nextPosition);
  }

  function runWithForcedTerminalAutoscroll(action) {
    state.terminalForceAutoscrollDepth += 1;
    const release = () => {
      state.terminalForceAutoscrollDepth = Math.max(0, state.terminalForceAutoscrollDepth - 1);
    };

    try {
      const result = action();
      if (result && typeof result.then === "function") {
        return Promise.resolve(result).finally(release);
      }

      release();
      return result;
    } catch (error) {
      release();
      throw error;
    }
  }

  function handleTerminalLogScroll() {
    if (!elements.terminalOutput || isTerminalCollapsed()) {
      return;
    }

    state.terminalLogAutoFollow = isTerminalLogNearBottom();
  }

  function isTerminalLogNearBottom(threshold = TERMINAL_AUTOSCROLL_THRESHOLD_PX) {
    if (!elements.terminalOutput) {
      return true;
    }

    const remaining = elements.terminalOutput.scrollHeight
      - elements.terminalOutput.clientHeight
      - elements.terminalOutput.scrollTop;
    return remaining <= threshold;
  }

  function shouldForceTerminalAutoscroll() {
    return state.terminalForceAutoscrollDepth > 0;
  }

  function isTerminalLogVisible() {
    return Boolean(elements.terminalOutput?.getClientRects().length);
  }

  function focusTerminalInputIfAppropriate(options = {}) {
    const {
      event = null,
      target = null,
      context = "control-complete",
    } = options;

    if (!elements.terminalInput) {
      return;
    }

    if (context === "terminal-panel") {
      queueTerminalInputFocus();
      return;
    }

    const now = performance.now();
    if (
      state.mode === "edit"
      || state.drag
      || state.layoutResize
      || isTerminalCollapsed()
      || (
        state.lastLayoutResizeEndedAt
        && now - state.lastLayoutResizeEndedAt < TERMINAL_FOCUS_RETURN_GRACE_MS
      )
    ) {
      return;
    }

    if (context === "panel-click" && shouldSkipPanelClickFocusRestore(event, target)) {
      return;
    }

    queueTerminalInputFocus();
  }

  function queueTerminalInputFocus() {
    if (!elements.terminalInput) {
      return;
    }

    if (state.focusRestoreFrameId) {
      window.cancelAnimationFrame(state.focusRestoreFrameId);
    }

    state.focusRestoreFrameId = window.requestAnimationFrame(() => {
      state.focusRestoreFrameId = 0;
      if (
        !elements.terminalInput
        || document.activeElement === elements.terminalInput
        || isTerminalCollapsed()
      ) {
        return;
      }

      try {
        elements.terminalInput.focus({ preventScroll: true });
      } catch {
        elements.terminalInput.focus();
      }
    });
  }

  function shouldSkipPanelClickFocusRestore(event, target) {
    if (state.mode !== "ready") {
      return true;
    }

    const now = performance.now();
    if (
      state.lastCropInteractionEndedAt
      && now - state.lastCropInteractionEndedAt < TERMINAL_FOCUS_RETURN_GRACE_MS
    ) {
      return true;
    }

    if (eventPathContainsSelector(event, ".crop-overlay, .crop-overlay__handle")) {
      return true;
    }

    const targetElement = getTargetElement(target || event?.target);
    if (!targetElement || targetElement === elements.terminalInput) {
      return true;
    }

    return Boolean(targetElement.closest(PANEL_CLICK_INTERACTIVE_SELECTOR));
  }

  function eventPathContainsSelector(event, selector) {
    if (!event || typeof event.composedPath !== "function") {
      return false;
    }

    return event.composedPath().some((node) => node instanceof Element && node.matches(selector));
  }

  function getTargetElement(target) {
    if (target instanceof Element) {
      return target;
    }

    if (target instanceof Node) {
      return target.parentElement;
    }

    return null;
  }

  function usesMobileLayout() {
    return window.matchMedia(MOBILE_LAYOUT_MEDIA_QUERY).matches;
  }

  function isTerminalCollapsed() {
    return elements.terminalPanel?.dataset.collapsed === "true";
  }

  function getTerminalCompactMinHeight() {
    const inputHeight = Math.ceil(elements.terminalForm?.getBoundingClientRect().height || 0);
    return Math.max(inputHeight + TERMINAL_COMPACT_VERTICAL_PADDING * 2, 28);
  }

  function getTerminalCompactThreshold() {
    return getTerminalCompactMinHeight() + TERMINAL_COMPACT_BUFFER;
  }

  function getTerminalCollapseThreshold() {
    return Math.max(Math.floor(getTerminalCompactMinHeight() * 0.5), 12);
  }

  function getTerminalResizeStep() {
    const lineHeight = Number.parseFloat(
      window.getComputedStyle(elements.terminalOutput || elements.terminalForm || document.body).lineHeight,
    );
    if (Number.isFinite(lineHeight) && lineHeight > 0) {
      return Math.max(1, Math.round(lineHeight));
    }

    return TERMINAL_RESIZE_STEP_FALLBACK;
  }

  function snapNormalTerminalPanelHeight(sizePx) {
    const compactMinHeight = getTerminalCompactMinHeight();
    const resizeStep = getTerminalResizeStep();
    const snappedSteps = Math.max(1, Math.round((sizePx - compactMinHeight) / resizeStep));
    return clamp(compactMinHeight + snappedSteps * resizeStep, compactMinHeight + resizeStep, getMaxTerminalPanelHeight());
  }

  function getCurrentWorkspacePaneWidth(side) {
    const pane = side === "left" ? elements.myCropPanel : elements.enemyCropPanel;
    return Math.max(WORKSPACE_PANE_MIN_WIDTH, Math.round(pane?.getBoundingClientRect().width || 0));
  }

  function getWorkspacePaneSplitterWidthTotal() {
    return (elements.workspaceSplitterLeft?.offsetWidth || 0) + (elements.workspaceSplitterRight?.offsetWidth || 0);
  }

  function getMaxWorkspacePaneWidth(side, oppositeWidth) {
    const workspaceWidth = elements.workspaceTop?.clientWidth || 0;
    const nextOppositeWidth = Number.isFinite(oppositeWidth)
      ? oppositeWidth
      : getCurrentWorkspacePaneWidth(side === "left" ? "right" : "left");
    return Math.max(
      Math.round(workspaceWidth - getWorkspacePaneSplitterWidthTotal() - WORKSPACE_CENTER_MIN_WIDTH - nextOppositeWidth),
      WORKSPACE_PANE_MIN_WIDTH,
    );
  }

  function resolveWorkspacePaneWidth(sizePx, side, oppositeWidth) {
    const roundedSize = Math.max(0, Math.round(sizePx));
    if (roundedSize <= WORKSPACE_PANE_COLLAPSE_THRESHOLD) {
      return 0;
    }

    return clamp(roundedSize, WORKSPACE_PANE_MIN_WIDTH, getMaxWorkspacePaneWidth(side, oppositeWidth));
  }

  function normalizeWorkspacePaneSizes(partialSizes = {}) {
    if (!elements.workspaceTop) {
      return null;
    }

    let left = Number.isFinite(partialSizes.left)
      ? partialSizes.left
      : getCurrentWorkspacePaneWidth("left");
    let right = Number.isFinite(partialSizes.right)
      ? partialSizes.right
      : getCurrentWorkspacePaneWidth("right");

    left = resolveWorkspacePaneWidth(left, "left", right);
    right = resolveWorkspacePaneWidth(right, "right", left);
    left = resolveWorkspacePaneWidth(left, "left", right);

    return { left, right };
  }

  function handleWindowResize() {
    applyResponsiveWorkspacePaneLayout({ refresh: false });
    applyResponsiveTerminalLayout({ refresh: true });
  }

  function applyResponsiveWorkspacePaneLayout(options = {}) {
    const { refresh = true } = options;

    if (usesMobileLayout()) {
      resetWorkspacePaneLayout({ refresh });
      return;
    }

    const left = restoreWorkspacePaneWidth(STORAGE_KEYS.workspacePaneLeftWidth);
    const right = restoreWorkspacePaneWidth(STORAGE_KEYS.workspacePaneRightWidth);
    if (left === null && right === null) {
      resetWorkspacePaneLayout({ refresh });
      return;
    }

    applyWorkspacePaneSizes({ left, right }, { refresh });
  }

  function applyResponsiveTerminalLayout(options = {}) {
    const { refresh = true } = options;

    if (usesMobileLayout()) {
      resetDesktopTerminalLayout({ refresh });
      return;
    }

    const storedHeight = restoreTerminalPanelHeight();
    if (storedHeight === null) {
      resetDesktopTerminalLayout({ refresh });
      return;
    }

    applyTerminalPanelSize(storedHeight, { refresh });
  }

  function resetDesktopTerminalLayout(options = {}) {
    const { refresh = true } = options;
    if (state.layoutResizeFrameId) {
      window.cancelAnimationFrame(state.layoutResizeFrameId);
      state.layoutResizeFrameId = 0;
    }
    state.layoutResize = null;
    clearLayoutResizeUiState();
    elements.appShell?.style.removeProperty("--terminal-panel-size");
    syncTerminalPanelLayoutState("normal");
    if (refresh) {
      refreshWorkspaceLayout();
    }
  }

  function resetWorkspacePaneLayout(options = {}) {
    const { refresh = true } = options;
    elements.workspaceTop?.style.removeProperty("--workspace-pane-left-size");
    elements.workspaceTop?.style.removeProperty("--workspace-pane-right-size");
    syncWorkspacePaneCollapsedState({
      left: Number.POSITIVE_INFINITY,
      right: Number.POSITIVE_INFINITY,
    });
    if (refresh) {
      refreshWorkspaceLayout();
    }
  }

  function restoreWorkspacePaneWidth(storageKey) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === null) {
        return null;
      }

      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function restoreTerminalPanelHeight() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.terminalHeight);
      if (raw === null) {
        return null;
      }

      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function restorePersistedSelections() {
    state.selectedDeviceId = restoreStoredValue(STORAGE_KEYS.videoDevice);
    state.selectedAudioDeviceId = restoreStoredValue(STORAGE_KEYS.audioDevice);
    state.hasPersistedAudioSelection = hasStoredValue(STORAGE_KEYS.audioDevice);
  }

  function restoreThemePreference() {
    applyTheme(restoreStoredValue(STORAGE_KEYS.theme) || THEMES.dark);
  }

  function restoreAudioVolume() {
    const raw = restoreStoredValue(STORAGE_KEYS.audioVolume);
    if (raw === "") {
      return;
    }

    const parsed = clamp(Number(raw), 0, 1);
    state.audioVolume = Number.isFinite(parsed) ? parsed : 1;
  }

  function restoreStoredValue(key) {
    try {
      return localStorage.getItem(key) ?? "";
    } catch {
      return "";
    }
  }

  function persistStoredValue(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      return;
    }
  }

  function removeStoredValue(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      return;
    }
  }

  function hasStoredValue(key) {
    try {
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  }

  function persistTerminalPanelHeight(sizePx) {
    try {
      localStorage.setItem(STORAGE_KEYS.terminalHeight, String(Math.round(sizePx)));
    } catch {
      return;
    }
  }

  function persistWorkspacePaneSizes(sizes) {
    if (!sizes) {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEYS.workspacePaneLeftWidth, String(Math.round(sizes.left)));
      localStorage.setItem(STORAGE_KEYS.workspacePaneRightWidth, String(Math.round(sizes.right)));
    } catch {
      return;
    }
  }

  function getMaxTerminalPanelHeight() {
    const shellHeight = elements.appShell?.clientHeight || 0;
    const splitterHeight = elements.layoutSplitter?.offsetHeight || 0;
    return Math.max(shellHeight - splitterHeight - TERMINAL_MIN_WORKSPACE_HEIGHT, 0);
  }

  function getCurrentTerminalPanelHeight() {
    return Math.max(0, Math.round(elements.terminalPanel?.getBoundingClientRect().height || 0));
  }

  function applyWorkspacePaneSizes(partialSizes = {}, options = {}) {
    const { refresh = true } = options;
    if (!elements.workspaceTop) {
      return null;
    }

    const normalized = normalizeWorkspacePaneSizes(partialSizes);
    if (!normalized) {
      return null;
    }

    elements.workspaceTop.style.setProperty("--workspace-pane-left-size", `${normalized.left}px`);
    elements.workspaceTop.style.setProperty("--workspace-pane-right-size", `${normalized.right}px`);
    syncWorkspacePaneCollapsedState(normalized);
    if (refresh) {
      refreshWorkspaceLayout();
    }
    return normalized;
  }

  function syncWorkspacePaneCollapsedState(sizes) {
    if (!elements.myCropPanel || !elements.enemyCropPanel) {
      return;
    }

    elements.myCropPanel.dataset.collapsed = sizes.left === 0 ? "true" : "false";
    elements.enemyCropPanel.dataset.collapsed = sizes.right === 0 ? "true" : "false";
  }

  function applyTerminalPanelSize(sizePx, options = {}) {
    const { refresh = true } = options;
    if (!elements.appShell) {
      return null;
    }

    const resolved = resolveTerminalPanelLayoutSize(sizePx);
    elements.appShell.style.setProperty("--terminal-panel-size", `${resolved.size}px`);
    syncTerminalPanelLayoutState(resolved.mode);
    if (refresh) {
      refreshWorkspaceLayout();
    }
    return resolved.size;
  }

  function resolveTerminalPanelLayoutSize(sizePx) {
    const nextSize = clamp(Math.round(sizePx), 0, getMaxTerminalPanelHeight());
    if (nextSize === 0 || nextSize <= getTerminalCollapseThreshold()) {
      return {
        size: 0,
        mode: "collapsed",
      };
    }

    if (nextSize <= getTerminalCompactThreshold()) {
      return {
        size: Math.max(nextSize, getTerminalCompactMinHeight()),
        mode: "compact",
      };
    }

    return {
      size: snapNormalTerminalPanelHeight(nextSize),
      mode: "normal",
    };
  }

  function syncTerminalPanelLayoutState(mode) {
    if (!elements.terminalPanel || !elements.terminalScreen || !elements.terminalInput) {
      return;
    }

    const collapsed = mode === "collapsed";
    elements.terminalPanel.dataset.terminalMode = mode;
    elements.terminalPanel.dataset.collapsed = collapsed ? "true" : "false";

    if (collapsed && state.focusRestoreFrameId) {
      window.cancelAnimationFrame(state.focusRestoreFrameId);
      state.focusRestoreFrameId = 0;
    }

    if (
      collapsed
      && elements.terminalPanel.contains(document.activeElement)
      && document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }

    elements.terminalScreen.toggleAttribute("inert", collapsed);

    if (collapsed) {
      elements.terminalScreen.setAttribute("aria-hidden", "true");
      elements.terminalInput.setAttribute("tabindex", "-1");
      return;
    }

    elements.terminalScreen.removeAttribute("aria-hidden");
    elements.terminalInput.removeAttribute("tabindex");

    if (mode === "normal" && state.terminalLogPendingBottomScroll) {
      window.requestAnimationFrame(() => {
        if (elements.terminalPanel?.dataset.terminalMode !== "normal") {
          return;
        }
        scrollTerminalToBottom();
      });
    }
  }

  function setLayoutResizeUiState(axis, activeSplitter) {
    document.body.classList.add("is-layout-resizing");
    document.body.dataset.layoutResizeAxis = axis;
    elements.layoutSplitter?.classList.remove("is-active");
    elements.workspaceSplitterLeft?.classList.remove("is-active");
    elements.workspaceSplitterRight?.classList.remove("is-active");
    activeSplitter?.classList.add("is-active");
  }

  function clearLayoutResizeUiState() {
    elements.layoutSplitter?.classList.remove("is-active");
    elements.workspaceSplitterLeft?.classList.remove("is-active");
    elements.workspaceSplitterRight?.classList.remove("is-active");
    document.body.classList.remove("is-layout-resizing");
    document.body.removeAttribute("data-layout-resize-axis");
  }

  function startLayoutResize(event) {
    if (
      usesMobileLayout()
      || state.drag
      || state.layoutResize
      || event.button !== 0
      || !elements.appShell
      || !elements.layoutSplitter
    ) {
      return;
    }

    state.layoutResize = {
      pointerId: event.pointerId,
      type: "terminal",
      pendingSize: getCurrentTerminalPanelHeight(),
      splitter: elements.layoutSplitter,
    };

    if (elements.layoutSplitter.setPointerCapture) {
      elements.layoutSplitter.setPointerCapture(event.pointerId);
    }

    setLayoutResizeUiState("y", elements.layoutSplitter);
    queueLayoutResize(event.clientY);
    event.preventDefault();
  }

  function startWorkspacePaneResize(side, event) {
    const splitter = side === "left" ? elements.workspaceSplitterLeft : elements.workspaceSplitterRight;
    if (
      usesMobileLayout()
      || state.drag
      || state.layoutResize
      || event.button !== 0
      || !elements.workspaceTop
      || !splitter
    ) {
      return;
    }

    state.layoutResize = {
      pointerId: event.pointerId,
      type: "workspace-pane",
      side,
      pendingSize: getCurrentWorkspacePaneWidth(side),
      splitter,
    };

    if (splitter.setPointerCapture) {
      splitter.setPointerCapture(event.pointerId);
    }

    setLayoutResizeUiState("x", splitter);
    queueWorkspacePaneResize(side, event.clientX);
    event.preventDefault();
  }

  function updateLayoutResize(event) {
    if (!state.layoutResize || event.pointerId !== state.layoutResize.pointerId) {
      return;
    }

    if (state.layoutResize.type === "terminal") {
      queueLayoutResize(event.clientY);
    } else if (state.layoutResize.type === "workspace-pane") {
      queueWorkspacePaneResize(state.layoutResize.side, event.clientX);
    }
    event.preventDefault();
  }

  function queueLayoutResize(clientY) {
    if (!state.layoutResize || !elements.appShell) {
      return;
    }

    const shellRect = elements.appShell.getBoundingClientRect();
    const nextSize = clamp(Math.round(shellRect.bottom - clientY), 0, getMaxTerminalPanelHeight());
    state.layoutResize.pendingSize = nextSize;

    if (state.layoutResizeFrameId) {
      return;
    }

    state.layoutResizeFrameId = window.requestAnimationFrame(() => {
      state.layoutResizeFrameId = 0;
      if (!state.layoutResize) {
        return;
      }

      if (state.layoutResize.type === "terminal") {
        applyTerminalPanelSize(state.layoutResize.pendingSize, { refresh: true });
        return;
      }

      if (state.layoutResize.type === "workspace-pane") {
        applyWorkspacePaneSizes({ [state.layoutResize.side]: state.layoutResize.pendingSize }, { refresh: true });
      }
    });
  }

  function queueWorkspacePaneResize(side, clientX) {
    if (!state.layoutResize || !elements.workspaceTop) {
      return;
    }

    const workspaceRect = elements.workspaceTop.getBoundingClientRect();
    const oppositeSide = side === "left" ? "right" : "left";
    const rawSize = side === "left"
      ? clientX - workspaceRect.left
      : workspaceRect.right - clientX;
    const nextSize = clamp(
      Math.round(rawSize),
      WORKSPACE_PANE_MIN_WIDTH,
      getMaxWorkspacePaneWidth(side, getCurrentWorkspacePaneWidth(oppositeSide)),
    );
    state.layoutResize.pendingSize = nextSize;

    if (state.layoutResizeFrameId) {
      return;
    }

    state.layoutResizeFrameId = window.requestAnimationFrame(() => {
      state.layoutResizeFrameId = 0;
      if (!state.layoutResize) {
        return;
      }

      applyWorkspacePaneSizes({ [state.layoutResize.side]: state.layoutResize.pendingSize }, { refresh: true });
    });
  }

  function finishLayoutResize(event) {
    if (!state.layoutResize || event.pointerId !== state.layoutResize.pointerId) {
      return;
    }

    if (state.layoutResizeFrameId) {
      window.cancelAnimationFrame(state.layoutResizeFrameId);
      state.layoutResizeFrameId = 0;
    }

    if (state.layoutResize.type === "terminal") {
      const appliedSize = applyTerminalPanelSize(state.layoutResize.pendingSize, { refresh: true });
      if (appliedSize !== null && !usesMobileLayout()) {
        persistTerminalPanelHeight(appliedSize);
      }
    } else if (state.layoutResize.type === "workspace-pane") {
      const appliedSizes = applyWorkspacePaneSizes(
        { [state.layoutResize.side]: state.layoutResize.pendingSize },
        { refresh: true },
      );
      if (appliedSizes && !usesMobileLayout()) {
        persistWorkspacePaneSizes(appliedSizes);
      }
    }

    if (state.layoutResize.splitter?.releasePointerCapture) {
      try {
        state.layoutResize.splitter.releasePointerCapture(event.pointerId);
      } catch {
        // ignore pointer capture release errors from already-finished drags
      }
    }

    clearLayoutResizeUiState();
    state.layoutResize = null;
    state.lastLayoutResizeEndedAt = performance.now();
  }

  function getTerminalStatusLines() {
    return [
      `[system] mode: ${state.mode}`,
      `[system] auto: ${state.autoSnap.enabled ? "ON" : "OFF"}`,
      `[system] debug: ${state.debugMode ? "ON" : "OFF"}`,
      `[system] input: ${state.streamInfo?.ratioLabel || "unknown"}`,
      `[system] video: ${state.videoReady ? "ready" : "not ready"}`,
      `[system] audio: ${state.audioReady ? "ready" : "not ready"}`,
    ];
  }

  function clearTerminalOutput() {
    elements.terminalOutput.textContent = "";
    state.terminalLogAutoFollow = true;
    state.terminalLogPendingBottomScroll = false;
    scrollTerminalToBottom();
  }

  function handleLayoutResetCommand() {
    removeStoredValue(STORAGE_KEYS.terminalHeight);
    removeStoredValue(STORAGE_KEYS.workspacePaneLeftWidth);
    removeStoredValue(STORAGE_KEYS.workspacePaneRightWidth);
    resetWorkspacePaneLayout({ refresh: false });
    resetDesktopTerminalLayout({ refresh: false });
    refreshWorkspaceLayout();
    appendTerminalEntry(
      [
        "[system] splitter で調整したレイアウトを初期状態に戻しました。",
      ],
      "system",
    );
  }

  function handleCropResetCommand(target) {
    const dimensions = getStreamDimensions();
    if (!dimensions.width || !dimensions.height) {
      appendTerminalEntry(
        [
          "[error] 映像の準備ができていないため、クロップを初期状態に戻せません。",
        ],
        "error",
      );
      return;
    }

    const sides = target === "both" ? CROP_SIDES : [target];
    sides.forEach((side) => {
      updateCrop(side, getResetCrop(side, dimensions.width, dimensions.height), { save: true });
    });

    appendTerminalEntry(
      [
        target === "my"
          ? "[system] 自分側のクロップ範囲を初期状態に戻しました。"
          : target === "enemy"
            ? "[system] 相手側のクロップ範囲を初期状態に戻しました。"
            : "[system] 左右のクロップ範囲を初期状態に戻しました。",
      ],
      "system",
    );
  }

  function startCropInteraction(event) {
    if (!state.videoReady || state.mode !== "edit" || state.layoutResize || event.button !== 0) {
      return;
    }

    const overlay = event.currentTarget;
    const side = overlay?.dataset?.side;
    const crop = side ? state.crops[side] : null;
    if (!side || !crop) {
      return;
    }

    const displayedRect = getDisplayedVideoRect();
    if (!displayedRect) {
      return;
    }

    const mode = event.target === elements.cropSlots[side].handle ? "resize" : "move";
    state.drag = {
      side,
      pointerId: event.pointerId,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startCrop: { ...crop },
      pixelsToVideoX: getStreamDimensions().width / displayedRect.width,
      pixelsToVideoY: getStreamDimensions().height / displayedRect.height,
    };

    if (overlay.setPointerCapture) {
      overlay.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
  }

  function updateCropInteraction(event) {
    if (!state.drag || event.pointerId !== state.drag.pointerId) {
      return;
    }

    const deltaX = (event.clientX - state.drag.startX) * state.drag.pixelsToVideoX;
    const deltaY = (event.clientY - state.drag.startY) * state.drag.pixelsToVideoY;

    let nextCrop;
    if (state.drag.mode === "resize") {
      nextCrop = {
        ...state.drag.startCrop,
        width: state.drag.startCrop.width + deltaX,
        height: state.drag.startCrop.height + deltaY,
      };
    } else {
      nextCrop = {
        ...state.drag.startCrop,
        x: state.drag.startCrop.x + deltaX,
        y: state.drag.startCrop.y + deltaY,
      };
    }

    updateCrop(state.drag.side, nextCrop, { save: true });
  }

  function finishCropInteraction(event) {
    if (!state.drag || event.pointerId !== state.drag.pointerId) {
      return;
    }

    state.drag = null;
    state.lastCropInteractionEndedAt = performance.now();
  }

  function updateCrop(side, nextCrop, options = {}) {
    const { save = true } = options;
    const dimensions = getStreamDimensions();
    if (!dimensions.width || !dimensions.height) {
      return;
    }

    state.crops[side] = clampCrop(nextCrop, dimensions.width, dimensions.height);
    renderCropOverlays();
    updatePreviewCanvasSize(side);
    if (state.mode === "edit") {
      drawCropPanel(side);
    }

    if (save && shouldPersistCrop()) {
      persistCrop(side, state.crops[side], dimensions.width, dimensions.height);
    }

    syncAutoSnapMonitoring();
  }

  function handleFullscreenChange() {
    syncFullscreenButton();
    applyResponsiveWorkspacePaneLayout({ refresh: false });
    applyResponsiveTerminalLayout({ refresh: true });
  }

  function refreshWorkspaceLayout() {
    updateVideoStageLayout();
    CROP_SIDES.forEach((side) => {
      updatePreviewCanvasLayout(side);
      drawCropPanel(side);
    });
    renderCropOverlays();
  }

  function updateVideoStageLayout() {
    const shell = elements.videoStageShell;
    if (!shell) {
      return;
    }

    const fittedRect = fitAspectRect(
      shell.clientWidth,
      shell.clientHeight,
      ASPECT_16_BY_9,
    );

    if (!fittedRect) {
      return;
    }

    elements.videoStage.style.width = `${fittedRect.width}px`;
    elements.videoStage.style.height = `${fittedRect.height}px`;
  }

  function updatePreviewCanvasLayout(side) {
    const slot = elements.cropSlots[side];
    const shell = slot?.shell;
    if (!shell) {
      return;
    }

    const cropAspect = getPreviewAspect(side);
    const fittedRect = fitAspectRect(
      shell.clientWidth,
      shell.clientHeight,
      cropAspect,
    );

    if (!fittedRect) {
      return;
    }

    slot.canvas.style.width = `${fittedRect.width}px`;
    slot.canvas.style.height = `${fittedRect.height}px`;
  }

  function fitAspectRect(containerWidth, containerHeight, aspectRatio) {
    if (!containerWidth || !containerHeight || !aspectRatio || aspectRatio <= 0) {
      return null;
    }

    let width = containerWidth;
    let height = width / aspectRatio;

    if (height > containerHeight) {
      height = containerHeight;
      width = height * aspectRatio;
    }

    return {
      width: Math.max(1, Math.floor(width)),
      height: Math.max(1, Math.floor(height)),
    };
  }

  function renderCropOverlays() {
    const displayedRect = getDisplayedVideoRect();
    const dimensions = getStreamDimensions();
    if (!displayedRect || !dimensions.width || !dimensions.height) {
      CROP_SIDES.forEach((side) => elements.cropSlots[side].overlay.classList.add("is-hidden"));
      hideAutoDebugOverlays();
      return;
    }

    const scaleX = displayedRect.width / dimensions.width;
    const scaleY = displayedRect.height / dimensions.height;

    CROP_SIDES.forEach((side) => {
      const crop = state.crops[side];
      const overlay = elements.cropSlots[side].overlay;
      if (!state.videoReady || !crop || state.mode !== "edit") {
        overlay.classList.add("is-hidden");
        return;
      }

      overlay.style.left = `${displayedRect.offsetX + crop.x * scaleX}px`;
      overlay.style.top = `${displayedRect.offsetY + crop.y * scaleY}px`;
      overlay.style.width = `${crop.width * scaleX}px`;
      overlay.style.height = `${crop.height * scaleY}px`;
      overlay.classList.remove("is-hidden");
    });

    renderAutoDebugOverlays(displayedRect, scaleX, scaleY);
  }

  function renderAutoDebugOverlays(displayedRect, scaleX, scaleY) {
    if (!shouldShowAutoDebugOverlays()) {
      hideAutoDebugOverlays();
      return;
    }

    const roiCrops = getAutoDebugOverlayCrops();
    renderDebugOverlayBox(elements.autoDebugOverlays.my, state.crops.my, displayedRect, scaleX, scaleY);
    renderDebugOverlayBox(elements.autoDebugOverlays.enemy, state.crops.enemy, displayedRect, scaleX, scaleY);
    renderDebugOverlayBox(elements.autoDebugOverlays.loading, roiCrops.loadingTemplate, displayedRect, scaleX, scaleY);
    renderDebugOverlayBox(elements.autoDebugOverlays.leftBadge, roiCrops.leftBadgeStrip, displayedRect, scaleX, scaleY);
    renderDebugOverlayBox(elements.autoDebugOverlays.doneBar, roiCrops.bottomDoneBar, displayedRect, scaleX, scaleY);
    renderDebugOverlayBox(elements.autoDebugOverlays.selectionTimer, roiCrops.selectionTimerIcon, displayedRect, scaleX, scaleY);
    renderDebugOverlayBox(elements.autoDebugOverlays.topTimer, roiCrops.waitingTimerIcon, displayedRect, scaleX, scaleY);
    renderDebugOverlayBox(elements.autoDebugOverlays.battleHud, roiCrops.battleHud, displayedRect, scaleX, scaleY);
  }

  function shouldShowAutoDebugOverlays() {
    return Boolean(
      state.debugMode
      && state.autoSnap.enabled
      && state.videoReady
      && state.mode === "ready"
      && state.crops.my
      && state.crops.enemy,
    );
  }

  function hideAutoDebugOverlays() {
    if (!elements.autoDebugOverlays) {
      return;
    }

    Object.values(elements.autoDebugOverlays).forEach((overlay) => {
      overlay?.classList.add("is-hidden");
    });
  }

  function renderDebugOverlayBox(overlay, crop, displayedRect, scaleX, scaleY) {
    if (!overlay || !crop) {
      overlay?.classList.add("is-hidden");
      return;
    }

    overlay.style.left = `${displayedRect.offsetX + crop.x * scaleX}px`;
    overlay.style.top = `${displayedRect.offsetY + crop.y * scaleY}px`;
    overlay.style.width = `${crop.width * scaleX}px`;
    overlay.style.height = `${crop.height * scaleY}px`;
    overlay.classList.remove("is-hidden");
  }

  function getAutoDebugOverlayCrops() {
    return {
      loadingTemplate: getAutoRoiCrop("loadingTemplate"),
      leftBadgeStrip: getAutoRoiCrop("leftBadgeStrip"),
      bottomDoneBar: getAutoRoiCrop("bottomDoneBar"),
      selectionTimerIcon: getAutoRoiCrop("selectionTimerIcon"),
      waitingTimerIcon: getAutoRoiCrop("waitingTimerIcon"),
      battleHud: getAutoRoiCrop("battleHud"),
    };
  }

  function updatePreviewCanvasSize(side) {
    const slot = elements.cropSlots[side];
    const sourceSize = getPreviewSourceSize(side);
    if (!slot) {
      return;
    }

    if (!sourceSize) {
      slot.shell.dataset.ready = "false";
      return;
    }

    const width = Math.max(1, Math.round(sourceSize.width));
    const height = Math.max(1, Math.round(sourceSize.height));
    if (slot.canvas.width !== width || slot.canvas.height !== height) {
      slot.canvas.width = width;
      slot.canvas.height = height;
    }

    slot.shell.dataset.ready = "true";
    updatePreviewCanvasLayout(side);
  }

  function startPreviewLoop() {
    stopPreviewLoop();

    const draw = () => {
      if (!state.videoReady || !state.stream || state.mode !== "edit") {
        return;
      }

      drawCropPanel("my");
      drawCropPanel("enemy");
      state.previewFrameId = window.requestAnimationFrame(draw);
    };

    state.previewFrameId = window.requestAnimationFrame(draw);
  }

  function stopPreviewLoop() {
    if (state.previewFrameId) {
      window.cancelAnimationFrame(state.previewFrameId);
      state.previewFrameId = 0;
    }
  }

  function drawCropPanel(side) {
    const canvas = elements.cropSlots[side].canvas;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);

    if (state.mode === "edit" && state.videoReady && state.stream) {
      const crop = state.crops[side];
      if (!crop) {
        elements.cropSlots[side].shell.dataset.ready = "false";
        return;
      }

      elements.cropSlots[side].shell.dataset.ready = "true";
      context.drawImage(
        elements.video,
        Math.round(crop.x),
        Math.round(crop.y),
        Math.round(crop.width),
        Math.round(crop.height),
        0,
        0,
        canvas.width,
        canvas.height,
      );
      return;
    }

    const reference = state.references[side];
    if (!reference) {
      elements.cropSlots[side].shell.dataset.ready = "false";
      return;
    }

    elements.cropSlots[side].shell.dataset.ready = "true";
    context.drawImage(reference, 0, 0, canvas.width, canvas.height);
  }

  function stopCurrentStream() {
    stopPreviewLoop();
    stopAutoSnapMonitor();
    resetAutoSnapCycle("映像停止");
    stopSelectedAudioInput();

    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
      state.stream = null;
    }

    state.streamInfo = null;
    state.videoReady = false;
    elements.videoStage.dataset.ready = "false";
    CROP_SIDES.forEach((side) => {
      elements.cropSlots[side].overlay.classList.add("is-hidden");
    });
    elements.video.srcObject = null;
    renderCameraDetails();
    refreshCropPanels();
    refreshWorkspaceLayout();
  }

  function setCameraState(message, tone) {
    elements.cameraState.textContent = message;
    elements.cameraState.dataset.tone = tone;
  }

  function renderCameraDetails() {
    return;
  }

  function setMode(nextMode, options = {}) {
    const { suppressTerminalMessage = false } = options;
    if (state.mode === nextMode) {
      return;
    }

    state.mode = nextMode;
    if (nextMode === "edit" && state.videoReady) {
      startPreviewLoop();
    } else {
      stopPreviewLoop();
    }
    if (nextMode !== "ready") {
      resetAutoSnapCycle("ready 待ち");
    }
    refreshCropPanels();
    renderCropOverlays();
    syncAutoSnapMonitoring();
    if (nextMode === "edit" && state.streamInfo?.isSixteenByNine) {
      appendTerminalNotice(
        "edit-16-9-session",
        [
          "[system] 16:9 入力では固定クロップが基準です。edit の調整はこのセッションだけ有効です。",
        ],
        "system",
      );
    }
    if (!suppressTerminalMessage) {
      appendTerminalEntry(
        [
          nextMode === "edit"
            ? "[system] edit に入りました。ドラッグまたは右下ハンドルで範囲を調整できます。"
            : "[system] ready に戻りました。クロップ調整を終えて待機中です。空 Enter または Ctrl + Enter で撮影できます。",
        ],
        "system",
      );
    }
  }

  async function handleSnapCommand(target, options = {}) {
    const { source = "manual", reason = "" } = options;

    try {
      const message = performSnapCapture(target);
      appendTerminalEntry(
        [
          source === "auto"
            ? `[auto] ${message}`
            : `[system] ${message}`,
        ],
        "success",
      );
      if (source === "auto" && reason) {
        appendTerminalDebug([`[debug] 自動撮影の詳細: ${reason}`]);
      }
    } catch (error) {
      appendTerminalError("[error] 参照画像の更新に失敗しました。", error);
    }
  }

  function performSnapCapture(target, options = {}) {
    const { frameSource = null } = options;
    const sides = target === "both" ? CROP_SIDES : [target];
    const needsLiveVideo = !frameSource;

    if (needsLiveVideo && (!state.videoReady || !state.stream)) {
      throw new Error("映像がまだ準備できていないため、撮影できません。");
    }

    sides.forEach((side) => {
      const frame = frameSource?.[side]
        ? cloneReferenceFrame(frameSource[side])
        : captureReferenceFrameFromVideo(side);
      state.references[side] = frame;
    });

    refreshCropPanels();

    if (target === "my") {
      return "自分側の参照画像を更新しました。";
    }

    if (target === "enemy") {
      return "相手側の参照画像を更新しました。";
    }

    return "左右の参照画像を更新しました。";
  }

  function clearReferenceImages(options = {}) {
    const { source = "system", reason = "" } = options;
    const hadReferences = CROP_SIDES.some((side) => Boolean(state.references[side]));
    CROP_SIDES.forEach((side) => {
      state.references[side] = null;
    });
    refreshCropPanels();

    if (!hadReferences) {
      return false;
    }

    appendTerminalEntry(
      [
        source === "auto"
          ? `[auto] ${reason ? `${reason}、` : ""}前回の参照画像をクリアしました。`
          : `[system] ${reason ? `${reason}、` : ""}前回の参照画像をクリアしました。`,
      ],
      "system",
    );
    return true;
  }

  function handleAutoCommand(arg) {
    const action = arg || "status";

    if (action === "on") {
      setAutoSnapEnabled(true);
      return;
    }

    if (action === "off") {
      setAutoSnapEnabled(false);
      return;
    }

    if (action === "reset") {
      resetAutoSnapCycle("manual reset");
      syncAutoSnapMonitoring();
      appendTerminalEntry(
        [
          "[auto] 検出状態をリセットしました。次の選出画面から再監視します。",
        ],
        "system",
      );
      return;
    }

    if (action === "status") {
      appendTerminalEntry(getAutoStatusLines(), "system");
      return;
    }

    appendTerminalEntry(
      [
        "[error] auto は on / off / status / reset を指定できます。",
      ],
      "error",
    );
  }

  function setAutoSnapEnabled(enabled) {
    if (state.autoSnap.enabled === enabled) {
      appendTerminalEntry(
        [
          enabled ? "[auto] すでに ON です。" : "[auto] すでに OFF です。",
        ],
        "system",
      );
      return;
    }

    state.autoSnap.enabled = enabled;
    resetAutoSnapCycle(enabled ? "auto on" : "auto off");

    if (enabled) {
      if (state.mode !== "ready") {
        setMode("ready", { suppressTerminalMessage: true });
      } else {
        syncAutoSnapMonitoring();
      }
      appendTerminalEntry(
        [
          state.streamInfo && !state.streamInfo.isSixteenByNine
            ? "[auto] 自動 snap を ON にし、ready に切り替えました。16:9 入力に切り替わるまで監視は待機します。"
            : "[auto] 自動 snap を ON にし、ready に切り替えました。クロップ調整を終えた待機状態で監視を始めます。",
        ],
        "system",
      );
      return;
    }

    stopAutoSnapMonitor();
    appendTerminalEntry(
      [
        "[auto] 自動 snap を OFF にしました。",
      ],
      "system",
    );
  }

  function handleDebugCommand(arg) {
    const action = arg || "status";

    if (action === "on") {
      setDebugMode(true);
      return;
    }

    if (action === "off") {
      setDebugMode(false);
      return;
    }

    if (action === "status") {
      appendTerminalEntry(getDebugStatusLines(), "system");
      return;
    }

    appendTerminalEntry(
      [
        "[error] debug は on / off / status を指定できます。",
      ],
      "error",
    );
  }

  function setDebugMode(enabled) {
    if (state.debugMode === enabled) {
      appendTerminalEntry(
        [
          enabled ? "[debug] すでに ON です。" : "[debug] すでに OFF です。",
        ],
        "system",
      );
      return;
    }

    state.debugMode = enabled;
    renderCropOverlays();
    appendTerminalEntry(
      [
        enabled
          ? "[debug] デバッグ表示を ON にしました。自動 snap の認識範囲を表示可能にしました。"
          : "[debug] デバッグ表示を OFF にしました。認識範囲を非表示にしました。",
      ],
      "system",
    );
  }

  function getDebugStatusLines() {
    const lines = [
      `[debug] ${state.debugMode ? "ON" : "OFF"}`,
      `[debug] 認識範囲表示: ${shouldShowAutoDebugOverlays() ? "表示中" : "非表示"}`,
    ];

    if (!state.videoReady) {
      lines.push("[debug] 映像の準備ができていないため、認識範囲は表示されません。");
    } else if (state.mode !== "ready") {
      lines.push("[debug] 認識範囲は ready モード中のみ表示されます。");
    } else if (!state.autoSnap.enabled) {
      lines.push("[debug] auto が OFF のため、認識範囲は表示されません。");
    }

    return lines;
  }

  function syncAutoSnapMonitoring() {
    if (canRunAutoSnapMonitor()) {
      startAutoSnapMonitor();
      return;
    }

    stopAutoSnapMonitor();
  }

  function canRunAutoSnapMonitor() {
    return Boolean(
      state.autoSnap.enabled
      && state.mode === "ready"
      && state.videoReady
      && state.stream
      && state.streamInfo?.isSixteenByNine
      && state.crops.my
      && state.crops.enemy,
    );
  }

  function startAutoSnapMonitor() {
    if (state.autoSnap.monitorActive) {
      return;
    }

    state.autoSnap.monitorActive = true;
    state.autoSnap.lastFrameAt = 0;
    queueAutoSnapFrame();
  }

  function queueAutoSnapFrame() {
    const auto = state.autoSnap;
    if (!auto.monitorActive || auto.frameId) {
      return;
    }

    if (typeof elements.video.requestVideoFrameCallback === "function") {
      auto.frameRequestKind = "video";
      auto.frameId = elements.video.requestVideoFrameCallback(handleAutoSnapVideoFrame);
      return;
    }

    auto.frameRequestKind = "raf";
    auto.frameId = window.requestAnimationFrame(handleAutoSnapAnimationFrame);
  }

  function handleAutoSnapVideoFrame(now) {
    const auto = state.autoSnap;
    auto.frameId = 0;
    auto.lastFrameAt = now;

    if (!canRunAutoSnapMonitor()) {
      auto.monitorActive = false;
      auto.frameRequestKind = "";
      return;
    }

    runAutoSnapDetection(Date.now());
    queueAutoSnapFrame();
  }

  function handleAutoSnapAnimationFrame(now) {
    const auto = state.autoSnap;
    auto.frameId = 0;
    auto.lastFrameAt = now;

    if (!canRunAutoSnapMonitor()) {
      auto.monitorActive = false;
      auto.frameRequestKind = "";
      return;
    }

    runAutoSnapDetection(Date.now());
    queueAutoSnapFrame();
  }

  function stopAutoSnapMonitor() {
    if (state.autoSnap.frameId) {
      if (
        state.autoSnap.frameRequestKind === "video"
        && typeof elements.video.cancelVideoFrameCallback === "function"
      ) {
        elements.video.cancelVideoFrameCallback(state.autoSnap.frameId);
      } else {
        window.cancelAnimationFrame(state.autoSnap.frameId);
      }
      state.autoSnap.frameId = 0;
    }

    state.autoSnap.monitorActive = false;
    state.autoSnap.lastFrameAt = 0;
    state.autoSnap.frameRequestKind = "";
  }

  function resetAutoSnapCycle(reason = "") {
    state.autoSnap.phase = "idle";
    state.autoSnap.loadingFrames = 0;
    state.autoSnap.selectionFrames = 0;
    state.autoSnap.lockedFrames = 0;
    state.autoSnap.loadingSeenAt = 0;
    state.autoSnap.selectionSeenAt = 0;
    state.autoSnap.selectionLockedAt = 0;
    state.autoSnap.waitingIconSeenAt = 0;
    state.autoSnap.lockedBaseline = null;
    state.autoSnap.fallbackBuffer = null;
    state.autoSnap.lastMetrics = null;
    state.autoSnap.lastReason = reason || getAutoIdleReason();
    state.autoSnap.lastTriggerReason = "";
    state.autoSnap.lastResetReason = reason || "manual reset";
    state.autoSnap.lastSnapMode = "";
  }

  function getAutoIdleReason() {
    if (!state.streamInfo?.isSixteenByNine) {
      return "16:9 入力待ち";
    }

    return "loading 待ち";
  }

  function runAutoSnapDetection(now = Date.now()) {
    const auto = state.autoSnap;
    const metrics = captureAutoSnapMetrics();
    if (!metrics) {
      auto.lastReason = "ROI がまだ揃っていません。";
      return;
    }

    auto.lastMetrics = metrics;
    if (auto.phase === "idle" || auto.phase === "snapped") {
      const loadingSignal = getLoadingTemplateSignal(metrics);
      if (!loadingSignal.matched) {
        auto.loadingFrames = 0;
        auto.lastReason = loadingSignal.templateReady
          ? `loading 待ち coverage=${formatAutoMetric(loadingSignal.coverageScore)} spill=${formatAutoMetric(loadingSignal.spillScore)} dark=${formatAutoMetric(loadingSignal.darkBackground)}`
          : "loading テンプレートの読み込み待ちです。";
        return;
      }

      auto.loadingFrames += 1;
      auto.lastReason = `loading ${auto.loadingFrames}/${AUTO_SNAP_CONFIG.stableFrames.loading} coverage=${formatAutoMetric(loadingSignal.coverageScore)} spill=${formatAutoMetric(loadingSignal.spillScore)} dark=${formatAutoMetric(loadingSignal.darkBackground)}`;
      if (auto.loadingFrames < AUTO_SNAP_CONFIG.stableFrames.loading) {
        return;
      }

      auto.phase = "loading_seen";
      auto.loadingFrames = 0;
      auto.selectionFrames = 0;
      auto.lockedFrames = 0;
      auto.loadingSeenAt = 0;
      auto.selectionSeenAt = 0;
      auto.selectionLockedAt = 0;
      auto.waitingIconSeenAt = 0;
      auto.lockedBaseline = null;
      auto.fallbackBuffer = null;
      auto.lastSnapMode = "";
      auto.lastTriggerReason = "";
      auto.loadingSeenAt = now;
      auto.lastReason = `loading を検出 coverage=${formatAutoMetric(loadingSignal.coverageScore)} spill=${formatAutoMetric(loadingSignal.spillScore)} dark=${formatAutoMetric(loadingSignal.darkBackground)} offset=${loadingSignal.offsetX},${loadingSignal.offsetY}`;
      appendTerminalDebug(
        [
          `[debug] 読み込み中 を検出しました。 ${auto.lastReason}`,
        ],
      );
      return;
    }

    if (auto.phase === "loading_seen") {
      if (now - auto.loadingSeenAt > AUTO_SNAP_CONFIG.timeoutsMs.loadingToSelection) {
        resetAutoSnapCycle("loading -> selection timeout");
        return;
      }

      const selectionSignal = getSelectionTimerSignal(metrics);
      if (!selectionSignal.matched) {
        auto.selectionFrames = 0;
        auto.lastReason = selectionSignal.templateReady
          ? `選出タイマー待ち coverage=${formatAutoMetric(selectionSignal.coverageScore)} spill=${formatAutoMetric(selectionSignal.spillScore)} dark=${formatAutoMetric(selectionSignal.darkBackground)}`
          : "選出タイマーテンプレートの読み込み待ちです。";
        return;
      }

      auto.selectionFrames += 1;
      auto.lastReason = `selection ${auto.selectionFrames}/${AUTO_SNAP_CONFIG.stableFrames.selection} coverage=${formatAutoMetric(selectionSignal.coverageScore)} spill=${formatAutoMetric(selectionSignal.spillScore)} dark=${formatAutoMetric(selectionSignal.darkBackground)}`;
      if (auto.selectionFrames < AUTO_SNAP_CONFIG.stableFrames.selection) {
        return;
      }

      auto.phase = "selection_active";
      auto.selectionFrames = 0;
      auto.selectionSeenAt = now;
      auto.lockedFrames = 0;
      clearReferenceImages({
        source: "auto",
        reason: "選出画面に入ったため",
      });
      auto.lastReason = `選出タイマーを検出 coverage=${formatAutoMetric(selectionSignal.coverageScore)} spill=${formatAutoMetric(selectionSignal.spillScore)} dark=${formatAutoMetric(selectionSignal.darkBackground)} offset=${selectionSignal.offsetX},${selectionSignal.offsetY}`;
      appendTerminalDebug(
        [
          `[debug] 選出画面のタイマーを検出しました。 ${auto.lastReason}`,
        ],
      );
      return;
    }

    if (auto.phase === "selection_active") {
      const lockedSignal = getSelectionLockedSignal(metrics);
      const timerIconSignal = getWaitingTimerIconSignal(metrics);
      if (lockedSignal.matched) {
        auto.lockedFrames += 1;
        auto.lastReason = `locked ${auto.lockedFrames}/${AUTO_SNAP_CONFIG.stableFrames.locked} badgeWhite=${formatAutoMetric(lockedSignal.badgeWhite)} bar=${formatAutoMetric(lockedSignal.barBright)}/${formatAutoMetric(lockedSignal.barBlue)}`;
        if (auto.lockedFrames >= AUTO_SNAP_CONFIG.stableFrames.locked) {
          auto.phase = "selection_locked";
          auto.lockedFrames = 0;
          auto.selectionLockedAt = now;
          auto.waitingIconSeenAt = 0;
          auto.lockedBaseline = buildLockedBaseline(metrics);
          auto.fallbackBuffer = null;
          auto.lastReason = `選出完了をラッチ badgeWhite=${formatAutoMetric(lockedSignal.badgeWhite)} bar=${formatAutoMetric(lockedSignal.barBright)}/${formatAutoMetric(lockedSignal.barBlue)}`;
          appendTerminalDebug(
            [
              `[debug] 選出完了を検出しました。 ${auto.lastReason}`,
            ],
          );
        }
      } else {
        auto.lockedFrames = 0;
      }

      if (timerIconSignal.matched) {
        if (triggerWaitingTimerSnap(metrics, now, {
          latched: auto.phase === "selection_locked",
          sourcePhase: "selection_active",
        })) {
          return;
        }
      }

      if (auto.phase === "selection_locked") {
        return;
      }

      const selectionSignal = getSelectionTimerSignal(metrics);
      auto.lastReason = selectionSignal.matched
        ? `待機タイマー優先 / ラッチ補助 badgeWhite=${formatAutoMetric(lockedSignal.badgeWhite)} bar=${formatAutoMetric(lockedSignal.barBright)}/${formatAutoMetric(lockedSignal.barBlue)} icon=${formatAutoMetric(timerIconSignal.coverageScore)}/${formatAutoMetric(timerIconSignal.spillScore)}`
        : `選出タイマー待ち coverage=${formatAutoMetric(selectionSignal.coverageScore)} spill=${formatAutoMetric(selectionSignal.spillScore)} dark=${formatAutoMetric(selectionSignal.darkBackground)}`;
      return;
    }

    if (auto.phase === "selection_locked") {
      const battleHudSignal = getBattleHudSignal(metrics);
      const timerIconSignal = getWaitingTimerIconSignal(metrics);
      auto.lastReason = timerIconSignal.templateReady
        ? `待機タイマー待ち coverage=${formatAutoMetric(timerIconSignal.coverageScore)} spill=${formatAutoMetric(timerIconSignal.spillScore)} dark=${formatAutoMetric(timerIconSignal.darkBackground)} battleHud=${formatAutoMetric(battleHudSignal.hudAccent)}`
        : "待機タイマー画像の読み込み待ちです。";
      if (timerIconSignal.matched) {
        triggerWaitingTimerSnap(metrics, now, {
          latched: true,
          sourcePhase: "selection_locked",
        });
      }
      return;
    }

    if (auto.phase !== "waiting_icon_seen") {
      return;
    }

    const battleHudSignal = getBattleHudSignal(metrics);
    auto.lastReason = `待機タイマー後 fallback 待ち battleHud=${formatAutoMetric(battleHudSignal.hudAccent)} bright=${formatAutoMetric(battleHudSignal.hudBright)} enemyListVisible=${battleHudSignal.enemyListStillVisible ? "yes" : "no"}`;
    if (battleHudSignal.matched) {
      triggerAutoFallback("battle_hud");
      return;
    }
  }

  function captureAutoSnapMetrics() {
    if (!state.videoReady || !state.stream || !state.crops.my || !state.crops.enemy) {
      return null;
    }

    const roiCrops = {
      loadingTemplate: getAutoRoiCrop("loadingTemplate"),
      selectionTimerIcon: getAutoRoiCrop("selectionTimerIcon"),
      selectionRight: getAutoRoiCrop("selectionRight"),
      leftBadgeStrip: getAutoRoiCrop("leftBadgeStrip"),
      bottomDoneBar: getAutoRoiCrop("bottomDoneBar"),
      waitingTimerIcon: getAutoRoiCrop("waitingTimerIcon"),
      battleHud: getAutoRoiCrop("battleHud"),
    };

    if (Object.values(roiCrops).some((crop) => !crop)) {
      return null;
    }

    return {
      loadingTemplate: matchAutoTemplate(roiCrops.loadingTemplate, "loading"),
      selectionTimerIcon: matchAutoTemplate(roiCrops.selectionTimerIcon, "selectionTimer"),
      selectionRight: sampleVideoRegionMetrics(roiCrops.selectionRight),
      leftBadgeStrip: sampleVideoRegionMetrics(roiCrops.leftBadgeStrip),
      bottomDoneBar: sampleVideoRegionMetrics(roiCrops.bottomDoneBar),
      waitingTimerIcon: matchAutoTemplate(roiCrops.waitingTimerIcon, "waitingTimer"),
      battleHud: sampleVideoRegionMetrics(roiCrops.battleHud),
    };
  }

  function getAutoRoiCrop(key) {
    const dimensions = getStreamDimensions();
    const roi = AUTO_SNAP_CONFIG.rois[key];
    if (!dimensions.width || !dimensions.height || !roi) {
      return null;
    }

    return clampAutoRoiCrop(
      {
        x: dimensions.width * roi.x,
        y: dimensions.height * roi.y,
        width: dimensions.width * roi.width,
        height: dimensions.height * roi.height,
      },
      dimensions.width,
      dimensions.height,
    );
  }

  function clampAutoRoiCrop(crop, videoWidth, videoHeight) {
    const width = clamp(Math.round(crop.width || 1), 1, videoWidth);
    const height = clamp(Math.round(crop.height || 1), 1, videoHeight);
    const x = clamp(Math.round(crop.x || 0), 0, Math.max(0, videoWidth - width));
    const y = clamp(Math.round(crop.y || 0), 0, Math.max(0, videoHeight - height));
    return { x, y, width, height };
  }

  function sampleVideoRegionMetrics(crop) {
    const sourceWidth = Math.max(1, Math.round(crop.width));
    const sourceHeight = Math.max(1, Math.round(crop.height));
    const targetWidth = AUTO_SNAP_CONFIG.detectorSampleMaxWidth;
    const targetHeight = clamp(
      Math.round((sourceHeight / sourceWidth) * targetWidth),
      AUTO_SNAP_CONFIG.detectorSampleMinHeight,
      AUTO_SNAP_CONFIG.detectorSampleMaxHeight,
    );
    const context = getAutoDetectorContext(targetWidth, targetHeight);
    if (!context) {
      return {
        bright: 0,
        dark: 0,
        blue: 0,
        red: 0,
        green: 0,
        yellow: 0,
        cyan: 0,
        white: 0,
        lavender: 0,
        chroma: 0,
      };
    }

    context.clearRect(0, 0, targetWidth, targetHeight);
    context.drawImage(
      elements.video,
      Math.round(crop.x),
      Math.round(crop.y),
      sourceWidth,
      sourceHeight,
      0,
      0,
      targetWidth,
      targetHeight,
    );

    const imageData = context.getImageData(0, 0, targetWidth, targetHeight).data;
    let total = 0;
    let bright = 0;
    let dark = 0;
    let blue = 0;
    let red = 0;
    let green = 0;
    let yellow = 0;
    let cyan = 0;
    let white = 0;
    let lavender = 0;
    let chroma = 0;

    for (let index = 0; index < imageData.length; index += 4) {
      const r = imageData[index];
      const g = imageData[index + 1];
      const b = imageData[index + 2];
      const maxValue = Math.max(r, g, b);
      const minValue = Math.min(r, g, b);
      total += 1;

      if (maxValue > 185) {
        bright += 1;
      }
      if (maxValue < 55) {
        dark += 1;
      }
      if (b > 110 && b > r * 1.12 && b > g * 1.04) {
        blue += 1;
      }
      if (r > 115 && r > g * 1.18 && r > b * 1.18) {
        red += 1;
      }
      if (g > 120 && g > r * 1.08 && g > b * 0.95) {
        green += 1;
      }
      if (r > 150 && g > 135 && b < 125) {
        yellow += 1;
      }
      if (g > 120 && b > 130 && g > r * 1.08 && b > r * 1.1) {
        cyan += 1;
      }
      if (maxValue > 190 && minValue > 148) {
        white += 1;
      }
      if (r > 110 && b > 135 && g > 72 && r > g * 1.05 && b > g * 1.08) {
        lavender += 1;
      }
      if (maxValue - minValue > 45 && maxValue > 70) {
        chroma += 1;
      }
    }

    return {
      bright: bright / total,
      dark: dark / total,
      blue: blue / total,
      red: red / total,
      green: green / total,
      yellow: yellow / total,
      cyan: cyan / total,
      white: white / total,
      lavender: lavender / total,
      chroma: chroma / total,
    };
  }

  function getAutoDetectorContext(width, height) {
    if (!state.autoSnap.detectorCanvas) {
      state.autoSnap.detectorCanvas = document.createElement("canvas");
    }

    if (
      state.autoSnap.detectorCanvas.width !== width
      || state.autoSnap.detectorCanvas.height !== height
    ) {
      state.autoSnap.detectorCanvas.width = width;
      state.autoSnap.detectorCanvas.height = height;
      state.autoSnap.detectorContext = state.autoSnap.detectorCanvas.getContext("2d", {
        willReadFrequently: true,
      });
    }

    return state.autoSnap.detectorContext;
  }

  function getAutoIconDetectorContext(width, height) {
    if (!state.autoSnap.iconDetectorCanvas) {
      state.autoSnap.iconDetectorCanvas = document.createElement("canvas");
    }

    if (
      state.autoSnap.iconDetectorCanvas.width !== width
      || state.autoSnap.iconDetectorCanvas.height !== height
    ) {
      state.autoSnap.iconDetectorCanvas.width = width;
      state.autoSnap.iconDetectorCanvas.height = height;
      state.autoSnap.iconDetectorContext = state.autoSnap.iconDetectorCanvas.getContext("2d", {
        willReadFrequently: true,
      });
    }

    return state.autoSnap.iconDetectorContext;
  }

  function getLoadingTemplateSignal(metrics) {
    return metrics.loadingTemplate;
  }

  function getSelectionTimerSignal(metrics) {
    return metrics.selectionTimerIcon;
  }

  function getSelectionLockedSignal(metrics) {
    const badge = metrics.leftBadgeStrip;
    const bar = metrics.bottomDoneBar;
    const threshold = AUTO_SNAP_CONFIG.thresholds.locked;
    return {
      badgeWhite: badge.white,
      barBright: bar.bright,
      barBlue: bar.blue,
      matched: badge.white >= threshold.badgeWhiteMin
        && bar.bright >= threshold.barBrightMin
        && bar.blue >= threshold.barBlueMin,
    };
  }

  function buildLockedBaseline(metrics) {
    return {
      selectionRight: { ...metrics.selectionRight },
      leftBadgeStrip: { ...metrics.leftBadgeStrip },
      bottomDoneBar: { ...metrics.bottomDoneBar },
    };
  }

  function triggerWaitingTimerSnap(metrics, now, options = {}) {
    const { latched = false, sourcePhase = "selection_active" } = options;
    const auto = state.autoSnap;
    const timerIconSignal = getWaitingTimerIconSignal(metrics);
    if (!timerIconSignal.matched) {
      return false;
    }

    auto.phase = "waiting_icon_seen";
    auto.waitingIconSeenAt = now;
    auto.fallbackBuffer = bufferAutoFallbackReferences("waiting_icon_seen");
    auto.lastReason = `待機タイマーを検出 coverage=${formatAutoMetric(timerIconSignal.coverageScore)} spill=${formatAutoMetric(timerIconSignal.spillScore)} dark=${formatAutoMetric(timerIconSignal.darkBackground)} offset=${timerIconSignal.offsetX},${timerIconSignal.offsetY}`;
    appendTerminalEntry(
      [
        "[auto] 待機中画面を検出しました。自動で撮影します。",
      ],
      "system",
    );
    appendTerminalDebug(
      [
        latched
          ? `[debug] 待機画面のタイマーを検出しました。選出完了後の待機から自動撮影します。${auto.lastReason}`
          : `[debug] 待機画面のタイマーを検出しました。選出完了前でもテンプレート一致を優先して撮影します。${auto.lastReason}`,
      ],
    );

    try {
      auto.phase = "snapped";
      auto.lastSnapMode = "waiting";
      auto.lastTriggerReason = `iconCoverage=${formatAutoMetric(timerIconSignal.coverageScore)} iconSpill=${formatAutoMetric(timerIconSignal.spillScore)} iconDark=${formatAutoMetric(timerIconSignal.darkBackground)} offset=${timerIconSignal.offsetX},${timerIconSignal.offsetY} locked=${latched ? "yes" : "no"} phase=${sourcePhase}`;
      const message = performSnapCapture("both");
      appendTerminalEntry(
        [
          `[auto] ${message}`,
        ],
        "success",
      );
      appendTerminalDebug([`[debug] 自動撮影の詳細: ${auto.lastTriggerReason}`]);
    } catch (error) {
      appendTerminalError("[error] 自動 snap に失敗しました。", error);
      auto.phase = latched ? "selection_locked" : "selection_active";
    }

    return true;
  }

  function loadAutoTemplates() {
    loadAutoTemplate("loading", AUTO_TEMPLATE_PATHS.loading, "auto-loading-template-load-failed", "読み込み中 画像の読み込みに失敗しました。");
    loadAutoTemplate("selectionTimer", AUTO_TEMPLATE_PATHS.selectionTimer, "auto-selection-template-load-failed", "選出タイマー画像の読み込みに失敗しました。");
    loadAutoTemplate("waitingTimer", AUTO_TEMPLATE_PATHS.waitingTimer, "auto-waiting-template-load-failed", "待機タイマー画像の読み込みに失敗しました。");
  }

  function loadAutoTemplate(key, path, noticeKey, message) {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      state.autoSnap.templates[key] = buildAutoTemplate(image);
    };
    image.onerror = () => {
      state.autoSnap.templates[key] = createPendingAutoTemplate("error");
      appendTerminalNotice(
        noticeKey,
        [
          `[error] ${message} 自動 snap の一部判定が利用できません。`,
        ],
        "error",
      );
    };
    image.src = path;
  }

  function buildAutoTemplate(image) {
    const width = image.naturalWidth || image.width || 0;
    const height = image.naturalHeight || image.height || 0;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!context || !width || !height) {
      return {
        status: "error",
        width: 0,
        height: 0,
        mask: null,
        activeCount: 0,
        inactiveCount: 0,
      };
    }

    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height).data;
    const mask = new Uint8Array(width * height);
    let activeCount = 0;

    for (let index = 0; index < imageData.length; index += 4) {
      const r = imageData[index];
      const g = imageData[index + 1];
      const b = imageData[index + 2];
      const brightness = Math.max(r, g, b);
      const luminance = (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
      const isActive = brightness >= 58 && luminance >= 46;
      const pixelIndex = index / 4;
      if (isActive) {
        mask[pixelIndex] = 1;
        activeCount += 1;
      }
    }

    return {
      status: activeCount ? "ready" : "error",
      width,
      height,
      mask,
      activeCount,
      inactiveCount: Math.max((width * height) - activeCount, 1),
    };
  }

  function getWaitingTimerIconSignal(metrics) {
    return metrics.waitingTimerIcon;
  }

  function matchAutoTemplate(crop, templateKey) {
    const template = state.autoSnap.templates[templateKey];
    const threshold = getAutoTemplateThreshold(templateKey);
    if (!template || template.status !== "ready" || !template.mask) {
      return {
        templateReady: false,
        coverageScore: 0,
        spillScore: 1,
        darkBackground: 0,
        offsetX: 0,
        offsetY: 0,
        matched: false,
      };
    }

    const searchPadding = getAutoTemplateSearchPadding(templateKey);
    const searchWidth = Math.max(template.width + (searchPadding * 2), Math.round(crop.width));
    const searchHeight = Math.max(template.height + (searchPadding * 2), Math.round(crop.height));
    const context = getAutoIconDetectorContext(searchWidth, searchHeight);
    if (!context) {
      return {
        templateReady: false,
        coverageScore: 0,
        spillScore: 1,
        darkBackground: 0,
        offsetX: 0,
        offsetY: 0,
        matched: false,
      };
    }

    context.clearRect(0, 0, searchWidth, searchHeight);
    context.drawImage(
      elements.video,
      Math.round(crop.x),
      Math.round(crop.y),
      Math.max(1, Math.round(crop.width)),
      Math.max(1, Math.round(crop.height)),
      0,
      0,
      searchWidth,
      searchHeight,
    );

    const imageData = context.getImageData(0, 0, searchWidth, searchHeight).data;
    const maxOffsetX = Math.max(0, searchWidth - template.width);
    const maxOffsetY = Math.max(0, searchHeight - template.height);
    const darkBackground = getDarkBackgroundRatio(imageData, threshold.brightThreshold);
    let bestCoverage = 0;
    let bestSpill = 1;
    let bestOffsetX = 0;
    let bestOffsetY = 0;
    let bestScore = -Infinity;

    for (let offsetY = 0; offsetY <= maxOffsetY; offsetY += 1) {
      for (let offsetX = 0; offsetX <= maxOffsetX; offsetX += 1) {
        let matchedPixels = 0;
        let spillPixels = 0;

        for (let y = 0; y < template.height; y += 1) {
          for (let x = 0; x < template.width; x += 1) {
            const templateIndex = (y * template.width) + x;
            const sampleIndex = (((offsetY + y) * searchWidth) + (offsetX + x)) * 4;
            const isBright = isTemplateSamplePixel(
              imageData[sampleIndex],
              imageData[sampleIndex + 1],
              imageData[sampleIndex + 2],
              threshold.brightThreshold,
            );

            if (template.mask[templateIndex]) {
              if (isBright) {
                matchedPixels += 1;
              }
            } else if (isBright) {
              spillPixels += 1;
            }
          }
        }

        const coverageScore = matchedPixels / Math.max(template.activeCount, 1);
        const spillScore = spillPixels / Math.max(template.inactiveCount, 1);
        const score = coverageScore - (spillScore * 0.65);
        if (
          score > bestScore
          || (score === bestScore && coverageScore > bestCoverage)
        ) {
          bestScore = score;
          bestCoverage = coverageScore;
          bestSpill = spillScore;
          bestOffsetX = offsetX;
          bestOffsetY = offsetY;
        }
      }
    }

    return {
      templateReady: true,
      coverageScore: bestCoverage,
      spillScore: bestSpill,
      darkBackground,
      offsetX: bestOffsetX,
      offsetY: bestOffsetY,
      matched: bestCoverage >= threshold.coverageMin
        && bestSpill <= threshold.spillMax
        && darkBackground >= threshold.darkBackgroundMin,
    };
  }

  function getAutoTemplateThreshold(templateKey) {
    if (templateKey === "loading") {
      return AUTO_SNAP_CONFIG.thresholds.loadingTemplate;
    }

    if (templateKey === "selectionTimer") {
      return AUTO_SNAP_CONFIG.thresholds.selectionTimerIcon;
    }

    return AUTO_SNAP_CONFIG.thresholds.waitingTimerIcon;
  }

  function getAutoTemplateSearchPadding(templateKey) {
    if (templateKey === "loading") {
      return 5;
    }

    return 5;
  }

  function isTemplateSamplePixel(r, g, b, threshold) {
    const brightness = Math.max(r, g, b);
    const luminance = (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
    return brightness >= threshold && luminance >= threshold * 0.62;
  }

  function getDarkBackgroundRatio(imageData, brightThreshold) {
    let darkPixels = 0;
    const total = imageData.length / 4;
    for (let index = 0; index < imageData.length; index += 4) {
      const brightness = Math.max(imageData[index], imageData[index + 1], imageData[index + 2]);
      if (brightness <= brightThreshold - 12) {
        darkPixels += 1;
      }
    }
    return darkPixels / Math.max(total, 1);
  }

  function getBattleHudSignal(metrics) {
    const threshold = AUTO_SNAP_CONFIG.thresholds.battleHud;
    const hudAccent = metrics.battleHud.blue + metrics.battleHud.white + metrics.battleHud.chroma;
    const enemyListStillVisible = metrics.selectionRight.red >= 0.16
      && metrics.selectionRight.chroma >= 0.28;
    return {
      hudAccent,
      hudBright: metrics.battleHud.bright,
      enemyListStillVisible,
      matched: hudAccent >= threshold.hudAccentMin
        && metrics.battleHud.bright >= threshold.hudBrightMin
        && !enemyListStillVisible,
    };
  }

  function bufferAutoFallbackReferences(reason = "") {
    try {
      return {
        frames: {
          my: captureReferenceFrameFromVideo("my"),
          enemy: captureReferenceFrameFromVideo("enemy"),
        },
        capturedAt: Date.now(),
        reason,
      };
    } catch (error) {
      state.autoSnap.lastReason = `fallback buffer 作成失敗: ${error.message}`;
      return null;
    }
  }

  function triggerAutoFallback(kind) {
    const auto = state.autoSnap;
    auto.phase = "snapped";
    auto.lastSnapMode = "fallback";
    auto.lastTriggerReason = kind === "battle_hud"
      ? "battle HUD が先に来たため waiting icon frame を使用"
      : "battle HUD が先に来たため waiting icon frame を使用";

    if (!auto.fallbackBuffer?.frames) {
      appendTerminalError("[error] 自動 snap に失敗しました。");
      appendTerminalDebug([`[debug] 予備経路に切り替えましたが、待機中タイマーを検出したフレームを保持できていません。(${auto.lastTriggerReason})`]);
      return;
    }

    try {
      const message = performSnapCapture("both", {
        frameSource: auto.fallbackBuffer.frames,
      });
      appendTerminalEntry(
        [
          `[auto] ${message}`,
        ],
        "success",
      );
      appendTerminalDebug([`[debug] 予備経路で撮影しました。${auto.lastTriggerReason}`]);
    } catch (error) {
      appendTerminalError("[error] 自動 snap に失敗しました。", error);
      appendTerminalDebug(["[debug] 予備経路で保持していたフレームの適用に失敗しました。"]);
    }
  }

  function formatAutoMetric(value) {
    return Number(value || 0).toFixed(3);
  }

  function getAutoStatusLines() {
    const auto = state.autoSnap;
    const lines = [
      `[auto] ${auto.enabled ? "ON" : "OFF"}`,
      `[auto] 状態: ${getAutoStatusSummaryLabel()}`,
      `[auto] 前回の結果: ${getAutoLastResultSummary()}`,
    ];

    if (!state.streamInfo?.isSixteenByNine) {
      lines.push("[auto] 16:9 入力以外では自動認識は利用できません。");
    }

    if (state.debugMode) {
      lines.push(...getAutoStatusDebugLines(auto));
    }

    return lines;
  }

  function getAutoStatusSummaryLabel() {
    const auto = state.autoSnap;

    if (!auto.enabled) {
      return "停止中";
    }

    if (!state.streamInfo?.isSixteenByNine) {
      return "16:9 入力待ち";
    }

    if (!state.videoReady || !state.stream) {
      return "映像待ち";
    }

    if (state.mode !== "ready") {
      return "ready モード待ち";
    }

    if (auto.phase === "loading_seen" || auto.phase === "selection_active") {
      return "選出画面を監視中";
    }

    if (auto.phase === "selection_locked") {
      return "選出完了後の待機中";
    }

    if (auto.phase === "waiting_icon_seen") {
      return "予備経路待機中";
    }

    return "読み込み画面待ち";
  }

  function getAutoLastResultSummary() {
    if (state.autoSnap.lastSnapMode === "fallback") {
      return "予備経路で撮影しました。";
    }

    if (state.autoSnap.lastSnapMode === "waiting") {
      return "待機中画面を検出して撮影しました。";
    }

    return "まだありません。";
  }

  function getAutoStatusDebugLines(auto) {
    const lines = [
      `[debug] phase: ${getAutoPhaseLabel(auto.phase)}`,
      `[debug] monitor: ${auto.monitorActive ? (auto.frameRequestKind || "active") : "idle"}`,
      `[debug] reset: ${auto.lastResetReason || "none"}`,
    ];

    if (auto.lastMetrics) {
      const loadingSignal = getLoadingTemplateSignal(auto.lastMetrics);
      const selectionSignal = getSelectionTimerSignal(auto.lastMetrics);
      const waitingTimerSignal = getWaitingTimerIconSignal(auto.lastMetrics);
      const lockedSignal = getSelectionLockedSignal(auto.lastMetrics);
      const battleHudSignal = getBattleHudSignal(auto.lastMetrics);
      lines.push(
        loadingSignal.templateReady
          ? `[debug] loading coverage=${formatAutoMetric(loadingSignal.coverageScore)} spill=${formatAutoMetric(loadingSignal.spillScore)} dark=${formatAutoMetric(loadingSignal.darkBackground)} offset=${loadingSignal.offsetX},${loadingSignal.offsetY}`
          : "[debug] loading: テンプレート読み込み待ち",
      );
      lines.push(
        selectionSignal.templateReady
          ? `[debug] selection icon coverage=${formatAutoMetric(selectionSignal.coverageScore)} spill=${formatAutoMetric(selectionSignal.spillScore)} dark=${formatAutoMetric(selectionSignal.darkBackground)} offset=${selectionSignal.offsetX},${selectionSignal.offsetY}`
          : "[debug] selection icon: テンプレート読み込み待ち",
      );
      lines.push(
        `[debug] locked badge=${formatAutoMetric(lockedSignal.badgeWhite)} bar=${formatAutoMetric(lockedSignal.barBright)}/${formatAutoMetric(lockedSignal.barBlue)}`,
      );
      lines.push(
        waitingTimerSignal.templateReady
          ? `[debug] waiting icon coverage=${formatAutoMetric(waitingTimerSignal.coverageScore)} spill=${formatAutoMetric(waitingTimerSignal.spillScore)} dark=${formatAutoMetric(waitingTimerSignal.darkBackground)} offset=${waitingTimerSignal.offsetX},${waitingTimerSignal.offsetY} battleHud=${formatAutoMetric(battleHudSignal.hudAccent)}`
          : "[debug] waiting icon: テンプレート読み込み待ち",
      );
    } else {
      lines.push("[debug] live metrics: まだありません。");
    }

    if (auto.fallbackBuffer) {
      lines.push(
        `[debug] fallback buffer: waiting_icon @ ${new Date(auto.fallbackBuffer.capturedAt).toLocaleTimeString("ja-JP", { hour12: false })}`,
      );
    } else {
      lines.push("[debug] fallback buffer: なし");
    }

    lines.push(`[debug] ${auto.lastTriggerReason ? `last trigger: ${auto.lastTriggerReason}` : `last reason: ${auto.lastReason}`}`);
    return lines;
  }

  function getAutoPhaseLabel(phase) {
    const auto = state.autoSnap;
    if (phase === "idle") {
      return "loading";
    }

    if (phase === "loading_seen") {
      return "loading";
    }

    if (phase === "selection_active") {
      return "selection";
    }

    if (phase === "selection_locked") {
      return "selection_locked";
    }

    if (phase === "waiting_icon_seen") {
      return "waiting_icon";
    }

    if (phase === "snapped") {
      return auto.lastSnapMode === "fallback" ? "fallback" : "waiting";
    }

    return phase || "loading";
  }

  function createPendingAutoTemplate(status = "loading") {
    return {
      status,
      width: 0,
      height: 0,
      mask: null,
      activeCount: 0,
      inactiveCount: 0,
    };
  }

  function createAutoSnapState() {
    return {
      enabled: AUTO_SNAP_CONFIG.enabledByDefault,
      frameId: 0,
      frameRequestKind: "",
      monitorActive: false,
      lastFrameAt: 0,
      phase: "idle",
      loadingFrames: 0,
      selectionFrames: 0,
      lockedFrames: 0,
      loadingSeenAt: 0,
      selectionSeenAt: 0,
      selectionLockedAt: 0,
      waitingIconSeenAt: 0,
      lockedBaseline: null,
      fallbackBuffer: null,
      lastMetrics: null,
      lastReason: "loading 待ち",
      lastTriggerReason: "",
      lastResetReason: "initial",
      lastSnapMode: "",
      detectorCanvas: null,
      detectorContext: null,
      iconDetectorCanvas: null,
      iconDetectorContext: null,
      templates: {
        loading: createPendingAutoTemplate(),
        selectionTimer: createPendingAutoTemplate(),
        waitingTimer: createPendingAutoTemplate(),
      },
    };
  }

  function captureReferenceFrameFromVideo(side) {
    const crop = state.crops[side];
    if (!crop) {
      throw new Error(`${side} のクロップ範囲がまだありません。`);
    }

    const frame = document.createElement("canvas");
    frame.width = Math.max(1, Math.round(crop.width));
    frame.height = Math.max(1, Math.round(crop.height));

    const context = frame.getContext("2d");
    if (!context) {
      throw new Error("参照画像用 canvas の初期化に失敗しました。");
    }

    context.drawImage(
      elements.video,
      Math.round(crop.x),
      Math.round(crop.y),
      Math.round(crop.width),
      Math.round(crop.height),
      0,
      0,
      frame.width,
      frame.height,
    );

    return frame;
  }

  function cloneReferenceFrame(source) {
    const frame = document.createElement("canvas");
    frame.width = source.width;
    frame.height = source.height;

    const context = frame.getContext("2d");
    if (!context) {
      throw new Error("参照画像の複製に失敗しました。");
    }

    context.drawImage(source, 0, 0, frame.width, frame.height);
    return frame;
  }

  function getPositiveDelta(currentValue, previousValue) {
    return Math.max((currentValue || 0) - (previousValue || 0), 0);
  }

  function refreshCropPanels() {
    CROP_SIDES.forEach((side) => {
      updatePreviewCanvasSize(side);
      drawCropPanel(side);
    });
  }

  function getPreviewSourceSize(side) {
    if (state.mode === "edit" && state.videoReady && state.crops[side]) {
      return state.crops[side];
    }

    const reference = state.references[side];
    if (reference) {
      return {
        width: reference.width,
        height: reference.height,
      };
    }

    return null;
  }

  function getPreviewAspect(side) {
    const sourceSize = getPreviewSourceSize(side);
    if (!sourceSize || !sourceSize.width || !sourceSize.height) {
      return 1;
    }

    return sourceSize.width / sourceSize.height;
  }

  function getAudioContextClass() {
    return window.AudioContext || window.webkitAudioContext || null;
  }

  async function warmAudioOutput() {
    const AudioContextClass = getAudioContextClass();
    if (!AudioContextClass) {
      return false;
    }

    if (!state.audioContext) {
      state.audioContext = new AudioContextClass();
    }

    if (!state.audioGainNode) {
      state.audioGainNode = state.audioContext.createGain();
      state.audioGainNode.connect(state.audioContext.destination);
    }

    return true;
  }

  async function resumeAudioContext() {
    if (!state.audioContext) {
      return false;
    }

    if (state.audioContext.state === "running") {
      return true;
    }

    try {
      await state.audioContext.resume();
    } catch (error) {
      appendTerminalNotice(
        "audio-playback-blocked",
        [
          "[system] 音声再生は自動再生制限で保留されました。音量またはミュートを操作すると再開を試します。",
        ],
        "system",
      );
      return false;
    }

    if (state.audioContext.state !== "running") {
      appendTerminalNotice(
        "audio-playback-blocked",
        [
          "[system] 音声再生は自動再生制限で保留されました。音量またはミュートを操作すると再開を試します。",
        ],
        "system",
      );
      return false;
    }

    return true;
  }

  async function setupAudioPlayback(streamResult) {
    stopAudioPlayback();

    const audioTracks = streamResult?.stream?.getAudioTracks?.() || [];
    if (!audioTracks.length) {
      state.audioReady = false;
      syncAudioControls();
      return false;
    }

    const AudioContextClass = getAudioContextClass();
    if (!AudioContextClass) {
      state.audioReady = false;
      syncAudioControls();
      appendTerminalNotice(
        "audio-context-unsupported",
        [
          "[system] このブラウザでは音声再生 API が使えないため、映像のみで続行します。",
        ],
        "system",
      );
      return false;
    }

    try {
      if (!state.audioContext) {
        state.audioContext = new AudioContextClass();
      }

      if (!state.audioGainNode) {
        state.audioGainNode = state.audioContext.createGain();
        state.audioGainNode.connect(state.audioContext.destination);
      }

      state.audioTrackStream = new MediaStream(audioTracks);
      state.audioSourceNode = state.audioContext.createMediaStreamSource(state.audioTrackStream);
      state.audioSourceNode.connect(state.audioGainNode);
      state.audioReady = true;
      applyAudioOutputState();
      syncAudioControls();
      await resumeAudioContext();
      return true;
    } catch (error) {
      state.audioReady = false;
      syncAudioControls();
      appendTerminalEntry(
        [
          "[error] 音声再生の開始に失敗しました。",
        ],
        "error",
      );
      appendTerminalDebug([`[debug] 詳細: ${error.message}`], "error");
      return false;
    }
  }

  async function requestSelectedAudioStream(selectedAudioDeviceId) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: selectedAudioDeviceId },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      return { stream, error: null };
    } catch (error) {
      appendTerminalError(`[error] ${getAudioInputErrorMessage(error)}`, error);
      return { stream: null, error };
    }
  }

  function stopAudioPlayback() {
    if (state.audioSourceNode) {
      state.audioSourceNode.disconnect();
      state.audioSourceNode = null;
    }

    state.audioTrackStream = null;
    state.audioReady = false;
    syncAudioControls();
  }

  function stopSelectedAudioInput() {
    stopAudioPlayback();

    if (state.audioInputStream) {
      state.audioInputStream.getTracks().forEach((track) => track.stop());
      state.audioInputStream = null;
    }
  }

  function applyAudioOutputState() {
    if (!state.audioGainNode) {
      return;
    }

    state.audioGainNode.gain.value = state.audioMuted ? 0 : state.audioVolume;
  }

  function syncAudioControls() {
    if (!elements.toggleAudioMuteButton || !elements.audioVolume) {
      return;
    }

    elements.toggleAudioMuteButton.disabled = !state.audioReady;
    elements.audioVolume.disabled = !state.audioReady;
    elements.audioVolume.value = String(Math.round(state.audioVolume * 100));
    elements.toggleAudioMuteButton.dataset.iconState = !state.audioReady || state.audioMuted ? "muted" : "unmuted";
    elements.toggleAudioMuteButton.setAttribute(
      "aria-label",
      state.audioMuted ? "音声ミュート解除" : "音声ミュート",
    );
  }

  async function toggleAudioMute() {
    if (!state.audioReady) {
      return;
    }

    state.audioMuted = !state.audioMuted;
    await resumeAudioContext();
    applyAudioOutputState();
    syncAudioControls();
  }

  async function handleAudioVolumeChange(event) {
    state.audioVolume = clamp(Number(event.target.value || 0) / 100, 0, 1);
    persistStoredValue(STORAGE_KEYS.audioVolume, String(state.audioVolume));
    await resumeAudioContext();
    applyAudioOutputState();
    syncAudioControls();
  }

  function getAudioInputErrorMessage(error) {
    if (error.name === "NotAllowedError") {
      return "音声入力へのアクセスが拒否されました。ブラウザの権限設定を確認してください。";
    }

    if (error.name === "NotReadableError") {
      return "選択した音声入力を利用できません。他のアプリに占有されている可能性があります。";
    }

    if (error.name === "NotFoundError") {
      return "選択した音声入力が見つかりません。デバイスをつなぎ直して一覧を更新してください。";
    }

    return "選択した音声入力の開始に失敗しました。";
  }

  function findAssociatedAudioDevice(videoDevice) {
    if (!videoDevice || !state.audioDevices.length) {
      return null;
    }

    const captureLike = isCaptureLikeDevice(videoDevice) || isObsDevice(videoDevice);
    if (!captureLike) {
      return null;
    }

    if (videoDevice.groupId) {
      const byGroup = state.audioDevices.find((device) => device.groupId && device.groupId === videoDevice.groupId);
      if (byGroup) {
        return byGroup;
      }
    }

    const videoTokens = tokenizeDeviceLabel(videoDevice.label);
    let bestDevice = null;
    let bestScore = 0;

    state.audioDevices.forEach((device) => {
      const audioTokens = tokenizeDeviceLabel(device.label);
      const score = videoTokens.filter((token) => audioTokens.includes(token)).length;
      if (score > bestScore) {
        bestScore = score;
        bestDevice = device;
      }
    });

    if (bestScore >= 1) {
      return bestDevice;
    }

    if (state.audioDevices.length === 1 && isCaptureLikeDevice(state.audioDevices[0])) {
      return state.audioDevices[0];
    }

    return null;
  }

  function tokenizeDeviceLabel(label) {
    return String(label || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter(
        (token) =>
          token
          && ![
            "audio",
            "video",
            "camera",
            "virtual",
            "input",
            "output",
            "device",
            "digital",
            "interface",
            "microphone",
            "usb",
          ].includes(token),
      );
  }

  function isCaptureLikeDevice(device) {
    return /capture|elgato|avermedia|cam\s*link|hdmi|obs|virtual/i.test(device?.label || "");
  }

  function appendTerminalEntry(lines, tone = "system") {
    const shouldFollow = shouldForceTerminalAutoscroll() || state.terminalLogAutoFollow;
    const entry = document.createElement("div");
    entry.className = `terminal-entry terminal-entry--${tone}`;
    entry.textContent = Array.isArray(lines) ? lines.join("\n") : String(lines);
    elements.terminalOutput.append(entry);
    if (shouldFollow) {
      scrollTerminalToBottom();
    }
  }

  function appendTerminalDebug(lines, tone = "system") {
    if (!state.debugMode) {
      return;
    }

    appendTerminalEntry(lines, tone);
  }

  function appendTerminalError(lines, error = null) {
    const normalized = Array.isArray(lines) ? [...lines] : [String(lines)];
    if (state.debugMode && error?.message) {
      normalized.push(`[debug] 詳細: ${error.message}`);
    }
    appendTerminalEntry(normalized, "error");
  }

  function appendTerminalNotice(key, lines, tone = "system") {
    if (state.terminalNoticeKeys.has(key)) {
      return;
    }

    state.terminalNoticeKeys.add(key);
    appendTerminalEntry(lines, tone);
  }

  function scrollTerminalToBottom() {
    if (!elements.terminalOutput) {
      return;
    }

    if (isTerminalCollapsed() || !isTerminalLogVisible()) {
      state.terminalLogPendingBottomScroll = true;
      return;
    }

    elements.terminalOutput.scrollTop = elements.terminalOutput.scrollHeight;
    state.terminalLogPendingBottomScroll = false;
    state.terminalLogAutoFollow = true;
  }

  function shouldUseFixedSixteenByNineCrops() {
    return Boolean(state.streamInfo?.isSixteenByNine);
  }

  function shouldPersistCrop() {
    return !shouldUseFixedSixteenByNineCrops();
  }

  function getResetCrop(side, videoWidth, videoHeight) {
    if (shouldUseFixedSixteenByNineCrops()) {
      return getFixedSixteenByNineCrop(side, videoWidth, videoHeight);
    }

    return getDefaultCrop(side, videoWidth, videoHeight);
  }

  function getFixedSixteenByNineCrop(side, videoWidth, videoHeight) {
    const ratios = FIXED_16_BY_9_CROP_RATIOS[side];
    return clampCrop(
      {
        x: videoWidth * ratios.x,
        y: videoHeight * ratios.y,
        width: videoWidth * ratios.width,
        height: videoHeight * ratios.height,
      },
      videoWidth,
      videoHeight,
    );
  }

  function getInitialCrop(side, videoWidth, videoHeight) {
    if (shouldUseFixedSixteenByNineCrops()) {
      return getFixedSixteenByNineCrop(side, videoWidth, videoHeight);
    }

    const restored = restoreCrop(side, videoWidth, videoHeight);
    return restored || getDefaultCrop(side, videoWidth, videoHeight);
  }

  function getDefaultCrop(side, videoWidth, videoHeight) {
    const widthRatio = 0.142;
    const heightRatio = 0.924;
    const xRatio = side === "my" ? 0.01 : 0.848;
    return clampCrop(
      {
        x: videoWidth * xRatio,
        y: videoHeight * 0.038,
        width: videoWidth * widthRatio,
        height: videoHeight * heightRatio,
      },
      videoWidth,
      videoHeight,
    );
  }

  function clampCrop(crop, videoWidth, videoHeight) {
    const minWidth = Math.max(48, Math.round(videoWidth * 0.06));
    const minHeight = Math.max(96, Math.round(videoHeight * 0.16));
    const width = clamp(Math.round(crop.width || minWidth), minWidth, videoWidth);
    const height = clamp(Math.round(crop.height || minHeight), minHeight, videoHeight);
    const x = clamp(Math.round(crop.x || 0), 0, Math.max(0, videoWidth - width));
    const y = clamp(Math.round(crop.y || 0), 0, Math.max(0, videoHeight - height));

    return { x, y, width, height };
  }

  function persistCrop(side, crop, videoWidth, videoHeight) {
    const payload = {
      ratios: {
        x: crop.x / videoWidth,
        y: crop.y / videoHeight,
        width: crop.width / videoWidth,
        height: crop.height / videoHeight,
      },
    };
    localStorage.setItem(STORAGE_KEYS[side], JSON.stringify(payload));
  }

  function restoreCrop(side, videoWidth, videoHeight) {
    const raw = localStorage.getItem(STORAGE_KEYS[side]);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.ratios) {
        return null;
      }

      return clampCrop(
        {
          x: parsed.ratios.x * videoWidth,
          y: parsed.ratios.y * videoHeight,
          width: parsed.ratios.width * videoWidth,
          height: parsed.ratios.height * videoHeight,
        },
        videoWidth,
        videoHeight,
      );
    } catch (error) {
      return null;
    }
  }

  function getStreamDimensions() {
    const settings = getTrackSettings();
    return {
      width: elements.video.videoWidth || settings.width || 0,
      height: elements.video.videoHeight || settings.height || 0,
    };
  }

  function getTrackSettings() {
    return state.stream?.getVideoTracks?.()[0]?.getSettings?.() || {};
  }

  function getDisplayedVideoRect() {
    const { width: videoWidth, height: videoHeight } = getStreamDimensions();
    const containerWidth = elements.videoStage.clientWidth;
    const containerHeight = elements.videoStage.clientHeight;

    if (!videoWidth || !videoHeight || !containerWidth || !containerHeight) {
      return null;
    }

    const containerAspect = containerWidth / containerHeight;
    const videoAspect = videoWidth / videoHeight;

    if (containerAspect > videoAspect) {
      const height = containerHeight;
      const width = height * videoAspect;
      return {
        offsetX: (containerWidth - width) / 2,
        offsetY: 0,
        width,
        height,
      };
    }

    const width = containerWidth;
    const height = width / videoAspect;
    return {
      offsetX: 0,
      offsetY: (containerHeight - height) / 2,
      width,
      height,
    };
  }

  function buildStreamInfo(width, height) {
    const ratioValue = width / height;
    return {
      width,
      height,
      ratioValue,
      ratioLabel: formatRatioLabel(ratioValue),
      isSixteenByNine: isAspectRatio(ratioValue, ASPECT_16_BY_9),
      inputLabel: getInputLabel(ratioValue),
    };
  }

  function getInputLabel(ratioValue) {
    if (isAspectRatio(ratioValue, ASPECT_16_BY_9)) {
      return "入力(16:9)";
    }

    return "入力(非16:9)";
  }

  function formatRatioLabel(ratioValue) {
    if (isAspectRatio(ratioValue, ASPECT_16_BY_9)) {
      return "16:9";
    }

    if (isAspectRatio(ratioValue, ASPECT_4_BY_3)) {
      return "4:3";
    }

    return `${ratioValue.toFixed(2)}:1`;
  }

  function isAspectRatio(value, target) {
    return Math.abs(value - target) <= ASPECT_TOLERANCE;
  }

  function getSelectedDevice() {
    return state.devices.find((device) => device.deviceId === state.selectedDeviceId) || null;
  }

  function findObsDevice() {
    return state.devices.find(isObsDevice) || null;
  }

  function isObsDevice(device) {
    return /obs|virtual camera/i.test(device.label || "");
  }

  function normalizePokemonRecord(record) {
    const name = cleanCell(record["ポケモン名"]);
    if (!name) {
      return null;
    }

    const type1 = cleanCell(record["タイプ1"]);
    const type2 = cleanCell(record["タイプ2"]);
    const ability1 = cleanCell(record["とくせい1"]);
    const ability2 = cleanCell(record["とくせい2"]);
    const ability3 = cleanCell(record["とくせい3"]);

    return {
      name,
      types: [type1, type2].filter(Boolean),
      abilities: [ability1, ability2, ability3].filter(Boolean),
      stats: {
        H: cleanCell(record.H),
        A: cleanCell(record.A),
        B: cleanCell(record.B),
        C: cleanCell(record.C),
        D: cleanCell(record.D),
        S: cleanCell(record.S),
      },
    };
  }

  function buildPokemonSearchEntry(pokemon) {
    const baseName = getPokemonBaseName(pokemon.name);
    const formName = getPokemonFormName(pokemon.name);
    const searchKeys = [];

    addPokemonSearchKey(searchKeys, pokemon.name, "official", 0);
    addPokemonSearchKey(searchKeys, baseName, "base", 1);

    if (formName) {
      addPokemonSearchKey(searchKeys, `${baseName} ${formName}`, "form", 2);
      addPokemonSearchKey(searchKeys, `${baseName}${formName}`, "form", 3);
      addPokemonSearchKey(searchKeys, `${baseName}(${formName})`, "form", 4);
    }

    getPokemonGenderAliases(pokemon.name).forEach((alias, index) => {
      addPokemonSearchKey(searchKeys, alias, "alias", 10 + index);
    });

    getPokemonFormAliases(pokemon.name).forEach((alias, index) => {
      addPokemonSearchKey(searchKeys, alias, "alias", 20 + index);
    });

    return {
      name: pokemon.name,
      types: pokemon.types,
      searchKeys,
    };
  }

  function addPokemonSearchKey(searchKeys, value, kind, sortWeight) {
    const trimmed = cleanCell(value);
    const normalized = normalizePokemonSearchText(trimmed);
    if (!trimmed || !normalized || searchKeys.some((searchKey) => searchKey.normalized === normalized)) {
      return;
    }

    searchKeys.push({
      value: trimmed,
      normalized,
      kind,
      sortWeight,
    });
  }

  function getPokemonBaseName(name) {
    return cleanCell(String(name || "").replace(/\s*[（(][^()（）]*[)）]\s*/g, "").replace(/[♂♀]/g, ""));
  }

  function getPokemonFormName(name) {
    const match = String(name || "").match(/[（(]([^()（）]+)[)）]/);
    return cleanCell(match?.[1] || "");
  }

  function getPokemonGenderAliases(name) {
    const aliases = [];
    const source = String(name || "");

    if (source.includes("♂")) {
      aliases.push(source.replace(/♂/g, "オス"));
      aliases.push(source.replace(/♂/g, ""));
    }

    if (source.includes("♀")) {
      aliases.push(source.replace(/♀/g, "メス"));
      aliases.push(source.replace(/♀/g, ""));
    }

    return aliases.map(cleanCell).filter(Boolean);
  }

  function getPokemonFormAliases(name) {
    const aliases = [];
    const source = String(name || "");
    const normalizedBrackets = source.replace(/（/g, "(").replace(/）/g, ")");
    const baseName = getPokemonBaseName(source);
    const formName = getPokemonFormName(source);

    if (normalizedBrackets !== source) {
      aliases.push(normalizedBrackets);
    }

    if (formName) {
      aliases.push(`${baseName} ${formName}`);
      aliases.push(`${baseName}${formName}`);
    }

    return aliases.map(cleanCell).filter(Boolean);
  }

  function normalizePokemonSearchText(value) {
    return normalizePokemonDisplayText(value)
      .replace(/\s*[()]\s*/g, " ")
      .replace(/[・･·/_\-‐‑‒–—―]+/g, " ")
      .replace(/\s+/g, "")
      .replace(/♂/g, "オス")
      .replace(/♀/g, "メス");
  }

  function normalizePokemonDisplayText(value) {
    return toKatakana(
      String(value ?? "")
        .normalize("NFKC")
        .replace(/（/g, "(")
        .replace(/）/g, ")")
        .replace(/\u3000/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );
  }

  function toKatakana(value) {
    return String(value || "").replace(/[\u3041-\u3096]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) + 0x60),
    );
  }

  function validateHeaders(headers) {
    const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
    if (missing.length > 0) {
      throw new Error(`必要な列が不足しています: ${missing.join(", ")}`);
    }
  }

  // 引用符を含む基本的な CSV を壊さないため、1文字ずつ読んで行列化する。
  function parseCsv(source) {
    const text = source.replace(/^\uFEFF/, "");
    const rows = [];
    let currentCell = "";
    let currentRow = [];
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const nextChar = text[index + 1];

      if (char === "\"") {
        if (inQuotes && nextChar === "\"") {
          currentCell += "\"";
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (!inQuotes && char === ",") {
        currentRow.push(currentCell);
        currentCell = "";
        continue;
      }

      if (!inQuotes && (char === "\n" || char === "\r")) {
        if (char === "\r" && nextChar === "\n") {
          index += 1;
        }
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentCell = "";
        currentRow = [];
        continue;
      }

      currentCell += char;
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell);
      rows.push(currentRow);
    }

    const filteredRows = rows.filter((row) => row.length > 0 && row.some((cell) => cell !== ""));
    const [headerRow = [], ...dataRows] = filteredRows;
    const headers = headerRow.map((header) => cleanCell(header));
    const records = dataRows.map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index] ?? "";
      });
      return record;
    });

    return { headers, records };
  }

  function cleanCell(value) {
    return String(value ?? "").trim();
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    try {
      await navigator.serviceWorker.register("./sw.js");
    } catch (error) {
      appendTerminalError("[error] Service Worker の登録に失敗しました。", error);
    }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      appendTerminalError("[error] 全画面表示に切り替えられませんでした。", error);
    } finally {
      syncFullscreenButton();
    }
  }

  function syncFullscreenButton() {
    if (!elements.toggleFullscreenButton) {
      return;
    }

    elements.toggleFullscreenButton.dataset.iconState = document.fullscreenElement ? "exit" : "enter";
  }

  function normalizeTheme(theme) {
    return theme === THEMES.light ? THEMES.light : THEMES.dark;
  }

  function applyTheme(theme) {
    const nextTheme = normalizeTheme(theme);
    state.theme = nextTheme;
    document.documentElement.dataset.theme = nextTheme;
  }

  function syncThemeToggleButton() {
    if (!elements.toggleThemeButton) {
      return;
    }

    const currentTheme = normalizeTheme(state.theme);
    const nextTheme = currentTheme === THEMES.light ? THEMES.dark : THEMES.light;
    const nextThemeLabel = nextTheme === THEMES.light ? "ライト" : "ダーク";
    elements.toggleThemeButton.dataset.iconState = currentTheme;
    elements.toggleThemeButton.setAttribute("aria-label", `${nextThemeLabel}モードに切り替え`);
    elements.toggleThemeButton.title = `${nextThemeLabel}モードに切り替え`;
  }

  function toggleTheme() {
    const nextTheme = state.theme === THEMES.light ? THEMES.dark : THEMES.light;
    applyTheme(nextTheme);
    persistStoredValue(STORAGE_KEYS.theme, nextTheme);
    syncThemeToggleButton();
  }
})();
