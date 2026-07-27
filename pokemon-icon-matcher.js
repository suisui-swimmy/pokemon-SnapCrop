export const POKEMON_ICON_MATCHER_VERSION = 2;

export const DEFAULT_MATCHER_CONFIG = Object.freeze({
  sampleWidth: 64,
  sampleHeight: 64,
  alphaThreshold: 24,
  candidatePaddingRatio: 0.18,
  foreground: {
    borderRatio: 0.08,
    sharedBackgroundReliabilityMin: 0.42,
    distanceFloor: 14,
    noiseMultiplier: 2.4,
    softLowMultiplier: 0.72,
    softHighMultiplier: 1.65,
    edgeWeight: 0.22,
    cleanupWeight: 0.38,
    minimumRatio: 0.018,
    maximumRatio: 0.78,
    qualityMin: 0.22,
  },
  scoring: {
    silhouetteWeight: 0.24,
    candidateCoverageWeight: 0.12,
    inputCoverageWeight: 0.12,
    grayWeight: 0.22,
    edgeWeight: 0.20,
    colorWeight: 0.10,
    spillPenaltyWeight: 0.08,
    missingPenaltyWeight: 0.08,
  },
  coarsePixelStride: 2,
  coarseNameLimit: 24,
  templatesPerName: 2,
  refinedResultLimit: 12,
  globalSeedNamesPerSlot: 4,
  globalTransforms: {
    scales: [0.96, 1, 1.04],
    offsets: [-2, 0, 2],
  },
  localTransforms: {
    scaleDeltas: [-0.02, 0, 0.02],
    offsets: [-1, 0, 1],
  },
  assignment: {
    candidatesPerSlot: 10,
    beamWidth: 72,
    speciesDuplicatePenalty: 0.18,
    unresolvedScore: 0.70,
  },
  confidence: {
    scoreMin: 0.74,
    marginMin: 0.035,
    assignmentMarginMin: 0.012,
    silhouetteMin: 0.34,
    spillMax: 0.62,
    missingMax: 0.62,
  },
  yieldEveryCandidates: 32,
});

const resolvedMatcherConfigs = new WeakSet();

export class PokemonIconMatcherCancelledError extends Error {
  constructor(message = "Pokemon icon matching cancelled") {
    super(message);
    this.name = "PokemonIconMatcherCancelledError";
    this.code = "cancelled";
  }
}

