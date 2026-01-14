export function initMetrics() {
  const metrics = {
    range: document.getElementById("metricRange"),
    flywheel: document.getElementById("metricFlywheel"),
    hood: document.getElementById("metricHood"),
    entry: document.getElementById("metricEntry"),
    onTarget: document.getElementById("metricOnTarget"),
  };

  function update(solution) {
    if (!solution) return;

    metrics.range.textContent = solution.range.toFixed(2);
    metrics.flywheel.textContent = solution.isValid ? solution.flywheelSpeed.toFixed(1) : "---";
    metrics.hood.textContent = solution.isValid ? solution.hoodAngleDeg.toFixed(1) : "---";
    metrics.entry.textContent = solution.isValid && solution.isDescending
      ? solution.entryAngleDeg.toFixed(1)
      : "---";

    const isOk = solution.isOnTarget;
    metrics.onTarget.textContent = isOk ? "是" : "否";
    metrics.onTarget.classList.toggle("ok", isOk);
    metrics.onTarget.classList.toggle("warn", !isOk);
  }

  return { update };
}
