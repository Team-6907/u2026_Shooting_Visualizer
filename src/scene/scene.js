import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import {
  BALL_DIAMETER,
  BALL_RADIUS,
  DRAG_K,
  DEFAULT_TARGET,
  FIELD_LENGTH,
  FIELD_WIDTH,
  GRAVITY,
  MAX_SHOTS,
  SHOT_INTERVAL,
  SHOT_LIFETIME,
  TRAJ_DT,
  TRAJ_MAX_TIME,
} from "../core/config.js";
import { getTargetHeight } from "../core/solver.js";

const ROBOT_HEADING_OFFSET = 0;
const ROBOT_MODEL_YAW_OFFSET = 0;
const ROBOT_MODEL_PITCH_OFFSET = -Math.PI / 2;
const ROBOT_MODEL_ROLL_OFFSET = 0;

export function createScene(container, state) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x16213e);

  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(-1, 6, 4.035);
  camera.lookAt(DEFAULT_TARGET.x, 1.5, DEFAULT_TARGET.y);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.physicallyCorrectLights = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  container.appendChild(renderer.domElement);

  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.target.set(DEFAULT_TARGET.x, 1, DEFAULT_TARGET.y);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.05;
  orbitControls.update();

  let lastTargetX = state.targetX;
  let lastTargetY = state.targetY;

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2c3e50, 0.5));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(10, 20, 10);
  dirLight.castShadow = true;
  scene.add(dirLight);

  const fieldGroup = new THREE.Group();
  scene.add(fieldGroup);

  const gltfLoader = new GLTFLoader();
  const robotConfigPromise = fetch("assets/Robot_2026FRCKitBotV1/config.json")
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);
  const fallbackRobotConfig = {
    rotations: [
      { axis: "x", degrees: 90 },
      { axis: "z", degrees: 90 },
    ],
    position: [-0.3, 0, 0.05],
  };

  function applyConfigRotations(object, rotations) {
    if (!Array.isArray(rotations)) return;
    rotations.forEach((rot) => {
      const axis = rot.axis;
      const radians = THREE.MathUtils.degToRad(rot.degrees || 0);
      if (axis === "x") object.rotateX(radians);
      if (axis === "y") object.rotateY(radians);
      if (axis === "z") object.rotateZ(radians);
    });
  }

  function simplifyMaterial(material) {
    const lambert = new THREE.MeshLambertMaterial({
      color: material?.color ? material.color.clone() : new THREE.Color(0xffffff),
      map: material?.map || null,
      transparent: material?.transparent || false,
      opacity: material?.opacity ?? 1,
      side: material?.side ?? THREE.FrontSide,
    });
    if (material?.emissive) lambert.emissive.copy(material.emissive);
    if (material?.emissiveMap) lambert.emissiveMap = material.emissiveMap;
    if (typeof material?.alphaTest === "number") lambert.alphaTest = material.alphaTest;
    lambert.depthWrite = material?.depthWrite ?? true;
    lambert.depthTest = material?.depthTest ?? true;
    return lambert;
  }

  function simplifyMeshMaterials(mesh) {
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((mat) => simplifyMaterial(mat));
    } else if (mesh.material) {
      mesh.material = simplifyMaterial(mesh.material);
    }
  }

  gltfLoader.load(
    "assets/Field3d_2026FRCFieldV1/model.glb",
    (gltf) => {
      const model = gltf.scene;
      model.rotation.set(0, 0, 0);

      const initialBox = new THREE.Box3().setFromObject(model);
      const initialSize = new THREE.Vector3();
      initialBox.getSize(initialSize);

      const axes = [
        { axis: 0, size: initialSize.x },
        { axis: 1, size: initialSize.y },
        { axis: 2, size: initialSize.z },
      ].sort((a, b) => b.size - a.size);

      const lengthAxis = axes[0].axis;
      const widthAxis = axes[1].axis;
      const heightAxis = axes[2].axis;

      const basis = [null, null, null];
      basis[lengthAxis] = new THREE.Vector3(1, 0, 0);
      basis[widthAxis] = new THREE.Vector3(0, 0, 1);
      basis[heightAxis] = new THREE.Vector3(0, 1, 0);

      const rotMatrix = new THREE.Matrix4().makeBasis(basis[0], basis[1], basis[2]);
      if (rotMatrix.determinant() < 0) {
        basis[widthAxis].multiplyScalar(-1);
        rotMatrix.makeBasis(basis[0], basis[1], basis[2]);
      }
      model.setRotationFromMatrix(rotMatrix);

      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);

      const scaleX = FIELD_LENGTH / size.x;
      const scaleZ = FIELD_WIDTH / size.z;
      const scale = Math.min(scaleX, scaleZ);
      model.scale.setScalar(scale);

      const scaledBox = new THREE.Box3().setFromObject(model);
      model.position.set(
        model.position.x - scaledBox.min.x,
        model.position.y - scaledBox.min.y,
        model.position.z - scaledBox.min.z
      );

      model.traverse((child) => {
        if (child.isMesh) {
          simplifyMeshMaterials(child);
          child.castShadow = false;
          child.receiveShadow = true;
        }
      });

      fieldGroup.add(model);
    },
    undefined,
    (error) => {
      console.warn("Failed to load field model", error);
    }
  );

  let fuelTemplate = null;
  gltfLoader.load(
    "assets/Field3d_2026FRCFieldV1/model_0.glb",
    (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = maxDim > 0 ? BALL_DIAMETER / maxDim : 1;
      model.scale.setScalar(scale);
      const scaledBox = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      scaledBox.getCenter(center);
      model.position.sub(center);
      model.traverse((child) => {
        if (child.isMesh) {
          simplifyMeshMaterials(child);
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      fuelTemplate = model;
    },
    undefined,
    (error) => {
      console.warn("Failed to load fuel model", error);
    }
  );

  const robotGroup = new THREE.Group();
  const robotVisual = new THREE.Group();
  robotGroup.add(robotVisual);
  scene.add(robotGroup);
  robotVisual.rotation.y = ROBOT_MODEL_YAW_OFFSET;

  gltfLoader.load(
    "assets/Robot_2026FRCKitBotV1/model.glb",
    (gltf) => {
      const model = gltf.scene;
      robotConfigPromise.then((config) => {
        const resolvedConfig = config || fallbackRobotConfig;
        model.rotation.set(0, 0, 0);
        applyConfigRotations(model, resolvedConfig.rotations);
        model.rotateX(ROBOT_MODEL_PITCH_OFFSET);
        model.rotateZ(ROBOT_MODEL_ROLL_OFFSET);

        const box = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        box.getCenter(center);
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= box.min.y;

        if (Array.isArray(resolvedConfig.position)) {
          model.position.x += resolvedConfig.position[0] || 0;
          model.position.y += resolvedConfig.position[1] || 0;
          model.position.z += resolvedConfig.position[2] || 0;
        }

        model.traverse((child) => {
          if (child.isMesh) {
            simplifyMeshMaterials(child);
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        robotVisual.add(model);
      });
    },
    undefined,
    (error) => {
      console.warn("Failed to load robot model", error);
    }
  );

  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0.25, 0);
  arrowShape.lineTo(-0.1, -0.12);
  arrowShape.lineTo(-0.1, 0.12);
  arrowShape.closePath();
  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xee6c4d, side: THREE.DoubleSide });
  const directionArrow = new THREE.Mesh(arrowGeo, arrowMat);
  directionArrow.rotation.x = -Math.PI / 2;
  directionArrow.position.y = 0.35;
  robotGroup.add(directionArrow);

  const velocityArrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, 0),
    1,
    0x2a9d8f,
    0.15,
    0.1
  );
  scene.add(velocityArrow);

  const refLineMat = new THREE.LineDashedMaterial({
    color: 0x666666,
    dashSize: 0.15,
    gapSize: 0.1,
    transparent: true,
    opacity: 0.5,
  });
  const refLineGeo = new THREE.BufferGeometry();
  const refLine = new THREE.Line(refLineGeo, refLineMat);
  scene.add(refLine);

  const aimLineMat = new THREE.LineBasicMaterial({ color: 0xee6c4d, transparent: true, opacity: 0.8 });
  const aimLineGeo = new THREE.BufferGeometry();
  const aimLine = new THREE.Line(aimLineGeo, aimLineMat);
  scene.add(aimLine);

  const vtGeo = new THREE.RingGeometry(0.08, 0.12, 32);
  const vtMat = new THREE.MeshBasicMaterial({
    color: 0xffb703,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7,
  });
  const vtMesh = new THREE.Mesh(vtGeo, vtMat);
  vtMesh.rotation.x = -Math.PI / 2;
  scene.add(vtMesh);

  const vtLineMat = new THREE.LineDashedMaterial({
    color: 0xffb703,
    dashSize: 0.1,
    gapSize: 0.05,
    transparent: true,
    opacity: 0.5,
  });
  const vtLineGeo = new THREE.BufferGeometry();
  const vtLine = new THREE.Line(vtLineGeo, vtLineMat);
  scene.add(vtLine);

  const targetMarkerGeo = new THREE.RingGeometry(0.14, 0.2, 32);
  const targetMarkerMat = new THREE.MeshBasicMaterial({
    color: 0x00b4d8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7,
  });
  const targetMarker = new THREE.Mesh(targetMarkerGeo, targetMarkerMat);
  targetMarker.rotation.x = -Math.PI / 2;
  scene.add(targetMarker);

  const impactGeo = new THREE.SphereGeometry(BALL_RADIUS, 16, 16);
  const impactMat = new THREE.MeshBasicMaterial({ color: 0x2a9d8f, transparent: true, opacity: 0.9 });
  const impactMesh = new THREE.Mesh(impactGeo, impactMat);
  scene.add(impactMesh);

  const shotsGroup = new THREE.Group();
  scene.add(shotsGroup);
  const shotGeo = new THREE.SphereGeometry(BALL_RADIUS, 16, 16);
  const baseShotMaterial = new THREE.MeshLambertMaterial({
    color: 0xffb703,
    transparent: true,
    opacity: 0.9,
  });

  const shots = [];
  let shotTimer = 0;

  function buildFuelShot() {
    if (!fuelTemplate) {
      const mesh = new THREE.Mesh(shotGeo, baseShotMaterial.clone());
      return { object: mesh, materials: [mesh.material] };
    }

    const shot = fuelTemplate.clone(true);
    const materials = [];
    shot.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.transparent = true;
        child.castShadow = true;
        child.receiveShadow = true;
        materials.push(child.material);
      }
    });
    return { object: shot, materials };
  }

  function spawnShot(solution) {
    const shotData = buildFuelShot();
    const shot = shotData.object;
    const x = solution.launcherX;
    const y = solution.launcherY;
    const z = solution.launcherZ;
    shot.position.set(x, z, y);
    shotsGroup.add(shot);

    shots.push({
      object: shot,
      materials: shotData.materials,
      x,
      y,
      z,
      vx: solution.ballVx,
      vy: solution.ballVy,
      vz: solution.vz,
      age: 0,
    });

    if (shots.length > MAX_SHOTS) {
      const old = shots.shift();
      shotsGroup.remove(old.object);
      old.materials.forEach((mat) => mat.dispose());
    }
  }

  function updateShots(dt, solution) {
    const targetHeight = getTargetHeight(state);
    if (solution && solution.isValid) {
      shotTimer += dt;
      if (shotTimer >= SHOT_INTERVAL) {
        spawnShot(solution);
        shotTimer = 0;
      }
    } else {
      shotTimer = 0;
    }

    for (let i = shots.length - 1; i >= 0; i -= 1) {
      const shot = shots[i];
      shot.age += dt;

      const speed = Math.hypot(shot.vx, shot.vy, shot.vz);
      const ax = -DRAG_K * speed * shot.vx;
      const ay = -DRAG_K * speed * shot.vy;
      const az = -GRAVITY - DRAG_K * speed * shot.vz;

      shot.vx += ax * dt;
      shot.vy += ay * dt;
      shot.vz += az * dt;

      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.z += shot.vz * dt;

      shot.object.position.set(shot.x, shot.z, shot.y);
      const opacity = Math.max(0, 0.95 - shot.age / SHOT_LIFETIME);
      shot.materials.forEach((mat) => {
        mat.opacity = opacity;
      });

      if ((shot.vz < 0 && shot.z <= targetHeight) || shot.z < BALL_RADIUS || shot.age > SHOT_LIFETIME) {
        shotsGroup.remove(shot.object);
        shot.materials.forEach((mat) => mat.dispose());
        shots.splice(i, 1);
      }
    }
  }

  let trajectoryLine = null;

  function updateTrajectory(solution) {
    if (trajectoryLine) {
      scene.remove(trajectoryLine);
      trajectoryLine.geometry.dispose();
      trajectoryLine = null;
    }

    if (!solution.isValid) return;

    const points = [];
    const { ballVx, ballVy, vz } = solution;
    let x = solution.launcherX;
    let y = solution.launcherY;
    let z = solution.launcherZ;
    let vx = ballVx;
    let vy = ballVy;
    let vzCurr = vz;
    const targetHeight = getTargetHeight(state);

    for (let t = 0; t < TRAJ_MAX_TIME; t += TRAJ_DT) {
      points.push(new THREE.Vector3(x, z, y));

      const prevX = x;
      const prevY = y;
      const prevZ = z;

      const speed = Math.hypot(vx, vy, vzCurr);
      const ax = -DRAG_K * speed * vx;
      const ay = -DRAG_K * speed * vy;
      const az = -GRAVITY - DRAG_K * speed * vzCurr;

      vx += ax * TRAJ_DT;
      vy += ay * TRAJ_DT;
      vzCurr += az * TRAJ_DT;

      x += vx * TRAJ_DT;
      y += vy * TRAJ_DT;
      z += vzCurr * TRAJ_DT;

      if (vzCurr < 0 && z <= targetHeight) {
        const dz = z - prevZ;
        const ratio = dz !== 0 ? (targetHeight - prevZ) / dz : 0;
        const ix = prevX + (x - prevX) * ratio;
        const iy = prevY + (y - prevY) * ratio;
        points.push(new THREE.Vector3(ix, targetHeight, iy));
        break;
      }

      if (z < BALL_RADIUS) break;
    }

    if (points.length < 2) return;

    const trajGeo = new THREE.BufferGeometry().setFromPoints(points);
    const trajMat = new THREE.LineBasicMaterial({ color: 0xee6c4d, transparent: true, opacity: 0.8 });
    trajectoryLine = new THREE.Line(trajGeo, trajMat);
    scene.add(trajectoryLine);
  }

  function updateScene(solution) {
    const targetHeight = getTargetHeight(state);

    if (state.targetX !== lastTargetX || state.targetY !== lastTargetY) {
      orbitControls.target.set(state.targetX, 1, state.targetY);
      lastTargetX = state.targetX;
      lastTargetY = state.targetY;
    }

    robotGroup.position.set(state.robotX, 0, state.robotY);
    robotGroup.rotation.y = -state.chassisHeading + ROBOT_HEADING_OFFSET;

    const speed = Math.hypot(state.robotVx, state.robotVy);
    if (speed > 0.01) {
      velocityArrow.visible = true;
      velocityArrow.position.set(state.robotX, 0.3, state.robotY);
      velocityArrow.setDirection(new THREE.Vector3(state.robotVx, 0, state.robotVy).normalize());
      velocityArrow.setLength(Math.min(speed * 2, 3), 0.15, 0.1);
    } else {
      velocityArrow.visible = false;
    }

    refLineGeo.setFromPoints([
      new THREE.Vector3(solution.launcherX, solution.launcherZ, solution.launcherY),
      new THREE.Vector3(state.targetX, targetHeight, state.targetY),
    ]);
    refLine.computeLineDistances();

    aimLineGeo.setFromPoints([
      new THREE.Vector3(solution.launcherX, solution.launcherZ, solution.launcherY),
      new THREE.Vector3(state.targetX, targetHeight, state.targetY),
    ]);

    vtMesh.position.set(solution.virtualTarget.x, 0.02, solution.virtualTarget.y);
    vtLineGeo.setFromPoints([
      new THREE.Vector3(solution.virtualTarget.x, 0.02, solution.virtualTarget.y),
      new THREE.Vector3(solution.virtualTarget.x, targetHeight, solution.virtualTarget.y),
    ]);
    vtLine.computeLineDistances();

    targetMarker.position.set(state.targetX, targetHeight, state.targetY);

    impactMesh.position.set(solution.impactPoint.x, targetHeight, solution.impactPoint.y);
    impactMat.color.setHex(solution.isOnTarget ? 0x2a9d8f : 0xc1121f);

    updateTrajectory(solution);
  }

  function tick(solution, dt) {
    updateScene(solution);
    updateShots(dt, solution);
  }

  function render() {
    orbitControls.update();
    renderer.render(scene, camera);
  }

  function resize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  return {
    tick,
    render,
    resize,
  };
}