export function createPokemonIconRequestGate(initialRequestId = 0) {
  let latestRequestId = Math.max(0, Number(initialRequestId) || 0);
  const cancelledRequestIds = new Set();
  const normalizeRequestId = (requestId) => Math.max(0, Number(requestId) || 0);
  return {
    observe(requestId) {
      const normalized = normalizeRequestId(requestId);
      latestRequestId = Math.max(latestRequestId, normalized);
      return normalized;
    },
    begin(requestId) {
      const normalized = this.observe(requestId);
      cancelledRequestIds.delete(normalized);
      return normalized;
    },
    cancel(requestId) {
      const normalized = normalizeRequestId(requestId);
      cancelledRequestIds.add(normalized);
      if (normalized >= latestRequestId) {
        latestRequestId = normalized + 1;
      }
      return latestRequestId;
    },
    complete(requestId) {
      cancelledRequestIds.delete(normalizeRequestId(requestId));
    },
    reset() {
      latestRequestId += 1;
      cancelledRequestIds.clear();
      return latestRequestId;
    },
    isCurrent(requestId) {
      const normalized = normalizeRequestId(requestId);
      return normalized === latestRequestId && !cancelledRequestIds.has(normalized);
    },
    snapshot() {
      return {
        latestRequestId,
        cancelledRequestIds: [...cancelledRequestIds].sort((left, right) => left - right),
      };
    },
  };
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function mergeConfig(base, override = {}) {
  if (override && typeof override === "object" && resolvedMatcherConfigs.has(override)) {
    return override;
  }
  const merged = {
    ...base,
    ...override,
    foreground: {
      ...base.foreground,
      ...(override.foreground || {}),
    },
    scoring: {
      ...base.scoring,
      ...(override.scoring || {}),
    },
    globalTransforms: {
      ...base.globalTransforms,
      ...(override.globalTransforms || {}),
    },
    localTransforms: {
      ...base.localTransforms,
      ...(override.localTransforms || {}),
    },
    assignment: {
      ...base.assignment,
      ...(override.assignment || {}),
    },
    confidence: {
      ...base.confidence,
      ...(override.confidence || {}),
    },
  };
  resolvedMatcherConfigs.add(merged);
  return merged;
}

function median(values) {
  if (!values.length) {
    return 0;
  }
  const ordered = values.slice().sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}

function smoothstep(edge0, edge1, value) {
  if (edge1 <= edge0) {
    return value >= edge1 ? 1 : 0;
  }
  const ratio = clamp((value - edge0) / (edge1 - edge0));
  return ratio * ratio * (3 - (2 * ratio));
}

function performanceNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function assertRgbaInput(input) {
  if (!input || !Number.isInteger(input.width) || !Number.isInteger(input.height)) {
    throw new TypeError("RGBA input dimensions are invalid");
  }
  if (input.width <= 0 || input.height <= 0 || !input.data) {
    throw new TypeError("RGBA input is empty");
  }
  if (input.data.length !== input.width * input.height * 4) {
    throw new TypeError("RGBA input length does not match dimensions");
  }
}

export function findAlphaBoundingBox(input, alphaThreshold = DEFAULT_MATCHER_CONFIG.alphaThreshold) {
  assertRgbaInput(input);
  let left = input.width;
  let top = input.height;
  let right = -1;
  let bottom = -1;
  let activeCount = 0;
  for (let y = 0; y < input.height; y += 1) {
    for (let x = 0; x < input.width; x += 1) {
      const alpha = input.data[((y * input.width) + x) * 4 + 3];
      if (alpha < alphaThreshold) {
        continue;
      }
      activeCount += 1;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (!activeCount) {
    return null;
  }
  return {
    x: left,
    y: top,
    width: right - left + 1,
    height: bottom - top + 1,
    activeCount,
  };
}

function sampleRgbaBilinear(data, width, height, x, y, channel) {
  if (x < 0 || y < 0 || x > width - 1 || y > height - 1) {
    return 0;
  }
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const topLeft = data[((y0 * width) + x0) * 4 + channel];
  const topRight = data[((y0 * width) + x1) * 4 + channel];
  const bottomLeft = data[((y1 * width) + x0) * 4 + channel];
  const bottomRight = data[((y1 * width) + x1) * 4 + channel];
  const topValue = topLeft + ((topRight - topLeft) * tx);
  const bottomValue = bottomLeft + ((bottomRight - bottomLeft) * tx);
  return topValue + ((bottomValue - topValue) * ty);
}

export function resizeRgba(input, targetWidth, targetHeight, sourceRect = null) {
  assertRgbaInput(input);
  if (!Number.isInteger(targetWidth) || !Number.isInteger(targetHeight) || targetWidth <= 0 || targetHeight <= 0) {
    throw new TypeError("Target dimensions are invalid");
  }
  const rect = sourceRect || {
    x: 0,
    y: 0,
    width: input.width,
    height: input.height,
  };
  const output = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = rect.y + ((((y + 0.5) / targetHeight) * rect.height) - 0.5);
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = rect.x + ((((x + 0.5) / targetWidth) * rect.width) - 0.5);
      const outputIndex = ((y * targetWidth) + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        output[outputIndex + channel] = Math.round(
          sampleRgbaBilinear(input.data, input.width, input.height, sourceX, sourceY, channel),
        );
      }
    }
  }
  return {
    data: output,
    width: targetWidth,
    height: targetHeight,
  };
}

export function normalizeCandidateRgba(input, configOverride = {}) {
  assertRgbaInput(input);
  const config = mergeConfig(DEFAULT_MATCHER_CONFIG, configOverride);
  const bbox = findAlphaBoundingBox(input, config.alphaThreshold);
  if (!bbox) {
    return {
      valid: false,
      reason: "no_alpha_foreground",
      bbox: null,
    };
  }

  const availableWidth = config.sampleWidth * (1 - (config.candidatePaddingRatio * 2));
  const availableHeight = config.sampleHeight * (1 - (config.candidatePaddingRatio * 2));
  const scale = Math.min(availableWidth / bbox.width, availableHeight / bbox.height);
  const drawWidth = Math.max(1, bbox.width * scale);
  const drawHeight = Math.max(1, bbox.height * scale);
  const drawX = (config.sampleWidth - drawWidth) / 2;
  const drawY = (config.sampleHeight - drawHeight) / 2;
  const output = new Uint8ClampedArray(config.sampleWidth * config.sampleHeight * 4);

  for (let y = 0; y < config.sampleHeight; y += 1) {
    for (let x = 0; x < config.sampleWidth; x += 1) {
      if (x + 0.5 < drawX || y + 0.5 < drawY || x + 0.5 >= drawX + drawWidth || y + 0.5 >= drawY + drawHeight) {
        continue;
      }
      const sourceX = bbox.x + ((((x + 0.5 - drawX) / drawWidth) * bbox.width) - 0.5);
      const sourceY = bbox.y + ((((y + 0.5 - drawY) / drawHeight) * bbox.height) - 0.5);
      const outputIndex = ((y * config.sampleWidth) + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        output[outputIndex + channel] = Math.round(
          sampleRgbaBilinear(input.data, input.width, input.height, sourceX, sourceY, channel),
        );
      }
    }
  }

  return {
    valid: true,
    reason: "",
    data: output,
    width: config.sampleWidth,
    height: config.sampleHeight,
    bbox,
    scale,
    normalizedBounds: {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight,
    },
    sourceActiveRatio: bbox.activeCount / (input.width * input.height),
  };
}

export function fingerprintRgba(data) {
  let hashA = 0x811c9dc5;
  let hashB = 0x9e3779b9;
  for (let index = 0; index < data.length; index += 1) {
    hashA ^= data[index];
    hashA = Math.imul(hashA, 0x01000193);
    hashB ^= data[index] + (index & 0xff);
    hashB = Math.imul(hashB, 0x85ebca6b);
  }
  return `rgba:${(hashA >>> 0).toString(16).padStart(8, "0")}${(hashB >>> 0).toString(16).padStart(8, "0")}:${data.length}`;
}

export function equalRgba(left, right) {
  if (!left || !right || left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

function computeEdge(gray, width, height) {
  const edge = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = (y * width) + x;
      const gx = gray[index + 1] - gray[index - 1];
      const gy = gray[index + width] - gray[index - width];
      edge[index] = Math.min(255, Math.sqrt((gx * gx) + (gy * gy)));
    }
  }
  return edge;
}

function buildColorHistogram(cb, cr, mask) {
  const histogram = new Float32Array(64);
  let total = 0;
  for (let index = 0; index < mask.length; index += 1) {
    const weight = mask[index];
    if (weight <= 0) {
      continue;
    }
    const cbBin = Math.min(7, Math.max(0, Math.floor((cb[index] + 128) / 32)));
    const crBin = Math.min(7, Math.max(0, Math.floor((cr[index] + 128) / 32)));
    histogram[(crBin * 8) + cbBin] += weight;
    total += weight;
  }
  if (total > 0) {
    for (let index = 0; index < histogram.length; index += 1) {
      histogram[index] /= total;
    }
  }
  return histogram;
}

function buildFeatureArrays(rgba, width, height, mask) {
  const pixelCount = width * height;
  const gray = new Float32Array(pixelCount);
  const cb = new Float32Array(pixelCount);
  const cr = new Float32Array(pixelCount);
  let maskSum = 0;
  for (let index = 0; index < pixelCount; index += 1) {
    const rgbaIndex = index * 4;
    const red = rgba[rgbaIndex];
    const green = rgba[rgbaIndex + 1];
    const blue = rgba[rgbaIndex + 2];
    const luminance = (red * 0.299) + (green * 0.587) + (blue * 0.114);
    gray[index] = luminance;
    cb[index] = (blue - luminance) * 0.564;
    cr[index] = (red - luminance) * 0.713;
    maskSum += mask[index];
  }
  return {
    width,
    height,
    gray,
    edge: computeEdge(gray, width, height),
    cb,
    cr,
    mask,
    maskSum,
    colorHistogram: buildColorHistogram(cb, cr, mask),
  };
}

export function buildCandidateFeature(normalizedCandidate, configOverride = {}) {
  const config = mergeConfig(DEFAULT_MATCHER_CONFIG, configOverride);
  const mask = new Float32Array(normalizedCandidate.width * normalizedCandidate.height);
  for (let index = 0; index < mask.length; index += 1) {
    const alpha = normalizedCandidate.data[(index * 4) + 3];
    mask[index] = alpha < config.alphaThreshold ? 0 : alpha / 255;
  }
  const feature = buildFeatureArrays(
    normalizedCandidate.data,
    normalizedCandidate.width,
    normalizedCandidate.height,
    mask,
  );
  delete feature.cb;
  delete feature.cr;
  feature.kind = "candidate";
  feature.foregroundRatio = feature.maskSum / mask.length;
  return feature;
}

function getBorderPixelIndexes(width, height, borderRatio) {
  const border = Math.max(1, Math.round(Math.min(width, height) * borderRatio));
  const indexes = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x < border || y < border || x >= width - border || y >= height - border) {
        indexes.push((y * width) + x);
      }
    }
  }
  return indexes;
}

