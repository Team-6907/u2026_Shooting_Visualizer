/**
 * 物理球体管理
 * 创建、更新和移除射出的球的物理体
 */
import { getRapier } from "./rapier.js";
import { BALL_RADIUS, BALL_MASS } from "../core/config.js";
import { applyQuadraticDrag } from "./drag.js";
import { BALL_GROUPS } from "./groups.js";

// 物理球体参数
const BALL_PHYSICS = {
  restitution: 0.6,
  friction: 0.3,
  linearDamping: 0.0, // 不使用线性阻尼，用自定义二次阻力
  angularDamping: 0.1,
  ccdEnabled: true, // 连续碰撞检测，防止穿透
};

/**
 * 创建物理球体
 * @param {import("@dimforge/rapier3d-compat").World} world
 * @param {{ x: number, y: number, z: number }} position - 初始位置 (Three.js 坐标系)
 * @param {{ x: number, y: number, z: number }} velocity - 初始速度 (Three.js 坐标系)
 * @returns {import("@dimforge/rapier3d-compat").RigidBody}
 */
export function createBallBody(world, position, velocity) {
  const RAPIER = getRapier();

  // 创建刚体描述
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(position.x, position.y, position.z)
    .setLinvel(velocity.x, velocity.y, velocity.z)
    .setLinearDamping(BALL_PHYSICS.linearDamping)
    .setAngularDamping(BALL_PHYSICS.angularDamping)
    .setCcdEnabled(BALL_PHYSICS.ccdEnabled);

  // 创建刚体
  const body = world.createRigidBody(bodyDesc);

  // 创建碰撞体（球形）
  const colliderDesc = RAPIER.ColliderDesc.ball(BALL_RADIUS)
    .setRestitution(BALL_PHYSICS.restitution)
    .setFriction(BALL_PHYSICS.friction)
    .setMass(BALL_MASS)
    .setCollisionGroups(BALL_GROUPS);

  world.createCollider(colliderDesc, body);

  return body;
}

/**
 * 更新物理球体（应用二次空气阻力）
 * @param {import("@dimforge/rapier3d-compat").RigidBody} body
 * @param {number} dt - 时间步长
 */
export function updateBallPhysics(body, dt) {
  applyQuadraticDrag(body, dt);
}

/**
 * 从物理体获取位置和旋转
 * @param {import("@dimforge/rapier3d-compat").RigidBody} body
 * @returns {{ position: {x,y,z}, quaternion: {x,y,z,w} }}
 */
export function getBallTransform(body) {
  const pos = body.translation();
  const rot = body.rotation();

  return {
    position: { x: pos.x, y: pos.y, z: pos.z },
    quaternion: { x: rot.x, y: rot.y, z: rot.z, w: rot.w },
  };
}

/**
 * 移除物理球体
 * @param {import("@dimforge/rapier3d-compat").World} world
 * @param {import("@dimforge/rapier3d-compat").RigidBody} body
 */
export function removeBallBody(world, body) {
  world.removeRigidBody(body);
}

/**
 * 检查球是否应该被移除（落地、出界等）
 * @param {import("@dimforge/rapier3d-compat").RigidBody} body
 * @param {number} minHeight - 最低高度
 * @returns {boolean}
 */
export function shouldRemoveBall(body, minHeight = -1) {
  const pos = body.translation();
  return pos.y < minHeight;
}
