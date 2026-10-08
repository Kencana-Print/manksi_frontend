let active = false;

export const isFreshActive = (): boolean => active;

// Selama fn berjalan, semua request dashboard membawa header X-Fresh
export const runFresh = async <T>(fn: () => Promise<T>): Promise<T> => {
  active = true;
  try {
    return await fn();
  } finally {
    active = false;
  }
};