export function estimateBorderBackground(input, configOverride = {}) {
  assertRgbaInput(input);
  const config = mergeConfig(DEFAULT_MATCHER_CONFIG, configOverride);
  const indexes = getBorderPixelIndexes(input.width, input.height, config.foreground.borderRatio);
  const reds = [];
  const greens = [];
  const blues = [];
  indexes.forEach((pixelIndex) => {
    const rgbaIndex = pixelIndex * 4;
    reds.push(input.data[rgbaIndex]);
    greens.push(input.data[rgbaIndex + 1]);
    blues.push(input.data[rgbaIndex + 2]);
  });
  const color = [median(reds), median(greens), median(blues)];
  const distances = indexes.map((pixelIndex) => {
    const rgbaIndex = pixelIndex * 4;
    const redDelta = input.data[rgbaIndex] - color[0];
    const greenDelta = input.data[rgbaIndex + 1] - color[1];
    const blueDelta = input.data[rgbaIndex + 2] - color[2];
    return Math.sqrt((redDelta * redDelta) + (greenDelta * greenDelta) + (blueDelta * blueDelta));
  });
  return {
    color,
    noise: median(distances),
  };
}

export function estimateSharedBackground(inputs, configOverride = {}) {
  const config = mergeConfig(DEFAULT_MATCHER_CONFIG, configOverride);
  if (!Array.isArray(inputs) || inputs.length < 3) {
    return null;
  }
  const resized = inputs.map((input) => {
    assertRgbaInput(input);
    return input.width === config.sampleWidth && input.height === config.sampleHeight
      ? input
      : resizeRgba(input, config.sampleWidth, config.sampleHeight);
  });
  const pixelCount = config.sampleWidth * config.sampleHeight;
  const rgb = new Uint8ClampedArray(pixelCount * 3);
  let deviationTotal = 0;
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    for (let channel = 0; channel < 3; channel += 1) {
      const values = resized.map((input) => input.data[(pixelIndex * 4) + channel]);
      const valueMedian = median(values);
      rgb[(pixelIndex * 3) + channel] = Math.round(valueMedian);
      deviationTotal += median(values.map((value) => Math.abs(value - valueMedian)));
    }
  }
  const meanDeviation = deviationTotal / (pixelCount * 3);
  return {
    width: config.sampleWidth,
    height: config.sampleHeight,
    rgb,
    meanDeviation,
    reliability: clamp(1 - (meanDeviation / 72)),
  };
}

function boxBlurMask(mask, width, height) {
  const output = new Float32Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let total = 0;
      let count = 0;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        const sampleY = y + offsetY;
        if (sampleY < 0 || sampleY >= height) {
          continue;
        }
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const sampleX = x + offsetX;
          if (sampleX < 0 || sampleX >= width) {
            continue;
          }
          total += mask[(sampleY * width) + sampleX];
          count += 1;
        }
      }
      output[(y * width) + x] = count ? total / count : 0;
    }
  }
  return output;
}

