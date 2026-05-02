import { useEffect, useRef, useState } from "react";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

const loadedScripts = new Map();

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

export default function Live2DBunny({
  modelUrl,
  cubismCoreSrc = "/live2d/live2dcubismcore.min.js",
}) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
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
  const [status, setStatus] = useState("loading");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas || !modelUrl) return undefined;

    let app = null;
    let model = null;
    let resizeObserver = null;
    let disposed = false;
    const unavailableParams = new Set();
    const state = animationStateRef.current;

    const updatePointer = (event) => {
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      state.pointerX = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
      state.pointerY = clamp(-(((event.clientY - rect.top) / rect.height) * 2 - 1), -1, 1);
    };

    const onPointerEnter = (event) => {
      state.isInside = true;
      updatePointer(event);
    };

    const onPointerMove = (event) => {
      state.isInside = true;
      updatePointer(event);
    };

    const onPointerLeave = () => {
      state.isInside = false;
    };

    const init = async () => {
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

        app = new PIXI.Application({
          view: canvas,
          width: Math.max(1, host.clientWidth),
          height: Math.max(1, host.clientHeight),
          backgroundAlpha: 0,
          antialias: true,
          autoStart: true,
          resolution: window.devicePixelRatio || 1,
        });

        model = await Live2DModel.from(modelUrl, {
          autoInteract: false,
        });

        if (disposed) {
          model?.destroy?.();
          return;
        }

        model.anchor.set(0.5, 0.5);
        model.interactive = false;
        app.stage.addChild(model);

        resizeModelToStage(app, model, host);
        resizeObserver = new ResizeObserver(() => {
          if (!model || !app || disposed) return;
          resizeModelToStage(app, model, host);
        });
        resizeObserver.observe(host);

        state.nextBlinkAt = performance.now() + randomBetween(1200, 3200);
        state.nextNoiseAt = performance.now();

        app.ticker.add(() => {
          if (!model || disposed) return;

          const now = performance.now();
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

          setModelParameter(model, unavailableParams, "ParamAngleX", state.smoothX * 28 + randomHeadX);
          setModelParameter(model, unavailableParams, "ParamAngleY", state.smoothY * 18 + randomHeadY);
          setModelParameter(model, unavailableParams, "ParamAngleZ", state.smoothX * 7 + randomHeadZ);
          setModelParameter(model, unavailableParams, "ParamBodyAngleX", state.smoothX * 8 + state.noiseX * 1.5);
          setModelParameter(model, unavailableParams, "ParamEyeBallX", clamp(state.smoothX * 0.8 + state.noiseX * 0.08, -1, 1));
          setModelParameter(model, unavailableParams, "ParamEyeBallY", clamp(state.smoothY * 0.72 + state.noiseY * 0.08, -1, 1));
          setModelParameter(model, unavailableParams, "ParamBreath", breath);
          setModelParameter(model, unavailableParams, "ParamEyeLOpen", eyeOpen);
          setModelParameter(model, unavailableParams, "ParamEyeROpen", eyeOpen);
        });

        host.addEventListener("pointerenter", onPointerEnter);
        host.addEventListener("pointermove", onPointerMove);
        host.addEventListener("pointerleave", onPointerLeave);

        setStatus("ready");
} catch (error) {
  console.error("Live2D bunny loading error:", error);

  if (!disposed) {
    alert(error instanceof Error ? error.message : String(error));
    setStatus("error");
  }
}
    };

    init();

    return () => {
      disposed = true;
      host.removeEventListener("pointerenter", onPointerEnter);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      resizeObserver?.disconnect();
      app?.destroy(true, {
        children: true,
        texture: true,
        baseTexture: true,
      });
    };
  }, [modelUrl, cubismCoreSrc]);

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
