from datetime import datetime
from bson import ObjectId
from . import Database

class TimeLog:
    collection_name = 'time_logs'
    
    @classmethod
    def get_collection(cls):
        db = Database.get_db()
        return db[cls.collection_name]
    
    @staticmethod
    def start_session(assignment_id, user_id):
        """Start a new time tracking session"""
        collection = TimeLog.get_collection()
        
        # Check if there's already an active session for this user/assignment
        active_session = collection.find_one({
            "assignmentId": ObjectId(assignment_id),
            "userId": ObjectId(user_id),
            "endTime": None
        })
        
        if active_session:
            return str(active_session['_id'])
            
        log_data = {
            "assignmentId": ObjectId(assignment_id),
            "userId": ObjectId(user_id),
            "startTime": datetime.utcnow(),
            "endTime": None,
            "duration": 0 # in seconds
        }
        
        result = collection.insert_one(log_data)
        return str(result.inserted_id)
    
    @staticmethod
    def stop_session(assignment_id, user_id):
        """Stop the active time tracking session"""
        collection = TimeLog.get_collection()
        
        active_session = collection.find_one({
            "assignmentId": ObjectId(assignment_id),
            "userId": ObjectId(user_id),
            "endTime": None
        })
        
        if not active_session:
            return False
            
        end_time = datetime.utcnow()
        start_time = active_session['startTime']
        duration = (end_time - start_time).total_seconds()
        
        result = collection.update_one(
            {"_id": active_session['_id']},
            {
                "$set": {
                    "endTime": end_time,
                    "duration": duration
                }
            }
        )
        return result.modified_count > 0
    
    @staticmethod
    def get_total_time(assignment_id):
        """Get total duration for an assignment in seconds"""
        collection = TimeLog.get_collection()
        pipeline = [
            {"$match": {"assignmentId": ObjectId(assignment_id)}},
            {"$group": {"_id": "$assignmentId", "totalSeconds": {"$sum": "$duration"}}}
        ]
        result = list(collection.aggregate(pipeline))
        if result:
            return result[0]['totalSeconds']
        return 0

    @staticmethod
    def get_user_active_session(user_id):
        """Check if user has any active session"""
        collection = TimeLog.get_collection()
        session = collection.find_one({"userId": ObjectId(user_id), "endTime": None})
        if session:
            session['_id'] = str(session['_id'])
            session['assignmentId'] = str(session['assignmentId'])
            session['userId'] = str(session['userId'])
            return session
        return None