export function buildInputFeature(input, sharedBackground = null, configOverride = {}) {
  assertRgbaInput(input);
  const config = mergeConfig(DEFAULT_MATCHER_CONFIG, configOverride);
  const resized = input.width === config.sampleWidth && input.height === config.sampleHeight
    ? {
      data: new Uint8ClampedArray(input.data),
      width: input.width,
      height: input.height,
    }
    : resizeRgba(input, config.sampleWidth, config.sampleHeight);
  const border = estimateBorderBackground(resized, config);
  const pixelCount = resized.width * resized.height;
  const preliminaryGray = new Float32Array(pixelCount);
  for (let index = 0; index < pixelCount; index += 1) {
    const rgbaIndex = index * 4;
    preliminaryGray[index] = (resized.data[rgbaIndex] * 0.299)
      + (resized.data[rgbaIndex + 1] * 0.587)
      + (resized.data[rgbaIndex + 2] * 0.114);
  }
  const preliminaryEdge = computeEdge(preliminaryGray, resized.width, resized.height);
  const threshold = Math.max(
    config.foreground.distanceFloor,
    border.noise * config.foreground.noiseMultiplier,
  );
  const useShared = Boolean(
    sharedBackground
    && sharedBackground.width === resized.width
    && sharedBackground.height === resized.height
    && sharedBackground.reliability >= config.foreground.sharedBackgroundReliabilityMin
  );
  const rawMask = new Float32Array(pixelCount);
  let contrastTotal = 0;
  for (let index = 0; index < pixelCount; index += 1) {
    const rgbaIndex = index * 4;
    const red = resized.data[rgbaIndex];
    const green = resized.data[rgbaIndex + 1];
    const blue = resized.data[rgbaIndex + 2];
    const borderDistance = Math.sqrt(
      ((red - border.color[0]) ** 2)
      + ((green - border.color[1]) ** 2)
      + ((blue - border.color[2]) ** 2),
    );
    let backgroundDistance = borderDistance;
    if (useShared) {
      const sharedIndex = index * 3;
      const sharedDistance = Math.sqrt(
        ((red - sharedBackground.rgb[sharedIndex]) ** 2)
        + ((green - sharedBackground.rgb[sharedIndex + 1]) ** 2)
        + ((blue - sharedBackground.rgb[sharedIndex + 2]) ** 2),
      );
      backgroundDistance = (sharedDistance * sharedBackground.reliability)
        + (borderDistance * (1 - sharedBackground.reliability));
    }
    const differenceMask = smoothstep(
      threshold * config.foreground.softLowMultiplier,
      threshold * config.foreground.softHighMultiplier,
      backgroundDistance,
    );
    const edgeMask = smoothstep(8, 52, preliminaryEdge[index]);
    rawMask[index] = clamp(
      (differenceMask * (1 - config.foreground.edgeWeight))
      + (edgeMask * config.foreground.edgeWeight),
    );
    contrastTotal += backgroundDistance * rawMask[index];
  }
  const blurred = boxBlurMask(rawMask, resized.width, resized.height);
  const mask = new Float32Array(pixelCount);
  for (let index = 0; index < pixelCount; index += 1) {
    const neighborhood = blurred[index];
    let cleaned = (rawMask[index] * (1 - config.foreground.cleanupWeight))
      + (neighborhood * config.foreground.cleanupWeight);
    if (neighborhood < 0.10) {
      cleaned *= 0.25;
    }
    mask[index] = clamp(cleaned);
  }
  const feature = buildFeatureArrays(resized.data, resized.width, resized.height, mask);
  delete feature.cb;
  delete feature.cr;
  const foregroundRatio = feature.maskSum / pixelCount;
  const contrast = feature.maskSum ? contrastTotal / feature.maskSum : 0;
  const minimumQuality = smoothstep(
    config.foreground.minimumRatio * 0.5,
    config.foreground.minimumRatio * 2.5,
    foregroundRatio,
  );
  const maximumQuality = 1 - smoothstep(
    config.foreground.maximumRatio - 0.15,
    config.foreground.maximumRatio,
    foregroundRatio,
  );
  const contrastQuality = smoothstep(threshold * 0.8, threshold * 2.2, contrast);
  const noiseQuality = 1 - smoothstep(24, 72, border.noise);
  const quality = clamp(minimumQuality * maximumQuality * contrastQuality * (0.65 + (noiseQuality * 0.35)));
  feature.kind = "input";
  feature.foregroundRatio = foregroundRatio;
  feature.foregroundQuality = quality;
  feature.background = {
    source: useShared ? "shared_median" : "border",
    borderColor: border.color,
    borderNoise: border.noise,
    sharedReliability: sharedBackground?.reliability || 0,
    threshold,
    contrast,
  };
  feature.rgba = resized.data;
  return feature;
}

function sampleFeatureArray(values, width, height, x, y) {
  if (x < 0 || y < 0 || x > width - 1 || y > height - 1) {
    return 0;
  }
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const topValue = values[(y0 * width) + x0]
    + ((values[(y0 * width) + x1] - values[(y0 * width) + x0]) * tx);
  const bottomValue = values[(y1 * width) + x0]
    + ((values[(y1 * width) + x1] - values[(y1 * width) + x0]) * tx);
  return topValue + ((bottomValue - topValue) * ty);
}

function correlationFromSums(sumWeight, sumLeft, sumRight, sumLeftSquared, sumRightSquared, sumProduct) {
  if (sumWeight <= 1e-6) {
    return 0.5;
  }
  const covariance = sumProduct - ((sumLeft * sumRight) / sumWeight);
  const leftVariance = Math.max(0, sumLeftSquared - ((sumLeft * sumLeft) / sumWeight));
  const rightVariance = Math.max(0, sumRightSquared - ((sumRight * sumRight) / sumWeight));
  const denominator = Math.sqrt(leftVariance * rightVariance);
  if (denominator <= 1e-6) {
    return 0.5;
  }
  return (clamp(covariance / denominator, -1, 1) + 1) / 2;
}

function histogramIntersection(left, right) {
  if (!left || !right || left.length !== right.length) {
    return 0.5;
  }
  let total = 0;
  for (let index = 0; index < left.length; index += 1) {
    total += Math.min(left[index], right[index]);
  }
  return clamp(total);
}

