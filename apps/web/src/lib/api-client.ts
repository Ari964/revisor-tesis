const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function apiClient<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // Intentar obtener token de localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('accessToken');
      if (stored) headers['Authorization'] = `Bearer ${stored}`;
    }
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401 && typeof window !== 'undefined') {
    if (!endpoint.includes('/auth/login')) {
      // Token expirado — intentar refresh
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${refreshed}`;
        const retryResponse = await fetch(`${API_URL}${endpoint}`, { ...fetchOptions, headers });
        return retryResponse.json();
      }
      // Si no se pudo refresh, redirigir al login
      window.location.href = '/login';
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Error ${response.status}`);
  }

  return response.json();
}

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      return data.data.accessToken;
    }
  } catch {
    // Ignorar
  }

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  return null;
}

// Helper para enviar mensajes al chat (multipart con archivo opcional)
export async function sendChatMessage(
  conversationId: string,
  content: string,
  file?: File | null,
): Promise<any> {
  const formData = new FormData();
  formData.append('content', content);
  if (file) {
    formData.append('file', file);
  }

  const headers: Record<string, string> = {};
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response = await fetch(`${API_URL}/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (response.status === 401 && typeof window !== 'undefined') {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${refreshed}`;
      response = await fetch(`${API_URL}/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers,
        body: formData,
      });
    } else {
      window.location.href = '/login';
      throw new Error('Sesión expirada');
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = Array.isArray(errorData.message)
      ? errorData.message.join(', ')
      : errorData.message || `Error ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}

// Helper para subir archivos
export async function uploadFile(
  endpoint: string,
  file: File,
  token?: string,
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  const t = token || (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);
  if (t) headers['Authorization'] = `Bearer ${t}`;

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Error ${response.status}`);
  }

  return response.json();
}
