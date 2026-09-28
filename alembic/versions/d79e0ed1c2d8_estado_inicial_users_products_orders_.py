"""estado inicial: users, products, orders, order_items

Revision ID: d79e0ed1c2d8
Revises: ef8979ac42be
Create Date: 2026-09-08 11:54:41.297625

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd79e0ed1c2d8'
down_revision: Union[str, Sequence[str], None] = 'ef8979ac42be'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
