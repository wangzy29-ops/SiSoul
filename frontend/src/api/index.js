const API_BASE = '';  // Use relative path to support both localhost and 127.0.0.1

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  };

  // Don't set Content-Type for FormData
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  try {
    const res = await fetch(url, config);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    console.error(`API Error [${path}]:`, e);
    throw e;
  }
}

// ---- Documents ----
export const docsApi = {
  list: (params = {}) => request(`/api/docs/?${new URLSearchParams(params)}`),
  get: (id) => request(`/api/docs/${id}`),
  getContent: (id) => request(`/api/docs/${id}/content`),
  upload: (formData) => request('/api/ingest/upload_file', { method: 'POST', body: formData }),
  update: (id, data) => request(`/api/docs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/api/docs/${id}`, { method: 'DELETE' }),
};

// ---- Chat ----
export const chatApi = {
  ask: (data) => request('/api/chat/', { method: 'POST', body: JSON.stringify(data) }),
};

// ---- Notes ----
export const notesApi = {
  create: (data) => request('/api/ingest/note', { method: 'POST', body: JSON.stringify(data) }),
};

// ---- Web Pages ----
export const webApi = {
  ingest: (data) => request('/api/ingest/web', { method: 'POST', body: JSON.stringify(data) }),
};

// ---- Subscriptions ----
export const subscriptionsApi = {
  list: () => request('/api/subscriptions/'),
  create: (data) => request('/api/subscriptions/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/api/subscriptions/${id}`, { method: 'DELETE' }),
};

// ---- Watch Folders ----
export const watchFoldersApi = {
  list: () => request('/api/watch_folders/'),
  create: (data) => request('/api/watch_folders/', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => request(`/api/watch_folders/${id}`, { method: 'DELETE' }),
};

// ---- Profile ----
export const profileApi = {
  list: (category) => request(`/api/profile/${category ? `?category=${category}` : ''}`),
  create: (data) => request('/api/profile/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/profile/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/api/profile/${id}`, { method: 'DELETE' }),
};

// ---- AI Assistant ----
export const assistantApi = {
  list: (type, params = {}) => request(`/api/assistant/items?item_type=${type}&${new URLSearchParams(params)}`),
  create: (data) => request('/api/assistant/items', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => request(`/api/assistant/items/${id}`, { method: 'DELETE' }),
};

// ---- Reminders ----
export const remindersApi = {
  list: () => request('/api/assistant/reminders'),
  create: (data) => request('/api/assistant/reminders', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/assistant/reminders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/api/assistant/reminders/${id}`, { method: 'DELETE' }),
};

// ---- Recycle Bin ----
export const recycleApi = {
  list: () => request('/api/recycle/'),
  restore: (id) => request(`/api/recycle/${id}/restore`, { method: 'POST' }),
  permanentDelete: (id) => request(`/api/recycle/${id}`, { method: 'DELETE' }),
};

// ---- Consistency ----
export const consistencyApi = {
  list: () => request('/api/consistency/'),
  resolve: (id, data) => request(`/api/consistency/${id}/resolve`, { method: 'POST', body: JSON.stringify(data) }),
};

// ---- AI Services ----
export const aiApi = {
  models: () => request('/api/ai/models'),
  taxonomy: () => request('/api/ai/taxonomy'),
  getResults: (docId) => request(`/api/ai/results/${docId}`),
  getTags: (docId) => request(`/api/ai/tags/${docId}`),
  generateTags: (docId, model) => request('/api/ai/tags', { method: 'POST', body: JSON.stringify({ doc_id: docId, model: model || undefined }) }),
  getTagsByLevel1: (level1) => request(`/api/ai/tags/by-level1/${encodeURIComponent(level1)}`),
  summary: (docId, model, force = false) => request(`/api/ai/summary?force=${force}`, { method: 'POST', body: JSON.stringify({ doc_id: docId, model: model || undefined }) }),
  mindmap: (docId, model, force = false) => request(`/api/ai/mindmap?force=${force}`, { method: 'POST', body: JSON.stringify({ doc_id: docId, model: model || undefined }) }),
  keyInfo: (docId, model, force = false) => request(`/api/ai/key_info?force=${force}`, { method: 'POST', body: JSON.stringify({ doc_id: docId, model: model || undefined }) }),
};

// ---- Messages ----
export const messagesApi = {
  list: (params = {}) => request(`/api/messages/?${new URLSearchParams(params)}`),
  get: (id) => request(`/api/messages/${id}`),
  delete: (id) => request(`/api/messages/${id}`, { method: 'DELETE' }),
};

// ---- Products ----
export const productsApi = {
  list: (params = {}) => request(`/api/products/?${new URLSearchParams(params)}`),
  get: (id) => request(`/api/products/${id}`),
  create: (data) => request('/api/products/', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => request(`/api/products/${id}`, { method: 'DELETE' }),
  getImageUrl: (id) => `${API_BASE}/api/products/${id}/image`,
  generateSummary: (id) => request(`/api/products/${id}/summary`, { method: 'POST' }),
  generateMindmap: (id) => request(`/api/products/${id}/mindmap`, { method: 'POST' }),
  generateIntro: (id) => request(`/api/products/${id}/intro`, { method: 'POST' }),
};

// ---- Health ----
export const healthApi = {
  check: () => request('/health'),
};

// ---- Document Folders ----
export const foldersApi = {
  list: () => request('/api/folders/'),
  create: (data) => request('/api/folders/', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => request(`/api/folders/${id}`, { method: 'DELETE' }),
  moveDocs: (doc_ids, folder_id) => request('/api/folders/move_docs', { method: 'POST', body: JSON.stringify({ doc_ids, folder_id }) }),
};

// ---- Engineer (工程师) ----
export const engineerApi = {
  doc2audio: (formData) => request('/api/engineer/doc2audio', { method: 'POST', body: formData }),
  voices: () => request('/api/engineer/doc2audio/voices'),
  downloadUrl: (path) => `${API_BASE}${path}`,
};
