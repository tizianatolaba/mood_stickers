from sqlalchemy.orm import Session
import models
import schemas


def crear_producto(db: Session, producto: schemas.ProductCreate):
    nuevo = models.Product(**producto.dict())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


def listar_productos(
    db: Session,
    skip: int = 0,
    limit: int = 10,
    name: str | None = None,
    max_price: float | None = None,
    category: str | None = None,
):
    query = db.query(models.Product)

    if name:
        query = query.filter(models.Product.name.ilike(f"%{name}%"))

    if max_price is not None:
        query = query.filter(models.Product.price <= max_price)

    if category:
        query = query.filter(models.Product.category.ilike(f"%{category}%"))

    return query.offset(skip).limit(limit).all()
    