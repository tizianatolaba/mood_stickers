import { useEffect, useState } from 'react';
import { getUserOrders, cancelOrderArrepentimiento } from '../services/api';

export default function OrdersModal({ isOpen, onClose, token }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revocacionMsg, setRevocacionMsg] = useState(null);

  useEffect(() => {
    if (isOpen && token) {
      fetchOrders();
    }
  }, [isOpen, token]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserOrders(token);
      setOrders(data);
    } catch (err) {
      setError(err.message || 'Error al cargar tus pedidos.');
    } finally {
      setLoading(false);
    }
  };

  const handleArrepentimiento = async (orderId) => {
    if (!window.confirm(`¿Estás seguro de que querés solicitar el arrepentimiento para el Pedido #${orderId}?`)) {
      return;
    }
    setRevocacionMsg(null);
    try {
      const res = await cancelOrderArrepentimiento(token, orderId);
      setRevocacionMsg(`Solicitud de revocación generada con exito para Pedido #${orderId}. Código de trámite: ${res.codigo}`);
      fetchOrders(); // Recargar lista
    } catch (err) {
      alert(`No se pudo procesar la revocación: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={overlayStyle}>
      <div className="modal-card" style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
          <h2 style={{ margin: 0 }}>📦 Mis Pedidos</h2>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#888' }}
          >
            ✕
          </button>
        </div>

        {revocacionMsg && (
          <div style={{ backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', color: '#0050b3', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.9rem' }}>
            ℹ️ {revocacionMsg}
          </div>
        )}

        {loading ? (
          <p>Cargando tus pedidos...</p>
        ) : error ? (
          <div style={{ color: 'red' }}>{error}</div>
        ) : orders.length === 0 ? (
          <p style={{ color: '#666' }}>Todavía no realizaste ningún pedido.</p>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {orders.map((order) => (
              <div 
                key={order.id} 
                style={{ 
                  border: '1px solid #e1e8ed', 
                  borderRadius: '6px', 
                  padding: '14px', 
                  marginBottom: '12px',
                  backgroundColor: '#fafafa'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong>Pedido #{order.id}</strong>
                  <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: '4px', 
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    backgroundColor: order.status === 'Paid' ? '#d4edda' : '#fff3cd',
                    color: order.status === 'Paid' ? '#155724' : '#856404'
                  }}>
                    {order.status === 'Paid' ? 'Pagado' : order.status}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px' }}>
                  Fecha: {new Date(order.created_at).toLocaleString()}
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px 0', fontSize: '0.9rem' }}>
                  {order.items.map((item) => (
                    <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span>{item.product.name} x {item.quantity}</span>
                      <span>${(Number(item.price_at_purchase) * item.quantity).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed #ccc' }}>
                  <strong>Total: ${Number(order.total_price).toFixed(2)}</strong>
                  
                  {order.status !== 'revocado' && order.status !== 'cancelado' && (
                    <button
                      onClick={() => handleArrepentimiento(order.id)}
                      style={{
                        backgroundColor: '#ff7875',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                      title="Solicitar revocación bajo Ley 24.240"
                    >
                      ↩️ Botón de Arrepentimiento
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
  padding: '16px'
};

const cardStyle = {
  backgroundColor: '#fff',
  borderRadius: '8px',
  maxWidth: '550px',
  width: '100%',
  padding: '24px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
};
