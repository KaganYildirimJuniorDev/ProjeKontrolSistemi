from datetime import datetime
from bson import ObjectId
from . import Database

class ChatMessage:
    collection_name = 'chat_messages'
    
    @classmethod
    def get_collection(cls):
        db = Database.get_db()
        return db[cls.collection_name]
    
    @staticmethod
    def create(assignment_id, user_id, username, message):
        """Create a new chat message"""
        collection = ChatMessage.get_collection()
        
        message_data = {
            "assignmentId": ObjectId(assignment_id),
            "userId": ObjectId(user_id),
            "username": username,
            "message": message,
            "createdAt": datetime.utcnow()
        }
        
        result = collection.insert_one(message_data)
        return str(result.inserted_id)
    
    @staticmethod
    def get_messages(assignment_id, limit=50):
        """Get recent messages for an assignment"""
        collection = ChatMessage.get_collection()
        try:
            messages = list(collection.find(
                {"assignmentId": ObjectId(assignment_id)}
            ).sort("createdAt", -1).limit(limit))
            
            # Reverse to get chronological order
            messages.reverse()
            
            for msg in messages:
                msg['_id'] = str(msg['_id'])
                msg['assignmentId'] = str(msg['assignmentId'])
                msg['userId'] = str(msg['userId'])
                msg['createdAt'] = msg['createdAt'].isoformat()
            return messages
        except:
            return []
