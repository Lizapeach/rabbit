import { useEffect, useRef, useState } from "react";
import { updateBunnyCryAnimation } from "./BunnyCryAnimation";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

const loadedScripts = new Map();

const BUNNY_ACCESSORY_PARAM_IDS = {
  bow: "Param3",
  star: "Param4",
  cloun_nose: "Param5",
  cloun_wig: "Param6",
  mustache: "Param7",
  scarf: "Param8",
  hat: "Param9",
  boww: "Param10",
  broom: "Param11",
  tie: "Param12",
  icon: "Param13",
};

function loadScriptOnce(src) {
  if (!src) return Promise.resolve();

  if (window.Live2DCubismCore) {
    return Promise.resolve();
  }

  if (loadedScripts.has(src)) return loadedScripts.get(src);

  const promise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${src}"]`);

    if (existingScript) {
      if (existingScript.dataset.loaded === "true" || window.Live2DCubismCore) {
        resolve();
        return;
      }

      existingScript.addEventListener(
        "load",
        () => {
          existingScript.dataset.loaded = "true";
          resolve();
        },
        { once: true },
      );

      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;

    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };

    script.onerror = () => reject(new Error(`Cannot load script: ${src}`));

    document.head.appendChild(script);
  });

  loadedScripts.set(src, promise);
  return promise;
}

function setModelParameter(model, unavailableParams, id, value, weight = 1) {
  if (unavailableParams.has(id)) return;

  const coreModel = model?.internalModel?.coreModel;
  if (!coreModel) return;

  try {
    if (typeof coreModel.setParameterValueById === "function") {
      coreModel.setParameterValueById(id, value, weight);
      return;
    }

    if (
      typeof coreModel.getParameterIndex === "function" &&
      typeof coreModel.setParameterValueByIndex === "function"
    ) {
      const index = coreModel.getParameterIndex(id);
      if (index === -1 || index === null || index === undefined) {
        unavailableParams.add(id);
        return;
      }
      coreModel.setParameterValueByIndex(index, value, weight);
      return;
    }

    unavailableParams.add(id);
  } catch {
    unavailableParams.add(id);
  }
}

function applyAccessoryParameters(model, unavailableParams, accessoryParams) {
  if (!accessoryParams) return;

  Object.entries(BUNNY_ACCESSORY_PARAM_IDS).forEach(([key, parameterId]) => {
    const value = accessoryParams[key] ? 1 : 0;
    setModelParameter(model, unavailableParams, parameterId, value);
  });
}

function resizeModelToStage(app, model, host) {
  const rect = host.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));

  app.renderer.resize(width, height);

  const localBounds = model.getLocalBounds();
  const safeWidth = Math.max(1, localBounds.width);
  const safeHeight = Math.max(1, localBounds.height);
  const scale = Math.min(width / safeWidth, height / safeHeight) * 0.88;

  model.scale.set(scale);
  model.x = width / 2;
  model.y = height * 0.5;
}

function destroyLive2DModel(model) {
  if (!model) return;

  try {
    model.destroy?.({ children: true });
  } catch {
    try {
      model.destroy?.();
    } catch {
      // ignore destroy errors from an already disposed Live2D model
    }
  }
}

