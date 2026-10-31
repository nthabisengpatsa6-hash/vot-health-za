// A rejected attempt must not remain cached when the person chooses Try again.
export function createSignalDetailLoader(importScreen) {
  let loading = null;
  return () => {
    loading ??= Promise.resolve().then(importScreen).catch((error) => {
      loading = null;
      throw error;
    });
    return loading;
  };
}

export const loadSignalDetail = createSignalDetailLoader(() => import("../components/SignalDetail.jsx"));
