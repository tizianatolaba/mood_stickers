"""numeric en pedidos, activo y solicitudes_revocacion

Revision ID: 2b17cfa2e5d6
Revises: d79e0ed1c2d8
Create Date: 2026-09-14 10:10:32.569392

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2b17cfa2e5d6'
down_revision: Union[str, Sequence[str], None] = 'd79e0ed1c2d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
