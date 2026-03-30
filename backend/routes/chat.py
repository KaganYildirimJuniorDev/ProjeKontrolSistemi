from flask_socketio import emit, join_room, leave_room
from models.chat import ChatMessage
from datetime import datetime

def init_socket_events(socketio):
    @socketio.on('join')
    def on_join(data):
        room = data['assignmentId']
        join_room(room)
        # Load previous messages
        messages = ChatMessage.get_messages(room)
        emit('previous_messages', messages, room=room)
        print(f"User joined room: {room}")

    @socketio.on('leave')
    def on_leave(data):
        room = data['assignmentId']
        leave_room(room)
        print(f"User left room: {room}")

    @socketio.on('message')
    def handle_message(data):
        assignment_id = data['assignmentId']
        user_id = data['userId']
        username = data['username']
        message = data['message']
        
        # Save to database
        ChatMessage.create(assignment_id, user_id, username, message)
        
        # Broadcast to room
        emit('new_message', {
            'username': username,
            'message': message,
            'createdAt': datetime.utcnow().isoformat()
        }, room=assignment_id)
