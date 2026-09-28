const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Obtener listado de productos desde la API
 */
export async function getProductos(params = {}) {
  const query = new URLSearchParams();
  
  if (params.skip !== undefined) query.append("skip", params.skip);
  if (params.limit !== undefined) query.append("limit", params.limit);
  else query.append("limit", "50"); // límite por defecto más amplio para el catálogo
  
  if (params.name) query.append("name", params.name);
  if (params.max_price) query.append("max_price", params.max_price);
  if (params.category) query.append("category", params.category);

  const url = `${API_URL}/api/products?${query.toString()}`;
  
  const response = await fetch(url, {
    headers: {
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Error en la respuesta de la API (${response.status})`);
  }

  return await response.json();
}

/**
 * Obtener un producto por su ID
 */
export async function getProducto(id) {
  const response = await fetch(`${API_URL}/api/products/${id}`);
  if (!response.ok) {
    throw new Error("No se pudo encontrar el producto.");
  }
  return await response.json();
}

/**
 * Iniciar sesión de usuario
 */
export async function loginUser(email, password) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Error en el inicio de sesión.");
  }

  return await response.json();
}

/**
 * Registrar un nuevo usuario
 */
export async function registerUser(userData) {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(userData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Error en el registro del usuario.");
  }

  return await response.json();
}

/**
 * Obtener perfil del usuario actual usando Bearer token
 */
export async function getCurrentUser(token) {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("No se pudo obtener el perfil de usuario.");
  }

  return await response.json();
}

/**
 * Obtener información legal del comercio (Ley 24.240 / Res. 424/2020)
 */
export async function getLegalInfo() {
  const response = await fetch(`${API_URL}/api/legal/info`);
  if (!response.ok) {
    throw new Error("Error al obtener información legal.");
  }
  return await response.json();
}

/**
 * Crear un pedido (Checkout)
 */
export async function createOrder(token, items) {
  const response = await fetch(`${API_URL}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ items })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let msg = errorData.detail || "Error al procesar el pedido.";
    if (Array.isArray(msg)) {
      msg = msg.map((e) => e.msg || e.detail).join(", ");
    }
    throw new Error(msg);
  }

  return await response.json();
}

/**
 * Obtener el historial de pedidos del usuario
 */
export async function getUserOrders(token) {
  const response = await fetch(`${API_URL}/api/orders`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("No se pudieron obtener los pedidos.");
  }

  return await response.json();
}

/**
 * Solicitar revocación / Botón de arrepentimiento (Ley 24.240 / Res 424/2020)
 */
export async function cancelOrderArrepentimiento(token, orderId) {
  const response = await fetch(`${API_URL}/api/orders/${orderId}/arrepentirse`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Error al solicitar la revocación del pedido.");
  }

  return await response.json();
}

