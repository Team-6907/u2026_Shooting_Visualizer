/**
 * 物理世界管理
 * 创建和管理 Rapier 物理世界及静态碰撞体
 */
import { getRapier } from "./rapier.js";
import { FIELD_LENGTH, FIELD_WIDTH, GRAVITY } from "../core/config.js";
import { calculateHubColliders } from "./extractor.js";
import { FIELD_GROUPS, BUMP_GROUPS } from "./groups.js";

// 物理材质参数
const PHYSICS_PARAMS = {
  ball: {
    restitution: 0.6, // 弹性系数
    friction: 0.3,
  },
  ground: {
    restitution: 0.5,
    friction: 0.4,
  },
  hub: {
    restitution: 0.3,
    friction: 0.2,
  },
  bump: {
    restitution: 0.4,
    friction: 0.3,
  },
};

/**
 * 创建物理世界
 * @returns {{ world: import("@dimforge/rapier3d-compat").World, colliderDescs: Object }}
 */
export function createPhysicsWorld() {
  const RAPIER = getRapier();

  // 创建世界，Y 轴向上
  const world = new RAPIER.World({ x: 0, y: -GRAVITY, z: 0 });

  // 创建地面（静态平面）
  const groundDesc = RAPIER.ColliderDesc.cuboid(FIELD_LENGTH / 2, 0.01, FIELD_WIDTH / 2)
    .setTranslation(FIELD_LENGTH / 2, -0.01, FIELD_WIDTH / 2)
    .setRestitution(PHYSICS_PARAMS.ground.restitution)
    .setFriction(PHYSICS_PARAMS.ground.friction)
    .setCollisionGroups(FIELD_GROUPS);
  world.createCollider(groundDesc);

  console.log("[Physics] World created with ground");

  return {
    world,
    RAPIER,
    params: PHYSICS_PARAMS,
  };
}

/**
 * 创建场地边界（围栏 + 联盟墙）
 * 围栏高度约 1m (官方规格)
 * 联盟墙高度约 2m
 */
function createBoundaryWalls(world, RAPIER, fieldBounds) {
  const boundaryWalls = buildBoundaryWallsFromBounds(fieldBounds);
  for (const wall of boundaryWalls) {
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(wall.size.x / 2, wall.size.y / 2, wall.size.z / 2)
        .setTranslation(wall.center.x, wall.center.y, wall.center.z)
        .setRestitution(wall.restitution)
        .setFriction(wall.friction)
        .setCollisionGroups(FIELD_GROUPS)
    );
  }

  if (boundaryWalls.length > 0) {
    console.log(`[Physics] Created ${boundaryWalls.length} boundary walls`);
  }
}

/**
 * 从场地边界生成四面墙的参数，保持与模型对齐
 * @param {{ min: {x:number,y:number,z:number}, max: {x:number,y:number,z:number} } | null} fieldBounds
 * @returns {Array<{ name: string, center: {x:number,y:number,z:number}, size: {x:number,y:number,z:number}, restitution: number, friction: number }>}
 */
export function buildBoundaryWallsFromBounds(fieldBounds) {
  const fenceHeight = 0.508; // Guardrails: 50.8cm
  const allianceWallHeight = 1.9812; // Alliance wall: 78in
  const wallThickness = 0.1;

  const bounds = fieldBounds || {
    min: { x: 0, y: 0, z: 0 },
    max: { x: FIELD_LENGTH, y: 0, z: FIELD_WIDTH },
  };

  const minX = Math.min(bounds.min.x, bounds.max.x);
  const maxX = Math.max(bounds.min.x, bounds.max.x);
  const minZ = Math.min(bounds.min.z, bounds.max.z);
  const maxZ = Math.max(bounds.min.z, bounds.max.z);
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const length = Math.max(maxX - minX, 0.01);
  const width = Math.max(maxZ - minZ, 0.01);

  return [
    {
      name: "fence-south",
      center: { x: centerX, y: fenceHeight / 2, z: minZ - wallThickness / 2 },
      size: { x: length, y: fenceHeight, z: wallThickness },
      restitution: 0.4,
      friction: 0.3,
    },
    {
      name: "fence-north",
      center: { x: centerX, y: fenceHeight / 2, z: maxZ + wallThickness / 2 },
      size: { x: length, y: fenceHeight, z: wallThickness },
      restitution: 0.4,
      friction: 0.3,
    },
    {
      name: "alliance-west",
      center: { x: minX - wallThickness / 2, y: allianceWallHeight / 2, z: centerZ },
      size: { x: wallThickness, y: allianceWallHeight, z: width },
      restitution: 0.3,
      friction: 0.2,
    },
    {
      name: "alliance-east",
      center: { x: maxX + wallThickness / 2, y: allianceWallHeight / 2, z: centerZ },
      size: { x: wallThickness, y: allianceWallHeight, z: width },
      restitution: 0.3,
      friction: 0.2,
    },
  ];
}

