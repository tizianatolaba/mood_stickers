export default function ProductCard({ producto, cantidadEnCarrito = 0, onAgregar }) {
  if (!producto) return null;

  const sinStock = producto.stock <= 0;
  const llegoAlLimite = cantidadEnCarrito >= producto.stock;

  let textoBoton = 'Agregar al carrito';
  if (sinStock) textoBoton = 'Sin stock';
  else if (llegoAlLimite) textoBoton = 'Máximo en carrito';

  return (
    <div className="producto" style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '16px', margin: '8px' }}>
      {producto.image_url && (
        <img
          src={producto.image_url}
          alt={producto.name}
          style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '4px' }}
        />
      )}
      <h2>{producto.name}</h2>
      <p>{producto.description}</p>
      <p><strong>Precio:</strong> ${producto.price}</p>
      <p><strong>Stock:</strong> {producto.stock}</p>
      <button
        type="button"
        onClick={() => onAgregar(producto)}
        disabled={sinStock || llegoAlLimite}
        style={{ padding: '8px 16px', cursor: sinStock || llegoAlLimite ? 'not-allowed' : 'pointer' }}
      >
        {textoBoton}
      </button>
    </div>
  );
}
