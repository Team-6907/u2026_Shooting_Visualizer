const translations = {
  zh: {
    appTitle: "GOATSim-Shooting 模拟器",
    hudMove: "移动",
    hudStop: "停",
    legendAim: "瞄准",
    legendVirtual: "虚拟目标",
    legendImpact: "落点",
    legendTrajectory: "弹道",
    legendVelocity: "速度",
    cameraHint: "拖拽旋转 · 滚轮缩放 · 点击启用键盘",
    controlsTitle: "控制",
    language: "语言",
    renderQuality: "画质",
    qualityPerformance: "性能",
    qualityFidelity: "拟真",
    positionXY: "位置 X/Y (m)",
    maxSpeed: "最大速度 (m/s)",
    maxAccel: "最大加速度 (m/s²)",
    shootOnMove: "动态补偿",
    mechanismSection: "⚙️ 机构参数",
    minHoodAngle: "Hood 最小角 (°)",
    maxHoodAngle: "Hood 最大角 (°)",
    minEntryAngle: "最小入射角 (°)",
    maxFlywheelSpeed: "飞轮最高速 (m/s)",
    launcherOffsetX: "发射口偏移 X (m)",
    launcherOffsetY: "发射口偏移 Y (m)",
    launcherOffsetZ: "发射口高度 Z (m)",
    dispersionSection: "🎯 散度参数",
    dispersionBase: "散度基线 (m)",
    dispersionPerMeter: "距离增益 (m/m)",
    dispersionHelper: "散度 ≈ 基线 + 距离增益 × 距离",
    targetSection: "🎯 目标射击点 (m)",
    targetX: "目标 X",
    targetY: "目标 Y",
    targetZ: "目标 Z",
    resetTarget: "恢复默认",
    metricRange: "距离",
    metricFlywheel: "飞轮",
    metricHood: "Hood",
    metricEntry: "入射角",
    metricOnTarget: "命中",
    yes: "是",
    no: "否",
  },
  en: {
    appTitle: "GOATSim-Shooting Simulator",
    hudMove: "Move",
    hudStop: "Stop",
    legendAim: "Aim",
    legendVirtual: "Virtual Target",
    legendImpact: "Impact",
    legendTrajectory: "Trajectory",
    legendVelocity: "Velocity",
    cameraHint: "Drag to orbit · Scroll to zoom · Click to enable keyboard",
    controlsTitle: "Controls",
    language: "Language",
    renderQuality: "Quality",
    qualityPerformance: "Performance",
    qualityFidelity: "Fidelity",
    positionXY: "Position X/Y (m)",
    maxSpeed: "Max speed (m/s)",
    maxAccel: "Max acceleration (m/s²)",
    shootOnMove: "Shoot on move",
    mechanismSection: "⚙️ Mechanism",
    minHoodAngle: "Min hood angle (°)",
    maxHoodAngle: "Max hood angle (°)",
    minEntryAngle: "Min entry angle (°)",
    maxFlywheelSpeed: "Max flywheel speed (m/s)",
    launcherOffsetX: "Launcher offset X (m)",
    launcherOffsetY: "Launcher offset Y (m)",
    launcherOffsetZ: "Launcher height Z (m)",
    dispersionSection: "🎯 Dispersion",
    dispersionBase: "Base spread (m)",
    dispersionPerMeter: "Distance gain (m/m)",
    dispersionHelper: "Spread ≈ base + gain × distance",
    targetSection: "🎯 Target point (m)",
    targetX: "Target X",
    targetY: "Target Y",
    targetZ: "Target Z",
    resetTarget: "Reset",
    metricRange: "Range",
    metricFlywheel: "Flywheel",
    metricHood: "Hood",
    metricEntry: "Entry angle",
    metricOnTarget: "On target",
    yes: "Yes",
    no: "No",
  },
};

const fallbackLanguage = "zh";
let currentLanguage = fallbackLanguage;

function translate(key) {
  const dict = translations[currentLanguage] || translations[fallbackLanguage];
  return dict[key] ?? key;
}

function applyTranslations() {
  const dict = translations[currentLanguage] || translations[fallbackLanguage];
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (!key || !dict[key]) return;
    el.textContent = dict[key];
  });
  if (dict.appTitle) {
    document.title = dict.appTitle;
  }
  document.documentElement.lang = currentLanguage === "en" ? "en" : "zh";
}

function setLanguage(state, nextLanguage, shouldPersist = true) {
  const chosen = translations[nextLanguage] ? nextLanguage : fallbackLanguage;
  currentLanguage = chosen;
  state.language = chosen;
  applyTranslations();
  if (shouldPersist) {
    try {
      localStorage.setItem("language", chosen);
    } catch (err) {
      console.warn("[i18n] Failed to persist language", err);
    }
  }
}

export function initI18n(state) {
  let initial = state.language || fallbackLanguage;
  try {
    const stored = localStorage.getItem("language");
    if (stored && translations[stored]) {
      initial = stored;
    }
  } catch (err) {
    console.warn("[i18n] Failed to read language preference", err);
  }

  const select = document.getElementById("langSelect");
  if (select) {
    select.addEventListener("change", (event) => {
      setLanguage(state, event.target.value);
    });
  }

  setLanguage(state, initial, false);

  if (select) {
    select.value = currentLanguage;
  }

  return {
    t: translate,
    getLanguage: () => currentLanguage,
  };
}
