import assert from "node:assert/strict";
import test from "node:test";
import {
  assignPartyCandidates,
  buildCandidateFeature,
  buildInputFeature,
  DEFAULT_MATCHER_CONFIG,
  equalRgba,
  fingerprintRgba,
  findAlphaBoundingBox,
  groupTemplateScoresByPokemonName,
  normalizeCandidateRgba,
  recognizePokemonIconParty,
  scoreFeaturePair,
} from "../pokemon-icon-matcher.js";

function createRgba(width, height, fill = [0, 0, 0, 0]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    data.set(fill, index * 4);
  }
  return { data, width, height };
}

function setPixel(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
    return;
  }
  image.data.set(color, ((y * image.width) + x) * 4);
}

function drawShape(image, shape, color = [225, 90, 70, 255]) {
  const centerX = (image.width - 1) / 2;
  const centerY = (image.height - 1) / 2;
  const radius = Math.min(image.width, image.height) * 0.30;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const deltaX = x - centerX;
      const deltaY = y - centerY;
      let active = false;
      if (shape === "circle") {
        active = (deltaX * deltaX) + (deltaY * deltaY) <= radius * radius;
      } else if (shape === "square") {
        active = Math.abs(deltaX) <= radius && Math.abs(deltaY) <= radius;
      } else if (shape === "diamond") {
        active = Math.abs(deltaX) + Math.abs(deltaY) <= radius * 1.35;
      } else if (shape === "plus") {
        active = (
          (Math.abs(deltaX) <= radius * 0.28 && Math.abs(deltaY) <= radius)
          || (Math.abs(deltaY) <= radius * 0.28 && Math.abs(deltaX) <= radius)
        );
      } else if (shape === "diagonal") {
        active = Math.abs(deltaY - deltaX) <= radius * 0.32
          && Math.abs(deltaX) <= radius
          && Math.abs(deltaY) <= radius;
      } else if (shape === "triangle") {
        const normalizedY = (deltaY + radius) / (radius * 2);
        active = normalizedY >= 0
          && normalizedY <= 1
          && Math.abs(deltaX) <= normalizedY * radius;
      } else if (shape === "bars") {
        active = (
          (Math.abs(deltaX - (radius * 0.5)) <= radius * 0.22)
          || (Math.abs(deltaX + (radius * 0.5)) <= radius * 0.22)
        ) && Math.abs(deltaY) <= radius;
      }
      if (active) {
        setPixel(image, x, y, color);
      }
    }
  }
  return image;
}

function makeCandidate(shape, color, padding = 0) {
  const image = createRgba(80 + padding, 72 + padding);
  drawShape(image, shape, color);
  const normalized = normalizeCandidateRgba(image);
  assert.equal(normalized.valid, true);
  return {
    normalized,
    feature: buildCandidateFeature(normalized),
  };
}

