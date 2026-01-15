const QUALITY_STORAGE_KEY = "renderQuality";

function normalizeQuality(value) {
  return value === "fidelity" ? "fidelity" : "performance";
}

export function initRenderQuality(state, scene) {
  const select = document.getElementById("qualitySelect");
  let initial = normalizeQuality(state.renderQuality);

  try {
    const stored = localStorage.getItem(QUALITY_STORAGE_KEY);
    if (stored) {
      initial = normalizeQuality(stored);
    }
  } catch (err) {
    console.warn("[render-quality] Failed to read quality preference", err);
  }

  const applyQuality = (value, shouldPersist = true) => {
    const chosen = normalizeQuality(value);
    state.renderQuality = chosen;
    if (select) {
      select.value = chosen;
    }
    if (scene && typeof scene.setRenderQuality === "function") {
      scene.setRenderQuality(chosen);
    }
    if (shouldPersist) {
      try {
        localStorage.setItem(QUALITY_STORAGE_KEY, chosen);
      } catch (err) {
        console.warn("[render-quality] Failed to persist quality preference", err);
      }
    }
  };

  if (select) {
    select.addEventListener("change", (event) => {
      applyQuality(event.target.value);
    });
  }

  applyQuality(initial, false);

  return {
    getRenderQuality: () => state.renderQuality,
  };
}
