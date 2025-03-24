import Link from "next/link"
import { ArrowRight, Calendar, Mail, Search, Zap } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#202123] text-white">
      {/* Navigation */}
      <header className="border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="h-6 w-6 text-[#10a37f]" />
            <span className="text-xl font-bold text-white">TwinBot</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="#features" className="text-sm font-medium text-gray-300 hover:text-[#10a37f]">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium text-gray-300 hover:text-[#10a37f]">
              How It Works
            </Link>
            <Link href="#technology" className="text-sm font-medium text-gray-300 hover:text-[#10a37f]">
              Technology
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <Link href="/login" className="text-white border border-gray-600 hover:bg-[#343541] hover:text-white px-3 py-1.5 rounded-md text-sm font-medium">
              Log In
            </Link>
            <Link href="/signup" className="bg-[#10a37f] text-white hover:bg-[#0e8f6f] px-3 py-1.5 rounded-md text-sm font-medium">
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-[#202123] to-[#343541]">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">AI-Powered Digital Twin for Productivity</h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-3xl mx-auto">
            Automate your emails, meetings, and research with an AI that learns and adapts to your workflow.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="px-8 py-3 bg-[#10a37f] text-white hover:bg-[#0e8f6f] rounded-md font-medium inline-flex items-center">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link href="#how-it-works" className="px-8 py-3 text-white border border-gray-600 hover:bg-[#444654] rounded-md font-medium">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-[#343541]">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16 text-white">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-10">
            <div className="flex flex-col items-center text-center p-6 rounded-lg border border-gray-700 bg-[#444654]">
              <div className="bg-[#10a37f]/20 p-3 rounded-full mb-6">
                <Mail className="h-8 w-8 text-[#10a37f]" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">Context-aware Email Replies</h3>
              <p className="text-gray-400">
                AI learns your writing style and communication patterns to draft personalized responses.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-lg border border-gray-700 bg-[#444654]">
              <div className="bg-[#10a37f]/20 p-3 rounded-full mb-6">
                <Calendar className="h-8 w-8 text-[#10a37f]" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">Automated Meeting Scheduling</h3>
              <p className="text-gray-400">
                AI sets up meetings by analyzing your availability, preferences, and priorities.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-lg border border-gray-700 bg-[#444654]">
              <div className="bg-[#10a37f]/20 p-3 rounded-full mb-6">
                <Search className="h-8 w-8 text-[#10a37f]" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">Smart Research Assistant</h3>
              <p className="text-gray-400">
                AI curates and summarizes relevant research articles, news, and information based on your preferences.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-[#202123]">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16 text-white">How It Works</h2>
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#10a37f] flex items-center justify-center text-white font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-white">User Interaction</h3>
                    <p className="text-gray-400">
                      AI observes your interactions with emails, calendars, and research tasks to learn your patterns.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#10a37f] flex items-center justify-center text-white font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-white">AI Model Training</h3>
                    <p className="text-gray-400">
                      Uses TensorFlow-based reinforcement learning to adapt to your behavior and improve over time.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#10a37f] flex items-center justify-center text-white font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-white">Automated Task Execution</h3>
                    <p className="text-gray-400">
                      AI generates personalized email replies, schedules meetings, and filters relevant research.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#10a37f] flex items-center justify-center text-white font-bold">
                    4
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-white">User Feedback Loop</h3>
                    <p className="text-gray-400">
                      The system learns from your corrections and refines future responses, improving over time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-[#343541] p-6 rounded-lg border border-gray-700 shadow-md">
              <div className="aspect-video bg-[#444654] rounded-md flex items-center justify-center">
                <img
                  src="/placeholder.svg?height=400&width=600"
                  alt="TwinBot workflow diagram"
                  className="rounded-md"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section id="technology" className="py-20 bg-[#343541]">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16 text-white">Technology Stack</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-lg border border-gray-700 bg-[#444654] text-center">
              <h3 className="font-semibold mb-2 text-white">Frontend</h3>
              <p className="text-gray-400">Next.js with Tailwind CSS</p>
            </div>
            <div className="p-6 rounded-lg border border-gray-700 bg-[#444654] text-center">
              <h3 className="font-semibold mb-2 text-white">Backend</h3>
              <p className="text-gray-400">Node.js with Express.js</p>
            </div>
            <div className="p-6 rounded-lg border border-gray-700 bg-[#444654] text-center">
              <h3 className="font-semibold mb-2 text-white">Database</h3>
              <p className="text-gray-400">Firebase Firestore / Supabase</p>
            </div>
            <div className="p-6 rounded-lg border border-gray-700 bg-[#444654] text-center">
              <h3 className="font-semibold mb-2 text-white">Authentication</h3>
              <p className="text-gray-400">Firebase Auth / Supabase Auth</p>
            </div>
            <div className="p-6 rounded-lg border border-gray-700 bg-[#444654] text-center">
              <h3 className="font-semibold mb-2 text-white">NLP Tasks</h3>
              <p className="text-gray-400">OpenAI API</p>
            </div>
            <div className="p-6 rounded-lg border border-gray-700 bg-[#444654] text-center">
              <h3 className="font-semibold mb-2 text-white">Machine Learning</h3>
              <p className="text-gray-400">TensorFlow (Reinforcement Learning)</p>
            </div>
            <div className="p-6 rounded-lg border border-gray-700 bg-[#444654] text-center">
              <h3 className="font-semibold mb-2 text-white">Task Automation</h3>
              <p className="text-gray-400">Google Calendar API</p>
            </div>
            <div className="p-6 rounded-lg border border-gray-700 bg-[#444654] text-center">
              <h3 className="font-semibold mb-2 text-white">Browser Insight</h3>
              <p className="text-gray-400">Chrome Extension</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#10a37f]">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-white">Ready to Boost Your Productivity?</h2>
          <p className="text-xl mb-10 max-w-2xl mx-auto text-white opacity-90">
            Join TwinBot today and experience the power of AI-driven automation in your daily workflow.
          </p>
          <Link href="/signup" className="px-8 py-3 bg-white text-[#10a37f] hover:bg-gray-100 rounded-md font-medium inline-block">
            Get Started Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-gray-700 bg-[#202123]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Zap className="h-5 w-5 text-[#10a37f]" />
              <span className="font-bold text-white">TwinBot</span>
            </div>
            <div className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} SemiColons Team. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

