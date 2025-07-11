import { io, Socket } from 'socket.io-client';

// TypeScript interfaces
interface AuthenticationData {
  userId: string;
  token?: string;
}

interface AuthenticationSuccessData {
  userId: string;
  onlineCount: number;
}

interface AuthenticationErrorData {
  message: string;
}

interface UserStatusChangeData {
  userId: string;
  isOnline: boolean;
  timestamp: Date;
}

interface OnlineUsersListData {
  users: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
    isOnline: boolean;
    lastSeen?: Date;
  }>;
  count: number;
}

interface TypingData {
  chatSessionId: string;
  userId: string;
  isTyping: boolean;
  timestamp: Date;
}

interface ChatNotificationData {
  type: string;
  chatSessionId: string;
  message: any;
  unreadCount: number;
}

interface ChatSocketAPI {
  authenticate: (userId: string, token?: string) => void;
  joinCompanyChat: (companyId: string) => void;
  leaveCompanyChat: (companyId: string) => void;
  joinChatSession: (chatSessionId: string) => void;
  leaveChatSession: (chatSessionId: string) => void;
  getOnlineUsers: () => void;
  startTyping: (chatSessionId: string, userId: string) => void;
  stopTyping: (chatSessionId: string, userId: string) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  isConnected: () => boolean;
  getSocketId: () => string | undefined;
}

// Connect to the server
const socket: Socket = io('http://localhost:4000', {
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true
});

// User status management
let currentUserId: string | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

// Connection events
socket.on('connect', () => {
    console.log('✅ Connected to server:', socket.id);
    
    // Authenticate user when connected
    if (currentUserId) {
        authenticateUser(currentUserId);
    }
});

socket.on('disconnect', (reason: string) => {
    console.log('❌ Disconnected from server:', reason);
    clearHeartbeat();
});

// Authentication
function authenticateUser(userId: string, token?: string): void {
    currentUserId = userId;
    socket.emit('authenticate', { userId, token } as AuthenticationData);
}

socket.on('authentication-success', (data: AuthenticationSuccessData) => {
    console.log('🔐 Authentication successful:', data);
    startHeartbeat();
});

socket.on('authentication-error', (error: AuthenticationErrorData) => {
    console.error('❌ Authentication failed:', error);
});

// User status events
socket.on('user-status-change', (data: UserStatusChangeData) => {
    console.log('👤 User status changed:', data);
    updateUserStatusInUI(data.userId, data.isOnline);
});

socket.on('online-users-list', (data: OnlineUsersListData) => {
    console.log('📋 Online users list received:', data);
    updateOnlineUsersList(data.users);
});

// Typing indicators
socket.on('user-typing', (data: TypingData) => {
    console.log('✏️ User typing:', data);
    showTypingIndicator(data.userId, data.chatSessionId, data.isTyping);
});

// Chat events (existing functionality)
socket.on('new-message', (message: any) => {
    console.log('💬 New message received:', message);
    addMessageToChat(message);
});

socket.on('chat-notification', (notification: ChatNotificationData) => {
    console.log('🔔 Chat notification:', notification);
    showChatNotification(notification);
});

// Heartbeat functionality
function startHeartbeat(): void {
    heartbeatInterval = setInterval(() => {
        socket.emit('ping', (response: string) => {
            console.log('💓 Heartbeat:', response);
        });
    }, 30000); // Every 30 seconds
}

function clearHeartbeat(): void {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

// Helper functions for UI updates (to be implemented in your React components)
function updateUserStatusInUI(userId: string, isOnline: boolean): void {
    // Update user status indicator in the UI
    const userElement = document.querySelector(`[data-user-id="${userId}"]`);
    if (userElement) {
        const statusIndicator = userElement.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
            statusIndicator.setAttribute('title', isOnline ? 'Online' : 'Offline');
        }
    }
}

function updateOnlineUsersList(users: OnlineUsersListData['users']): void {
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

function showTypingIndicator(userId: string, chatSessionId: string, isTyping: boolean): void {
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

function addMessageToChat(message: any): void {
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

function showChatNotification(notification: ChatNotificationData): void {
    // Show chat notification
    console.log('Chat notification:', notification);
    // Implement notification UI logic here
}

// Public API for use in React components
declare global {
    interface Window {
        chatSocket: ChatSocketAPI;
    }
}

window.chatSocket = {
    // Authentication
    authenticate: authenticateUser,
    
    // Room management
    joinCompanyChat: (companyId: string) => socket.emit('join-company-chat', companyId),
    leaveCompanyChat: (companyId: string) => socket.emit('leave-company-chat', companyId),
    joinChatSession: (chatSessionId: string) => socket.emit('join-chat-session', chatSessionId),
    leaveChatSession: (chatSessionId: string) => socket.emit('leave-chat-session', chatSessionId),
    
    // Status
    getOnlineUsers: () => socket.emit('get-online-users'),
    
    // Typing indicators
    startTyping: (chatSessionId: string, userId: string) => socket.emit('typing-start', { chatSessionId, userId }),
    stopTyping: (chatSessionId: string, userId: string) => socket.emit('typing-stop', { chatSessionId, userId }),
    
    // Event listeners
    on: (event: string, callback: (...args: any[]) => void) => socket.on(event, callback),
    off: (event: string, callback?: (...args: any[]) => void) => socket.off(event, callback),
    
    // Socket info
    isConnected: () => socket.connected,
    getSocketId: () => socket.id
};

export default socket;