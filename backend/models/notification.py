from datetime import datetime
from bson import ObjectId
from . import Database

class Notification:
    collection_name = 'notifications'
    
    @classmethod
    def get_collection(cls):
        db = Database.get_db()
        return db[cls.collection_name]
    
    @staticmethod
    def create(user_id, assignment_id, notification_type, title, message):
        """Create a notification and send email"""
        from app import mail
        from flask_mail import Message
        from models.user import User
        
        collection = Notification.get_collection()
        
        notification_data = {
            "userId": ObjectId(user_id),
            "assignmentId": ObjectId(assignment_id) if assignment_id else None,
            "type": notification_type,
            "title": title,
            "message": message,
            "read": False,
            "createdAt": datetime.utcnow()
        }
        
        result = collection.insert_one(notification_data)
        
        # Send email notification
        try:
            from flask import current_app
            user = User.find_by_id(user_id)
            if user and user.get('email'):
                sender = current_app.config.get('MAIL_DEFAULT_SENDER')
                msg = Message(
                    title,
                    sender=sender,
                    recipients=[user['email']],
                    body=f"Merhaba {user['username']},\n\n{message}\n\nProje Takip Sistemi"
                )
                # Send asynchronously or handle error
                # For now, let's just attempt to send and catch errors
                mail.send(msg)
        except Exception as e:
            print(f"Mail sending failed: {str(e)}")
            
        return str(result.inserted_id)
    
    @staticmethod
    def get_user_notifications(user_id, unread_only=False):
        """Get notifications for a user"""
        collection = Notification.get_collection()
        try:
            query = {"userId": ObjectId(user_id)}
            if unread_only:
                query["read"] = False
            
            notifications = list(collection.find(query).sort("createdAt", -1).limit(20))
            
            for notif in notifications:
                notif['_id'] = str(notif['_id'])
                notif['userId'] = str(notif['userId'])
                if notif.get('assignmentId'):
                    notif['assignmentId'] = str(notif['assignmentId'])
                else:
                    notif['assignmentId'] = None
            
            return notifications
        except:
            return []
    
    @staticmethod
    def mark_as_read(notification_id):
        """Mark notification as read"""
        collection = Notification.get_collection()
        try:
            result = collection.update_one(
                {"_id": ObjectId(notification_id)},
                {"$set": {"read": True}}
            )
            return result.modified_count > 0
        except:
            return False
    
    @staticmethod
    def mark_all_as_read(user_id):
        """Mark all user notifications as read"""
        collection = Notification.get_collection()
        try:
            result = collection.update_many(
                {"userId": ObjectId(user_id), "read": False},
                {"$set": {"read": True}}
            )
            return result.modified_count > 0
        except:
            return False
    
    @staticmethod
    def get_unread_count(user_id):
        """Get unread notification count"""
        collection = Notification.get_collection()
        try:
            return collection.count_documents({"userId": ObjectId(user_id), "read": False})
        except:
            return 0
