const BUNNY_CRY_PARAMS = {
  tears: "Param",
  cadeyes: "Param2",
  tearss: "Param4",
  tear: "Param5",
  notear: "Param6",
  headbrees1: "Param7",
  eyeLeftOpen: "ParamEyeLOpen",
  eyeRightOpen: "ParamEyeROpen",
};

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const lerp = (from, to, progress) => from + (to - from) * progress;
const pingPong01 = (value) => {
  const normalized = value % 2;
  return normalized <= 1 ? normalized : 2 - normalized;
};

function setLive2DParam(model, id, value) {
  const coreModel = model?.internalModel?.coreModel;
  if (!coreModel || typeof coreModel.setParameterValueById !== "function") return;

  coreModel.setParameterValueById(id, value);
}

function applyHeadbreesTimeline(model, timeMs) {
  const steps = [
    { from: 1, to: 0.8, duration: 420 },
    { from: 0.8, to: 0.9, duration: 280 },
    { from: 0.9, to: 0.6, duration: 420 },
    { from: 0.6, to: 0.7, duration: 280 },
    { from: 0.7, to: 0.5, duration: 420 },
    { from: 0.5, to: 1, duration: 1050 },
  ];

  const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
  let cursor = timeMs % totalDuration;

  for (const step of steps) {
    if (cursor <= step.duration) {
      const progress = cursor / step.duration;
      setLive2DParam(model, BUNNY_CRY_PARAMS.headbrees1, lerp(step.from, step.to, progress));
      return;
    }

    cursor -= step.duration;
  }

  setLive2DParam(model, BUNNY_CRY_PARAMS.headbrees1, 1);
}

function applyManualBlink(model, timeMs) {
  const cycle = timeMs % 4200;
  let eyeOpen = 1;

  if (cycle > 3820 && cycle <= 3910) {
    eyeOpen = 1 - (cycle - 3820) / 90;
  } else if (cycle > 3910 && cycle <= 4000) {
    eyeOpen = (cycle - 3910) / 90;
  }

  setLive2DParam(model, BUNNY_CRY_PARAMS.eyeLeftOpen, clamp01(eyeOpen));
  setLive2DParam(model, BUNNY_CRY_PARAMS.eyeRightOpen, clamp01(eyeOpen));
}

export function applyBunnyCryBasePose(model) {
  setLive2DParam(model, BUNNY_CRY_PARAMS.tears, 1);
  setLive2DParam(model, BUNNY_CRY_PARAMS.cadeyes, 1);
  setLive2DParam(model, BUNNY_CRY_PARAMS.headbrees1, 1);
}

export function updateBunnyCryAnimation(model, elapsedMs) {
  if (!model) return;

  applyBunnyCryBasePose(model);

  const tearssProgress = pingPong01(elapsedMs / 1200);
  setLive2DParam(model, BUNNY_CRY_PARAMS.tearss, tearssProgress);

  const tearCycleMs = 1800;
  const tearProgress = (elapsedMs % tearCycleMs) / tearCycleMs;

  if (tearProgress < 0.94) {
    setLive2DParam(model, BUNNY_CRY_PARAMS.notear, 1);
    setLive2DParam(model, BUNNY_CRY_PARAMS.tear, tearProgress / 0.94);
  } else {
    setLive2DParam(model, BUNNY_CRY_PARAMS.notear, 0);
    setLive2DParam(model, BUNNY_CRY_PARAMS.tear, 0);
  }

  applyHeadbreesTimeline(model, elapsedMs);
  applyManualBlink(model, elapsedMs);
}
