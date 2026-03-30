from flask import request, jsonify
from flask import Blueprint
from models import Project, Assignment, Activity, User, Notification, Progress

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/stats', methods=['GET'])
def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        # Total counts
        total_projects = Project.get_collection().count_documents({})
        taken_projects = Project.get_collection().count_documents({"isTaken": True})
        available_projects = total_projects - taken_projects
        
        total_users = User.get_collection().count_documents({})
        total_assignments = Assignment.get_collection().count_documents({})
        
        # Get recent activities
        recent_activities = Activity.get_recent_activities(10)
        
        # Get statistics by status for progress
        statuses = {
            "planning": Progress.get_collection().count_documents({"status": "planning"}),
            "in_progress": Progress.get_collection().count_documents({"status": "in_progress"}),
            "testing": Progress.get_collection().count_documents({"status": "testing"}),
            "completed": Progress.get_collection().count_documents({"status": "completed"})
        }
        
        return jsonify({
            'totalProjects': total_projects,
            'takenProjects': taken_projects,
            'availableProjects': available_projects,
            'totalUsers': total_users,
            'totalAssignments': total_assignments,
            'projectsByStatus': statuses,
            'recentActivities': recent_activities
        }), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@dashboard_bp.route('/user/<user_id>/summary', methods=['GET'])
def get_user_summary(user_id):
    """Get user's dashboard summary"""
    try:
        # Get user's assignments
        assignments = Assignment.get_user_assignments(user_id)
        
        summary_data = {
            'totalProjects': len(assignments),
            'ownedProjects': 0,
            'memberInProjects': 0,
            'completedProjects': 0,
            'activeProjects': []
        }
        
        for assignment in assignments:
            # Check if user is owner
            if str(assignment['createdBy']) == str(user_id):
                summary_data['ownedProjects'] += 1
            else:
                summary_data['memberInProjects'] += 1
            
            # Get progress
            progress = Progress.find_by_assignment(assignment['projectId'])
            if progress and progress['status'] == 'completed':
                summary_data['completedProjects'] += 1
            
            # Add to active projects
            project = Project.find_by_id(assignment['projectId'])
            if project:
                summary_data['activeProjects'].append({
                    'projectId': assignment['projectId'],
                    'projectName': project['currentName'],
                    'status': progress['status'] if progress else 'planning',
                    'progress': progress['progress'] if progress else 0
                })
        
        return jsonify(summary_data), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@dashboard_bp.route('/activities/<assignment_id>', methods=['GET'])
def get_assignment_activities(assignment_id):
    """Get activity log for an assignment"""
    try:
        activities = Activity.get_assignment_activity(assignment_id, limit=20)
        
        # Get user details for each activity
        for activity in activities:
            user = User.find_by_id(activity['userId'])
            if user:
                activity['userName'] = user['username']
        
        return jsonify(activities), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@dashboard_bp.route('/notifications/<user_id>', methods=['GET'])
def get_user_notifications(user_id):
    """Get user notifications"""
    try:
        unread_only = request.args.get('unread', 'false').lower() == 'true'
        notifications = Notification.get_user_notifications(user_id, unread_only)
        return jsonify(notifications), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@dashboard_bp.route('/notifications/<notification_id>/read', methods=['POST'])
def mark_notification_read(notification_id):
    """Mark notification as read"""
    try:
        Notification.mark_as_read(notification_id)
        return jsonify({'message': 'Bildirim okundu olarak işaretlendi'}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@dashboard_bp.route('/notifications/<user_id>/read-all', methods=['POST'])
def mark_all_notifications_read(user_id):
    """Mark all notifications as read"""
    try:
        Notification.mark_all_as_read(user_id)
        return jsonify({'message': 'Tüm bildirimler okundu olarak işaretlendi'}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@dashboard_bp.route('/notifications/<user_id>/count', methods=['GET'])
def get_unread_count(user_id):
    """Get unread notification count"""
    try:
        count = Notification.get_unread_count(user_id)
        return jsonify({'unreadCount': count}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500
