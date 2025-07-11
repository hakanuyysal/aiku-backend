import { io } from 'socket.io-client';

// Connect to the server
const socket = io('http://localhost:4000', {
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true
});

// User status management
let currentUserId = null;
let heartbeatInterval = null;

// Connection events
socket.on('connect', () => {
    console.log('✅ Connected to server:', socket.id);
    
    // Authenticate user when connected
    if (currentUserId) {
        authenticateUser(currentUserId);
    }
});

socket.on('disconnect', (reason) => {
    console.log('❌ Disconnected from server:', reason);
    clearHeartbeat();
});

// Authentication
function authenticateUser(userId, token = null) {
    currentUserId = userId;
    socket.emit('authenticate', { userId, token });
}

socket.on('authentication-success', (data) => {
    console.log('🔐 Authentication successful:', data);
    startHeartbeat();
});

socket.on('authentication-error', (error) => {
    console.error('❌ Authentication failed:', error);
});

// User status events
socket.on('user-status-change', (data) => {
    console.log('👤 User status changed:', data);
    updateUserStatusInUI(data.userId, data.isOnline);
});

socket.on('online-users-list', (data) => {
    console.log('📋 Online users list received:', data);
    updateOnlineUsersList(data.users);
});

// Typing indicators
socket.on('user-typing', (data) => {
    console.log('✏️ User typing:', data);
    showTypingIndicator(data.userId, data.chatSessionId, data.isTyping);
});

// Chat events (existing functionality)
socket.on('new-message', (message) => {
    console.log('💬 New message received:', message);
    addMessageToChat(message);
});

socket.on('chat-notification', (notification) => {
    console.log('🔔 Chat notification:', notification);
    showChatNotification(notification);
});

// Heartbeat functionality
function startHeartbeat() {
    heartbeatInterval = setInterval(() => {
        socket.emit('ping', (response) => {
            console.log('💓 Heartbeat:', response);
        });
    }, 30000); // Every 30 seconds
}

function clearHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

// Helper functions for UI updates (to be implemented in your React components)
function updateUserStatusInUI(userId, isOnline) {
    // Update user status indicator in the UI
    const userElement = document.querySelector(`[data-user-id="${userId}"]`);
    if (userElement) {
        const statusIndicator = userElement.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
            statusIndicator.title = isOnline ? 'Online' : 'Offline';
        }
    }
}

function updateOnlineUsersList(users) {
    // Update the online users list in the UI
    const onlineUsersList = document.querySelector('#online-users-list');
    if (onlineUsersList) {
        onlineUsersList.innerHTML = users.map(user => `
            <div class="online-user" data-user-id="${user._id}">
                <img src="${user.profilePhoto || '/default-avatar.png'}" alt="${user.firstName}" class="user-avatar">
                <span class="user-name">${user.firstName} ${user.lastName}</span>
                <span class="status-indicator online"></span>
            </div>
        `).join('');
    }
}

function showTypingIndicator(userId, chatSessionId, isTyping) {
    // Show/hide typing indicator in chat
    const chatContainer = document.querySelector(`[data-chat-session="${chatSessionId}"]`);
    if (chatContainer) {
        const typingIndicator = chatContainer.querySelector('.typing-indicator');
        if (isTyping) {
            if (!typingIndicator) {
                const indicator = document.createElement('div');
                indicator.className = 'typing-indicator';
                indicator.innerHTML = `<span>User is typing...</span>`;
                chatContainer.appendChild(indicator);
            }
        } else {
            if (typingIndicator) {
                typingIndicator.remove();
            }
        }
    }
}

function addMessageToChat(message) {
    // Add new message to chat interface
    const chatContainer = document.querySelector(`[data-chat-session="${message.chatSession}"]`);
    if (chatContainer) {
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="sender-name">${message.sender.companyName}</span>
                <span class="message-time">${new Date(message.createdAt).toLocaleTimeString()}</span>
            </div>
            <div class="message-content">${message.content}</div>
        `;
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

function showChatNotification(notification) {
    // Show chat notification
    console.log('Chat notification:', notification);
    // Implement notification UI logic here
}

// Public API for use in React components
window.chatSocket = {
    // Authentication
    authenticate: authenticateUser,
    
    // Room management
    joinCompanyChat: (companyId) => socket.emit('join-company-chat', companyId),
    leaveCompanyChat: (companyId) => socket.emit('leave-company-chat', companyId),
    joinChatSession: (chatSessionId) => socket.emit('join-chat-session', chatSessionId),
    leaveChatSession: (chatSessionId) => socket.emit('leave-chat-session', chatSessionId),
    
    // Status
    getOnlineUsers: () => socket.emit('get-online-users'),
    
    // Typing indicators
    startTyping: (chatSessionId, userId) => socket.emit('typing-start', { chatSessionId, userId }),
    stopTyping: (chatSessionId, userId) => socket.emit('typing-stop', { chatSessionId, userId }),
    
    // Event listeners
    on: (event, callback) => socket.on(event, callback),
    off: (event, callback) => socket.off(event, callback),
    
    // Socket info
    isConnected: () => socket.connected,
    getSocketId: () => socket.id
};

export default socket; 