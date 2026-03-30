from flask import Flask, jsonify
from flask_cors import CORS
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import config
from routes import auth_bp, projects_bp, assignments_bp
from routes.dashboard import dashboard_bp
from routes.admin import admin_bp
from routes.progress import progress_bp
from models import Database
from flask_mail import Mail
from flask_socketio import SocketIO

mail = Mail()
socketio = SocketIO()

def create_app(config_name=None):
    """Application factory"""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Configure Upload Folder
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB limit
    
    # Initialize SocketIO and Mail
    socketio.init_app(app, cors_allowed_origins="*", async_mode='eventlet')
    mail.init_app(app)
    
    # Enable CORS with proper configuration
    CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # Register blueprints
    from routes.timetracking import timetracking_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(assignments_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(progress_bp)
    app.register_blueprint(timetracking_bp)
    
    # Import socket events after app and socketio are initialized
    from routes.chat import init_socket_events
    init_socket_events(socketio)
    
    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({'status': 'ok', 'message': 'Server is running'}), 200
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'message': 'Endpoint not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'message': 'Internal server error'}), 500
    
    @app.before_request
    def before_request():
        """Initialize database connection"""
        pass
    
    @app.teardown_appcontext
    def teardown_db(exception):
        """Close database connection"""
        pass
    
    @app.route('/uploads/<filename>')
    def uploaded_file(filename):
        from flask import send_from_directory
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    return app

if __name__ == '__main__':
    app = create_app()
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
