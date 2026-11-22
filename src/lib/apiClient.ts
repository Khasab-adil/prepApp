import { auth } from './firebase.ts';

export async function callAiApi<T>(endpoint: string, body: unknown): Promise<{ data: T; tokensUsed: number }> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in to use AI features.');
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed (${response.status})`);
  }

  return payload as { data: T; tokensUsed: number };
}
