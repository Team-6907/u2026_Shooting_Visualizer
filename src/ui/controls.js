import { DEFAULT_TARGET } from "../core/config.js";

export function initControls(state) {
  const controlMap = {};
  document.querySelectorAll(".control-row").forEach((row) => {
    const key = row.dataset.key;
    const range = row.querySelector('input[type="range"]');
    const number = row.querySelector('input[type="number"]');
    controlMap[key] = { range, number };

    const update = (value) => {
      const parsed = Number(value);
      if (Number.isNaN(parsed)) return;
      state[key] = parsed;
      range.value = parsed;
      number.value = parsed.toFixed(2);
    };

    range.addEventListener("input", (event) => update(event.target.value));
    number.addEventListener("input", (event) => update(event.target.value));
  });

  function updateControl(key, value) {
    const control = controlMap[key];
    if (!control) return;
    control.range.value = value;
    control.number.value = value.toFixed(2);
  }

  function setControlValue(key, value) {
    state[key] = value;
    updateControl(key, value);
  }

  const shootOnMove = document.getElementById("shootOnMove");
  if (shootOnMove) {
    shootOnMove.addEventListener("change", (event) => {
      state.shootOnMove = event.target.checked;
    });
  }

  const resetTarget = document.getElementById("resetTarget");
  if (resetTarget) {
    resetTarget.addEventListener("click", () => {
      setControlValue("targetX", DEFAULT_TARGET.x);
      setControlValue("targetY", DEFAULT_TARGET.y);
      setControlValue("targetZ", DEFAULT_TARGET.z);
    });
  }

  return {
    updateControl,
    setControlValue,
  };
}
