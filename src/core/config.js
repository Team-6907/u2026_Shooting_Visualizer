export const FIELD_LENGTH = 16.54;
export const FIELD_WIDTH = 8.07;
export const GRAVITY = 9.81;

export const BALL_DIAMETER = 0.15;
export const BALL_RADIUS = BALL_DIAMETER / 2;
export const BALL_MASS = 0.2;
export const AIR_DENSITY = 1.225;
export const BALL_CD = 0.47;
export const BALL_AREA = Math.PI * BALL_RADIUS * BALL_RADIUS;
export const DRAG_K = 0.5 * AIR_DENSITY * BALL_CD * BALL_AREA / BALL_MASS;

export const SIM_DT = 1 / 240;
export const MAX_SIM_TIME = 4.0;
export const TRAJ_DT = 1 / 120;
export const TRAJ_MAX_TIME = 3.5;
export const SHOT_INTERVAL = 0.25;
export const SHOT_LIFETIME = 3.2;
export const MAX_SHOTS = 36;

export const DEFAULT_TARGET = {
  x: 5.58,
  y: 3.35,
  z: 1.23,
};

export const HUB_OPENING_SIZE = 1.06;
export const HUB_HALF_WIDTH = 0.6;
export const SCORING_OPENING_SIZE = Math.max(HUB_OPENING_SIZE - 2 * BALL_RADIUS, 0.1);

// 物理引擎参数
export const PHYSICS_DT = 1 / 60; // 固定物理步进时间步长
export const HUB_HEIGHT = 1.83; // HUB 高度 (官方规格: 72in)