function compositeCandidate(normalized, options = {}) {
  const {
    background = [28, 36, 48, 255],
    brightness = 1,
    tint = [0, 0, 0],
    scale = 1,
    offsetX = 0,
    offsetY = 0,
    extraForeground = null,
  } = options;
  const output = createRgba(normalized.width, normalized.height, background);
  const centerX = (normalized.width - 1) / 2;
  const centerY = (normalized.height - 1) / 2;
  for (let y = 0; y < normalized.height; y += 1) {
    for (let x = 0; x < normalized.width; x += 1) {
      const sourceX = ((x - centerX - offsetX) / scale) + centerX;
      const sourceY = ((y - centerY - offsetY) / scale) + centerY;
      if (sourceX < 0 || sourceY < 0 || sourceX >= normalized.width || sourceY >= normalized.height) {
        continue;
      }
      const sourceIndex = ((sourceY * normalized.width) + sourceX) * 4;
      const alpha = normalized.data[sourceIndex + 3] / 255;
      if (alpha <= 0) {
        continue;
      }
      const targetIndex = ((y * output.width) + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const foreground = clampByte((normalized.data[sourceIndex + channel] * brightness) + tint[channel]);
        output.data[targetIndex + channel] = Math.round(
          (foreground * alpha) + (background[channel] * (1 - alpha)),
        );
      }
      output.data[targetIndex + 3] = 255;
    }
  }
  if (extraForeground) {
    for (let y = extraForeground.y; y < extraForeground.y + extraForeground.height; y += 1) {
      for (let x = extraForeground.x; x < extraForeground.x + extraForeground.width; x += 1) {
        setPixel(output, x, y, extraForeground.color || [240, 220, 80, 255]);
      }
    }
  }
  return output;
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function candidateRecord(index, shape, color, overrides = {}) {
  const prepared = makeCandidate(shape, color, index % 2 ? 8 : 0);
  return {
    id: `candidate-${index}`,
    pokemonName: `ポケモン${index}`,
    speciesKey: `species:pokemon-${index}`,
    variantKey: `variant:pokemon-${index}`,
    source: index % 2 ? "sv" : "champions",
    visualCollisionId: null,
    runtimeVisualCollisionId: null,
    feature: prepared.feature,
    normalizedRgba: prepared.normalized.data,
    normalized: prepared.normalized,
    ...overrides,
  };
}

test("alpha bbox normalization removes transparent-padding differences", () => {
  const compactSource = createRgba(80, 72);
  const paddedSource = createRgba(112, 104);
  for (let y = 18; y < 54; y += 1) {
    for (let x = 22; x < 58; x += 1) {
      if (Math.abs(x - 39.5) + Math.abs(y - 35.5) <= 24) {
        setPixel(compactSource, x, y, [210, 70, 90, 255]);
        setPixel(paddedSource, x + 16, y + 16, [210, 70, 90, 255]);
      }
    }
  }
  const compact = normalizeCandidateRgba(compactSource);
  const padded = normalizeCandidateRgba(paddedSource);
  assert.ok(findAlphaBoundingBox(compact));
  assert.equal(fingerprintRgba(compact.data), fingerprintRgba(padded.data));
  assert.equal(equalRgba(compact.data, padded.data), true);
});

test("correct candidate outranks a partial-shape candidate", () => {
  const correct = makeCandidate("plus", [210, 80, 75, 255]);
  const wrong = makeCandidate("square", [210, 80, 75, 255]);
  const input = compositeCandidate(correct.normalized);
  const inputFeature = buildInputFeature(input);
  const correctScore = scoreFeaturePair(inputFeature, correct.feature);
  const wrongScore = scoreFeaturePair(inputFeature, wrong.feature);
  assert.ok(correctScore.score > wrongScore.score + 0.05);
  assert.ok(correctScore.silhouette > wrongScore.silhouette);
});

test("brightness, color, and background changes retain the correct shape preference", () => {
  const correct = makeCandidate("circle", [220, 75, 65, 255]);
  const wrong = makeCandidate("bars", [220, 75, 65, 255]);
  const input = compositeCandidate(correct.normalized, {
    background: [70, 82, 96, 255],
    brightness: 0.72,
    tint: [-8, 18, 22],
  });
  const inputFeature = buildInputFeature(input);
  const correctScore = scoreFeaturePair(inputFeature, correct.feature);
  const wrongScore = scoreFeaturePair(inputFeature, wrong.feature);
  assert.ok(correctScore.score > wrongScore.score);
  assert.ok(correctScore.gray >= 0.90);
});

test("global offset transform improves a shifted input match", () => {
  const candidate = makeCandidate("diamond", [80, 170, 235, 255]);
  const input = compositeCandidate(candidate.normalized, {
    offsetX: 2,
    offsetY: -2,
  });
  const inputFeature = buildInputFeature(input);
  const centered = scoreFeaturePair(inputFeature, candidate.feature);
  const shifted = scoreFeaturePair(inputFeature, candidate.feature, {
    scale: 1,
    offsetX: 2,
    offsetY: -2,
  });
  assert.ok(shifted.score > centered.score);
});

test("global scale transform improves a scaled input match", () => {
  const candidate = makeCandidate("diamond", [70, 135, 235, 255]);
  const input = compositeCandidate(candidate.normalized, {
    scale: 0.92,
  });
  const inputFeature = buildInputFeature(input);
  const identity = scoreFeaturePair(inputFeature, candidate.feature, {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const transformed = [0.84, 0.92, 1.08, 1.16].map((scale) => scoreFeaturePair(
    inputFeature,
    candidate.feature,
    {
      scale,
      offsetX: 0,
      offsetY: 0,
    },
  ));
  const corrected = transformed.sort((left, right) => right.score - left.score)[0];
  assert.ok(corrected.score > identity.score, JSON.stringify({
    identity: identity.score,
    transformed: transformed.map((entry) => ({
      scale: entry.transform.scale,
      score: entry.score,
    })),
  }));
});

test("unexplained input foreground increases spill and lowers score", () => {
  const candidate = makeCandidate("circle", [215, 100, 65, 255]);
  const cleanFeature = buildInputFeature(compositeCandidate(candidate.normalized));
  const noisyFeature = buildInputFeature(compositeCandidate(candidate.normalized, {
    extraForeground: {
      x: 2,
      y: 2,
      width: 15,
      height: 18,
    },
  }));
  const cleanScore = scoreFeaturePair(cleanFeature, candidate.feature);
  const noisyScore = scoreFeaturePair(noisyFeature, candidate.feature);
  assert.ok(noisyScore.spill > cleanScore.spill);
  assert.ok(noisyScore.score < cleanScore.score);
});

test("pokemonName grouping is unaffected by the number of same-name templates", () => {
  const other = {
    id: "other",
    pokemonName: "べつモン",
    speciesKey: "species:other",
    source: "sv",
    score: 0.79,
  };
  const single = groupTemplateScoresByPokemonName([
    {
      id: "same-1",
      pokemonName: "テストモン",
      speciesKey: "species:test",
      source: "champions",
      score: 0.80,
    },
    other,
  ]);
  const duplicated = groupTemplateScoresByPokemonName([
    ...Array.from({ length: 20 }, (_, index) => ({
      id: `same-${index}`,
      pokemonName: "テストモン",
      speciesKey: "species:test",
      source: index % 2 ? "sv" : "champions",
      score: 0.80 - (index * 0.0001),
    })),
    other,
  ]);
  assert.deepEqual(single.map((entry) => entry.pokemonName), duplicated.map((entry) => entry.pokemonName));
  assert.equal(duplicated[0].score, single[0].score);
});

test("beam assignment uses a credible alternative to avoid a duplicate species", () => {
  const assignment = assignPartyCandidates([
    [
      { pokemonName: "A", speciesKey: "species:a", score: 0.92 },
      { pokemonName: "B", speciesKey: "species:b", score: 0.70 },
    ],
    [
      { pokemonName: "A-form", speciesKey: "species:a", score: 0.91 },
      { pokemonName: "C", speciesKey: "species:c", score: 0.89 },
    ],
  ]);
  assert.deepEqual(assignment.best.choices.map((choice) => choice.pokemonName), ["A", "C"]);
  assert.ok(assignment.margin > 0);
  assert.equal(assignment.slotMargins.length, 2);
  assert.ok(assignment.slotMargins.every((margin) => margin > 0));
});

test("beam assignment leaves a weak duplicate slot unresolved instead of forcing a bad name", () => {
  const assignment = assignPartyCandidates([
    [{ pokemonName: "A", speciesKey: "species:a", score: 0.94 }],
    [
      { pokemonName: "A-form", speciesKey: "species:a", score: 0.78 },
      { pokemonName: "Wrong", speciesKey: "species:wrong", score: 0.45 },
    ],
  ]);
  assert.equal(assignment.best.choices[0].pokemonName, "A");
  assert.equal(assignment.best.choices[1].pokemonName, "");
});

test("six-slot recognition shares a global transform and accepts distinct strong candidates", async () => {
  const shapes = ["circle", "square", "diamond", "plus", "triangle", "bars"];
  const colors = [
    [230, 70, 70, 255],
    [70, 190, 100, 255],
    [75, 125, 235, 255],
    [220, 180, 55, 255],
    [185, 80, 210, 255],
    [75, 200, 205, 255],
  ];
  const candidates = shapes.map((shape, index) => candidateRecord(index, shape, colors[index]));
  const inputs = candidates.map((candidate) => compositeCandidate(candidate.normalized, {
    offsetX: 2,
    offsetY: -2,
    background: [32, 40, 55, 255],
  }));
  const result = await recognizePokemonIconParty(inputs, candidates, {
    yieldControl: () => Promise.resolve(),
    config: {
      confidence: {
        assignmentMarginMin: 0,
        marginMin: 0.01,
        scoreMin: 0.70,
      },
    },
  });
  assert.equal(result.results.length, 6);
  assert.deepEqual(
    result.results.map((entry) => entry.pokemonName),
    candidates.map((entry) => entry.pokemonName),
    JSON.stringify(result.results.map((entry) => ({
      name: entry.pokemonName,
      score: entry.score,
      margin: entry.margin,
      reason: entry.rejectionReason,
    }))),
  );
  assert.ok(result.results.every((entry) => entry.matched));
  assert.equal(result.globalTransform.offsetX, 2);
  assert.equal(result.globalTransform.offsetY, -2);
  assert.ok(result.timings.totalMs > 0);
});

test("noise and visual collisions are not accepted", async () => {
  const shapes = ["circle", "square", "diamond", "plus", "diagonal", "bars"];
  const candidates = shapes.map((shape, index) => candidateRecord(index, shape, [190, 80 + (index * 15), 100, 255]));
  candidates[0].runtimeVisualCollisionId = "runtime:test-collision";
  const inputs = candidates.map((candidate, index) => {
    if (index !== 1) {
      return compositeCandidate(candidate.normalized);
    }
    const noise = createRgba(64, 64, [30, 35, 45, 255]);
    for (let y = 4; y < 60; y += 4) {
      for (let x = 3; x < 61; x += 5) {
        setPixel(noise, x, y, [(x * 13) % 255, (y * 17) % 255, ((x + y) * 11) % 255, 255]);
      }
    }
    return noise;
  });
  const result = await recognizePokemonIconParty(inputs, candidates, {
    yieldControl: () => Promise.resolve(),
    config: {
      confidence: {
        assignmentMarginMin: 0,
      },
    },
  });
  assert.equal(result.results[0].matched, false);
  assert.equal(result.results[0].rejectionReason, "visual_collision");
  assert.equal(result.results[1].matched, false);
  assert.ok(["poor_foreground", "low_score", "excessive_spill"].includes(result.results[1].rejectionReason));
});

test("default thresholds remain conservative", () => {
  assert.equal(DEFAULT_MATCHER_CONFIG.confidence.scoreMin, 0.74);
  assert.ok(DEFAULT_MATCHER_CONFIG.confidence.marginMin >= 0.025);
  assert.ok(DEFAULT_MATCHER_CONFIG.scoring.colorWeight <= 0.10);
});
