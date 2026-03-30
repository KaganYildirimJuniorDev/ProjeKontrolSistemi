from flask import request, jsonify
from . import auth_bp
from models import User
import jwt
from datetime import datetime, timedelta
from config import Config

@auth_bp.route('/register', methods=['POST'])
def register():
    """User registration"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Gerekli alanlar eksik'}), 400
    
    user_id = User.create(data['username'], data['email'], data['password'])
    
    if not user_id:
        return jsonify({'message': 'Bu kullanıcı adı veya e-posta zaten kullanımda'}), 409
    
    return jsonify({
        'message': 'Kullanıcı başarıyla oluşturuldu',
        'userId': user_id
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    """User login"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Gerekli alanlar eksik'}), 400
    
    user = User.find_by_username(data['username'])
    
    if not user or not User.verify_password(user, data['password']):
        return jsonify({'message': 'Geçersiz kullanıcı adı veya şifre'}), 401
    
    # Create JWT token
    token = jwt.encode(
        {
            'userId': str(user['_id']),
            'username': user['username'],
            'is_admin': user.get('is_admin', False),
            'exp': datetime.utcnow() + timedelta(days=7)
        },
        Config.SECRET_KEY,
        algorithm='HS256'
    )
    
    return jsonify({
        'message': 'Giriş başarılı',
        'token': token,
        'userId': str(user['_id']),
        'username': user['username'],
        'is_admin': user.get('is_admin', False)
    }), 200

@auth_bp.route('/verify-token', methods=['POST'])
def verify_token():
    """Verify JWT token"""
    token = request.headers.get('Authorization')
    
    if not token:
        return jsonify({'message': 'Token eksik'}), 401
    
    try:
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]
        
        payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
        return jsonify({
            'valid': True,
            'userId': payload['userId'],
            'username': payload['username'],
            'is_admin': payload.get('is_admin', False)
        }), 200
    except:
        return jsonify({'message': 'Geçersiz token'}), 401

@auth_bp.route('/users', methods=['GET'])
def get_all_users():
    """Get all users - for team member selection"""
    users = User.get_all_users()
    return jsonify(users), 200
