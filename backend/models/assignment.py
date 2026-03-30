from datetime import datetime
from bson import ObjectId
from . import Database

class Assignment:
    collection_name = 'assignments'
    
    @classmethod
    def get_collection(cls):
        db = Database.get_db()
        return db[cls.collection_name]
    
    @staticmethod
    def create(project_id, creator_id):
        """Create a new assignment"""
        collection = Assignment.get_collection()
        
        assignment_data = {
            "projectId": ObjectId(project_id),
            "createdBy": ObjectId(creator_id),
            "members": [ObjectId(creator_id)],
            "createdAt": datetime.utcnow()
        }
        
        result = collection.insert_one(assignment_data)
        return str(result.inserted_id)
    
    @staticmethod
    def find_by_id(assignment_id):
        """Find assignment by ID"""
        collection = Assignment.get_collection()
        try:
            assignment = collection.find_one({"_id": ObjectId(assignment_id)})
            if assignment:
                assignment['_id'] = str(assignment['_id'])
                assignment['projectId'] = str(assignment['projectId'])
                assignment['createdBy'] = str(assignment['createdBy'])
                assignment['members'] = [str(m) for m in assignment['members']]
            return assignment
        except:
            return None
    
    @staticmethod
    def find_by_project_id(project_id):
        """Find assignment by project ID"""
        collection = Assignment.get_collection()
        try:
            assignment = collection.find_one({"projectId": ObjectId(project_id)})
            if assignment:
                assignment['_id'] = str(assignment['_id'])
                assignment['projectId'] = str(assignment['projectId'])
                assignment['createdBy'] = str(assignment['createdBy'])
                assignment['members'] = [str(m) for m in assignment['members']]
            return assignment
        except:
            return None
    
    @staticmethod
    def get_user_assignments(user_id):
        """Get all assignments for a user"""
        collection = Assignment.get_collection()
        try:
            assignments = list(collection.find({"members": ObjectId(user_id)}))
            for assignment in assignments:
                assignment['_id'] = str(assignment['_id'])
                assignment['projectId'] = str(assignment['projectId'])
                assignment['createdBy'] = str(assignment['createdBy'])
                assignment['members'] = [str(m) for m in assignment['members']]
            return assignments
        except:
            return []
    
    @staticmethod
    def add_member(assignment_id, user_id):
        """Add member to assignment"""
        collection = Assignment.get_collection()
        try:
            result = collection.update_one(
                {"_id": ObjectId(assignment_id)},
                {"$push": {"members": ObjectId(user_id)}}
            )
            return result.modified_count > 0
        except:
            return False
    
    @staticmethod
    def remove_member(assignment_id, user_id):
        """Remove member from assignment"""
        collection = Assignment.get_collection()
        try:
            result = collection.update_one(
                {"_id": ObjectId(assignment_id)},
                {"$pull": {"members": ObjectId(user_id)}}
            )
            return result.modified_count > 0
        except:
            return False
    
    @staticmethod
    def delete(assignment_id):
        """Delete an assignment"""
        collection = Assignment.get_collection()
        try:
            result = collection.delete_one({"_id": ObjectId(assignment_id)})
            return result.deleted_count > 0
        except:
            return False
    
    @staticmethod
    def is_creator(assignment_id, user_id):
        """Check if user is creator of assignment"""
        collection = Assignment.get_collection()
        try:
            assignment = collection.find_one({"_id": ObjectId(assignment_id)})
            if assignment:
                return str(assignment['createdBy']) == str(user_id)
            return False
        except:
            return False