export function scoreFeaturePair(inputFeature, candidateFeature, transform = {}, configOverride = {}) {
  const config = mergeConfig(DEFAULT_MATCHER_CONFIG, configOverride);
  const scale = Number(transform.scale) || 1;
  const offsetX = Number(transform.offsetX) || 0;
  const offsetY = Number(transform.offsetY) || 0;
  const pixelStride = Math.max(1, Math.round(Number(transform.pixelStride) || 1));
  const identityTransform = scale === 1
    && offsetX === 0
    && offsetY === 0
    && inputFeature.width === candidateFeature.width
    && inputFeature.height === candidateFeature.height;
  const centerX = (inputFeature.width - 1) / 2;
  const centerY = (inputFeature.height - 1) / 2;
  let inputSum = 0;
  let candidateSum = 0;
  let intersection = 0;
  let overlapWeight = 0;
  let grayLeft = 0;
  let grayRight = 0;
  let grayLeftSquared = 0;
  let grayRightSquared = 0;
  let grayProduct = 0;
  let edgeLeft = 0;
  let edgeRight = 0;
  let edgeLeftSquared = 0;
  let edgeRightSquared = 0;
  let edgeProduct = 0;

  for (let y = 0; y < inputFeature.height; y += pixelStride) {
    for (let x = 0; x < inputFeature.width; x += pixelStride) {
      const inputIndex = (y * inputFeature.width) + x;
      const sourceX = ((x - centerX - offsetX) / scale) + centerX;
      const sourceY = ((y - centerY - offsetY) / scale) + centerY;
      const inputMask = inputFeature.mask[inputIndex];
      const candidateMask = identityTransform
        ? candidateFeature.mask[inputIndex]
        : sampleFeatureArray(
          candidateFeature.mask,
          candidateFeature.width,
          candidateFeature.height,
          sourceX,
          sourceY,
        );
      const overlap = inputMask * candidateMask;
      inputSum += inputMask;
      candidateSum += candidateMask;
      intersection += overlap;
      if (overlap <= 1e-5) {
        continue;
      }
      const candidateGray = identityTransform
        ? candidateFeature.gray[inputIndex]
        : sampleFeatureArray(
          candidateFeature.gray,
          candidateFeature.width,
          candidateFeature.height,
          sourceX,
          sourceY,
        );
      const candidateEdge = identityTransform
        ? candidateFeature.edge[inputIndex]
        : sampleFeatureArray(
          candidateFeature.edge,
          candidateFeature.width,
          candidateFeature.height,
          sourceX,
          sourceY,
        );
      const inputGray = inputFeature.gray[inputIndex];
      const inputEdge = inputFeature.edge[inputIndex];
      overlapWeight += overlap;
      grayLeft += inputGray * overlap;
      grayRight += candidateGray * overlap;
      grayLeftSquared += inputGray * inputGray * overlap;
      grayRightSquared += candidateGray * candidateGray * overlap;
      grayProduct += inputGray * candidateGray * overlap;
      edgeLeft += inputEdge * overlap;
      edgeRight += candidateEdge * overlap;
      edgeLeftSquared += inputEdge * inputEdge * overlap;
      edgeRightSquared += candidateEdge * candidateEdge * overlap;
      edgeProduct += inputEdge * candidateEdge * overlap;
    }
  }

  const silhouette = (inputSum + candidateSum) > 0
    ? clamp((2 * intersection) / (inputSum + candidateSum))
    : 0;
  const candidateCoverage = candidateSum > 0 ? clamp(intersection / candidateSum) : 0;
  const inputCoverage = inputSum > 0 ? clamp(intersection / inputSum) : 0;
  const spill = clamp(1 - inputCoverage);
  const missing = clamp(1 - candidateCoverage);
  const gray = correlationFromSums(
    overlapWeight,
    grayLeft,
    grayRight,
    grayLeftSquared,
    grayRightSquared,
    grayProduct,
  );
  const edge = correlationFromSums(
    overlapWeight,
    edgeLeft,
    edgeRight,
    edgeLeftSquared,
    edgeRightSquared,
    edgeProduct,
  );
  const color = histogramIntersection(inputFeature.colorHistogram, candidateFeature.colorHistogram);
  const weights = config.scoring;
  const positive = (silhouette * weights.silhouetteWeight)
    + (candidateCoverage * weights.candidateCoverageWeight)
    + (inputCoverage * weights.inputCoverageWeight)
    + (gray * weights.grayWeight)
    + (edge * weights.edgeWeight)
    + (color * weights.colorWeight);
  const penalty = (spill * weights.spillPenaltyWeight)
    + (missing * weights.missingPenaltyWeight);

  return {
    score: clamp(positive - penalty),
    silhouette,
    candidateCoverage,
    inputCoverage,
    coverage: candidateCoverage,
    spill,
    missing,
    gray,
    edge,
    color,
    transform: {
      scale,
      offsetX,
      offsetY,
    },
  };
}

