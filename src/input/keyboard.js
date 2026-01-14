export function bindKeyboard(container, state, keys) {
  function handleKeyDown(event) {
    const key = event.key.toLowerCase();
    if (key in keys) {
      keys[key] = true;
      event.preventDefault();
    }
    if (key === " ") {
      state.robotVx = 0;
      state.robotVy = 0;
      event.preventDefault();
    }
  }

  function handleKeyUp(event) {
    const key = event.key.toLowerCase();
    if (key in keys) {
      keys[key] = false;
      event.preventDefault();
    }
  }

  container.addEventListener("keydown", handleKeyDown);
  container.addEventListener("keyup", handleKeyUp);
  container.addEventListener("click", () => container.focus());

  return () => {
    container.removeEventListener("keydown", handleKeyDown);
    container.removeEventListener("keyup", handleKeyUp);
  };
}
