/**
 * 从 Three.js 场地模型提取碰撞体位置信息
 * 必须在模型完成旋转/缩放/平移变换后调用
 */
import * as THREE from "three";

// 名称匹配模式
const HUB_BASE_PATTERN = /Hub Base/i;
const HUB_SIDE_PANEL_PATTERN = /Hub Side Panel$/i;
const BUMP_BODY_PATTERN = /Bump Body/i;
const FENCE_NAME_PATTERN = /Fence|Wall|Acrylic|Guard|Barrier|Field Plastic|Driver Station|Diamond Plate|Aluminum Angle/i;

/**
 * 从变换后的场地模型提取碰撞体信息
 * @param {THREE.Object3D} fieldModel - 已完成变换的场地模型
 * @returns {{ hubs: Array, bumps: Array, hubSidePanels: Array, fieldBounds: Object, fenceBounds: Object|null }}
 */
export function extractCollidersFromModel(fieldModel) {
  const colliders = {
    hubs: [],
    bumps: [],
    hubSidePanels: [],
    fieldBounds: null, // 场地整体边界
    fenceBounds: null, // 场地围栏边界（内侧）
  };

  // 用位置去重
  const processedPositions = {
    hub: new Set(),
    bump: new Set(),
    panel: new Set(),
  };

  fieldModel.updateMatrixWorld(true);
  const fieldBox = new THREE.Box3().setFromObject(fieldModel);
  const fieldSize = new THREE.Vector3();
  fieldBox.getSize(fieldSize);
  colliders.fieldBounds = {
    min: { x: fieldBox.min.x, y: fieldBox.min.y, z: fieldBox.min.z },
    max: { x: fieldBox.max.x, y: fieldBox.max.y, z: fieldBox.max.z },
    size: { x: fieldSize.x, y: fieldSize.y, z: fieldSize.z },
  };
  const fieldMinX = colliders.fieldBounds.min.x;
  const fieldMaxX = colliders.fieldBounds.max.x;
  const fieldMinZ = colliders.fieldBounds.min.z;
  const fieldMaxZ = colliders.fieldBounds.max.z;
  const edgeThreshold = Math.max(0.7, Math.min(fieldSize.x, fieldSize.z) * 0.08);

  const fenceBox = new THREE.Box3();
  let fenceBoxInitialized = false;
  let fenceCandidateCount = 0;

  let meshCount = 0;

  fieldModel.traverse((child) => {
    if (!child.isMesh) return;
    meshCount++;

    const name = child.name || "";

    // 确保世界矩阵是最新的
    child.updateMatrixWorld(true);

    // 获取世界坐标系下的边界盒
    const box = new THREE.Box3().setFromObject(child);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    // 生成位置 key（用于去重，精度降低到 0.1m）
    const posKey = `${center.x.toFixed(1)},${center.y.toFixed(1)},${center.z.toFixed(1)}`;

    // 提取 HUB Base
    if (HUB_BASE_PATTERN.test(name)) {
      if (!processedPositions.hub.has(posKey)) {
        colliders.hubs.push({
          name,
          center: { x: center.x, y: center.y, z: center.z },
          size: { x: size.x, y: size.y, z: size.z },
        });
        processedPositions.hub.add(posKey);
        console.log(`[Extractor] HUB Base: ${name}`, {
          center: [center.x.toFixed(2), center.y.toFixed(2), center.z.toFixed(2)],
          size: [size.x.toFixed(2), size.y.toFixed(2), size.z.toFixed(2)],
        });
      }
    }

    // 提取 HUB Side Panel
    if (HUB_SIDE_PANEL_PATTERN.test(name)) {
      if (!processedPositions.panel.has(posKey)) {
        colliders.hubSidePanels.push({
          name,
          center: { x: center.x, y: center.y, z: center.z },
          size: { x: size.x, y: size.y, z: size.z },
        });
        processedPositions.panel.add(posKey);
      }
    }

    // 提取 BUMP Body
    if (BUMP_BODY_PATTERN.test(name)) {
      if (!processedPositions.bump.has(posKey)) {
        colliders.bumps.push({
          name,
          center: { x: center.x, y: center.y, z: center.z },
          size: { x: size.x, y: size.y, z: size.z },
        });
        processedPositions.bump.add(posKey);
        console.log(`[Extractor] BUMP: ${name}`, {
          center: [center.x.toFixed(2), center.y.toFixed(2), center.z.toFixed(2)],
          size: [size.x.toFixed(2), size.y.toFixed(2), size.z.toFixed(2)],
        });
      }
    }

    // 提取场地围栏候选（长条、薄、近场地边缘）
    const minDim = Math.min(size.x, size.y, size.z);
    const maxDim = Math.max(size.x, size.y, size.z);
    const thickness = Math.min(size.x, size.z);
    const heightOk = size.y > 0.4 && size.y < 2.8;
    const thinOk = thickness < 0.2;
    const longOk = maxDim > 0.5;
    const edgeOk =
      Math.min(
        Math.abs(center.x - fieldMinX),
        Math.abs(center.x - fieldMaxX),
        Math.abs(center.z - fieldMinZ),
        Math.abs(center.z - fieldMaxZ)
      ) < edgeThreshold;
    const nameOk = FENCE_NAME_PATTERN.test(name);
    const isFenceCandidate = heightOk && thinOk && longOk && edgeOk && minDim < 0.5;

    if (isFenceCandidate || (nameOk && heightOk && thinOk)) {
      if (!fenceBoxInitialized) {
        fenceBox.copy(box);
        fenceBoxInitialized = true;
      } else {
        fenceBox.union(box);
      }
      fenceCandidateCount++;
    }
  });

  if (fenceBoxInitialized) {
    const fenceSize = new THREE.Vector3();
    fenceBox.getSize(fenceSize);
    colliders.fenceBounds = {
      min: { x: fenceBox.min.x, y: fenceBox.min.y, z: fenceBox.min.z },
      max: { x: fenceBox.max.x, y: fenceBox.max.y, z: fenceBox.max.z },
      size: { x: fenceSize.x, y: fenceSize.y, z: fenceSize.z },
    };
  }

  console.log(`[Extractor] Scanned ${meshCount} meshes`);
  console.log(
    `[Extractor] Found: ${colliders.hubs.length} HUBs, ${colliders.bumps.length} BUMPs`
  );
  console.log(
    `[Extractor] Field bounds size: (${colliders.fieldBounds.size.x.toFixed(2)}, ${colliders.fieldBounds.size.y.toFixed(2)}, ${colliders.fieldBounds.size.z.toFixed(2)})`
  );
  if (colliders.fenceBounds) {
    console.log(
      `[Extractor] Fence bounds size: (${colliders.fenceBounds.size.x.toFixed(2)}, ${colliders.fenceBounds.size.y.toFixed(2)}, ${colliders.fenceBounds.size.z.toFixed(2)}) from ${fenceCandidateCount} candidates`
    );
  } else {
    console.log("[Extractor] Fence bounds not detected, falling back to field bounds");
  }

  return colliders;
}

