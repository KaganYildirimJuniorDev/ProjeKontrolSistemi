from datetime import datetime
from bson import ObjectId
from . import Database

class Project:
    collection_name = 'projects'
    
    @classmethod
    def get_collection(cls):
        db = Database.get_db()
        return db[cls.collection_name]
    
    @staticmethod
    def create(original_name, description=""):
        """Create a new project (Admin only)"""
        collection = Project.get_collection()
        
        project_data = {
            "originalName": original_name,
            "currentName": original_name,
            "description": description,
            "isTaken": False,
            "assignmentId": None,
            "createdAt": datetime.utcnow()
        }
        
        result = collection.insert_one(project_data)
        return str(result.inserted_id)
    
    @staticmethod
    def find_by_id(project_id):
        """Find project by ID"""
        collection = Project.get_collection()
        try:
            project = collection.find_one({"_id": ObjectId(project_id)})
            if project:
                project['_id'] = str(project['_id'])
                if project.get('assignmentId'):
                    project['assignmentId'] = str(project['assignmentId'])
            return project
        except:
            return None
    
    @staticmethod
    def get_all_projects():
        """Get all projects"""
        collection = Project.get_collection()
        projects = list(collection.find())
        for project in projects:
            project['_id'] = str(project['_id'])
            if project.get('assignmentId'):
                project['assignmentId'] = str(project['assignmentId'])
        return projects
    
    @staticmethod
    def get_available_projects():
        """Get all available (not taken) projects"""
        collection = Project.get_collection()
        projects = list(collection.find({"isTaken": False}))
        for project in projects:
            project['_id'] = str(project['_id'])
        return projects
    
    @staticmethod
    def update_name(project_id, new_name):
        """Update project current name"""
        collection = Project.get_collection()
        try:
            result = collection.update_one(
                {"_id": ObjectId(project_id)},
                {"$set": {"currentName": new_name}}
            )
            return result.modified_count > 0
        except:
            return False
    
    @staticmethod
    def assign_project(project_id, assignment_id):
        """Mark project as taken and assign assignment"""
        collection = Project.get_collection()
        try:
            result = collection.update_one(
                {"_id": ObjectId(project_id)},
                {"$set": {"isTaken": True, "assignmentId": ObjectId(assignment_id)}}
            )
            return result.modified_count > 0
        except:
            return False
    
    @staticmethod
    def unassign_project(project_id, original_name):
        """Mark project as available and reset name"""
        collection = Project.get_collection()
        try:
            result = collection.update_one(
                {"_id": ObjectId(project_id)},
                {"$set": {"isTaken": False, "assignmentId": None, "currentName": original_name}}
            )
            return result.modified_count > 0
        except:
            return False
    
    @staticmethod
    def delete(project_id):
        """Delete a project"""
        collection = Project.get_collection()
        try:
            result = collection.delete_one({"_id": ObjectId(project_id)})
            return result.deleted_count > 0
        except:
            return False
