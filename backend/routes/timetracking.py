from flask import Blueprint, request, jsonify
from models.timelog import TimeLog
from models.user import User
from models.assignment import Assignment
from functools import wraps
import jwt
import os

timetracking_bp = Blueprint('timetracking', __name__, url_prefix='/api/timetracking')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            from flask import current_app
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.find_by_id(data['userId'])
        except:
            return jsonify({'message': 'Token is invalid!'}), 401
            
        return f(current_user, *args, **kwargs)
    
    return decorated

@timetracking_bp.route('/start', methods=['POST'])
@token_required
def start_timer(current_user):
    data = request.get_json()
    assignment_id = data.get('assignmentId')
    
    if not assignment_id:
        return jsonify({'message': 'Assignment ID is required'}), 400
        
    session_id = TimeLog.start_session(assignment_id, current_user['_id'])
    return jsonify({
        'message': 'Timer started',
        'sessionId': session_id
    }), 200

@timetracking_bp.route('/stop', methods=['POST'])
@token_required
def stop_timer(current_user):
    data = request.get_json()
    assignment_id = data.get('assignmentId')
    
    if not assignment_id:
        return jsonify({'message': 'Assignment ID is required'}), 400
        
    result = TimeLog.stop_session(assignment_id, current_user['_id'])
    if result:
        return jsonify({'message': 'Timer stopped'}), 200
    return jsonify({'message': 'No active session found'}), 404

@timetracking_bp.route('/status/<assignment_id>', methods=['GET'])
@token_required
def get_timer_status(current_user, assignment_id):
    session = TimeLog.get_user_active_session(current_user['_id'])
    active = False
    if session and session['assignmentId'] == assignment_id:
        active = True
        
    total_seconds = TimeLog.get_total_time(assignment_id)
    
    return jsonify({
        'active': active,
        'totalSeconds': total_seconds,
        'startTime': session['startTime'].isoformat() if active else None
    }), 200
