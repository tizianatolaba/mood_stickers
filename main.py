import datetime
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from services import products as products_service
from services import pedido_service
from services import revocacion_service
from services import usuario_service

import models
import schemas
import auth
import database


# ============================================================
# BASE DE DATOS
# ============================================================

# Crear las tablas si todavía no existen
models.Base.metadata.create_all(bind=database.engine)


# ============================================================
# CARGA INICIAL DE PRODUCTOS
# ============================================================

def seed_database():
    db = database.SessionLocal()

    try:
        # Solo insertar productos si la tabla está vacía
        if db.query(models.Product).count() == 0:

            mock_products = [
                models.Product(
                    name="Sticker Anime Naruto Run",
                    description=(
                        "Sticker de vinilo común troquelado de Naruto Uzumaki "
                        "haciendo su clásica carrera ninja. Resistente al agua "
                        "en interiores, ideal para notebooks y carpetas."
                    ),
                    price=450.0,
                    stock=100,
                    image_url=(
                        "https://images.unsplash.com/"
                        "photo-1607604276583-eef5d076aa5f"
                        "?auto=format&fit=crop&w=600&q=80"
                    ),
                    category="Anime, Comunes"
                ),

                models.Product(
                    name="Sticker Luffy Gear 5 (PVC)",
                    description=(
                        "Sticker de PVC impermeable y de alta resistencia "
                        "de Monkey D. Luffy en su forma Gear 5. Soporta "
                        "intemperie y lavado constante, apto para termos "
                        "y botellas."
                    ),
                    price=950.0,
                    stock=80,
                    image_url=(
                        "https://images.unsplash.com/"
                        "photo-1578632767115-351597cf2477"
                        "?auto=format&fit=crop&w=600&q=80"
                    ),
                    category="Anime, Termos"
                ),

                models.Product(
                    name="Sticker Escudo Boca Juniors (PVC)",
                    description=(
                        "Sticker de PVC troquelado de alta calidad del "
                        "escudo de Boca Juniors. Resistente a líquidos "
                        "calientes y lavados frecuentes."
                    ),
                    price=850.0,
                    stock=150,
                    image_url=(
                        "https://images.unsplash.com/"
                        "photo-1518063319789-7217e6706b04"
                        "?auto=format&fit=crop&w=600&q=80"
                    ),
                    category="Fútbol, Termos"
                ),

                models.Product(
                    name="Sticker Escudo River Plate",
                    description=(
                        "Sticker clásico autoadhesivo del escudo oficial "
                        "de River Plate en vinilo brillante. Ideal para "
                        "carpetas, notebooks o decorar tu habitación."
                    ),
                    price=400.0,
                    stock=120,
                    image_url=(
                        "https://images.unsplash.com/"
                        "photo-1508098682722-e99c43a406b2"
                        "?auto=format&fit=crop&w=600&q=80"
                    ),
                    category="Fútbol, Comunes"
                ),

                models.Product(
                    name="Sticker Cerati 'Gracias Totales' (PVC)",
                    description=(
                        "Sticker de PVC impermeable con diseño homenaje "
                        "a Gustavo Cerati. Resistente al sol y al agua, "
                        "perfecto para termos o guitarras."
                    ),
                    price=900.0,
                    stock=90,
                    image_url=(
                        "https://images.unsplash.com/"
                        "photo-1487180142328-054b783fc471"
                        "?auto=format&fit=crop&w=600&q=80"
                    ),
                    category="Música, Termos"
                ),

                models.Product(
                    name="Sticker Taylor Swift Midnights",
                    description=(
                        "Sticker común troquelado inspirado en la estética "
                        "del álbum Midnights de Taylor Swift. Ideal para "
                        "celulares, agendas y notebooks."
                    ),
                    price=500.0,
                    stock=110,
                    image_url=(
                        "https://images.unsplash.com/"
                        "photo-1501386761578-eac5c94b800a"
                        "?auto=format&fit=crop&w=600&q=80"
                    ),
                    category="Música, Comunes"
                ),
            ]

            db.add_all(mock_products)
            db.commit()

            print("Productos iniciales cargados correctamente.")

        else:
            print("La tabla de productos ya contiene datos.")

    except Exception as e:
        db.rollback()
        print(f"Error al cargar productos iniciales: {e}")

    finally:
        db.close()


