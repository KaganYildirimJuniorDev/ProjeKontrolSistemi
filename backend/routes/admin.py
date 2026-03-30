from flask import request, jsonify
from flask import Blueprint
from bson import ObjectId
from models import Project, Assignment, User, Activity, Progress, Notification
import jwt
from config import Config

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

@admin_bp.before_request
def check_admin():
    """Check if user is admin"""
    # Allow preflight requests
    if request.method == 'OPTIONS':
        return None
    
    token = request.headers.get('Authorization')
    
    if not token:
        return jsonify({'message': 'Yetkisiz erişim'}), 401
    
    try:
        if token.startswith('Bearer '):
            token = token[7:]
        
        payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
        
        if not payload.get('is_admin', False):
            return jsonify({'message': 'Admin yetkisi gerekli'}), 403
            
    except:
        return jsonify({'message': 'Geçersiz token'}), 401

@admin_bp.route('/projects', methods=['GET'])
def get_all_projects():
    """Get all projects with admin view"""
    try:
        projects = Project.get_all_projects()
        
        # Enrich with assignment info
        for project in projects:
            if project.get('assignmentId'):
                assignment = Assignment.find_by_id(project['assignmentId'])
                if assignment:
                    owner = User.find_by_id(assignment['createdBy'])
                    project['ownerName'] = owner['username'] if owner else 'Unknown'
                    project['memberCount'] = len(assignment['members'])
        
        return jsonify(projects), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@admin_bp.route('/projects', methods=['POST'])