export default function Live2DBunny({
  modelUrl,
  animationMode = "idle",
  isHappy = false,
  accessoryParams = null,
  isPaused = false,
  cubismCoreSrc = "/live2d/live2dcubismcore.min.js",
}) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const modelRef = useRef(null);
  const live2DModelClassRef = useRef(null);
  const animationModeRef = useRef(animationMode);
  const isHappyRef = useRef(isHappy);
  const accessoryParamsRef = useRef(accessoryParams);
  const isPausedRef = useRef(isPaused);
  const unavailableParamsRef = useRef(new Set());
  const startedAtRef = useRef(0);
  const loadIdRef = useRef(0);

  const animationStateRef = useRef({
    isInside: false,
    pointerX: 0,
    pointerY: 0,
    smoothX: 0,
    smoothY: 0,
    noiseX: 0,
    noiseY: 0,
    noiseZ: 0,
    targetNoiseX: 0,
    targetNoiseY: 0,
    targetNoiseZ: 0,
    nextNoiseAt: 0,
    blinkStart: -1,
    nextBlinkAt: 0,
  });

  const [isPixiReady, setIsPixiReady] = useState(false);
  const [status, setStatus] = useState("loading");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    animationModeRef.current = animationMode;
  }, [animationMode]);

  useEffect(() => {
    isHappyRef.current = isHappy;
  }, [isHappy]);

  useEffect(() => {
    accessoryParamsRef.current = accessoryParams;
  }, [accessoryParams]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;

    let disposed = false;
    let resizeObserver = null;
    const state = animationStateRef.current;

    const updatePointer = (event) => {
      if (animationModeRef.current === "cry") return;

      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      state.pointerX = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
      state.pointerY = clamp(-(((event.clientY - rect.top) / rect.height) * 2 - 1), -1, 1);
    };

    const onPointerEnter = (event) => {
      if (animationModeRef.current === "cry") return;
      state.isInside = true;
      updatePointer(event);
    };

    const onPointerMove = (event) => {
      if (animationModeRef.current === "cry") return;
      state.isInside = true;
      updatePointer(event);
    };

    const onPointerLeave = () => {
      state.isInside = false;
    };

    const initPixi = async () => {
      try {
        setStatus("loading");
        setErrorText("");

        const PIXI = await import("pixi.js");
        window.PIXI = PIXI;

        await loadScriptOnce(cubismCoreSrc);

        try {
          const live2dDisplay = await import("pixi-live2d-display");

          if (live2dDisplay.config?.cubism4) {
            live2dDisplay.config.cubism4.supportMoreMaskDivisions = true;
          }
        } catch (configError) {
          console.warn("Live2D config was not applied:", configError);
        }

        const { Live2DModel } = await import("pixi-live2d-display/cubism4");
        if (disposed) return;

        live2DModelClassRef.current = Live2DModel;

        const app = new PIXI.Application({
          view: canvas,
          width: Math.max(1, host.clientWidth),
          height: Math.max(1, host.clientHeight),
          backgroundAlpha: 0,
          antialias: true,
          autoStart: true,
          resolution: window.devicePixelRatio || 1,
          powerPreference: "high-performance",
        });

        appRef.current = app;

        resizeObserver = new ResizeObserver(() => {
          const model = modelRef.current;
          if (!model || !appRef.current || disposed) return;
          resizeModelToStage(appRef.current, model, host);
        });
        resizeObserver.observe(host);

        app.ticker.add(() => {
          const model = modelRef.current;
          if (!model || disposed) return;

          const unavailableParams = unavailableParamsRef.current;

          if (isPausedRef.current) {
            state.isInside = false;
            applyAccessoryParameters(model, unavailableParams, accessoryParamsRef.current);
            return;
          }

          const now = performance.now();
          if (animationModeRef.current === "cry") {
            state.isInside = false;
            state.pointerX = 0;
            state.pointerY = 0;
            state.smoothX = 0;
            state.smoothY = 0;
            state.noiseX = 0;
            state.noiseY = 0;
            state.noiseZ = 0;
            state.targetNoiseX = 0;
            state.targetNoiseY = 0;
            state.targetNoiseZ = 0;

            setModelParameter(model, unavailableParams, "ParamAngleX", 0);
            setModelParameter(model, unavailableParams, "ParamAngleY", 0);
            setModelParameter(model, unavailableParams, "ParamAngleZ", 0);
            setModelParameter(model, unavailableParams, "ParamBodyAngleX", 0);
            setModelParameter(model, unavailableParams, "ParamEyeBallX", 0);
            setModelParameter(model, unavailableParams, "ParamEyeBallY", 0);
            setModelParameter(model, unavailableParams, "ParamBreath", 0);

            updateBunnyCryAnimation(model, now - startedAtRef.current);
            return;
          }

          const seconds = now / 1000;

          if (now >= state.nextNoiseAt) {
            state.targetNoiseX = randomBetween(-1, 1);
            state.targetNoiseY = randomBetween(-1, 1);
            state.targetNoiseZ = randomBetween(-1, 1);
            state.nextNoiseAt = now + randomBetween(700, 1500);
          }

          state.noiseX += (state.targetNoiseX - state.noiseX) * 0.025;
          state.noiseY += (state.targetNoiseY - state.noiseY) * 0.025;
          state.noiseZ += (state.targetNoiseZ - state.noiseZ) * 0.025;

          const idleX = Math.sin(seconds * 0.75) * 0.28 + Math.sin(seconds * 1.35 + 2.1) * 0.12;
          const idleY = Math.sin(seconds * 0.92 + 1.4) * 0.16;

          const targetX = state.isInside ? state.pointerX : idleX;
          const targetY = state.isInside ? state.pointerY : idleY;
          const followSpeed = state.isInside ? 0.11 : 0.035;

          state.smoothX += (targetX - state.smoothX) * followSpeed;
          state.smoothY += (targetY - state.smoothY) * followSpeed;

          let eyeOpen = 1;
          if (state.blinkStart < 0 && now >= state.nextBlinkAt) {
            state.blinkStart = now;
            state.nextBlinkAt = now + randomBetween(2600, 5600);
          }

          if (state.blinkStart >= 0) {
            const blinkProgress = (now - state.blinkStart) / 170;

            if (blinkProgress >= 1) {
              state.blinkStart = -1;
              eyeOpen = 1;
            } else if (blinkProgress < 0.5) {
              eyeOpen = 1 - blinkProgress * 2;
            } else {
              eyeOpen = (blinkProgress - 0.5) * 2;
            }
          }

          const randomHeadX = state.noiseX * 3.2;
          const randomHeadY = state.noiseY * 2.4;
          const randomHeadZ = state.noiseZ * 1.8;
          const breath = 0.55 + Math.sin(seconds * 2.7) * 0.45;
          const happyEars = isHappyRef.current ? (Math.sin(seconds * 10) + 1) / 2 : 0;

          setModelParameter(model, unavailableParams, "Param", isHappyRef.current ? 1 : 0);
          setModelParameter(model, unavailableParams, "Param2", happyEars);
          setModelParameter(model, unavailableParams, "ParamAngleX", state.smoothX * 28 + randomHeadX);
          setModelParameter(model, unavailableParams, "ParamAngleY", state.smoothY * 28 + randomHeadY);
          setModelParameter(model, unavailableParams, "ParamAngleZ", state.smoothX * 7 + randomHeadZ);
          setModelParameter(model, unavailableParams, "ParamBodyAngleX", state.smoothX * 8 + state.noiseX * 1.5);
          setModelParameter(model, unavailableParams, "ParamEyeBallX", clamp(state.smoothX * 0.8 + state.noiseX * 0.08, -1, 1));
          setModelParameter(model, unavailableParams, "ParamEyeBallY", clamp(state.smoothY * 0.72 + state.noiseY * 0.08, -1, 1));
          setModelParameter(model, unavailableParams, "ParamBreath", breath);
          setModelParameter(model, unavailableParams, "ParamEyeLOpen", eyeOpen);
          setModelParameter(model, unavailableParams, "ParamEyeROpen", eyeOpen);
          applyAccessoryParameters(model, unavailableParams, accessoryParamsRef.current);
        });

        host.addEventListener("pointerenter", onPointerEnter);
        host.addEventListener("pointermove", onPointerMove);
        host.addEventListener("pointerleave", onPointerLeave);

        setIsPixiReady(true);
      } catch (error) {
        console.error("Live2D bunny loading error:", error);

        if (!disposed) {
          setErrorText(error instanceof Error ? error.message : String(error));
          setStatus("error");
        }
      }
    };

    initPixi();

    return () => {
      disposed = true;
      host.removeEventListener("pointerenter", onPointerEnter);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      resizeObserver?.disconnect();

      destroyLive2DModel(modelRef.current);
      modelRef.current = null;

      appRef.current?.destroy(true, {
        children: true,
        texture: false,
        baseTexture: false,
      });
      appRef.current = null;
      live2DModelClassRef.current = null;
    };
  }, [cubismCoreSrc]);

  useEffect(() => {
    const host = hostRef.current;
    const app = appRef.current;
    const Live2DModel = live2DModelClassRef.current;

    if (!isPixiReady || !host || !app || !Live2DModel || !modelUrl) return undefined;

    let cancelled = false;
    const currentLoadId = loadIdRef.current + 1;
    loadIdRef.current = currentLoadId;

    const loadModel = async () => {
      try {
        setStatus("loading");
        setErrorText("");

        const previousModel = modelRef.current;
        if (previousModel) {
          app.stage.removeChild(previousModel);
          destroyLive2DModel(previousModel);
          modelRef.current = null;
        }

        unavailableParamsRef.current = new Set();
        startedAtRef.current = performance.now();

        const state = animationStateRef.current;
        state.isInside = false;
        state.pointerX = 0;
        state.pointerY = 0;
        state.smoothX = 0;
        state.smoothY = 0;
        state.noiseX = 0;
        state.noiseY = 0;
        state.noiseZ = 0;
        state.targetNoiseX = 0;
        state.targetNoiseY = 0;
        state.targetNoiseZ = 0;
        state.nextBlinkAt = performance.now() + randomBetween(1200, 3200);
        state.nextNoiseAt = performance.now();
        state.blinkStart = -1;

        const nextModel = await Live2DModel.from(modelUrl, {
          autoInteract: false,
        });

        if (cancelled || loadIdRef.current !== currentLoadId) {
          destroyLive2DModel(nextModel);
          return;
        }

        nextModel.anchor.set(0.5, 0.5);
        nextModel.interactive = false;

        modelRef.current = nextModel;
        app.stage.addChild(nextModel);
        resizeModelToStage(app, nextModel, host);

        setStatus("ready");
      } catch (error) {
        console.error("Live2D bunny loading error:", error);

        if (!cancelled) {
          setErrorText(error instanceof Error ? error.message : String(error));
          setStatus("error");
        }
      }
    };

    loadModel();

    return () => {
      cancelled = true;
    };
  }, [isPixiReady, modelUrl]);

  return (
    <div ref={hostRef} className="live2d-bunny" data-live2d-status={status}>
      <canvas ref={canvasRef} className="live2d-bunny__canvas" />

      {status === "loading" && (
        <div className="live2d-bunny__hint">загрузка зайчика</div>
      )}

      {status === "error" && (
        <div className="live2d-bunny__hint live2d-bunny__hint--error">
          нужен runtime-экспорт Live2D
          {errorText ? `: ${errorText}` : ""}
        </div>
      )}
    </div>
  );
}
