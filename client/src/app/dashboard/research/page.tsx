"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import Sidebar from "@/components/sidebar"
import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  Bookmark,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  Layers,
  SlidersHorizontal,
  Star,
  ThumbsUp,
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
      <Sidebar activePage="research" />

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
          {/* Categories Sidebar */}
          <div className="w-64 border-r border-gray-700 bg-[#202123] flex flex-col">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Categories</h2>
                <button className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-[#343541]">
                  <PlusCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="px-3 space-y-1">
                <button 
                  onClick={() => setSelectedCategory(null)} 
                  className={`w-full flex items-center justify-between p-2 rounded-md text-left ${!selectedCategory ? 'bg-[#343541] text-white' : 'text-gray-400 hover:bg-[#343541] hover:text-white'}`}
                >
                  <div className="flex items-center">
                    <Layers className="h-4 w-4 mr-3" />
                    <span>All Categories</span>
                  </div>
                  <Badge className="bg-gray-700 text-gray-300">{documents.length}</Badge>
                </button>
                
                {categories.map(category => (
                  <button 
                    key={category.id}
                    onClick={() => setSelectedCategory(category.name)}
                    className={`w-full flex items-center justify-between p-2 rounded-md text-left ${selectedCategory === category.name ? 'bg-[#343541] text-white' : 'text-gray-400 hover:bg-[#343541] hover:text-white'}`}
                  >
                    <div className="flex items-center">
                      <Folder className="h-4 w-4 mr-3" />
                      <span>{category.name}</span>
                    </div>
                    <Badge className="bg-gray-700 text-gray-300">{category.count}</Badge>
                  </button>
                ))}
              </div>
              
              <div className="px-3 mt-6 pt-4 border-t border-gray-700">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Views</h3>
                <div className="space-y-1">
                  <button 
                    onClick={() => setActiveTab('all')} 
                    className={`w-full flex items-center p-2 rounded-md text-left ${activeTab === 'all' ? 'bg-[#343541] text-white' : 'text-gray-400 hover:bg-[#343541] hover:text-white'}`}
                  >
                    <Layers className="h-4 w-4 mr-3" />
                    <span>All Documents</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('articles')} 
                    className={`w-full flex items-center p-2 rounded-md text-left ${activeTab === 'articles' ? 'bg-[#343541] text-white' : 'text-gray-400 hover:bg-[#343541] hover:text-white'}`}
                  >
                    <ExternalLink className="h-4 w-4 mr-3" />
                    <span>Articles</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('notes')} 
                    className={`w-full flex items-center p-2 rounded-md text-left ${activeTab === 'notes' ? 'bg-[#343541] text-white' : 'text-gray-400 hover:bg-[#343541] hover:text-white'}`}
                  >
                    <PlusCircle className="h-4 w-4 mr-3" />
                    <span>My Notes</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('bookmarks')} 
                    className={`w-full flex items-center p-2 rounded-md text-left ${activeTab === 'bookmarks' ? 'bg-[#343541] text-white' : 'text-gray-400 hover:bg-[#343541] hover:text-white'}`}
                  >
                    <Bookmark className="h-4 w-4 mr-3" />
                    <span>Bookmarks</span>
                  </button>
                </div>
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t border-gray-700">
              <button className="w-full flex items-center justify-center p-2 text-[#10a37f] hover:bg-[#10a37f]/10 rounded-md transition-colors">
                <PlusCircle className="h-4 w-4 mr-2" />
                <span>New Research Note</span>
              </button>
            </div>
          </div>

          {/* Document List */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Filters */}
            <div className="bg-[#343541] border-b border-gray-700 p-4 flex items-center justify-between">
              <div className="flex items-center">
                <button className="flex items-center text-white bg-[#444654] px-3 py-1.5 rounded-md">
                  <Filter className="h-4 w-4 mr-2" />
                  <span>Filter</span>
                  <ChevronDown className="h-4 w-4 ml-2" />
                </button>
                <div className="ml-4 flex space-x-2">
                  <button className="px-3 py-1.5 rounded-md text-gray-400 hover:bg-[#444654] hover:text-white">
                    Newest
                  </button>
                  <button className="px-3 py-1.5 rounded-md text-gray-400 hover:bg-[#444654] hover:text-white">
                    Relevance
                  </button>
                </div>
              </div>
              <div className="text-gray-400 text-sm">
                {filteredDocuments.length} documents
              </div>
            </div>
            
            {/* Documents */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {filteredDocuments.map(doc => (
                  <div 
                    key={doc.id}
                    className="bg-[#444654] border border-gray-700 rounded-lg p-4 hover:border-gray-500 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-medium text-white hover:text-[#10a37f] transition-colors">
                        {doc.title}
                      </h3>
                      <div className="flex space-x-1">
                        <button className={`p-1 rounded-md ${doc.saved ? 'text-[#10a37f]' : 'text-gray-400 hover:text-[#10a37f]'}`}>
                          <Bookmark className="h-4 w-4" />
                        </button>
                        <button className={`p-1 rounded-md ${doc.starred ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`}>
                          <Star className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm mb-3">{doc.excerpt}</p>
                    <div className="flex items-center text-sm text-gray-400 mb-3">
                      <span className="bg-[#343541] px-2 py-0.5 rounded">{doc.category}</span>
                      <span className="mx-2">•</span>
                      <span>{doc.source}</span>
                      <span className="mx-2">•</span>
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      <span>{doc.dateAdded}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {doc.tags.map(tag => (
                        <Badge key={tag} className="bg-[#343541] hover:bg-[#10a37f]/20 text-gray-300 hover:text-[#10a37f] cursor-pointer">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="w-2/3 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#10a37f]" 
                          style={{ width: `${doc.progress}%` }}
                        ></div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-[#343541]">
                          <Share2 className="h-4 w-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-[#343541]">
                          <ThumbsUp className="h-4 w-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-[#343541]">
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
} 