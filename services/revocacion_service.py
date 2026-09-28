import datetime
import secrets

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

import models


# Art. 34, Ley 24.240. No cambió con la Disposición 954/2025 ni con
# la 3/2026: lo que cambió fue quién reglamenta el trámite, no el plazo.
PLAZO_REVOCACION_DIAS = 10


def generar_codigo() -> str:
    """Código legible y único que la norma obliga a entregarle al consumidor."""
    fecha = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d")
    return f"ARR-{fecha}-{secrets.token_hex(3).upper()}"


def _a_utc_aware(dt: datetime.datetime) -> datetime.datetime:
    """
    Postgres puede devolver datetimes 'naive' (sin tz) si la columna es
    TIMESTAMP sin zona horaria. datetime.now(timezone.utc) SÍ tiene tz,
    y restar una fecha naive de una aware tira
    "can't subtract offset-naive and offset-aware datetimes".
    Como el proyecto siempre guarda en UTC, tratamos lo naive como UTC.
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=datetime.timezone.utc)
    return dt


def revocar(db: Session, usuario: models.User, pedido_id: int) -> models.SolicitudRevocacion:
    """
    Las 4 validaciones en orden: es tuyo (404), no está cancelado (409),
    estás dentro del plazo (409), y recién ahí la transacción.
    """
    pedido = (
        db.query(models.Order)
        .filter(models.Order.id == pedido_id, models.Order.user_id == usuario.id)
        .first()
    )

    # 1) Es tuyo (o no existe): 404, nunca 403.
    if pedido is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido no encontrado.",
        )

    # 2) No está cancelado ya.
    if pedido.status in ("cancelado", "Cancelled/Arrepentido"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este pedido ya fue cancelado anteriormente.",
        )

    # 3) Dentro del plazo de 10 días corridos.
    ahora = datetime.datetime.now(datetime.timezone.utc)
    creado_en = _a_utc_aware(pedido.created_at)
    dias_transcurridos = (ahora - creado_en).days

    if dias_transcurridos > PLAZO_REVOCACION_DIAS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"El plazo de {PLAZO_REVOCACION_DIAS} días corridos para "
                f"revocar la compra venció (art. 34, Ley 24.240). "
                f"Pasaron {dias_transcurridos} días desde la compra."
            ),
        )

    # 4) Recién acá, la transacción.
    try:
        for item in pedido.items:
            producto = (
                db.query(models.Product)
                .filter(models.Product.id == item.product_id)
                .first()
            )
            if producto is not None:
                producto.stock += item.quantity

        pedido.status = "cancelado"
        pedido.updated_at = ahora

        solicitud = models.SolicitudRevocacion(
            codigo=generar_codigo(),
            pedido_id=pedido.id,
            usuario_id=usuario.id,
        )

        db.add(solicitud)
        db.commit()
        db.refresh(solicitud)
        return solicitud

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar la revocación: {e}",
        )