from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from decimal import Decimal
import datetime

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- User Schemas ---
class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    
    # Ley 25.326 compliance: Must explicitly consent to register
    data_consent: bool = Field(
        ..., 
        description="Explicit consent for personal data processing under Ley 25.326"
    )

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6, description="Password must be at least 6 characters")

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    created_at: datetime.datetime
    data_consent: bool

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# --- Product Schemas ---
class ProductResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: float
    stock: int
    image_url: Optional[str] = None
    category: Optional[str] = None

    class Config:
        from_attributes = True

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    stock: int
    image_url: Optional[str] = None
    category: Optional[str] = None

# --- Order Item Schemas ---
class OrderItemCreate(BaseModel):
    # Esto es el "ItemIn" de la consigna: SOLO producto_id y cantidad.
    # A propósito NO tiene precio ni price_at_purchase: eso lo decide
    # siempre el servidor en pedido_service.crear_pedido().
    product_id: int
    quantity: int = Field(..., gt=0, description="Quantity must be greater than 0")

class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    price_at_purchase: Decimal
    product: ProductResponse

    model_config = {"from_attributes": True}

# --- Order Schemas ---
class OrderCreate(BaseModel):
    # Esto es el "PedidoCreate" de la consigna: SOLO una lista de items.
    # Sin precio, sin total, sin usuario_id. El usuario sale del token
    # (Depends(get_current_user)), nunca del cuerpo del pedido.
    items: List[OrderItemCreate] = Field(..., min_length=1)

class OrderResponse(BaseModel):
    id: int
    user_id: int
    total_price: Decimal
    status: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    items: List[OrderItemResponse]

    model_config = {"from_attributes": True}


# --- Revocación (botón de arrepentimiento, Clase 9) ---
class RevocacionResponse(BaseModel):
    codigo: str
    pedido_id: int
    creada_en: datetime.datetime

    model_config = {"from_attributes": True}