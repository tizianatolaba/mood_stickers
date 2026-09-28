import datetime

from sqlalchemy import Column, Integer, String, Float, Numeric, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    role = Column(String, default="user")

    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow
    )

    # Ley 25.326 - Protección de Datos Personales
    data_consent = Column(
        Boolean,
        default=False,
        nullable=False
    )

    # Fecha en la que el usuario dio su consentimiento
    consent_date = Column(
        DateTime,
        nullable=True
    )

    # --- Clase 9: baja de cuenta ---
    # Un usuario dado de baja no se borra: se anonimiza y se marca
    # como inactivo. get_current_user() rechaza tokens de usuarios
    # con activo=False (ver auth.py).
    activo = Column(
        Boolean,
        default=True,
        nullable=False
    )

    fecha_baja = Column(
        DateTime,
        nullable=True
    )

    orders = relationship(
        "Order",
        back_populates="user",
        cascade="all, delete-orphan"
    )


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    price = Column(Float, nullable=False)
    stock = Column(Integer, nullable=False, default=0)
    image_url = Column(String)
    category = Column(String)

    order_items = relationship(
        "OrderItem",
        back_populates="product"
    )


class Order(Base):
    """
    Es el "Pedido" de la consigna. Se mantiene el nombre Order/status
    ya usado en el resto del proyecto (y en el frontend) para no romper
    nada existente: status cumple el rol de "estado".
    """
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    # Numeric, no Float: nada de errores de redondeo binario con plata.
    total_price = Column(Numeric(12, 2), nullable=False)

    # pendiente / Pending / Paid / cancelado, según el flujo del proyecto
    status = Column(
        String,
        default="pendiente",
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow
    )

    user = relationship(
        "User",
        back_populates="orders"
    )

    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan"
    )


class OrderItem(Base):
    """Es el "ItemPedido" de la consigna."""
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)

    order_id = Column(
        Integer,
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False
    )

    product_id = Column(
        Integer,
        ForeignKey("products.id"),
        nullable=False
    )

    quantity = Column(
        Integer,
        nullable=False,
        default=1
    )

    # precio_unitario de la consigna: el precio del producto
    # EN EL MOMENTO de la compra, no el precio actual del producto.
    price_at_purchase = Column(
        Numeric(12, 2),
        nullable=False
    )

    order = relationship(
        "Order",
        back_populates="items"
    )

    product = relationship(
        "Product",
        back_populates="order_items"
    )


class SolicitudRevocacion(Base):
    """
    Registro del botón de arrepentimiento (Disposición 954/2025 y
    3/2026, art. 34 Ley 24.240). Cada revocación exitosa genera un
    código único que se le entrega al consumidor.
    """
    __tablename__ = "solicitudes_revocacion"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, index=True, nullable=False)

    pedido_id = Column(
        Integer,
        ForeignKey("orders.id"),
        nullable=False
    )

    usuario_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    creada_en = Column(
        DateTime,
        default=lambda: datetime.datetime.now(datetime.timezone.utc)
    )

    pedido = relationship("Order")
    usuario = relationship("User")

    