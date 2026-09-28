import { useEffect, useMemo, useState } from 'react'
import { getProductos } from './services/api'
import ProductCard from './components/ProductCard'
import Cart from './components/Cart'
import './App.css'

function App() {
  const [productos, setProductos] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Guardamos solo { id, quantity }: el precio, nombre y stock se toman siempre
  // de `productos`, así el carrito nunca queda con datos viejos.
  const [carrito, setCarrito] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('carrito') || '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('carrito', JSON.stringify(carrito))
  }, [carrito])

  // Carrito "completo" (con datos del producto). Se ignoran los ids que ya no existen.
  const items = useMemo(
    () =>
      carrito
        .map((linea) => {
          const p = productos.find((prod) => prod.id === linea.id)
          return p ? { ...p, quantity: linea.quantity } : null
        })
        .filter(Boolean),
    [carrito, productos]
  )

  // El total se calcula a partir del carrito: no es un estado aparte.
  const total = useMemo(
    () => items.reduce((suma, item) => suma + Number(item.price) * item.quantity, 0),
    [items]
  )

  const agregarAlCarrito = (producto) => {
    setCarrito((actual) => {
      const linea = actual.find((l) => l.id === producto.id)
      if (!linea) {
        return producto.stock > 0 ? [...actual, { id: producto.id, quantity: 1 }] : actual
      }
      if (linea.quantity >= producto.stock) return actual
      return actual.map((l) => (l.id === producto.id ? { ...l, quantity: l.quantity + 1 } : l))
    })
  }

  const sumarUnidad = (id) => {
    const producto = productos.find((p) => p.id === id)
    if (producto) agregarAlCarrito(producto)
  }

  const restarUnidad = (id) => {
    setCarrito((actual) =>
      actual
        .map((l) => (l.id === id ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0)
    )
  }

  const quitarDelCarrito = (id) => {
    setCarrito((actual) => actual.filter((l) => l.id !== id))
  }

  const vaciarCarrito = () => setCarrito([])

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    getProductos()
      .then((data) => {
        setProductos(data)
      })
      .catch((err) => {
        console.error('Error al obtener productos:', err)
        setError(
          'No se pudieron cargar los productos. Verificá que el backend esté funcionando.'
        )
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  if (isLoading) {
    return (
      <div className="container">
        <h1>Catálogo de productos</h1>
        <p>Cargando productos...</p>
      </div>
    )
  }

  if (error !== null) {
    return (
      <div className="container">
        <h1>Catálogo de productos</h1>
        <p className="error-message" style={{ color: 'red' }}>{error}</p>
      </div>
    )
  }

  if (productos.length === 0) {
    return (
      <div className="container">
        <h1>Catálogo de productos</h1>
        <p>No hay productos disponibles en este momento.</p>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>Catálogo de productos</h1>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        <div className="productos-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
          {productos.map((producto) => (
            <ProductCard
              key={producto.id}
              producto={producto}
              cantidadEnCarrito={carrito.find((l) => l.id === producto.id)?.quantity ?? 0}
              onAgregar={agregarAlCarrito}
            />
          ))}
        </div>

        <Cart
          items={items}
          total={total}
          onSumar={sumarUnidad}
          onRestar={restarUnidad}
          onQuitar={quitarDelCarrito}
          onVaciar={vaciarCarrito}
        />
      </div>
    </div>
  )
}

export default App