/**
 * 基于提取的碰撞体信息创建 HUB、BUMP 和边界碰撞体
 * @param {{ world: World, RAPIER: typeof RAPIER }} physics
 * @param {{ hubs: Array, bumps: Array, hubSidePanels: Array, fieldBounds: Object, fenceBounds: Object|null }} extractedColliders
 * @param {{ enableHub?: boolean }} options
 */
export function createFieldColliders(physics, extractedColliders, options = {}) {
  const { world, RAPIER, params } = physics;
  const { enableHub = true } = options;

  if (enableHub) {
    // 创建 HUB 碰撞体（空心盒子）
    for (const hub of extractedColliders.hubs) {
      const hubColliders = calculateHubColliders(hub, extractedColliders.hubSidePanels || []);

      // 底板
      const floorDesc = RAPIER.ColliderDesc.cuboid(
        hubColliders.floor.size.x,
        hubColliders.floor.size.y,
        hubColliders.floor.size.z
      )
      .setTranslation(
        hubColliders.floor.position.x,
        hubColliders.floor.position.y,
        hubColliders.floor.position.z
      )
      .setRestitution(params.hub.restitution)
      .setFriction(params.hub.friction)
      .setCollisionGroups(FIELD_GROUPS);
    world.createCollider(floorDesc);

      // 四面墙
      for (const wall of hubColliders.walls) {
      const wallDesc = RAPIER.ColliderDesc.cuboid(wall.size.x, wall.size.y, wall.size.z)
        .setTranslation(wall.position.x, wall.position.y, wall.position.z)
        .setRestitution(params.hub.restitution)
        .setFriction(params.hub.friction)
        .setCollisionGroups(FIELD_GROUPS);
      world.createCollider(wallDesc);
      }

      console.log(
        `[Physics] Created hollow HUB at (${hub.center.x.toFixed(2)}, ${hub.center.z.toFixed(2)})`
      );
    }
  }

  // 创建 BUMP 碰撞体
  for (const bump of extractedColliders.bumps) {
    const bumpDesc = RAPIER.ColliderDesc.cuboid(
      bump.size.x / 2,
      bump.size.y / 2,
      bump.size.z / 2
    )
      .setTranslation(bump.center.x, bump.center.y, bump.center.z)
      .setRestitution(params.bump.restitution)
      .setFriction(params.bump.friction)
      .setCollisionGroups(BUMP_GROUPS);
    world.createCollider(bumpDesc);

    console.log(`[Physics] Created BUMP at (${bump.center.x.toFixed(2)}, ${bump.center.z.toFixed(2)})`);
  }

  // 创建场地边界碰撞体（围栏 + 联盟墙），优先使用围栏边界
  createBoundaryWalls(
    world,
    RAPIER,
    extractedColliders.fenceBounds || extractedColliders.fieldBounds
  );
}

/**
 * 创建场地三角网格碰撞体
 * @param {{ world: World, RAPIER: typeof RAPIER, params: Object }} physics
 * @param {{ vertices: Float32Array, indices: Uint32Array } | null} meshData
 * @param {{ restitution?: number, friction?: number } | null} material
 */
export function createFieldMeshCollider(physics, meshData, material = null) {
  if (!meshData) return;
  const { world, RAPIER, params } = physics;
  const resolvedMaterial = material || params.ground;
  const colliderDesc = RAPIER.ColliderDesc.trimesh(meshData.vertices, meshData.indices)
    .setRestitution(resolvedMaterial.restitution)
    .setFriction(resolvedMaterial.friction)
    .setCollisionGroups(FIELD_GROUPS);
  world.createCollider(colliderDesc);
  console.log(
    `[Physics] Created field trimesh collider: vertices=${(meshData.vertices.length / 3).toFixed(0)}, triangles=${(meshData.indices.length / 3).toFixed(0)}`
  );
}

/**
 * 步进物理世界（固定时间步长）
 * @param {import("@dimforge/rapier3d-compat").World} world
 */
export function stepPhysicsWorld(world) {
  world.step();
}
