import { DEFAULT_TARGET } from "./config.js";

export function createState() {
  return {
    robotX: 2.0,
    robotY: 4.035,
    robotVx: 0,
    robotVy: 0,
    chassisHeading: 0,
    maxLinearSpeed: 2.0,
    maxAcceleration: 3.0,
    shootOnMove: true,
    minHoodAngle: 45,
    maxHoodAngle: 90,
    minEntryAngle: 45,
    maxFlywheelSpeed: 25,
    targetX: DEFAULT_TARGET.x,
    targetY: DEFAULT_TARGET.y,
    targetZ: DEFAULT_TARGET.z,
    launcherOffsetX: -0.53,
    launcherOffsetY: 0.05,
    launcherOffsetZ: 0.53,
  };
}

export function createKeys() {
  return { w: false, a: false, s: false, d: false };
}
