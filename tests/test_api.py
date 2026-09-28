import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
import main
import models

# In-memory SQLite database for fast automated testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_ecommerce.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

main.app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    # Seed a sample product
    db = TestingSessionLocal()
    prod = models.Product(
        name="Sticker Naruto Test",
        description="Test sticker",
        price=100.0,
        stock=10,
        category="Anime",
        image_url="http://example.com/test.png"
    )
    db.add(prod)
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(main.app)

def test_register_without_consent_fails():
    response = client.post("/api/auth/register", json={
        "name": "Juan Perez",
        "email": "juan@example.com",
        "password": "password123",
        "data_consent": False
    })
    assert response.status_code == 400
    assert "consentimiento" in response.json()["detail"].lower()

def test_register_and_login_flow():
    # Register with consent
    reg_res = client.post("/api/auth/register", json={
        "name": "Sofia Gomez",
        "email": "sofia@example.com",
        "password": "password123",
        "data_consent": True
    })
    assert reg_res.status_code == 201
    assert reg_res.json()["email"] == "sofia@example.com"

    # Login
    login_res = client.post("/api/auth/login", json={
        "email": "sofia@example.com",
        "password": "password123"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token is not None

    # Get Me
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["name"] == "Sofia Gomez"

def test_products_list_and_category_filter():
    res = client.get("/api/products")
    assert res.status_code == 200
    products = res.json()
    assert len(products) >= 1

    # Filter category case insensitive
    filter_res = client.get("/api/products?category=anime")
    assert filter_res.status_code == 200
    assert len(filter_res.json()) >= 1

def test_checkout_and_arrepentimiento_flow():
    # 1. Register and login
    client.post("/api/auth/register", json={
        "name": "Carlos Ruiz",
        "email": "carlos@example.com",
        "password": "password123",
        "data_consent": True
    })
    token = client.post("/api/auth/login", json={
        "email": "carlos@example.com",
        "password": "password123"
    }).json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Place order for 2 units
    order_res = client.post("/api/orders", json={
        "items": [{"product_id": 1, "quantity": 2}]
    }, headers=headers)
    assert order_res.status_code == 201
    order_id = order_res.json()["id"]

    # Check stock updated from 10 to 8
    prod_res = client.get("/api/products/1")
    assert prod_res.json()["stock"] == 8

    # 3. Export personal data (Ley 25.326)
    export_res = client.get("/api/users/me/exportar", headers=headers)
    assert export_res.status_code == 200
    assert "attachment" in export_res.headers["content-disposition"]
    assert "carlos@example.com" in export_res.text

    # 4. Botón de arrepentimiento
    rev_res = client.post(f"/api/orders/{order_id}/arrepentirse", headers=headers)
    assert rev_res.status_code == 201
    assert "codigo" in rev_res.json()
    assert rev_res.json()["codigo"].startswith("ARR-")

    # Check stock restored from 8 back to 10
    prod_restored = client.get("/api/products/1")
    assert prod_restored.json()["stock"] == 10

    # Repeated revocation fails
    rev_repeat = client.post(f"/api/orders/{order_id}/arrepentirse", headers=headers)
    assert rev_repeat.status_code == 409

def test_account_deletion_soft_delete():
    client.post("/api/auth/register", json={
        "name": "Maria Diaz",
        "email": "maria@example.com",
        "password": "password123",
        "data_consent": True
    })
    token = client.post("/api/auth/login", json={
        "email": "maria@example.com",
        "password": "password123"
    }).json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}

    # Delete account
    del_res = client.delete("/api/auth/delete-data", headers=headers)
    assert del_res.status_code == 200

    # Subsequent request with old token should fail 401
    me_after = client.get("/api/auth/me", headers=headers)
    assert me_after.status_code == 401
