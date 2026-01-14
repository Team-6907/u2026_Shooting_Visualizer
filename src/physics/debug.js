/**
 * 物理碰撞体调试可视化
 * 用线框显示碰撞盒，帮助调试
 */
import * as THREE from "three";

/**
 * 创建碰撞体可视化线框组
 * @param {THREE.Scene} scene
 * @returns {{ addBox: Function, addSphere: Function, clear: Function, group: THREE.Group }}
 */
export function createDebugVisuals(scene) {
  const group = new THREE.Group();
  group.name = "PhysicsDebug";
  scene.add(group);

  const material = new THREE.LineBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.5,
  });

  /**
   * 添加盒子碰撞体可视化
   * @param {{ x: number, y: number, z: number }} position - 中心位置
   * @param {{ x: number, y: number, z: number }} halfExtents - 半尺寸
   */
  function addBox(position, halfExtents) {
    const geometry = new THREE.BoxGeometry(
      halfExtents.x * 2,
      halfExtents.y * 2,
      halfExtents.z * 2
    );
    const edges = new THREE.EdgesGeometry(geometry);
    const wireframe = new THREE.LineSegments(edges, material);
    wireframe.position.set(position.x, position.y, position.z);
    group.add(wireframe);
    geometry.dispose();
  }

  /**
   * 添加球体碰撞体可视化
   * @param {{ x: number, y: number, z: number }} position
   * @param {number} radius
   */
  function addSphere(position, radius) {
    const geometry = new THREE.SphereGeometry(radius, 8, 8);
    const edges = new THREE.EdgesGeometry(geometry);
    const wireframe = new THREE.LineSegments(edges, material);
    wireframe.position.set(position.x, position.y, position.z);
    group.add(wireframe);
    geometry.dispose();
  }

  /**
   * 清除所有可视化
   */
  function clear() {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child.geometry) child.geometry.dispose();
    }
  }

  /**
   * 设置可见性
   * @param {boolean} visible
   */
  function setVisible(visible) {
    group.visible = visible;
  }

  return {
    group,
    addBox,
    addSphere,
    clear,
    setVisible,
  };
}

/**
 * 从 Rapier 世界提取碰撞体并可视化
 * @param {import("@dimforge/rapier3d-compat").World} world
 * @param {{ addBox: Function, addSphere: Function }} debugVisuals
 */
export function visualizeColliders(world, debugVisuals) {
  debugVisuals.clear();

  world.colliders.forEach((collider) => {
    const pos = collider.translation();
    const shape = collider.shape;
    const shapeType = shape.type;

    // Rapier shape types: 0=Ball, 1=Cuboid, etc.
    if (shapeType === 1) {
      // Cuboid
      const halfExtents = shape.halfExtents;
      debugVisuals.addBox(pos, halfExtents);
    } else if (shapeType === 0) {
      // Ball
      const radius = shape.radius;
      debugVisuals.addSphere(pos, radius);
    }
  });
}
