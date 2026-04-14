(() => {
  const CSV_PATH = "./data/champions_%20Reg_M-A.csv";
  const STORAGE_KEY = "pokemon-snapcrop.enemy-crop";
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
    hasObsDevice: false,
    selectedDeviceId: "",
    deviceSelectionLocked: false,
    crop: null,
    drag: null,
    previewFrameId: 0,
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    bindEvents();
    setCameraState("映像未取得", "idle");
    setCropStatus("");
    setCropControlsDisabled(true);
    renderCameraDetails();
    syncFullscreenButton();
    refreshWorkspaceLayout();
    refreshDevices();
    loadPokemonCsv();
    registerServiceWorker();
  }

  function cacheElements() {
    elements.deviceSelect = document.getElementById("device-select");
    elements.refreshDevicesButton = document.getElementById("refresh-devices");
    elements.startVideoButton = document.getElementById("start-video");
    elements.toggleFullscreenButton = document.getElementById("toggle-fullscreen");
    elements.cameraState = document.getElementById("camera-state");
    elements.video = document.getElementById("live-video");
    elements.videoStageShell = document.getElementById("video-stage-shell");
    elements.videoStage = document.getElementById("video-stage");
    elements.cropOverlay = document.getElementById("crop-overlay");
    elements.cropHandle = document.getElementById("crop-handle");
    elements.cropMeta = document.getElementById("crop-meta");
    elements.cropPreviewShell = document.getElementById("crop-preview-shell");
    elements.cropCanvas = document.getElementById("crop-canvas");
    elements.cropStatus = document.getElementById("crop-status");
    elements.cropInputs = {
      x: document.getElementById("crop-x"),
      y: document.getElementById("crop-y"),
      width: document.getElementById("crop-width"),
      height: document.getElementById("crop-height"),
    };
    elements.pokemonForm = document.getElementById("pokemon-form");
    elements.pokemonInput = document.getElementById("pokemon-input");
    elements.terminalOutput = document.getElementById("terminal-output");
  }

  function bindEvents() {
    elements.refreshDevicesButton.addEventListener("click", refreshDevices);
    elements.startVideoButton.addEventListener("click", startSelectedVideo);
    elements.toggleFullscreenButton?.addEventListener("click", toggleFullscreen);
    elements.deviceSelect.addEventListener("change", handleDeviceSelectionChange);
    elements.video.addEventListener("loadedmetadata", handleVideoReady);
    elements.pokemonForm.addEventListener("submit", handlePokemonSearch);
    elements.cropOverlay.addEventListener("pointerdown", startCropInteraction);
    window.addEventListener("pointermove", updateCropInteraction);
    window.addEventListener("pointerup", finishCropInteraction);
    window.addEventListener("pointercancel", finishCropInteraction);
    window.addEventListener("resize", refreshWorkspaceLayout);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    Object.values(elements.cropInputs).forEach((input) => {
      input.addEventListener("change", applyCropInputs);
    });

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
      setCameraState("このブラウザでは映像入力を使えません", "error");
      elements.startVideoButton.disabled = true;
      elements.refreshDevicesButton.disabled = true;
      elements.deviceSelect.disabled = true;
      renderCameraDetails();
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      state.devices = devices.filter((device) => device.kind === "videoinput");
      state.hasObsDevice = state.devices.some(isObsDevice);
      populateDeviceSelect();

      if (state.devices.length === 0) {
        state.selectedDeviceId = "";
        setCameraState("映像デバイス未接続", "error");
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
        setCameraState("映像開始待ち", "idle");
      }
      renderCameraDetails();
    } catch (error) {
      setCameraState("デバイス一覧取得失敗", "error");
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

  function handleDeviceSelectionChange() {
    state.deviceSelectionLocked = true;
    state.selectedDeviceId = elements.deviceSelect.value;
    renderCameraDetails();
  }

  async function startSelectedVideo() {
    if (!state.devices.length) {
      setCameraState("映像デバイス未接続", "error");
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
    state.selectedDeviceId = selectedDeviceId || "";
    setCameraState("映像を開始しています…", "working");

    try {
      stopCurrentStream();
      const stream = await requestPreferredStream(selectedDeviceId);

      state.stream = stream;
      elements.video.srcObject = stream;
      elements.video.muted = true;
      await elements.video.play();

      await refreshDevices();
    } catch (error) {
      handleStreamError(error);
    }
  }

  async function requestPreferredStream(selectedDeviceId) {
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

    let message = "ストリーム開始失敗";
    let detail = "映像入力の開始に失敗しました。";

    if (error && error.name === "NotAllowedError") {
      message = "権限拒否";
      detail = "ブラウザで映像アクセスが拒否されました。アドレスバーの権限設定を確認してください。";
    } else if (error && error.name === "NotFoundError") {
      message = "デバイス未接続";
      detail = "選択した映像入力が見つかりません。デバイスの再接続後に一覧更新してください。";
    } else if (error && error.name === "NotReadableError") {
      message = "デバイス使用中";
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
    elements.cropPreviewShell.dataset.ready = "true";
    refreshWorkspaceLayout();

    const restored = restoreCrop(dimensions.width, dimensions.height);
    const initialCrop = restored || getDefaultCrop(dimensions.width, dimensions.height);
    updateCrop(initialCrop, { save: false, syncInputs: true });
    setCropControlsDisabled(false);
    setCameraState(
      state.streamInfo.inputLabel,
      state.streamInfo.isSixteenByNine ? "success" : "working",
    );
    renderCameraDetails();
    setCropStatus("");
    startPreviewLoop();
  }

  function handlePokemonSearch(event) {
    event.preventDefault();

    const query = elements.pokemonInput.value.trim();
    if (!query) {
      appendTerminalEntry(
        [
          "> ",
          "空入力では検索しません。ポケモン名を入力してください。",
        ],
        "error",
      );
      return;
    }

    if (!state.csvReady) {
      appendTerminalEntry(
        [
          `> ${query}`,
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
          `> ${query}`,
          "該当ポケモンが見つかりませんでした。",
          "CSV に入っている表記と完全一致する名前で入力してください。",
        ],
        "error",
      );
      return;
    }

    appendTerminalEntry(
      [
        `> ${pokemon.name}`,
        `タイプ: ${pokemon.types.join(" / ")}`,
        `特性: ${pokemon.abilities.join(" / ")}`,
        `種族値: H${pokemon.stats.H} A${pokemon.stats.A} B${pokemon.stats.B} C${pokemon.stats.C} D${pokemon.stats.D} S${pokemon.stats.S}`,
      ],
      "success",
    );
  }

  function startCropInteraction(event) {
    if (!state.videoReady || !state.crop || event.button !== 0) {
      return;
    }

    const displayedRect = getDisplayedVideoRect();
    if (!displayedRect) {
      return;
    }

    const mode = event.target === elements.cropHandle ? "resize" : "move";
    state.drag = {
      pointerId: event.pointerId,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startCrop: { ...state.crop },
      pixelsToVideoX: getStreamDimensions().width / displayedRect.width,
      pixelsToVideoY: getStreamDimensions().height / displayedRect.height,
    };

    if (elements.cropOverlay.setPointerCapture) {
      elements.cropOverlay.setPointerCapture(event.pointerId);
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

    updateCrop(nextCrop, { save: true, syncInputs: true });
  }

  function finishCropInteraction(event) {
    if (!state.drag || event.pointerId !== state.drag.pointerId) {
      return;
    }

    state.drag = null;
  }

  function applyCropInputs() {
    if (!state.videoReady) {
      return;
    }

    const nextCrop = {
      x: Number(elements.cropInputs.x.value),
      y: Number(elements.cropInputs.y.value),
      width: Number(elements.cropInputs.width.value),
      height: Number(elements.cropInputs.height.value),
    };

    updateCrop(nextCrop, { save: true, syncInputs: true });
  }

  function updateCrop(nextCrop, options = {}) {
    const { save = true, syncInputs = false } = options;
    const dimensions = getStreamDimensions();
    if (!dimensions.width || !dimensions.height) {
      return;
    }

    state.crop = clampCrop(nextCrop, dimensions.width, dimensions.height);
    renderCropOverlay();
    updatePreviewCanvasSize();

    if (syncInputs) {
      syncCropInputs();
    }

    if (save) {
      persistCrop(state.crop, dimensions.width, dimensions.height);
    }
  }

  function handleFullscreenChange() {
    syncFullscreenButton();
    refreshWorkspaceLayout();
  }

  function refreshWorkspaceLayout() {
    updateVideoStageLayout();
    updatePreviewCanvasLayout();
    renderCropOverlay();
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

  function updatePreviewCanvasLayout() {
    const shell = elements.cropPreviewShell;
    if (!shell) {
      return;
    }

    const cropAspect = state.crop ? state.crop.width / state.crop.height : 1;
    const fittedRect = fitAspectRect(
      shell.clientWidth,
      shell.clientHeight,
      cropAspect,
    );

    if (!fittedRect) {
      return;
    }

    elements.cropCanvas.style.width = `${fittedRect.width}px`;
    elements.cropCanvas.style.height = `${fittedRect.height}px`;
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

  function renderCropOverlay() {
    if (!state.videoReady || !state.crop) {
      elements.cropOverlay.classList.add("is-hidden");
      return;
    }

    const displayedRect = getDisplayedVideoRect();
    const dimensions = getStreamDimensions();
    if (!displayedRect || !dimensions.width || !dimensions.height) {
      return;
    }

    const scaleX = displayedRect.width / dimensions.width;
    const scaleY = displayedRect.height / dimensions.height;

    elements.cropOverlay.style.left = `${displayedRect.offsetX + state.crop.x * scaleX}px`;
    elements.cropOverlay.style.top = `${displayedRect.offsetY + state.crop.y * scaleY}px`;
    elements.cropOverlay.style.width = `${state.crop.width * scaleX}px`;
    elements.cropOverlay.style.height = `${state.crop.height * scaleY}px`;
    elements.cropOverlay.classList.remove("is-hidden");
  }

  function updatePreviewCanvasSize() {
    if (!state.crop) {
      return;
    }

    const width = Math.max(1, Math.round(state.crop.width));
    const height = Math.max(1, Math.round(state.crop.height));
    if (elements.cropCanvas.width !== width || elements.cropCanvas.height !== height) {
      elements.cropCanvas.width = width;
      elements.cropCanvas.height = height;
    }

    updatePreviewCanvasLayout();
  }

  function startPreviewLoop() {
    stopPreviewLoop();

    const draw = () => {
      if (!state.videoReady || !state.crop || !state.stream) {
        return;
      }

      drawCropPreview();
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

  function drawCropPreview() {
    const context = elements.cropCanvas.getContext("2d");
    if (!context || !state.crop) {
      return;
    }

    const sourceX = Math.round(state.crop.x);
    const sourceY = Math.round(state.crop.y);
    const sourceWidth = Math.round(state.crop.width);
    const sourceHeight = Math.round(state.crop.height);

    context.clearRect(0, 0, elements.cropCanvas.width, elements.cropCanvas.height);
    context.drawImage(
      elements.video,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      elements.cropCanvas.width,
      elements.cropCanvas.height,
    );
  }

  function stopCurrentStream() {
    stopPreviewLoop();

    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
      state.stream = null;
    }

    state.streamInfo = null;
    state.videoReady = false;
    elements.videoStage.dataset.ready = "false";
    elements.cropPreviewShell.dataset.ready = "false";
    elements.video.srcObject = null;
    elements.cropOverlay.classList.add("is-hidden");
    setCropControlsDisabled(true);
    setCropStatus("");
    renderCameraDetails();
    refreshWorkspaceLayout();
  }

  function setCropControlsDisabled(disabled) {
    Object.values(elements.cropInputs).forEach((input) => {
      input.disabled = disabled;
    });
  }

  function setCameraState(message, tone) {
    elements.cameraState.textContent = message;
    elements.cameraState.dataset.tone = tone;
  }

  function renderCameraDetails() {
    return;
  }

  function setCropStatus(message) {
    return message;
  }

  function syncCropInputs() {
    if (!state.crop) {
      return;
    }

    elements.cropInputs.x.value = Math.round(state.crop.x);
    elements.cropInputs.y.value = Math.round(state.crop.y);
    elements.cropInputs.width.value = Math.round(state.crop.width);
    elements.cropInputs.height.value = Math.round(state.crop.height);
  }

  function appendTerminalEntry(lines, tone = "system") {
    const entry = document.createElement("div");
    entry.className = `terminal-entry terminal-entry--${tone}`;
    entry.textContent = Array.isArray(lines) ? lines.join("\n") : String(lines);
    elements.terminalOutput.append(entry);
    elements.terminalOutput.scrollTop = elements.terminalOutput.scrollHeight;
  }

  function getDefaultCrop(videoWidth, videoHeight) {
    return clampCrop(
      {
        x: videoWidth * 0.848,
        y: videoHeight * 0.038,
        width: videoWidth * 0.142,
        height: videoHeight * 0.924,
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

  function persistCrop(crop, videoWidth, videoHeight) {
    const payload = {
      ratios: {
        x: crop.x / videoWidth,
        y: crop.y / videoHeight,
        width: crop.width / videoWidth,
        height: crop.height / videoHeight,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function restoreCrop(videoWidth, videoHeight) {
    const raw = localStorage.getItem(STORAGE_KEY);
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

    return state.hasObsDevice ? "4:3入力です。OBS推奨。" : "4:3入力です。16:9推奨。";
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
