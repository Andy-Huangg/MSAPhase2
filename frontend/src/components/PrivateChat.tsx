import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Menu,
  MenuItem,
} from "@mui/material";
import { Send, ArrowBack, MoreVert, Edit, Delete } from "@mui/icons-material";
import {
  usePrivateMessages,
  type PrivateMessage,
} from "../hooks/usePrivateMessages";

interface PrivateChatProps {
  buddy: {
    id: number;
    username: string;
    displayName: string;
  };
  onBack: () => void;
}

export default function PrivateChat({ buddy, onBack }: PrivateChatProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [editingMessage, setEditingMessage] = useState<{
    id: number;
    content: string;
  } | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<PrivateMessage | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
  } = usePrivateMessages(buddy.id);

  // Get current user ID from token
  const getCurrentUserId = () => {
    try {
      const token = localStorage.getItem("jwt");
      if (!token) return null;

      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.userId || payload.sub;
    } catch {
      return null;
    }
  };

  const currentUserId = parseInt(getCurrentUserId() || "0");

  // Auto-scroll to bottom when new messages arrive - optimized
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" }); // Changed to "auto" for better performance
  }, [messages.length]); // Only scroll when message count changes, not on content changes

  // Mark messages as read when they come into view (optimized)
  const unreadMessageIds = useMemo(() => {
    return messages
      .filter((msg) => !msg.isRead && msg.recipientId === currentUserId)
      .slice(-3) // Only last 3 unread messages
      .map((msg) => msg.id);
  }, [messages, currentUserId]); // Include messages since we filter the array

  useEffect(() => {
    if (unreadMessageIds.length === 0) return;

    // Debounce the marking to avoid excessive API calls
    const timeoutId = setTimeout(() => {
      unreadMessageIds.forEach((msgId) => markAsRead(msgId));
    }, 2000); // Increased delay to 2 seconds

    return () => clearTimeout(timeoutId);
  }, [unreadMessageIds, markAsRead]); // Include unreadMessageIds since we iterate over it

  const handleSendMessage = useCallback(async () => {
    if (inputMessage.trim()) {
      const result = await sendMessage(buddy.id, inputMessage.trim());
      if (result.success) {
        setInputMessage("");
      } else {
        // Handle error (could show a toast notification)
      }
    }
  }, [inputMessage, sendMessage, buddy.id]);

  // Optimize input handling with useCallback
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputMessage(e.target.value);
    },
    []
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  ); // Include handleSendMessage since we call it

  const handleMessageMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    message: PrivateMessage
  ) => {
    setMenuAnchor(event.currentTarget);
    setSelectedMessage(message);
  };

  const handleMessageMenuClose = () => {
    setMenuAnchor(null);
    setSelectedMessage(null);
  };

  const handleEditMessage = () => {
    if (selectedMessage) {
      setEditingMessage({
        id: selectedMessage.id,
        content: selectedMessage.content,
      });
      setIsEditDialogOpen(true);
    }
    handleMessageMenuClose();
  };

  const handleDeleteMessage = async () => {
    if (
      selectedMessage &&
      window.confirm("Are you sure you want to delete this message?")
    ) {
      const result = await deleteMessage(selectedMessage.id);
      if (!result.success) {
        // Delete failed, error already handled by the hook
      }
    }
    handleMessageMenuClose();
  };

  const handleSaveEdit = async () => {
    if (editingMessage) {
      const result = await editMessage(
        editingMessage.id,
        editingMessage.content
      );
      if (result.success) {
        setIsEditDialogOpen(false);
        setEditingMessage(null);
      } else {
        // Edit failed, error already handled by the hook
      }
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  return (
    <Box
      sx={{
        height: "100%",
        maxHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      {/* Header */}
      <Paper
        sx={{
          p: { xs: 1.5, md: 2 },
          display: "flex",
          alignItems: "center",
          gap: { xs: 1.5, md: 2 },
          flexShrink: 0,
          borderRadius: 0,
          boxShadow: "0 1px 0 rgba(0, 0, 0, 0.06)",
        }}
      >
        <IconButton onClick={onBack} size="small">
          <ArrowBack />
        </IconButton>
        <Avatar sx={{ width: { xs: 32, md: 40 }, height: { xs: 32, md: 40 } }}>
          {buddy.displayName.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h6"
            sx={{
              fontSize: { xs: "1rem", md: "1.25rem" },
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {buddy.displayName}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontSize: { xs: "0.7rem", md: "0.75rem" },
            }}
          >
            @{buddy.username}
          </Typography>
        </Box>
      </Paper>

      {/* Messages List */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          overflowX: "hidden",
          p: { xs: 0.5, md: 1 },
          minHeight: 0,
          "-webkit-overflow-scrolling": "touch",
        }}
      >
        {error && (
          <Typography color="error" sx={{ textAlign: "center", p: 2 }}>
            {error}
          </Typography>
        )}

        {isLoading && (
          <Typography sx={{ textAlign: "center", p: 2 }}>
            Loading messages...
          </Typography>
        )}

        <List sx={{ py: 0 }}>
          {messages.map((message) => {
            const isOwnMessage = message.senderId === currentUserId;

            return (
              <ListItem
                key={message.id}
                sx={{
                  display: "flex",
                  justifyContent: isOwnMessage ? "flex-end" : "flex-start",
                  px: { xs: 0.5, md: 1 },
                  py: 0.5,
                }}
              >
                <Paper
                  sx={{
                    p: { xs: 1, md: 1.5 },
                    maxWidth: { xs: "85%", md: "70%" },
                    backgroundColor: isOwnMessage ? "primary.main" : "grey.100",
                    color: isOwnMessage
                      ? "primary.contrastText"
                      : "text.primary",
                    position: "relative",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: { xs: 0.5, md: 1 },
                      flexDirection: {
                        xs: isOwnMessage ? "column" : "row",
                        sm: "row",
                      },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: { xs: "0.875rem", md: "1rem" },
                          wordBreak: "break-word",
                        }}
                      >
                        {message.content}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mt: 0.5,
                          flexWrap: "wrap",
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            opacity: 0.8,
                            fontSize: { xs: "0.65rem", md: "0.75rem" },
                          }}
                        >
                          {formatTimestamp(message.timestamp)}
                        </Typography>
                        {message.editedAt && (
                          <Chip
                            label="edited"
                            size="small"
                            sx={{
                              height: { xs: 14, md: 16 },
                              fontSize: { xs: "0.55rem", md: "0.6rem" },
                            }}
                          />
                        )}
                        {isOwnMessage && !message.isRead && (
                          <Chip
                            label="sent"
                            size="small"
                            sx={{
                              height: { xs: 14, md: 16 },
                              fontSize: { xs: "0.55rem", md: "0.6rem" },
                            }}
                          />
                        )}
                        {isOwnMessage && message.isRead && (
                          <Chip
                            label="read"
                            size="small"
                            sx={{
                              height: { xs: 14, md: 16 },
                              fontSize: { xs: "0.55rem", md: "0.6rem" },
                            }}
                          />
                        )}
                      </Box>
                    </Box>

                    {isOwnMessage && (
                      <IconButton
                        size="small"
                        onClick={(e) => handleMessageMenuOpen(e, message)}
                        sx={{
                          color: "inherit",
                          opacity: 0.7,
                          "&:hover": { opacity: 1 },
                          alignSelf: { xs: "flex-end", sm: "flex-start" },
                          mt: { xs: 0.5, sm: 0 },
                        }}
                      >
                        <MoreVert fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Paper>
              </ListItem>
            );
          })}
        </List>
        <div ref={messagesEndRef} />
      </Box>

      {/* Message Input */}
      <Paper
        sx={{
          p: { xs: 1.5, md: 2 },
          flexShrink: 0,
          borderRadius: 0,
          boxShadow: "0 -1px 0 rgba(0, 0, 0, 0.06)",
        }}
      >
        <Box sx={{ display: "flex", gap: { xs: 0.5, md: 1 } }}>
          <TextField
            fullWidth
            placeholder="Type a message..."
            value={inputMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            multiline
            maxRows={3}
            variant="outlined"
            size="small"
            InputProps={{
              autoComplete: "off",
              sx: { fontSize: { xs: "0.875rem", md: "1rem" } },
            }}
            sx={{
              "& .MuiInputBase-input": {
                resize: "none",
                minHeight: "20px",
              },
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={!inputMessage.trim()}
            sx={{
              alignSelf: "flex-end",
              mb: 0.25,
            }}
          >
            <Send />
          </IconButton>
        </Box>
      </Paper>

      {/* Message Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMessageMenuClose}
      >
        <MenuItem onClick={handleEditMessage}>
          <Edit sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDeleteMessage} sx={{ color: "error.main" }}>
          <Delete sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      {/* Edit Message Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Message</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={editingMessage?.content || ""}
            onChange={(e) =>
              setEditingMessage((prev) =>
                prev ? { ...prev, content: e.target.value } : null
              )
            }
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