/**
 * 从场地模型构建三角网格碰撞数据（世界坐标）
 * @param {THREE.Object3D} fieldModel
 * @param {{
  *  minSize?: number,
 *  includePattern?: RegExp | null,
  *  excludePattern?: RegExp | null,
  *  fieldBounds?: { min: {x:number,y:number,z:number}, max: {x:number,y:number,z:number}, size?: {x:number,y:number,z:number} } | null,
  *  skipBoundaryMeshes?: boolean
 * }} options
 * @returns {{ vertices: Float32Array, indices: Uint32Array } | null}
 */
export function buildTrimeshFromModel(fieldModel, options = {}) {
  const {
    minSize = 0.2,
    includePattern = null,
    excludePattern = null,
    fieldBounds = null,
    skipBoundaryMeshes = false,
  } = options;

  const vertices = [];
  const indices = [];
  let meshCount = 0;

  let fieldMinX = 0;
  let fieldMaxX = 0;
  let fieldMinZ = 0;
  let fieldMaxZ = 0;
  let edgeThreshold = 0;
  if (fieldBounds && skipBoundaryMeshes) {
    fieldMinX = Math.min(fieldBounds.min.x, fieldBounds.max.x);
    fieldMaxX = Math.max(fieldBounds.min.x, fieldBounds.max.x);
    fieldMinZ = Math.min(fieldBounds.min.z, fieldBounds.max.z);
    fieldMaxZ = Math.max(fieldBounds.min.z, fieldBounds.max.z);
    const sizeX = Math.abs(fieldMaxX - fieldMinX);
    const sizeZ = Math.abs(fieldMaxZ - fieldMinZ);
    edgeThreshold = Math.max(0.7, Math.min(sizeX, sizeZ) * 0.08);
  }

  fieldModel.traverse((child) => {
    if (!child.isMesh) return;

    const name = child.name || "";
    if (includePattern && !includePattern.test(name)) return;
    if (excludePattern && excludePattern.test(name)) return;

    child.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(child);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim < minSize) return;

    if (skipBoundaryMeshes && fieldBounds) {
      const thickness = Math.min(size.x, size.z);
      const heightOk = size.y > 0.4 && size.y < 2.8;
      const thinOk = thickness < 0.2;
      const longOk = maxDim > 0.5;
      const edgeOk =
        Math.min(
          Math.abs((box.min.x + box.max.x) / 2 - fieldMinX),
          Math.abs((box.min.x + box.max.x) / 2 - fieldMaxX),
          Math.abs((box.min.z + box.max.z) / 2 - fieldMinZ),
          Math.abs((box.min.z + box.max.z) / 2 - fieldMaxZ)
        ) < edgeThreshold;
      if (heightOk && thinOk && longOk && edgeOk) return;
    }

    const geometry = child.geometry;
    if (!geometry || !geometry.attributes?.position) return;

    const positionAttr = geometry.attributes.position;
    const vertexCount = positionAttr.count;
    if (vertexCount === 0) return;

    const matrix = child.matrixWorld.elements;
    const vertexOffset = vertices.length / 3;
    const positions = positionAttr.array;

    for (let i = 0; i < vertexCount; i += 1) {
      const i3 = i * 3;
      const x = positions[i3];
      const y = positions[i3 + 1];
      const z = positions[i3 + 2];
      const nx = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
      const ny = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
      const nz = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
      vertices.push(nx, ny, nz);
    }

    if (geometry.index) {
      const indexArray = geometry.index.array;
      for (let i = 0; i < indexArray.length; i += 1) {
        indices.push(indexArray[i] + vertexOffset);
      }
    } else {
      for (let i = 0; i < vertexCount; i += 3) {
        indices.push(vertexOffset + i, vertexOffset + i + 1, vertexOffset + i + 2);
      }
    }

    meshCount += 1;
  });

  if (vertices.length === 0 || indices.length === 0) {
    return null;
  }

  console.log(
    `[Extractor] Field trimesh: meshes=${meshCount}, vertices=${(vertices.length / 3).toFixed(0)}, triangles=${(indices.length / 3).toFixed(0)}`
  );

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint32Array(indices),
  };
}

