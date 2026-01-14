export const GROUP_FIELD = 0x0001;
export const GROUP_BUMP = 0x0002;
export const GROUP_ROBOT = 0x0004;
export const GROUP_BALL = 0x0008;

export function makeGroups(membership, filter) {
  return (filter << 16) | membership;
}

export const FIELD_GROUPS = makeGroups(
  GROUP_FIELD,
  GROUP_FIELD | GROUP_ROBOT | GROUP_BALL
);
export const BUMP_GROUPS = makeGroups(GROUP_BUMP, GROUP_BALL);
export const ROBOT_GROUPS = makeGroups(GROUP_ROBOT, GROUP_FIELD);
export const BALL_GROUPS = makeGroups(GROUP_BALL, GROUP_FIELD | GROUP_BUMP);
