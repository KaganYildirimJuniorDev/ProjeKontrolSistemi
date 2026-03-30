from datetime import datetime
from bson import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash
from . import Database

class User:
    collection_name = 'users'
    
    @classmethod
    def get_collection(cls):
        db = Database.get_db()
        return db[cls.collection_name]
    
    @staticmethod
    def create(username, email, password):
        """Create a new user"""
        collection = User.get_collection()
        
        # Check if user already exists
        if collection.find_one({"$or": [{"username": username}, {"email": email}]}):
            return None
        
        user_data = {
            "username": username,
            "email": email,
            "password": generate_password_hash(password),
            "is_admin": False,
            "createdAt": datetime.utcnow()
        }
        
        result = collection.insert_one(user_data)
        return str(result.inserted_id)
    
    @staticmethod
    def find_by_id(user_id):
        """Find user by ID"""
        collection = User.get_collection()
        try:
            return collection.find_one({"_id": ObjectId(user_id)})
        except:
            return None
    
    @staticmethod
    def find_by_username(username):
        """Find user by username"""
        collection = User.get_collection()
        return collection.find_one({"username": username})
    
    @staticmethod
    def find_by_email(email):
        """Find user by email"""
        collection = User.get_collection()
        return collection.find_one({"email": email})
    
    @staticmethod
    def verify_password(user, password):
        """Verify user password"""
        if user is None:
            return False
        return check_password_hash(user['password'], password)
    
    @staticmethod
    def get_all_users():
        """Get all users"""
        collection = User.get_collection()
        users = list(collection.find())
        for user in users:
            user['_id'] = str(user['_id'])
        return users
    
    @staticmethod
    def update_role(user_id, is_admin):
        """Update user role"""
        collection = User.get_collection()
        collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_admin": is_admin}}
        )
        return True
