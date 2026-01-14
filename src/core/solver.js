import {
  BALL_RADIUS,
  DRAG_K,
  GRAVITY,
  HUB_HALF_WIDTH,
  MAX_SIM_TIME,
  SCORING_OPENING_SIZE,
  SIM_DT,
} from "./config.js";

export function getTargetHeight(state) {
  return state.targetZ + BALL_RADIUS;
}

export function getLauncherWorldOffset(state) {
  const cosH = Math.cos(state.chassisHeading);
  const sinH = Math.sin(state.chassisHeading);
  const localX = state.launcherOffsetX;
  const localY = state.launcherOffsetY;
  return {
    x: cosH * localX - sinH * localY,
    y: sinH * localX + cosH * localY,
    z: state.launcherOffsetZ,
  };
}

function sampleAtX(prev, curr, targetX) {
  const dx = curr.x - prev.x;
  const ratio = dx !== 0 ? (targetX - prev.x) / dx : 0;
  return {
    t: prev.t + (curr.t - prev.t) * ratio,
    x: targetX,
    z: prev.z + (curr.z - prev.z) * ratio,
    vx: prev.vx + (curr.vx - prev.vx) * ratio,
    vz: prev.vz + (curr.vz - prev.vz) * ratio,
  };
}

function sampleAtZ(prev, curr, targetZ) {
  const dz = curr.z - prev.z;
  if (Math.abs(dz) < 1e-6) return null;
  const ratio = (targetZ - prev.z) / dz;
  return {
    t: prev.t + (curr.t - prev.t) * ratio,
    x: prev.x + (curr.x - prev.x) * ratio,
    z: targetZ,
    vx: prev.vx + (curr.vx - prev.vx) * ratio,
    vz: prev.vz + (curr.vz - prev.vz) * ratio,
  };
}

function simulateShotToRange(angle, speed, targetRange, edgeRange) {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  let vx = speed * cosA;
  let vz = speed * sinA;
  let x = 0;
  let z = 0;
  let t = 0;
  let edgeSample = null;
  let targetSample = null;
  let prev = { x, z, vx, vz, t };

  const maxX = Math.max(targetRange, edgeRange, 0) + 1.0;

  while (t < MAX_SIM_TIME && z > -2 && x <= maxX) {
    const v = Math.hypot(vx, vz);
    const ax = -DRAG_K * v * vx;
    const az = -GRAVITY - DRAG_K * v * vz;

    vx += ax * SIM_DT;
    vz += az * SIM_DT;
    x += vx * SIM_DT;
    z += vz * SIM_DT;
    t += SIM_DT;

    const curr = { x, z, vx, vz, t };

    if (!edgeSample && edgeRange > 0 && x >= edgeRange) {
      edgeSample = sampleAtX(prev, curr, edgeRange);
    }

    if (x >= targetRange) {
      targetSample = sampleAtX(prev, curr, targetRange);
      break;
    }

    if (vx <= 0 && x < targetRange) {
      break;
    }

    prev = curr;
  }

  return {
    reached: Boolean(targetSample),
    timeAtRange: targetSample ? targetSample.t : Infinity,
    zAtRange: targetSample ? targetSample.z : -Infinity,
    vxAtRange: targetSample ? targetSample.vx : 0,
    vzAtRange: targetSample ? targetSample.vz : 0,
    zAtEdge: edgeSample ? edgeSample.z : -Infinity,
    timeAtEdge: edgeSample ? edgeSample.t : Infinity,
  };
}

function solveSpeedForAngle(angle, targetRange, deltaH, edgeRange, maxSpeed) {
  const minSpeed = 0.5;
  let low = minSpeed;
  let high = maxSpeed;
  let lowSim = simulateShotToRange(angle, low, targetRange, edgeRange);
  let highSim = simulateShotToRange(angle, high, targetRange, edgeRange);

  if (!highSim.reached || highSim.zAtRange < deltaH) return null;

  if (lowSim.reached && lowSim.zAtRange > deltaH) {
    for (let i = 0; i < 6 && low > 0.1 && lowSim.zAtRange > deltaH; i += 1) {
      low *= 0.5;
      lowSim = simulateShotToRange(angle, low, targetRange, edgeRange);
    }
  }

  for (let i = 0; i < 10; i += 1) {
    const mid = (low + high) / 2;
    const midSim = simulateShotToRange(angle, mid, targetRange, edgeRange);
    const midZ = midSim.reached ? midSim.zAtRange : -Infinity;
    if (midZ >= deltaH) {
      high = mid;
      highSim = midSim;
    } else {
      low = mid;
      lowSim = midSim;
    }
  }

  return { speed: high, sim: highSim };
}

