const formatoPrecio = (n) =>
    n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

export default function Cart({ items, total, onSumar, onRestar, onQuitar, onVaciar }) {
    return (
        <aside
            style={{
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '16px',
                position: 'sticky',
                top: '16px',
                alignSelf: 'flex-start',
                minWidth: '280px',
            }}
        >
            <h2>Tu carrito</h2>

            {items.length === 0 ? (
                <p>El carrito está vacío</p>
            ) : (
                <>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {items.map((item) => (
                            <li key={item.id} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
                                <strong>{item.name}</strong>
                                <div>
                                    {formatoPrecio(item.price)} × {item.quantity} ={' '}
                                    <strong>{formatoPrecio(item.price * item.quantity)}</strong>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                    <button type="button" onClick={() => onRestar(item.id)} aria-label="Restar una unidad">−</button>
                                    <span>{item.quantity}</span>
                                    <button
                                        type="button"
                                        onClick={() => onSumar(item.id)}
                                        disabled={item.quantity >= item.stock}
                                        aria-label="Sumar una unidad"
                                    >
                                        +
                                    </button>
                                    <button type="button" onClick={() => onQuitar(item.id)}>Quitar</button>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <p style={{ fontSize: '1.2rem', marginTop: '16px' }}>
                        <strong>Total: {formatoPrecio(total)}</strong>
                    </p>
                    <button type="button" onClick={onVaciar}>Vaciar carrito</button>
                </>
            )}
        </aside>
    );
}
