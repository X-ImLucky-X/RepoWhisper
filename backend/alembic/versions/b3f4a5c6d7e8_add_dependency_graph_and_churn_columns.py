"""Add dependency_graph and churn_json columns

Revision ID: b3f4a5c6d7e8
Revises: 7ceeae4eb528
Create Date: 2026-07-22 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3f4a5c6d7e8'
down_revision: Union[str, Sequence[str], None] = '7ceeae4eb528'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('repository', sa.Column('dependency_graph', sa.Text(), nullable=True))
    op.add_column('repository', sa.Column('churn_json', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('repository', 'churn_json')
    op.drop_column('repository', 'dependency_graph')