function simulateShotToHeight(vHorizontal, vz0, targetHeight) {
  let vx = vHorizontal;
  let vz = vz0;
  let x = 0;
  let z = 0;
  let t = 0;
  let prev = { x, z, vx, vz, t };
  let reachedUp = false;

  while (t < MAX_SIM_TIME && z > -2) {
    const v = Math.hypot(vx, vz);
    const ax = -DRAG_K * v * vx;
    const az = -GRAVITY - DRAG_K * v * vz;

    vx += ax * SIM_DT;
    vz += az * SIM_DT;
    x += vx * SIM_DT;
    z += vz * SIM_DT;
    t += SIM_DT;

    const curr = { x, z, vx, vz, t };

    if (!reachedUp && z >= targetHeight) {
      reachedUp = true;
    }

    if (reachedUp && z <= targetHeight) {
      const sample = sampleAtZ(prev, curr, targetHeight);
      if (sample) {
        return {
          reached: true,
          time: sample.t,
          x: sample.x,
          vx: sample.vx,
          vz: sample.vz,
        };
      }
      break;
    }

    if (vx <= 0 && !reachedUp) {
      break;
    }

    prev = curr;
  }

  return { reached: false };
}

function findOptimalHoodAngle(range, deltaH, targetHeight, state) {
  const step = 0.5 * Math.PI / 180;

  const launcherZ = state.launcherOffsetZ;
  const minHoodAngle = state.minHoodAngle * Math.PI / 180;
  const maxHoodAngle = state.maxHoodAngle * Math.PI / 180;
  const minEntryAngle = state.minEntryAngle * Math.PI / 180;
  const maxFlywheelSpeed = state.maxFlywheelSpeed;

  const distToHubEdge = Math.max(range - HUB_HALF_WIDTH - BALL_RADIUS, 0.05);

  let bestAngle = minHoodAngle;
  let minSpeed = Infinity;
  let foundValid = false;
  let bestEntryAngle = 0;
  let bestHeightAtEdge = 0;
  let bestTimeOfFlight = 0;

  let fallbackAngle = minHoodAngle;
  let fallbackSpeed = Infinity;
  let fallbackEntryAngle = 0;
  let fallbackHeightAtEdge = 0;
  let fallbackTimeOfFlight = 0;
  let fallbackLevel = 0;

  for (let angle = minHoodAngle; angle <= maxHoodAngle; angle += step) {
    const solved = solveSpeedForAngle(angle, range, deltaH, distToHubEdge, maxFlywheelSpeed);
    if (!solved) continue;
    const speed = solved.speed;
    const sim = solved.sim;

    const heightAtEdge = sim.zAtEdge + launcherZ;
    const clearsHub = heightAtEdge > targetHeight;

    if (!clearsHub) {
      if (fallbackLevel < 1 || (fallbackLevel === 1 && speed < fallbackSpeed)) {
        fallbackLevel = 1;
        fallbackSpeed = speed;
        fallbackAngle = angle;
        fallbackHeightAtEdge = heightAtEdge;
        fallbackEntryAngle = 0;
        fallbackTimeOfFlight = sim.timeAtRange;
      }
      continue;
    }

    const isDescending = sim.vzAtRange < 0;

    if (!isDescending) {
      if (fallbackLevel < 2 || (fallbackLevel === 2 && speed < fallbackSpeed)) {
        fallbackLevel = 2;
        fallbackSpeed = speed;
        fallbackAngle = angle;
        fallbackHeightAtEdge = heightAtEdge;
        fallbackEntryAngle = 0;
        fallbackTimeOfFlight = sim.timeAtRange;
      }
      continue;
    }

    const entryAngleRad = Math.atan2(-sim.vzAtRange, Math.max(sim.vxAtRange, 0.01));
    const entryAngleDeg = entryAngleRad * 180 / Math.PI;
    const isSteepEnough = entryAngleRad >= minEntryAngle;

    if (!isSteepEnough) {
      if (fallbackLevel < 3 || (fallbackLevel === 3 && speed < fallbackSpeed)) {
        fallbackLevel = 3;
        fallbackSpeed = speed;
        fallbackAngle = angle;
        fallbackHeightAtEdge = heightAtEdge;
        fallbackEntryAngle = entryAngleDeg;
        fallbackTimeOfFlight = sim.timeAtRange;
      }
      continue;
    }

    if (!foundValid || speed < minSpeed) {
      foundValid = true;
      minSpeed = speed;
      bestAngle = angle;
      bestEntryAngle = entryAngleDeg;
      bestHeightAtEdge = heightAtEdge;
      bestTimeOfFlight = sim.timeAtRange;
    }
  }

  if (foundValid) {
    return {
      angle: bestAngle,
      speed: minSpeed,
      heightAtEdge: bestHeightAtEdge,
      clearsHub: true,
      isDescending: true,
      isSteepEnough: true,
      entryAngleDeg: bestEntryAngle,
      timeOfFlight: bestTimeOfFlight,
      isValid: true,
    };
  }

  return {
    angle: fallbackAngle,
    speed: fallbackSpeed,
    heightAtEdge: fallbackHeightAtEdge,
    clearsHub: fallbackLevel >= 2,
    isDescending: fallbackLevel >= 3,
    isSteepEnough: false,
    entryAngleDeg: fallbackEntryAngle,
    timeOfFlight: fallbackTimeOfFlight,
    isValid: false,
  };
}

