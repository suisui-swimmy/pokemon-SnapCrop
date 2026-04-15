(() => {
  const CSV_PATH = "./data/champions_%20Reg_M-A.csv";
  const STORAGE_KEYS = {
    my: "pokemon-snapcrop.my-crop",
    enemy: "pokemon-snapcrop.enemy-crop",
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
  const STREAM_PROFILES = [
    { width: { exact: 1920 }, height: { exact: 1080 } },
    { width: { exact: 1280 }, height: { exact: 720 } },
    { width: { ideal: 1920 }, height: { ideal: 1080 }, aspectRatio: { ideal: ASPECT_16_BY_9 } },
    {},
  ];

  const elements = {};
  const state = {
    csvHeaders: [],
    pokemonMap: new Map(),
    csvReady: false,
    stream: null,
    streamInfo: null,
    videoReady: false,
    devices: [],
    audioDevices: [],
    hasObsDevice: false,
    selectedDeviceId: "",
    selectedAudioDeviceId: "",
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
    previewFrameId: 0,
    audioContext: null,
    audioGainNode: null,
    audioSourceNode: null,
    audioTrackStream: null,
    audioInputStream: null,
    audioMuted: false,
    audioVolume: 1,
    audioReady: false,
    terminalNoticeKeys: new Set(),
    commandHistory: [],
    commandHistoryIndex: -1,
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    bindEvents();
    setCameraState("未取得", "idle");
    renderCameraDetails();
    syncFullscreenButton();
    syncAudioControls();
    refreshWorkspaceLayout();
    refreshDevices();
    loadPokemonCsv();
    registerServiceWorker();
    appendTerminalNotice(
      "command-hint",
      [
        "[system] edit で範囲編集、ready で待機、空Enterか Ctrl+Enter で撮影できます。",
      ],
      "system",
    );
    window.requestAnimationFrame(() => {
      elements.terminalInput?.focus();
    });
  }

  function cacheElements() {
    elements.deviceSelect = document.getElementById("device-select");
    elements.audioSelect = document.getElementById("audio-select");
    elements.refreshDevicesButton = document.getElementById("refresh-devices");
    elements.startVideoButton = document.getElementById("start-video");
    elements.toggleFullscreenButton = document.getElementById("toggle-fullscreen");
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
    elements.terminalScreen = document.getElementById("terminal-screen");
    elements.terminalForm = document.getElementById("terminal-form");
    elements.terminalInput = document.getElementById("terminal-input");
    elements.terminalOutput = document.getElementById("terminal-output");
  }

  function bindEvents() {
    elements.refreshDevicesButton.addEventListener("click", refreshDevices);
    elements.startVideoButton.addEventListener("click", startSelectedVideo);
    elements.toggleFullscreenButton?.addEventListener("click", toggleFullscreen);
    elements.toggleAudioMuteButton?.addEventListener("click", toggleAudioMute);
    elements.audioVolume?.addEventListener("input", handleAudioVolumeChange);
    elements.deviceSelect.addEventListener("change", handleDeviceSelectionChange);
    elements.audioSelect?.addEventListener("change", handleAudioSelectionChange);
    elements.video.addEventListener("loadedmetadata", handleVideoReady);
    elements.terminalForm.addEventListener("submit", handleTerminalSubmit);
    elements.terminalInput.addEventListener("keydown", handleTerminalInputKeydown);
    elements.terminalScreen.addEventListener("click", focusTerminalInput);
    CROP_SIDES.forEach((side) => {
      elements.cropSlots[side].overlay?.addEventListener("pointerdown", startCropInteraction);
    });
    window.addEventListener("pointermove", updateCropInteraction);
    window.addEventListener("pointerup", finishCropInteraction);
    window.addEventListener("pointercancel", finishCropInteraction);
    window.addEventListener("resize", refreshWorkspaceLayout);
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

      records.forEach((record) => {
        const normalized = normalizePokemonRecord(record);
        if (normalized) {
          state.pokemonMap.set(normalized.name, normalized);
        }
      });

      state.csvReady = true;
    } catch (error) {
      state.csvReady = false;
      appendTerminalEntry(
        [
          "[error] CSV の読み込みに失敗しました。",
          "[error] ローカルサーバー経由で開いているか確認してください。",
          `[error] 詳細: ${error.message}`,
        ],
        "error",
      );
    }
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
          "[error] このブラウザでは映像入力を使えません。",
          "[error] MediaDevices API に対応したブラウザで開いてください。",
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
      appendTerminalEntry(
        [
          "[error] 映像デバイス一覧の取得に失敗しました。",
          `[error] 詳細: ${error.message}`,
        ],
        "error",
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
      selected = findObsDevice() || state.devices.find((device) => device.deviceId === currentValue) || state.devices[0];
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
    if (!state.audioSelectionLocked) {
      populateAudioSelect();
    }
    renderCameraDetails();
  }

  function handleAudioSelectionChange() {
    state.audioSelectionLocked = true;
    state.selectedAudioDeviceId = elements.audioSelect?.value || "";
  }

  async function startSelectedVideo() {
    if (!state.devices.length) {
      setCameraState("未接続", "error");
      appendTerminalEntry(
        [
          "[error] 映像入力が見つからないため、映像を開始できません。",
          "[error] キャプチャデバイスまたは OBS 仮想カメラを確認してください。",
        ],
        "error",
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
              "[system] OBS Virtual Camera は映像のみです。音が必要なら音声入力を別で選んでください。",
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
    let detail = "映像入力の開始に失敗しました。";

    if (error && error.name === "NotAllowedError") {
      message = "拒否";
      detail = "ブラウザで映像アクセスが拒否されました。アドレスバーの権限設定を確認してください。";
    } else if (error && error.name === "NotFoundError") {
      message = "未接続";
      detail = "選択した映像入力が見つかりません。デバイスの再接続後に一覧更新してください。";
    } else if (error && error.name === "NotReadableError") {
      message = "使用中";
      detail = "映像入力が他アプリに占有されている可能性があります。OBS や別タブを確認してください。";
    }

    setCameraState(message, "error");
    renderCameraDetails();
    appendTerminalEntry(
      [
        `[error] ${message}`,
        `[error] ${detail}`,
        `[error] 詳細: ${error.message}`,
      ],
      "error",
    );
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
      const restored = restoreCrop(side, dimensions.width, dimensions.height);
      const initialCrop = restored || getDefaultCrop(side, dimensions.width, dimensions.height);
      updateCrop(side, initialCrop, { save: false });
    });
    setCameraState(
      state.streamInfo.inputLabel,
      state.streamInfo.isSixteenByNine ? "success" : "working",
    );
    if (!state.streamInfo.isSixteenByNine) {
      appendTerminalNotice(
        state.hasObsDevice ? "aspect-4-3-obs" : "aspect-4-3-generic",
        [
          state.hasObsDevice
            ? "[system] 現在は 4:3 入力です。16:9 で使うなら OBS 仮想カメラが安定です。"
            : "[system] 現在は 4:3 入力です。16:9 出力できる映像入力があると扱いやすいです。",
        ],
        "system",
      );
    }
    renderCameraDetails();
    refreshCropPanels();
    if (state.mode === "edit") {
      startPreviewLoop();
    }
  }

  function handleTerminalSubmit(event) {
    event.preventDefault();

    const query = elements.terminalInput.value.trim();
    if (!query) {
      if (state.mode === "ready") {
        appendTerminalEntry(["> snap both"], "command");
        void handleSnapCommand("both");
      }
      return;
    }

    pushCommandHistory(query);
    appendTerminalEntry([`> ${query}`], "command");
    elements.terminalInput.value = "";

    if (handleTerminalCommand(query)) {
      return;
    }

    if (!state.csvReady) {
      appendTerminalEntry(
        [
          "CSV がまだ読み込めていません。ローカルサーバー経由で開き直してください。",
        ],
        "error",
      );
      return;
    }

    const pokemon = state.pokemonMap.get(query);
    if (!pokemon) {
      appendTerminalEntry(
        [
          "不明なコマンド、または該当するポケモンがありません。",
        ],
        "error",
      );
      return;
    }

    appendTerminalEntry(
      [
        `タイプ: ${pokemon.types.join(" / ")} | 特性: ${pokemon.abilities.join(" / ")} | 種族値: H${pokemon.stats.H} A${pokemon.stats.A} B${pokemon.stats.B} C${pokemon.stats.C} D${pokemon.stats.D} S${pokemon.stats.S}`,
      ],
      "success",
    );
  }

  function handleTerminalInputKeydown(event) {
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
      return;
    }
  }

  function handleGlobalKeydown(event) {
    if (event.ctrlKey && !event.altKey && !event.metaKey && event.key === "Enter") {
      event.preventDefault();
      appendTerminalEntry(["> snap both"], "command");
      void handleSnapCommand("both");
      return;
    }

    if (event.key === "Escape" && state.mode === "edit") {
      event.preventDefault();
      setMode("ready");
    }
  }

  function handleTerminalCommand(query) {
    const [command = "", arg = ""] = query.toLowerCase().split(/\s+/, 2);

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
          "利用可能なコマンド: edit / ready / snap / snap my / snap enemy / snap both / help",
          "ショートカット: Ctrl+Enter = snap both / Esc = ready",
        ],
        "system",
      );
      return true;
    }

    if (command === "snap") {
      const target = ["", "both"].includes(arg) ? "both" : arg;
      if (!["my", "enemy", "both"].includes(target)) {
        appendTerminalEntry(
          [
            "snap は my / enemy / both を指定できます。",
          ],
          "error",
        );
        return true;
      }

      void handleSnapCommand(target);
      return true;
    }

    return false;
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

    elements.terminalInput.focus();
  }

  function moveCaretToEnd(input) {
    const nextPosition = input.value.length;
    input.setSelectionRange(nextPosition, nextPosition);
  }

  function startCropInteraction(event) {
    if (!state.videoReady || state.mode !== "edit" || event.button !== 0) {
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

    if (save) {
      persistCrop(side, state.crops[side], dimensions.width, dimensions.height);
    }
  }

  function handleFullscreenChange() {
    syncFullscreenButton();
    refreshWorkspaceLayout();
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
    stopAudioPlayback();

    if (state.audioInputStream) {
      state.audioInputStream.getTracks().forEach((track) => track.stop());
      state.audioInputStream = null;
    }

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

  function setMode(nextMode) {
    if (state.mode === nextMode) {
      return;
    }

    state.mode = nextMode;
    if (nextMode === "edit" && state.videoReady) {
      startPreviewLoop();
    } else {
      stopPreviewLoop();
    }
    refreshCropPanels();
    renderCropOverlays();
    appendTerminalEntry(
      [
        nextMode === "edit"
          ? "編集モードに入りました。ドラッグと右下ハンドルで範囲調整できます。"
          : "実戦モードに戻りました。撮影の準備が完了しました。空Enterか Ctrl+Enter で撮影できます。",
      ],
      "system",
    );
  }

  async function handleSnapCommand(target) {
    if (!state.videoReady || !state.stream) {
      appendTerminalEntry(
        [
          "映像がまだ準備できていないため、撮影できません。",
        ],
        "error",
      );
      return;
    }

    try {
      const sides = target === "both" ? CROP_SIDES : [target];

      for (const side of sides) {
        captureReferenceImage(side);
      }

      refreshCropPanels();

      appendTerminalEntry(
        [
          target === "my"
            ? "自分側の参照画像を更新しました。"
            : target === "enemy"
              ? "相手側の参照画像を更新しました。"
              : "左右の参照画像を更新しました。",
        ],
        "success",
      );
    } catch (error) {
      appendTerminalEntry(
        [
          "表示用画像の更新に失敗しました。",
          `詳細: ${error.message}`,
        ],
        "error",
      );
    }
  }

  function captureReferenceImage(side) {
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

    state.references[side] = frame;
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
          "[system] 音声再生は自動再生制限で保留されました。音量かミュートを操作すると再開を試します。",
        ],
        "system",
      );
      return false;
    }

    if (state.audioContext.state !== "running") {
      appendTerminalNotice(
        "audio-playback-blocked",
        [
          "[system] 音声再生は自動再生制限で保留されました。音量かミュートを操作すると再開を試します。",
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
          `[error] 詳細: ${error.message}`,
        ],
        "error",
      );
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
      appendTerminalEntry(
        [
          `[error] ${getAudioInputErrorTitle(error)}`,
          `[error] ${getAudioInputErrorDetail(error)}`,
          `[error] 詳細: ${error.message}`,
        ],
        "error",
      );
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
    elements.toggleAudioMuteButton.textContent = !state.audioReady ? "🔇" : (state.audioMuted ? "🔇" : "🔊");
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
    await resumeAudioContext();
    applyAudioOutputState();
    syncAudioControls();
  }

  function getAudioInputErrorTitle(error) {
    if (error.name === "NotAllowedError") {
      return "権限拒否";
    }

    if (error.name === "NotReadableError") {
      return "使用中";
    }

    if (error.name === "NotFoundError") {
      return "未接続";
    }

    return "音声入力失敗";
  }

  function getAudioInputErrorDetail(error) {
    if (error.name === "NotAllowedError") {
      return "選択した音声入力の権限が拒否されました。ブラウザの権限設定を確認してください。";
    }

    if (error.name === "NotReadableError") {
      return "選択した音声入力が使えません。他アプリに占有されている可能性があります。";
    }

    if (error.name === "NotFoundError") {
      return "選択した音声入力が見つかりません。デバイスをつなぎ直して一覧更新してください。";
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
    const entry = document.createElement("div");
    entry.className = `terminal-entry terminal-entry--${tone}`;
    entry.textContent = Array.isArray(lines) ? lines.join("\n") : String(lines);
    elements.terminalOutput.append(entry);
    scrollTerminalToBottom();
  }

  function appendTerminalNotice(key, lines, tone = "system") {
    if (state.terminalNoticeKeys.has(key)) {
      return;
    }

    state.terminalNoticeKeys.add(key);
    appendTerminalEntry(lines, tone);
  }

  function scrollTerminalToBottom() {
    elements.terminalScreen.scrollTop = elements.terminalScreen.scrollHeight;
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
      return "16:9入力";
    }

    return "4:3入力";
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
      appendTerminalEntry(
        [
          "[error] Service Worker の登録に失敗しました。",
          `[error] 詳細: ${error.message}`,
        ],
        "error",
      );
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
      appendTerminalEntry(
        [
          "[error] 全画面表示に切り替えできませんでした。",
          `[error] 詳細: ${error.message}`,
        ],
        "error",
      );
    } finally {
      syncFullscreenButton();
    }
  }

  function syncFullscreenButton() {
    if (!elements.toggleFullscreenButton) {
      return;
    }

    elements.toggleFullscreenButton.textContent = document.fullscreenElement ? "⤡" : "⤢";
  }
})();
