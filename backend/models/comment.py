from datetime import datetime
from bson import ObjectId
from . import Database

class Comment:
    collection_name = 'comments'
    
    @classmethod
    def get_collection(cls):
        db = Database.get_db()
        return db[cls.collection_name]
    
    @staticmethod
    def create(assignment_id, user_id, username, message):
        """Create a new project comment"""
        collection = Comment.get_collection()
        
        comment_data = {
            "assignmentId": ObjectId(assignment_id),
            "userId": ObjectId(user_id),
            "username": username,
            "message": message,
            "createdAt": datetime.utcnow()
        }
        
        result = collection.insert_one(comment_data)
        return str(result.inserted_id)
    
    @staticmethod
    def get_project_comments(assignment_id):
        """Get all comments for a project"""
        collection = Comment.get_collection()
        try:
            comments = list(collection.find({"assignmentId": ObjectId(assignment_id)}).sort("createdAt", 1))
            
            for comment in comments:
                comment['_id'] = str(comment['_id'])
                comment['assignmentId'] = str(comment['assignmentId'])
                comment['userId'] = str(comment['userId'])
            
            return comments
        except Exception as e:
            print(f"Error fetching comments: {e}")
            return []
    
    @staticmethod
    def delete(comment_id, user_id, is_admin=False):
        """Delete a comment (by owner or admin)"""
        collection = Comment.get_collection()
        try:
            query = {"_id": ObjectId(comment_id)}
            if not is_admin:
                query["userId"] = ObjectId(user_id)
                
            result = collection.delete_one(query)
            return result.deleted_count > 0
        except:
            return False