function getHubHexPoints(openingSize, centerX, centerY) {
  const apothem = openingSize / 2;
  const radius = apothem / Math.cos(Math.PI / 6);
  const points = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (i * Math.PI) / 3 - Math.PI / 6;
    points.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }
  return points;
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function computeShootingSolution(state) {
  const { robotX, robotY, robotVx, robotVy, shootOnMove } = state;
  const targetX = state.targetX;
  const targetY = state.targetY;
  const targetHeight = getTargetHeight(state);
  const launcherOffset = getLauncherWorldOffset(state);
  const launcherX = robotX + launcherOffset.x;
  const launcherY = robotY + launcherOffset.y;

  const dx = targetX - launcherX;
  const dy = targetY - launcherY;
  const range = Math.hypot(dx, dy);
  const goalAngle = Math.atan2(dy, dx);
  const deltaH = targetHeight - launcherOffset.z;

  const cosG = Math.cos(goalAngle);
  const sinG = Math.sin(goalAngle);
  const radialV = robotVx * cosG + robotVy * sinG;
  const tangentialV = -robotVx * sinG + robotVy * cosG;

  let timeOfFlight = 0.6;
  let effectiveRange = range;
  let effectiveShotSpeed = range / timeOfFlight;
  let hoodAngle = 60 * Math.PI / 180;
  let flywheelSpeed = 10;
  let isValid = false;
  let clearsHub = false;
  let heightAtEdge = 0;
  let isDescending = false;
  let isSteepEnough = false;
  let entryAngleDeg = 0;

  for (let iter = 0; iter < 3; iter += 1) {
    if (shootOnMove && timeOfFlight > 0) {
      effectiveShotSpeed = range / timeOfFlight - radialV;
      if (effectiveShotSpeed < 0.1) effectiveShotSpeed = 0.1;
      effectiveRange = timeOfFlight * Math.hypot(tangentialV, effectiveShotSpeed);
    } else {
      effectiveShotSpeed = range / timeOfFlight;
      effectiveRange = range;
    }

    const hoodResult = findOptimalHoodAngle(effectiveRange, deltaH, targetHeight, state);
    hoodAngle = hoodResult.angle;
    flywheelSpeed = hoodResult.speed;
    clearsHub = hoodResult.clearsHub;
    heightAtEdge = hoodResult.heightAtEdge;
    isDescending = hoodResult.isDescending;
    isSteepEnough = hoodResult.isSteepEnough;
    entryAngleDeg = hoodResult.entryAngleDeg;
    timeOfFlight = hoodResult.timeOfFlight;
    isValid = hoodResult.isValid && Number.isFinite(flywheelSpeed) && flywheelSpeed > 0;

    if (!isValid || !Number.isFinite(timeOfFlight)) {
      isValid = false;
      break;
    }
  }

  let yawCompensation = 0;
  if (shootOnMove && effectiveShotSpeed > 0.1) {
    yawCompensation = Math.atan2(-tangentialV, effectiveShotSpeed);
  }
  const chassisHeading = goalAngle + yawCompensation;

  const virtualTarget = {
    x: targetX - robotVx * timeOfFlight * (shootOnMove ? 1 : 0),
    y: targetY - robotVy * timeOfFlight * (shootOnMove ? 1 : 0),
  };

  const vz = flywheelSpeed * Math.sin(hoodAngle);
  const vHorizontal = flywheelSpeed * Math.cos(hoodAngle);

  const flywheelVx = vHorizontal * Math.cos(chassisHeading);
  const flywheelVy = vHorizontal * Math.sin(chassisHeading);

  const ballVx = flywheelVx + robotVx;
  const ballVy = flywheelVy + robotVy;
  const ballSpeedHorizontal = Math.hypot(ballVx, ballVy);

  let impactPoint = { x: targetX, y: targetY };
  let actualToF = timeOfFlight;

  if (isValid && ballSpeedHorizontal > 0.01) {
    const flight = simulateShotToHeight(ballSpeedHorizontal, vz, deltaH);
    if (flight.reached) {
      actualToF = flight.time;
      const dirX = ballVx / ballSpeedHorizontal;
      const dirY = ballVy / ballSpeedHorizontal;
      impactPoint = {
        x: launcherX + dirX * flight.x,
        y: launcherY + dirY * flight.x,
      };
    } else {
      isValid = false;
    }
  } else {
    isValid = false;
  }

  const hubHexPoints = getHubHexPoints(SCORING_OPENING_SIZE, targetX, targetY);
  const inTarget = pointInPolygon(impactPoint, hubHexPoints);
  const isOnTarget = isValid && clearsHub && isDescending && isSteepEnough && inTarget;

  return {
    chassisHeading,
    flywheelSpeed,
    hoodAngle,
    hoodAngleDeg: hoodAngle * 180 / Math.PI,
    range,
    effectiveRange,
    timeOfFlight: actualToF,
    yawCompensation,
    yawCompensationDeg: yawCompensation * 180 / Math.PI,
    virtualTarget,
    impactPoint,
    isValid,
    clearsHub,
    heightAtEdge,
    isDescending,
    isSteepEnough,
    entryAngleDeg,
    inTarget,
    isOnTarget,
    goalAngle,
    launcherX,
    launcherY,
    launcherZ: launcherOffset.z,
    ballVx,
    ballVy,
    vz,
  };
}
