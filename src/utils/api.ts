import { getFirebaseIdToken } from "../lib/firebase";

export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = await getFirebaseIdToken();
  const headers = {
    ...options.headers,
    "Authorization": `Bearer ${token}`
  };
  
  return fetch(url, {
    ...options,
    headers
  });
};
