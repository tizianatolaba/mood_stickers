import datetime
import json

from fastapi import HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

import models


def obtener_datos_usuario(db: Session, usuario: models.User) -> dict:
    """
    Todo lo que la base guarda de esta persona: sus datos, su
    consentimiento con fecha, sus pedidos y sus solicitudes de
    revocación. Si está en la base y es suyo, tiene que aparecer acá.
    """
    pedidos = (
        db.query(models.Order)
        .filter(models.Order.user_id == usuario.id)
        .order_by(models.Order.created_at.desc())
        .all()
    )

    solicitudes = (
        db.query(models.SolicitudRevocacion)
        .filter(models.SolicitudRevocacion.usuario_id == usuario.id)
        .all()
    )

    return {
        "usuario": {
            "id": usuario.id,
            "nombre": usuario.name,
            "email": usuario.email,
            "rol": usuario.role,
            "activo": usuario.activo,
            "creado_en": usuario.created_at,
        },
        "consentimiento": {
            "otorgado": usuario.data_consent,
            "fecha": usuario.consent_date,
        },
        "pedidos": [
            {
                "id": p.id,
                "total": p.total_price,
                "estado": p.status,
                "creado_en": p.created_at,
                "items": [
                    {
                        "producto_id": it.product_id,
                        "cantidad": it.quantity,
                        "precio_unitario": it.price_at_purchase,
                    }
                    for it in p.items
                ],
            }
            for p in pedidos
        ],
        "solicitudes_revocacion": [
            {
                "codigo": s.codigo,
                "pedido_id": s.pedido_id,
                "creada_en": s.creada_en,
            }
            for s in solicitudes
        ],
    }


def exportar_datos_usuario(db: Session, usuario: models.User) -> Response:
    """
    Mismo contenido que obtener_datos_usuario, pero como archivo
    descargable. default=str porque Decimal y datetime no son JSON
    válidos por sí solos.
    """
    datos = obtener_datos_usuario(db, usuario)
    contenido = json.dumps(datos, default=str, ensure_ascii=False, indent=2)

    return Response(
        content=contenido,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="mis_datos_{usuario.id}.json"'
        },
    )


def dar_de_baja(db: Session, usuario: models.User) -> None:
    """
    DELETE /usuarios/me: NO se borra la fila. Se anonimiza nombre,
    email y contraseña (para que no identifiquen a nadie) y se marca
    activo=False con fecha_baja. Los pedidos quedan intactos: son
    prueba fiscal/contable y el historial de otros usuarios (ej. un
    admin viendo ventas) no debe quedar roto por relaciones colgantes.
    """
    try:
        usuario.name = "Usuario eliminado"
        usuario.email = f"usuario_eliminado_{usuario.id}@baja.local"
        usuario.hashed_password = "!"  # hash inválido: nadie puede loguearse con esto
        usuario.activo = False
        usuario.fecha_baja = datetime.datetime.now(datetime.timezone.utc)

        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al dar de baja la cuenta: {e}",
        )