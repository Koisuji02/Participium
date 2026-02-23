import { Box, Typography, TextField, IconButton, Stack, Avatar, Paper } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import SendIcon from '@mui/icons-material/Send';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { useState, useEffect, useRef } from 'react';
import { getToken, getUserFromToken, getRoleFromToken } from '../../services/auth';
import { io, Socket } from 'socket.io-client';

interface InternalChatSectionProps {
  reportId: number;
}

interface Message {
  id: number;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

export function InternalChatSection({ reportId }: Readonly<InternalChatSectionProps>) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const sentMessageIdsRef = useRef<Set<number>>(new Set());

  // Get logged in user info
  const token = getToken();
  const currentUser = getUserFromToken(token);
  const currentRole = getRoleFromToken(token);
  const authorName = currentUser?.username || currentUser?.name || currentUser?.email || 'Unknown User';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Fetch messages from API
    const fetchMessages = async () => {
      try {
        const token = getToken();
        const response = await fetch(`http://localhost:5000/api/v1/reports/${reportId}/internal-messages`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched messages:', data);
          const formattedMessages = data.map((msg: any) => ({
            id: msg.id,
            authorName: msg.senderName,
            authorRole: msg.senderType,
            content: msg.message,
            createdAt: msg.createdAt
          }));
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };

    fetchMessages();

    // Initialize socket connection
    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    // Join report room
    socket.emit('join-report', reportId);

    // Listen for new messages
    socket.on('internal-message:new', (message: any) => {
      console.log('New message from socket:', message);
      
      // Ignore messages we just sent (they're already added via optimistic update)
      if (sentMessageIdsRef.current.has(message.id)) {
        console.log('Ignoring socket event for message we just sent:', message.id);
        sentMessageIdsRef.current.delete(message.id); // Clean up
        return;
      }
      
      const formattedMessage: Message = {
        id: message.id,
        authorName: message.senderName,
        authorRole: message.senderType,
        content: message.message,
        createdAt: message.createdAt
      };
      // Only add if not already in the list
      setMessages(prev => {
        const exists = prev.some(m => m.id === formattedMessage.id);
        return exists ? prev : [...prev, formattedMessage];
      });
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [reportId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    try {
      setLoading(true);
      const token = getToken();

      // Send message to API - receiver is automatically determined from report assignment
      const response = await fetch(`http://localhost:5000/api/v1/reports/${reportId}/internal-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: newMessage
        })
      });

      if (response.ok) {
        const savedMessage = await response.json();
        // Track this message ID to ignore the socket event
        sentMessageIdsRef.current.add(savedMessage.id);
        
        // Optimistic update: add message immediately to local state (with duplicate check)
        const formattedMessage: Message = {
          id: savedMessage.id,
          authorName: savedMessage.senderName,
          authorRole: savedMessage.senderType,
          content: savedMessage.message,
          createdAt: savedMessage.createdAt
        };
        setMessages(prev => {
          const exists = prev.some(m => m.id === formattedMessage.id);
          return exists ? prev : [...prev, formattedMessage];
        });
        setNewMessage('');
      } else {
        const errorText = await response.text();
        console.error('Failed to send message:', response.status, errorText);
        alert(`Failed to send message: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <Stack sx={{ height: '100%', px: 3, pt: 3, pb: 0 }}>
      {/* Header */}
      <Box sx={{ pb: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <LockIcon fontSize="small" color="warning" />
          <Typography variant="subtitle1" fontWeight={600}>
            Internal Communication
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Private conversation - not visible to citizens
        </Typography>
      </Box>

      {/* Messages Area */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 2, maxHeight: '50vh' }}>
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <Stack spacing={2}>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                formatTime={formatTime}
                currentUserRole={currentRole}
                currentUserName={authorName}
              />
            ))}
            <div ref={messagesEndRef} />
          </Stack>
        )}
      </Box>

      {/* Input Area */}
      <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Box display="flex" gap={1}>
          <TextField
            fullWidth
            size="small"
            multiline
            maxRows={3}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Write an internal note..."
            onKeyDown={handleKeyPress}
            disabled={loading}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!newMessage.trim() || loading}
          >
            <SendIcon />
          </IconButton>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Press Enter to send, Shift+Enter for new line
        </Typography>
      </Box>
    </Stack>
  );
}

function EmptyState() {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100%"
      color="text.secondary"
    >
      <ChatBubbleOutlineIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
      <Typography variant="body2" fontWeight={500}>No messages yet</Typography>
      <Typography variant="caption">
        Start the conversation with your team
      </Typography>
    </Box>
  );
}

interface MessageBubbleProps {
  message: Message;
  formatTime: (date: string) => string;
  currentUserRole: string | null;
  currentUserName: string;
}

function MessageBubble({ message, formatTime, currentUserRole, currentUserName }: Readonly<MessageBubbleProps>) {
  const getInitials = (name?: string) => {
    if (!name || typeof name !== "string") return "";

    return name
      .trim()
      .split(/\s+/)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };


  const getRoleColor = (role: string) => {
    if (role.includes('technical_office_staff')) return 'primary.main';
    if (role.includes('external_maintainer')) return 'secondary.main';
    return 'grey.500';
  };

  // Check if message is sent by current user
  const isSentByMe =
    (currentUserRole?.includes('technical_office_staff') && (message.authorRole.includes('technical_office_staff_OFFICE_STAFF') || message.authorRole.includes('technical_office_staff'))) ||
    (currentUserRole?.includes('maintainer') && message.authorRole.includes('external_maintainer')) ||
    (currentUserRole?.includes('external_maintainer') && message.authorRole.includes('external_maintainer'));

  // Use authorName which comes from backend (senderName)
  const displayName = isSentByMe ? currentUserName : message.authorName;

  return (
    <Box display="flex" gap={1.5} justifyContent={isSentByMe ? 'flex-end' : 'flex-start'}>
      {!isSentByMe && (
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: getRoleColor(message.authorRole),
            fontSize: '0.875rem'
          }}
        >
          {getInitials(displayName)}
        </Avatar>
      )}
      <Box sx={{ maxWidth: '70%' }}>
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          mb={0.5}
          justifyContent={isSentByMe ? 'flex-end' : 'flex-start'}
        >
          <Typography variant="subtitle2" fontSize="0.875rem">
            {displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatTime(message.createdAt)}
          </Typography>
        </Box>
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            bgcolor: isSentByMe ? 'primary.main' : 'grey.50',
            color: isSentByMe ? 'white' : 'text.primary',
            borderRadius: 2,
            borderColor: isSentByMe ? 'primary.main' : 'divider'
          }}
        >
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </Typography>
        </Paper>
      </Box>
      {isSentByMe && (
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: getRoleColor(message.authorRole),
            fontSize: '0.875rem'
          }}
        >
          {getInitials(displayName)}
        </Avatar>
      )}
    </Box>
  );
}
