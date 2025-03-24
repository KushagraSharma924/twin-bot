"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  Bookmark,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  Layers,
  SlidersHorizontal,
  Star,
  ThumbsUp,
  Zap,
  PlusCircle,
  Folder,
  Share2,
  Trash2,
} from "lucide-react"

interface ResearchDocument {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  dateAdded: string;
  source: string;
  saved: boolean;
  starred: boolean;
  tags: string[];
  progress: number;
}

export default function ResearchPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<'all' | 'articles' | 'notes' | 'bookmarks'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  
  const categories = [
    { id: 1, name: "AI & Machine Learning", count: 12 },
    { id: 2, name: "Web Development", count: 8 },
    { id: 3, name: "Data Science", count: 15 },
    { id: 4, name: "Product Management", count: 5 },
    { id: 5, name: "Business Strategy", count: 7 },
  ]
  
  const documents: ResearchDocument[] = [
    {
      id: 1,
      title: "The Future of AI in Productivity Tools",
      excerpt: "An exploration of how AI is transforming productivity tools and workflows in modern workplaces...",
      category: "AI & Machine Learning",
      dateAdded: "2023-11-15",
      source: "MIT Technology Review",
      saved: true,
      starred: true,
      tags: ["AI", "Productivity", "Technology Trends"],
      progress: 75
    },
    {
      id: 2,
      title: "Modern JavaScript Framework Comparison",
      excerpt: "A detailed analysis comparing React, Vue, Angular, and newer frameworks for web development...",
      category: "Web Development",
      dateAdded: "2023-12-01",
      source: "Web Dev Magazine",
      saved: true,
      starred: false,
      tags: ["JavaScript", "Frameworks", "Frontend"],
      progress: 100
    },
    {
      id: 3,
      title: "Data Visualization Techniques for Complex Datasets",
      excerpt: "Best practices for visualizing complex, multi-dimensional data for better insights and communication...",
      category: "Data Science",
      dateAdded: "2023-12-10",
      source: "Journal of Data Science",
      saved: true,
      starred: false,
      tags: ["Data Visualization", "Analytics", "Dashboards"],
      progress: 30
    },
    {
      id: 4,
      title: "Product-Led Growth Strategies",
      excerpt: "How leading SaaS companies are using product-led growth to scale their businesses...",
      category: "Product Management",
      dateAdded: "2023-12-15",
      source: "Harvard Business Review",
      saved: false,
      starred: true,
      tags: ["Product Strategy", "SaaS", "Growth"],
      progress: 50
    },
    {
      id: 5,
      title: "Sustainable Business Models in Tech",
      excerpt: "Exploring how technology companies are adopting sustainable practices while maintaining profitability...",
      category: "Business Strategy",
      dateAdded: "2023-12-20",
      source: "Bloomberg Technology",
      saved: true,
      starred: false,
      tags: ["Sustainability", "Business Models", "ESG"],
      progress: 10
    },
    {
      id: 6,
      title: "Neural Networks and Deep Learning Fundamentals",
      excerpt: "A comprehensive overview of the core concepts behind neural networks and deep learning algorithms...",
      category: "AI & Machine Learning",
      dateAdded: "2023-12-22",
      source: "Google AI Blog",
      saved: true,
      starred: true,
      tags: ["Deep Learning", "Neural Networks", "AI Architecture"],
      progress: 85
    },
  ]
  
  // Filter documents based on search, tab, and category
  const filteredDocuments = documents.filter(doc => {
    // Filter by search
    const matchesSearch = searchQuery === "" || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter by tab
    let matchesTab = true;
    if (activeTab === 'articles') {
      matchesTab = doc.source !== 'Personal Notes';
    } else if (activeTab === 'notes') {
      matchesTab = doc.source === 'Personal Notes';
    } else if (activeTab === 'bookmarks') {
      matchesTab = doc.saved;
    }
    
    // Filter by category
    const matchesCategory = !selectedCategory || doc.category === selectedCategory;
    
    return matchesSearch && matchesTab && matchesCategory;
  });

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
            <Link href="/dashboard/twinbot" className="flex items-center w-full p-2 text-gray-300 hover:text-white hover:bg-[#343541] rounded-md">
              <MessageSquare className="h-5 w-5 mr-2" />
              {isSidebarOpen && <span>TwinBot Chat</span>}
            </Link>
            <Link href="/dashboard/emails" className="flex items-center w-full p-2 text-gray-300 hover:text-white hover:bg-[#343541] rounded-md">
              <Mail className="h-5 w-5 mr-2" />
              {isSidebarOpen && <span>Emails</span>}
            </Link>
            <Link href="/dashboard/calendar" className="flex items-center w-full p-2 text-gray-300 hover:text-white hover:bg-[#343541] rounded-md">
              <Calendar className="h-5 w-5 mr-2" />
              {isSidebarOpen && <span>Calendar</span>}
            </Link>
            <Link href="/dashboard/research" className="flex items-center w-full p-2 text-white bg-[#343541] hover:bg-[#444654] rounded-md">
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#343541]">
        {/* Header */}
        <header className="bg-[#343541] border-b border-gray-700 h-16 flex items-center px-6">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden mr-2 text-gray-300 hover:text-white hover:bg-[#444654] p-2 rounded-md"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-white mr-6">Research Library</h1>
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search research documents, notes, and bookmarks..."
              className="pl-10 bg-[#202123] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#10a37f] focus:ring-[#10a37f] w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="ml-4 flex items-center space-x-4">
            <button className="text-gray-300 hover:text-white hover:bg-[#444654] p-2 rounded-md">
              <SlidersHorizontal className="h-5 w-5" />
            </button>
            <div className="relative">
              <button className="relative text-gray-300 hover:text-white hover:bg-[#444654] p-2 rounded-md">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-[#10a37f] rounded-full"></span>
              </button>
            </div>
            <div className="flex items-center">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                <AvatarFallback className="bg-[#444654] text-white">JD</AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 ml-1 text-gray-400" />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Category Sidebar */}
          <div className="w-64 border-r border-gray-700 bg-[#202123] flex-col hidden md:flex">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-medium text-white">Categories</h3>
              <button className="text-gray-400 hover:text-white p-1 rounded">
                <PlusCircle className="h-4 w-4" />
              </button>
            </div>
            <div className="p-2">
              <button 
                onClick={() => setSelectedCategory(null)} 
                className={`w-full flex items-center justify-between p-2 rounded-md mb-1 ${!selectedCategory ? 'bg-[#343541] text-white' : 'text-gray-300 hover:bg-[#343541] hover:text-white'}`}
              >
                <div className="flex items-center">
                  <Layers className="h-4 w-4 mr-2" />
                  <span>All Categories</span>
                </div>
                <Badge className="bg-[#444654] text-gray-300">{documents.length}</Badge>
              </button>
              
              {categories.map(category => (
                <button 
                  key={category.id}
                  onClick={() => setSelectedCategory(category.name)}
                  className={`w-full flex items-center justify-between p-2 rounded-md mb-1 ${selectedCategory === category.name ? 'bg-[#343541] text-white' : 'text-gray-300 hover:bg-[#343541] hover:text-white'}`}
                >
                  <div className="flex items-center">
                    <Folder className="h-4 w-4 mr-2" />
                    <span>{category.name}</span>
                  </div>
                  <Badge className="bg-[#444654] text-gray-300">{category.count}</Badge>
                </button>
              ))}
            </div>
            
            <div className="mt-6 p-4 border-t border-gray-700">
              <h3 className="font-medium text-white mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-[#10a37f]/20 text-[#10a37f] hover:bg-[#10a37f]/30 cursor-pointer">AI</Badge>
                <Badge className="bg-[#10a37f]/20 text-[#10a37f] hover:bg-[#10a37f]/30 cursor-pointer">Data Science</Badge>
                <Badge className="bg-[#10a37f]/20 text-[#10a37f] hover:bg-[#10a37f]/30 cursor-pointer">JavaScript</Badge>
                <Badge className="bg-[#10a37f]/20 text-[#10a37f] hover:bg-[#10a37f]/30 cursor-pointer">Product</Badge>
                <Badge className="bg-[#10a37f]/20 text-[#10a37f] hover:bg-[#10a37f]/30 cursor-pointer">Business</Badge>
                <Badge className="bg-[#10a37f]/20 text-[#10a37f] hover:bg-[#10a37f]/30 cursor-pointer">ML</Badge>
                <Badge className="bg-[#10a37f]/20 text-[#10a37f] hover:bg-[#10a37f]/30 cursor-pointer">Web</Badge>
              </div>
            </div>
            
            <div className="mt-auto p-4 border-t border-gray-700">
              <div className="bg-[#10a37f]/10 rounded-md p-3 border border-[#10a37f]/20">
                <p className="text-sm text-[#10a37f] font-medium mb-2">TwinBot Research Assistant</p>
                <p className="text-xs text-gray-300 mb-3">Let me help summarize articles, extract key insights, or find related research.</p>
                <button className="w-full bg-[#10a37f] hover:bg-[#0e8f6f] text-white text-sm py-1.5 rounded-md flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 mr-1.5" />
                  Ask Research Assistant
                </button>
              </div>
            </div>
          </div>
          
          {/* Main Content Area */}
          <div className="flex-1 overflow-auto">
            {/* Tabs */}
            <div className="border-b border-gray-700 px-6 bg-[#343541]">
              <div className="flex space-x-6">
                <button 
                  onClick={() => setActiveTab('all')}
                  className={`py-4 relative ${activeTab === 'all' ? 'text-white font-medium' : 'text-gray-400 hover:text-gray-300'}`}
                >
                  All Documents
                  {activeTab === 'all' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10a37f]"></div>}
                </button>
                <button 
                  onClick={() => setActiveTab('articles')}
                  className={`py-4 relative ${activeTab === 'articles' ? 'text-white font-medium' : 'text-gray-400 hover:text-gray-300'}`}
                >
                  Articles
                  {activeTab === 'articles' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10a37f]"></div>}
                </button>
                <button 
                  onClick={() => setActiveTab('notes')}
                  className={`py-4 relative ${activeTab === 'notes' ? 'text-white font-medium' : 'text-gray-400 hover:text-gray-300'}`}
                >
                  My Notes
                  {activeTab === 'notes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10a37f]"></div>}
                </button>
                <button 
                  onClick={() => setActiveTab('bookmarks')}
                  className={`py-4 relative ${activeTab === 'bookmarks' ? 'text-white font-medium' : 'text-gray-400 hover:text-gray-300'}`}
                >
                  Bookmarks
                  {activeTab === 'bookmarks' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10a37f]"></div>}
                </button>
              </div>
            </div>
            
            {/* Actions Row */}
            <div className="p-4 flex items-center justify-between border-b border-gray-700 bg-[#343541]">
              <div className="flex items-center">
                <button className="text-white bg-[#10a37f] hover:bg-[#0e8f6f] rounded-md px-3 py-1.5 flex items-center text-sm">
                  <PlusCircle className="h-4 w-4 mr-1.5" />
                  Add Research
                </button>
                <div className="h-6 w-px bg-gray-700 mx-3"></div>
                <button className="text-gray-300 hover:text-white p-1.5 rounded">
                  <Filter className="h-4 w-4" />
                </button>
                <span className="text-gray-400 text-sm ml-2">
                  {filteredDocuments.length} items
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <select className="bg-[#202123] border-gray-700 text-white text-sm rounded-md focus:ring-[#10a37f] focus:border-[#10a37f]">
                  <option>Recent First</option>
                  <option>Oldest First</option>
                  <option>A-Z</option>
                  <option>Z-A</option>
                </select>
              </div>
            </div>
            
            {/* Document List */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {filteredDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400">No research documents found matching your criteria.</p>
                    <button className="mt-4 bg-[#10a37f] hover:bg-[#0e8f6f] text-white px-4 py-2 rounded-md">
                      Add New Research
                    </button>
                  </div>
                ) : (
                  filteredDocuments.map(doc => (
                    <div key={doc.id} className="bg-[#444654] hover:bg-[#4d4f65] border border-gray-700 rounded-lg p-4 transition-colors cursor-pointer">
                      <div className="flex justify-between mb-2 items-start">
                        <h3 className="text-white font-medium">{doc.title}</h3>
                        <div className="flex space-x-1">
                          <button className={`p-1 rounded hover:bg-[#343541] ${doc.starred ? 'text-[#FFD700]' : 'text-gray-400 hover:text-[#FFD700]'}`}>
                            <Star className="h-4 w-4" />
                          </button>
                          <button className={`p-1 rounded hover:bg-[#343541] ${doc.saved ? 'text-[#10a37f]' : 'text-gray-400 hover:text-[#10a37f]'}`}>
                            <Bookmark className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-gray-300 text-sm mb-3">{doc.excerpt}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        {doc.tags.map((tag, i) => (
                          <Badge key={i} className="bg-[#343541] text-gray-300 hover:bg-[#4d4f65]">{tag}</Badge>
                        ))}
                      </div>
                      
                      <div className="mt-2 pt-2 border-t border-gray-700 flex items-center justify-between">
                        <div className="flex items-center text-xs text-gray-400">
                          <span className="mr-3 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {doc.dateAdded}
                          </span>
                          <span>{doc.source}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {doc.progress < 100 && (
                            <div className="flex items-center">
                              <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-[#10a37f]"
                                  style={{ width: `${doc.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-400 ml-1.5">{doc.progress}%</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <button className="p-1 text-gray-400 hover:text-white hover:bg-[#343541] rounded">
                              <Share2 className="h-3.5 w-3.5" />
                            </button>
                            <button className="p-1 text-gray-400 hover:text-red-500 hover:bg-[#343541] rounded">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
} 