const getApiBase = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    // If we are on a network IP, talk to the same IP on port 8000
    const host = window.location.hostname;
    return `${window.location.protocol}//${host}:8000`;
  }
  return 'http://localhost:8000';
};

export const API_BASE = getApiBase();