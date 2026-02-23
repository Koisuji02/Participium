import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Divider, Chip, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getUserIdFromToken } from '../services/auth';
import './MessagesPage.css';

interface Message {
  id: string;
  userId: number;
  reportId: number;
  reportTitle: string;
  from: string;
  message: string;
  timestamp: number;
  read: boolean;
}

interface ConversationGroup {
  reportId: number;
  reportTitle: string;
  messages: Message[];
  lastMessageTime: number;
}

const MessagesPage: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationGroup[]>([]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = () => {
    const token = localStorage.getItem('token');
    const userId = getUserIdFromToken(token);
    
    if (!userId) return;

    const messagesStr = localStorage.getItem('participium_messages');
    if (!messagesStr) return;

    try {
      const allMessages: Message[] = JSON.parse(messagesStr);
      const userMessages = allMessages.filter(m => m.userId === userId);
      
      // Group messages by reportId
      const grouped = new Map<number, ConversationGroup>();
      
      userMessages.forEach(msg => {
        if (!grouped.has(msg.reportId)) {
          grouped.set(msg.reportId, {
            reportId: msg.reportId,
            reportTitle: msg.reportTitle,
            messages: [],
            lastMessageTime: 0
          });
        }
        
        const group = grouped.get(msg.reportId)!;
        group.messages.push(msg);
        group.lastMessageTime = Math.max(group.lastMessageTime, msg.timestamp);
      });
      
      // Sort each conversation's messages by timestamp
      grouped.forEach(group => {
        group.messages.sort((a, b) => a.timestamp - b.timestamp);
      });
      
      // Convert to array and sort by most recent activity
      const conversationsArray = Array.from(grouped.values());
      conversationsArray.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
      
      setConversations(conversationsArray);
    } catch (e) {
      console.error('Error loading conversations:', e);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        Messages from Officers
      </Typography>

      {conversations.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            You have no messages yet.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {conversations.map((conversation) => (
            <Accordion key={conversation.reportId} elevation={2} defaultExpanded={conversations.length === 1}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ '&:hover': { backgroundColor: 'action.hover' } }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', mr: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Report #{conversation.reportId}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {conversation.reportTitle}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {conversation.messages.length} {conversation.messages.length === 1 ? 'message' : 'messages'}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List sx={{ width: '100%', p: 0 }}>
                  {conversation.messages.map((msg, index) => (
                    <React.Fragment key={msg.id}>
                      <ListItem
                        sx={{
                          py: 2,
                          px: 2,
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          backgroundColor: msg.from === 'officer' ? 'action.hover' : 'transparent',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Chip
                            label={msg.from === 'officer' ? 'Officer' : 'You'}
                            size="small"
                            color={msg.from === 'officer' ? 'primary' : 'default'}
                            sx={{ fontWeight: 600 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {formatTimestamp(msg.timestamp)}
                          </Typography>
                        </Box>
                        <ListItemText
                          primary={msg.message}
                          slotProps={{
                            primary: {
                              variant: 'body1',
                              sx: {
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                              },
                            },
                          }}
                        />
                      </ListItem>
                      {index < conversation.messages.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default MessagesPage;
