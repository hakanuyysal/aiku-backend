# Real-Time Online/Offline Status Tracking Implementation

This document provides a complete implementation guide for adding real-time user status tracking to your React chat application using Socket.IO.

## 🚀 Features Implemented

- ✅ Real-time online/offline status tracking
- ✅ User authentication with Socket.IO
- ✅ Heartbeat mechanism to detect disconnections
- ✅ Typing indicators in chat
- ✅ Online users list with live updates
- ✅ Status indicators with visual feedback
- ✅ Automatic cleanup of offline users
- ✅ Database persistence of user status
- ✅ RESTful API endpoints for status queries

## 📁 Files Created/Modified

### Backend Files:
1. **`src/models/User.ts`** - Added online status fields
2. **`src/services/userStatusService.ts`** - Core status tracking logic
3. **`src/controllers/userStatusController.ts`** - HTTP API endpoints
4. **`src/routes/userStatusRoutes.ts`** - Route definitions
5. **`src/app.ts`** - Updated Socket.IO handling

### Frontend Files:
6. **`src/client.js`** - Enhanced Socket.IO client
7. **`ReactComponents.jsx`** - React components for status tracking

## 🛠️ Installation & Setup

### 1. Dependencies

The required dependencies are already installed in your `package.json`:
- `socket.io@^4.8.1`
- `socket.io-client@^4.8.1`

For the React frontend, ensure you have:
```bash
npm install socket.io-client react
```

### 2. Database Schema Updates

The User model now includes these new fields:
```typescript
interface IUser {
  // ... existing fields
  isOnline?: boolean;           // Current online status
  lastSeen?: Date;             // Last activity timestamp
  socketIds?: string[];        // Array of active socket connections
}
```

### 3. Environment Variables

No additional environment variables required. The implementation uses your existing configuration.

## 🔧 Configuration Steps

### Backend Configuration

1. **Start the Server**
   ```bash
   npm run dev
   ```

2. **Verify Routes**
   The following API endpoints are now available:
   - `GET /api/user-status/online` - Get online users list
   - `GET /api/user-status/online/count` - Get online users count
   - `GET /api/user-status/:userId` - Get specific user status
   - `POST /api/user-status/batch` - Get multiple users status
   - `PUT /api/user-status/last-seen` - Update last seen (requires auth)

### Frontend Integration

1. **Import the Socket Provider**
   ```jsx
   import { SocketProvider, useSocket } from './ReactComponents';
   ```

2. **Wrap Your App**
   ```jsx
   function App() {
     return (
       <SocketProvider apiUrl="http://localhost:4000">
         <YourChatApp />
       </SocketProvider>
     );
   }
   ```

3. **Authenticate Users**
   ```jsx
   function YourChatApp() {
     const { authenticate } = useSocket();
     
     useEffect(() => {
       // Authenticate when user logs in
       const userId = getCurrentUserId(); // Your auth logic
       if (userId) {
         authenticate(userId);
       }
     }, []);
   }
   ```

## 📡 Socket.IO Events

### Client → Server Events:
- `authenticate` - Authenticate user and start status tracking
- `get-online-users` - Request current online users list
- `join-chat-session` - Join a chat room
- `leave-chat-session` - Leave a chat room
- `typing-start` - Start typing indicator
- `typing-stop` - Stop typing indicator
- `ping` - Heartbeat to maintain connection

### Server → Client Events:
- `authentication-success` - Authentication successful
- `authentication-error` - Authentication failed
- `user-status-change` - User went online/offline
- `online-users-list` - List of currently online users
- `user-typing` - Someone is typing in chat
- `new-message` - New chat message received

## 🎨 React Components Usage

### 1. User Status Indicator
```jsx
import { UserStatusIndicator } from './ReactComponents';

<UserStatusIndicator 
  userId="user123" 
  size="md" 
  showText={true} 
/>
```

### 2. Online Users List
```jsx
import { OnlineUsersList } from './ReactComponents';

<OnlineUsersList className="w-64" />
```

