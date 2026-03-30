from flask import Blueprint

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
projects_bp = Blueprint('projects', __name__, url_prefix='/api/projects')
assignments_bp = Blueprint('assignments', __name__, url_prefix='/api/assignments')

# Import route handlers
from . import auth, projects, assignments, dashboard, admin, progress

__all__ = ['auth_bp', 'projects_bp', 'assignments_bp', 'dashboard.dashboard_bp', 'admin.admin_bp', 'progress.progress_bp']
