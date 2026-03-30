from datetime import datetime
from bson import ObjectId
from . import Database

class Activity:
    collection_name = 'activities'
    
    @classmethod
    def get_collection(cls):
        db = Database.get_db()
        return db[cls.collection_name]
    
    @staticmethod
    def log(assignment_id, user_id, action, description=""):
        """Log an activity"""
        collection = Activity.get_collection()
        
        activity_data = {
            "assignmentId": ObjectId(assignment_id),
            "userId": ObjectId(user_id),
            "action": action,  # "project_taken", "member_added", "name_changed", "member_removed", "project_released"
            "description": description,
            "createdAt": datetime.utcnow()
        }
        
        result = collection.insert_one(activity_data)
        return str(result.inserted_id)
    
    @staticmethod
    def get_assignment_activity(assignment_id, limit=10):
        """Get activity log for an assignment"""
        collection = Activity.get_collection()
        try:
            activities = list(collection.find(
                {"assignmentId": ObjectId(assignment_id)}
            ).sort("createdAt", -1).limit(limit))
            
            for activity in activities:
                activity['_id'] = str(activity['_id'])
                activity['assignmentId'] = str(activity['assignmentId'])
                activity['userId'] = str(activity['userId'])
            
            return activities
        except:
            return []
    
    @staticmethod
    def get_recent_activities(limit=20):
        """Get recent activities from all assignments"""
        collection = Activity.get_collection()
        try:
            activities = list(collection.find().sort("createdAt", -1).limit(limit))
            
            for activity in activities:
                activity['_id'] = str(activity['_id'])
                activity['assignmentId'] = str(activity['assignmentId'])
                activity['userId'] = str(activity['userId'])
            
            return activities
        except:
            return []
