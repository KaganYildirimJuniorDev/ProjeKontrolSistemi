from flask import request, jsonify, current_app
from flask import Blueprint
from models import Progress, Assignment, Project, Activity, User, Comment
import os
from werkzeug.utils import secure_filename
from bson import ObjectId

progress_bp = Blueprint('progress', __name__, url_prefix='/api/progress')

@progress_bp.route('/<assignment_id>', methods=['GET'])
def get_progress(assignment_id):
    """Get progress for an assignment"""
    try:
        progress = Progress.find_by_assignment(assignment_id)
        
        if not progress:
            return jsonify({'message': 'İlerleme bulunamadı'}), 404
        
        return jsonify(progress), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@progress_bp.route('/<assignment_id>', methods=['POST'])
def create_progress(assignment_id):
    """Create progress record for assignment"""
    try:
        # Check if assignment exists
        assignment = Assignment.find_by_id(assignment_id)
        if not assignment:
            return jsonify({'message': 'Görev bulunamadı'}), 404
        
        # Check if progress already exists
        existing = Progress.find_by_assignment(assignment_id)
        if existing:
            return jsonify({'message': 'İlerleme zaten mevcut'}), 409
        
        data = request.get_json()
        status = data.get('status', 'planning') if data else 'planning'
        
        progress_id = Progress.create(assignment_id, status)
        
        return jsonify({
            'message': 'İlerleme oluşturuldu',
            'progressId': progress_id
        }), 201
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@progress_bp.route('/<assignment_id>/update', methods=['PUT'])
def update_progress(assignment_id):
    """Update progress percentage and status"""
    try:
        data = request.get_json()
        user_id = data.get('userId')
        
        # Check if user is member or admin
        assignment = Assignment.find_by_id(assignment_id)
        if not assignment:
            return jsonify({'message': 'Görev bulunamadı'}), 404
            
        user = User.find_by_id(user_id)
        is_admin = user.get('is_admin', False) if user else False
        
        if str(user_id) not in assignment['members'] and not is_admin:
            return jsonify({'message': 'Sadece ekip üyeleri veya adminler ilerlemeyi güncelleyebilir'}), 403
        
        progress_percent = data.get('progress', 0)
        status = data.get('status')
        notes = data.get('notes')
        
        Progress.update_progress(assignment_id, progress_percent, status, notes)
        
        # Log activity
        Activity.log(assignment_id, user_id, "progress_updated", 
                    f"İlerleme %{progress_percent} olarak güncellendi")
        
        return jsonify({'message': 'İlerleme güncellendi'}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@progress_bp.route('/<assignment_id>/status', methods=['PUT'])
def update_status(assignment_id):
    """Update only status"""
    try:
        data = request.get_json()
        user_id = data.get('userId')
        new_status = data.get('status')
        
        # Check if user is member or admin
        assignment = Assignment.find_by_id(assignment_id)
        if not assignment:
            return jsonify({'message': 'Görev bulunamadı'}), 404
            
        user = User.find_by_id(user_id)
        is_admin = user.get('is_admin', False) if user else False
        
        if str(user_id) not in assignment['members'] and not is_admin:
            return jsonify({'message': 'Sadece ekip üyeleri veya adminler durumu güncelleyebilir'}), 403
        
        if new_status not in ['planning', 'in_progress', 'testing', 'completed']:
            return jsonify({'message': 'Geçersiz durum'}), 400
        
        Progress.update_progress(assignment_id, None, new_status)
        
        # Create notifications for all members
        from models import Notification
        project = Project.find_by_id(assignment['projectId'])
        project_name = project['currentName'] if project else 'Unknown'
        
        status_labels = {
            'planning': 'Planlama',
            'in_progress': 'Geliştirme',
            'testing': 'Test',
            'completed': 'Tamamlandı'
        }
        status_text = status_labels.get(new_status, new_status)
        
        for member_id in assignment['members']:
            if str(member_id) != str(user_id):
                Notification.create(str(member_id), assignment_id, "status_changed",
                                   f"Proje durumu değişti: {project_name}",
                                   f"'{project_name}' projesinin durumu '{status_text}' olarak güncellendi.")

        # Log activity
        Activity.log(assignment_id, user_id, "status_changed", 
                    f"Durum {new_status} olarak değiştirildi")
        
        return jsonify({'message': 'Durum güncellendi'}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@progress_bp.route('/<assignment_id>/milestones', methods=['POST'])
def add_milestone(assignment_id):
    """Add a milestone"""
    try:
        data = request.get_json()
        user_id = data.get('userId')
        milestone_title = data.get('title') or data.get('name')
        
        # Check if user is member or admin
        assignment = Assignment.find_by_id(assignment_id)
        if not assignment:
            return jsonify({'message': 'Görev bulunamadı'}), 404
            
        user = User.find_by_id(user_id)
        is_admin = user.get('is_admin', False) if user else False
        
        if str(user_id) not in assignment['members'] and not is_admin:
            return jsonify({'message': 'Sadece ekip üyeleri veya adminler kilometre taşı ekleyebilir'}), 403
        
        if not milestone_title:
            return jsonify({'message': 'Kilometre taşı başlığı gerekli'}), 400
        
        Progress.add_milestone(assignment_id, milestone_title, False)
        
        # Log activity
        Activity.log(assignment_id, user_id, "milestone_added", 
                    f"'{milestone_title}' kilometre taşı eklendi")
        
        return jsonify({'message': 'Kilometre taşı eklendi'}), 201
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@progress_bp.route('/<assignment_id>/milestones/<int:milestone_index>', methods=['PUT'])
def update_milestone(assignment_id, milestone_index):
    """Update milestone completion status"""
    try:
        data = request.get_json()
        user_id = data.get('userId')
        completed = data.get('completed', False)
        
        # Check if user is member or admin
        assignment = Assignment.find_by_id(assignment_id)
        if not assignment:
            return jsonify({'message': 'Görev bulunamadı'}), 404
            
        user = User.find_by_id(user_id)
        is_admin = user.get('is_admin', False) if user else False
        
        if str(user_id) not in assignment['members'] and not is_admin:
            return jsonify({'message': 'Sadece ekip üyeleri veya adminler kilometre taşlarını güncelleyebilir'}), 403
        
        Progress.update_milestone(assignment_id, milestone_index, completed)
        
        status = "tamamlandı" if completed else "tamamlanmadı"
        Activity.log(assignment_id, user_id, "milestone_updated", 
                    f"Kilometre taşı {status} olarak işaretlendi")
        
        return jsonify({'message': 'Kilometre taşı güncellendi'}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@progress_bp.route('/<assignment_id>/milestones/<int:milestone_index>', methods=['DELETE'])
def delete_milestone(assignment_id, milestone_index):
    """Delete a milestone"""
    try:
        data = request.args
        user_id = data.get('userId')
        
        # Check if user is member or admin
        assignment = Assignment.find_by_id(assignment_id)
        if not assignment:
            return jsonify({'message': 'Görev bulunamadı'}), 404
            
        # Update progress model to support removal
        collection = Progress.get_collection()
        collection.update_one(
            {"assignmentId": ObjectId(assignment_id)},
            {"$unset": {f"milestones.{milestone_index}": 1}}
        )
        collection.update_one(
            {"assignmentId": ObjectId(assignment_id)},
            {"$pull": {"milestones": None}}
        )
        
        return jsonify({'message': 'Kilometre taşı silindi'}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@progress_bp.route('/<assignment_id>/files', methods=['POST'])
def upload_file(assignment_id):
    """Upload multiple files to progress"""
    try:
        if 'file' not in request.files:
            return jsonify({'message': 'Dosya bulunamadı'}), 400
        
        files = request.files.getlist('file')
        user_id = request.form.get('userId')
        
        if not files or len(files) == 0:
            return jsonify({'message': 'Dosya seçilmedi'}), 400
        
        if not user_id:
            return jsonify({'message': 'Kullanıcı ID gerekli'}), 400
            
        # Check if user is member or admin
        assignment = Assignment.find_by_id(assignment_id)
        if not assignment:
            return jsonify({'message': 'Görev bulunamadı'}), 404
            
        user = User.find_by_id(user_id)
        is_admin = user.get('is_admin', False) if user else False
        
        if str(user_id) not in assignment['members'] and not is_admin:
            return jsonify({'message': 'Yetki reddedildi'}), 403
            
        uploaded_files = []
        import time
        
        for file in files:
            if file and file.filename != '':
                filename = secure_filename(file.filename)
                # Add timestamp to filename to avoid collisions
                unique_filename = f"{int(time.time())}_{filename}"
                file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
                file.save(file_path)
                
                # Save metadata
                file_data = {
                    "filename": unique_filename,
                    "originalName": file.filename,
                    "uploadedBy": user['username'],
                    "userId": user_id,
                    "uploadedAt": time.time() * 1000 # JavaScript timestamp format
                }
                Progress.add_file(assignment_id, file_data)
                uploaded_files.append(file_data)
                
                # Log activity for each file or one for all? Let's do one for all or per file.
                # Per file is more detailed.
                Activity.log(assignment_id, user_id, "file_uploaded", f"'{file.filename}' dosyası yüklendi")
        
        if not uploaded_files:
            return jsonify({'message': 'Geçerli dosya bulunamadı'}), 400

        return jsonify({
            'message': f'{len(uploaded_files)} dosya başarıyla yüklendi',
            'files': uploaded_files
        }), 201
            
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@progress_bp.route('/<assignment_id>/files/<path:filename>', methods=['DELETE'])
def delete_file(assignment_id, filename):
    """Delete a specific file from progress"""
    try:
        data = request.get_json(silent=True) or {}
        user_id = data.get('userId')

        # Check permissions
        assignment = Assignment.find_by_id(assignment_id)
        if not assignment:
            return jsonify({'message': 'Görev bulunamadı'}), 404

        user = User.find_by_id(user_id) if user_id else None
        is_admin = user.get('is_admin', False) if user else False

        if not user_id or (str(user_id) not in assignment['members'] and not is_admin):
            return jsonify({'message': 'Yetki reddedildi'}), 403

        # Remove from DB
        removed = Progress.remove_file(assignment_id, filename)
        if not removed:
            return jsonify({'message': 'Dosya bulunamadı veya silinemedi'}), 404

        # Remove physical file
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(file_path):
            os.remove(file_path)

        return jsonify({'message': 'Dosya silindi'}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@progress_bp.route('/<assignment_id>/comments', methods=['GET'])
def get_comments(assignment_id):
    """Get all comments for a project"""
    try:
        comments = Comment.get_project_comments(assignment_id)
        return jsonify(comments), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@progress_bp.route('/<assignment_id>/comments', methods=['POST'])
def post_comment(assignment_id):
    """Post a new comment"""
    try:
        data = request.get_json()
        user_id = data.get('userId')
        message = data.get('message')
        
        if not user_id or not message:
            return jsonify({'message': 'Kullanıcı ID ve mesaj gerekli'}), 400
            
        user = User.find_by_id(user_id)
        if not user:
            return jsonify({'message': 'Kullanıcı bulunamadı'}), 404
            
        # Check if user is member or admin
        assignment = Assignment.find_by_id(assignment_id)
        if not assignment:
            return jsonify({'message': 'Görev bulunamadı'}), 404
            
        is_admin = user.get('is_admin', False)
        if str(user_id) not in [str(m) for m in assignment['members']] and not is_admin:
            return jsonify({'message': 'Sadece ekip üyeleri yorum yapabilir'}), 403
            
        comment_id = Comment.create(assignment_id, user_id, user['username'], message)
        
        return jsonify({
            'message': 'Yorum başarıyla eklendi',
            'commentId': comment_id
        }), 201
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@progress_bp.route('/comments/<comment_id>', methods=['DELETE'])
def delete_comment(comment_id):
    """Delete a project comment"""
    try:
        data = request.get_json(silent=True) or {}
        user_id = data.get('userId')
        
        if not user_id:
            return jsonify({'message': 'Kullanıcı ID gerekli'}), 400
            
        user = User.find_by_id(user_id)
        if not user:
            return jsonify({'message': 'Kullanıcı bulunamadı'}), 404
            
        is_admin = user.get('is_admin', False)
        
        removed = Comment.delete(comment_id, user_id, is_admin)
        if not removed:
            return jsonify({'message': 'Yorum bulunamadı veya silme yetkiniz yok'}), 403
            
        return jsonify({'message': 'Yorum silindi'}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500