### 3. Chat Room with Status
```jsx
import { ChatRoom } from './ReactComponents';

<ChatRoom
  chatSessionId="session123"
  currentUserId="user123"
  messages={messages}
  onSendMessage={handleSendMessage}
/>
```

### 4. Complete Chat App
```jsx
import { ChatApp } from './ReactComponents';

// This includes everything: socket provider, online users, chat room
<ChatApp />
```

## 🔒 Security Considerations

### 1. Authentication
Currently, the implementation trusts the `userId` from the client. For production:

```typescript
// In app.ts - authenticate event handler
socket.on("authenticate", async (data: { userId: string, token: string }) => {
  try {
    // Validate JWT token
    const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    
    // Proceed with authentication
    await userStatusService.addUserSocket(userId, socket.id);
  } catch (error) {
    socket.emit("authentication-error", { message: "Invalid token" });
  }
});
```

### 2. Rate Limiting
Add rate limiting to Socket.IO events:

```typescript
// In userStatusService.ts
private lastHeartbeat: { [socketId: string]: number } = {};

// In ping handler
const now = Date.now();
const lastPing = this.lastHeartbeat[socket.id] || 0;
if (now - lastPing < 10000) { // Max 1 ping per 10 seconds
  return;
}
this.lastHeartbeat[socket.id] = now;
```

## 🚦 Testing the Implementation

### 1. Test Socket Connection
Open browser console and check for:
```
✅ Connected to server: [socket-id]
🔐 Authentication successful: { userId: "...", onlineCount: 1 }
```

### 2. Test Status Changes
- Open multiple browser tabs
- Authenticate different users
- Close tabs and verify offline status
- Check online users list updates

### 3. Test API Endpoints
```bash
# Get online users
curl http://localhost:4000/api/user-status/online

# Get specific user status
curl http://localhost:4000/api/user-status/[userId]

# Get online count
curl http://localhost:4000/api/user-status/online/count
```

## 🐛 Troubleshooting

### Common Issues:

1. **Socket Not Connecting**
   - Check CORS settings in `app.ts`
   - Verify server is running on correct port
   - Check browser console for connection errors

2. **Authentication Failing**
   - Ensure `userId` is valid MongoDB ObjectId
   - Check server logs for authentication errors
   - Verify user exists in database

3. **Status Not Updating**
   - Check if `userStatusService` is imported correctly
   - Verify database connection
   - Check for errors in user status service logs

4. **Memory Leaks**
   - The cleanup job runs every minute to remove stale data
   - Socket disconnections are properly handled
   - User mappings are cleaned up on disconnect

## 📊 Performance Considerations

### 1. Scaling
For larger applications:
- Use Redis for socket session storage
- Implement horizontal scaling with Socket.IO Redis adapter
- Add database indexes for status queries

### 2. Database Optimization
```javascript
// Add indexes for better performance
db.users.createIndex({ "isOnline": 1, "lastSeen": 1 });
db.users.createIndex({ "socketIds": 1 });
```

### 3. Real-time Updates Optimization
- Debounce status changes to reduce database writes
- Use in-memory cache for frequently accessed status data
- Implement pagination for online users list

## 🔄 Maintenance

### Regular Tasks:
1. Monitor socket connection counts
2. Check database for orphaned socket IDs
3. Review server logs for status tracking errors
4. Update cleanup job intervals based on usage patterns

### Database Cleanup:
```javascript
// Remove old socketIds (run periodically)
db.users.updateMany(
  { socketIds: { $exists: true, $ne: [] } },
  { $set: { socketIds: [], isOnline: false } }
);
```

## 📈 Monitoring

### Key Metrics to Track:
- Active socket connections
- Average session duration
- Authentication success rate
- Message delivery success rate
- Database query performance for status operations

## 🎯 Next Steps

### Potential Enhancements:
1. **Push Notifications** - Integrate with FCM/APNS for offline notifications
2. **Presence Status** - Add "away", "busy", "do not disturb" statuses
3. **Location Sharing** - Add optional location-based status
4. **Groups/Channels** - Extend status tracking to group chats
5. **Analytics** - Track user engagement and activity patterns

This implementation provides a solid foundation for real-time status tracking that can be extended based on your specific needs.