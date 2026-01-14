/**
 * 机器人刚体管理（简化碰撞体）
 */
import { getRapier } from "./rapier.js";
import { ROBOT_GROUPS } from "./groups.js";

const ROBOT_PHYSICS = {
  restitution: 0.1,
  friction: 0.8,
};

function yawToQuat(yaw) {
  const halfYaw = yaw * 0.5;
  return { x: 0, y: Math.sin(halfYaw), z: 0, w: Math.cos(halfYaw) };
}

/**
 * 创建机器人刚体（运动学）
 * @param {import("@dimforge/rapier3d-compat").World} world
 * @param {{ position: {x:number,y:number,z:number}, yaw: number, size: {x:number,y:number,z:number}, offset?: {x:number,y:number,z:number} }} options
 * @returns {{ body: import("@dimforge/rapier3d-compat").RigidBody, collider: import("@dimforge/rapier3d-compat").Collider }}
 */
export function createRobotBody(world, options) {
  const RAPIER = getRapier();
  const { position, yaw, size, offset = { x: 0, y: 0, z: 0 } } = options;

  const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(position.x, position.y, position.z)
    .setRotation(yawToQuat(yaw));
  const body = world.createRigidBody(bodyDesc);

  const colliderDesc = RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
    .setTranslation(offset.x, offset.y, offset.z)
    .setRestitution(ROBOT_PHYSICS.restitution)
    .setFriction(ROBOT_PHYSICS.friction)
    .setCollisionGroups(ROBOT_GROUPS);
  const collider = world.createCollider(colliderDesc, body);

  return { body, collider };
}

/**
 * 更新机器人刚体位置
 * @param {import("@dimforge/rapier3d-compat").RigidBody} body
 * @param {{ position: {x:number,y:number,z:number}, yaw: number }} options
 */
export function updateRobotBody(body, options) {
  const { position, yaw } = options;
  body.setNextKinematicTranslation(position);
  body.setNextKinematicRotation(yawToQuat(yaw));
}