def create_project_admin():
    """Create a new project"""
    try:
        data = request.get_json()
        
        if not data or not data.get('originalName'):
            return jsonify({'message': 'Proje adı gereklidir'}), 400
        
        project_id = Project.create(
            data['originalName'],
            data.get('description', '')
        )
        
        return jsonify({
            'message': 'Proje başarıyla oluşturuldu',
            'projectId': project_id
        }), 201
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@admin_bp.route('/projects/<project_id>', methods=['PUT'])
def update_project_admin(project_id):
    """Update project details"""
    try:
        project = Project.find_by_id(project_id)
        
        if not project:
            return jsonify({'message': 'Proje bulunamadı'}), 404
        
        data = request.get_json()
        
        if data.get('originalName'):
            # Update both names if project is not taken
            if not project['isTaken']:
                Project.get_collection().update_one(
                    {'_id': ObjectId(project_id)},
                    {'$set': {'originalName': data['originalName'], 'currentName': data['originalName']}}
                )
        
        if data.get('description'):
            Project.get_collection().update_one(
                {'_id': ObjectId(project_id)},
                {'$set': {'description': data['description']}}
            )
        
        return jsonify({'message': 'Proje başarıyla güncellendi'}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@admin_bp.route('/projects/<project_id>', methods=['DELETE'])
def delete_project_admin(project_id):
    """Delete a project"""
    try:
        project = Project.find_by_id(project_id)
        
        if not project:
            return jsonify({'message': 'Proje bulunamadı'}), 404
        
        # Delete associated assignment if exists
        if project.get('assignmentId'):
            Assignment.delete(project['assignmentId'])
            Progress.delete(project['assignmentId'])
        
        Project.delete(project_id)
        
        return jsonify({'message': 'Proje başarıyla silindi'}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@admin_bp.route('/assignments', methods=['GET'])
def get_all_assignments():
    """Get all assignments"""
    try:
        assignments = Assignment.get_collection().find().sort('createdAt', -1)
        result = []
        
        for assignment in assignments:
            owner = User.find_by_id(str(assignment['createdBy']))
            project = Project.find_by_id(str(assignment['projectId']))
            progress = Progress.find_by_assignment(str(assignment['_id']))
            
            result.append({
                '_id': str(assignment['_id']),
                'projectId': str(assignment['projectId']),
                'projectName': project['currentName'] if project else 'Unknown',
                'ownerName': owner['username'] if owner else 'Unknown',
                'memberCount': len(assignment['members']),
                'status': progress['status'] if progress else 'planning',
                'progress': progress['progress'] if progress else 0,
                'createdAt': str(assignment.get('createdAt', ''))
            })
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@admin_bp.route('/assignments/<assignment_id>', methods=['DELETE'])
def force_delete_assignment(assignment_id):
    """Force delete an assignment (admin only)"""
    try:
        assignment = Assignment.find_by_id(assignment_id)
        
        if not assignment:
            return jsonify({'message': 'Görev bulunamadı'}), 404
        
        # Release project
        project = Project.find_by_id(assignment['projectId'])
        if project:
            Project.unassign_project(assignment['projectId'], project['originalName'])
        
        # Delete assignment and progress
        Assignment.delete(assignment_id)
        Progress.delete(assignment_id)
        
        return jsonify({'message': 'Görev silindi ve proje boşa çıkarıldı'}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@admin_bp.route('/users', methods=['GET'])
def get_all_users_admin():
    """Get all users for admin"""
    try:
        users = User.get_all_users()
        
        # Enrich with project counts
        for user in users:
            assignments = Assignment.get_user_assignments(user['_id'])
            user['projectCount'] = len(assignments)
            user['ownedProjects'] = len([a for a in assignments if str(a['createdBy']) == str(user['_id'])])
        
        return jsonify(users), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@admin_bp.route('/stats', methods=['GET'])
def get_admin_stats():
    """Get detailed admin statistics"""
    try:
        total_projects = Project.get_collection().count_documents({})
        taken_projects = Project.get_collection().count_documents({"isTaken": True})
        total_users = User.get_collection().count_documents({})
        total_assignments = Assignment.get_collection().count_documents({})
        
        # Get active assignments
        active_assignments = []
        for assignment in Assignment.get_collection().find().limit(5):
            owner = User.find_by_id(str(assignment['createdBy']))
            project = Project.find_by_id(str(assignment['projectId']))
            progress = Progress.find_by_assignment(str(assignment['_id']))
            
            active_assignments.append({
                'assignmentId': str(assignment['_id']),
                'projectName': project['currentName'] if project else 'Unknown',
                'ownerName': owner['username'] if owner else 'Unknown',
                'memberCount': len(assignment['members']),
                'status': progress['status'] if progress else 'planning',
                'progress': progress['progress'] if progress else 0
            })
        
        return jsonify({
            'totalProjects': total_projects,
            'takenProjects': taken_projects,
            'availableProjects': total_projects - taken_projects,
            'totalUsers': total_users,
            'totalAssignments': total_assignments,
            'recentAssignments': active_assignments
        }), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@admin_bp.route('/users/<user_id>/role', methods=['PUT'])
def update_user_role(user_id):
    """Update user role (admin only)"""
    try:
        data = request.get_json()
        if 'is_admin' not in data:
            return jsonify({'message': 'is_admin alanı gereklidir'}), 400
        
        # Don't allow changing own role to prevent lockout
        token = request.headers.get('Authorization')
        if token.startswith('Bearer '):
            token = token[7:]
        payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
        
        if str(payload.get('user_id')) == str(user_id):
            return jsonify({'message': 'Kendi yetkinizi değiştiremezsiniz'}), 400
            
        User.update_role(user_id, data['is_admin'])
        
        return jsonify({'message': 'Kullanıcı rolü başarıyla güncellendi'}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@admin_bp.route('/broadcast', methods=['POST'])
def broadcast_notification():
    """Broadcast a notification to all users"""
    try:
        data = request.get_json()
        if not data or not data.get('title') or not data.get('message'):
            return jsonify({'message': 'Başlık ve mesaj gereklidir'}), 400
        
        users = User.get_all_users()
        sent_count = 0
        
        for user in users:
            Notification.create(
                user_id=user['_id'],
                assignment_id=None,
                notification_type='admin_broadcast',
                title=f"📢 {data['title']}",
                message=data['message']
            )
            sent_count += 1
            
        return jsonify({
            'message': f'Duyuru {sent_count} kullanıcıya başarıyla gönderildi!',
            'sentCount': sent_count
        }), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500
