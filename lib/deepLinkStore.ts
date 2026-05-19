let pendingUrl: string | null = null;

export const deepLinkStore = {
  set: (url: string) => { pendingUrl = url; },
  get: () => pendingUrl,
  clear: () => { pendingUrl = null; },
};