# ============================================================
# LIFESPAN
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Código que se ejecuta al iniciar la aplicación.
    """
    seed_database()

    yield

    """
    Código opcional al cerrar la aplicación.
    """


# ============================================================
# APLICACIÓN FASTAPI
# ============================================================

app = FastAPI(
    title="E-Commerce Juvenil API",
    description=(
        "Backend de e-commerce con cumplimiento normativo "
        "de la República Argentina."
    ),
    version="1.0.0",
    lifespan=lifespan
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# AUTENTICACIÓN
# ============================================================

@app.post(
    "/api/auth/register",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register_user(
    user_data: schemas.UserCreate,
    db: Session = Depends(database.get_db)
):
    """
    Registrar un nuevo usuario.
    """

    if not user_data.data_consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Debe brindar su consentimiento explícito para el "
                "procesamiento de datos según la Ley 25.326."
            )
        )

    db_user = (
        db.query(models.User)
        .filter(models.User.email == user_data.email)
        .first()
    )

    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya se encuentra registrado."
        )

    hashed_pwd = auth.get_password_hash(user_data.password)

    new_user = models.User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hashed_pwd,
        data_consent=user_data.data_consent,
        consent_date=datetime.datetime.now(datetime.timezone.utc),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@app.post(
    "/api/auth/login",
    response_model=schemas.Token
)
def login_json(
    login_data: schemas.UserLogin,
    db: Session = Depends(database.get_db)
):
    """
    Login mediante JSON.
    """

    user = (
        db.query(models.User)
        .filter(models.User.email == login_data.email)
        .first()
    )

    if not user or not auth.verify_password(
        login_data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Esta cuenta fue dada de baja.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth.create_access_token(
        data={"sub": user.email}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@app.post(
    "/api/auth/token",
    response_model=schemas.Token
)
def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db)
):
    """
    Login compatible con OAuth2 / Swagger.
    """

    user = (
        db.query(models.User)
        .filter(models.User.email == form_data.username)
        .first()
    )

    if not user or not auth.verify_password(
        form_data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Esta cuenta fue dada de baja.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth.create_access_token(
        data={"sub": user.email}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@app.get(
    "/api/auth/me",
    response_model=schemas.UserResponse
)
def get_current_user_profile(
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Obtener información del usuario actualmente autenticado.
    """

    return current_user


@app.delete(
    "/api/auth/delete-data",
    status_code=status.HTTP_200_OK
)
@app.delete(
    "/api/auth/me",
    status_code=status.HTTP_200_OK
)
def delete_user_data(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Clase 9, Parte 4: dar de baja la cuenta. NO se borra la fila
    (los pedidos quedarían huérfanos o se perdería el historial):
    se anonimiza nombre/email/contraseña y se marca activo=False.
    Después de esto, el token actual deja de servir (ver auth.py).
    """

    usuario_service.dar_de_baja(db, current_user)

    return {
        "detail": (
            "Cuenta dada de baja: tus datos personales fueron "
            "anonimizados en cumplimiento de la Ley 25.326. Tus "
            "pedidos se conservan en la base."
        )
    }


@app.patch(
    "/api/auth/update",
    response_model=schemas.UserResponse
)
def update_user_data(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Actualizar los datos del usuario.
    """

    try:

        if user_update.name is not None:
            current_user.name = user_update.name

        if user_update.email is not None:

            existing_user = (
                db.query(models.User)
                .filter(models.User.email == user_update.email)
                .first()
            )

            if (
                existing_user
                and existing_user.id != current_user.id
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "El correo electrónico ya se encuentra "
                        "registrado por otro usuario."
                    )
                )

            current_user.email = user_update.email

        if user_update.password is not None:
            current_user.hashed_password = (
                auth.get_password_hash(user_update.password)
            )

        db.commit()
        db.refresh(current_user)

        return current_user

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Ocurrió un error al actualizar los datos personales: "
                f"{str(e)}"
            )
        )


# ============================================================
# CLASE 9 · ACCESO Y PORTABILIDAD DE DATOS
# ============================================================

@app.get(
    "/api/users/me/datos",
    tags=["Usuarios"]
)
def get_mis_datos(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Devuelve TODO lo que la base guarda de este usuario: sus datos,
    su consentimiento con fecha, sus pedidos y sus solicitudes de
    revocación.
    """
    return usuario_service.obtener_datos_usuario(db, current_user)


@app.get(
    "/api/users/me/exportar",
    tags=["Usuarios"]
)
def exportar_mis_datos(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Igual que /me/datos, pero como archivo .json descargable
    (Content-Disposition: attachment).
    """
    return usuario_service.exportar_datos_usuario(db, current_user)


# ============================================================
# PRODUCTOS
# ============================================================

@app.get(
    "/api/products",
    response_model=List[schemas.ProductResponse],
    tags=["Productos"]
)
def get_products(
    skip: int = 0,
    limit: int = 10,
    name: Optional[str] = None,
    max_price: Optional[float] = None,
    category: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """
    Obtener productos, con paginación y filtros opcionales.

    /api/products?skip=0&limit=10
    /api/products?name=luffy
    /api/products?max_price=500
    /api/products?category=Anime
    """

    return products_service.listar_productos(
        db, skip=skip, limit=limit, name=name, max_price=max_price, category=category
    )


# Alias para /productos
@app.get(
    "/productos",
    response_model=List[schemas.ProductResponse],
    tags=["Productos"]
)
def obtener_productos(
    skip: int = 0,
    limit: int = 10,
    name: Optional[str] = None,
    max_price: Optional[float] = None,
    category: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """
    Obtener todos los productos (alias en español).
    """

    return products_service.listar_productos(
        db, skip=skip, limit=limit, name=name, max_price=max_price, category=category
    )


@app.get(
    "/api/products/{product_id}",
    response_model=schemas.ProductResponse,
    tags=["Productos"]
)
def get_product(
    product_id: int,
    db: Session = Depends(database.get_db)
):
    """
    Obtener un producto por ID.
    """

    product = (
        db.query(models.Product)
        .filter(models.Product.id == product_id)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado."
        )

    return product


@app.post(
    "/api/products",
    response_model=schemas.ProductResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Productos"]
)
def create_product(
    producto: schemas.ProductCreate,
    admin: models.User = Depends(auth.require_admin),
    db: Session = Depends(database.get_db)
):
    """
    Crear un producto. Requiere rol admin.
    """
    return products_service.crear_producto(db, producto)


@app.put(
    "/api/products/{product_id}",
    response_model=schemas.ProductResponse,
    tags=["Productos"]
)
def update_product(
    product_id: int,
    producto: schemas.ProductCreate,
    admin: models.User = Depends(auth.require_admin),
    db: Session = Depends(database.get_db)
):
    """
    Editar un producto existente. Requiere rol admin.
    """
    db_product = (
        db.query(models.Product)
        .filter(models.Product.id == product_id)
        .first()
    )
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado."
        )
    for key, value in producto.dict().items():
        setattr(db_product, key, value)
    db.commit()
    db.refresh(db_product)
    return db_product


@app.delete(
    "/api/products/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Productos"]
)
def delete_product(
    product_id: int,
    admin: models.User = Depends(auth.require_admin),
    db: Session = Depends(database.get_db)
):
    """
    Borrar un producto. Requiere rol admin.
    """
    db_product = (
        db.query(models.Product)
        .filter(models.Product.id == product_id)
        .first()
    )
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado."
        )
    db.delete(db_product)
    db.commit()


