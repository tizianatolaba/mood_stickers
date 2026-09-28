"""numeric en pedidos, activo y solicitudes_revocacion

Revision ID: 4282c315cdb9
Revises: 2b17cfa2e5d6
Create Date: 2026-09-14 10:10:42.407392

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4282c315cdb9'
down_revision: Union[str, Sequence[str], None] = '2b17cfa2e5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
