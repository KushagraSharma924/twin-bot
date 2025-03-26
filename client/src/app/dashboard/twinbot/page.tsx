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
import { getUser, logout } from "@/lib/api"
import { sendMessage, createAICalendarEvent, createSimpleCalendarEvent } from "@/lib/ai-api"
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
}

interface ChatHistory {
  id: string
  title: string
  lastMessage: string
  timestamp: Date
  messages: Message[]
}

export default function TwinBotChatPage() {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(true)
  const [mobileView, setMobileView] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null)
  const [activeChatId, setActiveChatId] = useState<string>("1")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm your TwinBot assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ])
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([
    {
      id: "1",
      title: "Getting Started",
      lastMessage: "Hello! I'm your TwinBot assistant.",
      timestamp: new Date(),
      messages: [
        {
          id: "1",
          content: "Hello! I'm your TwinBot assistant. How can I help you today?",
          isUser: false,
          timestamp: new Date(),
        },
      ]
    }
  ])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    // Get the current user
    const currentUser = getUser()
    if (currentUser) {
      setUser(currentUser)
    }

    // Load chat history from localStorage if available
    const savedChatHistory = localStorage.getItem('twinbot_chat_history')
    if (savedChatHistory) {
      try {
        const parsed = JSON.parse(savedChatHistory)
        // Convert string timestamps back to Date objects
        const processedHistory = parsed.map((chat: any) => ({
          ...chat,
          timestamp: new Date(chat.timestamp),
          messages: chat.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }))
        setChatHistory(processedHistory)
        
        // Set active chat and messages if we have a history
        if (processedHistory.length > 0) {
          setActiveChatId(processedHistory[0].id)
          setMessages(processedHistory[0].messages)
        }
      } catch (e) {
        console.error("Error parsing chat history:", e)
      }
    }

    return () => {
      // Clean up any active typing timeouts on unmount
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  // Save chat history to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('twinbot_chat_history', JSON.stringify(chatHistory))
  }, [chatHistory])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Simulate typing effect
  const simulateTyping = (fullResponse: string, messageId: string) => {
    let currentIndex = 0;
    const typingInterval = 1; // Speed of typing
    
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
        
        currentIndex++;
        
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
    if (!inputValue.trim() || isLoading || !user) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    }
    
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInputValue("")
    setIsLoading(true)

    try {
      // Add initial AI message with typing state
      const botMessageId = `bot-${Date.now()}`
      const initialBotMessage: Message = {
        id: botMessageId,
        content: "",
        isUser: false,
        timestamp: new Date(),
        isTyping: true,
        typingContent: ""
      }
      
      setMessages([...updatedMessages, initialBotMessage])

      // Check if message is a calendar event creation request
      const isCalendarRequest = checkIfCalendarEventRequest(userMessage.content)
      
      let response = ""
      
      if (isCalendarRequest) {
        console.log("Detected calendar event request:", userMessage.content);
        try {
          // Log every step for debugging
          console.log("Creating calendar event from message:", userMessage.content);
          console.log("User ID:", user.id);
          console.log("Google token available:", !!localStorage.getItem('google_token'));
          
          // Use the new simplified approach for calendar event creation
          const eventResult = await createSimpleCalendarEvent(userMessage.content, user.id)
          
          console.log("Calendar event creation response:", eventResult);
          
          // If we have extracted event details, include them in the response
          if (eventResult.eventDetails) {
            const { eventName, eventDate, eventTime } = eventResult.eventDetails
            response = eventResult.message || `I've added "${eventName}" to your calendar on ${eventDate} at ${eventTime}.`
            
            // Also provide a confirmation that includes viewing the event
            if (eventResult.event && eventResult.event.htmlLink) {
              response += `\n\nYou can [view the event in Google Calendar](${eventResult.event.htmlLink}).`;
            }
          } else {
            response = eventResult.message || "I've created that calendar event for you."
          }
          
          // Debug log the successful result
          console.log("Calendar event created successfully:", eventResult);
        } catch (calendarError: any) {
          console.error("Calendar event creation error:", calendarError)
          
          // If we have a specific message from the server, use it
          if (calendarError.message && calendarError.message.includes('details":')){
            try {
              // Try to extract the message from the error
              const errorData = JSON.parse(calendarError.message.substring(calendarError.message.indexOf('{')));
              if (errorData.message) {
                response = errorData.message;
              } else {
                response = `I couldn't create that calendar event: ${calendarError.message || 'Unknown error'}`;
              }
            } catch (parseError) {
              response = `I couldn't create that calendar event: ${calendarError.message || 'Unknown error'}`;
            }
          } else if (calendarError.message?.includes('Google Calendar authentication required')) {
            response = "I'd like to create that calendar event for you, but you need to connect to Google Calendar first. Please go to the Calendar page and connect your account.";
          } else {
            response = `I couldn't create that calendar event: ${calendarError.message || 'Unknown error'}`;
          }
        }
      } else {
        // Normal chat response
        response = await sendMessage(userMessage.content, user.id)
      }
      
      // Check if the response contains calendar event confirmation
      if (!isCalendarRequest && response.includes("scheduled")) {
        console.log("AI response contains calendar event confirmation, but wasn't processed as a calendar request:", response);
        // Try to extract event details from the AI response
        const extractedEvent = extractEventFromAIResponse(response);
        
        if (extractedEvent) {
          console.log("Extracted event details from AI response:", extractedEvent);
          
          try {
            // Try to create the calendar event directly with the extracted details
            const success = await createCalendarEventDirectly(
              extractedEvent.title,
              extractedEvent.date,
              extractedEvent.time
            );
            
            if (success) {
              console.log("Successfully created calendar event directly");
              response += `\n\nI've added this event to your calendar.`;
            } else {
              console.log("Failed to create calendar event directly");
              
              // Fall back to using the API through createSimpleCalendarEvent
              const explicitEventMessage = `Create a calendar event titled "${extractedEvent.title}" on ${extractedEvent.date} at ${extractedEvent.time}`;
              console.log("Falling back to createSimpleCalendarEvent with message:", explicitEventMessage);
              
              try {
                const eventResult = await createSimpleCalendarEvent(explicitEventMessage, user.id);
                console.log("Calendar event creation through fallback:", eventResult);
                
                if (eventResult.event && eventResult.event.htmlLink) {
                  response += `\n\nI've added this event to your calendar. [View in Google Calendar](${eventResult.event.htmlLink})`;
                }
              } catch (fallbackError) {
                console.error("Both direct and fallback calendar creation failed:", fallbackError);
                response += "\n\n(Note: I tried to add this to your calendar but encountered an issue. Please try asking me explicitly to create this event.)";
              }
            }
          } catch (error) {
            console.error("Error in calendar event creation workflow:", error);
            response += "\n\n(Note: I tried to add this to your calendar but encountered an issue. Please try asking me explicitly to create this event.)";
          }
        }
      }
      
      // Simulate typing effect with the actual response
      simulateTyping(response, botMessageId)
      
      // Update active chat in history with final message once typing is complete
      const finalBotMessage: Message = {
        id: botMessageId,
        content: response,
        isUser: false,
        timestamp: new Date(),
      }
      
      const finalMessages = [...updatedMessages, finalBotMessage]
      
      // Update chat history
      setChatHistory(prev => {
        const updatedHistory = prev.map(chat => 
          chat.id === activeChatId 
            ? {
                ...chat, 
                messages: finalMessages,
                lastMessage: response.slice(0, 30) + (response.length > 30 ? "..." : ""),
                timestamp: new Date()
              }
            : chat
        )
        return updatedHistory
      })
    } catch (error) {
      console.error("Error sending message:", error)
      
      // Add error message
      setMessages(updatedMessages.concat([{
        id: Date.now().toString(),
        content: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date(),
      }]))
    } finally {
      setIsLoading(false)
    }
  }

  const createNewChat = () => {
    const newChatId = Date.now().toString()
    const initialMessage = {
      id: Date.now().toString(),
      content: "Hello! I'm your TwinBot assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    }
    
    const newChat: ChatHistory = {
      id: newChatId,
      title: "New Conversation",
      lastMessage: initialMessage.content,
      timestamp: new Date(),
      messages: [initialMessage]
    }
    
    setChatHistory(prev => [newChat, ...prev])
    setActiveChatId(newChatId)
    setMessages([initialMessage])
  }

  const switchToChat = (chatId: string) => {
    const chat = chatHistory.find(c => c.id === chatId)
    if (chat) {
      setActiveChatId(chatId)
      setMessages(chat.messages)
    }
  }

  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent also triggering the click on the chat item
    
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
    const createdPattern = /created\s+(?:an\s+)?event\s+(?:"|'|")(.+?)(?:"|'|")\s+.*?on\s+(\d{4}-\d{2}-\d{2}|\w+\s+\d{1,2}(?:st|nd|rd|th)?)\s+at\s+(\d{1,2}:\d{2}\s*(?:am|pm)?)/i;
    const createdMatch = message.match(createdPattern);
    
    if (createdMatch) {
      return {
        title: createdMatch[1].trim(),
        date: createdMatch[2],
        time: createdMatch[3]
      };
    }
    
    // Pattern for "I've added 'X' to your calendar on <date> at <time>"
    const addedPattern = /added\s+(?:"|'|")(.+?)(?:"|'|")\s+to\s+your\s+calendar\s+on\s+(\d{4}-\d{2}-\d{2}|\w+\s+\d{1,2}(?:st|nd|rd|th)?)\s+at\s+(\d{1,2}:\d{2}\s*(?:am|pm)?)/i;
    const addedMatch = message.match(addedPattern);
    
    if (addedMatch) {
      return {
        title: addedMatch[1].trim(),
        date: addedMatch[2],
        time: addedMatch[3]
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
      {/* Main Sidebar - keep original behavior */}
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

        {/* Chat Interface with Dynamic Width */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Messages Area */}
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-[#121212] to-[#1a1a1a]">
            <ScrollArea className="flex-1 py-2 w-full">
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
                      }`}
                    >
                      <div className="flex items-start">
                        <MessageSquare className={`h-3.5 w-3.5 mr-2 mt-0.5 ${activeChatId === chat.id ? 'text-[#3ecf8e]' : 'text-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">
                            {chat.title}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">
                            {chat.lastMessage}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {chat.timestamp.toLocaleDateString()} at{" "}
                            {chat.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-auto text-gray-500 hover:text-red-400 hover:bg-transparent opacity-0 group-hover:opacity-100"
                          onClick={(e) => deleteChat(chat.id, e)}
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