# ============================================================
# PEDIDOS  (Clase 8: checkout transaccional)
# ============================================================

@app.post(
    "/api/orders",
    response_model=schemas.OrderResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Pedidos"]
)
def place_order(
    order_data: schemas.OrderCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Checkout: la lógica transaccional (stock, 404/409, rollback,
    precio congelado) vive en services/pedido_service.crear_pedido,
    no acá. El endpoint solo conecta HTTP con el servicio.
    """
    return pedido_service.crear_pedido(db, current_user, order_data)


@app.get(
    "/api/orders",
    response_model=List[schemas.OrderResponse],
    tags=["Pedidos"]
)
def get_user_orders(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Equivalente a GET /pedidos/mios: solo los pedidos del usuario
    del token, del más nuevo al más viejo. No compite con la ruta
    de abajo porque no tiene segmento extra en el path.
    """

    return (
        db.query(models.Order)
        .filter(models.Order.user_id == current_user.id)
        .order_by(models.Order.created_at.desc())
        .all()
    )


@app.get(
    "/api/orders/{order_id}",
    response_model=schemas.OrderResponse,
    tags=["Pedidos"]
)
def get_order(
    order_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Equivalente a GET /pedidos/{pedido_id}. Un pedido ajeno
    devuelve 404 (ver pedido_service.obtener_pedido).
    """
    return pedido_service.obtener_pedido(db, current_user, order_id)


# ============================================================
# BOTÓN DE ARREPENTIMIENTO  (Clase 9, Partes 1-2)
# ============================================================

@app.post(
    "/api/orders/{order_id}/arrepentirse",
    response_model=schemas.RevocacionResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Pedidos"]
)
def cancel_order_arrepentimiento(
    order_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Equivalente a POST /pedidos/{pedido_id}/revocacion. Devuelve 201
    con el código de la solicitud (Disposición 954/2025 y 3/2026,
    art. 34 Ley 24.240). La lógica de las 4 validaciones y la
    transacción vive en services/revocacion_service.revocar.
    """
    return revocacion_service.revocar(db, current_user, order_id)


# ============================================================
# INFORMACIÓN LEGAL
# ============================================================

@app.get(
    "/api/legal/info",
    tags=["Información Legal"]
)
def get_legal_info():
    """
    Información legal del comercio.
    """

    return {
        "razon_social": "StickerZone S.R.L. (E-Commerce de Stickers)",
        "cuit": "30-76543210-9",
        "domicilio_legal": (
            "Av. Corrientes 1234, Piso 5, "
            "Ciudad Autónoma de Buenos Aires, Argentina"
        ),
        "email_contacto": "soporte@stickerzone.com.ar",
        "telefono_contacto": "+54 11 5236-8900",
        "registro_base_datos": (
            "Base de datos inscripta en el Registro Nacional "
            "de Bases de Datos (Ley 25.326)"
        )
    }


# ============================================================
# RUTA PRINCIPAL
# ============================================================

@app.get(
    "/",
    tags=["General"]
)
def root():
    return RedirectResponse(url="/static/index.html")


# ============================================================
# ARCHIVOS ESTÁTICOS
# ============================================================

try:
    app.mount(
        "/static",
        StaticFiles(directory="static", html=True),
        name="static"
    )

except Exception as e:
    print(f"Static directory not mounted yet: {e}")