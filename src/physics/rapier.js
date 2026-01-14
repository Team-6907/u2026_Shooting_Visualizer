/**
 * Rapier 物理引擎初始化模块
 * 异步加载 WASM 并提供全局访问
 */
import RAPIER from "@dimforge/rapier3d-compat";

let rapierInstance = null;
let initPromise = null;

/**
 * 初始化 Rapier WASM
 * @returns {Promise<typeof RAPIER>}
 */
export async function initRapier() {
  if (rapierInstance) {
    return rapierInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = RAPIER.init().then(() => {
    rapierInstance = RAPIER;
    console.log("[Physics] Rapier WASM initialized");
    return rapierInstance;
  });

  return initPromise;
}

/**
 * 获取已初始化的 Rapier 实例
 * @returns {typeof RAPIER}
 * @throws {Error} 如果 Rapier 未初始化
 */
export function getRapier() {
  if (!rapierInstance) {
    throw new Error("Rapier not initialized. Call initRapier() first.");
  }
  return rapierInstance;
}

/**
 * 检查 Rapier 是否已初始化
 * @returns {boolean}
 */
export function isRapierReady() {
  return rapierInstance !== null;
}