/**
 * 基于提取的 HUB 信息计算完整 HUB 碰撞体参数
 * @param {{ center: {x,y,z}, size: {x,y,z} }} hubBase
 * @param {Array} hubSidePanels
 * @returns {{ walls: Array, floor: Object }}
 */
export function calculateHubColliders(hubBase, hubSidePanels = []) {
  const { center, size } = hubBase;
  const wallThickness = 0.05;

  const hubSizeX = size.x > 0.5 ? size.x : 1.19;
  const hubSizeZ = size.z > 0.5 ? size.z : 1.19;
  const cx = center.x;
  const cz = center.z;

  let hubHeight = 1.27;
  if (hubSidePanels.length > 0) {
    const maxY = Math.max(...hubSidePanels.map((p) => p.center.y + p.size.y / 2));
    if (maxY > hubHeight) hubHeight = maxY;
  }

  console.log(
    `[Extractor] HUB collider: center=(${cx.toFixed(2)}, ${cz.toFixed(2)}), size=(${hubSizeX.toFixed(2)}, ${hubSizeZ.toFixed(2)}), height=${hubHeight.toFixed(2)}`
  );

  const hubCenterY = hubHeight / 2;

  return {
    floor: {
      position: { x: cx, y: 0.02, z: cz },
      size: { x: hubSizeX / 2, y: 0.02, z: hubSizeZ / 2 },
    },
    walls: [
      {
        position: { x: cx - hubSizeX / 2, y: hubCenterY, z: cz },
        size: { x: wallThickness / 2, y: hubHeight / 2, z: hubSizeZ / 2 },
      },
      {
        position: { x: cx + hubSizeX / 2, y: hubCenterY, z: cz },
        size: { x: wallThickness / 2, y: hubHeight / 2, z: hubSizeZ / 2 },
      },
      {
        position: { x: cx, y: hubCenterY, z: cz - hubSizeZ / 2 },
        size: { x: hubSizeX / 2, y: hubHeight / 2, z: wallThickness / 2 },
      },
      {
        position: { x: cx, y: hubCenterY, z: cz + hubSizeZ / 2 },
        size: { x: hubSizeX / 2, y: hubHeight / 2, z: wallThickness / 2 },
      },
    ],
  };
}
