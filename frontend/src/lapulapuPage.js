// Loads the Lapu-Lapu feature page once and remembers it, so later renders need no Suspense.
let Page = null;
let pending = null;

export function loadLapuLapu() {
  pending ??= import('./pages/LapuLapu.jsx').then(module => {
    Page = module.default;
    return module;
  });
  return pending;
}

export const getLapuLapu = () => Page;
