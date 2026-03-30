from datetime import datetime
from bson import ObjectId
from . import Database

class Progress:
    collection_name = 'progress'
    
    @classmethod
    def get_collection(cls):
        db = Database.get_db()
        return db[cls.collection_name]
    
    @staticmethod
    def create(assignment_id, status="planning"):
        """Create progress record for assignment"""
        collection = Progress.get_collection()
        
        progress_data = {
            "assignmentId": ObjectId(assignment_id),
            "status": status,  # "planning", "in_progress", "testing", "completed"
            "progress": 0,  # 0-100
            "notes": "",
            "milestones": [],
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        result = collection.insert_one(progress_data)
        return str(result.inserted_id)
    
    @staticmethod
    def find_by_assignment(assignment_id):
        """Find progress by assignment ID"""
        collection = Progress.get_collection()
        try:
            progress = collection.find_one({"assignmentId": ObjectId(assignment_id)})
            if progress:
                progress['_id'] = str(progress['_id'])
                progress['assignmentId'] = str(progress['assignmentId'])
            return progress
        except:
            return None
    
    @staticmethod
    def update_progress(assignment_id, progress_percent, status=None, notes=None):
        """Update progress percentage and status"""
        collection = Progress.get_collection()
        try:
            update_data = {
                "updatedAt": datetime.utcnow()
            }
            
            if progress_percent is not None:
                update_data["progress"] = min(100, max(0, progress_percent))
            
            if status:
                update_data["status"] = status
            if notes:
                update_data["notes"] = notes
            
            result = collection.update_one(
                {"assignmentId": ObjectId(assignment_id)},
                {"$set": update_data}
            )
            return result.modified_count > 0
        except:
            return False
    
    @staticmethod
    def add_milestone(assignment_id, milestone_name, completed=False):
        """Add a milestone"""
        collection = Progress.get_collection()
        try:
            milestone = {
                "title": milestone_name,
                "completed": completed,
                "createdAt": datetime.utcnow()
            }
            
            result = collection.update_one(
                {"assignmentId": ObjectId(assignment_id)},
                {"$push": {"milestones": milestone}}
            )
            return result.modified_count > 0
        except:
            return False
    
    @staticmethod
    def update_milestone(assignment_id, milestone_index, completed):
        """Update milestone completion status"""
        collection = Progress.get_collection()
        try:
            result = collection.update_one(
                {"assignmentId": ObjectId(assignment_id)},
                {"$set": {f"milestones.{milestone_index}.completed": completed}}
            )
            return result.modified_count > 0
        except:
            return False
    
    @staticmethod
    def add_file(assignment_id, file_data):
        """Add file metadata to progress"""
        collection = Progress.get_collection()
        try:
            file_record = {
                **file_data,
                "uploadedAt": datetime.utcnow()
            }
            
            result = collection.update_one(
                {"assignmentId": ObjectId(assignment_id)},
                {"$push": {"files": file_record}}
            )
            return result.modified_count > 0
        except:
            return False

    @staticmethod
    def remove_file(assignment_id, filename):
        """Remove a file from progress by filename"""
        collection = Progress.get_collection()
        try:
            result = collection.update_one(
                {"assignmentId": ObjectId(assignment_id)},
                {"$pull": {"files": {"filename": filename}}}
            )
            return result.modified_count > 0
        except:
            return False

    @staticmethod
    def delete(assignment_id):
        """Delete progress record"""
        collection = Progress.get_collection()
        try:
            result = collection.delete_one({"assignmentId": ObjectId(assignment_id)})
            return result.deleted_count > 0
        except:
            return False
