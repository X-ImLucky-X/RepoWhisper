"""Add missing repository columns

Revision ID: 7ceeae4eb528
Revises: dc7ad1f10728
Create Date: 2026-06-20 16:36:40.530162

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7ceeae4eb528'
down_revision: Union[str, Sequence[str], None] = 'dc7ad1f10728'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'interviewsession',
        sa.Column('mode', sa.String(), nullable=False)
    )

    op.add_column(
        'repository',
        sa.Column('tree', sa.Text(), nullable=True)
    )

    op.add_column(
        'repository',
        sa.Column('graph_json', sa.Text(), nullable=True)
    )

    op.add_column(
        'repository',
        sa.Column('scorecard', sa.Text(), nullable=True)
    )

    # SQLite doesn't support DROP CONSTRAINT.
    # The existing foreign key can remain.


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_column('repository', 'scorecard')
    op.drop_column('repository', 'graph_json')
    op.drop_column('repository', 'tree')
    op.drop_column('interviewsession', 'mode')

    # No foreign-key recreation needed for SQLite.
    # ### end Alembic commands ###
