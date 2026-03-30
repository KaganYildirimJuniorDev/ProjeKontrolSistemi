from pymongo import MongoClient
from config import Config

class Database:
    _client = None
    _db = None
    
    @classmethod
    def get_client(cls):
        if cls._client is None:
            cls._client = MongoClient(Config.MONGODB_URI)
        return cls._client
    
    @classmethod
    def get_db(cls):
        if cls._db is None:
            cls._db = cls.get_client()[Config.DATABASE_NAME]
        return cls._db
    
    @classmethod
    def close(cls):
        if cls._client is not None:
            cls._client.close()
            cls._client = None
            cls._db = None

# Import models
from .user import User
from .project import Project
from .assignment import Assignment
from .activity import Activity
from .notification import Notification
from .progress import Progress
from .comment import Comment

__all__ = ['Database', 'User', 'Project', 'Assignment', 'Activity', 'Notification', 'Progress', 'Comment']
