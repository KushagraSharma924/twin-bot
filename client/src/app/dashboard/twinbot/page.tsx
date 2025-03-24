"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Bell,
  Calendar,
  ChevronDown,
  FileText,
  Home,
  Mail,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Send,
  Zap,
  Trash2,
  Plus,
  PanelLeft,
} from "lucide-react"

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

interface ChatHistory {
  id: string
  title: string
  lastMessage: string
  timestamp: Date
}

export default function TwinBotChatPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(true)
  const [inputValue, setInputValue] = useState("")
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
    },
    {
      id: "2",
      title: "Email Suggestions",
      lastMessage: "Here are some email templates you can use.",
      timestamp: new Date(Date.now() - 86400000),
    },
    {
      id: "3",
      title: "Meeting Schedule",
      lastMessage: "I've scheduled your meeting for tomorrow.",
      timestamp: new Date(Date.now() - 172800000),
    },
  ])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    }
    
    setMessages((prev) => [...prev, userMessage])
    setInputValue("")

    // Simulate bot response after a delay
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: `I'm processing your request: "${inputValue}". As your TwinBot, I'm here to help with your emails, meetings, and research.`,
        isUser: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botResponse])
      
      // Update chat history
      setChatHistory((prev) => [
        {
          id: Date.now().toString(),
          title: inputValue.slice(0, 20) + (inputValue.length > 20 ? "..." : ""),
          lastMessage: botResponse.content.slice(0, 30) + "...",
          timestamp: new Date(),
        },
        ...prev,
      ])
    }, 1000)
  }

  return (
    <div className="flex h-screen bg-[#202123]">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? "w-64" : "w-20"} bg-[#202123] border-r border-gray-700 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className={`flex items-center space-x-2 ${!isSidebarOpen && "justify-center w-full"}`}>
            <Zap className="h-6 w-6 text-[#10a37f]" />
            {isSidebarOpen && <span className="font-bold text-white">TwinBot</span>}
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`text-gray-400 hover:text-white hover:bg-[#343541] p-2 rounded-md ${!isSidebarOpen ? "hidden" : ""}`}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 py-4">
          <nav className="space-y-1 px-2">
            <Link href="/dashboard" className="flex items-center w-full p-2 text-gray-300 hover:text-white hover:bg-[#343541] rounded-md">
              <Home className="h-5 w-5 mr-2" />
              {isSidebarOpen && <span>Dashboard</span>}
            </Link>
            <Link href="/dashboard/twinbot" className="flex items-center w-full p-2 text-white bg-[#343541] hover:bg-[#444654] rounded-md">
              <MessageSquare className="h-5 w-5 mr-2" />
              {isSidebarOpen && <span>TwinBot Chat</span>}
            </Link>
            <Link href="#" className="flex items-center w-full p-2 text-gray-300 hover:text-white hover:bg-[#343541] rounded-md">
              <Mail className="h-5 w-5 mr-2" />
              {isSidebarOpen && <span>Emails</span>}
            </Link>
            <Link href="#" className="flex items-center w-full p-2 text-gray-300 hover:text-white hover:bg-[#343541] rounded-md">
              <Calendar className="h-5 w-5 mr-2" />
              {isSidebarOpen && <span>Calendar</span>}
            </Link>
            <Link href="#" className="flex items-center w-full p-2 text-gray-300 hover:text-white hover:bg-[#343541] rounded-md">
              <FileText className="h-5 w-5 mr-2" />
              {isSidebarOpen && <span>Research</span>}
            </Link>
            <Link href="#" className="flex items-center w-full p-2 text-gray-300 hover:text-white hover:bg-[#343541] rounded-md">
              <Settings className="h-5 w-5 mr-2" />
              {isSidebarOpen && <span>Settings</span>}
            </Link>
          </nav>
        </div>
        <div className="p-4 border-t border-gray-700">
          <div className={`flex ${isSidebarOpen ? "items-center" : "justify-center"}`}>
            <Avatar className="h-8 w-8">
              <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
              <AvatarFallback className="bg-[#343541] text-white">JD</AvatarFallback>
            </Avatar>
            {isSidebarOpen && (
              <div className="ml-2 flex-1">
                <p className="text-sm font-medium text-white">John Doe</p>
                <p className="text-xs text-gray-400">john@example.com</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#343541]">
        {/* Header */}
        <header className="bg-[#343541] border-b border-gray-700 h-16 flex items-center px-6">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden mr-2 text-gray-300 hover:text-white hover:bg-[#444654] p-2 rounded-md"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 flex items-center">
            <h1 className="text-xl font-bold text-white">TwinBot Chat</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsChatHistoryOpen(!isChatHistoryOpen)}
              className="text-gray-300 hover:text-white hover:bg-[#444654] p-2 rounded-md"
            >
              <PanelLeft className="h-5 w-5" />
            </button>
            <button className="relative text-gray-300 hover:text-white hover:bg-[#444654] p-2 rounded-md">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-[#10a37f] rounded-full"></span>
            </button>
            <div className="flex items-center">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                <AvatarFallback className="bg-[#444654] text-white">JD</AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 ml-1 text-gray-400" />
            </div>
          </div>
        </header>

        {/* Chat Interface */}
        <div className="flex-1 flex overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-3xl rounded-lg p-4 ${
                        message.isUser
                          ? "bg-[#10a37f] text-white"
                          : "bg-[#444654] text-white"
                      }`}
                    >
                      <div className="flex items-start">
                        {!message.isUser && (
                          <Avatar className="h-8 w-8 mr-3 mt-1">
                            <AvatarFallback className="bg-[#10a37f] text-white">TB</AvatarFallback>
                          </Avatar>
                        )}
                        <div>
                          <p>{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        {message.isUser && (
                          <Avatar className="h-8 w-8 ml-3 mt-1">
                            <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                            <AvatarFallback className="bg-[#343541] text-white">JD</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-700 bg-[#343541]">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Message TwinBot..."
                  className="h-12 rounded-md border-gray-700 bg-[#40414f] text-white placeholder:text-gray-400 focus:border-[#10a37f] focus:ring-[#10a37f]"
                />
                <button
                  type="submit"
                  className="bg-[#10a37f] h-12 w-12 flex items-center justify-center rounded-md text-white hover:bg-[#0e8f6f]"
                  disabled={!inputValue.trim()}
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
              <p className="text-xs text-gray-400 mt-2 text-center">
                TwinBot learns from your interactions to better assist you over time.
              </p>
            </div>
          </div>

          {/* Chat History Sidebar */}
          {isChatHistoryOpen && (
            <div className="w-72 border-l border-gray-700 bg-[#202123] flex flex-col">
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-white">Chat History</h2>
                  <button className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-[#343541]">
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search chats..."
                    className="pl-8 bg-[#343541] border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {chatHistory.map((chat) => (
                    <button
                      key={chat.id}
                      className="w-full text-left p-3 rounded-md hover:bg-[#343541] transition-colors flex flex-col"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">{chat.title}</span>
                        <Badge variant="outline" className="border-gray-700 text-xs text-gray-400">
                          {chat.timestamp.toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 truncate mt-1">{chat.lastMessage}</p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-3 border-t border-gray-700">
                <button className="w-full flex items-center justify-center p-2 text-gray-400 hover:text-white hover:bg-[#343541] rounded-md">
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span>Clear history</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 