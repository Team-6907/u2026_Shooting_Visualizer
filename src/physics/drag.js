/**
 * 二次空气阻力实现
 * 与现有解算的 DRAG_K 保持一致
 */
import { DRAG_K, BALL_MASS } from "../core/config.js";

/**
 * 应用二次空气阻力到刚体
 * 公式: F = -k * |v|² * v̂ = -k * |v| * v
 * 其中 k = DRAG_K (已包含质量归一化)
 *
 * @param {import("@dimforge/rapier3d-compat").RigidBody} body
 * @param {number} dt - 时间步长
 */
export function applyQuadraticDrag(body, dt) {
  const vel = body.linvel();
  const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);

  if (speed < 0.001) return;

  // DRAG_K 已经是 (0.5 * rho * Cd * A / m)，单位是 1/m
  // 阻力加速度: a = -DRAG_K * v² * v̂ = -DRAG_K * |v| * v
  // 冲量: impulse = m * a * dt = m * (-DRAG_K * |v| * v) * dt
  const dragFactor = BALL_MASS * DRAG_K * speed * dt;

  const impulse = {
    x: -dragFactor * vel.x,
    y: -dragFactor * vel.y,
    z: -dragFactor * vel.z,
  };

  body.applyImpulse(impulse, true);
}
