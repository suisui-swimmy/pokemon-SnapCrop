(() => {
  const DISPLAY_CATALOG_PATH = "./data/pokemon-display-catalog.json";
  const POKEMON_ICON_WORKER_PATH = "./pokemon-icon-worker.js";
  const POKEMON_ICON_MATCHER_PATH = "./pokemon-icon-matcher.js";
  const APP_VERSION = "pokemon-snapcrop-v1.7.5";
  const diagnosticExportCounts = new WeakMap();
  const AUDIO_PERMISSION_DEVICE_ID = "__request_audio_permission__";
  const POKEMON_ICON_RECOGNITION_LEGEND_CLASSES = new Set([
    "mythical",
    "sublegendary",
    "restricted",
  ]);
  const BATTLE_RESULT_TEMPLATE_PATH = "./assets/auto/win-icon.png";
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
  const POKEMON_TYPE_COLORS = {
    あく: "#624D4E",
    いわ: "#AFA981",
    エスパー: "#EF4179",
    かくとう: "#FF8000",
    くさ: "#3FA129",
    ゴースト: "#704170",
    こおり: "#3DCEF3",
    じめん: "#915121",
    でんき: "#FAC000",
    どく: "#9141CB",
    ドラゴン: "#5060E1",
    ノーマル: "#9FA19F",
    はがね: "#60A1B8",
    ひこう: "#81B9EF",
    フェアリー: "#EF70EF",
    ほのお: "#E62829",
    みず: "#2980EF",
    むし: "#91A119",
  };
  const CROP_SIDES = ["my", "enemy"];
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
    "faint",
    "pick",
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
      y: 112 / 1080,
      width: 299 / 1920,
      height: 807 / 1080,
    },
    enemy: {
      x: 1326 / 1920,
      y: 112 / 1080,
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
      selectionRecovery: 2,
      recoveryBattleHud: 2,
      locked: 2,
    },
    timeoutsMs: {
      loadingToSelection: 6000,
      loadingToSelectionRecovery: 30000,
    },
    selectionDiagnosticHistoryLimit: 4,
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
        hudAccentMin: 0.56,
        hudBrightMin: 0.19,
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
      bottomDoneBar: {
        x: 110 / 1920,
        y: 911 / 1080,
        width: 467 / 1920,
        height: 70 / 1080,
      },
      waitingTimerIcon: {
        x: 0.41094,
        y: 0.0963,
        width: 0.04635,
        height: 0.03611,
      },
      battleHud: {
        x: 1685 / 1920,
        y: 608 / 1080,
        width: 206 / 1920,
        height: 206 / 1080,
      },
    },
  };
  const BATTLE_RESULT_CONFIG = {
    checkIntervalMs: 320,
    requiredBattleHudFrames: 2,
    requiredMatchStreak: 2,
    searchOffsets: [0, -2, 2, -4, 4],
    searchPadding: 4,
    thresholds: {
      coverageMin: 0.86,
      spillMax: 0.32,
    },
    rois: {
      left: {
        x: 430 / 1920,
        y: 755 / 1080,
        width: 100 / 1920,
        height: 100 / 1080,
      },
      right: {
        x: 1390 / 1920,
        y: 755 / 1080,
        width: 100 / 1920,
        height: 100 / 1080,
      },
    },
  };
  const PICK_OVERLAY_ORDER_LABELS = ["", "１", "２", "３", "４"];
  const PICK_OVERLAY_CONFIG = {
    compareIntervalMs: 250,
    sampleWidth: 60,
    sampleHeight: 75,
    requiredStrongStreak: 2,
    requiredHudOnlyStreak: 4,
    requiredWeakStreak: 3,
    gateGraceMs: 1500,
    maxOrders: 4,
    thresholds: {
      scoreMin: 0.80,
      marginMin: 0.05,
      scoreMinStrongMargin: 0.74,
      marginStrongMin: 0.13,
      scoreWeakMin: 0.70,
      marginWeakMin: 0.11,
      hudOnlyScoreMin: 0.92,
      hudOnlyMarginMin: 0.16,
      hudGateMeanMin: 58,
      hudGateContrastMin: 26,
      hudGateBrightRatioMin: 0.08,
    },
    hudSearchOffsets: [
      { x: 0, y: 0 },
      { x: -3, y: 0 },
      { x: 3, y: 0 },
      { x: -6, y: 0 },
      { x: 6, y: 0 },
      { x: 0, y: -3 },
      { x: 0, y: 3 },
      { x: 0, y: -6 },
      { x: 0, y: 6 },
      { x: -3, y: -2 },
      { x: 3, y: -2 },
      { x: -3, y: 2 },
      { x: 3, y: 2 },
      { x: -6, y: -4 },
      { x: 6, y: -4 },
      { x: -6, y: 4 },
      { x: 6, y: 4 },
    ],
    hudRois: [
      { x: 1113 / 1920, y: 73 / 1080, width: 68 / 1920, height: 84 / 1080 },
      { x: 1509 / 1920, y: 73 / 1080, width: 68 / 1920, height: 84 / 1080 },
    ],
    referenceRois: [
      { x: 84 / 299, y: 92 / 807, width: 68 / 299, height: 84 / 807 },
      { x: 84 / 299, y: 218 / 807, width: 68 / 299, height: 84 / 807 },
      { x: 84 / 299, y: 344 / 807, width: 68 / 299, height: 84 / 807 },
      { x: 84 / 299, y: 470 / 807, width: 68 / 299, height: 84 / 807 },
      { x: 84 / 299, y: 596 / 807, width: 68 / 299, height: 84 / 807 },
      { x: 84 / 299, y: 722 / 807, width: 68 / 299, height: 84 / 807 },
    ],
    badgeImagePaths: {
      1: "./assets/pick-overlay-badge-1.svg",
      2: "./assets/pick-overlay-badge-2.svg",
      3: "./assets/pick-overlay-badge-3.svg",
      4: "./assets/pick-overlay-badge-4.svg",
    },
    flashFrameImagePath: "./assets/pick-overlay-flash-frame.svg",
    correctionFrameImagePath: "./assets/pick-overlay-correction-frame.svg",
    faintFrameImagePath: "./assets/pick-overlay-faint-frame.svg",
    flashFrameDurationMs: 1000,
    flashFrameBaseSize: {
      width: 299,
      height: 114,
    },
    badgeSlotPositions: [
      { x: 0 / 299, y: 62 / 807 },
      { x: 0 / 299, y: 188 / 807 },
      { x: 0 / 299, y: 314 / 807 },
      { x: 0 / 299, y: 440 / 807 },
      { x: 0 / 299, y: 566 / 807 },
      { x: 0 / 299, y: 692 / 807 },
    ],
  };
  const POKEMON_ICON_RECOGNITION_CONFIG = {
    sampleWidth: 64,
    sampleHeight: 64,
    imageLoadConcurrency: 24,
    alphaThreshold: 24,
    refineCandidateLimit: 48,
    searchScales: [0.84, 0.92, 1, 1.08, 1.16],
    searchOffsets: [-8, -4, 0, 4, 8],
    colorWeight: 0.16,
    scoreMin: 0.74,
    marginMin: 0.025,
    referenceRois: [
      { x: 57 / 299, y: 62 / 807, width: 114 / 299, height: 114 / 807 },
      { x: 57 / 299, y: 188 / 807, width: 114 / 299, height: 114 / 807 },
      { x: 57 / 299, y: 314 / 807, width: 114 / 299, height: 114 / 807 },
      { x: 57 / 299, y: 440 / 807, width: 114 / 299, height: 114 / 807 },
      { x: 57 / 299, y: 566 / 807, width: 114 / 299, height: 114 / 807 },
      { x: 57 / 299, y: 692 / 807, width: 114 / 299, height: 114 / 807 },
    ],
    sourceTieEpsilon: 0.004,
    sourcePriority: {
      champions: 0,
      sv: 1,
      supplemental: 2,
    },
    workerEnabled: true,
    prewarmIdleTimeoutMs: 1500,
  };
  const PERFORMANCE_DEBUG_CONFIG = {
    logCooldownMs: 1200,
    thresholds: {
      captureAutoSnapMetrics: 12,
      updatePickOverlayDetection: 12,
      battleResultDetection: 12,
      performSnapCapture: 16,
      pokemonIconCandidateLoad: 120,
      pokemonIconRecognition: 80,
      pokemonIconSlot: 25,
    },
  };
  const MATCH_LOG_CONFIG = {
    completedLimit: 3,
    eventLimit: 256,
    sampleLimit: 1800,
    sampleIntervalMs: 1000,
    textLimit: 2000,
  };
  const PICK_DIAGNOSTIC_CONFIG = { comparisonLimit: 7200, eventLimit: 256 };
  const PICK_DIAGNOSTIC_REASONS = {
    no_reference: "相手参照画像なし", phase_wait: "撮影後の監視段階待ち",
    interval_wait: "通常の比較間隔待ち", screen_blocked: "画面判定で比較を保留",
    video_missing: "入力サイズなし", hud_read_failed: "HUD画像の読み取り失敗",
    hud_quality_rejected: "HUDの明るさ・明暗差が不足", reference_read_failed: "参照画像の読み取り失敗",
    compared: "比較実行", no_candidate: "比較候補なし", threshold_rejected: "スコア・点差の採用条件不足",
    contested: "同じ参照枠への候補競合", already_assigned: "採番済み", pending: "連続一致待ち",
    accepted: "自動採番確定", order_limit: "採番上限", candidate_changed: "連続一致の候補変更",
    pending_cleared: "連続一致の解除", grace_kept: "画面判定待ちで連続一致を一時保持",
    grace_expired: "連続一致の保持期限切れ", reset: "採番状態の初期化",
    manual_set: "手動採番・移動", manual_clear: "手動解除",
    recognition_wait: "名前推定待ち", name_unresolved: "名前未確定", data_wait: "ポケモン情報データ待ち",
    data_missing: "該当ポケモン情報なし", emitted: "統計表示完了",
    stats_wait: "統計取得待ち", stats_absent: "統計未掲載", stats_error: "統計取得失敗", rule_unset: "統計ルール未選択",
  };
  const FAINT_DIAGNOSTIC_CONFIG = { comparisonLimit: 7200, eventLimit: 256 };
  const FAINT_DIAGNOSTIC_REASONS = {
    missing_slot: "対象ポケモンの枠を特定できない", roi_read_failed: "瀕死判定範囲の読み取り失敗",
    already_fainted: "瀕死表示済み", not_matched: "瀕死の画像条件が不成立",
    pending: "瀕死条件の一致回数待ち", accepted: "瀕死表示を確定",
    mapping_changed: "HUDとポケモンの対応元・対象が変化", candidate_changed: "一致待ちの対象変更",
    pending_kept: "一致待ちを一時保持", pending_expired: "一致待ちの保持期限切れ",
    pending_cleared: "一致待ちを解除", reset: "瀕死状態・対応履歴を初期化",
    manual_set: "手動採番に伴う瀕死状態・対応履歴の変更", manual_clear: "手動解除に伴う瀕死状態・対応履歴の変更",
  };
  const FAINT_DETECTION_CONFIG = {
    compareIntervalMs: 250,
    requiredStrongStreak: 2,
    requiredResolvedStrongStreak: 1,
    requiredWeakStreak: 3,
    // 0 means the HUD->slot cache stays until reset or a stronger live match replaces it.
    slotCacheTtlMs: 0,
    pendingGraceMs: 2200,
    thresholds: {
      iconPinkMax: 0.18,
      iconRedMin: 0.06,
      iconWhiteMin: 0.08,
      hudRedMax: 0.22,
      hudDarkMin: 0.08,
      hudMeanPeakMax: 0.45,
      percentWhiteMin: 0.12,
    },
    strongThresholds: {
      iconPinkMax: 0.10,
      iconWhiteMin: 0.16,
      hudRedMax: 0.08,
      hudDarkMin: 0.12,
      hudMeanPeakMax: 0.36,
    },
    hudRois: [
      {
        faintIcon: { x: 1158 / 1920, y: 21 / 1080, width: 50 / 1920, height: 50 / 1080 },
        hudColor: { x: 1394 / 1920, y: 56 / 1080, width: 30 / 1920, height: 30 / 1080 },
        percent: { x: 1380 / 1920, y: 127 / 1080, width: 57 / 1920, height: 39 / 1080 },
      },
      {
        faintIcon: { x: 1554 / 1920, y: 21 / 1080, width: 50 / 1920, height: 50 / 1080 },
        hudColor: { x: 1790 / 1920, y: 56 / 1080, width: 30 / 1920, height: 30 / 1080 },
        percent: { x: 1776 / 1920, y: 127 / 1080, width: 57 / 1920, height: 39 / 1080 },
      },
    ],
  };

  const elements = {};
  const state = {
    catalog: null, api: null, remoteIndex: null, statsModule: null, statsSettings: null, statistics: null,
    rulePicker: false, catalogLoading: false, statsPrefetchKey: "", compatibilityReady: false, candidateCache: new Map(),
    pokemonMap: new Map(),
    pokemonSearchIndex: [],
    pokemonSearchIds: new Set(),
    pokemonSearchStatus: "loading",
    catalogReady: false,
    stream: null,
    mediaStartInProgress: false,
    mediaPermissionsPrepared: false,
    audioInputRequestId: 0,
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
    performanceDebug: createPerformanceDebugState(),
    matchLog: createMatchLogState(),
    terminalLogAutoFollow: true,
    terminalLogPendingBottomScroll: false,
    terminalForceAutoscrollDepth: 0,
    pickOverlayBadgeImages: {},
    pickOverlayFlashFrameImage: null,
    pickOverlayCorrectionFrameImage: null,
    pickOverlayFaintFrameImage: null,
    pickOverlayEffectFrameId: 0,
    pokemonIconReferenceReady: false,
    pokemonIconManifest: null,
    pokemonIconReferenceEntries: [],
    pokemonIconReferenceLoadFailed: false,
    pokemonIconManifestFetchMs: 0,
    pokemonIconCandidates: [],
    pokemonIconCandidatesPromise: null,
    pokemonIconCandidatesLoadFailed: false,
    pokemonIconRecognition: createPokemonIconRecognitionState(),
    pokemonIconWorker: null,
    pokemonIconWorkerState: createPokemonIconWorkerState(),
    pokemonIconRequestSequence: 0,
    pokemonIconSampleCanvas: null,
    pokemonIconSampleContext: null,
    autoSnap: createAutoSnapState(),
    battleResultTemplate: createPendingAutoTemplate(),
    battleResultDetection: createBattleResultDetectionState(),
    battleResultDetectorCanvas: null,
    battleResultDetectorContext: null,
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
    void initializeMediaInput();
    loadAutoTemplates();
    loadBattleResultTemplate();
    loadPickOverlayBadgeImages();
    state.serviceWorkerReady = registerServiceWorker();
    void loadDisplayCatalog();
    appendTerminalNotice(
      "command-hint",
      [
        `[system] 自動撮影: ${state.autoSnap.enabled ? "ON" : "OFF"}。操作案内は help で確認できます。`,
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
      doneBar: document.getElementById("debug-overlay-done-bar"),
      selectionTimer: document.getElementById("debug-overlay-selection-timer"),
      topTimer: document.getElementById("debug-overlay-top-timer"),
      battleHud: document.getElementById("debug-overlay-battle-hud"),
      battleResultLeft: document.getElementById("debug-overlay-result-left"),
      battleResultRight: document.getElementById("debug-overlay-result-right"),
      pickHudLeft: document.getElementById("debug-overlay-pick-hud-left"),
      pickHudRight: document.getElementById("debug-overlay-pick-hud-right"),
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


  async function loadDisplayCatalog() {
    if (state.catalogLoading) return;
    state.catalogLoading = true;
    try {
      const [apiModule, statsModule, response] = await Promise.all([
        import("./battle-api.js"), import("./battle-statistics.js"), fetch(DISPLAY_CATALOG_PATH),
      ]);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const catalog = await response.json();
      if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.pokemon)) throw new Error("名前辞書の形式が不正です。");
      state.catalog = catalog;
      state.statsModule = statsModule;
      let storage;
      try { storage = window.localStorage; } catch { storage = null; }
      state.statsSettings = statsModule.restoreStatsSettings(storage);
      state.api = apiModule.createBattleApi({ catalog, fetchImpl: async (...args) => {
        await ensureRemoteCachePolicy();
        return fetch(...args);
      } });
      state.pokemonMap = new Map(catalog.pokemon.map((entry) => [entry.id, entry]));
      rebuildPokemonSearchIndex();
      state.statistics = statsModule.createStatisticsPresenter({
        api: state.api, catalog, getIndex: () => state.remoteIndex, getIndexError: () => state.pokemonIconReferenceLoadFailed ? new Error("一覧取得失敗") : null, getSettings: () => state.statsSettings,
        appendElement: appendTerminalElement,
        onUpdate: () => { if (state.terminalLogAutoFollow) scrollTerminalToBottom(); },
        onDiagnostic: recordStatisticsDiagnostic,
      });
      state.catalogReady = true;
      if (!state.statsSettings.rule) {
        appendTerminalEntry(["[system] 統計のルールを選択してください。Tabでシングル／ダブル、Enterで確定、Escで後回しにできます。stats rule で再表示できます。"], "system");
        if (!elements.terminalInput?.value.trim() && !state.isComposing) state.rulePicker = true;
      }
      refreshTerminalSuggestions();
      void loadPokemonIconReference();
    } catch (error) {
      state.catalogReady = false;
      appendTerminalError("[error] 名前辞書の読み込みに失敗しました。api retry で再試行できます。", error);
    } finally { state.catalogLoading = false; }
  }

  function recordStatisticsDiagnostic(event) {
    const match = state.matchLog.current;
    const origin = state.matchLog.references.enemy;
    if (!match || event.captureId !== origin?.captureId || event.matchId !== match.diagnostic.matchId) return;
    recordMatchLogEvent("battle-stats", "[stats] 統計表示", event);
    const reason = { loading: "stats_wait", absent: "stats_absent", error: "stats_error", ready: "emitted", "rule-unset": "rule_unset", "index-wait": "stats_wait" }[event.state];
    if (reason && Number.isInteger(event.refIndex)) recordPickDisplayDiagnostic(event.refIndex, reason, state.pokemonIconRecognition);
  }

  function syncStatisticsSelection() {
    if (!state.statistics) return;
    const origin = state.matchLog.references.enemy;
    state.statistics.setCapture(state.references.enemy ? origin?.captureId ?? null : null, origin?.diagnostic?.matchId ?? null);
    const recognition = state.pokemonIconRecognition;
    if (recognition.reference !== state.references.enemy) {
      state.statistics.setAutomaticSelections([]);
      return;
    }
    const selections = [];
    state.autoSnap.pickOverlay.ordersByRefIndex.forEach((order, refIndex) => {
      const result = recognition.resultsByRefIndex[refIndex];
      if (order && result?.matched && result.showdownId) selections.push({ refIndex, order, formId: result.showdownId });
    });
    state.statistics.setAutomaticSelections(selections);
  }

  async function retryRemoteData() {
    if (!state.api) { await loadDisplayCatalog(); return; }
    if (!state.remoteIndex || state.pokemonIconReferenceLoadFailed) await loadPokemonIconReference(true);
    else if (state.pokemonIconWorker && state.pokemonIconWorkerState.prewarmStatus === "failed") {
      state.pokemonIconWorker.postMessage({ type: "retry-prewarm" });
    } else if (!state.pokemonIconWorker && state.pokemonIconCandidatesLoadFailed) {
      await ensurePokemonIconCandidatesLoaded();
      if (state.references.enemy && !state.pokemonIconCandidatesLoadFailed) scheduleEnemyReferencePokemonRecognition();
    }
    state.statistics?.retry();
  }

  function handleStatsCommand(query) {
    if (!state.statsModule) {
      appendTerminalEntry(["[system] 名前辞書の準備中です。少し待ってから入力してください。"], "system");
      return true;
    }
    const result = state.statsModule.parseStatsCommand(query, state.statsSettings);
    if (result.error) { appendTerminalEntry([`[error] ${result.error}`], "error"); return true; }
    if (result.openRulePicker) {
      state.rulePicker = true;
      refreshTerminalSuggestions();
      return true;
    }
    if (result.settings) {
      const previous = state.statsSettings;
      state.statsSettings = result.settings;
      state.rulePicker = false;
      try { localStorage.setItem(state.statsModule.STATS_STORAGE_KEY, JSON.stringify(state.statsSettings)); }
      catch { appendTerminalEntry(["[system] 設定を保存できませんでした。このページでは適用します。"], "system"); }
      state.statistics?.settingsChanged(previous);
      if (previous.rule !== state.statsSettings.rule) {
        rebuildPokemonSearchIndex();
        prefetchRecognizedStatistics();
      }
      refreshTerminalSuggestions();
      const status = getStatisticsStatusLines();
      appendTerminalEntry([/^stats\s+rule\s/iu.test(query) ? status[0] : status[1]], "system");
      return true;
    }
    appendTerminalEntry(getStatisticsStatusLines(), "system");
    return true;
  }

  function getStatisticsStatusLines() {
    const settings = state.statsSettings;
    if (!settings) return ["[stats] 名前辞書の準備中"];
    const labels = { move: "技", ability: "特性", held_item: "持ち物", stat_alignment: "性格" };
    const rule = settings.rule === "Singles" ? "シングル" : settings.rule === "Doubles" ? "ダブル" : "未選択";
    const imageStatus = state.compatibilityReady ? "準備完了（互換処理）" : ({ ready: "準備完了", loading: "読み込み中", queued: "準備中", idle: "準備前", failed: "取得失敗", unsupported: "互換処理で準備中" }[state.pokemonIconWorkerState.prewarmStatus] || "準備中");
    return [`[stats] ルール: ${rule} / 最新`,
      `[stats] 表示: ${settings.fields.map((field) => `${labels[field]} ${settings.top[field] === "all" ? "掲載分すべて" : `上位${settings.top[field]}件`}`).join(" / ")} / 最低使用率 ${settings.min}%`,
      `[stats] 比較画像: ${imageStatus}${imageStatus === "取得失敗" ? " / 再試行は api retry" : ""}`];
  }

  async function loadPokemonIconReference(force = false) {
    const startedAt = getPerformanceDebugNow();
    rebuildPokemonSearchIndex("loading");
    refreshTerminalSuggestions();
    try {
      state.pokemonIconReferenceLoadFailed = false;
      const index = await (force ? state.api.retryIndex() : state.api.loadIndex());
      // Statistics/search availability comes from the index, independently of
      // whether any of its images are eligible for automatic recognition.
      state.remoteIndex = index;
      rebuildPokemonSearchIndex("ready");
      refreshTerminalSuggestions();
      state.statistics?.retry();
      const manifest = { ...index, stats: { rawCandidateCount: index.icons.length, canonicalCandidateCount: index.icons.length } };
      const manifestEntries = Array.isArray(manifest?.icons)
        ? manifest.icons
          .filter((entry) => entry?.path && entry?.pokemonName)
          .map((entry) => ({
            ...entry,
            id: String(entry.id || ""),
            source: String(entry.source || ""),
            path: String(entry.path || ""),
            pokemonName: String(entry.pokemonName || ""),
            speciesKey: String(entry.speciesKey || ""),
            variantKey: String(entry.variantKey || ""),
          }))
        : [];
      const entries = manifestEntries.filter(isPokemonIconRecognitionCandidate);

      if (!entries.length) {
        throw new Error("ポケモン名認識の候補データが空です。");
      }

      state.pokemonIconManifest = manifest;
      state.pokemonIconReferenceEntries = entries;
      state.pokemonIconReferenceReady = true;
      state.pokemonIconReferenceLoadFailed = false;
      state.pokemonIconRecognition.lastSummary = `manifest ready eligible=${entries.length}/${manifestEntries.length}`;
      appendPokemonIconDebugLogIfChanged(
        `manifest-ready:${entries.length}:${manifestEntries.length}`,
        [`[debug] icon recog: manifest ready eligible=${entries.length}/${manifestEntries.length}`],
      );
      schedulePokemonIconWorkerPrewarm();
      if (state.references.enemy) {
        scheduleEnemyReferencePokemonRecognition();
      }
    } catch (error) {
      if (state.pokemonSearchStatus === "loading") {
        rebuildPokemonSearchIndex("failed");
        refreshTerminalSuggestions();
      }
      state.pokemonIconReferenceReady = false;
      state.pokemonIconReferenceLoadFailed = true;
      state.statistics?.retry();
      state.pokemonIconRecognition.status = "unavailable";
      state.pokemonIconRecognition.reason = "manifest load failed";
      state.pokemonIconRecognition.lastSummary = `manifest load failed: ${error.message}`;
      appendTerminalNotice(
        "pokemon-icon-reference-load-failed",
        [
          "[system] 比較画像の一覧を取得できませんでした。api retry で再試行できます。",
        ],
        "system",
      );
      appendTerminalDebug([`[debug] icon reference load failed: ${error.message}`]);
    } finally {
      state.pokemonIconManifestFetchMs = getPerformanceDebugNow() - startedAt;
    }
  }

  function isPokemonIconRecognitionCandidate(entry) {
    return Boolean(entry && entry.supported !== false && !entry.isMega && entry.isRecognitionCandidate !== false);
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

  async function initializeMediaInput() {
    if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.enumerateDevices) {
      await refreshDevices();
      return;
    }
    if (!state.stream && !state.mediaStartInProgress) {
      await runControlActionAndRestoreTerminalFocus(startSelectedVideo);
    }
  }

  async function prepareMediaPermissions() {
    const preferredVideoDeviceId = state.selectedDeviceId;
    const preferredAudioDeviceId = state.selectedAudioDeviceId;
    let permissionStream;
    let audioAvailable = true;
    try {
      try {
        permissionStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        audioAvailable = false;
        appendTerminalDebug(["[debug] カメラとマイクを同時に取得できなかったため、映像のみで開始を試みます。"]);
        permissionStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      // Enumerate while the permission tracks are live so device names are exposed.
      state.selectedDeviceId = preferredVideoDeviceId;
      state.selectedAudioDeviceId = preferredAudioDeviceId;
      const devicesReady = await refreshDevices();
      state.mediaPermissionsPrepared = devicesReady;
      return { devicesReady, audioAvailable };
    } finally {
      permissionStream?.getTracks().forEach((track) => track.stop());
    }
  }

  function syncMediaStartControls() {
    const unsupported = !navigator.mediaDevices?.getUserMedia;
    elements.refreshDevicesButton.disabled = unsupported || Boolean(state.mediaStartInProgress);
    elements.startVideoButton.disabled = unsupported || Boolean(state.mediaStartInProgress)
      || (state.mediaPermissionsPrepared && !state.devices.length);
    elements.deviceSelect.disabled = unsupported || Boolean(state.mediaStartInProgress) || !state.devices.length;
    if (elements.audioSelect) {
      elements.audioSelect.disabled = unsupported || Boolean(state.mediaStartInProgress) || !state.audioDevices.length;
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
          "[error] このブラウザでは映像入力を利用できません。MediaDevices API に対応したブラウザで開いてください。",
        ],
        "error",
      );
      renderCameraDetails();
      return false;
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
        return false;
      }

      const hasNamedDevice = state.devices.some((device) => device.label);
      if (!hasNamedDevice && !state.videoReady) {
        setCameraState("権限待ち", "working");
        renderCameraDetails();
        return true;
      }

      if (!state.videoReady) {
        setCameraState("開始待ち", "idle");
      }
      renderCameraDetails();
      return true;
    } catch (error) {
      setCameraState("失敗", "error");
      appendTerminalError(
        "[error] 映像入力の一覧取得に失敗しました。ページを再読み込みして、もう一度試してください。",
        error,
      );
      return false;
    } finally {
      syncMediaStartControls();
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

    selected ||= findObsDevice() || state.devices[0];
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
      option.value = device.deviceId || AUDIO_PERMISSION_DEVICE_ID;
      option.textContent = device.label || `音声入力 ${index + 1}`;
      elements.audioSelect.append(option);
    });

    const selectedVideoDevice = getSelectedDevice()
      || state.devices.find((device) => device.deviceId === elements.deviceSelect.value)
      || null;
    const suggestedAudioDevice = findAssociatedAudioDevice(selectedVideoDevice);

    let selectedValue = "";
    const hasCurrentAudioDevice = state.audioDevices.some(
      (device) => (device.deviceId || AUDIO_PERMISSION_DEVICE_ID) === currentValue,
    );
    if (state.audioSelectionLocked) {
      selectedValue = hasCurrentAudioDevice ? currentValue : "";
    } else if (currentValue && hasCurrentAudioDevice) {
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
    if (state.selectedAudioDeviceId !== AUDIO_PERMISSION_DEVICE_ID) {
      persistStoredValue(STORAGE_KEYS.audioDevice, state.selectedAudioDeviceId);
    }
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
    const requestId = state.audioInputRequestId;

    if (!selectedAudioDeviceId) {
      return;
    }

    const audioResult = await requestSelectedAudioStream(selectedAudioDeviceId);
    if (requestId !== state.audioInputRequestId) {
      audioResult.stream?.getTracks().forEach((track) => track.stop());
      return;
    }
    if (!audioResult.stream) {
      return;
    }

    state.audioInputStream = audioResult.stream;
    if (selectedAudioDeviceId === AUDIO_PERMISSION_DEVICE_ID) {
      state.selectedAudioDeviceId = audioResult.stream.getAudioTracks()[0]?.getSettings?.().deviceId || "";
      if (state.selectedAudioDeviceId) {
        persistStoredValue(STORAGE_KEYS.audioDevice, state.selectedAudioDeviceId);
      }
      await refreshDevices();
      if (requestId !== state.audioInputRequestId) {
        return;
      }
    }
    const audioReady = await setupAudioPlayback({ stream: audioResult.stream });
    if (!audioReady && state.audioInputStream) {
      state.audioInputStream.getTracks().forEach((track) => track.stop());
      state.audioInputStream = null;
    }
  }

  async function startSelectedVideo() {
    if (state.mediaStartInProgress || !navigator.mediaDevices?.getUserMedia) {
      return;
    }
    state.mediaStartInProgress = true;
    syncMediaStartControls();
    try {
      let skipAudio = false;
      if (!state.mediaPermissionsPrepared) {
        setCameraState("権限待ち", "working");
        const permissions = await prepareMediaPermissions();
        if (!permissions.devicesReady) {
          return;
        }
        skipAudio = !permissions.audioAvailable;
      }
      await performSelectedVideoStart({ skipAudio });
    } catch (error) {
      if (!state.mediaPermissionsPrepared) {
        await refreshDevices();
      }
      handleStreamError(error);
    } finally {
      state.mediaStartInProgress = false;
      syncMediaStartControls();
    }
  }

  async function performSelectedVideoStart({ skipAudio = false } = {}) {
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
      state.selectedDeviceId = videoStream.getVideoTracks()[0]?.getSettings?.().deviceId || state.selectedDeviceId;
      elements.video.srcObject = videoStream;
      elements.video.muted = true;
      await elements.video.play();

      const activeVideoDevice = getSelectedDevice() || selectedVideoDevice;
      const activeAudioDeviceId = skipAudio ? "" : selectedAudioDeviceId;

      if (!activeAudioDeviceId) {
        if (skipAudio) {
          appendTerminalEntry(
            ["[system] 音声入力を利用できなかったため、映像のみで開始しました。音声入力またはブラウザの権限設定を確認してください。"],
            "system",
          );
        } else if (!state.audioDevices.length) {
          appendTerminalEntry(
            [
              "[system] 音声入力が見つからないため、映像のみで開始しました。",
            ],
            "system",
          );
        } else if (activeVideoDevice && isObsDevice(activeVideoDevice)) {
          appendTerminalNotice(
            "obs-video-only",
            [
              "[system] OBS Virtual Camera は映像のみです。音が必要な場合は音声入力を別で選んでください。",
            ],
            "system",
          );
        } else {
          appendTerminalDebug(["[debug] 音声入力が未選択のため、映像のみで開始しました。"]);
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
      appendTerminalDebug(["[debug] 16:9 入力を検出しました。左右クロップに固定プリセットを適用しました。"]);
    }
    if (!state.streamInfo.isSixteenByNine) {
      resetPickOverlayState("非16:9入力", { redraw: false });
      appendTerminalNotice(
        "auto-unsupported-4-3",
        [
          "[auto] 自動撮影は16:9入力のみ対応しています。手動撮影には snap both を使ってください。",
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
          return runManualSnapShortcut("both");
        }
        return null;
      }

      pushCommandHistory(rawQuery || submission.query);
      appendTerminalEntry([`> ${rawQuery || submission.query}`], "command");
      elements.terminalInput.value = "";
      clearTerminalSuggestions();

      if (handleTerminalCommand(submission.query)) {
        return null;
      }

      if (!state.catalogReady) {
        appendTerminalError("[error] 名前辞書がまだ準備できていません。api retry で再試行できます。");
        return null;
      }

      if (state.pokemonSearchStatus !== "ready") {
        appendTerminalEntry([state.pokemonSearchStatus === "failed"
          ? "[system] 使用率の一覧を取得できませんでした。api retry で再試行してください。"
          : "[system] 使用率の一覧を読み込み中です。少し待ってから検索してください。"], "system");
        return null;
      }

      const pokemon = state.pokemonMap.get(submission.query);
      if (!pokemon || !state.pokemonSearchIds.has(pokemon.id)) {
        appendTerminalEntry(
          [
            "[error] 使用率が掲載されている検索対象に見つかりません。ルールは stats rule、コマンドは help で確認できます。",
          ],
          "error",
        );
        return null;
      }

      appendPokemonResultEntry(pokemon);
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

  function shouldSuppressManualSnapShortcut() {
    return state.autoSnap.enabled;
  }

  function notifyManualSnapShortcutSuppressed() {
    appendTerminalNotice(
      "auto-manual-snap-shortcut-disabled",
      [
        "[auto] 自動撮影ON中は空 Enter / Ctrl + Enter を使えません。手動撮影には snap both を使ってください。",
      ],
      "system",
    );
  }

  function runManualSnapShortcut(target) {
    if (shouldSuppressManualSnapShortcut()) {
      notifyManualSnapShortcutSuppressed();
      return null;
    }

    appendTerminalEntry([`> snap ${target}`], "command");
    return handleSnapCommand(target);
  }

  function handleTerminalInputKeydown(event) {
    if (event.isComposing || state.isComposing) {
      return;
    }

    const commandChoice = getSelectedTerminalSuggestion()?.command;
    if (event.key === "Enter" && /^stats top \S+$/u.test(commandChoice || "")) {
      event.preventDefault();
      elements.terminalInput.value = `${commandChoice} `;
      clearTerminalSuggestions();
      return;
    }

    if (event.key === "Escape" && state.rulePicker) {
      event.preventDefault(); event.stopPropagation(); state.rulePicker = false; clearTerminalSuggestions(); return;
    }
    if (event.key === "Enter" && state.rulePicker && !getSelectedTerminalSuggestion()) {
      event.preventDefault(); moveTerminalSuggestionSelection(false); return;
    }
    if (event.key === "Tab") {
      if (hasVisibleTerminalSuggestions()) {
        event.preventDefault();
        moveTerminalSuggestionSelection(event.shiftKey ? -1 : 1);
        return;
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
    const selected = getSelectedTerminalSuggestion();
    if (selected?.command) return { query: selected.command };
    if (!query) return { query: "" };

    if (shouldPreferTerminalCommand(query)) {
      return { query };
    }

    const selectedSuggestion = getSelectedTerminalSuggestion();
    if (selectedSuggestion) {
      return { query: selectedSuggestion.id || selectedSuggestion.name };
    }

    const exactPokemon = findExactPokemonMatch(query);
    if (exactPokemon) {
      return { query: exactPokemon.id };
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

  function focusLatestPokemonResultLink() { return false; }

  function refreshTerminalSuggestions() {
    const inputValue = elements.terminalInput?.value || "";
    const query = inputValue.trim();

    if (state.rulePicker && query) state.rulePicker = false;
    if (!state.isComposing && !state.suppressSuggestions && state.statsModule) {
      const choices = state.rulePicker ? [
        { name: "シングル", command: "stats rule シングル" }, { name: "ダブル", command: "stats rule ダブル" },
      ] : state.statsModule.getStatsCommandSuggestions(inputValue);
      if (choices.length) {
        state.suggestions = choices; state.selectedSuggestionIndex = -1; state.ghostSuggestion = null;
        renderTerminalSuggestions(query); return;
      }
    }
    if (!state.catalogReady || !query || state.isComposing || state.suppressSuggestions || shouldSuppressPokemonSuggestions(query)) {
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

      row.append(name);
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

  function appendSuggestionTypeChips(container, types) {
    container.textContent = "";
    if (!Array.isArray(types) || types.length === 0) {
      const placeholder = document.createElement("span");
      placeholder.className = "terminal-suggestion__type-chip terminal-suggestion__type-chip--empty";
      placeholder.textContent = "-";
      container.append(placeholder);
      return;
    }

    types.forEach((type) => {
      const chip = document.createElement("span");
      chip.className = "terminal-suggestion__type-chip";
      chip.textContent = type;
      chip.style.setProperty("--type-chip-bg", POKEMON_TYPE_COLORS[type] || "#5F6784");
      container.append(chip);
    });
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
      void runWithForcedTerminalAutoscroll(() => runManualSnapShortcut("both"));
      return;
    }

    if (event.key === "Escape" && state.mode === "edit") {
      event.preventDefault();
      setMode("ready");
    }
  }

  function handleTerminalCommand(query) {
    const trimmedQuery = String(query || "").trim();
    const normalizedQuery = normalizeTerminalAlias(trimmedQuery.toLowerCase());
    const [command = "", arg = "", extra = "", detail = "", ...rest] = normalizedQuery.split(/\s+/).filter(Boolean);

    if (command === "stats") return handleStatsCommand(trimmedQuery);
    if (command === "api") {
      if (arg !== "retry" || extra) appendTerminalEntry(["[error] api retry と入力してください。"], "error");
      else { appendTerminalEntry(["[system] データ取得を再試行します。"], "system"); void retryRemoteData(); }
      return true;
    }
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
          "利用可能なコマンド: edit / ready / snap / snap my / snap enemy / snap both / snap clear / auto on / auto off / auto status / auto reset / faint status / faint reset / pick status / pick set <order> <slot> / pick clear <slot> / debug on / debug off / debug status / debug log export [番号] / debug icon export / stats rule / stats show <項目...> / stats top <項目> <件数|all> / stats min <使用率> / stats status / api retry / status / clear / cls / crop reset [my|enemy|both] / layout reset / help",
          "短縮コマンド: edit = e / ready = r / snap both = s / snap my = sm / snap enemy = se / pick status = p / ps / pick set = p <order> <slot> / pick clear = p clear <slot> / crop reset = cr / layout reset = lr",
          "ショートカット: 空 Enter = snap both（自動撮影OFF・ready中） / Ctrl + Enter = snap both（自動撮影OFF中） / Esc = ready",
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
      return true;
    }

    if (command === "auto") {
      handleAutoCommand(arg);
      return true;
    }

    if (command === "debug") {
      handleDebugCommand(arg, extra, detail, rest);
      return true;
    }

    if (command === "faint") {
      handleFaintCommand(arg);
      return true;
    }

    if (command === "pick") {
      handlePickCommand(arg, extra, detail, rest);
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
      if (arg === "clear") {
        const cleared = clearReferenceImages({ source: "system" });
        if (!cleared) {
          appendTerminalEntry(
            [
              "[system] クリアする参照画像はありません。",
            ],
            "system",
          );
        }
        return true;
      }

      const target = ["", "both"].includes(arg) ? "both" : arg;
      if (!["my", "enemy", "both"].includes(target)) {
        appendTerminalEntry(
          [
            "[error] snap は my / enemy / both / clear を指定できます。",
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
    const tokens = String(query || "").trim().split(/\s+/).filter(Boolean);
    if (tokens[0] === "p") {
      if (tokens.length === 1) {
        return "pick status";
      }
      if (tokens[1] === "clear") {
        return `pick clear ${tokens.slice(2).join(" ")}`.trim();
      }
      if (tokens.length === 3) {
        return `pick set ${tokens[1]} ${tokens[2]}`;
      }
      return `pick ${tokens.slice(1).join(" ")}`;
    }

    const aliasMap = {
      e: "edit",
      r: "ready",
      s: "snap both",
      sm: "snap my",
      se: "snap enemy",
      ps: "pick status",
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
    return command === "stats" || command === "api" || TERMINAL_COMMAND_TOKENS.has(command);
  }

  function shouldSuppressPokemonSuggestions(query) {
    const trimmed = String(query || "").trim();
    if (!trimmed) {
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

        if (score === bestScore && bestEntry && bestEntry.id !== entry.id) {
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
      id: entry.id,
      name: entry.name,
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
      `[system] faint: ${getFaintStatusSummary()}`,
      `[system] input: ${state.streamInfo?.ratioLabel || "unknown"}`,
      `[system] video: ${state.videoReady ? "ready" : "not ready"}`,
      `[system] audio: ${state.audioReady ? "ready" : "not ready"}`,
    ];
  }

  function clearTerminalOutput() {
    state.statistics?.clear();
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
        "[system] レイアウトを初期状態に戻しました。",
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
    renderDebugOverlayBox(elements.autoDebugOverlays.doneBar, roiCrops.bottomDoneBar, displayedRect, scaleX, scaleY);
    renderDebugOverlayBox(elements.autoDebugOverlays.selectionTimer, roiCrops.selectionTimerIcon, displayedRect, scaleX, scaleY);
    renderDebugOverlayBox(elements.autoDebugOverlays.topTimer, roiCrops.waitingTimerIcon, displayedRect, scaleX, scaleY);
    renderDebugOverlayBox(elements.autoDebugOverlays.battleHud, roiCrops.battleHud, displayedRect, scaleX, scaleY);
    renderDebugOverlayBox(elements.autoDebugOverlays.battleResultLeft, roiCrops.battleResultLeft, displayedRect, scaleX, scaleY);
    renderDebugOverlayBox(elements.autoDebugOverlays.battleResultRight, roiCrops.battleResultRight, displayedRect, scaleX, scaleY);
    renderDebugOverlayBox(elements.autoDebugOverlays.pickHudLeft, roiCrops.pickHudLeft, displayedRect, scaleX, scaleY);
    renderDebugOverlayBox(elements.autoDebugOverlays.pickHudRight, roiCrops.pickHudRight, displayedRect, scaleX, scaleY);
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
      bottomDoneBar: getAutoRoiCrop("bottomDoneBar"),
      selectionTimerIcon: getAutoRoiCrop("selectionTimerIcon"),
      waitingTimerIcon: getAutoRoiCrop("waitingTimerIcon"),
      battleHud: getAutoRoiCrop("battleHud"),
      battleResultLeft: getBattleResultRoiCrop("left"),
      battleResultRight: getBattleResultRoiCrop("right"),
      pickHudLeft: getPickOverlayHudCrop(0),
      pickHudRight: getPickOverlayHudCrop(1),
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
    if (side === "enemy") {
      drawEnemyPickDebugRois(context, reference);
      drawEnemyPickOrderOverlay(context, reference);
      drawEnemyFaintOverlay(context, reference);
      drawEnemyPickFlashFrameOverlay(context, reference);
      drawEnemyPickCorrectionFrameOverlay(context, reference);
    }
  }

  function drawEnemyPickDebugRois(context, reference) {
    if (!shouldShowPickOverlayReferenceDebug()) {
      return;
    }

    context.save();
    context.lineWidth = Math.max(1.2, reference.width / 240);
    context.setLineDash([6, 4]);
    context.font = `600 ${Math.max(10, Math.round(reference.width / 22))}px "Segoe UI", sans-serif`;
    context.textBaseline = "top";

    PICK_OVERLAY_CONFIG.referenceRois.forEach((roi, refIndex) => {
      const actualRoi = getPickOverlayNormalizedRect(roi, reference.width, reference.height);
      const order = state.autoSnap.pickOverlay.ordersByRefIndex[refIndex];
      const fainted = state.autoSnap.pickOverlay.faintedByRefIndex?.[refIndex];
      context.strokeStyle = fainted
        ? "rgba(255, 92, 120, 0.96)"
        : order
          ? "rgba(80, 240, 178, 0.96)"
          : "rgba(255, 255, 255, 0.9)";
      context.fillStyle = "rgba(18, 18, 26, 0.84)";
      context.strokeRect(actualRoi.x, actualRoi.y, actualRoi.width, actualRoi.height);
      const label = order
        ? `REF${refIndex + 1} ${getPickOverlayOrderLabel(order)}${fainted ? " FAINT" : ""}`
        : `REF${refIndex + 1}${fainted ? " FAINT" : ""}`;
      const labelWidth = Math.ceil(context.measureText(label).width) + 10;
      const labelX = Math.max(0, actualRoi.x);
      const labelY = Math.max(0, actualRoi.y - 18);
      context.fillRect(labelX, labelY, labelWidth, 16);
      context.fillStyle = "#ffffff";
      context.fillText(label, labelX + 5, labelY + 3);
    });

    context.restore();
  }

  function drawEnemyFaintOverlay(context, reference) {
    const faintedByRefIndex = state.autoSnap.pickOverlay?.faintedByRefIndex;
    const faintImage = state.pickOverlayFaintFrameImage;
    if (!faintImage || !faintedByRefIndex?.some(Boolean)) {
      return;
    }

    const scaleX = reference.width / PICK_OVERLAY_CONFIG.flashFrameBaseSize.width;
    const scaleY = reference.height / 807;
    faintedByRefIndex.forEach((fainted, refIndex) => {
      if (!fainted) {
        return;
      }

      const framePosition = PICK_OVERLAY_CONFIG.badgeSlotPositions[refIndex];
      if (!framePosition) {
        return;
      }

      const left = Math.round(reference.width * framePosition.x);
      const top = Math.round(reference.height * framePosition.y);
      const width = Math.max(1, Math.round(PICK_OVERLAY_CONFIG.flashFrameBaseSize.width * scaleX));
      const height = Math.max(1, Math.round(PICK_OVERLAY_CONFIG.flashFrameBaseSize.height * scaleY));
      context.drawImage(faintImage, left, top, width, height);
    });
  }

  function drawEnemyPickOrderOverlay(context, reference) {
    const ordersByRefIndex = state.autoSnap.pickOverlay?.ordersByRefIndex;
    if (!ordersByRefIndex?.some(Boolean)) {
      return;
    }

    const scaleX = reference.width / 299;
    const scaleY = reference.height / 807;
    PICK_OVERLAY_CONFIG.referenceRois.forEach((_, refIndex) => {
      const order = ordersByRefIndex[refIndex];
      if (!order) {
        return;
      }

      const badgeImage = getPickOverlayBadgeImage(order);
      const badgePosition = PICK_OVERLAY_CONFIG.badgeSlotPositions[refIndex];
      if (!badgeImage || !badgePosition) {
        return;
      }

      const left = Math.round(reference.width * badgePosition.x);
      const top = Math.round(reference.height * badgePosition.y);
      const width = Math.max(1, Math.round((badgeImage.naturalWidth || badgeImage.width || 1) * scaleX));
      const height = Math.max(1, Math.round((badgeImage.naturalHeight || badgeImage.height || 1) * scaleY));
      context.drawImage(badgeImage, left, top, width, height);
    });
  }

  function drawEnemyPickFlashFrameOverlay(context, reference) {
    const pickOverlay = state.autoSnap.pickOverlay;
    const flashImage = state.pickOverlayFlashFrameImage;
    if (!flashImage || !pickOverlay.flashFramesByRefIndex?.some(Boolean)) {
      return;
    }

    const now = Date.now();
    const durationMs = PICK_OVERLAY_CONFIG.flashFrameDurationMs;
    const scaleX = reference.width / PICK_OVERLAY_CONFIG.flashFrameBaseSize.width;
    const scaleY = reference.height / 807;
    let hasActiveFrame = false;

    pickOverlay.flashFramesByRefIndex.forEach((flashFrame, refIndex) => {
      if (!flashFrame) {
        return;
      }

      const elapsedMs = now - flashFrame.startedAt;
      if (elapsedMs >= durationMs) {
        pickOverlay.flashFramesByRefIndex[refIndex] = null;
        return;
      }

      const framePosition = PICK_OVERLAY_CONFIG.badgeSlotPositions[refIndex];
      if (!framePosition) {
        return;
      }

      const alpha = clamp(1 - (elapsedMs / durationMs), 0, 1);
      const left = Math.round(reference.width * framePosition.x);
      const top = Math.round(reference.height * framePosition.y);
      const width = Math.max(1, Math.round(PICK_OVERLAY_CONFIG.flashFrameBaseSize.width * scaleX));
      const height = Math.max(1, Math.round(PICK_OVERLAY_CONFIG.flashFrameBaseSize.height * scaleY));

      context.save();
      context.globalAlpha = alpha;
      context.drawImage(flashImage, left, top, width, height);
      context.restore();
      hasActiveFrame = true;
    });

    if (hasActiveFrame) {
      schedulePickOverlayEffectFrame();
    }
  }

  function drawEnemyPickCorrectionFrameOverlay(context, reference) {
    const pickOverlay = state.autoSnap.pickOverlay;
    const correctionImage = state.pickOverlayCorrectionFrameImage;
    if (!correctionImage || !pickOverlay.correctionFramesByRefIndex?.some(Boolean)) {
      return;
    }

    const now = Date.now();
    const durationMs = PICK_OVERLAY_CONFIG.flashFrameDurationMs;
    const scaleX = reference.width / PICK_OVERLAY_CONFIG.flashFrameBaseSize.width;
    const scaleY = reference.height / 807;
    let hasActiveFrame = false;

    pickOverlay.correctionFramesByRefIndex.forEach((correctionFrame, refIndex) => {
      if (!correctionFrame) {
        return;
      }

      const elapsedMs = now - correctionFrame.startedAt;
      if (elapsedMs >= durationMs) {
        pickOverlay.correctionFramesByRefIndex[refIndex] = null;
        return;
      }

      const framePosition = PICK_OVERLAY_CONFIG.badgeSlotPositions[refIndex];
      if (!framePosition) {
        return;
      }

      const alpha = clamp(1 - (elapsedMs / durationMs), 0, 1);
      const left = Math.round(reference.width * framePosition.x);
      const top = Math.round(reference.height * framePosition.y);
      const width = Math.max(1, Math.round(PICK_OVERLAY_CONFIG.flashFrameBaseSize.width * scaleX));
      const height = Math.max(1, Math.round(PICK_OVERLAY_CONFIG.flashFrameBaseSize.height * scaleY));

      context.save();
      context.globalAlpha = alpha;
      context.drawImage(correctionImage, left, top, width, height);
      context.restore();
      hasActiveFrame = true;
    });

    if (hasActiveFrame) {
      schedulePickOverlayEffectFrame();
    }
  }

  function stopCurrentStream() {
    stopPreviewLoop();
    stopAutoSnapMonitor();
    resetAutoSnapCycle("映像停止");
    resetPickOverlayState("映像停止", { redraw: false });
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
            : `[system] ready に切り替えました。${getReadyGuidance()}`,
        ],
        "system",
      );
    }
  }

  function getReadyGuidance() {
    if (!state.videoReady || !state.stream) return "映像入力を待っています。";
    if (state.autoSnap.enabled) return `自動撮影: ${getAutoStatusSummaryLabel()}。`;
    return "空 Enter または Ctrl + Enter で撮影できます。";
  }

  async function handleSnapCommand(target, options = {}) {
    const { source = "manual", reason = "" } = options;

    const inputUnavailable = !state.videoReady || !state.stream;

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
      appendTerminalError(inputUnavailable
        ? "[error] 映像入力を開始してから撮影してください。"
        : "[error] 参照画像の更新に失敗しました。", error);
    }
  }

  function performSnapCapture(target, options = {}) {
    const perfStartedAt = getPerformanceDebugNow();
    const { frameSource = null } = options;
    const sourceLabel = frameSource ? "buffer" : "video";
    try {
      const sides = target === "both" ? CROP_SIDES : [target];
      const needsLiveVideo = !frameSource;

      if (needsLiveVideo && (!state.videoReady || !state.stream)) {
        throw new Error("映像がまだ準備できていないため、撮影できません。");
      }

      if (sides.includes("enemy")) {
        resetPickOverlayState("相手参照更新", { redraw: false });
        resetPokemonIconRecognitionState("相手参照更新");
        resetBattleResultDetection("相手参照更新");
      }

      sides.forEach((side) => {
        const frame = frameSource?.[side]
          ? cloneReferenceFrame(frameSource[side])
          : captureReferenceFrameFromVideo(side);
        state.references[side] = frame;
        state.matchLog.references[side] = {
          matchId: state.matchLog.current?.id ?? null,
          diagnostic: state.matchLog.current?.diagnostic || createDiagnosticIdentity(),
          captureId: crypto.randomUUID(),
          capturedAt: Date.now(),
          reference: frame,
        };
        if (side === "enemy" && state.matchLog.current) state.matchLog.current.recognition = null;
      });
      if (sides.includes("enemy")) {
        state.autoSnap.pickOverlay.referenceUpdatedAt = Date.now();
        state.autoSnap.pickOverlay.lastGateReason = "battle HUD待ち";
      }

      if (sides.includes("enemy")) syncStatisticsSelection();
      refreshCropPanels();
      if (sides.includes("enemy")) {
        scheduleEnemyReferencePokemonRecognition({ deferUntilAfterPaint: true });
      }
      if (state.matchLog.current) state.matchLog.current.captureCount += 1;
      recordMatchLogEvent("snap", "[snap] 参照画像を更新しました。", {
        target, source: sourceLabel,
        references: Object.fromEntries(sides.map((side) => [side, getReferenceDiagnosticMetadata(state.matchLog.references[side])])),
      });

      if (target === "my") {
        return "自分側の参照画像を更新しました。";
      }

      if (target === "enemy") {
        return "相手側の参照画像を更新しました。";
      }

      return "左右の参照画像を更新しました。";
    } catch (error) {
      if (state.matchLog.current) state.matchLog.current.captureFailureCount += 1;
      recordMatchLogEvent("snap-error", "[error] 撮影処理に失敗しました。", {
        target, source: sourceLabel, error: String(error.message || error).slice(0, MATCH_LOG_CONFIG.textLimit),
      });
      throw error;
    } finally {
      recordPerformanceDebugMetric(
        "performSnapCapture",
        getPerformanceDebugNow() - perfStartedAt,
        `target=${target} source=${sourceLabel}`,
      );
    }
  }

  function clearReferenceImages(options = {}) {
    const { source = "system", reason = "" } = options;
    const diagnosticContext = state.matchLog.current ? getPickDiagnosticContext(state.matchLog.current) : null;
    const hadReferences = CROP_SIDES.some((side) => Boolean(state.references[side]));
    CROP_SIDES.forEach((side) => {
      state.references[side] = null;
      state.matchLog.references[side] = null;
    });
    syncStatisticsSelection();
    recordMatchLogEvent("clear", "[snap] 参照画像をクリアしました。", { source, reason });
    resetPickOverlayState("参照画像クリア", { redraw: false, diagnosticContext });
    resetPokemonIconRecognitionState("参照画像クリア");
    resetBattleResultDetection("参照画像クリア");
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
      resetPickOverlayState("auto reset");
      resetPokemonIconResultNotifications();
      syncAutoSnapMonitoring();
      appendTerminalEntry(
        [
          "[auto] 検出状態をリセットしました。",
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
          enabled ? `[auto] すでにONです（${getAutoStatusSummaryLabel()}）。` : "[auto] すでにOFFです。",
        ],
        "system",
      );
      return;
    }

    state.autoSnap.enabled = enabled;
    resetAutoSnapCycle(enabled ? "auto on" : "auto off");
    if (!enabled) {
      resetPickOverlayState("auto off");
    }

    if (enabled) {
      if (state.mode !== "ready") {
        setMode("ready", { suppressTerminalMessage: true });
      } else {
        syncAutoSnapMonitoring();
      }
      appendTerminalEntry(
        [
          `[auto] 自動撮影: ON（${getAutoStatusSummaryLabel()}）。`,
        ],
        "system",
      );
      return;
    }

    stopAutoSnapMonitor();
    appendTerminalEntry(
      [
        "[auto] 自動撮影: OFF。",
      ],
      "system",
    );
  }

  function handleDebugCommand(arg, extra = "", detail = "", rest = []) {
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

    if (action === "icon") {
      if (extra !== "export" || detail || rest.length) {
        appendTerminalEntry(
          ["[error] debug icon は export を指定できます。"],
          "error",
        );
        return;
      }
      void exportPokemonIconDiagnosticBundle();
      return;
    }

    if (action === "log") {
      if (extra !== "export" || rest.length || (detail && !/^[1-9]\d*$/u.test(detail))) {
        appendTerminalEntry(["[error] debug log export [番号] を指定してください。"], "error");
        return;
      }
      exportMatchLog(detail ? Number(detail) : null);
      return;
    }

    appendTerminalEntry(
      [
        "[error] debug は on / off / status / log export [番号] / icon export を指定できます。",
      ],
      "error",
    );
  }

  function handleFaintCommand(arg) {
    const action = arg || "status";

    if (action === "reset") {
      const hadFainted = resetFaintOverlayState("manual reset");
      appendTerminalEntry(
        [
          hadFainted
            ? "[system] 瀕死表示をリセットしました。"
            : "[system] リセットする瀕死表示はありません。",
        ],
        "system",
      );
      return;
    }

    if (action === "status") {
      appendTerminalEntry(getFaintStatusLines(), "system");
      return;
    }

    appendTerminalEntry(
      [
        "[error] faint は status / reset を指定できます。",
      ],
      "error",
    );
  }

  function handlePickCommand(actionArg, orderArg, slotArg, rest = []) {
    const action = actionArg || "status";

    if (action === "status") {
      if (orderArg || slotArg || rest.length) {
        appendTerminalEntry(
          [
            "[error] pick status に追加の指定はできません。",
          ],
          "error",
        );
        return;
      }

      appendTerminalEntry(getPickStatusLines(), "system");
      return;
    }

    if (action === "set") {
      if (!orderArg || !slotArg || rest.length) {
        appendTerminalEntry(
          [
            "[error] pick set は <order> <slot> を指定してください。例: pick set 2 5",
          ],
          "error",
        );
        return;
      }

      const order = parsePickOrder(orderArg);
      const slot = parsePickSlot(slotArg);
      if (!order || !slot) {
        appendTerminalEntry(
          [
            "[error] pick set は order=1-4 / slot=1-6 を指定してください。",
          ],
          "error",
        );
        return;
      }

      const result = setPickOverlayOrderSlot(order, slot - 1);
      appendTerminalEntry(result.lines, "system");
      return;
    }

    if (action === "clear") {
      if (!orderArg || slotArg || rest.length) {
        appendTerminalEntry(
          [
            "[error] pick clear は <slot> を指定してください。例: pick clear 5",
          ],
          "error",
        );
        return;
      }

      const slot = parsePickSlot(orderArg);
      if (!slot) {
        appendTerminalEntry(
          [
            "[error] pick clear は slot=1-6 を指定してください。",
          ],
          "error",
        );
        return;
      }

      const result = clearPickOverlaySlot(slot - 1);
      appendTerminalEntry(result.lines, "system");
      return;
    }

    appendTerminalEntry(
      [
        "[error] pick は status / set <order> <slot> / clear <slot> を指定できます。",
      ],
      "error",
    );
  }

  function parsePickOrder(value) {
    const order = Number(value);
    return Number.isInteger(order) && order >= 1 && order <= PICK_OVERLAY_CONFIG.maxOrders
      ? order
      : 0;
  }

  function parsePickSlot(value) {
    const slot = Number(value);
    return Number.isInteger(slot) && slot >= 1 && slot <= PICK_OVERLAY_CONFIG.referenceRois.length
      ? slot
      : 0;
  }

  function setPickOverlayOrderSlot(order, refIndex) {
    const pickOverlay = state.autoSnap.pickOverlay;
    const orders = pickOverlay.ordersByRefIndex;
    const diagnosticBefore = { orders: [...orders], pending: pickOverlay.pendingMatchesByHudIndex.map(copyPickDiagnosticPending) };
    const faintBefore = captureFaintDiagnosticState();
    const sourceRefIndex = findPickOverlayRefIndexByOrder(order);
    const destinationOrder = orders[refIndex] || 0;

    if (sourceRefIndex === refIndex && destinationOrder === order) {
      return {
        lines: [
          `[system] pick: ${getPickOverlayOrderLabel(order)} はすでに ${getPickSlotLabel(refIndex)} です。`,
        ],
      };
    }

    const changedRefIndexes = new Set([refIndex]);
    let displacedRefIndex = -1;
    if (sourceRefIndex >= 0) {
      changedRefIndexes.add(sourceRefIndex);
      orders[sourceRefIndex] = destinationOrder === order ? 0 : destinationOrder;
    } else if (destinationOrder) {
      displacedRefIndex = findFirstEmptyPickOverlayRefIndex(refIndex);
      if (displacedRefIndex >= 0) {
        changedRefIndexes.add(displacedRefIndex);
        orders[displacedRefIndex] = destinationOrder;
      }
    }

    orders[refIndex] = order;
    syncPickOverlayNextOrder();
    clearPickOverlayPendingMatches();
    moveFaintStateForPickCorrection(sourceRefIndex, refIndex);
    clearFaintSlotCacheForRefIndexes(changedRefIndexes);
    changedRefIndexes.forEach((changedRefIndex) => {
      triggerPickOverlayCorrectionFrame(changedRefIndex);
    });
    pickOverlay.lastSummary = buildPickOverlaySummary();

    if (state.references.enemy && state.mode !== "edit") {
      drawCropPanel("enemy");
    }

    const lines = [
      `[system] pick: ${getPickOverlayOrderLabel(order)} を ${getPickSlotLabel(refIndex)} に設定しました。`,
    ];
    if (sourceRefIndex >= 0 && destinationOrder && destinationOrder !== order) {
      lines.push(`[system] pick: ${getPickSlotLabel(sourceRefIndex)} と入れ替えました。`);
    } else if (sourceRefIndex >= 0) {
      lines.push(`[system] pick: 元の ${getPickSlotLabel(sourceRefIndex)} は空きにしました。`);
    } else if (displacedRefIndex >= 0) {
      lines.push(`[system] pick: 既存の ${getPickOverlayOrderLabel(destinationOrder)} は ${getPickSlotLabel(displacedRefIndex)} に移動しました。`);
    }

    syncStatisticsSelection();
    recordPickDiagnosticEvent("manual_set", { order, refIndex, before: diagnosticBefore, ordersAfter: [...orders] });
    recordFaintDiagnosticEvent("manual_set", { order, refIndex, before: faintBefore, after: captureFaintDiagnosticState() });
    return { lines };
  }

  function clearPickOverlaySlot(refIndex) {
    const pickOverlay = state.autoSnap.pickOverlay;
    const orders = pickOverlay.ordersByRefIndex;
    const diagnosticBefore = { orders: [...orders], pending: pickOverlay.pendingMatchesByHudIndex.map(copyPickDiagnosticPending) };
    const faintBefore = captureFaintDiagnosticState();
    const removedOrder = orders[refIndex] || 0;
    const hadFainted = Boolean(pickOverlay.faintedByRefIndex?.[refIndex]);
    const hadPendingMatch = pickOverlay.pendingMatchesByHudIndex?.some((pending) => pending?.refIndex === refIndex);

    if (!removedOrder && !hadFainted && !hadPendingMatch) {
      return {
        lines: [
          `[system] pick: ${getPickSlotLabel(refIndex)} に消すバッジはありません。`,
        ],
      };
    }

    orders[refIndex] = 0;
    if (pickOverlay.faintedByRefIndex?.[refIndex]) {
      pickOverlay.faintedByRefIndex[refIndex] = false;
    }
    pickOverlay.pendingMatchesByHudIndex = pickOverlay.pendingMatchesByHudIndex.map((pending) => (
      pending?.refIndex === refIndex ? null : pending
    ));
    resetPokemonIconResultNotificationForRefIndex(refIndex);
    syncPickOverlayNextOrder();
    clearFaintSlotCacheForRefIndexes(new Set([refIndex]));
    triggerPickOverlayCorrectionFrame(refIndex);
    pickOverlay.lastSummary = buildPickOverlaySummary();

    if (state.references.enemy && state.mode !== "edit") {
      drawCropPanel("enemy");
    }

    const lines = [
      removedOrder
        ? `[system] pick: ${getPickSlotLabel(refIndex)} の ${getPickOverlayOrderLabel(removedOrder)} を消しました。`
        : `[system] pick: ${getPickSlotLabel(refIndex)} の保留状態を消しました。`,
    ];
    if (hadFainted) {
      lines.push(`[system] pick: ${getPickSlotLabel(refIndex)} の瀕死表示も解除しました。`);
    }
    syncStatisticsSelection();
    recordPickDiagnosticEvent("manual_clear", { refIndex, before: diagnosticBefore, ordersAfter: [...orders] });
    recordFaintDiagnosticEvent("manual_clear", { refIndex, before: faintBefore, after: captureFaintDiagnosticState() });
    return { lines };
  }

  function findPickOverlayRefIndexByOrder(order) {
    return state.autoSnap.pickOverlay.ordersByRefIndex.findIndex((currentOrder) => currentOrder === order);
  }

  function findFirstEmptyPickOverlayRefIndex(excludedRefIndex = -1) {
    return state.autoSnap.pickOverlay.ordersByRefIndex.findIndex((order, refIndex) => (
      refIndex !== excludedRefIndex && !order
    ));
  }

  function syncPickOverlayNextOrder() {
    const assignedOrders = new Set(state.autoSnap.pickOverlay.ordersByRefIndex.filter(Boolean));
    let nextOrder = 1;
    while (assignedOrders.has(nextOrder) && nextOrder <= PICK_OVERLAY_CONFIG.maxOrders) {
      nextOrder += 1;
    }
    state.autoSnap.pickOverlay.nextOrder = nextOrder;
  }

  function moveFaintStateForPickCorrection(sourceRefIndex, destinationRefIndex) {
    const faintedByRefIndex = state.autoSnap.pickOverlay.faintedByRefIndex;
    if (
      sourceRefIndex < 0
      || sourceRefIndex === destinationRefIndex
      || !faintedByRefIndex[sourceRefIndex]
      || faintedByRefIndex[destinationRefIndex]
    ) {
      return;
    }

    faintedByRefIndex[destinationRefIndex] = true;
    faintedByRefIndex[sourceRefIndex] = false;
  }

  function clearFaintSlotCacheForRefIndexes(refIndexes) {
    const targetRefIndexes = new Set([...refIndexes].filter((refIndex) => refIndex >= 0));
    if (!targetRefIndexes.size) {
      return;
    }

    const pickOverlay = state.autoSnap.pickOverlay;
    pickOverlay.faintSlotCacheByHudIndex = pickOverlay.faintSlotCacheByHudIndex.map((cached) => (
      cached && targetRefIndexes.has(cached.refIndex) ? null : cached
    ));
    pickOverlay.pendingFaintsByHudIndex = pickOverlay.pendingFaintsByHudIndex.map((pending) => (
      pending && targetRefIndexes.has(pending.refIndex) ? null : pending
    ));
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
    refreshCropPanels();
    renderCropOverlays();
    appendTerminalEntry(
      [
        enabled
          ? "[debug] デバッグ表示を ON にしました。認識範囲、勝敗判定、名前推定ログ、処理時間ログを表示可能にしました。"
          : "[debug] デバッグ表示を OFF にしました。認識範囲、勝敗判定、名前推定ログ、処理時間ログを非表示にしました。",
      ],
      "system",
    );
  }

  function getDebugStatusLines() {
    const lines = [
      `[debug] ${state.debugMode ? "ON" : "OFF"} app=${APP_VERSION}`,
      `[debug] 認識範囲表示: ${shouldShowAutoDebugOverlays() ? "表示中" : "非表示"}`,
    ];

    if (!state.videoReady) {
      lines.push("[debug] 映像の準備ができていないため、認識範囲は表示されません。");
    } else if (state.mode !== "ready") {
      lines.push("[debug] 認識範囲は ready モード中のみ表示されます。");
    } else if (!state.autoSnap.enabled) {
      lines.push("[debug] auto が OFF のため、認識範囲は表示されません。");
    }

    lines.push(...getPickOverlayDebugLines());
    lines.push(...getBattleResultDebugLines());
    lines.push(...getPokemonIconRecognitionDebugLines());
    lines.push(...getPerformanceDebugLines());
    lines.push(...getMatchLogStatusLines());
    return lines;
  }

  async function exportPokemonIconDiagnosticBundle() {
    const reference = state.references.enemy;
    if (!reference) {
      appendTerminalEntry(
        ["[error] 相手側の参照画像がありません。先に snap enemy または snap both を実行してください。"],
        "error",
      );
      return;
    }

    try {
      const capturedAt = new Date().toISOString();
      // Use the image's origin, never the match active at export time.
      let origin = state.matchLog.references.enemy;
      if (origin?.reference !== reference) {
        origin = { matchId: null, diagnostic: createDiagnosticIdentity(), captureId: crypto.randomUUID(), capturedAt: null, reference };
        state.matchLog.references.enemy = origin;
      }
      const sequence = nextDiagnosticExportSequence(origin.diagnostic, "icons");
      const filePrefix = getDiagnosticFilePrefix(origin.diagnostic);
      const recognition = state.pokemonIconRecognition;
      const roiImages = createPokemonIconDiagnosticRoiImages(reference);
      const results = recognition.resultsByRefIndex || [];
      const bundle = {
        schemaVersion: 1,
        kind: "pokemon-snapcrop-icon-diagnostic",
        capturedAt,
        provenance: getReferenceDiagnosticMetadata(origin),
        export: { sequence, exportedAt: capturedAt, filePrefix },
        appVersion: APP_VERSION,
        remoteSource: { dataVersion: state.remoteIndex?.dataVersion ?? null, catalogVersion: state.catalog?.provenance ?? null,
          assets: recognition.candidateStats?.assetFingerprints || state.pokemonIconWorkerState.stats?.assetFingerprints || [] },
        matcherPath: POKEMON_ICON_MATCHER_PATH,
        workerPath: POKEMON_ICON_WORKER_PATH,
        referenceImage: {
          width: reference.width,
          height: reference.height,
          dataUrl: reference.toDataURL("image/png"),
        },
        labels: {
          pokemonNames: PICK_OVERLAY_CONFIG.referenceRois.map(() => ""),
        },
        settings: {
          roi: POKEMON_ICON_RECOGNITION_CONFIG.referenceRois,
          legacy: {
            sampleWidth: POKEMON_ICON_RECOGNITION_CONFIG.sampleWidth,
            sampleHeight: POKEMON_ICON_RECOGNITION_CONFIG.sampleHeight,
            scoreMin: POKEMON_ICON_RECOGNITION_CONFIG.scoreMin,
            marginMin: POKEMON_ICON_RECOGNITION_CONFIG.marginMin,
          },
          matcher: recognition.lastDiagnostics?.config || null,
        },
        candidateStats: {
          manifest: state.pokemonIconManifest?.stats || null,
          worker: recognition.candidateStats || state.pokemonIconWorkerState.stats,
        },
        slots: roiImages.map((roiImage, refIndex) => {
          const result = results[refIndex] || null;
          return {
            refIndex,
            slot: refIndex + 1,
            roi: POKEMON_ICON_RECOGNITION_CONFIG.referenceRois[refIndex],
            width: roiImage.width,
            height: roiImage.height,
            dataUrl: roiImage.dataUrl,
            foregroundMask: {
              encoding: "rle-u8",
              width: recognition.lastDiagnostics?.config?.sampleWidth || 64,
              height: recognition.lastDiagnostics?.config?.sampleHeight || 64,
              data: result?.foregroundMaskRle || [],
            },
            label: "",
            coarseTopCandidates: result?.coarseTopCandidates || [],
            refinedTopCandidates: result?.refinedTopCandidates || [],
            finalResult: result,
          };
        }),
        assignment: recognition.lastDiagnostics?.assignment || null,
        globalTransform: recognition.lastDiagnostics?.globalTransform || null,
        timings: {
          matcher: recognition.lastDiagnostics?.timings || null,
          worker: recognition.workerTiming || null,
        },
        candidateLoadFailures: recognition.candidateFailures.length
          ? recognition.candidateFailures
          : state.pokemonIconWorkerState.failures,
        visualCollisions: recognition.visualCollisions.length
          ? recognition.visualCollisions
          : state.pokemonIconWorkerState.visualCollisions,
        runtimeMergedDuplicates: state.pokemonIconWorkerState.runtimeMergedDuplicates,
      };
      const baseName = `${filePrefix}__icons-${String(sequence).padStart(3, "0")}`;
      const pngBytes = Uint8Array.from(
        atob(bundle.referenceImage.dataUrl.split(",")[1]),
        (character) => character.charCodeAt(0),
      );
      const pngBlob = new Blob([pngBytes], { type: "image/png" });
      downloadJsonFile(bundle, `${baseName}.json`);
      downloadBlobFile(pngBlob, `${baseName}.png`);
      appendTerminalEntry(
        [`[debug] 名前推定の診断JSON・相手画像PNGのダウンロードを開始しました: ${baseName}.json / ${baseName}.png`],
        "success",
      );
    } catch (error) {
      appendTerminalError("[error] 名前推定の診断JSON・相手画像PNGを保存できませんでした。", error);
    }
  }

  function createPokemonIconDiagnosticRoiImages(reference) {
    return POKEMON_ICON_RECOGNITION_CONFIG.referenceRois.map((roi) => {
      const crop = getPickOverlayNormalizedRect(roi, reference.width, reference.height);
      const width = Math.max(1, Math.round(crop.width));
      const height = Math.max(1, Math.round(crop.height));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("診断ROIのcanvas初期化に失敗しました。");
      }
      context.drawImage(
        reference,
        Math.round(crop.x),
        Math.round(crop.y),
        width,
        height,
        0,
        0,
        width,
        height,
      );
      return {
        width,
        height,
        dataUrl: canvas.toDataURL("image/png"),
      };
    });
  }

  function downloadJsonFile(value, fileName) {
    const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], {
      type: "application/json",
    });
    downloadBlobFile(blob, fileName);
  }

  function downloadBlobFile(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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

  function resetAutoSnapCycle(reason = "", { preserveSelectionDiagnostics = false } = {}) {
    recordMatchLogEvent("reset", "[debug] 自動検出をリセットしました。", { reason, phase: state.autoSnap.phase });
    state.autoSnap.phase = "idle";
    state.autoSnap.loadingFrames = 0;
    state.autoSnap.selectionFrames = 0;
    state.autoSnap.lockedFrames = 0;
    state.autoSnap.loadingSeenAt = 0;
    state.autoSnap.loadingLastSeenAt = 0;
    state.autoSnap.recoveryBattleHudFrames = 0;
    state.autoSnap.lastDetectionAt = null;
    state.autoSnap.lastDetectionGapMs = 0;
    if (!preserveSelectionDiagnostics) {
      state.autoSnap.selectionDiagnostics = [];
    }
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
    state.autoSnap.lastSnapFailed = false;
    resetBattleResultDetection(reason || "auto reset");
  }

  function getAutoIdleReason() {
    if (!state.streamInfo?.isSixteenByNine) {
      return "16:9 入力待ち";
    }

    return "loading 待ち";
  }

  function runAutoSnapDetection(now = Date.now()) {
    const auto = state.autoSnap;
    auto.lastDetectionGapMs = auto.lastDetectionAt === null
      ? 0
      : Math.max(0, now - auto.lastDetectionAt);
    auto.lastDetectionAt = now;
    const metricsStartedAt = getPerformanceDebugNow();
    const metrics = captureAutoSnapMetrics();
    const metricsDurationMs = getPerformanceDebugNow() - metricsStartedAt;
    if (metrics && (auto.phase === "idle" || auto.phase === "snapped")
      && metrics.loadingTemplate.matched
      && auto.loadingFrames + 1 >= AUTO_SNAP_CONFIG.stableFrames.loading) {
      startMatchLog(now, metrics.loadingTemplate);
    }
    if (metrics) recordMatchLogFrame(metrics, now);
    recordPerformanceDebugMetric(
      "captureAutoSnapMetrics",
      metricsDurationMs,
      `phase=${getAutoPhaseLabel(auto.phase)}`,
    );
    if (!metrics) {
      auto.lastReason = "ROI がまだ揃っていません。";
      return;
    }

    auto.lastMetrics = metrics;
    const pickDetectionStartedAt = getPerformanceDebugNow();
    updatePickOverlayDetection(metrics, now);
    recordPerformanceDebugMetric(
      "updatePickOverlayDetection",
      getPerformanceDebugNow() - pickDetectionStartedAt,
      `phase=${getAutoPhaseLabel(auto.phase)} gate=${state.autoSnap.pickOverlay.lastGateReason || "none"}`,
    );
    const battleResultStartedAt = getPerformanceDebugNow();
    updateBattleResultDetection(metrics, now);
    recordPerformanceDebugMetric(
      "battleResultDetection",
      getPerformanceDebugNow() - battleResultStartedAt,
      `state=${getBattleResultStatusLabel()}`,
    );
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
      auto.lastSnapFailed = false;
      auto.lastTriggerReason = "";
      auto.loadingSeenAt = now;
      auto.loadingLastSeenAt = now;
      auto.recoveryBattleHudFrames = 0;
      auto.selectionDiagnostics = [];
      resetBattleResultDetection("loading 検出");
      auto.lastReason = `loading を検出 coverage=${formatAutoMetric(loadingSignal.coverageScore)} spill=${formatAutoMetric(loadingSignal.spillScore)} dark=${formatAutoMetric(loadingSignal.darkBackground)} offset=${loadingSignal.offsetX},${loadingSignal.offsetY}`;
      appendTerminalDebug(
        [
          `[debug] 読み込み中 を検出しました。 ${auto.lastReason}`,
        ],
      );
      return;
    }

    if (auto.phase === "loading_seen" || auto.phase === "selection_recovery") {
      const loadingSignal = getLoadingTemplateSignal(metrics);
      const selectionSignal = getSelectionTimerSignal(metrics);
      if (loadingSignal.matched) {
        auto.loadingLastSeenAt = now;
      }
      const loadingAgeMs = Math.max(0, now - auto.loadingLastSeenAt);
      // Do not reuse a loading signal from an old match, even after a long callback gap.
      if (loadingAgeMs > AUTO_SNAP_CONFIG.timeoutsMs.loadingToSelectionRecovery) {
        recordAutoSelectionDiagnostic("expired", metrics, now);
        resetAutoSnapCycle("loading -> selection recovery expired", {
          preserveSelectionDiagnostics: true,
        });
        return;
      }

      const recovering = auto.phase === "selection_recovery";
      if (!selectionSignal.matched) {
        auto.selectionFrames = 0;
        if (recovering) {
          const battleHudSignal = getBattleHudSignal(metrics);
          auto.recoveryBattleHudFrames = battleHudSignal.matched && !loadingSignal.matched
            ? auto.recoveryBattleHudFrames + 1
            : 0;
          if (auto.recoveryBattleHudFrames >= AUTO_SNAP_CONFIG.stableFrames.recoveryBattleHud) {
            recordAutoSelectionDiagnostic("battle-hud", metrics, now);
            resetAutoSnapCycle("selection recovery -> battle HUD", {
              preserveSelectionDiagnostics: true,
            });
            return;
          }
          if (loadingSignal.matched) {
            recordAutoSelectionDiagnostic("loading-resumed", metrics, now);
            auto.phase = "loading_seen";
            auto.recoveryBattleHudFrames = 0;
          }
        } else if (loadingAgeMs > AUTO_SNAP_CONFIG.timeoutsMs.loadingToSelection) {
          recordAutoSelectionDiagnostic("timeout", metrics, now);
          auto.phase = "selection_recovery";
          auto.recoveryBattleHudFrames = 0;
        }
        auto.lastReason = selectionSignal.templateReady
          ? `${auto.phase === "selection_recovery" ? "選出タイマー再確認" : "選出タイマー待ち"} coverage=${formatAutoMetric(selectionSignal.coverageScore)} spill=${formatAutoMetric(selectionSignal.spillScore)} dark=${formatAutoMetric(selectionSignal.darkBackground)}`
          : "選出タイマーテンプレートの読み込み待ちです。";
        return;
      }

      // A valid selection frame wins over the normal six-second timeout.
      auto.recoveryBattleHudFrames = 0;
      auto.selectionFrames += 1;
      const requiredFrames = recovering
        ? AUTO_SNAP_CONFIG.stableFrames.selectionRecovery
        : AUTO_SNAP_CONFIG.stableFrames.selection;
      auto.lastReason = `selection ${auto.selectionFrames}/${requiredFrames} coverage=${formatAutoMetric(selectionSignal.coverageScore)} spill=${formatAutoMetric(selectionSignal.spillScore)} dark=${formatAutoMetric(selectionSignal.darkBackground)}`;
      if (auto.selectionFrames < requiredFrames) {
        return;
      }

      recordAutoSelectionDiagnostic(recovering ? "recovered" : "selected", metrics, now);
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
        auto.lastReason = `locked ${auto.lockedFrames}/${AUTO_SNAP_CONFIG.stableFrames.locked} bar=${formatAutoMetric(lockedSignal.barBright)}/${formatAutoMetric(lockedSignal.barBlue)}`;
        if (auto.lockedFrames >= AUTO_SNAP_CONFIG.stableFrames.locked) {
          auto.phase = "selection_locked";
          auto.lockedFrames = 0;
          auto.selectionLockedAt = now;
          auto.waitingIconSeenAt = 0;
          auto.lockedBaseline = buildLockedBaseline(metrics);
          auto.fallbackBuffer = null;
          auto.lastReason = `選出完了をラッチ bar=${formatAutoMetric(lockedSignal.barBright)}/${formatAutoMetric(lockedSignal.barBlue)}`;
          recordMatchLogEvent("locked", "[debug] 選出完了を検出しました。", lockedSignal, now);
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
        ? `待機タイマー優先 / ラッチ補助 bar=${formatAutoMetric(lockedSignal.barBright)}/${formatAutoMetric(lockedSignal.barBlue)} icon=${formatAutoMetric(timerIconSignal.coverageScore)}/${formatAutoMetric(timerIconSignal.spillScore)}`
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
    auto.lastReason = `待機タイマー後 fallback 待ち battleHud=${formatAutoMetric(battleHudSignal.hudAccent)} bright=${formatAutoMetric(battleHudSignal.hudBright)} enemyListVisible=${battleHudSignal.enemyListStillVisible ? "yes" : "no"} source=${battleHudSignal.preBattleScreenSource} color=${battleHudSignal.enemyListColorSignal ? "yes" : "no"}`;
    if (battleHudSignal.matched) {
      triggerAutoFallback("battle_hud");
      return;
    }
  }

  function recordAutoSelectionDiagnostic(event, metrics, now) {
    const auto = state.autoSnap;
    const loading = getLoadingTemplateSignal(metrics);
    const selection = getSelectionTimerSignal(metrics);
    const formatSignal = (signal) => `ready=${signal.templateReady ? "yes" : "no"} matched=${signal.matched ? "yes" : "no"} coverage=${formatAutoMetric(signal.coverageScore)} spill=${formatAutoMetric(signal.spillScore)} dark=${formatAutoMetric(signal.darkBackground)} offset=${signal.offsetX},${signal.offsetY}`;
    const line = `[debug] auto selection: event=${event} at=${new Date(now).toISOString()} phase=${auto.phase} elapsed=${Math.max(0, now - auto.loadingSeenAt)}ms lastLoadingAgo=${Math.max(0, now - auto.loadingLastSeenAt)}ms gap=${auto.lastDetectionGapMs}ms loading[${formatSignal(loading)}] selection[${formatSignal(selection)}]`;
    auto.selectionDiagnostics.push(line);
    recordMatchLogEvent(`selection-${event}`, line, {}, now);
    if (auto.selectionDiagnostics.length > AUTO_SNAP_CONFIG.selectionDiagnosticHistoryLimit) {
      auto.selectionDiagnostics.shift();
    }
    appendTerminalDebug([line]);
  }

  function captureAutoSnapMetrics() {
    if (!state.videoReady || !state.stream || !state.crops.my || !state.crops.enemy) {
      return null;
    }
    const roiCrops = {
      loadingTemplate: getAutoRoiCrop("loadingTemplate"),
      selectionTimerIcon: getAutoRoiCrop("selectionTimerIcon"),
      selectionRight: getAutoRoiCrop("selectionRight"),
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

  function getBattleResultRoiCrop(side) {
    const dimensions = getStreamDimensions();
    const roi = BATTLE_RESULT_CONFIG.rois[side];
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

  function expandBattleResultCrop(crop, paddingRatio) {
    const dimensions = getStreamDimensions();
    const paddingX = crop.width * paddingRatio;
    const paddingY = crop.height * paddingRatio;
    return clampAutoRoiCrop(
      {
        x: crop.x - paddingX,
        y: crop.y - paddingY,
        width: crop.width + (paddingX * 2),
        height: crop.height + (paddingY * 2),
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

  function getBattleResultDetectorContext(width, height) {
    if (!state.battleResultDetectorCanvas) {
      state.battleResultDetectorCanvas = document.createElement("canvas");
    }

    if (
      state.battleResultDetectorCanvas.width !== width
      || state.battleResultDetectorCanvas.height !== height
    ) {
      state.battleResultDetectorCanvas.width = width;
      state.battleResultDetectorCanvas.height = height;
      state.battleResultDetectorContext = state.battleResultDetectorCanvas.getContext("2d", {
        willReadFrequently: true,
      });
    }

    return state.battleResultDetectorContext;
  }

  function getPickOverlaySampleContext(width, height) {
    if (!state.autoSnap.pickSampleCanvas) {
      state.autoSnap.pickSampleCanvas = document.createElement("canvas");
    }

    if (
      state.autoSnap.pickSampleCanvas.width !== width
      || state.autoSnap.pickSampleCanvas.height !== height
    ) {
      state.autoSnap.pickSampleCanvas.width = width;
      state.autoSnap.pickSampleCanvas.height = height;
      state.autoSnap.pickSampleContext = state.autoSnap.pickSampleCanvas.getContext("2d", {
        willReadFrequently: true,
      });
    }

    return state.autoSnap.pickSampleContext;
  }

  function updateBattleResultDetection(metrics, now = Date.now()) {
    const detection = state.battleResultDetection;
    if (detection.result) {
      return;
    }

    if (!state.references.enemy) {
      detection.battleHudFrames = 0;
      detection.lastSummary = "相手参照画像待ち";
      return;
    }

    const battleHudSignal = getBattleHudSignal(metrics);
    if (!detection.armed) {
      detection.battleHudFrames = battleHudSignal.matched
        ? detection.battleHudFrames + 1
        : 0;
      detection.lastSummary = battleHudSignal.matched
        ? `battle HUD ${detection.battleHudFrames}/${BATTLE_RESULT_CONFIG.requiredBattleHudFrames}`
        : "battle HUD待ち";

      if (detection.battleHudFrames < BATTLE_RESULT_CONFIG.requiredBattleHudFrames) {
        return;
      }

      detection.armed = true;
      detection.lastSummary = "勝敗画面待ち";
      appendBattleResultDebugLogIfChanged(
        "armed",
        ["[debug] result state: battle HUDを確認したため勝敗判定を開始します。"],
      );
      return;
    }

    if (now - detection.lastCheckAt < BATTLE_RESULT_CONFIG.checkIntervalMs) {
      return;
    }

    detection.lastCheckAt = now;
    const leftSignal = matchBattleResultTemplate(getBattleResultRoiCrop("left"));
    const rightSignal = matchBattleResultTemplate(getBattleResultRoiCrop("right"));
    detection.lastSignals = {
      left: leftSignal,
      right: rightSignal,
    };

    if (!leftSignal.templateReady || !rightSignal.templateReady) {
      detection.leftStreak = 0;
      detection.rightStreak = 0;
      detection.lastSummary = "勝敗テンプレート待ち";
      appendBattleResultDebugLogIfChanged(
        "template-wait",
        ["[debug] result state: 勝敗テンプレートの読み込みを待っています。"],
      );
      return;
    }

    if (leftSignal.matched === rightSignal.matched) {
      detection.leftStreak = 0;
      detection.rightStreak = 0;
      detection.lastSummary = leftSignal.matched
        ? "左右同時一致のため保留"
        : "勝敗画面待ち";
    } else if (leftSignal.matched) {
      detection.leftStreak += 1;
      detection.rightStreak = 0;
      detection.lastSummary = `WIN候補 ${detection.leftStreak}/${BATTLE_RESULT_CONFIG.requiredMatchStreak}`;
    } else {
      detection.leftStreak = 0;
      detection.rightStreak += 1;
      detection.lastSummary = `LOSE候補 ${detection.rightStreak}/${BATTLE_RESULT_CONFIG.requiredMatchStreak}`;
    }

    appendBattleResultDebugLogIfChanged(
      [
        leftSignal.matched ? 1 : 0,
        rightSignal.matched ? 1 : 0,
        detection.leftStreak,
        detection.rightStreak,
        Math.round(leftSignal.coverageScore * 100),
        Math.round(leftSignal.spillScore * 100),
        Math.round(rightSignal.coverageScore * 100),
        Math.round(rightSignal.spillScore * 100),
      ].join(":"),
      [
        `[debug] result compare: left coverage=${formatAutoMetric(leftSignal.coverageScore)} spill=${formatAutoMetric(leftSignal.spillScore)} offset=${leftSignal.offsetX},${leftSignal.offsetY} matched=${leftSignal.matched ? "yes" : "no"}`,
        `[debug] result compare: right coverage=${formatAutoMetric(rightSignal.coverageScore)} spill=${formatAutoMetric(rightSignal.spillScore)} offset=${rightSignal.offsetX},${rightSignal.offsetY} matched=${rightSignal.matched ? "yes" : "no"}`,
        `[debug] result state: ${detection.lastSummary}`,
      ],
    );

    if (detection.leftStreak >= BATTLE_RESULT_CONFIG.requiredMatchStreak) {
      publishBattleResult("WIN", leftSignal, rightSignal);
    } else if (detection.rightStreak >= BATTLE_RESULT_CONFIG.requiredMatchStreak) {
      publishBattleResult("LOSE", leftSignal, rightSignal);
    }
  }

  function publishBattleResult(result, leftSignal, rightSignal) {
    const detection = state.battleResultDetection;
    if (detection.result) {
      return;
    }

    const event = {
      result,
      detectedAt: Date.now(),
      source: "win-icon-template",
      left: { ...leftSignal },
      right: { ...rightSignal },
    };
    detection.result = result;
    detection.event = event;
    detection.detectedAt = event.detectedAt;
    detection.lastSummary = result;

    appendTerminalEntry(
      [`[result] ${result}`],
      result === "WIN" ? "success" : "system",
    );
    appendTerminalDebug(
      [
        `[debug] result accepted: ${result} left=${formatAutoMetric(leftSignal.coverageScore)}/${formatAutoMetric(leftSignal.spillScore)} right=${formatAutoMetric(rightSignal.coverageScore)}/${formatAutoMetric(rightSignal.spillScore)}`,
      ],
    );
    recordMatchLogEvent("result", `[debug] result accepted: ${result}`, { left: leftSignal, right: rightSignal }, event.detectedAt);
    finishMatchLog("completed", result, event.detectedAt);
  }

  function getBattleResultStatusLabel() {
    const detection = state.battleResultDetection;
    if (detection.result) {
      return detection.result;
    }
    if (detection.armed) {
      return "waiting";
    }
    return "battle-hud";
  }

  function updatePickOverlayDetection(metrics, now = Date.now()) {
    const observation = beginPickDiagnosticObservation(now);
    try {
      runPickOverlayDetection(metrics, now, observation);
    } finally {
      finishPickDiagnosticObservation(observation);
    }
  }

  function runPickOverlayDetection(metrics, now, observation) {
    const auto = state.autoSnap;
    const pickOverlay = state.autoSnap.pickOverlay;
    pickOverlay.lastGateActive = false;
    const battleHudSignal = getPickOverlayBattleHudSignal(metrics);
    if (observation) observation.screen = { ...battleHudSignal,
      selectionRed: metrics.selectionRight?.red ?? null, selectionChroma: metrics.selectionRight?.chroma ?? null,
      selectionTimerMatched: metrics.selectionTimerIcon?.matched ?? null,
      waitingTimerMatched: metrics.waitingTimerIcon?.matched ?? null,
      selectionTemplateReady: metrics.selectionTimerIcon?.templateReady ?? null,
      waitingTemplateReady: metrics.waitingTimerIcon?.templateReady ?? null,
      selectionTimer: metrics.selectionTimerIcon ? copyMatchLogSignal(metrics.selectionTimerIcon) : null,
      waitingTimer: metrics.waitingTimerIcon ? copyMatchLogSignal(metrics.waitingTimerIcon) : null };

    if (!state.references.enemy) {
      if (observation) observation.reason = "no_reference";
      clearPickOverlayPendingMatches();
      pickOverlay.lastGateActive = false;
      pickOverlay.lastGateReason = "敵参照画像待ち";
      pickOverlay.lastHudSummaries = PICK_OVERLAY_CONFIG.hudRois.map(() => "enemy ref missing");
      pickOverlay.lastSummary = "敵参照画像待ち";
      appendPickOverlayDebugLogIfChanged(
        "enemy-ref-missing",
        ["[debug] pick state: 敵参照画像がないため比較しません。"],
      );
      return;
    }

    if (auto.phase !== "snapped") {
      if (observation) observation.reason = "phase_wait";
      clearPickOverlayPendingMatches();
      pickOverlay.lastGateActive = false;
      const phaseLabel = getAutoPhaseLabel(auto.phase);
      pickOverlay.lastGateReason = `phase待ち (${phaseLabel})`;
      pickOverlay.lastHudSummaries = PICK_OVERLAY_CONFIG.hudRois.map(() => `phase wait ${phaseLabel}`);
      pickOverlay.lastSummary = buildPickOverlaySummary();
      appendPickOverlayDebugLogIfChanged(
        `gate-phase-wait:${auto.phase}`,
        [
          `[debug] pick state: phase=${phaseLabel} のため比較を保留します。`,
        ],
      );
      return;
    }

    const pickGateMode = battleHudSignal.matched
      ? "battle"
      : (battleHudSignal.hudOnlyAllowed ? "hud-only" : "");
    if (observation) observation.mode = pickGateMode || null;

    if (now - pickOverlay.lastCompareAt < PICK_OVERLAY_CONFIG.compareIntervalMs) {
      if (observation) observation.reason = "interval_wait";
      if (pickGateMode === "battle") {
        updateFaintDetection([], [], now);
      } else {
        updateFaintDetection([], [], now);
      }
      pickOverlay.lastGateReason = "比較待ち";
      pickOverlay.lastSummary = buildPickOverlaySummary();
      return;
    }

    if (!pickGateMode) {
      if (observation) observation.reason = "screen_blocked";
      updateFaintDetection([], [], now);
      const keptPending = keepPickOverlayPendingThroughGate(now);
      pickOverlay.lastGateReason = battleHudSignal.enemyListStillVisible
        ? "battle HUD待ち / 相手一覧表示中"
        : "battle HUD待ち";
      if (keptPending) {
        pickOverlay.lastGateReason += " / gate grace";
      }
      pickOverlay.lastHudSummaries = PICK_OVERLAY_CONFIG.hudRois.map(() => "battle hud wait");
      pickOverlay.lastSummary = buildPickOverlaySummary();
      appendPickOverlayDebugLogIfChanged(
        `gate-battle-hud-wait:${keptPending ? 1 : 0}:${Math.round(battleHudSignal.hudAccent * 20)}:${Math.round(battleHudSignal.hudBright * 20)}:${battleHudSignal.enemyListStillVisible ? 1 : 0}:${battleHudSignal.preBattleScreenSource}:${battleHudSignal.enemyListColorSignal ? 1 : 0}`,
        [
          `[debug] pick state: ${pickOverlay.lastGateReason} hud=${formatAutoMetric(battleHudSignal.hudAccent)} bright=${formatAutoMetric(battleHudSignal.hudBright)} enemyListVisible=${battleHudSignal.enemyListStillVisible ? "yes blocked" : "no"} source=${battleHudSignal.preBattleScreenSource} color=${battleHudSignal.enemyListColorSignal ? "yes" : "no"}`,
        ],
      );
      return;
    }

    const dimensions = getStreamDimensions();
    if (!dimensions.width || !dimensions.height) {
      if (observation) observation.reason = "video_missing";
      clearPickOverlayPendingMatches();
      pickOverlay.lastGateActive = false;
      pickOverlay.lastHudSummaries = PICK_OVERLAY_CONFIG.hudRois.map(() => "video missing");
      pickOverlay.lastSummary = "入力待ち";
      appendPickOverlayDebugLogIfChanged(
        "video-missing",
        ["[debug] pick state: 入力サイズが取れないため比較しません。"],
      );
      return;
    }

    pickOverlay.lastGateActive = true;
    pickOverlay.lastGateReason = pickGateMode === "hud-only"
      ? "battle HUDなし / HUD-only品質確認中"
      : "battle HUD一致 / HUD品質確認中";
    const hudSampleSets = PICK_OVERLAY_CONFIG.hudRois.map((roi) => samplePickOverlayHudCandidates(
      elements.video,
      getPickOverlayNormalizedRect(roi, dimensions.width, dimensions.height),
      dimensions,
    ));
    if (observation) observation.readCounts = hudSampleSets.map((candidates) => candidates.length);
    if (hudSampleSets.some((candidates) => !candidates.length)) {
      if (observation) observation.reason = "hud_read_failed";
      if (pickGateMode === "battle") {
        updateFaintDetection([], [], now);
      } else {
        updateFaintDetection([], [], now);
      }
      clearPickOverlayPendingMatches();
      pickOverlay.lastHudSummaries = PICK_OVERLAY_CONFIG.hudRois.map(() => "roi read failed");
      pickOverlay.lastSummary = "ROI 読み取り失敗";
      pickOverlay.lastGateReason = "HUD ROI 読み取り失敗";
      appendPickOverlayDebugLogIfChanged(
        "roi-read-failed",
        ["[debug] pick compare: HUD ROI の読み取りに失敗しました。"],
      );
      return;
    }

    const hudGateStates = hudSampleSets.map((candidates) => evaluatePickOverlayHudCandidateGate(candidates));
    if (observation) observation.gates = hudGateStates;
    const readyHudIndexes = hudGateStates
      .map((gateState, hudIndex) => (gateState.ready ? hudIndex : -1))
      .filter((hudIndex) => hudIndex >= 0);
    if (!readyHudIndexes.length) {
      if (observation) observation.reason = "hud_quality_rejected";
      if (pickGateMode === "battle") {
        updateFaintDetection([], hudGateStates, now);
      } else {
        updateFaintDetection([], hudGateStates, now);
      }
      const keptPending = keepPickOverlayPendingThroughGate(now);
      pickOverlay.lastGateReason = pickGateMode === "hud-only" ? "HUD-only待ち" : "HUD待ち";
      if (keptPending) {
        pickOverlay.lastGateReason += " / gate grace";
      }
      pickOverlay.lastHudSummaries = hudGateStates.map((gateState) => gateState.summary);
      pickOverlay.lastSummary = buildPickOverlaySummary();
      appendPickOverlayDebugLogIfChanged(
        `gate-hud-wait:${keptPending ? 1 : 0}:${hudGateStates.map((gateState) => gateState.key).join("|")}`,
        [
          `[debug] pick compare: HUD 2枠がまだ比較向きでないため比較しません。${keptPending ? " gate grace で pending を保持します。" : ""}`,
          ...hudGateStates.map((gateState, hudIndex) => `[debug] pick compare HUD${hudIndex + 1}: ${gateState.summary}`),
        ],
      );
      return;
    }

    const reference = state.references.enemy;
    const referenceSamples = PICK_OVERLAY_CONFIG.referenceRois.map((roi) => samplePickOverlaySource(
      reference,
      getPickOverlayNormalizedRect(roi, reference.width, reference.height),
    ));

    pickOverlay.lastCompareAt = now;
    if (referenceSamples.some((sample) => !sample)) {
      if (observation) observation.reason = "reference_read_failed";
      if (pickGateMode === "battle") {
        updateFaintDetection([], hudGateStates, now);
      } else {
        updateFaintDetection([], hudGateStates, now);
      }
      clearPickOverlayPendingMatches();
      pickOverlay.lastHudSummaries = PICK_OVERLAY_CONFIG.hudRois.map(() => "ref roi read failed");
      pickOverlay.lastSummary = "参照 ROI 読み取り失敗";
      pickOverlay.lastGateReason = "参照 ROI 読み取り失敗";
      appendPickOverlayDebugLogIfChanged(
        "ref-roi-read-failed",
        ["[debug] pick compare: 参照 ROI の読み取りに失敗しました。"],
      );
      return;
    }

    pickOverlay.lastGateReason = pickGateMode === "hud-only"
      ? `battle HUDなし / HUD-only ready ${readyHudIndexes.length}/${PICK_OVERLAY_CONFIG.hudRois.length}`
      : `battle HUD一致 / HUD ready ${readyHudIndexes.length}/${PICK_OVERLAY_CONFIG.hudRois.length}`;
    const { tentativeMatches, bestByHudIndex } = collectPickOverlayTentativeMatches(
      hudSampleSets,
      referenceSamples,
      readyHudIndexes,
      pickGateMode,
    );
    const acceptedAssignments = updatePickOverlayAssignments(tentativeMatches);
    if (observation) {
      observation.reason = "compared";
      observation.best = bestByHudIndex;
      observation.tentative = tentativeMatches;
      observation.accepted = acceptedAssignments;
    }
    updatePickOverlayDebugState(bestByHudIndex, tentativeMatches, acceptedAssignments, hudGateStates, pickGateMode);
    if (pickGateMode === "battle") {
      updateFaintDetection(bestByHudIndex, hudGateStates, now);
    } else {
      updateFaintDetection([], hudGateStates, now);
    }
    pickOverlay.lastSummary = buildPickOverlaySummary();
  }

  function collectPickOverlayTentativeMatches(hudSampleSets, referenceSamples, eligibleHudIndexes = [], matchMode = "battle") {
    const eligibleSet = new Set(eligibleHudIndexes);
    const bestByHudIndex = hudSampleSets.map((candidates, hudIndex) => {
      if (!eligibleSet.has(hudIndex) || !candidates.length) {
        return {
          refIndex: -1,
          bestScore: 0,
          secondBestScore: 0,
          margin: 0,
          tier: "",
          offsetX: 0,
          offsetY: 0,
          grayScore: 0,
          edgeScore: 0,
          colorScore: 0,
        };
      }

      const readyCandidates = candidates.filter((candidate) => candidate.gateState?.ready);
      if (!readyCandidates.length) {
        return {
          refIndex: -1,
          bestScore: 0,
          secondBestScore: 0,
          margin: 0,
          tier: "",
          offsetX: 0,
          offsetY: 0,
          grayScore: 0,
          edgeScore: 0,
          colorScore: 0,
        };
      }

      return readyCandidates.reduce((bestCandidate, candidate) => {
        const scores = referenceSamples.map((referenceSample, refIndex) => {
          const scoreResult = comparePickOverlaySamples(candidate.sample, referenceSample);
          return {
            refIndex,
            score: scoreResult.score,
            grayScore: scoreResult.grayScore,
            edgeScore: scoreResult.edgeScore,
            colorScore: scoreResult.colorScore,
          };
        }).sort((left, right) => right.score - left.score);
        const bestScore = scores[0]?.score ?? 0;
        const secondBestScore = scores[1]?.score ?? 0;
        const margin = bestScore - secondBestScore;
        const nextCandidate = {
          refIndex: scores[0]?.refIndex ?? -1,
          scores,
          secondRefIndex: scores[1]?.refIndex ?? -1,
          candidateGate: candidate.gateState,
          bestScore,
          secondBestScore,
          margin,
          tier: getPickOverlayMatchTier(bestScore, margin, matchMode),
          offsetX: candidate.offsetX,
          offsetY: candidate.offsetY,
          grayScore: scores[0]?.grayScore ?? 0,
          edgeScore: scores[0]?.edgeScore ?? 0,
          colorScore: scores[0]?.colorScore ?? 0,
        };

        return isBetterPickOverlayCandidate(nextCandidate, bestCandidate)
          ? nextCandidate
          : bestCandidate;
      }, {
        refIndex: -1,
        bestScore: 0,
        secondBestScore: 0,
        margin: 0,
        tier: "",
        offsetX: 0,
        offsetY: 0,
        grayScore: 0,
        edgeScore: 0,
        colorScore: 0,
      });
    });

    const weakRefCounts = bestByHudIndex.reduce((counts, best) => {
      if (best.tier === "weak" && best.refIndex >= 0) {
        counts.set(best.refIndex, (counts.get(best.refIndex) || 0) + 1);
      }
      return counts;
    }, new Map());
    const tentativeMatches = [];
    const usedHudIndexes = new Set();
    const usedRefIndexes = new Set();
    const pairs = bestByHudIndex
      .map((best, hudIndex) => ({ ...best, hudIndex }))
      .filter((pair) => pair.refIndex >= 0 && pair.tier)
      .sort((left, right) => {
        const tierDiff = getPickOverlayTierPriority(right.tier) - getPickOverlayTierPriority(left.tier);
        if (tierDiff) {
          return tierDiff;
        }
        if (right.bestScore !== left.bestScore) {
          return right.bestScore - left.bestScore;
        }
        if (right.margin !== left.margin) {
          return right.margin - left.margin;
        }
        return left.hudIndex - right.hudIndex;
      });

    pairs.forEach((pair) => {
      if (usedHudIndexes.has(pair.hudIndex) || usedRefIndexes.has(pair.refIndex)) {
        return;
      }

      if (pair.tier === "weak" && weakRefCounts.get(pair.refIndex) > 1) {
        return;
      }

      tentativeMatches.push(pair);
      usedHudIndexes.add(pair.hudIndex);
      usedRefIndexes.add(pair.refIndex);
    });

    return {
      tentativeMatches,
      bestByHudIndex,
    };
  }

  function samplePickOverlayHudCandidates(source, crop, dimensions) {
    const scaleX = dimensions.width / 1920;
    const scaleY = dimensions.height / 1080;
    return PICK_OVERLAY_CONFIG.hudSearchOffsets
      .map((offset) => {
        const offsetCrop = clampAutoRoiCrop(
          {
            x: crop.x + (offset.x * scaleX),
            y: crop.y + (offset.y * scaleY),
            width: crop.width,
            height: crop.height,
          },
          dimensions.width,
          dimensions.height,
        );
        const sample = samplePickOverlaySource(source, offsetCrop);
        if (!sample) {
          return null;
        }

        const gateState = evaluatePickOverlayHudGate(sample);
        return {
          sample,
          gateState,
          offsetX: offset.x,
          offsetY: offset.y,
        };
      })
      .filter(Boolean);
  }

  function samplePickOverlaySource(source, crop) {
    const context = getPickOverlaySampleContext(
      PICK_OVERLAY_CONFIG.sampleWidth,
      PICK_OVERLAY_CONFIG.sampleHeight,
    );
    if (!context) {
      return null;
    }

    context.clearRect(0, 0, PICK_OVERLAY_CONFIG.sampleWidth, PICK_OVERLAY_CONFIG.sampleHeight);
    context.drawImage(
      source,
      Math.round(crop.x),
      Math.round(crop.y),
      Math.max(1, Math.round(crop.width)),
      Math.max(1, Math.round(crop.height)),
      0,
      0,
      PICK_OVERLAY_CONFIG.sampleWidth,
      PICK_OVERLAY_CONFIG.sampleHeight,
    );

    const imageData = context.getImageData(
      0,
      0,
      PICK_OVERLAY_CONFIG.sampleWidth,
      PICK_OVERLAY_CONFIG.sampleHeight,
    ).data;
    const sampleWidth = PICK_OVERLAY_CONFIG.sampleWidth;
    const sampleHeight = PICK_OVERLAY_CONFIG.sampleHeight;
    const sampleSize = sampleWidth * sampleHeight;
    const values = new Float32Array(sampleSize);
    const colorValues = new Float32Array(sampleSize * 2);
    let sum = 0;
    let colorRedGreenSum = 0;
    let colorBlueGreenSum = 0;
    let brightPixels = 0;
    for (let index = 0, sampleIndex = 0; index < imageData.length; index += 4, sampleIndex += 1) {
      const r = imageData[index];
      const g = imageData[index + 1];
      const b = imageData[index + 2];
      const grayscale = (r * 0.299) + (g * 0.587) + (b * 0.114);
      const colorIndex = sampleIndex * 2;
      const redGreen = r - g;
      const blueGreen = b - g;
      values[sampleIndex] = grayscale;
      colorValues[colorIndex] = redGreen;
      colorValues[colorIndex + 1] = blueGreen;
      sum += grayscale;
      colorRedGreenSum += redGreen;
      colorBlueGreenSum += blueGreen;
      if (grayscale >= 110) {
        brightPixels += 1;
      }
    }

    const mean = sum / values.length;
    const colorRedGreenMean = colorRedGreenSum / values.length;
    const colorBlueGreenMean = colorBlueGreenSum / values.length;
    const edgeValues = new Float32Array(sampleSize);
    let edgeSum = 0;
    for (let y = 1; y < sampleHeight - 1; y += 1) {
      for (let x = 1; x < sampleWidth - 1; x += 1) {
        const sampleIndex = (y * sampleWidth) + x;
        const gx = values[sampleIndex + 1] - values[sampleIndex - 1];
        const gy = values[sampleIndex + sampleWidth] - values[sampleIndex - sampleWidth];
        const edge = Math.sqrt((gx * gx) + (gy * gy));
        edgeValues[sampleIndex] = edge;
        edgeSum += edge;
      }
    }
    const edgeMean = edgeSum / edgeValues.length;
    let normSquared = 0;
    let edgeNormSquared = 0;
    let colorNormSquared = 0;
    for (let index = 0; index < values.length; index += 1) {
      const colorIndex = index * 2;
      values[index] -= mean;
      edgeValues[index] -= edgeMean;
      colorValues[colorIndex] -= colorRedGreenMean;
      colorValues[colorIndex + 1] -= colorBlueGreenMean;
      normSquared += values[index] * values[index];
      edgeNormSquared += edgeValues[index] * edgeValues[index];
      colorNormSquared += (colorValues[colorIndex] * colorValues[colorIndex])
        + (colorValues[colorIndex + 1] * colorValues[colorIndex + 1]);
    }

    return {
      values,
      edgeValues,
      colorValues,
      mean,
      normSquared,
      edgeNormSquared,
      colorNormSquared,
      contrast: Math.sqrt(normSquared / values.length),
      brightRatio: brightPixels / values.length,
    };
  }

  function evaluatePickOverlayHudGate(sample) {
    const thresholds = PICK_OVERLAY_CONFIG.thresholds;
    if (!sample) {
      return {
        ready: false,
        key: "missing",
        summary: "gate sample missing",
        reasonCount: 1,
      };
    }

    const reasons = [];
    if (sample.mean < thresholds.hudGateMeanMin) {
      reasons.push("dark");
    }
    if (sample.contrast < thresholds.hudGateContrastMin) {
      reasons.push("flat");
    }
    if (sample.brightRatio < thresholds.hudGateBrightRatioMin) {
      reasons.push("dim");
    }

    const detail = `mean=${formatAutoMetric(sample.mean)} contrast=${formatAutoMetric(sample.contrast)} bright=${formatAutoMetric(sample.brightRatio)}`;
    return {
      ready: reasons.length === 0,
      key: reasons.length ? reasons.join("+") : "ready",
      summary: reasons.length ? `gate ${reasons.join("/")} ${detail}` : `gate ready ${detail}`,
      reasonCount: reasons.length,
      mean: sample.mean,
      contrast: sample.contrast,
      brightRatio: sample.brightRatio,
    };
  }

  function evaluatePickOverlayHudCandidateGate(candidates) {
    return candidates.reduce((bestGate, candidate) => {
      const gateState = candidate.gateState || evaluatePickOverlayHudGate(candidate.sample);
      const nextGate = {
        ...gateState,
        offsetX: candidate.offsetX,
        offsetY: candidate.offsetY,
        summary: `${gateState.summary} offset=${formatPickOverlayOffset(candidate)}`,
      };
      if (!bestGate) {
        return nextGate;
      }
      if (nextGate.ready !== bestGate.ready) {
        return nextGate.ready ? nextGate : bestGate;
      }
      if (nextGate.reasonCount !== bestGate.reasonCount) {
        return nextGate.reasonCount < bestGate.reasonCount ? nextGate : bestGate;
      }
      if (nextGate.contrast !== bestGate.contrast) {
        return nextGate.contrast > bestGate.contrast ? nextGate : bestGate;
      }
      return nextGate.brightRatio > bestGate.brightRatio ? nextGate : bestGate;
    }, null) || {
      ready: false,
      key: "missing",
      summary: "gate sample missing",
      reasonCount: 1,
    };
  }

  function getPickOverlayMatchTier(bestScore, margin, matchMode = "battle") {
    const thresholds = PICK_OVERLAY_CONFIG.thresholds;
    if (matchMode === "hud-only") {
      return bestScore >= thresholds.hudOnlyScoreMin && margin >= thresholds.hudOnlyMarginMin
        ? "hud-only"
        : "";
    }

    if (bestScore >= thresholds.scoreMin && margin >= thresholds.marginMin) {
      return "strong";
    }

    if (bestScore >= thresholds.scoreMinStrongMargin && margin >= thresholds.marginStrongMin) {
      return "strong";
    }

    if (bestScore >= thresholds.scoreWeakMin && margin >= thresholds.marginWeakMin) {
      return "weak";
    }

    return "";
  }

  function getPickOverlayTierPriority(tier) {
    if (tier === "strong") {
      return 3;
    }
    if (tier === "hud-only") {
      return 2;
    }
    return tier === "weak" ? 1 : 0;
  }

  function getStrongerPickOverlayTier(leftTier, rightTier) {
    return getPickOverlayTierPriority(rightTier) > getPickOverlayTierPriority(leftTier)
      ? rightTier
      : leftTier;
  }

  function getPickOverlayRequiredStreak(tier) {
    if (tier === "hud-only") {
      return PICK_OVERLAY_CONFIG.requiredHudOnlyStreak;
    }
    return tier === "weak"
      ? PICK_OVERLAY_CONFIG.requiredWeakStreak
      : PICK_OVERLAY_CONFIG.requiredStrongStreak;
  }

  function isBetterPickOverlayCandidate(nextCandidate, currentCandidate) {
    const tierDiff = getPickOverlayTierPriority(nextCandidate.tier) - getPickOverlayTierPriority(currentCandidate?.tier);
    if (tierDiff) {
      return tierDiff > 0;
    }
    if (!currentCandidate || nextCandidate.bestScore !== currentCandidate.bestScore) {
      return !currentCandidate || nextCandidate.bestScore > currentCandidate.bestScore;
    }
    if (nextCandidate.margin !== currentCandidate.margin) {
      return nextCandidate.margin > currentCandidate.margin;
    }
    const nextOffsetDistance = Math.abs(nextCandidate.offsetX) + Math.abs(nextCandidate.offsetY);
    const currentOffsetDistance = Math.abs(currentCandidate.offsetX) + Math.abs(currentCandidate.offsetY);
    return nextOffsetDistance < currentOffsetDistance;
  }

  function comparePickOverlaySamples(leftSample, rightSample) {
    if (!leftSample || !rightSample || !leftSample.normSquared || !rightSample.normSquared) {
      return {
        score: 0.5,
        grayScore: 0.5,
        edgeScore: 0.5,
        colorScore: 0.5,
      };
    }

    const grayScore = comparePickOverlayVectors(
      leftSample.values,
      leftSample.normSquared,
      rightSample.values,
      rightSample.normSquared,
    );
    const edgeScore = comparePickOverlayVectors(
      leftSample.edgeValues,
      leftSample.edgeNormSquared,
      rightSample.edgeValues,
      rightSample.edgeNormSquared,
    );
    const colorScore = comparePickOverlayVectors(
      leftSample.colorValues,
      leftSample.colorNormSquared,
      rightSample.colorValues,
      rightSample.colorNormSquared,
    );
    const baseScore = (grayScore * 0.75) + (edgeScore * 0.25);
    return {
      score: clamp(baseScore + ((colorScore - 0.5) * 0.12), 0, 1),
      grayScore,
      edgeScore,
      colorScore,
    };
  }

  function comparePickOverlayVectors(leftValues, leftNormSquared, rightValues, rightNormSquared) {
    if (!leftValues || !rightValues || !leftNormSquared || !rightNormSquared) {
      return 0.5;
    }

    let numerator = 0;
    for (let index = 0; index < leftValues.length; index += 1) {
      numerator += leftValues[index] * rightValues[index];
    }

    const denominator = Math.sqrt(leftNormSquared * rightNormSquared);
    if (!denominator) {
      return 0.5;
    }

    const correlation = clamp(numerator / denominator, -1, 1);
    return (correlation + 1) / 2;
  }

  function getPokemonIconSampleContext() {
    const { sampleWidth, sampleHeight } = POKEMON_ICON_RECOGNITION_CONFIG;
    if (!state.pokemonIconSampleCanvas) {
      state.pokemonIconSampleCanvas = document.createElement("canvas");
    }

    if (
      state.pokemonIconSampleCanvas.width !== sampleWidth
      || state.pokemonIconSampleCanvas.height !== sampleHeight
    ) {
      state.pokemonIconSampleCanvas.width = sampleWidth;
      state.pokemonIconSampleCanvas.height = sampleHeight;
      state.pokemonIconSampleContext = null;
    }

    if (!state.pokemonIconSampleContext) {
      state.pokemonIconSampleContext = state.pokemonIconSampleCanvas.getContext("2d", { willReadFrequently: true });
    }

    return state.pokemonIconSampleContext;
  }

  function samplePokemonIconSource(source, crop = null, options = {}) {
    const { useAlphaMask = false } = options;
    const { sampleWidth, sampleHeight } = POKEMON_ICON_RECOGNITION_CONFIG;
    const context = getPokemonIconSampleContext();
    if (!context) {
      return null;
    }

    context.clearRect(0, 0, sampleWidth, sampleHeight);
    if (crop) {
      context.drawImage(
        source,
        Math.round(crop.x),
        Math.round(crop.y),
        Math.max(1, Math.round(crop.width)),
        Math.max(1, Math.round(crop.height)),
        0,
        0,
        sampleWidth,
        sampleHeight,
      );
    } else {
      context.drawImage(source, 0, 0, sampleWidth, sampleHeight);
    }

    return readPokemonIconSampleFromContext(useAlphaMask);
  }

  function samplePokemonIconCandidateImage(image, transform = {}) {
    const { scale = 1, offsetX = 0, offsetY = 0 } = transform;
    const { sampleWidth, sampleHeight } = POKEMON_ICON_RECOGNITION_CONFIG;
    const context = getPokemonIconSampleContext();
    if (!context) {
      return null;
    }

    const drawWidth = sampleWidth * scale;
    const drawHeight = sampleHeight * scale;
    const drawX = ((sampleWidth - drawWidth) / 2) + offsetX;
    const drawY = ((sampleHeight - drawHeight) / 2) + offsetY;
    context.clearRect(0, 0, sampleWidth, sampleHeight);
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

    return readPokemonIconSampleFromContext(true);
  }

  function readPokemonIconSampleFromContext(useAlphaMask) {
    const { sampleWidth, sampleHeight, alphaThreshold } = POKEMON_ICON_RECOGNITION_CONFIG;
    const context = getPokemonIconSampleContext();
    if (!context) {
      return null;
    }

    const imageData = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
    const sampleSize = sampleWidth * sampleHeight;
    const values = new Float32Array(sampleSize);
    const edgeValues = new Float32Array(sampleSize);
    const redChromaValues = new Float32Array(sampleSize);
    const blueChromaValues = new Float32Array(sampleSize);
    const mask = useAlphaMask ? new Uint8Array(sampleSize) : null;
    let activeCount = 0;

    for (let index = 0, sampleIndex = 0; index < imageData.length; index += 4, sampleIndex += 1) {
      const r = imageData[index];
      const g = imageData[index + 1];
      const b = imageData[index + 2];
      const alpha = imageData[index + 3];
      const gray = (r * 0.299) + (g * 0.587) + (b * 0.114);
      values[sampleIndex] = gray;
      redChromaValues[sampleIndex] = r - gray;
      blueChromaValues[sampleIndex] = b - gray;
      if (!useAlphaMask || alpha >= alphaThreshold) {
        if (mask) {
          mask[sampleIndex] = 1;
        }
        activeCount += 1;
      }
    }

    for (let y = 1; y < sampleHeight - 1; y += 1) {
      for (let x = 1; x < sampleWidth - 1; x += 1) {
        const sampleIndex = (y * sampleWidth) + x;
        const gx = values[sampleIndex + 1] - values[sampleIndex - 1];
        const gy = values[sampleIndex + sampleWidth] - values[sampleIndex - sampleWidth];
        edgeValues[sampleIndex] = Math.sqrt((gx * gx) + (gy * gy));
      }
    }

    if (useAlphaMask && activeCount === 0) {
      return null;
    }

    return {
      values,
      edgeValues,
      redChromaValues,
      blueChromaValues,
      mask,
      activeCount,
    };
  }

  function comparePokemonIconSamples(referenceSample, iconSample, options = {}) {
    const { useColor = true } = options;
    if (!referenceSample || !iconSample?.mask || !iconSample.activeCount) {
      return {
        score: 0,
        shapeScore: 0,
        grayScore: 0,
        edgeScore: 0,
        colorScore: 0,
      };
    }

    const grayScore = comparePokemonIconMaskedVectors(
      referenceSample.values,
      iconSample.values,
      iconSample.mask,
      iconSample.activeCount,
    );
    const edgeScore = comparePokemonIconMaskedVectors(
      referenceSample.edgeValues,
      iconSample.edgeValues,
      iconSample.mask,
      iconSample.activeCount,
    );
    const shapeScore = clamp((grayScore * 0.78) + (edgeScore * 0.22), 0, 1);
    const colorScore = useColor
      ? comparePokemonIconColorSamples(referenceSample, iconSample)
      : 0.5;
    const score = useColor
      ? clamp((shapeScore * (1 - POKEMON_ICON_RECOGNITION_CONFIG.colorWeight)) + (colorScore * POKEMON_ICON_RECOGNITION_CONFIG.colorWeight), 0, 1)
      : shapeScore;

    return {
      score,
      shapeScore,
      grayScore,
      edgeScore,
      colorScore,
    };
  }

  function comparePokemonIconColorSamples(referenceSample, iconSample) {
    const redChromaScore = comparePokemonIconMaskedVectors(
      referenceSample.redChromaValues,
      iconSample.redChromaValues,
      iconSample.mask,
      iconSample.activeCount,
    );
    const blueChromaScore = comparePokemonIconMaskedVectors(
      referenceSample.blueChromaValues,
      iconSample.blueChromaValues,
      iconSample.mask,
      iconSample.activeCount,
    );

    return clamp((redChromaScore + blueChromaScore) / 2, 0, 1);
  }

  function comparePokemonIconMaskedVectors(leftValues, rightValues, mask, activeCount) {
    if (!leftValues || !rightValues || !mask || activeCount <= 1) {
      return 0.5;
    }

    let leftSum = 0;
    let rightSum = 0;
    for (let index = 0; index < mask.length; index += 1) {
      if (!mask[index]) {
        continue;
      }
      leftSum += leftValues[index];
      rightSum += rightValues[index];
    }

    const leftMean = leftSum / activeCount;
    const rightMean = rightSum / activeCount;
    let numerator = 0;
    let leftNormSquared = 0;
    let rightNormSquared = 0;
    for (let index = 0; index < mask.length; index += 1) {
      if (!mask[index]) {
        continue;
      }
      const left = leftValues[index] - leftMean;
      const right = rightValues[index] - rightMean;
      numerator += left * right;
      leftNormSquared += left * left;
      rightNormSquared += right * right;
    }

    const denominator = Math.sqrt(leftNormSquared * rightNormSquared);
    if (!denominator) {
      return 0.5;
    }

    const correlation = clamp(numerator / denominator, -1, 1);
    return (correlation + 1) / 2;
  }

  function schedulePokemonIconWorkerPrewarm() {
    if (!POKEMON_ICON_RECOGNITION_CONFIG.workerEnabled || !state.pokemonIconManifest) {
      return;
    }
    const start = () => {
      initializePokemonIconWorker({ prewarm: true });
    };
    queueAfterNextPaint(() => {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(start, {
          timeout: POKEMON_ICON_RECOGNITION_CONFIG.prewarmIdleTimeoutMs,
        });
        return;
      }
      window.setTimeout(start, 0);
    });
  }

  function initializePokemonIconWorker(options = {}) {
    const { prewarm = true } = options;
    const workerState = state.pokemonIconWorkerState;
    if (state.pokemonIconWorker) {
      if (prewarm && workerState.prewarmStatus === "idle") {
        state.pokemonIconWorker.postMessage({ type: "prewarm" });
      }
      return true;
    }
    if (["failed", "unsupported"].includes(workerState.status)) {
      return false;
    }
    if (
      !POKEMON_ICON_RECOGNITION_CONFIG.workerEnabled
      || typeof window.Worker !== "function"
      || !state.pokemonIconManifest
    ) {
      workerState.status = "unsupported";
      workerState.prewarmStatus = "unsupported";
      workerState.reason = typeof window.Worker !== "function"
        ? "Worker unavailable"
        : "Worker disabled or manifest missing";
      return false;
    }

    try {
      const workerUrl = new URL(POKEMON_ICON_WORKER_PATH, document.baseURI);
      const worker = new Worker(workerUrl, {
        type: "module",
        name: "pokemon-icon-matcher",
      });
      state.pokemonIconWorker = worker;
      workerState.status = "initializing";
      workerState.prewarmStatus = prewarm ? "queued" : "idle";
      workerState.reason = "";
      worker.addEventListener("message", handlePokemonIconWorkerMessage);
      worker.addEventListener("error", handlePokemonIconWorkerError);
      worker.addEventListener("messageerror", handlePokemonIconWorkerMessageError);
      worker.postMessage({
        type: "init",
        manifest: {
          ...state.pokemonIconManifest,
          icons: state.pokemonIconReferenceEntries,
          stats: {
            ...state.pokemonIconManifest?.stats,
            canonicalCandidateCount: state.pokemonIconReferenceEntries.length,
            recognitionCandidateCount: state.pokemonIconReferenceEntries.length,
          },
        },
        prewarm, remoteAssets: true,
      });
      return true;
    } catch (error) {
      workerState.status = "failed";
      workerState.prewarmStatus = "failed";
      workerState.reason = error.message;
      appendTerminalDebug([`[debug] icon worker init failed: ${error.message}`]);
      return false;
    }
  }

  function handlePokemonIconWorkerMessage(event) {
    const message = event.data || {};
    if (message.type === "asset-fetch") {
      const worker = state.pokemonIconWorker;
      void state.api.fetchAsset(message.url).then((buffer) => {
        if (worker === state.pokemonIconWorker) worker.postMessage({ type: "asset-response", assetRequestId: message.assetRequestId, ok: true, buffer }, [buffer]);
      }).catch((error) => {
        if (worker === state.pokemonIconWorker) worker.postMessage({ type: "asset-response", assetRequestId: message.assetRequestId, ok: false, error: error.message });
      });
      return;
    }
    const workerState = state.pokemonIconWorkerState;
    if (message.stats) {
      workerState.stats = message.stats;
    }
    if (Array.isArray(message.failures)) {
      workerState.failures = message.failures;
    }
    if (Array.isArray(message.visualCollisions)) {
      workerState.visualCollisions = message.visualCollisions;
    }
    if (Array.isArray(message.runtimeMergedDuplicates)) {
      workerState.runtimeMergedDuplicates = message.runtimeMergedDuplicates;
    }

    if (message.type === "worker-loaded") {
      workerState.status = "loaded";
      return;
    }
    if (message.type === "worker-ready") {
      workerState.status = "ready";
      workerState.capabilities = message.capabilities || {};
      return;
    }
    if (message.type === "prewarm-start") {
      workerState.status = "prewarming";
      workerState.prewarmStatus = "loading";
      state.pokemonIconRecognition.lastSummary = `worker prewarm loading canonical=${message.stats?.canonicalManifestCount || state.pokemonIconReferenceEntries.length}`;
      return;
    }
    if (message.type === "prewarm-progress") {
      workerState.status = "prewarming";
      workerState.prewarmStatus = "loading";
      return;
    }
    if (message.type === "prewarm-complete") {
      workerState.status = "ready";
      workerState.prewarmStatus = "ready";
      workerState.reason = "";
      if (!state.pokemonIconRecognition.reference) {
        state.pokemonIconRecognition.lastSummary = `worker prewarm ready loaded=${message.stats?.loadedCount || 0}/${message.stats?.canonicalManifestCount || 0}`;
      }
      state.terminalNoticeKeys.delete("remote-image-failure");
      if (state.references.enemy && state.pokemonIconRecognition.status === "unavailable") scheduleEnemyReferencePokemonRecognition();
      appendPokemonIconDebugLogIfChanged(
        `worker-prewarm-ready:${message.stats?.loadedCount || 0}:${message.stats?.loadFailureCount || 0}`,
        [
          `[debug] icon worker: prewarm ready loaded=${message.stats?.loadedCount || 0}/${message.stats?.canonicalManifestCount || 0} runtimeMerged=${message.stats?.runtimeNormalizedDuplicateCount || 0} collisions=${message.stats?.runtimeVisualCollisionGroupCount || 0} failures=${message.stats?.loadFailureCount || 0}`,
        ],
      );
      return;
    }
    if (message.type === "prewarm-error") {
      workerState.status = "failed"; workerState.prewarmStatus = "failed";
      workerState.reason = message.error || "比較画像の取得失敗";
      state.pokemonIconRecognition.status = "unavailable";
      appendTerminalNotice("remote-image-failure", ["[system] 比較画像の取得に失敗したため名前推定を待機します。api retry で再試行できます。"], "system");
      return;
    }
    if (message.type === "worker-unsupported") {
      workerState.status = message.type === "worker-unsupported" ? "unsupported" : "failed";
      workerState.prewarmStatus = workerState.status;
      workerState.reason = message.error || message.type;
      state.pokemonIconWorker?.terminate();
      state.pokemonIconWorker = null;
      fallbackCurrentPokemonIconRecognition(workerState.reason);
      return;
    }
    if (message.type === "recognition-start") {
      if (state.pokemonIconRecognition.requestId === message.requestId) {
        state.pokemonIconRecognition.status = "recognizing";
        state.pokemonIconRecognition.reason = "";
        state.pokemonIconRecognition.lastSummary = `worker recognizing request=${message.requestId} candidates=${message.candidateCount || 0}`;
      }
      return;
    }
    if (message.type === "recognition-result") {
      applyPokemonIconWorkerResult(message);
      return;
    }
    if (message.type === "recognition-cancelled") {
      if (state.pokemonIconRecognition.requestId === message.requestId) {
        state.pokemonIconRecognition.status = "cancelled";
        state.pokemonIconRecognition.reason = message.reason || "cancelled";
        state.pokemonIconRecognition.lastSummary = `cancelled request=${message.requestId}`;
      }
      return;
    }
    if (message.type === "recognition-error") {
      if (state.pokemonIconRecognition.requestId === message.requestId) {
        workerState.reason = message.error || "recognition error";
        if (workerState.prewarmStatus === "failed") state.pokemonIconRecognition.status = "unavailable";
        else fallbackCurrentPokemonIconRecognition(workerState.reason);
      }
    }
  }

  function handlePokemonIconWorkerError(event) {
    const message = event?.message || "Worker error";
    state.pokemonIconWorkerState.status = "failed";
    state.pokemonIconWorkerState.prewarmStatus = "failed";
    state.pokemonIconWorkerState.reason = message;
    state.pokemonIconWorker?.terminate();
    state.pokemonIconWorker = null;
    appendTerminalDebug([`[debug] icon worker error: ${message}`]);
    fallbackCurrentPokemonIconRecognition(message);
  }

  function handlePokemonIconWorkerMessageError() {
    state.pokemonIconWorkerState.status = "failed";
    state.pokemonIconWorkerState.reason = "Worker message decode failed";
    state.pokemonIconWorker?.terminate();
    state.pokemonIconWorker = null;
    appendTerminalDebug(["[debug] icon worker messageerror"]);
    fallbackCurrentPokemonIconRecognition("Worker message decode failed");
  }

  function fallbackCurrentPokemonIconRecognition(reason = "") {
    const recognition = state.pokemonIconRecognition;
    const reference = recognition.reference;
    const requestId = recognition.requestId;
    if (!reference || state.references.enemy !== reference || !requestId) {
      return;
    }
    if (recognition.engine === "legacy" && ["loading", "recognizing", "ready"].includes(recognition.status)) {
      return;
    }
    recognition.engine = "legacy";
    recognition.status = "loading";
    recognition.reason = reason ? `worker fallback: ${reason}` : "worker fallback";
    recognition.lastSummary = `legacy fallback request=${requestId}`;
    appendTerminalNotice(
      "pokemon-icon-worker-fallback",
      ["[system] 名前推定を互換モードで実行します。詳細は debug status で確認できます。"],
      "system",
    );
    void recognizeEnemyReferencePokemonSlots(reference, requestId);
  }

  function createPokemonIconWorkerSlotPayloads(reference) {
    const slots = [];
    const transfer = [];
    POKEMON_ICON_RECOGNITION_CONFIG.referenceRois.forEach((roi) => {
      const crop = getPickOverlayNormalizedRect(roi, reference.width, reference.height);
      const width = Math.max(1, Math.round(crop.width));
      const height = Math.max(1, Math.round(crop.height));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", {
        willReadFrequently: true,
      });
      if (!context) {
        throw new Error("名前推定ROIのcanvas初期化に失敗しました。");
      }
      context.drawImage(
        reference,
        Math.round(crop.x),
        Math.round(crop.y),
        width,
        height,
        0,
        0,
        width,
        height,
      );
      const imageData = context.getImageData(0, 0, width, height);
      slots.push({
        width,
        height,
        buffer: imageData.data.buffer,
      });
      transfer.push(imageData.data.buffer);
    });
    return {
      slots,
      transfer,
    };
  }

  function startPokemonIconWorkerRecognition(reference, requestId) {
    if (!initializePokemonIconWorker({ prewarm: true }) || !state.pokemonIconWorker) {
      return false;
    }
    try {
      const payload = createPokemonIconWorkerSlotPayloads(reference);
      const recognition = state.pokemonIconRecognition;
      recognition.engine = "worker";
      recognition.status = "queued";
      recognition.reason = state.pokemonIconWorkerState.prewarmStatus === "ready"
        ? "worker queue"
        : "worker prewarm";
      recognition.requestSentAt = getPerformanceDebugNow();
      recognition.lastSummary = `worker queued request=${requestId} slots=${payload.slots.length}`;
      state.pokemonIconWorker.postMessage({
        type: "recognize",
        requestId,
        slots: payload.slots,
      }, payload.transfer);
      return true;
    } catch (error) {
      state.pokemonIconWorkerState.status = "failed";
      state.pokemonIconWorkerState.reason = error.message;
      appendTerminalDebug([`[debug] icon worker request failed: ${error.message}`]);
      return false;
    }
  }

  function applyPokemonIconWorkerResult(message) {
    const recognition = state.pokemonIconRecognition;
    if (
      recognition.requestId !== message.requestId
      || state.references.enemy !== recognition.reference
    ) {
      appendPokemonIconDebugLogIfChanged(
        `worker-stale:${message.requestId}:${recognition.requestId}`,
        [`[debug] icon worker: stale request=${message.requestId} current=${recognition.requestId}`],
      );
      return;
    }
    const results = Array.isArray(message.result?.results)
      ? message.result.results
      : [];
    if (results.length !== PICK_OVERLAY_CONFIG.referenceRois.length) {
      fallbackCurrentPokemonIconRecognition("Worker result slot count mismatch");
      return;
    }
    recognition.engine = message.engine || "worker";
    recognition.status = "ready";
    recognition.reason = "";
    recognition.resultsByRefIndex = results;
    recognition.lastDiagnostics = message.result;
    recognition.workerTiming = message.workerTiming || {};
    recognition.candidateStats = message.stats || state.pokemonIconWorkerState.stats;
    recognition.candidateFailures = message.failures || [];
    recognition.visualCollisions = message.visualCollisions || [];
    recognition.lastSlotSummaries = results.map(formatPokemonIconRecognitionSlotSummary);
    const matchedCount = results.filter((result) => result?.matched).length;
    recognition.lastSummary = `${recognition.engine} done matched=${matchedCount}/${results.length} candidates=${message.stats?.loadedCount || 0} total=${formatPerformanceMs(message.result?.timings?.totalMs || 0)}`;
    recordMatchLogRecognition(recognition, message.result?.timings?.totalMs || 0);
    results.forEach((result, refIndex) => {
      recordPerformanceDebugMetric(
        "pokemonIconSlot",
        result?.durationMs || 0,
        `request=${message.requestId} ${getPickSlotLabel(refIndex)} ${recognition.lastSlotSummaries[refIndex]}`,
        { logKey: `pokemonIconSlot:${refIndex}` },
      );
    });
    recordPerformanceDebugMetric(
      "pokemonIconRecognition",
      getPerformanceDebugNow() - (recognition.requestSentAt || getPerformanceDebugNow()),
      `request=${message.requestId} engine=worker matched=${matchedCount}/${results.length} worker=${formatPerformanceMs(message.workerTiming?.totalWorkerMs || 0)}`,
    );
    appendPokemonIconDebugLogIfChanged(
      `worker-done:${message.requestId}:${matchedCount}:${recognition.lastSlotSummaries.join("|")}`,
      [
        `[debug] icon worker: ${recognition.lastSummary}`,
        ...recognition.lastSlotSummaries.map((summary, index) => `[debug] icon recog ${getPickSlotLabel(index)}: ${summary}`),
      ],
    );
    flushPickOverlayPokemonResults();
    prefetchRecognizedStatistics();
  }

  function cancelPokemonIconWorkerRequest(requestId) {
    if (!requestId || !state.pokemonIconWorker) {
      return;
    }
    state.pokemonIconWorker.postMessage({
      type: "cancel",
      requestId,
    });
  }


  async function ensurePokemonIconCandidatesLoaded() {
    if (state.compatibilityReady) return state.pokemonIconCandidates;
    if (state.pokemonIconCandidatesPromise) return state.pokemonIconCandidatesPromise;
    if (!state.pokemonIconReferenceReady) return [];
    state.pokemonIconCandidatesPromise = loadPokemonIconCandidates(state.pokemonIconReferenceEntries).then((candidates) => {
      state.pokemonIconCandidates = candidates;
      state.compatibilityReady = true;
      state.pokemonIconCandidatesLoadFailed = false;
      return candidates;
    }).catch((error) => {
      state.pokemonIconCandidatesLoadFailed = true;
      state.pokemonIconRecognition.status = "unavailable";
      state.pokemonIconRecognition.reason = error.message;
      appendTerminalNotice("remote-image-failure", ["[system] 比較画像の取得に失敗したため名前推定を待機します。api retry で再試行できます。"], "system");
      return [];
    }).finally(() => { state.pokemonIconCandidatesPromise = null; });
    return state.pokemonIconCandidatesPromise;
  }


  async function loadPokemonIconCandidates(entries) {
    const matcher = await import(POKEMON_ICON_MATCHER_PATH);
    const results = await Promise.allSettled(entries.map(async (entry) => {
      const cacheKey = `${entry.id}:${entry.path}`;
      if (state.candidateCache.has(cacheKey)) return state.candidateCache.get(cacheKey);
      const buffer = await state.api.fetchAsset(entry.path);
      const url = URL.createObjectURL(new Blob([buffer], { type: "image/png" }));
      try {
        const image = await new Promise((resolve, reject) => {
          const image = new Image(); image.decoding = "async";
          image.onload = () => resolve(image); image.onerror = () => reject(new Error("画像を読み取れませんでした。")); image.src = url;
        });
        const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        const rgba = context.getImageData(0, 0, canvas.width, canvas.height);
        const normalized = matcher.normalizeCandidateRgba(rgba);
        if (!normalized.valid) throw new Error("比較画像の透過領域が不正です。");
        const candidate = { ...entry, feature: matcher.buildCandidateFeature(normalized),
          normalizedRgba: normalized.data, normalizedFingerprint: matcher.fingerprintRgba(normalized.data) };
        state.candidateCache.set(cacheKey, candidate);
        return candidate;
      } finally { URL.revokeObjectURL(url); }
    }));
    if (results.some((result) => result.status === "rejected")) throw new Error("比較画像の一部が取得できませんでした。");
    const prepared = matcher.dedupeNormalizedPokemonIconCandidates(results.map((result) => result.value));
    state.pokemonIconRecognition.visualCollisions = prepared.collisions;
    return prepared.candidates;
  }



  function scheduleEnemyReferencePokemonRecognition(options = {}) {
    const { deferUntilAfterPaint = false } = options;
    const reference = state.references.enemy;
    if (!reference) {
      state.pokemonIconRecognition.status = "idle";
      state.pokemonIconRecognition.reason = "enemy reference missing";
      state.pokemonIconRecognition.lastSummary = "skip: enemy reference missing";
      appendPokemonIconDebugLogIfChanged(
        "schedule-skip:no-reference",
        ["[debug] icon recog: skip enemy_reference_missing"],
      );
      return;
    }

    if (!state.pokemonIconReferenceReady) {
      state.pokemonIconRecognition.status = "waiting_manifest";
      state.pokemonIconRecognition.reason = "manifest not ready";
      state.pokemonIconRecognition.lastSummary = "wait: manifest not ready";
      appendPokemonIconDebugLogIfChanged(
        "schedule-wait:manifest-not-ready",
        ["[debug] icon recog: wait manifest_not_ready"],
      );
      return;
    }

    const requestId = state.pokemonIconRequestSequence + 1;
    state.pokemonIconRequestSequence = requestId;
    state.pokemonIconRecognition.requestId = requestId;
    state.pokemonIconRecognition.reference = reference;
    state.pokemonIconRecognition.status = deferUntilAfterPaint ? "queued" : "loading";
    state.pokemonIconRecognition.reason = deferUntilAfterPaint ? "waiting for repaint" : "";
    state.pokemonIconRecognition.lastSummary = deferUntilAfterPaint
      ? `queued request=${requestId} ref=${reference.width}x${reference.height} entries=${state.pokemonIconReferenceEntries.length} nameRoi=114x114`
      : `start request=${requestId} ref=${reference.width}x${reference.height} entries=${state.pokemonIconReferenceEntries.length} nameRoi=114x114`;
    state.pokemonIconRecognition.lastSlotSummaries = PICK_OVERLAY_CONFIG.referenceRois.map(() => "待機中");
    const startRecognition = () => startEnemyReferencePokemonRecognition(reference, requestId);
    if (deferUntilAfterPaint) {
      queueAfterNextPaint(startRecognition);
      return;
    }

    startRecognition();
  }

  function startEnemyReferencePokemonRecognition(reference, requestId) {
    const recognition = state.pokemonIconRecognition;
    if (recognition.requestId !== requestId || state.references.enemy !== reference) {
      return;
    }

    if (startPokemonIconWorkerRecognition(reference, requestId)) {
      appendPokemonIconDebugLogIfChanged(
        `worker-start:${requestId}:${reference.width}x${reference.height}`,
        [
          `[debug] icon worker: queued request=${requestId} ref=${reference.width}x${reference.height} prewarm=${state.pokemonIconWorkerState.prewarmStatus}`,
        ],
      );
      return;
    }

    recognition.engine = "compatibility";
    recognition.status = "loading";
    recognition.reason = "Worker互換処理";
    recognition.lastSummary = `compatibility request=${requestId} candidates=${state.pokemonIconReferenceEntries.length}`;
    void recognizeEnemyReferencePokemonSlots(reference, requestId);
  }

  function queueAfterNextPaint(callback) {
    if (typeof window.requestAnimationFrame !== "function") {
      window.setTimeout(callback, 0);
      return;
    }

    window.requestAnimationFrame(() => {
      window.setTimeout(callback, 0);
    });
  }


  async function recognizeEnemyReferencePokemonSlots(reference, requestId) {
    const isCancelled = () => state.references.enemy !== reference || state.pokemonIconRecognition.requestId !== requestId;
    try {
      const candidates = await ensurePokemonIconCandidatesLoaded();
      if (!candidates.length || isCancelled()) return;
      const matcher = await import(POKEMON_ICON_MATCHER_PATH);
      const payload = createPokemonIconWorkerSlotPayloads(reference);
      const slots = payload.slots.map((slot) => ({ width: slot.width, height: slot.height, data: new Uint8ClampedArray(slot.buffer) }));
      const result = await matcher.recognizePokemonIconParty(slots, candidates, {
        isCancelled, yieldControl: () => new Promise((resolve) => window.setTimeout(resolve, 0)),
      });
      if (isCancelled()) return;
      applyPokemonIconWorkerResult({ requestId, engine: "compatibility", result,
        visualCollisions: state.pokemonIconRecognition.visualCollisions,
        stats: { loadedCount: candidates.length, assetFingerprints: candidates.map((entry) => ({ id: entry.id, showdownId: entry.showdownId, path: entry.path, fingerprint: entry.normalizedFingerprint })) } });
    } catch (error) {
      if (isCancelled()) return;
      state.pokemonIconRecognition.status = "unavailable";
      state.pokemonIconRecognition.reason = error.message;
      appendTerminalDebug([`[debug] 名前推定を中断: ${error.message}`]);
    }
  }



  function yieldPokemonIconFallback() {
    return new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  async function refinePokemonIconCandidate(referenceSample, candidate, options = {}) {
    if (!candidate.image) {
      return candidate;
    }

    const isCancelled = options.isCancelled || (() => false);
    let best = null;
    let transformCount = 0;
    for (const scale of POKEMON_ICON_RECOGNITION_CONFIG.searchScales) {
      for (const offsetY of POKEMON_ICON_RECOGNITION_CONFIG.searchOffsets) {
        for (const offsetX of POKEMON_ICON_RECOGNITION_CONFIG.searchOffsets) {
          const sample = samplePokemonIconCandidateImage(candidate.image, { scale, offsetX, offsetY });
          if (!sample) {
            continue;
          }

          const scores = comparePokemonIconSamples(referenceSample, sample, { useColor: true });
          const refined = {
            ...candidate,
            ...scores,
            bestScale: scale,
            bestOffsetX: offsetX,
            bestOffsetY: offsetY,
          };
          if (!best || comparePokemonIconRecognitionResults(refined, best) < 0) {
            best = refined;
          }
          transformCount += 1;
          if (transformCount % 8 === 0) {
            await yieldPokemonIconFallback();
            if (isCancelled()) {
              return candidate;
            }
          }
        }
      }
    }
    return best || candidate;
  }

  function comparePokemonIconRecognitionResults(left, right) {
    const scoreDiff = right.score - left.score;
    if (Math.abs(scoreDiff) > POKEMON_ICON_RECOGNITION_CONFIG.sourceTieEpsilon) {
      return scoreDiff;
    }

    const leftPriority = getPokemonIconSourcePriority(left.source);
    const rightPriority = getPokemonIconSourcePriority(right.source);
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return left.id.localeCompare(right.id, "en");
  }

  function getPokemonIconSourcePriority(source) {
    return POKEMON_ICON_RECOGNITION_CONFIG.sourcePriority[source] ?? 99;
  }

  function formatPokemonIconScore(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(3) : "0.000";
  }

  function getPokemonIconTransformCount() {
    return POKEMON_ICON_RECOGNITION_CONFIG.searchScales.length
      * POKEMON_ICON_RECOGNITION_CONFIG.searchOffsets.length
      * POKEMON_ICON_RECOGNITION_CONFIG.searchOffsets.length;
  }

  function formatPokemonIconRecognitionSlotSummary(result) {
    if (!result) {
      return "rejected no_candidate";
    }

    const bestLabel = result.bestId || "unknown";
    const sourceLabel = result.bestSource || "unknown";
    if ("silhouette" in result || result.rejectionReason) {
      const pokemonLabel = result.pokemonName || result.bestPokemonName || "unresolved";
      const metrics = `score=${formatPokemonIconScore(result.bestScore ?? result.score)} silhouette=${formatPokemonIconScore(result.silhouette)} coverage=${formatPokemonIconScore(result.candidateCoverage ?? result.coverage)} input=${formatPokemonIconScore(result.inputCoverage)} spill=${formatPokemonIconScore(result.spill)} missing=${formatPokemonIconScore(result.missing)} gray=${formatPokemonIconScore(result.gray)} edge=${formatPokemonIconScore(result.edge)} color=${formatPokemonIconScore(result.color)} margin=${formatPokemonIconScore(result.localMargin ?? result.margin)} assignment=${formatPokemonIconScore(result.assignmentMargin)} globalAssignment=${formatPokemonIconScore(result.globalAssignmentMargin)} sourceAgree=${formatPokemonIconScore(result.sourceAgreement)} support=${result.supportingTemplateCount || 0} route=${result.confidenceRoute || "none"} foreground=${result.foregroundVariant || "primary"} fallback=${result.fallbackStage || "none"}`;
      const globalTransform = result.globalTransform || {};
      const localCorrection = result.localCorrection || {};
      const transform = `global=${formatPokemonIconScore(globalTransform.scale || 1)}@${Math.round(globalTransform.offsetX || 0)},${Math.round(globalTransform.offsetY || 0)} local=${formatPokemonIconScore(localCorrection.scaleDelta || 0)}@${Math.round(localCorrection.offsetX || 0)},${Math.round(localCorrection.offsetY || 0)}`;
      if (result.matched) {
        return `accepted ${pokemonLabel} best=${bestLabel} source=${sourceLabel} ${metrics} ${transform}`;
      }
      return `rejected reason=${result.rejectionReason || "unresolved"} bestName=${pokemonLabel} best=${bestLabel} source=${sourceLabel} ${metrics} ${transform}`;
    }
    const metrics = `score=${formatPokemonIconScore(result.bestScore)} shape=${formatPokemonIconScore(result.bestShapeScore)} color=${formatPokemonIconScore(result.bestColorScore)} margin=${formatPokemonIconScore(result.margin)} second=${formatPokemonIconScore(result.secondBestScore)}`;
    const transform = `scale=${formatPokemonIconScore(result.bestScale || 1)} offset=${Math.round(result.bestOffsetX || 0)},${Math.round(result.bestOffsetY || 0)}`;
    if (result.matched) {
      return `accepted ${result.pokemonName} best=${bestLabel} source=${sourceLabel} ${metrics} ${transform}`;
    }

    return `rejected best=${bestLabel} source=${sourceLabel} ${metrics} ${transform} need score>=${formatPokemonIconScore(POKEMON_ICON_RECOGNITION_CONFIG.scoreMin)} margin>=${formatPokemonIconScore(POKEMON_ICON_RECOGNITION_CONFIG.marginMin)}`;
  }

  function resetPokemonIconRecognitionState(reason = "") {
    cancelPokemonIconWorkerRequest(state.pokemonIconRecognition?.requestId);
    state.pokemonIconRecognition = createPokemonIconRecognitionState(reason);
  }

  function resetPokemonIconResultNotifications() {
    if (!state.pokemonIconRecognition?.notifiedByRefIndex) {
      return;
    }
    state.pokemonIconRecognition.notifiedByRefIndex = PICK_OVERLAY_CONFIG.referenceRois.map(() => false);
  }

  function resetPokemonIconResultNotificationForRefIndex(refIndex) {
    if (!state.pokemonIconRecognition?.notifiedByRefIndex || refIndex < 0) {
      return;
    }
    state.pokemonIconRecognition.notifiedByRefIndex[refIndex] = false;
  }

  function flushPickOverlayPokemonResults() {
    const current = state.pokemonIconRecognition;
    state.autoSnap.pickOverlay.ordersByRefIndex.forEach((order, refIndex) => {
      if (!order) return;
      const result = current.resultsByRefIndex[refIndex];
      if (!state.catalogReady) recordPickDisplayDiagnostic(refIndex, "data_wait", current);
      else if (!result) recordPickDisplayDiagnostic(refIndex, "recognition_wait", current);
      else if (!result.matched) recordPickDisplayDiagnostic(refIndex, "name_unresolved", current);
    });
    syncStatisticsSelection();
  }

  function prefetchRecognizedStatistics() {
    const recognition = state.pokemonIconRecognition;
    const captureId = state.matchLog.references.enemy?.captureId;
    const rule = state.statsSettings?.rule;
    const key = `${captureId}:${recognition.requestId}:${rule}`;
    if (!captureId || !rule || !state.remoteIndex || recognition.status !== "ready" || state.statsPrefetchKey === key) return;
    if (recognition.reference !== state.references.enemy) return;
    state.statsPrefetchKey = key;
    state.statistics?.prefetch(recognition.resultsByRefIndex.filter((result) => result?.matched && result.showdownId).map((result) => result.showdownId));
  }

  function updatePickOverlayAssignments(tentativeMatches) {
    const pickOverlay = state.autoSnap.pickOverlay;
    const tentativeByHudIndex = new Map(tentativeMatches.map((match) => [match.hudIndex, match]));
    let didAssignOrder = false;
    const acceptedAssignments = new Map();
    const readyAssignments = [];

    PICK_OVERLAY_CONFIG.hudRois.forEach((_, hudIndex) => {
      const tentative = tentativeByHudIndex.get(hudIndex);
      if (!tentative) {
        pickOverlay.pendingMatchesByHudIndex[hudIndex] = null;
        return;
      }

      if (pickOverlay.ordersByRefIndex[tentative.refIndex]) {
        pickOverlay.pendingMatchesByHudIndex[hudIndex] = null;
        return;
      }

      const pending = pickOverlay.pendingMatchesByHudIndex[hudIndex];
      if (pending?.refIndex === tentative.refIndex) {
        pickOverlay.pendingMatchesByHudIndex[hudIndex] = {
          ...pending,
          refIndex: tentative.refIndex,
          tier: getStrongerPickOverlayTier(pending.tier, tentative.tier),
          streak: pending.streak + 1,
          bestScore: tentative.bestScore,
          margin: tentative.margin,
          secondBestScore: tentative.secondBestScore,
          offsetX: tentative.offsetX,
          offsetY: tentative.offsetY,
        };
      } else {
        pickOverlay.pendingSequence += 1;
        pickOverlay.pendingMatchesByHudIndex[hudIndex] = {
          refIndex: tentative.refIndex,
          tier: tentative.tier,
          streak: 1,
          firstSeenAt: Date.now(),
          firstSeenSequence: pickOverlay.pendingSequence,
          bestScore: tentative.bestScore,
          margin: tentative.margin,
          secondBestScore: tentative.secondBestScore,
          offsetX: tentative.offsetX,
          offsetY: tentative.offsetY,
        };
      }

      const nextPending = pickOverlay.pendingMatchesByHudIndex[hudIndex];
      if (nextPending.streak >= getPickOverlayRequiredStreak(nextPending.tier)) {
        readyAssignments.push({
          hudIndex,
          refIndex: nextPending.refIndex,
          tier: nextPending.tier,
          firstSeenSequence: nextPending.firstSeenSequence,
        });
      }
    });

    readyAssignments
      .sort((left, right) => {
        if (left.firstSeenSequence !== right.firstSeenSequence) {
          return left.firstSeenSequence - right.firstSeenSequence;
        }
        return left.hudIndex - right.hudIndex;
      })
      .forEach((assignment) => {
        if (pickOverlay.ordersByRefIndex[assignment.refIndex]) {
          pickOverlay.pendingMatchesByHudIndex[assignment.hudIndex] = null;
          return;
        }

        const assignedOrder = assignPickOverlayOrder(assignment.refIndex);
        if (assignedOrder) {
          triggerPickOverlayFlashFrame(assignment.refIndex);
          acceptedAssignments.set(assignment.hudIndex, {
            order: assignedOrder,
            tier: assignment.tier,
          });
          recordPickDiagnosticEvent("accepted", { hudIndex: assignment.hudIndex, refIndex: assignment.refIndex,
            order: assignedOrder, tier: assignment.tier,
            streak: pickOverlay.pendingMatchesByHudIndex[assignment.hudIndex]?.streak ?? null,
            requiredStreak: getPickOverlayRequiredStreak(assignment.tier) });
          didAssignOrder = true;
          flushPickOverlayPokemonResults();
        }
        pickOverlay.pendingMatchesByHudIndex[assignment.hudIndex] = null;
      });

    if (didAssignOrder && state.references.enemy && state.mode !== "edit") {
      drawCropPanel("enemy");
    }

    return acceptedAssignments;
  }

  function assignPickOverlayOrder(refIndex) {
    const pickOverlay = state.autoSnap.pickOverlay;
    if (pickOverlay.ordersByRefIndex[refIndex] || pickOverlay.nextOrder > PICK_OVERLAY_CONFIG.maxOrders) {
      return 0;
    }

    pickOverlay.ordersByRefIndex[refIndex] = pickOverlay.nextOrder;
    pickOverlay.nextOrder += 1;
    return pickOverlay.ordersByRefIndex[refIndex];
  }

  function clearPickOverlayPendingMatches() {
    state.autoSnap.pickOverlay.pendingMatchesByHudIndex = PICK_OVERLAY_CONFIG.hudRois.map(() => null);
  }

  function triggerPickOverlayFlashFrame(refIndex) {
    const pickOverlay = state.autoSnap.pickOverlay;
    if (!pickOverlay.flashFramesByRefIndex || !PICK_OVERLAY_CONFIG.badgeSlotPositions[refIndex]) {
      return;
    }

    pickOverlay.flashFramesByRefIndex[refIndex] = {
      startedAt: Date.now(),
    };
    if (state.references.enemy && state.mode !== "edit") {
      drawCropPanel("enemy");
      schedulePickOverlayEffectFrame();
    }
  }

  function triggerPickOverlayCorrectionFrame(refIndex) {
    const pickOverlay = state.autoSnap.pickOverlay;
    if (!pickOverlay.correctionFramesByRefIndex || !PICK_OVERLAY_CONFIG.badgeSlotPositions[refIndex]) {
      return;
    }

    pickOverlay.correctionFramesByRefIndex[refIndex] = {
      startedAt: Date.now(),
    };
    if (state.references.enemy && state.mode !== "edit") {
      drawCropPanel("enemy");
      schedulePickOverlayEffectFrame();
    }
  }

  function schedulePickOverlayEffectFrame() {
    if (state.pickOverlayEffectFrameId || !state.references.enemy || state.mode === "edit") {
      return;
    }

    state.pickOverlayEffectFrameId = window.requestAnimationFrame(() => {
      state.pickOverlayEffectFrameId = 0;
      const hasActiveFrame = state.autoSnap.pickOverlay.flashFramesByRefIndex?.some(Boolean);
      const hasActiveCorrectionFrame = state.autoSnap.pickOverlay.correctionFramesByRefIndex?.some(Boolean);
      if ((hasActiveFrame || hasActiveCorrectionFrame) && state.references.enemy && state.mode !== "edit") {
        drawCropPanel("enemy");
      }
    });
  }

  function keepPickOverlayPendingThroughGate(now) {
    const pickOverlay = state.autoSnap.pickOverlay;
    const hasPending = pickOverlay.pendingMatchesByHudIndex.some(Boolean);
    if (hasPending && now - pickOverlay.lastCompareAt <= PICK_OVERLAY_CONFIG.gateGraceMs) {
      return true;
    }

    clearPickOverlayPendingMatches();
    return false;
  }

  function getPickStatusLines() {
    const pickOverlay = state.autoSnap.pickOverlay;
    const lines = [
      `[system] pick: ${getPickAssignmentStatusSummary()}`,
      `[system] pick pending: ${getPickPendingStatusSummary()}`,
      `[system] faint: ${getFaintStatusSummary()}`,
    ];

    pickOverlay.lastHudSummaries.forEach((summary, hudIndex) => {
      lines.push(`[system] pick live HUD${hudIndex + 1}: ${summary || "未評価"}`);
    });

    return lines;
  }

  function getPickAssignmentStatusSummary() {
    const entries = state.autoSnap.pickOverlay.ordersByRefIndex
      .map((order, refIndex) => (order ? `${getPickSlotLabel(refIndex)}=${getPickOverlayOrderLabel(order)}` : ""))
      .filter(Boolean);
    return entries.length ? entries.join(", ") : "なし";
  }

  function getPickPendingStatusSummary() {
    const entries = state.autoSnap.pickOverlay.pendingMatchesByHudIndex
      .map((pending, hudIndex) => (pending
        ? `HUD${hudIndex + 1}->${getPickSlotLabel(pending.refIndex)}(${pending.tier} ${pending.streak}/${getPickOverlayRequiredStreak(pending.tier)})`
        : ""))
      .filter(Boolean);
    return entries.length ? entries.join(", ") : "なし";
  }

  function buildPickOverlaySummary() {
    const pickOverlay = state.autoSnap.pickOverlay;
    const confirmedEntries = pickOverlay.ordersByRefIndex
      .map((order, refIndex) => (order ? `slot${refIndex + 1}=${getPickOverlayOrderLabel(order)}` : ""))
      .filter(Boolean);
    const pendingEntries = pickOverlay.pendingMatchesByHudIndex
      .map((pending, hudIndex) => (pending
        ? `HUD${hudIndex + 1}->slot${pending.refIndex + 1}(${pending.tier} ${pending.streak}/${getPickOverlayRequiredStreak(pending.tier)})`
        : ""))
      .filter(Boolean);

    if (!confirmedEntries.length && !pendingEntries.length) {
      return "確定なし";
    }

    if (!confirmedEntries.length) {
      return `pending ${pendingEntries.join(", ")}`;
    }

    if (!pendingEntries.length) {
      return confirmedEntries.join(", ");
    }

    return `${confirmedEntries.join(", ")} / pending ${pendingEntries.join(", ")}`;
  }

  function getFaintStatusSummary() {
    const faintedEntries = state.autoSnap.pickOverlay.faintedByRefIndex
      .map((fainted, refIndex) => (fainted ? getFaintSlotLabel(refIndex) : ""))
      .filter(Boolean);
    return faintedEntries.length ? faintedEntries.join(", ") : "なし";
  }

  function getFaintSlotLabel(refIndex) {
    return `${refIndex + 1}枠目`;
  }

  function getPickSlotLabel(refIndex) {
    return `slot${refIndex + 1}`;
  }

  function getFaintStatusLines() {
    return [
      `[system] faint: ${getFaintStatusSummary()}`,
      "[system] 瀕死表示は auto on + ready + 相手参照画像ありのときに監視します。",
      "[system] 解除する場合は faint reset を使います。",
    ];
  }

  function getPickOverlayDebugLines() {
    const pickOverlay = state.autoSnap.pickOverlay;
    const nextLabel = pickOverlay.nextOrder > PICK_OVERLAY_CONFIG.maxOrders ? "done" : String(pickOverlay.nextOrder);
    const lines = [
      `[debug] pick state: gate=${pickOverlay.lastGateActive ? "active" : "idle"} next=${nextLabel}`,
      `[debug] pick state refs: ${pickOverlay.lastSummary || "確定なし"}`,
      `[debug] faint state refs: ${getFaintStatusSummary()}`,
    ];
    if (pickOverlay.lastGateReason) {
      lines.push(`[debug] pick state gate: ${pickOverlay.lastGateReason}`);
    }
    pickOverlay.lastHudSummaries.forEach((summary, hudIndex) => {
      lines.push(`[debug] pick compare HUD${hudIndex + 1}: ${summary}`);
    });
    pickOverlay.lastFaintSummaries.forEach((summary, hudIndex) => {
      lines.push(`[debug] faint compare HUD${hudIndex + 1}: ${summary}`);
    });
    return lines;
  }

  function getBattleResultDebugLines() {
    const detection = state.battleResultDetection;
    const template = state.battleResultTemplate;
    const leftSignal = detection.lastSignals.left;
    const rightSignal = detection.lastSignals.right;
    return [
      `[debug] result: template=${template.status} active=${template.activeCount || 0}/${Math.max((template.width || 0) * (template.height || 0), 0)} armed=${detection.armed ? "yes" : "no"} battleHud=${detection.battleHudFrames}/${BATTLE_RESULT_CONFIG.requiredBattleHudFrames} result=${detection.result || "none"}`,
      `[debug] result left: coverage=${formatAutoMetric(leftSignal.coverageScore)} spill=${formatAutoMetric(leftSignal.spillScore)} offset=${leftSignal.offsetX},${leftSignal.offsetY} streak=${detection.leftStreak}/${BATTLE_RESULT_CONFIG.requiredMatchStreak}`,
      `[debug] result right: coverage=${formatAutoMetric(rightSignal.coverageScore)} spill=${formatAutoMetric(rightSignal.spillScore)} offset=${rightSignal.offsetX},${rightSignal.offsetY} streak=${detection.rightStreak}/${BATTLE_RESULT_CONFIG.requiredMatchStreak}`,
      `[debug] result summary: ${detection.lastSummary}`,
    ];
  }

  function getPokemonIconRecognitionDebugLines() {
    const recognition = state.pokemonIconRecognition;
    const manifestStats = state.pokemonIconManifest?.stats || {};
    const workerState = state.pokemonIconWorkerState;
    const workerStats = workerState.stats || {};
    const manifestState = state.pokemonIconReferenceLoadFailed
      ? "failed"
      : state.pokemonIconReferenceReady
        ? "ready"
        : "loading";
    const candidateState = state.pokemonIconCandidatesLoadFailed
      ? "failed"
      : state.pokemonIconCandidatesPromise
        ? "loading"
        : state.pokemonIconCandidates.length
          ? "ready"
          : "idle";
    const lines = [
      `[debug] icon recog: status=${recognition.status} engine=${recognition.engine || "pending"} manifest=${manifestState} entries=${state.pokemonIconReferenceEntries.length} compatibilityCandidates=${candidateState}:${state.pokemonIconCandidates.length}`,
      `[debug] icon recog summary: ${recognition.lastSummary || recognition.reason || "未評価"}`,
      `[debug] icon manifest: raw=${manifestStats.rawCandidateCount || 0} canonical=${manifestStats.canonicalCandidateCount || state.pokemonIconReferenceEntries.length} buildMerged=${manifestStats.mergedDuplicateCount || 0} names=${manifestStats.uniquePokemonNameCount || 0} species=${manifestStats.uniqueSpeciesKeyCount || 0}`,
      `[debug] icon sources: champions=${manifestStats.sourceCounts?.raw?.champions || 0} sv=${manifestStats.sourceCounts?.raw?.sv || 0} supplemental=${manifestStats.sourceCounts?.raw?.supplemental || 0} svOnlyNames=${manifestStats.svOnlyPokemonNameCount || 0} buildCollisions=${manifestStats.visualCollisionGroupCount || 0} invalid=${manifestStats.invalidCount || 0}`,
      `[debug] icon classification: eligible=${manifestStats.recognitionCandidateCount || state.pokemonIconReferenceEntries.length} championsSource=${manifestStats.championsSourceIconCount || manifestStats.championsCandidateCount || 0} fallback=${manifestStats.classificationFallbackCount || 0} unresolved=${manifestStats.classificationUnresolvedCount || 0} revision=${state.pokemonIconManifest?.classification?.revision?.slice(0, 12) || "unknown"}`,
      `[debug] icon worker: status=${workerState.status} prewarm=${workerState.prewarmStatus} loaded=${workerStats.loadedCount || 0}/${workerStats.canonicalManifestCount || manifestStats.canonicalCandidateCount || 0} runtimeMerged=${workerStats.runtimeNormalizedDuplicateCount || 0} collisions=${workerStats.runtimeVisualCollisionGroupCount || 0} failures=${workerStats.loadFailureCount || workerState.failures.length}`,
      `[debug] icon manifest perf: fetch+parse=${formatPerformanceMs(state.pokemonIconManifestFetchMs)}`,
    ];

    if (recognition.reason) {
      lines.push(`[debug] icon recog reason: ${recognition.reason}`);
    }
    if (workerState.reason) {
      lines.push(`[debug] icon worker reason: ${workerState.reason}`);
    }
    if (workerStats.timings) {
      lines.push(
        `[debug] icon prewarm perf: fetch=${formatPerformanceMs(workerStats.timings.candidateFetchMs)} decode=${formatPerformanceMs(workerStats.timings.candidateDecodeMs)} preprocess=${formatPerformanceMs(workerStats.timings.candidatePreprocessMs)} dedupe=${formatPerformanceMs(workerStats.timings.dedupeMs)} total=${formatPerformanceMs(workerStats.timings.prewarmTotalMs)}`,
      );
    }
    if (recognition.lastDiagnostics?.timings) {
      const timings = recognition.lastDiagnostics.timings;
      const fallback = recognition.lastDiagnostics.rejectFallback || {};
      lines.push(
        `[debug] icon worker perf: foreground=${formatPerformanceMs(timings.foregroundMs)} coarse=${formatPerformanceMs(timings.coarseMs)} global=${formatPerformanceMs(timings.globalTransformMs)} refine=${formatPerformanceMs(timings.refineMs)} assignment=${formatPerformanceMs(timings.assignmentMs)} fallback=${fallback.attemptedSlotCount || 0}/${fallback.softForegroundAttemptedSlotCount || 0}/${fallback.usedSlotCount || 0} fallbackPerf=${formatPerformanceMs(timings.fallbackForegroundMs)}/${formatPerformanceMs(timings.fallbackCoarseMs)}/${formatPerformanceMs(timings.fallbackRefineMs)} total=${formatPerformanceMs(timings.totalMs)} mainRT=${formatPerformanceMs(recognition.workerTiming?.totalWorkerMs)}`,
      );
    }
    if (workerState.failures.length) {
      const reasonCounts = workerState.failures.reduce((counts, failure) => {
        const reason = failure.reason || "unknown_error";
        counts[reason] = (counts[reason] || 0) + 1;
        return counts;
      }, {});
      lines.push(
        `[debug] icon failures: ${Object.entries(reasonCounts).map(([reason, count]) => `${reason}=${count}`).join(" ")}`,
      );
    }

    recognition.lastSlotSummaries.forEach((summary, refIndex) => {
      lines.push(`[debug] icon recog ${getPickSlotLabel(refIndex)}: ${summary || "未評価"}`);
    });
    return lines;
  }

  function getPerformanceDebugLines() {
    const slotDurations = state.performanceDebug.lastPokemonIconSlotDurations || [];
    const lines = [
      `[debug] perf auto metrics: ${formatPerformanceDebugMetric("captureAutoSnapMetrics")}`,
      `[debug] perf pick detect: ${formatPerformanceDebugMetric("updatePickOverlayDetection")}`,
      `[debug] perf result detect: ${formatPerformanceDebugMetric("battleResultDetection")}`,
      `[debug] perf snap: ${formatPerformanceDebugMetric("performSnapCapture")}`,
      `[debug] perf icon load: ${formatPerformanceDebugMetric("pokemonIconCandidateLoad")}`,
      `[debug] perf icon recog: ${formatPerformanceDebugMetric("pokemonIconRecognition")}`,
    ];

    if (slotDurations.length) {
      const maxSlotDuration = Math.max(...slotDurations.filter((duration) => Number.isFinite(duration)), 0);
      const slotDetails = slotDurations
        .map((duration, refIndex) => `${getPickSlotLabel(refIndex)}=${formatPerformanceMs(duration)}`)
        .join(" ");
      lines.push(`[debug] perf icon slots: ${slotDetails} max=${formatPerformanceMs(maxSlotDuration)}`);
    } else {
      lines.push("[debug] perf icon slots: 未計測");
    }

    return lines;
  }

  function formatPerformanceDebugMetric(key) {
    const metric = state.performanceDebug.metrics[key];
    if (!metric) {
      return "未計測";
    }

    const details = metric.details ? ` ${metric.details}` : "";
    return `${formatPerformanceMs(metric.durationMs)} max=${formatPerformanceMs(metric.maxMs)} count=${metric.count}${details}`;
  }

  function updatePickOverlayDebugState(bestByHudIndex, tentativeMatches, acceptedAssignments, hudGateStates = [], matchMode = "battle") {
    const pickOverlay = state.autoSnap.pickOverlay;
    const tentativeByHudIndex = new Map(tentativeMatches.map((match) => [match.hudIndex, match]));
    const summaryKeyParts = [];
    const minimumScore = matchMode === "hud-only"
      ? PICK_OVERLAY_CONFIG.thresholds.hudOnlyScoreMin
      : PICK_OVERLAY_CONFIG.thresholds.scoreWeakMin;
    const minimumMargin = matchMode === "hud-only"
      ? PICK_OVERLAY_CONFIG.thresholds.hudOnlyMarginMin
      : PICK_OVERLAY_CONFIG.thresholds.marginWeakMin;
    const routeLabel = matchMode === "hud-only" ? " hud-only" : "";

    bestByHudIndex.forEach((best, hudIndex) => {
      const gateState = hudGateStates[hudIndex];
      if (gateState && !gateState.ready) {
        pickOverlay.lastHudSummaries[hudIndex] = gateState.summary;
        summaryKeyParts.push(`hud${hudIndex + 1}:gate:${gateState.key}`);
        return;
      }

      const bestSlotLabel = best.refIndex >= 0 ? `slot${best.refIndex + 1}` : "none";
      const margin = best.margin || 0;
      const matchTier = best.tier || getPickOverlayMatchTier(best.bestScore, margin, matchMode);
      const assignedOrder = pickOverlay.ordersByRefIndex[best.refIndex] || 0;
      const acceptedAssignment = acceptedAssignments.get(hudIndex);
      const pending = pickOverlay.pendingMatchesByHudIndex[hudIndex];
      let status = "contested";

      if (best.refIndex < 0) {
        status = "no_candidate";
      } else if (!matchTier && best.bestScore < minimumScore) {
        status = "low_score";
      } else if (!matchTier && margin < minimumMargin) {
        status = "low_margin";
      } else if (!matchTier) {
        status = "low_score_weak_margin";
      } else if (acceptedAssignment) {
        status = "accepted";
      } else if (assignedOrder) {
        status = "already_assigned";
      } else if (pending) {
        status = "pending";
      } else if (!tentativeByHudIndex.has(hudIndex)) {
        status = "contested";
      }

      const statusDetail = status === "accepted"
        ? `accepted ${acceptedAssignment.tier} ${bestSlotLabel}=${getPickOverlayOrderLabel(acceptedAssignment.order)}`
        : status === "already_assigned"
          ? `fixed ${bestSlotLabel}=${getPickOverlayOrderLabel(assignedOrder)}`
          : status === "pending"
            ? `pending ${pending.tier} ${bestSlotLabel} streak=${pending.streak}/${getPickOverlayRequiredStreak(pending.tier)}`
            : status === "low_score"
              ? `rejected${routeLabel} ${bestSlotLabel} score<${minimumScore}`
            : status === "low_margin"
                ? `rejected${routeLabel} ${bestSlotLabel} margin<${minimumMargin}`
                : status === "low_score_weak_margin"
                  ? `rejected${routeLabel} ${bestSlotLabel} need score>=${minimumScore} margin>=${minimumMargin}`
                : status === "contested"
                  ? `rejected${routeLabel} ${bestSlotLabel} contested`
                  : "rejected no candidate";
      const summary = `${statusDetail} score=${formatAutoMetric(best.bestScore)} margin=${formatAutoMetric(margin)} second=${formatAutoMetric(best.secondBestScore)} color=${formatAutoMetric(best.colorScore)} offset=${formatPickOverlayOffset(best)}`;
      pickOverlay.lastHudSummaries[hudIndex] = summary;
      summaryKeyParts.push(`hud${hudIndex + 1}:${matchMode}:${status}:${best.refIndex}:${matchTier || "none"}:${pending?.streak || 0}:${assignedOrder || 0}:${best.offsetX || 0}:${best.offsetY || 0}:${Math.round((best.colorScore || 0) * 100)}`);
    });

    appendPickOverlayDebugLogIfChanged(
      summaryKeyParts.join("|"),
      bestByHudIndex.map((_, hudIndex) => `[debug] pick compare HUD${hudIndex + 1}: ${pickOverlay.lastHudSummaries[hudIndex]}`),
    );
  }

  function updateFaintDetection(bestByHudIndex = [], hudGateStates = [], now = Date.now()) {
    const pickOverlay = state.autoSnap.pickOverlay;
    if (now - pickOverlay.lastFaintCompareAt < FAINT_DETECTION_CONFIG.compareIntervalMs) {
      return;
    }

    pickOverlay.lastFaintCompareAt = now;
    const diagnosticComparison = beginFaintDiagnosticComparison(now);
    const summaryKeyParts = [];
    const debugLines = [];
    let didMarkFainted = false;

    FAINT_DETECTION_CONFIG.hudRois.forEach((_, hudIndex) => {
      const best = bestByHudIndex[hudIndex] || {};
      const gateState = hudGateStates[hudIndex];
      const observation = beginFaintDiagnosticHud(diagnosticComparison, hudIndex, best, gateState);
      const resolvedRef = resolveFaintHudRefIndex(hudIndex, best, gateState, now);
      const refIndex = resolvedRef.refIndex;
      const signal = getFaintHudSignal(hudIndex, observation?.read);
      if (observation) {
        observation.resolved = { ...resolvedRef };
        observation.signal = signal;
      }

      if (refIndex < 0) {
        const keptPending = keepFaintPendingThroughGap(hudIndex, now);
        const gateLabel = gateState && !gateState.ready ? `gate wait ${gateState.key}` : "slot未確定";
        const summary = keptPending
          ? `${gateLabel} / pending保持 slot${keptPending.refIndex + 1} ${keptPending.streak}/${keptPending.requiredStreak}`
          : gateLabel;
        pickOverlay.lastFaintSummaries[hudIndex] = summary;
        summaryKeyParts.push(`hud${hudIndex + 1}:missing:${keptPending?.refIndex ?? -1}:${keptPending?.streak ?? 0}:${gateState?.key || "slot"}`);
        debugLines.push(`[debug] faint HUD${hudIndex + 1}: ${summary}`);
        recordFaintDiagnosticOutcome(observation, "missing_slot");
        return;
      }

      const slotLabel = `slot${refIndex + 1}`;
      if (!signal) {
        const keptPending = keepFaintPendingThroughGap(hudIndex, now);
        const summary = keptPending
          ? `${slotLabel} ROI読み取り失敗 / pending保持 ${keptPending.streak}/${keptPending.requiredStreak}`
          : `${slotLabel} ROI読み取り失敗`;
        pickOverlay.lastFaintSummaries[hudIndex] = summary;
        summaryKeyParts.push(`hud${hudIndex + 1}:read-failed:${refIndex}:${keptPending?.streak ?? 0}`);
        debugLines.push(`[debug] faint HUD${hudIndex + 1}: ${summary}`);
        recordFaintDiagnosticOutcome(observation, "roi_read_failed");
        return;
      }

      if (pickOverlay.faintedByRefIndex[refIndex]) {
        pickOverlay.pendingFaintsByHudIndex[hudIndex] = null;
        const summary = `${slotLabel} 確定済み ${signal.summary}`;
        pickOverlay.lastFaintSummaries[hudIndex] = summary;
        summaryKeyParts.push(`hud${hudIndex + 1}:already:${refIndex}:${signal.key}`);
        debugLines.push(`[debug] faint HUD${hudIndex + 1}: ${summary}`);
        recordFaintDiagnosticOutcome(observation, "already_fainted");
        return;
      }

      if (!signal.matched) {
        const keptPending = keepFaintPendingThroughGap(hudIndex, now);
        const summary = keptPending
          ? `${slotLabel} watch / pending保持 ${keptPending.streak}/${keptPending.requiredStreak} ${signal.summary}`
          : `${slotLabel} watch ${signal.summary}`;
        pickOverlay.lastFaintSummaries[hudIndex] = summary;
        summaryKeyParts.push(`hud${hudIndex + 1}:watch:${refIndex}:${signal.key}:${keptPending?.streak ?? 0}:${resolvedRef.source}`);
        debugLines.push(`[debug] faint HUD${hudIndex + 1}: ${summary}`);
        recordFaintDiagnosticOutcome(observation, "not_matched");
        return;
      }

      const pending = pickOverlay.pendingFaintsByHudIndex[hudIndex];
      const requiredStreak = getFaintRequiredStreak(signal, resolvedRef);
      const nextPending = pending?.refIndex === refIndex
        ? {
            ...pending,
            streak: pending.streak + 1,
            requiredStreak: Math.min(pending.requiredStreak || requiredStreak, requiredStreak),
            lastSeenAt: now,
            signalSummary: signal.summary,
          }
        : {
            refIndex,
            streak: 1,
            requiredStreak,
            firstSeenAt: now,
            lastSeenAt: now,
            signalSummary: signal.summary,
          };
      pickOverlay.pendingFaintsByHudIndex[hudIndex] = nextPending;
      if (observation) observation.decision = { streak: nextPending.streak, requiredStreak: nextPending.requiredStreak };

      if (nextPending.streak >= nextPending.requiredStreak) {
        pickOverlay.faintedByRefIndex[refIndex] = true;
        pickOverlay.pendingFaintsByHudIndex[hudIndex] = null;
        didMarkFainted = true;
        const summary = `${slotLabel} accepted ${signal.summary}`;
        pickOverlay.lastFaintSummaries[hudIndex] = summary;
        summaryKeyParts.push(`hud${hudIndex + 1}:accepted:${refIndex}:${signal.key}`);
        debugLines.push(`[debug] faint HUD${hudIndex + 1}: ${summary}`);
        recordFaintDiagnosticOutcome(observation, "accepted");
        appendTerminalEntry(
          [
            `[auto] 相手 ${getFaintSlotLabel(refIndex)} を瀕死表示にしました。`,
          ],
          "system",
        );
        return;
      }

      const summary = `${slotLabel} pending ${nextPending.streak}/${nextPending.requiredStreak} ${signal.summary}`;
      pickOverlay.lastFaintSummaries[hudIndex] = summary;
      summaryKeyParts.push(`hud${hudIndex + 1}:pending:${refIndex}:${nextPending.streak}:${nextPending.requiredStreak}:${signal.key}:${resolvedRef.source}`);
      debugLines.push(`[debug] faint HUD${hudIndex + 1}: ${summary}`);
      recordFaintDiagnosticOutcome(observation, "pending");
    });

    finishFaintDiagnosticComparison(diagnosticComparison);
    appendFaintDebugLogIfChanged(summaryKeyParts.join("|"), debugLines);

    if (didMarkFainted && state.references.enemy && state.mode !== "edit") {
      drawCropPanel("enemy");
    }
  }

  function resolveFaintHudRefIndex(hudIndex, best = {}, gateState = null, now = Date.now()) {
    const refIndex = Number.isInteger(best.refIndex) ? best.refIndex : -1;
    const matchTier = best.tier || getPickOverlayMatchTier(best.bestScore || 0, best.margin || 0);
    const cached = getFreshFaintHudSlotCache(hudIndex, now);
    if (refIndex >= 0 && matchTier && (!gateState || gateState.ready)) {
      const keepCachedSlot = cached
        && cached.refIndex !== refIndex
        && matchTier !== "strong"
        && !state.autoSnap.pickOverlay.faintedByRefIndex?.[cached.refIndex];
      if (keepCachedSlot) {
        return { refIndex: cached.refIndex, source: "cache-live-weak", tier: cached.tier || "" };
      }
      rememberFaintHudSlot(hudIndex, refIndex, matchTier, now);
      return { refIndex, source: "live", tier: matchTier };
    }

    if (cached) {
      return { refIndex: cached.refIndex, source: "cache", tier: cached.tier || "" };
    }

    const pending = state.autoSnap.pickOverlay.pendingFaintsByHudIndex[hudIndex];
    if (pending && now - pending.lastSeenAt <= FAINT_DETECTION_CONFIG.pendingGraceMs) {
      return { refIndex: pending.refIndex, source: "pending", tier: "" };
    }

    return { refIndex: -1, source: "missing", tier: "" };
  }

  function rememberFaintHudSlot(hudIndex, refIndex, tier, now = Date.now()) {
    state.autoSnap.pickOverlay.faintSlotCacheByHudIndex[hudIndex] = {
      refIndex,
      tier,
      lastSeenAt: now,
    };
  }

  function getFreshFaintHudSlotCache(hudIndex, now = Date.now()) {
    const cached = state.autoSnap.pickOverlay.faintSlotCacheByHudIndex[hudIndex];
    if (!cached) {
      return null;
    }

    if (FAINT_DETECTION_CONFIG.slotCacheTtlMs > 0 && now - cached.lastSeenAt > FAINT_DETECTION_CONFIG.slotCacheTtlMs) {
      return null;
    }

    return cached;
  }

  function keepFaintPendingThroughGap(hudIndex, now = Date.now()) {
    const pending = state.autoSnap.pickOverlay.pendingFaintsByHudIndex[hudIndex];
    if (pending && now - pending.lastSeenAt <= FAINT_DETECTION_CONFIG.pendingGraceMs) {
      return pending;
    }

    state.autoSnap.pickOverlay.pendingFaintsByHudIndex[hudIndex] = null;
    return null;
  }

  function getFaintHudSignal(hudIndex, diagnosticRead = null) {
    const iconCrop = getFaintHudRoiCrop(hudIndex, "faintIcon");
    const colorCrop = getFaintHudRoiCrop(hudIndex, "hudColor");
    const percentCrop = getFaintHudRoiCrop(hudIndex, "percent");
    if (diagnosticRead) diagnosticRead.crops = { icon: iconCrop, color: colorCrop, percent: percentCrop };
    if (!iconCrop || !colorCrop || !percentCrop) {
      return null;
    }

    const icon = sampleFaintHudRoi(elements.video, iconCrop);
    const color = sampleFaintHudRoi(elements.video, colorCrop);
    const percent = sampleFaintHudRoi(elements.video, percentCrop);
    if (diagnosticRead) diagnosticRead.samples = { icon, color, percent };
    if (!icon || !color || !percent) {
      return null;
    }

    const thresholds = FAINT_DETECTION_CONFIG.thresholds;
    const iconMatched = icon.pink <= thresholds.iconPinkMax
      && icon.red >= thresholds.iconRedMin
      && icon.white >= thresholds.iconWhiteMin;
    const colorMatched = color.red <= thresholds.hudRedMax
      && color.dark >= thresholds.hudDarkMin
      && color.meanPeak <= thresholds.hudMeanPeakMax;
    const percentVisible = percent.white >= thresholds.percentWhiteMin;
    const matched = iconMatched && colorMatched && percentVisible;
    const strongThresholds = FAINT_DETECTION_CONFIG.strongThresholds;
    const strong = matched
      && icon.pink <= strongThresholds.iconPinkMax
      && icon.white >= strongThresholds.iconWhiteMin
      && color.red <= strongThresholds.hudRedMax
      && color.dark >= strongThresholds.hudDarkMin
      && color.meanPeak <= strongThresholds.hudMeanPeakMax;
    const key = [
      iconMatched ? "icon" : "no-icon",
      colorMatched ? "color" : "no-color",
      percentVisible ? "percent" : "no-percent",
      strong ? "strong" : "weak",
    ].join("+");

    return {
      matched,
      checks: { iconMatched, colorMatched, percentVisible },
      strength: strong ? "strong" : "weak",
      key,
      summary: `icon=${formatFaintMetric(icon)} color=${formatFaintMetric(color)} pctWhite=${formatAutoMetric(percent.white)}`,
    };
  }

  function getFaintRequiredStreak(signal, resolvedRef = {}) {
    if (signal?.strength !== "strong") {
      return FAINT_DETECTION_CONFIG.requiredWeakStreak;
    }

    return resolvedRef.source === "live" || resolvedRef.source === "cache" || resolvedRef.source === "cache-live-weak"
      ? FAINT_DETECTION_CONFIG.requiredResolvedStrongStreak
      : FAINT_DETECTION_CONFIG.requiredStrongStreak;
  }

  function sampleFaintHudRoi(source, crop) {
    const width = Math.max(1, Math.round(crop.width));
    const height = Math.max(1, Math.round(crop.height));
    const context = getAutoIconDetectorContext(width, height);
    if (!context) {
      return null;
    }

    context.clearRect(0, 0, width, height);
    context.drawImage(
      source,
      Math.round(crop.x),
      Math.round(crop.y),
      width,
      height,
      0,
      0,
      width,
      height,
    );

    const imageData = context.getImageData(0, 0, width, height).data;
    let total = 0;
    let red = 0;
    let pink = 0;
    let white = 0;
    let dark = 0;
    let peakSum = 0;

    for (let index = 0; index < imageData.length; index += 4) {
      const r = imageData[index];
      const g = imageData[index + 1];
      const b = imageData[index + 2];
      const maxValue = Math.max(r, g, b);
      const minValue = Math.min(r, g, b);
      total += 1;
      peakSum += maxValue;

      if (r > 115 && r > g * 1.18 && r > b * 1.18) {
        red += 1;
      }
      if (r > 180 && b > 110 && g < 110) {
        pink += 1;
      }
      if (maxValue > 190 && minValue > 148) {
        white += 1;
      }
      if (maxValue < 55) {
        dark += 1;
      }
    }

    return {
      red: red / total,
      pink: pink / total,
      white: white / total,
      dark: dark / total,
      meanPeak: (peakSum / total) / 255,
    };
  }

  function formatFaintMetric(sample) {
    return `red=${formatAutoMetric(sample.red)} pink=${formatAutoMetric(sample.pink)} white=${formatAutoMetric(sample.white)} dark=${formatAutoMetric(sample.dark)} peak=${formatAutoMetric(sample.meanPeak)}`;
  }

  function appendFaintDebugLogIfChanged(key, lines) {
    const pickOverlay = state.autoSnap.pickOverlay;
    if (!state.debugMode || pickOverlay.lastFaintLogKey === key) {
      return;
    }

    pickOverlay.lastFaintLogKey = key;
    appendTerminalDebug(lines);
  }

  function appendPickOverlayDebugLogIfChanged(key, lines) {
    const pickOverlay = state.autoSnap.pickOverlay;
    if (!state.debugMode || pickOverlay.lastLogKey === key) {
      return;
    }

    pickOverlay.lastLogKey = key;
    appendTerminalDebug(lines);
  }

  function appendBattleResultDebugLogIfChanged(key, lines) {
    const detection = state.battleResultDetection;
    if (!state.debugMode || detection.lastLogKey === key) {
      return;
    }

    detection.lastLogKey = key;
    appendTerminalDebug(lines);
  }

  function appendPokemonIconDebugLogIfChanged(key, lines) {
    const recognition = state.pokemonIconRecognition;
    if (!state.debugMode || recognition.lastLogKey === key) {
      return;
    }

    recognition.lastLogKey = key;
    appendTerminalDebug(lines);
  }

  function recordPerformanceDebugMetric(key, durationMs, details = "", options = {}) {
    // Async name recognition is recorded with its reference's match id separately.
    if (!key.startsWith("pokemonIcon")) recordMatchLogPerformance(key, durationMs);
    if (!state.debugMode || !state.performanceDebug) {
      return;
    }

    const normalizedDurationMs = Math.max(0, Number(durationMs) || 0);
    const metric = state.performanceDebug.metrics[key] || {
      durationMs: 0,
      maxMs: 0,
      count: 0,
      details: "",
      updatedAt: 0,
    };
    metric.durationMs = normalizedDurationMs;
    metric.maxMs = Math.max(metric.maxMs || 0, normalizedDurationMs);
    metric.count += 1;
    metric.details = details;
    metric.updatedAt = Date.now();
    state.performanceDebug.metrics[key] = metric;

    const thresholdMs = options.thresholdMs ?? PERFORMANCE_DEBUG_CONFIG.thresholds[key];
    if (Number.isFinite(thresholdMs) && normalizedDurationMs >= thresholdMs) {
      appendPerformanceDebugLog(
        options.logKey || key,
        `[debug] perf ${key}: ${formatPerformanceMs(normalizedDurationMs)}${details ? ` ${details}` : ""}`,
      );
    }
  }

  function appendPerformanceDebugLog(key, line) {
    if (!state.debugMode || !state.performanceDebug) {
      return;
    }

    const now = Date.now();
    const lastLogAt = state.performanceDebug.lastLogAtByKey[key] || 0;
    if (now - lastLogAt < PERFORMANCE_DEBUG_CONFIG.logCooldownMs) {
      return;
    }

    state.performanceDebug.lastLogAtByKey[key] = now;
    appendTerminalDebug([line]);
  }

  function getPerformanceDebugNow() {
    return typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  }

  function formatPerformanceMs(durationMs) {
    const numeric = Number(durationMs);
    if (!Number.isFinite(numeric)) {
      return "0.0ms";
    }

    return `${numeric >= 100 ? numeric.toFixed(0) : numeric.toFixed(1)}ms`;
  }

  function getLoadingTemplateSignal(metrics) {
    return metrics.loadingTemplate;
  }

  function getSelectionTimerSignal(metrics) {
    return metrics.selectionTimerIcon;
  }

  function getSelectionLockedSignal(metrics) {
    const bar = metrics.bottomDoneBar;
    const threshold = AUTO_SNAP_CONFIG.thresholds.locked;
    return {
      barBright: bar.bright,
      barBlue: bar.blue,
      matched: bar.bright >= threshold.barBrightMin
        && bar.blue >= threshold.barBlueMin,
    };
  }

  function buildLockedBaseline(metrics) {
    return {
      selectionRight: { ...metrics.selectionRight },
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
    recordMatchLogEvent("waiting", "[debug] 待機画面のタイマーを検出しました。", timerIconSignal, now);
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
      auto.lastSnapFailed = false;
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
      auto.lastSnapFailed = true;
      auto.phase = latched ? "selection_locked" : "selection_active";
    }

    return true;
  }

  function loadAutoTemplates() {
    loadAutoTemplate("loading", AUTO_TEMPLATE_PATHS.loading, "auto-loading-template-load-failed", "読み込み画面の判定画像を読み込めませんでした。");
    loadAutoTemplate("selectionTimer", AUTO_TEMPLATE_PATHS.selectionTimer, "auto-selection-template-load-failed", "選出タイマー画像の読み込みに失敗しました。");
    loadAutoTemplate("waitingTimer", AUTO_TEMPLATE_PATHS.waitingTimer, "auto-waiting-template-load-failed", "待機タイマー画像の読み込みに失敗しました。");
  }

  function loadBattleResultTemplate() {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      state.battleResultTemplate = buildBattleResultTemplate(image);
      if (state.battleResultTemplate.status !== "ready") {
        appendTerminalNotice(
          "battle-result-template-invalid",
          ["[error] 勝敗判定テンプレートを初期化できませんでした。勝敗判定は利用できません。"],
          "error",
        );
      }
    };
    image.onerror = () => {
      state.battleResultTemplate = createPendingAutoTemplate("error");
      appendTerminalNotice(
        "battle-result-template-load-failed",
        ["[error] 勝敗判定テンプレートの読み込みに失敗しました。勝敗判定は利用できません。"],
        "error",
      );
    };
    image.src = BATTLE_RESULT_TEMPLATE_PATH;
  }

  function loadPickOverlayBadgeImages() {
    Object.entries(PICK_OVERLAY_CONFIG.badgeImagePaths).forEach(([orderKey, path]) => {
      const order = Number(orderKey);
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        state.pickOverlayBadgeImages[order] = image;
        if (state.references.enemy && state.mode !== "edit") {
          drawCropPanel("enemy");
        }
      };
      image.onerror = () => {
        appendTerminalNotice(
          `pick-overlay-badge-${order}-load-failed`,
          [`[error] 相手選出番号バッジ ${order} の読み込みに失敗しました。`],
          "error",
        );
      };
      image.src = path;
    });

    const flashFrameImage = new Image();
    flashFrameImage.decoding = "async";
    flashFrameImage.onload = () => {
      state.pickOverlayFlashFrameImage = flashFrameImage;
      if (state.references.enemy && state.mode !== "edit") {
        drawCropPanel("enemy");
      }
    };
    flashFrameImage.onerror = () => {
      appendTerminalNotice(
        "pick-overlay-flash-frame-load-failed",
        ["[error] 相手選出ハイライト画像の読み込みに失敗しました。"],
        "error",
      );
    };
    flashFrameImage.src = PICK_OVERLAY_CONFIG.flashFrameImagePath;

    const correctionFrameImage = new Image();
    correctionFrameImage.decoding = "async";
    correctionFrameImage.onload = () => {
      state.pickOverlayCorrectionFrameImage = correctionFrameImage;
      if (state.references.enemy && state.mode !== "edit") {
        drawCropPanel("enemy");
      }
    };
    correctionFrameImage.onerror = () => {
      appendTerminalNotice(
        "pick-overlay-correction-frame-load-failed",
        ["[error] 相手選出訂正ハイライト画像の読み込みに失敗しました。"],
        "error",
      );
    };
    correctionFrameImage.src = PICK_OVERLAY_CONFIG.correctionFrameImagePath;

    const faintFrameImage = new Image();
    faintFrameImage.decoding = "async";
    faintFrameImage.onload = () => {
      state.pickOverlayFaintFrameImage = faintFrameImage;
      if (state.references.enemy && state.mode !== "edit") {
        drawCropPanel("enemy");
      }
    };
    faintFrameImage.onerror = () => {
      appendTerminalNotice(
        "pick-overlay-faint-frame-load-failed",
        ["[error] 相手瀕死オーバーレイ画像の読み込みに失敗しました。"],
        "error",
      );
    };
    faintFrameImage.src = PICK_OVERLAY_CONFIG.faintFrameImagePath;
  }

  function getPickOverlayBadgeImage(order) {
    return state.pickOverlayBadgeImages[order] || null;
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

  function matchBattleResultTemplate(crop) {
    const template = state.battleResultTemplate;
    const threshold = BATTLE_RESULT_CONFIG.thresholds;
    if (!crop || !template || template.status !== "ready" || !template.mask) {
      return createEmptyBattleResultSignal(false);
    }

    const searchPadding = BATTLE_RESULT_CONFIG.searchPadding;
    const searchWidth = template.width + (searchPadding * 2);
    const searchHeight = template.height + (searchPadding * 2);
    const context = getBattleResultDetectorContext(searchWidth, searchHeight);
    if (!context) {
      return createEmptyBattleResultSignal(false);
    }

    const searchCrop = expandBattleResultCrop(crop, searchPadding / Math.max(template.width, 1));
    context.clearRect(0, 0, searchWidth, searchHeight);
    context.drawImage(
      elements.video,
      searchCrop.x,
      searchCrop.y,
      searchCrop.width,
      searchCrop.height,
      0,
      0,
      searchWidth,
      searchHeight,
    );

    const imageData = context.getImageData(0, 0, searchWidth, searchHeight).data;
    let bestCoverage = 0;
    let bestSpill = 1;
    let bestOffsetX = 0;
    let bestOffsetY = 0;
    let bestScore = -Infinity;

    BATTLE_RESULT_CONFIG.searchOffsets.forEach((relativeOffsetY) => {
      BATTLE_RESULT_CONFIG.searchOffsets.forEach((relativeOffsetX) => {
        const offsetX = searchPadding + relativeOffsetX;
        const offsetY = searchPadding + relativeOffsetY;
        let matchedPixels = 0;
        let spillPixels = 0;

        for (let y = 0; y < template.height; y += 1) {
          for (let x = 0; x < template.width; x += 1) {
            const templateIndex = (y * template.width) + x;
            const sampleIndex = (((offsetY + y) * searchWidth) + (offsetX + x)) * 4;
            const sampleIsGold = isBattleResultGoldPixel(
              imageData[sampleIndex],
              imageData[sampleIndex + 1],
              imageData[sampleIndex + 2],
            );

            if (template.mask[templateIndex]) {
              if (sampleIsGold) {
                matchedPixels += 1;
              }
            } else if (sampleIsGold) {
              spillPixels += 1;
            }
          }
        }

        const coverageScore = matchedPixels / Math.max(template.activeCount, 1);
        const spillScore = spillPixels / Math.max(template.inactiveCount, 1);
        const score = coverageScore - (spillScore * 0.55);
        if (
          score > bestScore
          || (score === bestScore && coverageScore > bestCoverage)
        ) {
          bestScore = score;
          bestCoverage = coverageScore;
          bestSpill = spillScore;
          bestOffsetX = relativeOffsetX;
          bestOffsetY = relativeOffsetY;
        }
      });
    });

    return {
      templateReady: true,
      coverageScore: bestCoverage,
      spillScore: bestSpill,
      offsetX: bestOffsetX,
      offsetY: bestOffsetY,
      matched: bestCoverage >= threshold.coverageMin
        && bestSpill <= threshold.spillMax,
    };
  }

  function createEmptyBattleResultSignal(templateReady = false) {
    return {
      templateReady,
      coverageScore: 0,
      spillScore: 1,
      offsetX: 0,
      offsetY: 0,
      matched: false,
    };
  }

  function isBattleResultGoldPixel(r, g, b) {
    return r >= 130
      && g >= 75
      && b <= 145
      && r - b >= 40
      && g - b >= 20
      && r >= g * 0.82;
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
    const preBattleScreenSignal = getPreBattleScreenSignal(metrics);
    return {
      hudAccent,
      hudBright: metrics.battleHud.bright,
      enemyListStillVisible: preBattleScreenSignal.matched,
      preBattleScreenSource: preBattleScreenSignal.source,
      enemyListColorSignal: preBattleScreenSignal.colorMatched,
      matched: hudAccent >= threshold.hudAccentMin
        && metrics.battleHud.bright >= threshold.hudBrightMin
        && !preBattleScreenSignal.matched,
    };
  }

  function getPreBattleScreenSignal(metrics) {
    const selectionTimerSignal = getSelectionTimerSignal(metrics);
    const waitingTimerSignal = getWaitingTimerIconSignal(metrics);
    const selectionTimerMatched = Boolean(selectionTimerSignal?.matched);
    const waitingTimerMatched = Boolean(waitingTimerSignal?.matched);
    const templatesReady = Boolean(
      selectionTimerSignal?.templateReady
      && waitingTimerSignal?.templateReady,
    );
    const colorMatched = metrics.selectionRight.red >= 0.16
      && metrics.selectionRight.chroma >= 0.28;
    const useColorFallback = !templatesReady
      && !selectionTimerMatched
      && !waitingTimerMatched;
    const matched = selectionTimerMatched
      || waitingTimerMatched
      || (useColorFallback && colorMatched);
    const source = selectionTimerMatched
      ? "selection-timer"
      : waitingTimerMatched
        ? "waiting-timer"
        : useColorFallback && colorMatched
          ? "color-fallback"
          : templatesReady
            ? "clear"
            : "template-loading";

    return {
      matched,
      source,
      templatesReady,
      colorMatched,
    };
  }

  function buildBattleResultTemplate(image) {
    const width = image.naturalWidth || image.width || 0;
    const height = image.naturalHeight || image.height || 0;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!context || !width || !height) {
      return createPendingAutoTemplate("error");
    }

    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height).data;
    const mask = new Uint8Array(width * height);
    let activeCount = 0;

    for (let index = 0; index < imageData.length; index += 4) {
      if (
        isBattleResultGoldPixel(
          imageData[index],
          imageData[index + 1],
          imageData[index + 2],
        )
      ) {
        mask[index / 4] = 1;
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

  function getPickOverlayBattleHudSignal(metrics) {
    const battleHudSignal = getBattleHudSignal(metrics);
    return {
      ...battleHudSignal,
      hudOnlyAllowed: !battleHudSignal.matched && !battleHudSignal.enemyListStillVisible,
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
    auto.lastSnapFailed = false;
    auto.lastTriggerReason = kind === "battle_hud"
      ? "battle HUD が先に来たため waiting icon frame を使用"
      : "battle HUD が先に来たため waiting icon frame を使用";

    if (!auto.fallbackBuffer?.frames) {
      auto.lastSnapFailed = true;
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
      auto.lastSnapFailed = true;
    }
  }

  function formatAutoMetric(value) {
    return Number(value || 0).toFixed(3);
  }

  function formatPickOverlayOffset(candidate) {
    const offsetX = Math.round(candidate?.offsetX || 0);
    const offsetY = Math.round(candidate?.offsetY || 0);
    return `${offsetX},${offsetY}`;
  }

  function getAutoStatusLines() {
    const auto = state.autoSnap;
    const lines = [
      `[auto] ${auto.enabled ? "ON" : "OFF"}`,
      `[auto] 状態: ${getAutoStatusSummaryLabel()}`,
      `[auto] 前回の結果: ${getAutoLastResultSummary()}`,
    ];

    if (state.streamInfo && !state.streamInfo.isSixteenByNine) {
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

    if (!state.videoReady || !state.stream) {
      return "映像待ち";
    }

    if (!state.streamInfo?.isSixteenByNine) {
      return "16:9 入力待ち";
    }

    if (state.mode !== "ready") {
      return "ready モード待ち";
    }

    if (auto.phase === "loading_seen" || auto.phase === "selection_active") {
      return "選出画面を監視中";
    }

    if (auto.phase === "selection_recovery") {
      return "選出画面を再確認中";
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
    if (state.autoSnap.lastSnapFailed) return "撮影に失敗しました。";
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
      `[debug] phase detail: ${auto.phase}`,
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
        `[debug] locked bar=${formatAutoMetric(lockedSignal.barBright)}/${formatAutoMetric(lockedSignal.barBlue)}`,
      );
      lines.push(
        waitingTimerSignal.templateReady
          ? `[debug] waiting icon coverage=${formatAutoMetric(waitingTimerSignal.coverageScore)} spill=${formatAutoMetric(waitingTimerSignal.spillScore)} dark=${formatAutoMetric(waitingTimerSignal.darkBackground)} offset=${waitingTimerSignal.offsetX},${waitingTimerSignal.offsetY} battleHud=${formatAutoMetric(battleHudSignal.hudAccent)} preBattle=${battleHudSignal.preBattleScreenSource} color=${battleHudSignal.enemyListColorSignal ? "yes" : "no"}`
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
    lines.push(...auto.selectionDiagnostics);
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

    if (phase === "selection_recovery") {
      return "selection_recovery";
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

  function createBattleResultDetectionState(reason = "") {
    return {
      armed: false,
      battleHudFrames: 0,
      lastCheckAt: 0,
      leftStreak: 0,
      rightStreak: 0,
      result: "",
      event: null,
      detectedAt: 0,
      lastSignals: {
        left: createEmptyBattleResultSignal(),
        right: createEmptyBattleResultSignal(),
      },
      lastSummary: reason || "battle HUD待ち",
      lastLogKey: "",
    };
  }

  function createPickOverlayState(reason = "") {
    return {
      ordersByRefIndex: PICK_OVERLAY_CONFIG.referenceRois.map(() => 0),
      faintedByRefIndex: PICK_OVERLAY_CONFIG.referenceRois.map(() => false),
      faintSlotCacheByHudIndex: FAINT_DETECTION_CONFIG.hudRois.map(() => null),
      nextOrder: 1,
      pendingMatchesByHudIndex: PICK_OVERLAY_CONFIG.hudRois.map(() => null),
      pendingFaintsByHudIndex: FAINT_DETECTION_CONFIG.hudRois.map(() => null),
      flashFramesByRefIndex: PICK_OVERLAY_CONFIG.referenceRois.map(() => null),
      correctionFramesByRefIndex: PICK_OVERLAY_CONFIG.referenceRois.map(() => null),
      pendingSequence: 0,
      referenceUpdatedAt: 0,
      lastCompareAt: 0,
      lastFaintCompareAt: 0,
      lastGateActive: false,
      lastGateReason: reason || "待機中",
      lastSummary: reason ? `${reason} / 確定なし` : "確定なし",
      lastHudSummaries: PICK_OVERLAY_CONFIG.hudRois.map(() => reason || "未評価"),
      lastFaintSummaries: FAINT_DETECTION_CONFIG.hudRois.map(() => reason || "未評価"),
      lastLogKey: "",
      lastFaintLogKey: "",
    };
  }

  function createPokemonIconRecognitionState(reason = "") {
    return {
      status: reason ? "reset" : "idle",
      reason,
      engine: "",
      requestId: 0,
      reference: null,
      requestSentAt: 0,
      resultsByRefIndex: PICK_OVERLAY_CONFIG.referenceRois.map(() => null),
      notifiedByRefIndex: PICK_OVERLAY_CONFIG.referenceRois.map(() => false),
      lastSummary: reason || "未評価",
      lastSlotSummaries: PICK_OVERLAY_CONFIG.referenceRois.map(() => reason || "未評価"),
      lastDiagnostics: null,
      workerTiming: {},
      candidateStats: null,
      candidateFailures: [],
      visualCollisions: [],
      lastLogKey: "",
    };
  }

  function createPokemonIconWorkerState() {
    return {
      status: "idle",
      prewarmStatus: "idle",
      reason: "",
      capabilities: {},
      stats: null,
      failures: [],
      runtimeMergedDuplicates: [],
      visualCollisions: [],
    };
  }

  function createPerformanceDebugState() {
    return {
      metrics: {},
      lastLogAtByKey: {},
      lastPokemonIconSlotDurations: [],
    };
  }

  function createFaintDiagnosticState() {
    return {
      version: 1, config: JSON.parse(JSON.stringify({ ...FAINT_DETECTION_CONFIG, ...FAINT_DIAGNOSTIC_CONFIG })),
      comparisons: [], comparisonCount: 0, comparisonCursor: 0, comparisonDropped: 0,
      events: [], eventCount: 0, eventCursor: 0, eventDropped: 0,
      reasons: Object.fromEntries(Object.keys(FAINT_DIAGNOSTIC_REASONS).map((reason) => [reason, {
        count: 0, byAssociation: { current: 0, previous: 0, unlinked: 0, none: 0 }, first: null, last: null }])),
      hud: [0, 1].map(() => ({ current: { observations: 0, accepted: 0 }, other: { observations: 0, accepted: 0 } })),
      lastOutcomes: [null, null], lastMappings: [null, null], lastPending: [null, null],
    };
  }

  function copyFaintDiagnosticPending(pending, now) {
    return pending ? { refIndex: pending.refIndex, streak: pending.streak, requiredStreak: pending.requiredStreak,
      firstSeenAt: pending.firstSeenAt, lastSeenAt: pending.lastSeenAt, ageMs: now - pending.lastSeenAt } : null;
  }

  function copyFaintDiagnosticCache(cache, now) {
    return cache ? { refIndex: cache.refIndex, tier: cache.tier, lastSeenAt: cache.lastSeenAt,
      ageMs: now - cache.lastSeenAt } : null;
  }

  function captureFaintDiagnosticState() {
    const pick = state.autoSnap.pickOverlay;
    const now = Date.now();
    return { fainted: [...pick.faintedByRefIndex],
      pending: pick.pendingFaintsByHudIndex.map((item) => copyFaintDiagnosticPending(item, now)),
      cache: pick.faintSlotCacheByHudIndex.map((item) => copyFaintDiagnosticCache(item, now)) };
  }

  function beginFaintDiagnosticComparison(now) {
    const match = state.matchLog.current;
    if (!match?.faintDiagnostic) return null;
    const context = getPickDiagnosticContext(match, now);
    return { match, context: { ...context, matchElapsedMs: now - match.startedAt }, hud: [] };
  }

  function beginFaintDiagnosticHud(comparison, hudIndex, best, gate) {
    if (!comparison) return null;
    const now = comparison.context.at;
    const pick = state.autoSnap.pickOverlay;
    const hasCandidate = Number.isInteger(best.refIndex) && best.refIndex >= 0;
    return { comparison, hudIndex, read: {},
      candidate: { refIndex: hasCandidate ? best.refIndex : null, tier: hasCandidate ? best.tier || null : null,
        score: hasCandidate ? best.bestScore ?? null : null, margin: hasCandidate ? best.margin ?? null : null },
      gate: gate ? { ready: gate.ready, reason: gate.key, mean: gate.mean ?? null,
        contrast: gate.contrast ?? null, brightRatio: gate.brightRatio ?? null } : null,
      cacheBefore: copyFaintDiagnosticCache(pick.faintSlotCacheByHudIndex[hudIndex], now),
      pendingBefore: copyFaintDiagnosticPending(pick.pendingFaintsByHudIndex[hudIndex], now) };
  }

  function recordFaintDiagnosticEvent(reason, data = {}, context = null, count = true) {
    const match = state.matchLog.current;
    if (!match?.faintDiagnostic || !FAINT_DIAGNOSTIC_REASONS[reason]) return;
    const origin = context || getPickDiagnosticContext(match);
    if (origin.matchId !== match.diagnostic.matchId) return;
    const diagnostic = match.faintDiagnostic;
    const entry = { ...origin, at: Date.now(), observedAt: origin.at,
      matchElapsedMs: origin.at - match.startedAt, sequence: ++diagnostic.eventCount, reason, ...data };
    appendPickDiagnosticRing(diagnostic, "events", entry, FAINT_DIAGNOSTIC_CONFIG.eventLimit);
    if (count) countPickDiagnosticReason(diagnostic, reason, entry);
    if (reason === "reset" || reason === "manual_set" || reason === "manual_clear") {
      diagnostic.lastOutcomes.fill(null);
      diagnostic.lastMappings.fill(null);
      diagnostic.lastPending.fill(null);
    }
  }

  function recordFaintDiagnosticOutcome(observation, outcome) {
    if (!observation || state.matchLog.current !== observation.comparison.match) return;
    const { comparison, hudIndex, resolved, signal, pendingBefore } = observation;
    const diagnostic = comparison.match.faintDiagnostic;
    const context = comparison.context;
    const pick = state.autoSnap.pickOverlay;
    const pendingAfter = copyFaintDiagnosticPending(pick.pendingFaintsByHudIndex[hudIndex], context.at);
    const copyParts = (parts) => Object.fromEntries(["icon", "color", "percent"].map((key) => [key, parts?.[key] ? { ...parts[key] } : null]));
    const pendingTransition = outcome === "accepted" ? "completed"
      : pendingBefore && pendingAfter && pendingBefore.refIndex !== pendingAfter.refIndex ? "changed"
        : pendingBefore && !pendingAfter ? context.at - pendingBefore.lastSeenAt > FAINT_DETECTION_CONFIG.pendingGraceMs
          && outcome !== "already_fainted" ? "expired" : "cleared"
          : pendingBefore && pendingAfter && pendingBefore.lastSeenAt === pendingAfter.lastSeenAt ? "kept"
            : pendingAfter ? "counting" : "none";
    const row = {
      hudIndex, outcome, candidate: observation.candidate, gate: observation.gate,
      resolved: { ...resolved, refIndex: resolved.refIndex < 0 ? null : resolved.refIndex },
      cacheBefore: observation.cacheBefore,
      cacheAfter: copyFaintDiagnosticCache(pick.faintSlotCacheByHudIndex[hudIndex], context.at),
      crops: copyParts(observation.read.crops), samples: copyParts(observation.read.samples),
      matched: signal?.matched ?? null, strength: signal?.strength ?? null, checks: signal ? { ...signal.checks } : null,
      pendingBefore, pendingAfter, pendingTransition,
      currentRequiredStreak: signal ? getFaintRequiredStreak(signal, resolved) : null,
      decision: observation.decision ? { ...observation.decision } : null,
      fainted: resolved.refIndex >= 0 ? Boolean(pick.faintedByRefIndex[resolved.refIndex]) : null,
    };
    comparison.hud.push(row);
    const example = { ...context, ...row };
    countPickDiagnosticReason(diagnostic, outcome, example);
    const totals = diagnostic.hud[hudIndex][context.association === "current" ? "current" : "other"];
    totals.observations += 1;
    if (outcome === "accepted") totals.accepted += 1;
    const mappingKey = `${context.captureId}:${resolved.refIndex}:${resolved.source}`;
    if (diagnostic.lastMappings[hudIndex] !== mappingKey) {
      recordFaintDiagnosticEvent("mapping_changed", { hudIndex, resolved: row.resolved,
        candidate: row.candidate, cacheBefore: row.cacheBefore, cacheAfter: row.cacheAfter }, context);
      diagnostic.lastMappings[hudIndex] = mappingKey;
    }
    const outcomeKey = `${context.captureId}:${resolved.refIndex}:${outcome}:${signal?.key || "no-signal"}`;
    if (diagnostic.lastOutcomes[hudIndex] !== outcomeKey || outcome === "accepted") {
      recordFaintDiagnosticEvent(outcome, { observation: row }, context, false);
      diagnostic.lastOutcomes[hudIndex] = outcomeKey;
    }
    const transitionReason = { kept: "pending_kept", expired: "pending_expired", cleared: "pending_cleared", changed: "candidate_changed" }[pendingTransition];
    const pendingKey = `${context.captureId}:${pendingBefore?.refIndex}:${pendingAfter?.refIndex}:${pendingTransition}`;
    if (transitionReason && diagnostic.lastPending[hudIndex] !== pendingKey) {
      recordFaintDiagnosticEvent(transitionReason, { hudIndex, before: pendingBefore, after: pendingAfter }, context);
    }
    // A changed target may immediately meet the one-observation strong condition.
    if (outcome === "accepted" && pendingBefore && pendingBefore.refIndex !== resolved.refIndex) {
      recordFaintDiagnosticEvent("candidate_changed", { hudIndex, before: pendingBefore, refIndex: resolved.refIndex }, context);
    }
    diagnostic.lastPending[hudIndex] = pendingKey;
  }

  function finishFaintDiagnosticComparison(comparison) {
    if (!comparison || state.matchLog.current !== comparison.match) return;
    const diagnostic = comparison.match.faintDiagnostic;
    const entry = { ...comparison.context, comparison: ++diagnostic.comparisonCount, hud: comparison.hud };
    appendPickDiagnosticRing(diagnostic, "comparisons", entry, FAINT_DIAGNOSTIC_CONFIG.comparisonLimit);
  }

  function formatFaintDiagnosticLog(diagnostic) {
    if (!diagnostic) return [];
    const ordered = (kind, stem) => diagnostic[`${stem}Dropped`]
      ? [...diagnostic[kind].slice(diagnostic[`${stem}Cursor`]), ...diagnostic[kind].slice(0, diagnostic[`${stem}Cursor`])]
      : diagnostic[kind];
    return [
      "", "--- 瀕死診断の設定・集計 ---",
      "refIndexは相手画像の上から0〜5、hudIndexは対戦HUDの左0/右1。nullは未取得・未確定。",
      "percentVisibleは白い画素の量による文字の存在確認で、0%の数字認識ではありません。",
      "resolved.source: live=今回の照合、cache=以前の対応、cache-live-weak=弱い別候補より以前の対応を維持、pending=一致待ちの対象、missing=不明。",
      "at/lastSeenAtはUTCのミリ秒、matchElapsedMsは記録開始からの経過、ageMsは対応・一致待ちの経過。current以外の画像は集計を分離。",
      `理由コード: ${JSON.stringify(FAINT_DIAGNOSTIC_REASONS)}`,
      JSON.stringify({ version: diagnostic.version, config: diagnostic.config, comparisonCount: diagnostic.comparisonCount,
        eventCount: diagnostic.eventCount, comparisonDropped: diagnostic.comparisonDropped, eventDropped: diagnostic.eventDropped,
        hud: diagnostic.hud, reasons: diagnostic.reasons }),
      "", "--- 瀕死イベント ---",
      ...ordered("events", "event").map((entry) => `${new Date(entry.at).toISOString()} ${JSON.stringify(entry)}`),
      "", "--- 瀕死の詳細判定 ---",
      ...ordered("comparisons", "comparison").map((entry) => `${new Date(entry.at).toISOString()} ${JSON.stringify(entry)}`),
    ];
  }

  function createPickDiagnosticState() {
    return {
      version: 1,
      config: JSON.parse(JSON.stringify({
        ...PICK_DIAGNOSTIC_CONFIG, compareIntervalMs: PICK_OVERLAY_CONFIG.compareIntervalMs,
        thresholds: PICK_OVERLAY_CONFIG.thresholds, hudRois: PICK_OVERLAY_CONFIG.hudRois,
        referenceRois: PICK_OVERLAY_CONFIG.referenceRois, hudSearchOffsets: PICK_OVERLAY_CONFIG.hudSearchOffsets,
        sampleWidth: PICK_OVERLAY_CONFIG.sampleWidth, sampleHeight: PICK_OVERLAY_CONFIG.sampleHeight,
        requiredStrongStreak: PICK_OVERLAY_CONFIG.requiredStrongStreak,
        requiredWeakStreak: PICK_OVERLAY_CONFIG.requiredWeakStreak,
        requiredHudOnlyStreak: PICK_OVERLAY_CONFIG.requiredHudOnlyStreak,
        gateGraceMs: PICK_OVERLAY_CONFIG.gateGraceMs, maxOrders: PICK_OVERLAY_CONFIG.maxOrders,
        screen: { ...AUTO_SNAP_CONFIG.thresholds.battleHud, selectionRedMin: 0.16, selectionChromaMin: 0.28,
          selectionTimer: AUTO_SNAP_CONFIG.thresholds.selectionTimerIcon, waitingTimer: AUTO_SNAP_CONFIG.thresholds.waitingTimerIcon },
      })),
      comparisons: [], comparisonCursor: 0, comparisonDropped: 0, comparisonCount: 0,
      events: [], eventCursor: 0, eventDropped: 0, eventCount: 0,
      reasons: Object.fromEntries(Object.keys(PICK_DIAGNOSTIC_REASONS).map((key) => [key, {
        count: 0, byAssociation: { current: 0, previous: 0, unlinked: 0, none: 0 }, first: null, last: null }])),
      hud: [0, 1].map(() => ({ current: { comparisons: 0, accepted: 0 }, other: { comparisons: 0, accepted: 0 } })),
      lastGateKey: "", lastGraceKey: "", displayCaptureId: null, displayStates: Array(6).fill(null),
    };
  }

  function getPickDiagnosticContext(match, at = Date.now()) {
    const origin = state.matchLog.references.enemy;
    const hasReference = Boolean(state.references.enemy);
    const knownOrigin = hasReference && origin?.reference === state.references.enemy ? origin : null;
    const provenance = getReferenceDiagnosticMetadata(knownOrigin);
    return {
      at, matchId: match.diagnostic.matchId, imageMatchId: provenance.matchId,
      captureId: provenance.captureId, referenceCapturedAt: provenance.referenceCapturedAt,
      association: !hasReference ? "none" : provenance.matchId === match.diagnostic.matchId ? "current"
        : provenance.matchId ? "previous" : "unlinked",
    };
  }

  function copyPickDiagnosticPending(pending) {
    return pending ? { refIndex: pending.refIndex, tier: pending.tier, streak: pending.streak,
      required: getPickOverlayRequiredStreak(pending.tier), firstSeenAt: pending.firstSeenAt,
      firstSeenSequence: pending.firstSeenSequence } : null;
  }

  function beginPickDiagnosticObservation(now) {
    const match = state.matchLog.current;
    if (!match?.pickDiagnostic) return null;
    const pick = state.autoSnap.pickOverlay;
    return {
      match, context: getPickDiagnosticContext(match, now), reason: null, mode: null, screen: null, gates: [],
      phase: state.autoSnap.phase, lastCompareAt: pick.lastCompareAt,
      pendingBefore: pick.pendingMatchesByHudIndex.map(copyPickDiagnosticPending),
      ordersBefore: [...pick.ordersByRefIndex], nextOrderBefore: pick.nextOrder,
    };
  }

  function appendPickDiagnosticRing(diagnostic, kind, entry, limit) {
    const entries = diagnostic[kind];
    const stem = kind === "comparisons" ? "comparison" : "event";
    if (entries.length < limit) entries.push(entry);
    else {
      entries[diagnostic[`${stem}Cursor`]] = entry;
      diagnostic[`${stem}Cursor`] = (diagnostic[`${stem}Cursor`] + 1) % limit;
      diagnostic[`${stem}Dropped`] += 1;
    }
  }

  function countPickDiagnosticReason(diagnostic, reason, example) {
    const summary = diagnostic.reasons[reason];
    if (!summary) return;
    summary.count += 1;
    summary.byAssociation[example.association] += 1;
    if (!summary.first) summary.first = example;
    summary.last = example;
  }

  function recordPickDiagnosticEvent(reason, data = {}, context = null) {
    const match = state.matchLog.current;
    if (!match?.pickDiagnostic || !PICK_DIAGNOSTIC_REASONS[reason]) return;
    const origin = context || getPickDiagnosticContext(match);
    if (origin.matchId !== match.diagnostic.matchId) return;
    const diagnostic = match.pickDiagnostic;
    const entry = { ...origin, at: Date.now(), observedAt: origin.at, sequence: ++diagnostic.eventCount, reason, ...data };
    appendPickDiagnosticRing(diagnostic, "events", entry, PICK_DIAGNOSTIC_CONFIG.eventLimit);
    countPickDiagnosticReason(diagnostic, reason, entry);
  }

  function recordPickDisplayDiagnostic(refIndex, reason, recognition) {
    const match = state.matchLog.current;
    if (!match?.pickDiagnostic || recognition !== state.pokemonIconRecognition
      || recognition.reference !== state.references.enemy) return;
    const context = getPickDiagnosticContext(match);
    // Late results and previous-match images must not become this match's display results.
    if (context.association !== "current") return;
    const diagnostic = match.pickDiagnostic;
    if (diagnostic.displayCaptureId !== context.captureId) {
      diagnostic.displayCaptureId = context.captureId;
      diagnostic.displayStates.fill(null);
    }
    const order = state.autoSnap.pickOverlay.ordersByRefIndex[refIndex];
    const key = `${order}:${reason}`;
    if (diagnostic.displayStates[refIndex] === key) return;
    diagnostic.displayStates[refIndex] = key;
    recordPickDiagnosticEvent(reason, { refIndex, order, requestId: recognition.requestId }, context);
  }

  function getPickDiagnosticThresholdChecks(best, mode) {
    const t = PICK_OVERLAY_CONFIG.thresholds;
    const routes = mode === "hud-only" ? [["hud-only", t.hudOnlyScoreMin, t.hudOnlyMarginMin]]
      : [["strong", t.scoreMin, t.marginMin], ["strong-margin", t.scoreMinStrongMargin, t.marginStrongMin],
        ["weak", t.scoreWeakMin, t.marginWeakMin]];
    return routes.map(([route, scoreMin, marginMin]) => ({ route,
      scorePass: best.bestScore >= scoreMin, marginPass: best.margin >= marginMin }));
  }

  function finishPickDiagnosticObservation(observation) {
    if (!observation || state.matchLog.current !== observation.match || !observation.reason) return;
    const { match, context, reason } = observation;
    const diagnostic = match.pickDiagnostic;
    const pick = state.autoSnap.pickOverlay;
    const gates = observation.gates.map((gate) => ({ ready: gate.ready, reason: gate.key,
      mean: gate.mean ?? null, contrast: gate.contrast ?? null, brightRatio: gate.brightRatio ?? null,
      offsetX: gate.offsetX ?? null, offsetY: gate.offsetY ?? null }));
    const pendingAfter = pick.pendingMatchesByHudIndex.map(copyPickDiagnosticPending);
    const sample = { ...context, reason, mode: observation.mode, phase: observation.phase, screen: observation.screen,
      readCounts: observation.readCounts || null, gates };
    countPickDiagnosticReason(diagnostic, reason, sample);
    if (reason !== "compared") {
      if (match.window) {
        const summary = match.window.pick || (match.window.pick = { reasons: {}, latest: null });
        summary.reasons[reason] = (summary.reasons[reason] || 0) + 1;
        summary.latest = sample;
      }
      const gateKey = `${context.captureId}:${reason}:${gates.map((gate) => gate.reason).join("|")}`;
      if (reason !== "interval_wait" && diagnostic.lastGateKey !== gateKey) {
        // The observation was already counted; this event marks only the transition.
        const entry = { ...sample, at: Date.now(), observedAt: sample.at, sequence: ++diagnostic.eventCount };
        appendPickDiagnosticRing(diagnostic, "events", entry, PICK_DIAGNOSTIC_CONFIG.eventLimit);
        diagnostic.lastGateKey = gateKey;
      }
    } else {
      diagnostic.lastGateKey = "compared";
      const tentative = new Set(observation.tentative.map((item) => item.hudIndex));
      const hud = observation.best.map((best, hudIndex) => {
        const accepted = observation.accepted.get(hudIndex);
        const measured = best.refIndex >= 0;
        const outcome = !gates[hudIndex]?.ready ? "hud_quality_rejected" : !measured ? "no_candidate"
          : !best.tier ? "threshold_rejected" : !tentative.has(hudIndex) ? "contested"
            : observation.ordersBefore[best.refIndex] ? "already_assigned" : accepted ? "accepted"
              : pendingAfter[hudIndex] ? "pending" : "order_limit";
        const decisionTier = accepted?.tier || pendingAfter[hudIndex]?.tier || (best.tier
          ? observation.pendingBefore[hudIndex]?.refIndex === best.refIndex
            ? getStrongerPickOverlayTier(observation.pendingBefore[hudIndex].tier, best.tier) : best.tier
          : null);
        const result = { hudIndex, outcome, gate: gates[hudIndex] || null,
          candidateGate: measured ? { mean: best.candidateGate.mean ?? null, contrast: best.candidateGate.contrast ?? null,
            brightRatio: best.candidateGate.brightRatio ?? null, ready: best.candidateGate.ready } : null,
          scores: measured ? best.scores.map((item) => ({ refIndex: item.refIndex, score: item.score })) : null,
          bestRefIndex: measured ? best.refIndex : null, secondRefIndex: measured ? best.secondRefIndex : null,
          bestScore: measured ? best.bestScore : null, secondBestScore: measured ? best.secondBestScore : null,
          margin: measured ? best.margin : null, tier: best.tier || null,
          thresholdChecks: measured ? getPickDiagnosticThresholdChecks(best, observation.mode) : null,
          grayScore: measured ? best.grayScore : null, edgeScore: measured ? best.edgeScore : null,
          colorScore: measured ? best.colorScore : null, offsetX: measured ? best.offsetX : null, offsetY: measured ? best.offsetY : null,
          pendingBefore: observation.pendingBefore[hudIndex], pendingAfter: pendingAfter[hudIndex],
          decisionStreak: accepted || outcome === "order_limit" ? (observation.pendingBefore[hudIndex]?.refIndex === best.refIndex
            ? observation.pendingBefore[hudIndex].streak + 1 : 1) : pendingAfter[hudIndex]?.streak ?? null,
          requiredStreak: decisionTier ? getPickOverlayRequiredStreak(decisionTier) : null,
          order: accepted?.order ?? pick.ordersByRefIndex[best.refIndex] ?? null };
        const totals = diagnostic.hud[hudIndex][context.association === "current" ? "current" : "other"];
        if (measured) totals.comparisons += 1;
        if (accepted) totals.accepted += 1;
        if (!accepted) countPickDiagnosticReason(diagnostic, outcome, { ...context, hudIndex, ...result });
        return result;
      });
      const entry = { ...sample, comparison: ++diagnostic.comparisonCount, hud,
        ordersBefore: observation.ordersBefore, ordersAfter: [...pick.ordersByRefIndex],
        nextOrderBefore: observation.nextOrderBefore, nextOrderAfter: pick.nextOrder };
      appendPickDiagnosticRing(diagnostic, "comparisons", entry, PICK_DIAGNOSTIC_CONFIG.comparisonLimit);
    }
    observation.pendingBefore.forEach((before, hudIndex) => {
      const after = pendingAfter[hudIndex];
      if (!before) return;
      if (after && before.refIndex !== after.refIndex) {
        recordPickDiagnosticEvent("candidate_changed", { hudIndex, before, after }, context);
      } else if (!after && !observation.accepted?.has(hudIndex)) {
        const expired = ["screen_blocked", "hud_quality_rejected"].includes(reason)
          && context.at - observation.lastCompareAt > PICK_OVERLAY_CONFIG.gateGraceMs;
        recordPickDiagnosticEvent(expired ? "grace_expired" : "pending_cleared", { hudIndex, cause: reason, before, after }, context);
      }
    });
    const kept = ["screen_blocked", "hud_quality_rejected"].includes(reason) && pendingAfter.some(Boolean);
    const graceKey = kept ? `${context.captureId}:${pendingAfter.map((item) => item?.firstSeenSequence ?? "").join(",")}` : "";
    if (kept && diagnostic.lastGraceKey !== graceKey) recordPickDiagnosticEvent("grace_kept", { pending: pendingAfter }, context);
    if (reason !== "interval_wait") diagnostic.lastGraceKey = graceKey;
  }

  function formatPickDiagnosticLog(diagnostic) {
    if (!diagnostic) return [];
    const ordered = (kind, stem) => diagnostic[`${stem}Dropped`]
      ? [...diagnostic[kind].slice(diagnostic[`${stem}Cursor`]), ...diagnostic[kind].slice(0, diagnostic[`${stem}Cursor`])]
      : diagnostic[kind];
    return [
      "", "--- 採番診断の設定・集計 ---",
      "refIndexは相手画像の上から0〜5、hudIndexはHUDの0〜1。nullは未計測。未採番だけでは失敗を意味しません。",
      "association=currentはこの試合の画像、previous/unlinked/noneは集計を分離。記録終了後の結果は含みません。",
      `理由コード: ${JSON.stringify(PICK_DIAGNOSTIC_REASONS)}`,
      JSON.stringify({ version: diagnostic.version, config: diagnostic.config, comparisonCount: diagnostic.comparisonCount,
        eventCount: diagnostic.eventCount, comparisonDropped: diagnostic.comparisonDropped, eventDropped: diagnostic.eventDropped,
        hud: diagnostic.hud, reasons: diagnostic.reasons }),
      "", "--- 採番イベント ---",
      ...ordered("events", "event").map((entry) => `${new Date(entry.at).toISOString()} ${JSON.stringify(entry)}`),
      "", "--- 採番の詳細比較 ---",
      ...ordered("comparisons", "comparison").map((entry) => `${new Date(entry.at).toISOString()} ${JSON.stringify(entry)}`),
    ];
  }

  function createDiagnosticIdentity(matchNumber = null, matchStartedAt = null) {
    const id = crypto.randomUUID();
    return { matchId: matchNumber === null ? null : id, matchNumber, matchStartedAt,
      unlinkedId: matchNumber === null ? id : null };
  }

  function getDiagnosticFilePrefix(identity) {
    if (!identity.matchId) return `snapcrop-unlinked-${identity.unlinkedId}`;
    const stamp = new Date(identity.matchStartedAt).toISOString().replace(/[-:.]/gu, "");
    return `snapcrop-${stamp}-${identity.matchId}`;
  }

  function nextDiagnosticExportSequence(identity, kind) {
    let counts = diagnosticExportCounts.get(identity);
    if (!counts) {
      counts = { match: 0, icons: 0 };
      diagnosticExportCounts.set(identity, counts);
    }
    return ++counts[kind];
  }

  function getReferenceDiagnosticMetadata(origin) {
    return {
      association: origin?.diagnostic?.matchId ? "linked" : "unlinked",
      matchId: origin?.diagnostic?.matchId ?? null,
      matchNumber: origin?.diagnostic?.matchNumber ?? null,
      matchStartedAt: origin?.diagnostic?.matchStartedAt ?? null,
      unlinkedId: origin?.diagnostic?.unlinkedId ?? null,
      captureId: origin?.captureId ?? null,
      referenceCapturedAt: origin?.capturedAt ?? null,
    };
  }

  function createMatchLogState() {
    return { nextId: 1, current: null, completed: [], references: { my: null, enemy: null } };
  }

  function createMatchLogWindow(now) {
    return {
      startedAt: now, lastAt: now, frames: 0, maxGapMs: 0, phase: "", timings: {},
      signals: {
        loadingTemplate: { readyFrames: 0, matches: 0, best: null },
        selectionTimerIcon: { readyFrames: 0, matches: 0, best: null },
        waitingTimerIcon: { readyFrames: 0, matches: 0, best: null },
      },
    };
  }

  function copyMatchLogSignal(signal) {
    if (!signal) return null;
    return {
      templateReady: Boolean(signal.templateReady), matched: Boolean(signal.matched),
      coverage: signal.coverageScore, spill: signal.spillScore, dark: signal.darkBackground,
      offsetX: signal.offsetX, offsetY: signal.offsetY,
    };
  }

  function startMatchLog(now, loadingSignal) {
    if (state.matchLog.current) finishMatchLog("unfinished", "次の読み込み検出", now);
    const match = {
      id: state.matchLog.nextId++, startedAt: now, endedAt: null,
      status: "recording", result: "", endReason: "", version: APP_VERSION,
      video: {
        width: state.streamInfo?.width || elements.video?.videoWidth || 0,
        height: state.streamInfo?.height || elements.video?.videoHeight || 0,
      },
      captureCount: 0, captureFailureCount: 0, frameCount: 0, maxGapMs: 0,
      metrics: {}, recognition: null, events: [], eventCursor: 0, eventDropped: 0,
      milestones: new Map(), sequence: 0, samples: [], sampleCursor: 0, sampleDropped: 0,
      window: createMatchLogWindow(now), snapshot: null,
    };
    match.diagnostic = createDiagnosticIdentity(match.id, now);
    match.pickDiagnostic = createPickDiagnosticState();
    match.faintDiagnostic = createFaintDiagnosticState();
    state.matchLog.current = match;
    recordMatchLogEvent("loading", "[debug] 読み込み中 を検出しました。 loading を検出", copyMatchLogSignal(loadingSignal), now);
  }

  function recordMatchLogEvent(kind, text, data = {}, now = Date.now()) {
    const match = state.matchLog.current;
    if (!match) return;
    const entry = { sequence: ++match.sequence, at: now, kind, text: text.slice(0, MATCH_LOG_CONFIG.textLimit), data };
    // Keep the most recent occurrence of every important event kind even when the ring fills.
    match.milestones.set(kind, entry);
    if (match.events.length < MATCH_LOG_CONFIG.eventLimit) {
      match.events.push(entry);
    } else {
      match.events[match.eventCursor] = entry;
      match.eventCursor = (match.eventCursor + 1) % MATCH_LOG_CONFIG.eventLimit;
      match.eventDropped += 1;
    }
  }

  function flushMatchLogWindow(match) {
    if (!match.window?.frames) return;
    if (match.samples.length < MATCH_LOG_CONFIG.sampleLimit) {
      match.samples.push(match.window);
    } else {
      match.samples[match.sampleCursor] = match.window;
      match.sampleCursor = (match.sampleCursor + 1) % MATCH_LOG_CONFIG.sampleLimit;
      match.sampleDropped += 1;
    }
    match.window = null;
  }

  function recordMatchLogFrame(metrics, now) {
    const match = state.matchLog.current;
    if (!match) return;
    if (now - match.window.startedAt >= MATCH_LOG_CONFIG.sampleIntervalMs) {
      flushMatchLogWindow(match);
      match.window = createMatchLogWindow(now);
    }
    const window = match.window;
    window.frames += 1;
    window.lastAt = now;
    window.phase = state.autoSnap.phase;
    window.maxGapMs = Math.max(window.maxGapMs, state.autoSnap.lastDetectionGapMs);
    match.frameCount += 1;
    match.maxGapMs = Math.max(match.maxGapMs, window.maxGapMs);
    for (const key in window.signals) {
      const signal = metrics[key];
      const summary = window.signals[key];
      if (signal.templateReady) summary.readyFrames += 1;
      if (signal.matched) summary.matches += 1;
      if (!summary.best || signal.coverageScore > summary.best.coverage) {
        summary.best = copyMatchLogSignal(signal);
      }
    }
  }

  function recordMatchLogPerformance(key, durationMs) {
    const match = state.matchLog.current;
    if (!match) return;
    const duration = Math.max(0, Number(durationMs) || 0);
    updateMatchLogTiming(match.metrics, key, duration);
    if (match.window) updateMatchLogTiming(match.window.timings, key, duration);
  }

  function updateMatchLogTiming(timings, key, duration) {
    const entry = timings[key] || (timings[key] = { count: 0, totalMs: 0, maxMs: 0, lastMs: 0 });
    entry.count += 1;
    entry.totalMs += duration;
    entry.maxMs = Math.max(entry.maxMs, duration);
    entry.lastMs = duration;
  }

  function recordMatchLogRecognition(recognition, durationMs) {
    const match = state.matchLog.current;
    if (!match || state.matchLog.references.enemy?.matchId !== match.id
      || recognition.reference !== state.references.enemy) return;
    match.recognition = {
      requestId: recognition.requestId, engine: recognition.engine,
      durationMs, summary: recognition.lastSummary,
      slots: recognition.lastSlotSummaries.map((line) => line.slice(0, MATCH_LOG_CONFIG.textLimit)),
    };
    recordMatchLogEvent("recognition", "[debug] 名前推定の結果", match.recognition);
  }

  function captureMatchLogSnapshot(match) {
    const references = {};
    CROP_SIDES.forEach((side) => {
      const origin = state.matchLog.references[side];
      references[side] = {
        source: !state.references[side] ? "なし"
          : origin?.matchId === match.id ? "この試合"
            : origin?.matchId ? `前の試合 #${origin.matchId}` : "記録開始前",
        matchId: origin?.matchId ?? null, capturedAt: origin?.capturedAt ?? null,
        provenance: getReferenceDiagnosticMetadata(origin),
      };
    });
    const recognition = state.pokemonIconRecognition;
    const ownRecognition = references.enemy.source === "この試合"
      && recognition.reference === state.references.enemy;
    return {
      autoEnabled: state.autoSnap.enabled, phase: state.autoSnap.phase,
      lastReason: state.autoSnap.lastReason, reset: state.autoSnap.lastResetReason,
      trigger: state.autoSnap.lastTriggerReason,
      monitor: state.autoSnap.monitorActive ? state.autoSnap.frameRequestKind : "idle",
      mode: state.mode, videoReady: state.videoReady, references,
      iconManifestReady: state.pokemonIconReferenceReady,
      iconWorker: { status: state.pokemonIconWorkerState.status, prewarm: state.pokemonIconWorkerState.prewarmStatus },
      recognition: references.enemy.source === "この試合" ? {
        status: recognition.status, engine: recognition.engine, reason: recognition.reason, requestId: recognition.requestId,
        result: ownRecognition && match.recognition?.requestId === recognition.requestId ? match.recognition : null,
      } : { status: "この試合の名前推定なし" },
      pickOrders: references.enemy.source === "この試合" ? [...state.autoSnap.pickOverlay.ordersByRefIndex] : null,
      fainted: references.enemy.source === "この試合" ? [...state.autoSnap.pickOverlay.faintedByRefIndex] : null,
      signals: {
        loading: copyMatchLogSignal(state.autoSnap.lastMetrics?.loadingTemplate),
        selection: copyMatchLogSignal(state.autoSnap.lastMetrics?.selectionTimerIcon),
        waiting: copyMatchLogSignal(state.autoSnap.lastMetrics?.waitingTimerIcon),
      },
    };
  }

  function finishMatchLog(status, reason, now = Date.now()) {
    const match = state.matchLog.current;
    if (!match) return;
    match.status = status;
    match.endedAt = now;
    match.endReason = reason;
    if (status === "completed") match.result = reason;
    else recordMatchLogEvent("unfinished", "[debug] 勝敗未検出のまま次の記録へ切り替えます。", {}, now);
    flushMatchLogWindow(match);
    match.snapshot = captureMatchLogSnapshot(match);
    state.matchLog.completed.push(match);
    if (state.matchLog.completed.length > MATCH_LOG_CONFIG.completedLimit) state.matchLog.completed.shift();
    state.matchLog.current = null;
  }

  function getMatchLogLabel(match) {
    return match.status === "recording" ? "記録中" : match.status === "completed" ? `完了 ${match.result}` : "勝敗未検出";
  }

  function getMatchLogStatusLines() {
    const logs = [...state.matchLog.completed, ...(state.matchLog.current ? [state.matchLog.current] : [])];
    return logs.length
      ? ["[debug] 試合ログ: debug log export [番号] で保存できます。",
        ...logs.map((match) => `[debug] 試合ログ #${match.id}: ${getMatchLogLabel(match)} / 開始 ${new Date(match.startedAt).toISOString()} / 撮影 ${match.captureCount}回`)]
      : ["[debug] 試合ログ: まだありません。読み込み検出で記録を開始します。"];
  }

  function formatMatchLog(match, now = Date.now(), exportSequence = null) {
    const snapshot = match.snapshot || captureMatchLogSnapshot(match);
    const events = [...new Map([...match.events, ...match.milestones.values()]
      .map((entry) => [entry.sequence, entry])).values()].sort((a, b) => a.sequence - b.sequence);
    const samples = match.sampleDropped
      ? [...match.samples.slice(match.sampleCursor), ...match.samples.slice(0, match.sampleCursor)]
      : [...match.samples];
    if (match.window?.frames) samples.push(match.window);
    const lines = [
      `pokemon-SnapCrop 試合ログ #${match.id}`,
      `識別情報: ${JSON.stringify({ ...match.diagnostic, exportSequence, exportedAt: new Date(now).toISOString(), filePrefix: getDiagnosticFilePrefix(match.diagnostic) })}`,
      `状態: ${getMatchLogLabel(match)}`,
      `アプリ: ${match.version}`,
      `開始: ${new Date(match.startedAt).toISOString()}`,
      `終了: ${match.endedAt === null ? "未確定（記録中）" : new Date(match.endedAt).toISOString()}`,
      `出力: ${new Date(now).toISOString()}`,
      `映像: ${match.video.width}x${match.video.height}`,
      `この試合の撮影: 成功 ${match.captureCount}回 / 処理失敗 ${match.captureFailureCount}回`,
      `参照画像: 自分=${snapshot.references.my.source} / 相手=${snapshot.references.enemy.source}`,
      `検出: ${match.frameCount}回 / 最大間隔 ${formatPerformanceMs(match.maxGapMs)}`,
      `上限による省略: 詳細イベント ${match.eventDropped}件 / 秒単位サマリー ${match.sampleDropped}件（各重要イベント種別の最新記録と全体集計は保持）`,
      "時刻はUTC。スコアは追加画像処理なしで集計。デバッグ画面の全行コピーではありません。",
      "", "--- 試合単位の処理時間 ---",
      ...Object.entries(match.metrics).map(([key, value]) => `${key}: count=${value.count} mean=${formatPerformanceMs(value.totalMs / value.count)} max=${formatPerformanceMs(value.maxMs)} last=${formatPerformanceMs(value.lastMs)}`),
      "", "--- 重要イベント ---",
      ...events.map((entry) => `${new Date(entry.at).toISOString()} ${entry.text} ${JSON.stringify(entry.data)}`),
      "", "--- 約1秒ごとの認識・処理時間（最高coverage時のspill/darkを併記） ---",
      ...samples.map((sample) => `${new Date(sample.startedAt).toISOString()} ${JSON.stringify(sample)}`),
      ...formatPickDiagnosticLog(match.pickDiagnostic),
      ...formatFaintDiagnosticLog(match.faintDiagnostic),
      "", "--- 記録終了時／記録中の現在状態 ---", JSON.stringify(snapshot, null, 2),
      "", "画像・映像は含みません。この記録はページの再読み込み／終了で消去されます。", "",
    ];
    return lines.join("\r\n");
  }

  function exportMatchLog(id = null) {
    const match = id === null ? state.matchLog.current || state.matchLog.completed.at(-1)
      : [state.matchLog.current, ...state.matchLog.completed].find((entry) => entry?.id === id);
    if (!match) {
      appendTerminalEntry(["[error] 対象の試合ログがありません。debug status で保持中の番号を確認できます。"], "error");
      return;
    }
    try {
      const sequence = nextDiagnosticExportSequence(match.diagnostic, "match");
      const text = formatMatchLog(match, Date.now(), sequence);
      const fileName = `${getDiagnosticFilePrefix(match.diagnostic)}__match-${String(sequence).padStart(3, "0")}.txt`;
      downloadBlobFile(new Blob(["\ufeff", text], { type: "text/plain;charset=utf-8" }), fileName);
      appendTerminalEntry([`[system] 試合ログ #${match.id}（${getMatchLogLabel(match)}）を保存しました。`], "success");
    } catch (error) {
      appendTerminalError("[error] 試合ログを保存できませんでした。", error);
    }
  }

  function createAutoSnapState() {
    return {
      enabled: AUTO_SNAP_CONFIG.enabledByDefault,
      frameId: 0,
      frameRequestKind: "",
      monitorActive: false,
      lastFrameAt: 0,
      lastDetectionAt: null,
      lastDetectionGapMs: 0,
      phase: "idle",
      loadingFrames: 0,
      selectionFrames: 0,
      lockedFrames: 0,
      loadingSeenAt: 0,
      loadingLastSeenAt: 0,
      recoveryBattleHudFrames: 0,
      selectionDiagnostics: [],
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
      lastSnapFailed: false,
      detectorCanvas: null,
      detectorContext: null,
      iconDetectorCanvas: null,
      iconDetectorContext: null,
      pickSampleCanvas: null,
      pickSampleContext: null,
      pickOverlay: createPickOverlayState(),
      templates: {
        loading: createPendingAutoTemplate(),
        selectionTimer: createPendingAutoTemplate(),
        waitingTimer: createPendingAutoTemplate(),
      },
    };
  }

  function resetBattleResultDetection(reason = "") {
    state.battleResultDetection = createBattleResultDetectionState(reason || "リセット");
  }

  function resetPickOverlayState(reason = "", options = {}) {
    const { redraw = true, diagnosticContext = null } = options;
    const pickOverlay = state.autoSnap.pickOverlay;
    recordPickDiagnosticEvent("reset", { cause: reason, ordersBefore: [...pickOverlay.ordersByRefIndex],
      pendingBefore: pickOverlay.pendingMatchesByHudIndex.map(copyPickDiagnosticPending) }, diagnosticContext);
    recordFaintDiagnosticEvent("reset", { cause: reason, before: captureFaintDiagnosticState() }, diagnosticContext);
    const hadVisibleOverlay = pickOverlay.ordersByRefIndex?.some(Boolean);
    const hadFaintOverlay = pickOverlay.faintedByRefIndex?.some(Boolean);
    const hadFaintCache = pickOverlay.faintSlotCacheByHudIndex?.some(Boolean);
    const hadPendingMatches = pickOverlay.pendingMatchesByHudIndex?.some(Boolean);
    const hadPendingFaints = pickOverlay.pendingFaintsByHudIndex?.some(Boolean);
    const hadFlashFrames = pickOverlay.flashFramesByRefIndex?.some(Boolean);
    const hadCorrectionFrames = pickOverlay.correctionFramesByRefIndex?.some(Boolean);
    state.autoSnap.pickOverlay = createPickOverlayState(reason || "リセット");
    resetPokemonIconResultNotifications();
    syncStatisticsSelection();
    if (redraw && (hadVisibleOverlay || hadFaintOverlay || hadFaintCache || hadPendingMatches || hadPendingFaints || hadFlashFrames || hadCorrectionFrames) && state.references.enemy && state.mode !== "edit") {
      drawCropPanel("enemy");
    }
  }

  function resetFaintOverlayState(reason = "", options = {}) {
    const { redraw = true } = options;
    const pickOverlay = state.autoSnap.pickOverlay;
    recordFaintDiagnosticEvent("reset", { cause: reason, before: captureFaintDiagnosticState() });
    const hadFainted = pickOverlay.faintedByRefIndex?.some(Boolean);
    const hadPending = pickOverlay.pendingFaintsByHudIndex?.some(Boolean);
    const hadCache = pickOverlay.faintSlotCacheByHudIndex?.some(Boolean);
    pickOverlay.faintedByRefIndex = PICK_OVERLAY_CONFIG.referenceRois.map(() => false);
    pickOverlay.faintSlotCacheByHudIndex = FAINT_DETECTION_CONFIG.hudRois.map(() => null);
    pickOverlay.pendingFaintsByHudIndex = FAINT_DETECTION_CONFIG.hudRois.map(() => null);
    pickOverlay.lastFaintCompareAt = 0;
    pickOverlay.lastFaintSummaries = FAINT_DETECTION_CONFIG.hudRois.map(() => reason || "未評価");
    pickOverlay.lastFaintLogKey = "";
    if (redraw && (hadFainted || hadPending || hadCache) && state.references.enemy && state.mode !== "edit") {
      drawCropPanel("enemy");
    }
    return Boolean(hadFainted || hadPending || hadCache);
  }

  function getPickOverlayNormalizedRect(roi, width, height) {
    return clampAutoRoiCrop(
      {
        x: width * roi.x,
        y: height * roi.y,
        width: width * roi.width,
        height: height * roi.height,
      },
      width,
      height,
    );
  }

  function getPickOverlayOrderLabel(order) {
    return PICK_OVERLAY_ORDER_LABELS[order] || String(order || "");
  }

  function getPickOverlayHudCrop(index) {
    const dimensions = getStreamDimensions();
    const roi = PICK_OVERLAY_CONFIG.hudRois[index];
    if (!dimensions.width || !dimensions.height || !roi) {
      return null;
    }

    return getPickOverlayNormalizedRect(roi, dimensions.width, dimensions.height);
  }

  function getFaintHudRoiCrop(hudIndex, key) {
    const dimensions = getStreamDimensions();
    const roi = FAINT_DETECTION_CONFIG.hudRois[hudIndex]?.[key];
    if (!dimensions.width || !dimensions.height || !roi) {
      return null;
    }

    return getPickOverlayNormalizedRect(roi, dimensions.width, dimensions.height);
  }

  function shouldShowPickOverlayReferenceDebug() {
    return Boolean(
      state.debugMode
      && state.autoSnap.enabled
      && state.mode === "ready"
      && state.references.enemy,
    );
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
      // Autoplay may keep resume() pending until the user interacts with the page.
      // Keep media controls and terminal focus available while audio is suspended.
      void resumeAudioContext();
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
          ...(selectedAudioDeviceId && selectedAudioDeviceId !== AUDIO_PERMISSION_DEVICE_ID
            ? { deviceId: { exact: selectedAudioDeviceId } }
            : {}),
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
    state.audioInputRequestId += 1;
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
    const entry = document.createElement("div");
    entry.className = `terminal-entry terminal-entry--${tone}`;
    entry.textContent = Array.isArray(lines) ? lines.join("\n") : String(lines);
    appendTerminalElement(entry);
  }

  function appendPokemonResultEntry(pokemon) {
    state.statistics?.addManual(pokemon.id);
  }

  function appendTerminalElement(entry) {
    const shouldFollow = shouldForceTerminalAutoscroll() || state.terminalLogAutoFollow;
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
    recordMatchLogEvent("error", Array.isArray(lines) ? lines.join("\n") : String(lines), {
      detail: error ? String(error.message || error).slice(0, MATCH_LOG_CONFIG.textLimit) : "",
    });
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


  function rebuildPokemonSearchIndex(status = state.pokemonSearchStatus) {
    state.pokemonSearchStatus = status;
    const rule = state.statsSettings?.rule;
    const mappings = state.remoteIndex?.statsById;
    const entries = status === "ready" && mappings ? (state.catalog?.pokemon || []).filter((entry) => {
      if (!Object.hasOwn(mappings, entry.id)) return false;
      const mapping = mappings[entry.id];
      if (!mapping?.statsId) return false;
      const available = mapping.availableCurrent;
      return rule ? available?.[rule] === true : available?.Singles === true || available?.Doubles === true;
    }) : [];
    state.pokemonSearchIds = new Set(entries.map((entry) => entry.id));
    state.pokemonSearchIndex = entries.map(buildPokemonSearchEntry);
  }

  function buildPokemonSearchEntry(pokemon) {
    const searchKeys = [];
    addPokemonSearchKey(searchKeys, pokemon.name, "official", 0);
    // A shared Japanese label is equally exact for every declared form. Do not
    // prefer the form without a UI suffix over one with a variant label.
    addPokemonSearchKey(searchKeys, pokemon.displayNameJa, "official", 0);
    addPokemonSearchKey(searchKeys, pokemon.canonicalName, "official", 0);
    addPokemonSearchKey(searchKeys, pokemon.id, "official", 0);
    const aliases = pokemon.aliases || (Array.isArray(pokemon.searchText) ? pokemon.searchText : String(pokemon.searchText || "").split(/\s+/u));
    aliases.forEach((alias, index) => addPokemonSearchKey(searchKeys, alias, "alias", 10 + index));
    return { id: pokemon.id, name: pokemon.name, searchKeys };
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
      return await navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" });
    } catch (error) {
      appendTerminalError("[error] Service Worker の登録に失敗しました。", error);
    }
  }

  async function ensureRemoteCachePolicy() {
    if (!navigator.serviceWorker?.controller) return;
    if (state.remoteCachePolicyReady) return state.remoteCachePolicyReady;
    state.remoteCachePolicyReady = (async () => {
      await state.serviceWorkerReady;
      if (!navigator.serviceWorker.controller) return;
      await new Promise((resolve, reject) => {
        const ports = [];
        const finish = (error) => {
          clearTimeout(timer);
          navigator.serviceWorker.removeEventListener("controllerchange", check);
          ports.forEach((port) => port.close());
          if (error) reject(error); else resolve();
        };
        const check = () => {
          const controller = navigator.serviceWorker.controller;
          if (!controller) { finish(); return; }
          const channel = new MessageChannel(); ports.push(channel.port1);
          channel.port1.onmessage = ({ data }) => {
            if (data?.cacheName === APP_VERSION && data.externalCaching === false) finish();
          };
          controller.postMessage({ type: "remote-cache-policy" }, [channel.port2]);
        };
        const timer = setTimeout(() => finish(new Error("保存方式の更新を確認できませんでした。ページを再読み込みしてください。")), 15000);
        navigator.serviceWorker.addEventListener("controllerchange", check);
        check();
      });
    })().catch((error) => { state.remoteCachePolicyReady = null; throw error; });
    return state.remoteCachePolicyReady;
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
