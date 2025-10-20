"""add_jobs_and_preferences_tables

Revision ID: add_jobs_preferences_v2
Revises: add_genie_wish_detailed_fields
Create Date: 2025-10-20 05:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision = 'add_jobs_preferences_v2'
down_revision = 'add_genie_wish_detailed_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create jobs table
    op.create_table('jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('provider_job_id', sa.String(length=255), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('company', sa.String(length=255), nullable=False),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('remote', sa.Boolean(), nullable=True),
        sa.Column('salary_min', sa.Float(), nullable=True),
        sa.Column('salary_max', sa.Float(), nullable=True),
        sa.Column('currency', sa.String(length=3), nullable=True),
        sa.Column('snippet', sa.Text(), nullable=True),
        sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('redirect_url', sa.Text(), nullable=False),
        sa.Column('posted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('job_embedding', Vector(1536), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for jobs table
    op.create_index(op.f('ix_jobs_id'), 'jobs', ['id'], unique=False)
    op.create_index(op.f('ix_jobs_provider'), 'jobs', ['provider'], unique=False)
    op.create_index(op.f('ix_jobs_title'), 'jobs', ['title'], unique=False)
    op.create_index(op.f('ix_jobs_company'), 'jobs', ['company'], unique=False)
    op.create_index(op.f('ix_jobs_location'), 'jobs', ['location'], unique=False)
    op.create_index(op.f('ix_jobs_remote'), 'jobs', ['remote'], unique=False)
    op.create_index(op.f('ix_jobs_salary_min'), 'jobs', ['salary_min'], unique=False)
    op.create_index(op.f('ix_jobs_salary_max'), 'jobs', ['salary_max'], unique=False)
    op.create_index(op.f('ix_jobs_posted_at'), 'jobs', ['posted_at'], unique=False)
    
    # Custom indexes
    op.create_index('ix_jobs_provider_job_id', 'jobs', ['provider', 'provider_job_id'], unique=True)
    op.create_index('ix_jobs_tags_gin', 'jobs', ['tags'], postgresql_using='gin')
    op.create_index('ix_jobs_location_remote', 'jobs', ['location', 'remote'], unique=False)
    op.create_index('ix_jobs_salary_range', 'jobs', ['salary_min', 'salary_max'], unique=False)
    op.create_index('ix_jobs_posted_at_desc', 'jobs', ['posted_at'], unique=False, postgresql_using='btree')

    # Create user_preferences table
    op.create_table('user_preferences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('skills', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('target_titles', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('location_pref', sa.String(length=255), nullable=True),
        sa.Column('remote_ok', sa.Boolean(), nullable=True),
        sa.Column('salary_min', sa.Float(), nullable=True),
        sa.Column('blocked_companies', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('preferred_companies', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for user_preferences
    op.create_index(op.f('ix_user_preferences_id'), 'user_preferences', ['id'], unique=False)
    op.create_index(op.f('ix_user_preferences_user_id'), 'user_preferences', ['user_id'], unique=True)

    # Create job_swipes table
    op.create_table('job_swipes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('job_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(length=10), nullable=False),
        sa.Column('device', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for job_swipes
    op.create_index(op.f('ix_job_swipes_id'), 'job_swipes', ['id'], unique=False)
    op.create_index(op.f('ix_job_swipes_user_id'), 'job_swipes', ['user_id'], unique=False)
    op.create_index(op.f('ix_job_swipes_job_id'), 'job_swipes', ['job_id'], unique=False)
    op.create_index(op.f('ix_job_swipes_created_at'), 'job_swipes', ['created_at'], unique=False)
    
    # Custom indexes for job_swipes
    op.create_index('ix_job_swipes_user_created', 'job_swipes', ['user_id', 'created_at'], unique=False)
    op.create_index('ix_job_swipes_job_action', 'job_swipes', ['job_id', 'action'], unique=False)
    op.create_index('ix_job_swipes_user_job', 'job_swipes', ['user_id', 'job_id'], unique=False)

    # Create saved_jobs table
    op.create_table('saved_jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('job_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('saved_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for saved_jobs
    op.create_index(op.f('ix_saved_jobs_id'), 'saved_jobs', ['id'], unique=False)
    op.create_index(op.f('ix_saved_jobs_user_id'), 'saved_jobs', ['user_id'], unique=False)
    op.create_index(op.f('ix_saved_jobs_job_id'), 'saved_jobs', ['job_id'], unique=False)
    op.create_index(op.f('ix_saved_jobs_status'), 'saved_jobs', ['status'], unique=False)
    op.create_index(op.f('ix_saved_jobs_saved_at'), 'saved_jobs', ['saved_at'], unique=False)
    
    # Custom indexes for saved_jobs
    op.create_index('ix_saved_jobs_user_job_unique', 'saved_jobs', ['user_id', 'job_id'], unique=True)
    op.create_index('ix_saved_jobs_user_status', 'saved_jobs', ['user_id', 'status'], unique=False)
    op.create_index('ix_saved_jobs_saved_at_desc', 'saved_jobs', ['saved_at'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('saved_jobs')
    op.drop_table('job_swipes')
    op.drop_table('user_preferences')
    op.drop_table('jobs')