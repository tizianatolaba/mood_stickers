"""numeric en pedidos, activo y solicitudes_revocacion

Revision ID: 7901d431595c
Revises: 4282c315cdb9
Create Date: 2026-09-14 11:43:09.179370

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7901d431595c'
down_revision: Union[str, Sequence[str], None] = '4282c315cdb9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
