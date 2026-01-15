import "./styles/main.css";

import { FIELD_LENGTH, FIELD_WIDTH } from "./core/config.js";
import { createKeys, createState } from "./core/state.js";
import { computeShootingSolution } from "./core/solver.js";
import { bindKeyboard } from "./input/keyboard.js";
import { createScene } from "./scene/scene.js";
import { initControls } from "./ui/controls.js";
import { initI18n } from "./ui/i18n.js";
import { initMetrics } from "./ui/metrics.js";
import { initRenderQuality } from "./ui/render-quality.js";
import { initRapier } from "./physics/rapier.js";

// 初始化 Rapier WASM（异步）
initRapier()
  .then(() => {
    console.log("[Main] Rapier physics engine ready");
  })
  .catch((err) => {
    console.warn("[Main] Failed to initialize Rapier, falling back to manual physics:", err);
  });

const container = document.getElementById("canvas-container");
if (!container) {
  throw new Error("Missing #canvas-container");
}

const state = createState();
const keys = createKeys();
const i18n = initI18n(state);
const controls = initControls(state);
const metrics = initMetrics(i18n);
const scene = createScene(container, state);
initRenderQuality(state, scene);

bindKeyboard(container, state, keys);

let lastTime = performance.now();
const solverInterval = 1 / 30;
let solverAccumulator = 0;
let cachedSolution = null;

function gameLoop(dt) {
  let targetVx = 0;
  let targetVy = 0;
  if (keys.w) targetVx += 1;
  if (keys.s) targetVx -= 1;
  if (keys.a) targetVy -= 1;
  if (keys.d) targetVy += 1;

  const targetDirLen = Math.hypot(targetVx, targetVy);
  if (targetDirLen > 0.01) {
    targetVx /= targetDirLen;
    targetVy /= targetDirLen;
  }

  const desiredVx = targetVx * state.maxLinearSpeed;
  const desiredVy = targetVy * state.maxLinearSpeed;

  const dvx = desiredVx - state.robotVx;
  const dvy = desiredVy - state.robotVy;
  const accelNeeded = Math.hypot(dvx, dvy) / dt;

  if (accelNeeded > state.maxAcceleration) {
    const scale = (state.maxAcceleration * dt) / Math.hypot(dvx, dvy);
    state.robotVx += dvx * scale;
    state.robotVy += dvy * scale;
  } else {
    state.robotVx = desiredVx;
    state.robotVy = desiredVy;
  }

  const currentSpeed = Math.hypot(state.robotVx, state.robotVy);
  if (currentSpeed > state.maxLinearSpeed) {
    const scale = state.maxLinearSpeed / currentSpeed;
    state.robotVx *= scale;
    state.robotVy *= scale;
  }

  const desiredDx = state.robotVx * dt;
  const desiredDy = state.robotVy * dt;
  const resolved = scene.resolveRobotMovement(state, desiredDx, desiredDy, dt);

  if (!resolved) {
    state.robotX += desiredDx;
    state.robotY += desiredDy;

    state.robotX = Math.max(0.3, Math.min(FIELD_LENGTH - 0.3, state.robotX));
    state.robotY = Math.max(0.3, Math.min(FIELD_WIDTH - 0.3, state.robotY));
  }

  solverAccumulator += dt;
  if (!cachedSolution || solverAccumulator >= solverInterval) {
    cachedSolution = computeShootingSolution(state);
    solverAccumulator = 0;
  }
  const solution = cachedSolution;

  const targetHeading = solution.chassisHeading;
  let headingError = targetHeading - state.chassisHeading;
  while (headingError > Math.PI) headingError -= Math.PI * 2;
  while (headingError < -Math.PI) headingError += Math.PI * 2;

  const maxOmega = 6.0;
  const omegaGain = 4.0;
  const omega = Math.max(-maxOmega, Math.min(maxOmega, headingError * omegaGain));
  state.chassisHeading += omega * dt;

  controls.updateControl("robotX", state.robotX);
  controls.updateControl("robotY", state.robotY);

  metrics.update(solution);
  scene.tick(solution, dt);
}

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  gameLoop(dt);
  scene.render();
}

window.addEventListener("resize", () => {
  scene.resize();
});

container.focus();
animate();
