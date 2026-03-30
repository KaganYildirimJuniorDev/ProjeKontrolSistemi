from flask import request, jsonify
from . import projects_bp
from models import Project, Assignment, User, Activity, Progress, Notification

@projects_bp.route('', methods=['GET'])
def get_projects():
    """Get all projects"""
    projects = Project.get_all_projects()
    return jsonify(projects), 200

@projects_bp.route('/available', methods=['GET'])
def get_available_projects():
    """Get available (not taken) projects"""
    projects = Project.get_available_projects()
    return jsonify(projects), 200

@projects_bp.route('/<project_id>', methods=['GET'])
def get_project(project_id):
    """Get project details"""
    project = Project.find_by_id(project_id)
    
    if not project:
        return jsonify({'message': 'Proje bulunamadı'}), 404
    
    # If project has assignment, get team details
    if project.get('assignmentId'):
        assignment = Assignment.find_by_id(project['assignmentId'])
        if assignment:
            # Get member details
            members = []
            for member_id in assignment['members']:
                user = User.find_by_id(member_id)
                if user:
                    members.append({
                        'userId': str(user['_id']),
                        'username': user['username']
                    })
            project['team'] = {
                'assignmentId': assignment['_id'],
                'createdBy': assignment['createdBy'],
                'members': members
            }
    
    return jsonify(project), 200

@projects_bp.route('', methods=['POST'])
def create_project():
    """Create a new project (Admin only - v1 simple implementation)"""
    data = request.get_json()
    
    if not data or not data.get('originalName'):
        return jsonify({'message': 'Gerekli alanlar eksik'}), 400
    
    project_id = Project.create(
        data['originalName'],
        data.get('description', '')
    )
    
    return jsonify({
        'message': 'Proje başarıyla oluşturuldu',
        'projectId': project_id
    }), 201

@projects_bp.route('/<project_id>/take', methods=['POST'])
def take_project(project_id):
    """User takes/claims a project"""
    data = request.get_json()
    user_id = data.get('userId')
    
    if not user_id:
        return jsonify({'message': 'Kullanıcı ID gerekli'}), 400
    
    project = Project.find_by_id(project_id)
    
    if not project:
        return jsonify({'message': 'Proje bulunamadı'}), 404
    
    if project['isTaken']:
        return jsonify({'message': 'Proje zaten alınmış'}), 409
    
    # Create assignment
    assignment_id = Assignment.create(project_id, user_id)
    
    # Update project
    Project.assign_project(project_id, assignment_id)
    
    # Create progress record
    Progress.create(assignment_id)
    
    # Log activity
    Activity.log(assignment_id, user_id, "project_taken", f"'{project['originalName']}' projesi alındı")
    
    return jsonify({
        'message': 'Proje başarıyla alındı',
        'assignmentId': assignment_id
    }), 201

@projects_bp.route('/<project_id>/rename', methods=['PUT'])
def rename_project(project_id):
    """Rename a project (project owner only)"""
    data = request.get_json()
    user_id = data.get('userId')
    new_name = data.get('newName')
    
    if not user_id or not new_name:
        return jsonify({'message': 'Gerekli alanlar eksik'}), 400
    
    project = Project.find_by_id(project_id)
    
    if not project:
        return jsonify({'message': 'Proje bulunamadı'}), 404
    
    # Check if user is owner
    if not project.get('assignmentId'):
        return jsonify({'message': 'Proje atanmamış'}), 400
    
    if not Assignment.is_creator(project['assignmentId'], user_id):
        return jsonify({'message': 'Sadece proje sahibi adını değiştirebilir'}), 403
    
    Project.update_name(project_id, new_name)
    
    # Log activity
    Activity.log(project['assignmentId'], user_id, "name_changed", 
                f"Proje adı '{project['currentName']}' yerine '{new_name}' olarak değiştirildi")
    
    return jsonify({'message': 'Proje adı başarıyla değiştirildi'}), 200

@projects_bp.route('/archive', methods=['GET'])
def get_completed_projects_archive():
    """Get all completed projects globally"""
    try:
        from models import Progress, Assignment, Project, User
        # Find all progress records that are completed
        completed_progress = list(Progress.get_collection().find({"status": "completed"}))
        
        result = []
        for prog in completed_progress:
            assignment_id = str(prog['assignmentId'])
            assignment = Assignment.find_by_id(assignment_id)
            if not assignment:
                continue
                
            project = Project.find_by_id(assignment['projectId'])
            if not project:
                continue
            
            # Get members
            members = []
            for m_id in assignment['members']:
                u = User.find_by_id(m_id)
                if u:
                    members.append(u['username'])
            
            result.append({
                'projectId': project['_id'],
                'projectName': project['currentName'],
                'originalName': project['originalName'],
                'description': project['description'],
                'completedAt': str(prog.get('updatedAt', '')),
                'team': members,
                'files': prog.get('files', []),
                'assignmentId': assignment_id
            })
            
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@projects_bp.route('/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """Delete a project (Admin only - v1 simple)"""
    Project.delete(project_id)
    return jsonify({'message': 'Proje başarıyla silindi'}), 200
