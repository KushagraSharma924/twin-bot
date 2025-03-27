"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Sidebar from "@/components/sidebar"
import { getUser, logout, saveConversationMessage, getConversationHistory, checkDatabaseSchema } from "@/lib/api"
import { sendMessage, createAICalendarEvent, createSimpleCalendarEvent, createNLPCalendarEvent } from "@/lib/ai-api"
import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  Send,
  PanelLeft,
  Plus,
  Trash,
  MessageSquare,
  MoreVertical,
  X,
  User,
  Settings,
  LogOut,
  Calendar
} from "lucide-react"

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
  isTyping?: boolean
  typingContent?: string
  error?: string
  calendarEvent?: {
    name: string;
    date: string;
    time: string;
    link?: string;
  };
}

interface ChatHistory {
  id: string
  title: string
  lastMessage: string
  timestamp: Date
  messages: Message[]
  isDeleting?: boolean
}

export default function TwinBotChatPage() {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(true)
  const [mobileView, setMobileView] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null)
  const [activeChatId, setActiveChatId] = useState<string>("default_chat")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome_initial",
      content: "Hello! I'm your TwinBot assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ])
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([
    {
      id: "default_chat",
      title: "Getting Started",
      lastMessage: "Hello! I'm your TwinBot assistant.",
      timestamp: new Date(),
      messages: [
        {
          id: "welcome_initial",
          content: "Hello! I'm your TwinBot assistant. How can I help you today?",
          isUser: false,
          timestamp: new Date(),
        },
      ]
    }
  ])
  const [showSchemaBanner, setShowSchemaBanner] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)

  const [error, setError] = useState<string | null>(null);
  
  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Check screen size and set mobile view
  useEffect(() => {
    const checkMobileView = () => {
      const isMobile = window.innerWidth < 768
      setMobileView(isMobile)
      
      // Only auto-collapse chat history on mobile
      if (isMobile) {
        setIsChatHistoryOpen(false)
      }
    }
    
    // Initial check
    checkMobileView()
    
    // Add resize listener
    window.addEventListener('resize', checkMobileView)
    
    // Clean up
    return () => {
      window.removeEventListener('resize', checkMobileView)
    }
  }, [])

  // Load user and chat history from Supabase
  useEffect(() => {
    // Get the current user
    const currentUser = getUser()
    if (currentUser) {
      setUser(currentUser)
      
      // Check database schema
      checkDatabaseSchema().then(result => {
        if (!result.isValid) {
          console.warn('Database schema issues detected:', result.missing);
          setShowSchemaBanner(true);
        }
      }).catch(error => {
        console.error('Error checking database schema:', error);
      });
      
      // Check if this is a new login session
      const lastSessionTime = localStorage.getItem('last_session_time')
      const currentTime = Date.now()
      const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
      
      if (!lastSessionTime || (currentTime - parseInt(lastSessionTime)) > SESSION_TIMEOUT) {
        // If it's a new session, create a new chat after loading history
        fetchConversationHistory().then(() => {
          createNewChat()
        })
      } else {
        // Otherwise, just load existing conversations
        fetchConversationHistory()
      }
      
      // Update the session time
      localStorage.setItem('last_session_time', currentTime.toString())
    } else {
      // If no user, just use default welcome message
      console.log('No user found, using default welcome message')
    }

    return () => {
      // Clean up any active typing timeouts on unmount
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  // Add a reference for the scroll area
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Custom scroll behavior that prevents initial automatic scrolling
  useEffect(() => {
    // Only scroll to bottom on new messages, not on initial load
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // Check if id exists and is a string before calling startsWith
      if (lastMessage && typeof lastMessage.id === 'string' && lastMessage.id.startsWith('typing_')) {
        scrollToBottom();
      }
    }
  }, [messages])

  // Scroll to bottom function that uses the ScrollArea ref
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  // Fetch conversation history from Supabase
  const fetchConversationHistory = async (limit = 100, offset = 0) => {
    // Show loading state
    setIsLoading(true)
    
    try {
      // Fetch conversation history from the server
      const result = await getConversationHistory(limit, offset)
      
      if (result.success && result.history && result.history.length > 0) {
        console.log(`Successfully loaded conversation history: ${result.count} messages`)
        
        // Group messages by conversation_id or timestamp if conversation_id is not available
        const conversationsMap = new Map<string, Message[]>()
        
        // Process messages and convert to our Message interface
        result.history.forEach(msg => {
          try {
            // Use conversation_id if available, otherwise use timestamp to group messages
            // This is a temporary workaround until the conversation_id column is added
            const conversationId = 
              (msg.conversation_id) || 
              (msg.metadata && msg.metadata.conversationId) || 
              `conv_${new Date(msg.timestamp).getTime()}`;
            
            if (!conversationsMap.has(conversationId)) {
              conversationsMap.set(conversationId, [])
            }
            
            // Convert database message to our Message interface
            const formattedMessage: Message = {
              id: typeof msg.id === 'string' ? msg.id : `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              content: msg.message,
              isUser: msg.source === 'user',
              timestamp: new Date(msg.timestamp),
              // If there's calendar event data in metadata, add it
              calendarEvent: msg.metadata?.calendarEvent || undefined
            }
            
            conversationsMap.get(conversationId)?.push(formattedMessage)
          } catch (msgError) {
            console.error('Error processing message:', msgError, msg);
            // Skip this message but continue processing others
          }
        })
        
        // Convert to our ChatHistory format
        const newChatHistory: ChatHistory[] = []
        
        conversationsMap.forEach((messages, convId) => {
          // Skip empty conversations or ones with just a welcome message
          if (messages.length <= 1 && !messages.some(m => m.isUser)) {
            return
          }
          
          try {
            // Sort messages by timestamp
            messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
            
            // Get the last message for preview
            const lastMessage = messages[messages.length - 1]
            
            // Generate a title from the first user message or use a default
            const firstUserMessage = messages.find(m => m.isUser)
            const title = firstUserMessage 
              ? firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '')
              : 'Conversation ' + convId
              
            newChatHistory.push({
              id: convId,
              title,
              lastMessage: lastMessage.content.substring(0, 40) + (lastMessage.content.length > 40 ? '...' : ''),
              timestamp: lastMessage.timestamp,
              messages
            })
          } catch (convError) {
            console.error('Error processing conversation:', convError, convId);
            // Skip this conversation but continue with others
          }
        })
        
        // Sort conversations by most recent message
        newChatHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        
        if (newChatHistory.length > 0) {
          // Update state with loaded conversations
          setChatHistory(newChatHistory)
          
          // Set active chat to the most recent one but don't immediately scroll to bottom
          setActiveChatId(newChatHistory[0].id)
          setMessages(newChatHistory[0].messages)
          
          // Also save to localStorage as backup
          localStorage.setItem('twinbot_chat_history', JSON.stringify(newChatHistory))
        } else {
          // If no valid conversations were found, load the default welcome message
          console.log('No valid conversations found, using default welcome message')
          createNewChat()
        }
        
        // Check if we need to load more messages (if the result count is equal to our limit)
        if (result.count === limit) {
          console.log(`Retrieved maximum messages (${limit}), there may be more history available`)
          // You could implement "load more" functionality here
        }
      } else {
        // If error is related to missing conversation_id column
        if (result.error && 
            (result.error.includes('conversation_id') || 
             result.error.includes('column') || 
             result.error.includes('schema'))) {
          console.warn('Database schema issue detected. You may need to run the SQL migration.');
          // Set the banner state to true
          setShowSchemaBanner(true);
          // Create a new chat to ensure the app is still functional
          createNewChat();
        } else if (result.error) {
          console.error('Error fetching conversation history:', result.error)
        } else {
          console.log('No conversation history found')
          createNewChat()
        }
      }
    } catch (error) {
      console.error('Error fetching conversation history:', error)
      // Create a new chat to ensure the app is still functional
      createNewChat()
    } finally {
      setIsLoading(false)
    }
    
    // Return a promise for chaining
    return Promise.resolve()
  }

  // Simulate typing effect
  const simulateTyping = (fullResponse: string, messageId: string) => {
    let currentIndex = 0;
    const typingInterval = 0.3; // Speed of typing (3x faster)
    const charsPerUpdate = 3; // Type multiple characters at once for faster display
    
    const typeNextChar = () => {
      if (currentIndex <= fullResponse.length) {
        setMessages(prevMessages => {
          return prevMessages.map(msg => {
            if (msg.id === messageId) {
              return {
                ...msg,
                isTyping: currentIndex < fullResponse.length,
                typingContent: fullResponse.substring(0, currentIndex)
              };
            }
            return msg;
          });
        });
        
        currentIndex += charsPerUpdate; // Increment by multiple characters
        
        if (currentIndex <= fullResponse.length) {
          typingTimeoutRef.current = setTimeout(typeNextChar, typingInterval);
        } else {
          // Typing complete, update with final content
          setMessages(prevMessages => {
            return prevMessages.map(msg => {
              if (msg.id === messageId) {
                return {
                  ...msg,
                  content: fullResponse,
                  isTyping: false,
                  typingContent: undefined
                };
              }
              return msg;
            });
          });
        }
      }
    };
    
    typeNextChar();
  };

  // Helper function to detect calendar event requests
  const checkIfCalendarEventRequest = (message: string): boolean => {
    const lowerMessage = message.toLowerCase().trim();
    
    // More specific patterns for calendar events with dates
    // First check for explicit calendar creation phrases
    const explicitPatterns = [
      /create\s+(?:a\s+)?(?:new\s+)?(?:calendar\s+)?event/i,
      /add\s+(?:a\s+)?(?:new\s+)?(?:calendar\s+)?event/i,
      /schedule\s+(?:a\s+)?(?:new\s+)?(?:meeting|appointment|call)/i,
      /set\s+up\s+(?:a\s+)?(?:meeting|appointment|call)/i,
      /plan\s+(?:a\s+)?(?:meeting|event|appointment)/i,
      /put\s+(?:this\s+)?(?:on|in)\s+(?:my\s+)?calendar/i,
      /add\s+to\s+(?:my\s+)?calendar/i,
      /book\s+(?:a\s+)?(?:meeting|appointment|room)/i,
    ];
    
    for (const pattern of explicitPatterns) {
      if (pattern.test(lowerMessage)) {
        console.log('Detected calendar event request (explicit pattern):', lowerMessage);
        return true;
      }
    }
    
    // Check for date/time patterns combined with event-related words
    const hasEventWord = [
      'meeting', 'appointment', 'call', 'conference', 
      'session', 'event', 'reminder', 'schedule'
    ].some(word => lowerMessage.includes(word));
    
    if (!hasEventWord) {
      return false;
    }
    
    // Check for date patterns
    const datePatterns = [
      // Month/day patterns
      /(?:on|for|next|this)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /(?:on|for)\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}/i,
      /(?:on|for)\s+\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/i, // MM/DD or MM/DD/YYYY
      /(?:on|for)\s+\d{4}-\d{1,2}-\d{1,2}/i, // YYYY-MM-DD
      /tomorrow|next week|next month/i,
      
      // Time patterns
      /at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i,
      /\d{1,2}(?::\d{2})?\s*(?:am|pm)/i,
      /\d{1,2}\s+o'clock/i
    ];
    
    for (const pattern of datePatterns) {
      if (pattern.test(lowerMessage)) {
        console.log('Detected calendar event request (date pattern):', lowerMessage);
        return true;
      }
    }
    
    // If we get here, it doesn't look like a calendar event request
    return false;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inputValue.trim() || isLoading) return
    
    // Disable input while processing
    setIsLoading(true)
    
    // Generate a unique ID for the message
    const userMessageId = `user_${Date.now().toString()}`
    
    // Get the current active chat
    const activeChat = chatHistory.find(chat => chat.id === activeChatId)
    
    // Generate a conversation ID if needed
    let currentConversationId = activeChatId
    if (!activeChat || activeChat.id === "default_chat") {
      // Generate a new conversation ID if this is the default chat
      currentConversationId = `conv_${Date.now()}`
      setActiveChatId(currentConversationId)
    }
    
    // Prepare user message
    const userMessage: Message = {
      id: userMessageId,
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    }
    
    // Add user message to UI
    setMessages(prev => [...prev, userMessage])
    
    // Clear input
    setInputValue("")
    
    try {
      // Save user message to Supabase
      const saveResult = await saveConversationMessage(
        userMessage.content,
        'user',
        {
          conversationId: currentConversationId,
          timestamp: userMessage.timestamp.toISOString(),
        }
      )
      
      if (!saveResult.success) {
        console.error('Failed to save user message to database:', saveResult.error)
        
        // Check if this is a schema-related error
        if (saveResult.error && 
            (saveResult.error.includes('conversation_id') || 
             saveResult.error.includes('column') || 
             saveResult.error.includes('schema'))) {
          console.warn('Database schema issue detected. You may need to run the SQL migration.');
          // Set the banner state to true
          setShowSchemaBanner(true);
          // Continue with the conversation in memory only - don't block the user
        }
      }
      
      // Check if it's a calendar event request
      const isCalendarRequest = checkIfCalendarEventRequest(inputValue)
      
      // Generate AI response
      let aiResponseText: string
      
      if (isCalendarRequest) {
        try {
          // Use special calendar event creation logic
          const eventDetails = await createNLPCalendarEvent(inputValue, user?.id || 'anonymous')
          
          if (eventDetails && eventDetails.event) {
            // Extract event information from the response
            const eventName = eventDetails.eventDetails?.eventName || eventDetails.event.summary
            const eventDate = eventDetails.eventDetails?.eventDate || new Date(eventDetails.event.start.dateTime).toLocaleDateString()
            const eventTime = eventDetails.eventDetails?.eventTime || new Date(eventDetails.event.start.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            
            aiResponseText = eventDetails.message || 
              `✅ I've created a calendar event:\n\n**${eventName}**\nDate: ${eventDate}\nTime: ${eventTime}\n\n${eventDetails.event.htmlLink ? `[View in Calendar](${eventDetails.event.htmlLink})` : ''}`
          } else {
            aiResponseText = eventDetails?.message || 
              `I couldn't create the calendar event automatically. Please try again with more details about the date, time, and event name.`
          }
        } catch (calendarError) {
          console.error('Calendar event creation error:', calendarError)
          aiResponseText = calendarError instanceof Error ? 
            `I had trouble creating your calendar event: ${calendarError.message}` : 
            "I had trouble creating your calendar event. Could you please provide more details about when you'd like to schedule it?"
        }
      } else {
        try {
          // Standard AI response
          const response = await sendMessage(inputValue, user?.id || 'anonymous')
          
          // Handle different response formats
          if (typeof response === 'string') {
            aiResponseText = response
          } else if (response && typeof response === 'object') {
            // Try to extract the response property
            const responseObj = response as any
            if (responseObj.response) {
              aiResponseText = responseObj.response
            } else if (responseObj.message) {
              aiResponseText = responseObj.message
            } else {
              aiResponseText = String(response)
            }
          } else {
            aiResponseText = String(response)
          }
        } catch (aiError) {
          console.error('AI response error:', aiError)
          aiResponseText = aiError instanceof Error ? 
            `I'm having trouble connecting to my brain right now: ${aiError.message}` : 
            "I'm having trouble connecting to my brain right now. Could you try again in a moment?"
        }
      }
      
      // Generate AI message object
      const aiMessage: Message = {
        id: `ai_${Date.now().toString()}`,
        content: aiResponseText,
        isUser: false,
        timestamp: new Date(),
      }
      
      // Check if the response contains calendar event information
      if (isCalendarRequest) {
        try {
          // For calendar event requests, try to extract from the response
          const eventDetails = extractEventFromAIResponse(aiResponseText)
          if (eventDetails) {
            aiMessage.calendarEvent = {
              name: eventDetails.title,
              date: eventDetails.date,
              time: eventDetails.time
            }
          }
        } catch (error) {
          console.error('Error extracting calendar event details:', error)
        }
      }
      
      // Add AI response with typing effect
      const typingMessageId = `typing_${Date.now().toString()}`
      setMessages(prev => [...prev, {
        id: typingMessageId,
        content: '',
        isUser: false,
        timestamp: new Date(),
        isTyping: true,
        typingContent: ''
      }])
      
      // Start typing effect
      simulateTyping(aiResponseText, typingMessageId)
      
      // Save AI message to Supabase with proper metadata
      const aiSaveResult = await saveConversationMessage(
        aiResponseText,
        'assistant',
        {
          conversationId: currentConversationId,
          timestamp: aiMessage.timestamp.toISOString(),
          calendarEvent: aiMessage.calendarEvent,
          isCalendarEvent: isCalendarRequest
        }
      )
      
      if (!aiSaveResult.success) {
        console.error('Failed to save AI message to database:', aiSaveResult.error)
        
        // Check if this is a schema-related error
        if (aiSaveResult.error && 
            (aiSaveResult.error.includes('conversation_id') || 
             aiSaveResult.error.includes('column') || 
             aiSaveResult.error.includes('schema'))) {
          console.warn('Database schema issue detected. You may need to run the SQL migration.');
          // Set the banner state to true
          setShowSchemaBanner(true);
          // Just continue with the conversation in memory only
        }
      }
      
      // Update chat history with new messages
      setChatHistory(prev => {
        const chatIndex = prev.findIndex(chat => chat.id === currentConversationId)
        
        if (chatIndex >= 0) {
          // Update existing chat
          const updatedHistory = [...prev]
          const chat = { ...updatedHistory[chatIndex] }
          
          // Add the new messages
          chat.messages = [...chat.messages, userMessage, aiMessage]
          chat.lastMessage = aiMessage.content.substring(0, 40) + (aiMessage.content.length > 40 ? '...' : '')
          chat.timestamp = aiMessage.timestamp
          
          updatedHistory[chatIndex] = chat
          return updatedHistory
        } else {
          // Create a new chat history entry
          return [
            {
              id: currentConversationId,
              title: inputValue.substring(0, 30) + (inputValue.length > 30 ? '...' : ''),
              lastMessage: aiResponseText.substring(0, 40) + (aiResponseText.length > 40 ? '...' : ''),
              timestamp: aiMessage.timestamp,
              messages: [
                // Include the default welcome message if we're creating a totally new chat
                ...(currentConversationId !== activeChatId ? [{
                  id: "welcome_" + Date.now().toString(),
                  content: "Hello! I'm your TwinBot assistant. How can I help you today?",
                  isUser: false,
                  timestamp: new Date(),
                }] : []),
                userMessage,
                aiMessage
              ]
            },
            ...prev.filter(chat => chat.id !== "default_chat") // Remove the default chat once we have a real one
          ]
        }
      })
    } catch (error) {
      console.error('Error in message exchange:', error)
      
      // Show error message
      setMessages(prev => [
        ...prev,
        {
          id: `error_${Date.now().toString()}`,
          content: "Sorry, I encountered an error. Please try again.",
          isUser: false,
          timestamp: new Date(),
          error: error instanceof Error ? error.message : String(error)
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const createNewChat = () => {
    // Generate a unique ID for the new chat
    const newChatId = `conv_${Date.now()}`
    
    // Create welcome message
    const welcomeMessage: Message = {
      id: "welcome_" + Date.now().toString(),
      content: "Hello! I'm your TwinBot assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    }
    
    // Add new chat to chat history
    setChatHistory(prev => [
      {
        id: newChatId,
        title: "New Conversation",
        lastMessage: welcomeMessage.content,
        timestamp: welcomeMessage.timestamp,
        messages: [welcomeMessage]
      },
      ...prev.filter(chat => chat.id !== "default_chat") // Filter out the default chat if it exists
    ])
    
    // Set the new chat as active
    setActiveChatId(newChatId)
    setMessages([welcomeMessage])
    
    // Save welcome message to Supabase
    saveConversationMessage(
      welcomeMessage.content,
      'assistant',
      {
        conversationId: newChatId,
        timestamp: welcomeMessage.timestamp.toISOString(),
        isWelcomeMessage: true
      }
    ).then(result => {
      if (!result.success) {
        console.error('Failed to save welcome message to database:', result.error);
        
        // Check if this is a schema-related error
        if (result.error && 
           (result.error.includes('conversation_id') || 
            result.error.includes('column') || 
            result.error.includes('schema'))) {
          console.warn('Database schema issue detected. You may need to run the SQL migration.');
          // Set the banner state to true
          setShowSchemaBanner(true);
          // Just continue with the conversation in memory only
        }
      }
    }).catch(error => {
      console.error('Failed to save welcome message to database:', error)
    })
    
    // Close the chat history sidebar on mobile
    if (mobileView) {
      setIsChatHistoryOpen(false)
    }
    
    // Need a small delay to ensure the DOM has updated before scrolling
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
    }, 100)
  }

  const switchToChat = (chatId: string) => {
    const chat = chatHistory.find(c => c.id === chatId)
    if (chat) {
      setActiveChatId(chatId)
      setMessages(chat.messages)
      
      // Close the chat history sidebar on mobile
      if (mobileView) {
        setIsChatHistoryOpen(false)
      }
      
      // Need a small delay to ensure the DOM has updated before scrolling
      setTimeout(() => {
        if (chat.messages.length > 0) {
          messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
        }
      }, 100)
    }
  }

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent also triggering the click on the chat item
    
    // Set loading state so user can't interact during deletion
    setIsLoading(true)
    
    // Find the chat to mark as deleting
    setChatHistory(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, isDeleting: true } : chat
    ))
    
    try {
      // Get authentication token from localStorage
      const session = localStorage.getItem('session')
      if (!session) {
        throw new Error('Authentication session not found')
      }
      
      const parsedSession = JSON.parse(session)
      if (!parsedSession.access_token) {
        throw new Error('Authentication token not found')
      }
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'
      console.log(`Deleting conversation ${chatId} via API: ${API_URL}/api/conversations/delete`)
      
      // Make the delete request to the server
      const response = await fetch(`${API_URL}/api/conversations/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${parsedSession.access_token}`
        },
        body: JSON.stringify({
          conversationId: chatId
        })
      })
      
      const responseText = await response.text()
      console.log(`Delete response status: ${response.status}, body:`, responseText)
      
      if (!response.ok) {
        // Log the complete error information
        console.error(`Failed to delete conversation from database. Status: ${response.status}, Response:`, responseText)
        
        // Show error toast or notification here
        let errorMessage = 'Failed to delete conversation';
        
        try {
          // Try to parse the response as JSON
          const errorData = JSON.parse(responseText);
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          // If parsing fails, use the response text or a generic message
          if (responseText && responseText.length < 100) {
            errorMessage = `Server error: ${responseText}`;
          } else if (response.status === 401) {
            errorMessage = 'Authentication required. Please log in again.';
          } else if (response.status === 404) {
            errorMessage = 'Delete endpoint not found. Server may need to be updated.';
          }
        }
        
        // Remove deleting status but keep the chat
        setChatHistory(prev => prev.map(chat => 
          chat.id === chatId ? { ...chat, isDeleting: false } : chat
        ))
        
        // Set error message
        setError(`Error deleting chat: ${errorMessage}`);
        
        setIsLoading(false)
        return // Don't continue with UI deletion
      }
    } catch (error) {
      console.error('Error deleting conversation from database:', error)
      
      // Remove deleting status but keep the chat
      setChatHistory(prev => prev.map(chat => 
        chat.id === chatId ? { ...chat, isDeleting: false } : chat
      ))
      
      // Set error message
      setError(`Error deleting chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      setIsLoading(false)
      return // Don't continue with UI deletion
    }
    
    // If we got here, deletion was successful
    // Update the UI state
    const updatedHistory = chatHistory.filter(chat => chat.id !== chatId)
    setChatHistory(updatedHistory)
    
    // If we deleted the active chat, switch to the first available chat
    // or create a new one if no chats left
    if (chatId === activeChatId) {
      if (updatedHistory.length > 0) {
        setActiveChatId(updatedHistory[0].id)
        setMessages(updatedHistory[0].messages)
      } else {
        createNewChat()
      }
    }
    
    // Finish loading state
    setIsLoading(false)
  }

  const getUserInitials = () => {
    if (!user?.name) return 'U'
    return user.name.split(' ').map(part => part[0]).join('')
  }

  // Function to render message content with markdown-like formatting
  const renderMessageContent = (message: Message) => {
    if (message.isTyping && message.typingContent !== undefined) {
      return (
        <p className="whitespace-pre-line text-sm">
          {formatMessageWithMarkdown(message.typingContent)}
          <span className="typing-cursor">▋</span>
        </p>
      )
    }
    
    // Show calendar icon for calendar event related messages
    const calendarPatterns = [
      /added\s+(?:"|")(.+?)(?:"|")\s+to\s+your\s+calendar/i,
      /created\s+(?:an\s+)?event\s+(?:"|")(.+?)(?:"|")/i, 
      /scheduled.+?(\d{4}-\d{2}-\d{2})/i,
      /calendar\s+event/i,
      /view\s+(?:the\s+)?event\s+in\s+Google\s+Calendar/i,
      /view\s+in\s+Google\s+Calendar/i
    ];
    
    const isCalendarMessage = !message.isUser && (
      calendarPatterns.some(pattern => pattern.test(message.content)) ||
      message.content.includes("I've created an event") || 
      message.content.includes("I'd like to create that calendar event") ||
      message.content.includes("to your calendar on")
    );
    
    return (
      <div>
        <p className="whitespace-pre-wrap text-sm">
          {formatMessageWithMarkdown(message.content)}
        </p>
        {isCalendarMessage && (
          <div className="mt-2 flex items-center text-xs text-[#3ecf8e]">
            <Calendar className="h-3 w-3 mr-1" />
            <span>Calendar Event</span>
          </div>
        )}
      </div>
    )
  }
  
  // Function to format text with basic markdown
  const formatMessageWithMarkdown = (text: string) => {
    if (!text) return null;
    
    // Split the text by double asterisks to identify bold segments
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    
    return parts.map((part, index) => {
      // Check if this part is wrapped in double asterisks
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        // Extract the content between asterisks and make it bold
        const content = part.substring(2, part.length - 2);
        return <strong key={index}>{content}</strong>;
      }
      // Return regular text for non-markdown parts
      return <span key={index}>{part}</span>;
    });
  };

  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  // Add click outside handler to close chat history on mobile
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!mobileView) return
      
      // Close chat history when clicking outside
      const historyEl = document.getElementById('chat-history-sidebar')
      if (isChatHistoryOpen && historyEl && !historyEl.contains(e.target as Node) &&
          mainContentRef.current && mainContentRef.current.contains(e.target as Node)) {
        setIsChatHistoryOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mobileView, isChatHistoryOpen])

  // Profile dropdown click outside handler
  useEffect(() => {
    const handleProfileClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleProfileClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleProfileClickOutside)
    }
  }, [])

  // Extract event details from AI responses that contain event confirmations
  const extractEventFromAIResponse = (message: string): { title: string, date: string, time: string } | null => {
    if (!message) return null;
    
    // Pattern for "Team discussion scheduled: 2025-03-28, 15:00"
    const scheduledPattern = /(.+?)\s+scheduled:\s+(\d{4}-\d{2}-\d{2}),\s+(\d{2}:\d{2})/i;
    const scheduledMatch = message.match(scheduledPattern);
    
    if (scheduledMatch) {
      return {
        title: scheduledMatch[1].trim(),
        date: scheduledMatch[2],
        time: scheduledMatch[3]
      };
    }
    
    // Pattern for "I've created an event 'X' for you on <date> at <time>"
    const createdPattern = /created\s+(?:an\s+)?event\s+(?:"|'|")(.+?)(?:"|'|")\s+.*?on\s+([a-zA-Z0-9 ,\-]+)\s+at\s+([a-zA-Z0-9: ]+(?:am|pm)?)/i;
    const createdMatch = message.match(createdPattern);
    
    if (createdMatch) {
      return {
        title: createdMatch[1].trim(),
        date: createdMatch[2].trim(),
        time: createdMatch[3].trim()
      };
    }
    
    // Pattern for "I've added 'X' to your calendar on <date> at <time>"
    const addedPattern = /added\s+(?:"|'|")(.+?)(?:"|'|")\s+to\s+your\s+calendar\s+on\s+([a-zA-Z0-9 ,\-]+)\s+at\s+([a-zA-Z0-9: ]+(?:am|pm)?)/i;
    const addedMatch = message.match(addedPattern);
    
    if (addedMatch) {
      return {
        title: addedMatch[1].trim(),
        date: addedMatch[2].trim(),
        time: addedMatch[3].trim()
      };
    }
    
    // Pattern for "I've created a calendar event: **Event Name** Date: date Time: time"
    const formattedPattern = /created\s+a\s+calendar\s+event:[\s\S]*?\*\*(.+?)\*\*[\s\S]*?Date:\s+([a-zA-Z0-9 ,\-\/]+)[\s\S]*?Time:\s+([a-zA-Z0-9: ]+(?:am|pm)?)/i;
    const formattedMatch = message.match(formattedPattern);
    
    if (formattedMatch) {
      return {
        title: formattedMatch[1].trim(),
        date: formattedMatch[2].trim(),
        time: formattedMatch[3].trim()
      };
    }
    
    return null;
  };

  // Create a calendar event directly using the Calendar API
  const createCalendarEventDirectly = async (title: string, startDate: string, startTime: string): Promise<boolean> => {
    try {
      if (!user) return false;
      
      // Get the Google token
      const googleToken = localStorage.getItem('google_token');
      if (!googleToken) {
        console.error("No Google token available");
        return false;
      }
      
      // Format the date and time for the Calendar API
      // Parse the date which might be in various formats
      let formattedDate = startDate;
      
      // If the date is not in YYYY-MM-DD format, try to convert it
      if (!startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Convert date like "March 28" to YYYY-MM-DD
        try {
          const date = new Date(startDate);
          if (!isNaN(date.getTime())) {
            formattedDate = date.toISOString().split('T')[0];
          }
        } catch (e) {
          console.error("Failed to parse date:", startDate);
          return false;
        }
      }
      
      // Process the time
      let formattedTime = startTime;
      // Handle 12-hour format with AM/PM
      if (startTime.match(/\d{1,2}:\d{2}\s*(am|pm)/i)) {
        const match = startTime.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
        if (match) {
          let hours = parseInt(match[1]);
          const minutes = match[2];
          const ampm = match[3].toLowerCase();
          
          if (ampm === 'pm' && hours < 12) hours += 12;
          if (ampm === 'am' && hours === 12) hours = 0;
          
          formattedTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
        }
      }
      
      // Create start and end times (end = start + 1 hour)
      const startDateTime = new Date(`${formattedDate}T${formattedTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // +1 hour
      
      console.log("Creating calendar event:", {
        title,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString()
      });
      
      // Use the API
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const token = session.access_token;
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002'}/api/calendar/create-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Google-Token': googleToken
        },
        body: JSON.stringify({
          eventDetails: {
            summary: title,
            description: `Created from TwinBot chat`,
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error("Error creating calendar event:", error);
        return false;
      }
      
      const result = await response.json();
      console.log("Calendar event created successfully:", result);
      return true;
    } catch (error) {
      console.error("Error creating calendar event directly:", error);
      return false;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#242123]">
      {/* Sidebar */}
      <Sidebar activePage="chat" />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#121212]" ref={mainContentRef}>
        {/* Header */}
        <header className="bg-[#121212] border-b border-gray-800 h-16 flex items-center px-4 md:px-6 z-10">
          <div className="flex-1 flex items-center">
            <h1 className="text-lg md:text-xl font-bold text-white">TwinBot Chat</h1>
            <Badge variant="outline" className="ml-2 md:ml-3 bg-[#3ecf8e]/10 text-[#3ecf8e] border-[#3ecf8e]/20">
              Beta
            </Badge>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <button
              onClick={() => setIsChatHistoryOpen(!isChatHistoryOpen)}
              className="text-gray-300 hover:text-white hover:bg-[#272727] p-2 rounded-md"
              aria-label="Toggle chat history"
            >
              <PanelLeft className="h-5 w-5" />
            </button>
            <button className="relative text-gray-300 hover:text-white hover:bg-[#272727] p-2 rounded-md">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-[#3ecf8e] rounded-full"></span>
            </button>
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center hover:bg-[#272727] p-1 rounded-md transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-[#272727] text-white">{getUserInitials()}</AvatarFallback>
                </Avatar>
                <ChevronDown className={`h-4 w-4 ml-1 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-[#1c1c1c] ring-1 ring-black ring-opacity-5 z-50">
                  <div className="px-4 py-2 border-b border-gray-800">
                    <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-400">{user?.email || ''}</p>
                  </div>
                  <Link 
                    href="/dashboard/profile" 
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#272727] hover:text-white flex items-center"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Link>
                  <Link 
                    href="/dashboard/settings" 
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#272727] hover:text-white flex items-center"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#272727] hover:text-white flex items-center"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Schema Migration Banner */}
        {showSchemaBanner && (
          <div className="px-4 py-3 w-full bg-amber-500 text-black">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="font-bold mr-2">⚠️ Database Schema Update Required</span>
                <span>Your chat history may not save properly until a database update is applied.</span>
              </div>
              <button 
                onClick={() => setShowSchemaBanner(false)}
                className="ml-4 text-black hover:text-gray-800"
              >
                ✕
              </button>
            </div>
            <p className="text-sm mt-1">
              The <code className="bg-amber-600 px-1 rounded text-white">conversation_id</code> column is missing 
              from your database. Please run the migration SQL from 
              <a 
                href="/migrations/migrate.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-900 hover:text-blue-700 mx-1 underline"
              >
                the migration page
              </a>
              or contact your administrator.
            </p>
            <p className="text-xs mt-2">
              <strong>Don't worry!</strong> Your conversations will still work, but changes may not be saved permanently until the issue is fixed.
            </p>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="px-4 py-3 w-full bg-red-500/80 text-white">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="font-bold mr-2">⚠️ Error</span>
                <span>{error}</span>
              </div>
              <button 
                onClick={() => setError(null)}
                className="ml-4 text-white hover:text-gray-100"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Chat Interface with Dynamic Width */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Messages Area */}
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-[#121212] to-[#1a1a1a]">
            <ScrollArea className="flex-1 py-2 w-full" ref={scrollAreaRef}>
              <div className="space-y-4 w-full px-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? "justify-end" : "justify-start"} w-full`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg py-2 px-3 shadow-sm ${
                        message.isUser
                          ? "bg-[#3ecf8e] text-white"
                          : "bg-[#272727] text-white"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!message.isUser && (
                          <Avatar className="h-6 w-6 mt-0.5 flex-shrink-0">
                            <AvatarFallback className="bg-[#3ecf8e] text-white text-xs">TB</AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex-1 min-w-0">
                          {renderMessageContent(message)}
                          <p className="text-[10px] opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        {message.isUser && (
                          <Avatar className="h-6 w-6 mt-0.5 flex-shrink-0">
                            <AvatarFallback className="bg-[#272727] text-white text-xs">{getUserInitials()}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="bg-[#121212] border-t border-gray-800 p-2 px-4 w-full">
              <form onSubmit={handleSendMessage} className="w-full mx-auto relative">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-[#1c1c1c] border-gray-800 text-white text-sm placeholder:text-gray-500 focus:border-[#3ecf8e] focus:ring-[#3ecf8e] pr-10 h-10 rounded-lg shadow-sm w-full"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className={`absolute right-1.5 top-1.5 ${
                    isLoading 
                      ? "bg-[#34a874] cursor-not-allowed" 
                      : "bg-[#3ecf8e] hover:bg-[#34a874]"
                  } text-white p-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-[#3ecf8e] focus:ring-opacity-50 transition-colors`}
                  disabled={isLoading}
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Chat History Sidebar with smooth transitions */}
          <div 
            id="chat-history-sidebar"
            className={`${mobileView ? 'fixed inset-y-0 right-0 z-50' : 'relative'} bg-[#1c1c1c] border-l border-gray-800 
                       transition-all duration-300 ease-in-out transform
                       ${isChatHistoryOpen 
                         ? 'translate-x-0' : mobileView ? 'translate-x-full' : 'w-0'}`}
            style={{
              width: isChatHistoryOpen ? (mobileView ? '80%' : '280px') : '0px',
              maxWidth: mobileView ? '80%' : '280px',
              boxShadow: mobileView && isChatHistoryOpen ? '0 0 15px rgba(0,0,0,0.5)' : 'none'
            }}
          >
            <div className="flex flex-col h-full">
              <div className="p-3 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-sm font-medium text-white">Chat History</h2>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-auto text-gray-300 hover:text-white hover:bg-[#272727]"
                    onClick={createNewChat}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  {mobileView && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-auto text-gray-300 hover:text-white hover:bg-[#272727]"
                      onClick={() => setIsChatHistoryOpen(false)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {chatHistory.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => switchToChat(chat.id)}
                      className={`group w-full text-left p-2 rounded-md hover:bg-[#272727] cursor-pointer transition-colors ${
                        activeChatId === chat.id ? 'bg-[#272727]' : ''
                      } ${chat.isDeleting ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start">
                        <MessageSquare className={`h-3.5 w-3.5 mr-2 mt-0.5 ${activeChatId === chat.id ? 'text-[#3ecf8e]' : 'text-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">
                            {chat.isDeleting ? 'Deleting...' : chat.title}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">
                            {chat.isDeleting ? '' : chat.lastMessage}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {chat.isDeleting ? '' : `${chat.timestamp.toLocaleDateString()} at ${chat.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-auto text-gray-500 hover:text-red-400 hover:bg-transparent opacity-0 group-hover:opacity-100"
                          onClick={(e) => deleteChat(chat.id, e)}
                          disabled={chat.isDeleting}
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-2 border-t border-gray-800">
                <Button 
                  onClick={createNewChat}
                  className="w-full bg-[#3ecf8e] hover:bg-[#34a874] text-white flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-md transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Chat</span>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Overlay for mobile when chat history is open */}
          {mobileView && isChatHistoryOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setIsChatHistoryOpen(false)}
            />
          )}
        </div>
      </div>
      <style jsx global>{`
        .typing-cursor {
          display: inline-block;
          width: 2px;
          height: 16px;
          background-color: white;
          animation: blink 1s infinite;
          margin-left: 2px;
          vertical-align: middle;
        }
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        
        /* Add smooth transitions */
        .transition-all {
          transition-property: all;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 300ms;
        }
      `}</style>
    </div>
  )
} 