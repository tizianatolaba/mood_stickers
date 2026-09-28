from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas


def crear_pedido(db: Session, usuario: models.User, datos: schemas.OrderCreate) -> models.Order:
    """
    Checkout transaccional.

    Recorre los items del carrito, valida producto y stock, descuenta
    stock, calcula el total en el servidor (nunca con un número que
    venga del cliente) y congela el precio de cada producto en
    price_at_purchase. Si algo falla a mitad de camino, se hace
    rollback y no queda ni stock descontado ni pedido a medias.
    """
    total = Decimal("0")
    items_a_crear = []

    try:
        for item in datos.items:
            producto = (
                db.query(models.Product)
                .filter(models.Product.id == item.product_id)
                .first()
            )

            # 404: el producto no existe
            if producto is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"El producto con ID {item.product_id} no existe.",
                )

            # 409: no hay stock suficiente. El mensaje dice CUÁL
            # producto y CUÁNTAS unidades quedan, para que el
            # cliente no tenga que adivinar.
            if producto.stock < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Stock insuficiente para '{producto.name}'. "
                        f"Quedan {producto.stock} unidades disponibles."
                    ),
                )

            producto.stock -= item.quantity

            # El precio SIEMPRE sale de la base, nunca del cuerpo
            # del pedido que mandó el cliente.
            precio_unitario = Decimal(str(producto.price))
            total += precio_unitario * item.quantity

            items_a_crear.append(
                models.OrderItem(
                    product_id=producto.id,
                    quantity=item.quantity,
                    price_at_purchase=precio_unitario,
                )
            )

        nuevo_pedido = models.Order(
            user_id=usuario.id,
            total_price=total,
            status="Paid",  # este proyecto no tiene pasarela de pago real:
                             # se marca pagado al momento del checkout,
                             # igual que antes de esta actividad.
            items=items_a_crear,
        )

        db.add(nuevo_pedido)
        db.commit()
        db.refresh(nuevo_pedido)
        return nuevo_pedido

    except HTTPException:
        # Sin este rollback, un pedido que falla a la mitad deja
        # stock descontado de productos que nadie compró.
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar el pedido: {e}",
        )


def obtener_pedido(db: Session, usuario: models.User, pedido_id: int) -> models.Order:
    """
    GET /pedidos/{id} de la consigna. Si el pedido no existe O no es
    del usuario que lo pide (y no es admin), devolvemos 404 y no 403:
    así no le confirmamos a nadie que el pedido existe pero es ajeno.
    """
    pedido = db.query(models.Order).filter(models.Order.id == pedido_id).first()

    es_dueno = pedido is not None and pedido.user_id == usuario.id
    es_admin = usuario.role == "admin"

    if pedido is None or not (es_dueno or es_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido no encontrado.",
        )

    return pedido