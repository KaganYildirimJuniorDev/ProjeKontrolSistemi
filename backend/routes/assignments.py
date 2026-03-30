from flask import request, jsonify
from . import assignments_bp
from models import Assignment, Project, User, Activity, Notification

@assignments_bp.route('/<assignment_id>', methods=['GET'])
def get_assignment(assignment_id):
    """Get assignment details"""
    assignment = Assignment.find_by_id(assignment_id)
    
    if not assignment:
        return jsonify({'message': 'Görev bulunamadı'}), 404
    
    # Get member details
    members = []
    for member_id in assignment['members']:
        user = User.find_by_id(member_id)
        if user:
            members.append({
                'userId': str(user['_id']),
                'username': user['username'],
                'email': user['email']
            })
    
    assignment['membersDetails'] = members
    
    return jsonify(assignment), 200

@assignments_bp.route('/user/<user_id>', methods=['GET'])
def get_user_assignments(user_id):
    """Get all assignments for a user"""
    assignments = Assignment.get_user_assignments(user_id)
    
    # Enrich with project and member details
    result = []
    for assignment in assignments:
        project = Project.find_by_id(assignment['projectId'])
        if project:
            # Get member details
            members = []
            for member_id in assignment['members']:
                user = User.find_by_id(member_id)
                if user:
                    members.append({
                        'userId': str(user['_id']),
                        'username': user['username']
                    })
            
            from models import Progress
            progress_obj = Progress.find_by_assignment(assignment['_id'])
            status = progress_obj.get('status', 'planning') if progress_obj else 'planning'
            progress_val = progress_obj.get('progress', 0) if progress_obj else 0
            
            result.append({
                'assignmentId': assignment['_id'],
                'projectId': assignment['projectId'],
                'projectName': project['currentName'],
                'originalProjectName': project['originalName'],
                'createdBy': assignment['createdBy'],
                'status': status,
                'progress': progress_val,
                'members': members,
                'createdAt': str(assignment.get('createdAt', ''))
            })
    
    return jsonify(result), 200

@assignments_bp.route('/<assignment_id>/add-member', methods=['POST'])
def add_member(assignment_id):
    """Add member to assignment"""
    data = request.get_json()
    user_id = data.get('userId')
    requester_id = data.get('requesterId')
    
    if not user_id or not requester_id:
        return jsonify({'message': 'Gerekli alanlar eksik'}), 400
    
    assignment = Assignment.find_by_id(assignment_id)
    
    if not assignment:
        return jsonify({'message': 'Görev bulunamadı'}), 404
    
    # Check if requester is owner
    if not Assignment.is_creator(assignment_id, requester_id):
        return jsonify({'message': 'Sadece görev yöneticisi üye ekleyebilir'}), 403
    
    # Check if user is already member
    if user_id in assignment['members']:
        return jsonify({'message': 'Kullanıcı zaten üye'}), 409
    
    # Check if user exists
    user = User.find_by_id(user_id)
    if not user:
        return jsonify({'message': 'Kullanıcı bulunamadı'}), 404
    
    Assignment.add_member(assignment_id, user_id)
    
    # Log activity
    Activity.log(assignment_id, requester_id, "member_added", f"'{user['username']}' ekibe eklendi")
    
    # Create notification for new member
    project = Project.find_by_id(assignment['projectId'])
    project_name = project['currentName'] if project else 'Unknown'
    Notification.create(user_id, assignment_id, "member_added",
                       f"Projeye eklendiniz: {project_name}",
                       f"'{project_name}' projesine eklendiniz.")
    
    return jsonify({'message': 'Üye başarıyla eklendi'}), 200

@assignments_bp.route('/<assignment_id>/remove-member', methods=['POST'])
def remove_member(assignment_id):
    """Remove member from assignment"""
    data = request.get_json()
    member_id = data.get('memberId')
    requester_id = data.get('requesterId')
    
    if not member_id or not requester_id:
        return jsonify({'message': 'Gerekli alanlar eksik'}), 400
    
    assignment = Assignment.find_by_id(assignment_id)
    
    if not assignment:
        return jsonify({'message': 'Görev bulunamadı'}), 404
    
    # Check if requester is owner
    if not Assignment.is_creator(assignment_id, requester_id):
        return jsonify({'message': 'Sadece görev yöneticisi üye çıkarabilir'}), 403
    
    # Check if member exists in assignment
    if member_id not in assignment['members']:
        return jsonify({'message': 'Kullanıcı üye değil'}), 404
    
    # Prevent removing the creator
    if str(member_id) == str(assignment['createdBy']):
        return jsonify({'message': 'Görev yöneticisi çıkarılamaz'}), 400
    
    Assignment.remove_member(assignment_id, member_id)
    
    # Log activity
    member = User.find_by_id(member_id)
    member_name = member['username'] if member else 'Unknown'
    Activity.log(assignment_id, requester_id, "member_removed", f"'{member_name}' ekipten çıkarıldı")
    
    # Create notification for removed member
    project = Project.find_by_id(assignment['projectId'])
    project_name = project['currentName'] if project else 'Unknown'
    Notification.create(member_id, assignment_id, "member_removed",
                       f"Projeden çıkarıldınız: {project_name}",
                       f"'{project_name}' projesinden çıkarıldınız.")
    
    return jsonify({'message': 'Üye başarıyla çıkarıldı'}), 200

@assignments_bp.route('/<assignment_id>', methods=['DELETE'])
def delete_assignment(assignment_id):
    """Delete assignment and release project"""
    data = request.get_json()
    requester_id = data.get('requesterId')
    
    if not requester_id:
        return jsonify({'message': 'İstekte bulunan ID gerekli'}), 400
    
    assignment = Assignment.find_by_id(assignment_id)
    
    if not assignment:
        return jsonify({'message': 'Görev bulunamadı'}), 404
    
    # Check if requester is owner
    if not Assignment.is_creator(assignment_id, requester_id):
        return jsonify({'message': 'Sadece görev yöneticisi silebilir'}), 403
    
    # Get project to reset its name
    project = Project.find_by_id(assignment['projectId'])
    
    # Log activity
    Activity.log(assignment_id, requester_id, "project_released", f"Proje havusa geri bırakıldı")
    
    # Create notifications for all members
    project_name = project['currentName'] if project else 'Unknown'
    for member_id in assignment['members']:
        if str(member_id) != str(requester_id):  # Don't notify the creator
            Notification.create(member_id, assignment_id, "project_released",
                               f"Proje bırakıldı: {project_name}",
                               f"'{project_name}' projesi havusa geri bırakıldı.")
    
    # Delete assignment
    from models import Progress
    Assignment.delete(assignment_id)
    Progress.delete(assignment_id)
    
    # Release project
    if project:
        Project.unassign_project(assignment['projectId'], project['originalName'])
    
    return jsonify({'message': 'Proje başarıyla bırakıldı'}), 200