export function legacyScoreFeaturePair(inputFeature, candidateFeature) {
  const score = scoreFeaturePair(inputFeature, candidateFeature, {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const shape = (score.gray * 0.78) + (score.edge * 0.22);
  return {
    ...score,
    score: clamp((shape * 0.84) + (score.color * 0.16)),
    shape,
  };
}

function compareTemplateResults(left, right) {
  const scoreDifference = right.score - left.score;
  if (Math.abs(scoreDifference) > 0.004) {
    return scoreDifference;
  }
  const sourcePriority = {
    champions: 0,
    sv: 1,
  };
  const sourceDifference = (sourcePriority[left.source] ?? 99) - (sourcePriority[right.source] ?? 99);
  if (sourceDifference !== 0) {
    return sourceDifference;
  }
  if (scoreDifference !== 0) {
    return scoreDifference;
  }
  return String(left.id || "").localeCompare(String(right.id || ""), "en");
}

export function groupTemplateScoresByPokemonName(templateResults, options = {}) {
  const templatesPerName = Number(options.templatesPerName) || DEFAULT_MATCHER_CONFIG.templatesPerName;
  const grouped = new Map();
  templateResults.forEach((result) => {
    const entries = grouped.get(result.pokemonName) || [];
    entries.push(result);
    grouped.set(result.pokemonName, entries);
  });
  return [...grouped.entries()]
    .map(([pokemonName, entries]) => {
      const templates = entries.slice().sort(compareTemplateResults).slice(0, templatesPerName);
      return {
        pokemonName,
        speciesKey: templates[0]?.speciesKey || "",
        score: templates[0]?.score || 0,
        bestTemplate: templates[0] || null,
        templates,
      };
    })
    .sort((left, right) => {
      const result = compareTemplateResults(left.bestTemplate || {}, right.bestTemplate || {});
      if (result !== 0) {
        return result;
      }
      return left.pokemonName.localeCompare(right.pokemonName, "ja");
    });
}

function getTransformGrid(scales, offsets) {
  const transforms = [];
  scales.forEach((scale) => {
    offsets.forEach((offsetY) => {
      offsets.forEach((offsetX) => {
        transforms.push({ scale, offsetX, offsetY });
      });
    });
  });
  return transforms;
}

async function maybeYield(context, counter) {
  if (context.isCancelled?.()) {
    throw new PokemonIconMatcherCancelledError();
  }
  if (counter % context.yieldEvery !== 0) {
    return;
  }
  await context.yieldControl();
  if (context.isCancelled?.()) {
    throw new PokemonIconMatcherCancelledError();
  }
}

function simplifyCandidateResult(result) {
  if (!result) {
    return null;
  }
  return {
    pokemonName: result.pokemonName,
    speciesKey: result.speciesKey,
    id: result.id,
    source: result.source,
    score: result.score,
    silhouette: result.silhouette,
    candidateCoverage: result.candidateCoverage,
    inputCoverage: result.inputCoverage,
    spill: result.spill,
    missing: result.missing,
    gray: result.gray,
    edge: result.edge,
    color: result.color,
    sourceAgreement: result.sourceAgreement,
    supportingTemplateCount: result.supportingTemplateCount,
    transform: result.transform,
    visualCollisionId: result.visualCollisionId || result.runtimeVisualCollisionId || null,
  };
}

async function coarseRankSlot(inputFeature, candidates, config, context) {
  const templateResults = [];
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const score = scoreFeaturePair(inputFeature, candidate.feature, {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      pixelStride: config.coarsePixelStride,
    }, config);
    templateResults.push({
      ...candidate,
      ...score,
    });
    await maybeYield(context, index + 1);
  }
  return groupTemplateScoresByPokemonName(templateResults, {
    templatesPerName: config.templatesPerName,
  });
}

async function estimateGlobalTransform(inputFeatures, coarseRankings, config, context) {
  const transforms = getTransformGrid(
    config.globalTransforms.scales,
    config.globalTransforms.offsets,
  );
  const summaries = [];
  let comparisonCount = 0;
  for (const transform of transforms) {
    let totalScore = 0;
    let contributingSlots = 0;
    for (let slotIndex = 0; slotIndex < inputFeatures.length; slotIndex += 1) {
      const seeds = coarseRankings[slotIndex]
        .slice(0, config.globalSeedNamesPerSlot)
        .flatMap((entry) => entry.templates.slice(0, 1));
      let bestScore = 0;
      for (const seed of seeds) {
        const score = scoreFeaturePair(inputFeatures[slotIndex], seed.feature, transform, config).score;
        bestScore = Math.max(bestScore, score);
        comparisonCount += 1;
        await maybeYield(context, comparisonCount);
      }
      if (seeds.length) {
        totalScore += bestScore;
        contributingSlots += 1;
      }
    }
    summaries.push({
      transform,
      score: contributingSlots ? totalScore / contributingSlots : 0,
    });
  }
  summaries.sort((left, right) => right.score - left.score);
  return {
    best: summaries[0]?.transform || {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    },
    top: summaries.slice(0, 8),
    comparisonCount,
  };
}

function getLocalTransformGrid(globalTransform, config) {
  const transforms = [];
  const corrections = [{ scaleDelta: 0, offsetX: 0, offsetY: 0 }];
  config.localTransforms.scaleDeltas
    .filter((scaleDelta) => scaleDelta !== 0)
    .forEach((scaleDelta) => {
      corrections.push({ scaleDelta, offsetX: 0, offsetY: 0 });
    });
  config.localTransforms.offsets
    .filter((offset) => offset !== 0)
    .forEach((offset) => {
      corrections.push(
        { scaleDelta: 0, offsetX: offset, offsetY: 0 },
        { scaleDelta: 0, offsetX: 0, offsetY: offset },
      );
    });
  corrections.forEach((localCorrection) => {
    transforms.push({
      scale: globalTransform.scale * (1 + localCorrection.scaleDelta),
      offsetX: globalTransform.offsetX + localCorrection.offsetX,
      offsetY: globalTransform.offsetY + localCorrection.offsetY,
      localCorrection,
    });
  });
  return transforms;
}

async function refineSlot(inputFeature, coarseRanking, globalTransform, config, context) {
  const transforms = getLocalTransformGrid(globalTransform, config);
  const refinedNames = [];
  let comparisonCount = 0;
  for (const coarseName of coarseRanking.slice(0, config.coarseNameLimit)) {
    const templateResults = [];
    for (const template of coarseName.templates.slice(0, config.templatesPerName)) {
      let best = null;
      for (const transform of transforms) {
        const score = scoreFeaturePair(inputFeature, template.feature, transform, config);
        const result = {
          ...template,
          ...score,
          localCorrection: transform.localCorrection,
        };
        if (!best || compareTemplateResults(result, best) < 0) {
          best = result;
        }
        comparisonCount += 1;
        await maybeYield(context, comparisonCount);
      }
      if (best) {
        templateResults.push(best);
      }
    }
    templateResults.sort(compareTemplateResults);
    const bestTemplate = templateResults[0];
    if (!bestTemplate) {
      continue;
    }
    const sources = new Set(templateResults.map((entry) => entry.source));
    const supportingTemplateCount = templateResults.filter(
      (entry) => bestTemplate.score - entry.score <= 0.035,
    ).length;
    refinedNames.push({
      ...bestTemplate,
      templates: templateResults,
      sourceAgreement: sources.size > 1 && supportingTemplateCount > 1 ? 1 : 0.5,
      supportingTemplateCount,
      coarseScore: coarseName.score,
    });
  }
  refinedNames.sort(compareTemplateResults);
  return {
    results: refinedNames.slice(0, config.refinedResultLimit),
    comparisonCount,
  };
}

function assignmentKey(choices) {
  return choices.map((choice) => choice?.pokemonName || "-").join("|");
}

export function assignPartyCandidates(slotRankings, configOverride = {}) {
  const config = mergeConfig(DEFAULT_MATCHER_CONFIG, configOverride);
  let beam = [{
    choices: [],
    totalScore: 0,
    speciesCounts: new Map(),
    duplicatePenalty: 0,
  }];
  slotRankings.forEach((ranking) => {
    const credible = ranking
      .slice(0, config.assignment.candidatesPerSlot)
      .filter((candidate) => !candidate.visualCollisionId && !candidate.runtimeVisualCollisionId);
    const options = [
      ...credible,
      {
        pokemonName: "",
        speciesKey: "",
        score: config.assignment.unresolvedScore,
        unresolved: true,
      },
    ];
    const nextBeam = [];
    beam.forEach((state) => {
      options.forEach((option) => {
        const speciesCounts = new Map(state.speciesCounts);
        const previousCount = option.speciesKey ? (speciesCounts.get(option.speciesKey) || 0) : 0;
        const duplicatePenalty = option.speciesKey && previousCount > 0
          ? config.assignment.speciesDuplicatePenalty
          : 0;
        if (option.speciesKey) {
          speciesCounts.set(option.speciesKey, previousCount + 1);
        }
        nextBeam.push({
          choices: [...state.choices, option],
          totalScore: state.totalScore + option.score - duplicatePenalty,
          speciesCounts,
          duplicatePenalty: state.duplicatePenalty + duplicatePenalty,
        });
      });
    });
    const deduplicated = new Map();
    nextBeam
      .sort((left, right) => right.totalScore - left.totalScore)
      .forEach((state) => {
        const key = assignmentKey(state.choices);
        if (!deduplicated.has(key)) {
          deduplicated.set(key, state);
        }
      });
    beam = [...deduplicated.values()]
      .sort((left, right) => right.totalScore - left.totalScore)
      .slice(0, config.assignment.beamWidth);
  });
  const best = beam[0] || {
    choices: slotRankings.map(() => null),
    totalScore: 0,
    duplicatePenalty: 0,
  };
  const second = beam.find((state) => assignmentKey(state.choices) !== assignmentKey(best.choices)) || null;
  const slotMargins = best.choices.map((choice, slotIndex) => {
    const pokemonName = choice?.pokemonName || "";
    const alternative = beam.find(
      (state) => (state.choices[slotIndex]?.pokemonName || "") !== pokemonName,
    );
    return alternative ? best.totalScore - alternative.totalScore : best.totalScore;
  });
  return {
    best,
    second,
    margin: second ? best.totalScore - second.totalScore : best.totalScore,
    slotMargins,
    evaluatedBeamCount: beam.length,
  };
}

function getRejectionReason({
  selected,
  bestLocal,
  localMargin,
  assignmentMargin,
  inputFeature,
  config,
}) {
  if (inputFeature.foregroundQuality < config.foreground.qualityMin) {
    return "poor_foreground";
  }
  if (!bestLocal) {
    return "no_candidate";
  }
  if (bestLocal.visualCollisionId || bestLocal.runtimeVisualCollisionId) {
    return "visual_collision";
  }
  if (!selected?.pokemonName) {
    if (bestLocal.score >= config.confidence.scoreMin) {
      return "species_conflict";
    }
    return "low_score";
  }
  if (selected.score < config.confidence.scoreMin) {
    return "low_score";
  }
  if (selected.silhouette < config.confidence.silhouetteMin) {
    return "poor_foreground";
  }
  if (selected.spill > config.confidence.spillMax) {
    return "excessive_spill";
  }
  if (selected.missing > config.confidence.missingMax) {
    return "excessive_missing";
  }
  if (localMargin < config.confidence.marginMin) {
    return "low_margin";
  }
  if (assignmentMargin < config.confidence.assignmentMarginMin) {
    return "low_assignment_margin";
  }
  return "";
}

export function encodeMaskRle(mask) {
  if (!mask?.length) {
    return [];
  }
  const output = [];
  let previous = Math.round(clamp(mask[0]) * 255);
  let count = 1;
  for (let index = 1; index < mask.length; index += 1) {
    const value = Math.round(clamp(mask[index]) * 255);
    if (value === previous && count < 65535) {
      count += 1;
      continue;
    }
    output.push(previous, count);
    previous = value;
    count = 1;
  }
  output.push(previous, count);
  return output;
}

export function decodeMaskRle(encoded, expectedLength = 0) {
  const output = [];
  for (let index = 0; index < encoded.length; index += 2) {
    const value = (Number(encoded[index]) || 0) / 255;
    const count = Number(encoded[index + 1]) || 0;
    for (let runIndex = 0; runIndex < count; runIndex += 1) {
      output.push(value);
    }
  }
  if (expectedLength && output.length !== expectedLength) {
    throw new Error(`Mask RLE length mismatch: expected ${expectedLength}, got ${output.length}`);
  }
  return new Float32Array(output);
}

export async function recognizePokemonIconParty(slotInputs, candidates, options = {}) {
  const config = mergeConfig(DEFAULT_MATCHER_CONFIG, options.config || {});
  const yieldControl = options.yieldControl || (() => Promise.resolve());
  const context = {
    yieldControl,
    isCancelled: options.isCancelled || (() => false),
    yieldEvery: Math.max(1, Number(config.yieldEveryCandidates) || 32),
  };
  const startedAt = performanceNow();
  if (!Array.isArray(slotInputs) || slotInputs.length !== 6) {
    throw new TypeError("Exactly six slot inputs are required");
  }
  if (!Array.isArray(candidates) || !candidates.length) {
    throw new TypeError("At least one preprocessed candidate is required");
  }
  const resizedInputs = slotInputs.map((input) => (
    input.width === config.sampleWidth && input.height === config.sampleHeight
      ? input
      : resizeRgba(input, config.sampleWidth, config.sampleHeight)
  ));
  const sharedBackgroundStartedAt = performanceNow();
  const sharedBackground = estimateSharedBackground(resizedInputs, config);
  const inputFeatures = resizedInputs.map((input) => buildInputFeature(input, sharedBackground, config));
  const foregroundMs = performanceNow() - sharedBackgroundStartedAt;

  const coarseStartedAt = performanceNow();
  const coarseRankings = [];
  const coarseSlotDurations = [];
  for (let slotIndex = 0; slotIndex < inputFeatures.length; slotIndex += 1) {
    const slotStartedAt = performanceNow();
    coarseRankings.push(await coarseRankSlot(inputFeatures[slotIndex], candidates, config, context));
    coarseSlotDurations.push(performanceNow() - slotStartedAt);
  }
  const coarseMs = performanceNow() - coarseStartedAt;

  const globalStartedAt = performanceNow();
  const globalTransform = await estimateGlobalTransform(inputFeatures, coarseRankings, config, context);
  const globalTransformMs = performanceNow() - globalStartedAt;

  const refineStartedAt = performanceNow();
  const refinedRankings = [];
  const refineSlotDurations = [];
  const refineComparisonsBySlot = [];
  for (let slotIndex = 0; slotIndex < inputFeatures.length; slotIndex += 1) {
    const slotStartedAt = performanceNow();
    const refined = await refineSlot(
      inputFeatures[slotIndex],
      coarseRankings[slotIndex],
      globalTransform.best,
      config,
      context,
    );
    refinedRankings.push(refined.results);
    refineComparisonsBySlot.push(refined.comparisonCount);
    refineSlotDurations.push(performanceNow() - slotStartedAt);
  }
  const refineMs = performanceNow() - refineStartedAt;

  const assignmentStartedAt = performanceNow();
  const assignment = assignPartyCandidates(refinedRankings, config);
  const assignmentMs = performanceNow() - assignmentStartedAt;
  const results = refinedRankings.map((ranking, slotIndex) => {
    const selected = assignment.best.choices[slotIndex] || null;
    const bestLocal = ranking[0] || null;
    const selectedResult = selected?.pokemonName
      ? ranking.find((candidate) => candidate.pokemonName === selected.pokemonName) || selected
      : null;
    const alternative = ranking.find(
      (candidate) => candidate.pokemonName !== (selectedResult?.pokemonName || bestLocal?.pokemonName),
    );
    const localMargin = selectedResult
      ? selectedResult.score - (alternative?.score || 0)
      : (bestLocal?.score || 0) - (ranking[1]?.score || 0);
    const assignmentMargin = assignment.slotMargins[slotIndex] ?? assignment.margin;
    const rejectionReason = getRejectionReason({
      selected: selectedResult,
      bestLocal,
      localMargin,
      assignmentMargin,
      inputFeature: inputFeatures[slotIndex],
      config,
    });
    const matched = Boolean(selectedResult?.pokemonName && !rejectionReason);
    const display = selectedResult || bestLocal;
    return {
      matched,
      pokemonName: matched ? display.pokemonName : "",
      bestPokemonName: display?.pokemonName || "",
      speciesKey: display?.speciesKey || "",
      bestId: display?.id || "",
      templateId: display?.id || "",
      bestSource: display?.source || "",
      bestScore: display?.score || 0,
      score: display?.score || 0,
      silhouette: display?.silhouette || 0,
      candidateCoverage: display?.candidateCoverage || 0,
      inputCoverage: display?.inputCoverage || 0,
      coverage: display?.candidateCoverage || 0,
      spill: display?.spill || 0,
      missing: display?.missing || 0,
      gray: display?.gray || 0,
      edge: display?.edge || 0,
      color: display?.color || 0,
      sourceAgreement: display?.sourceAgreement || 0,
      supportingTemplateCount: display?.supportingTemplateCount || 0,
      margin: localMargin,
      localMargin,
      assignmentMargin,
      globalAssignmentMargin: assignment.margin,
      globalTransform: globalTransform.best,
      localCorrection: display?.localCorrection || {
        scaleDelta: 0,
        offsetX: 0,
        offsetY: 0,
      },
      rejectionReason,
      foregroundQuality: inputFeatures[slotIndex].foregroundQuality,
      foregroundRatio: inputFeatures[slotIndex].foregroundRatio,
      foregroundSource: inputFeatures[slotIndex].background.source,
      foregroundMaskRle: encodeMaskRle(inputFeatures[slotIndex].mask),
      coarseTopCandidates: coarseRankings[slotIndex]
        .slice(0, 48)
        .map((entry) => simplifyCandidateResult(entry.bestTemplate)),
      refinedTopCandidates: ranking.map(simplifyCandidateResult),
      transformSearchCount: (
        globalTransform.comparisonCount
        + refineComparisonsBySlot[slotIndex]
      ),
      durationMs: coarseSlotDurations[slotIndex] + refineSlotDurations[slotIndex],
    };
  });

  return {
    version: POKEMON_ICON_MATCHER_VERSION,
    results,
    assignment: {
      pokemonNames: assignment.best.choices.map((choice) => choice?.pokemonName || ""),
      speciesKeys: assignment.best.choices.map((choice) => choice?.speciesKey || ""),
      score: assignment.best.totalScore,
      secondScore: assignment.second?.totalScore || 0,
      margin: assignment.margin,
      slotMargins: assignment.slotMargins,
      duplicatePenalty: assignment.best.duplicatePenalty,
      evaluatedBeamCount: assignment.evaluatedBeamCount,
    },
    globalTransform: {
      ...globalTransform.best,
      top: globalTransform.top,
      searchCount: globalTransform.comparisonCount,
    },
    timings: {
      foregroundMs,
      coarseMs,
      globalTransformMs,
      refineMs,
      assignmentMs,
      slotMs: results.map((result) => result.durationMs),
      totalMs: performanceNow() - startedAt,
    },
    config,
  };
}
