import React, { useState, useEffect, useContext, createContext } from 'react';
import { io } from 'socket.io-client';

// Socket Context for managing socket connection
const SocketContext = createContext();

// Socket Provider Component
export const SocketProvider = ({ children, apiUrl = 'http://localhost:4000' }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const newSocket = io(apiUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Connected to server:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      setIsConnected(false);
    });

    // Authentication events
    newSocket.on('authentication-success', (data) => {
      console.log('🔐 Authentication successful:', data);
    });

    newSocket.on('authentication-error', (error) => {
      console.error('❌ Authentication failed:', error);
    });

    // User status events
    newSocket.on('user-status-change', (data) => {
      console.log('👤 User status changed:', data);
      setOnlineUsers(prev => {
        const updated = prev.filter(user => user._id !== data.userId);
        if (data.isOnline) {
          // Add user to online list (you might need to fetch user details)
          return [...updated, { _id: data.userId, isOnline: true }];
        }
        return updated;
      });
    });

    newSocket.on('online-users-list', (data) => {
      console.log('📋 Online users list received:', data);
      setOnlineUsers(data.users || []);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [apiUrl]);

  const authenticate = (userId, token = null) => {
    if (socket) {
      setCurrentUser({ id: userId });
      socket.emit('authenticate', { userId, token });
    }
  };

  const getOnlineUsers = () => {
    if (socket) {
      socket.emit('get-online-users');
    }
  };

  const joinChatSession = (chatSessionId) => {
    if (socket) {
      socket.emit('join-chat-session', chatSessionId);
    }
  };

  const leaveChatSession = (chatSessionId) => {
    if (socket) {
      socket.emit('leave-chat-session', chatSessionId);
    }
  };

  const startTyping = (chatSessionId, userId) => {
    if (socket) {
      socket.emit('typing-start', { chatSessionId, userId });
    }
  };

  const stopTyping = (chatSessionId, userId) => {
    if (socket) {
      socket.emit('typing-stop', { chatSessionId, userId });
    }
  };

  const value = {
    socket,
    isConnected,
    onlineUsers,
    currentUser,
    authenticate,
    getOnlineUsers,
    joinChatSession,
    leaveChatSession,
    startTyping,
    stopTyping
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Hook to use socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

// User Status Indicator Component
export const UserStatusIndicator = ({ userId, size = 'sm', showText = false }) => {
  const { onlineUsers } = useSocket();
  const [userStatus, setUserStatus] = useState({ isOnline: false, lastSeen: null });

  useEffect(() => {
    const user = onlineUsers.find(u => u._id === userId);
    if (user) {
      setUserStatus({ isOnline: user.isOnline, lastSeen: user.lastSeen });
    } else {
      // Fetch user status from API if not in online users list
      fetchUserStatus();
    }
  }, [userId, onlineUsers]);

  const fetchUserStatus = async () => {
    try {
      const response = await fetch(`/api/user-status/${userId}`);
      const data = await response.json();
      if (data.success) {
        setUserStatus({
          isOnline: data.data.isOnline,
          lastSeen: data.data.lastSeen
        });
      }
    } catch (error) {
      console.error('Error fetching user status:', error);
    }
  };

  const sizeClasses = {
    xs: 'w-2 h-2',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Never seen';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <div
          className={`${sizeClasses[size]} rounded-full ${
            userStatus.isOnline 
              ? 'bg-green-500' 
              : 'bg-gray-400'
          }`}
          title={userStatus.isOnline ? 'Online' : `Last seen: ${formatLastSeen(userStatus.lastSeen)}`}
        />
        {userStatus.isOnline && (
          <div className={`absolute -inset-1 ${sizeClasses[size]} rounded-full bg-green-500 animate-ping opacity-75`} />
        )}
      </div>
      {showText && (
        <span className={`text-sm ${userStatus.isOnline ? 'text-green-600' : 'text-gray-500'}`}>
          {userStatus.isOnline ? 'Online' : formatLastSeen(userStatus.lastSeen)}
        </span>
      )}
    </div>
  );
};

// Online Users List Component
export const OnlineUsersList = ({ className = '' }) => {
  const { onlineUsers, getOnlineUsers } = useSocket();

  useEffect(() => {
    getOnlineUsers();
  }, []);

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Online Users ({onlineUsers.length})
        </h3>
        <button
          onClick={getOnlineUsers}
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          title="Refresh"
        >
          🔄
        </button>
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {onlineUsers.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No users online</p>
        ) : (
          onlineUsers.map(user => (
            <div
              key={user._id}
              className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md transition-colors"
            >
              <img
                src={user.profilePhoto || '/default-avatar.png'}
                alt={user.firstName}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">
                  {user.firstName} {user.lastName}
                </p>
              </div>
              <UserStatusIndicator userId={user._id} size="sm" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Chat with typing indicators
export const ChatMessage = ({ message }) => {
  return (
    <div className="flex space-x-3 p-3">
      <img
        src={message.sender?.profilePhoto || '/default-avatar.png'}
        alt={message.sender?.firstName}
        className="w-8 h-8 rounded-full object-cover"
      />
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-sm font-medium text-gray-800">
            {message.sender?.firstName} {message.sender?.lastName}
          </span>
          <UserStatusIndicator userId={message.sender?._id} size="xs" />
          <span className="text-xs text-gray-500">
            {new Date(message.createdAt).toLocaleTimeString()}
          </span>
        </div>
        <p className="text-gray-700">{message.content}</p>
      </div>
    </div>
  );
};

// Typing Indicator Component
export const TypingIndicator = ({ chatSessionId }) => {
  const { socket } = useSocket();
  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => {
    if (!socket) return;

    const handleUserTyping = (data) => {
      if (data.chatSessionId === chatSessionId) {
        setTypingUsers(prev => {
          const filtered = prev.filter(userId => userId !== data.userId);
          return data.isTyping ? [...filtered, data.userId] : filtered;
        });
      }
    };

    socket.on('user-typing', handleUserTyping);

    return () => {
      socket.off('user-typing', handleUserTyping);
    };
  }, [socket, chatSessionId]);

  if (typingUsers.length === 0) return null;

  return (
    <div className="flex items-center space-x-2 p-3 text-sm text-gray-500">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
      </div>
      <span>
        {typingUsers.length === 1 ? 'Someone is' : `${typingUsers.length} people are`} typing...
      </span>
    </div>
  );
};

// Chat Input with typing detection
export const ChatInput = ({ chatSessionId, userId, onSendMessage, placeholder = "Type a message..." }) => {
  const { startTyping, stopTyping } = useSocket();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  let typingTimeout;

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      startTyping(chatSessionId, userId);
    }
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      setIsTyping(false);
      stopTyping(chatSessionId, userId);
    }, 1000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      setIsTyping(false);
      stopTyping(chatSessionId, userId);
      clearTimeout(typingTimeout);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex space-x-2 p-4 border-t">
      <input
        type="text"
        value={message}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={!message.trim()}
        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Send
      </button>
    </form>
  );
};

// Main Chat Component
export const ChatRoom = ({ chatSessionId, currentUserId, messages = [], onSendMessage }) => {
  const { joinChatSession, leaveChatSession } = useSocket();

  useEffect(() => {
    if (chatSessionId) {
      joinChatSession(chatSessionId);
      return () => leaveChatSession(chatSessionId);
    }
  }, [chatSessionId]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-md">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map(message => (
          <ChatMessage key={message._id} message={message} />
        ))}
        <TypingIndicator chatSessionId={chatSessionId} />
      </div>
      
      {/* Input */}
      <ChatInput
        chatSessionId={chatSessionId}
        userId={currentUserId}
        onSendMessage={onSendMessage}
      />
    </div>
  );
};

// Usage Example Component
export const ChatApp = () => {
  const [currentUser] = useState({ id: '12345', name: 'John Doe' }); // Get from your auth context
  const [messages, setMessages] = useState([]);

  const handleSendMessage = async (content) => {
    try {
      // Send message to your API
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatSessionId: 'your-chat-session-id',
          senderId: currentUser.id,
          content
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, data.data]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <SocketProvider>
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Online Users Sidebar */}
          <div className="lg:col-span-1">
            <OnlineUsersList />
          </div>
          
          {/* Chat Area */}
          <div className="lg:col-span-3 h-96">
            <ChatRoom
              chatSessionId="your-chat-session-id"
              currentUserId={currentUser.id}
              messages={messages}
              onSendMessage={handleSendMessage}
            />
          </div>
        </div>
      </div>
    </SocketProvider>
  );
};