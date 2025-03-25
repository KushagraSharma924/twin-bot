"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Zap, Loader2 } from "lucide-react"
import { login, getUser } from "@/lib/api"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Check if user is already logged in
  useEffect(() => {
    const user = getUser()
    if (user) {
      // User is already logged in, redirect to dashboard
      router.push('/dashboard')
    } else {
      setIsCheckingAuth(false)
    }
  }, [router])

  // Extract username from email
  const getUsernameFromEmail = (email: string) => {
    return email.split('@')[0];
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await login(email, password)
      
      // Store the session in localStorage
      localStorage.setItem('session', JSON.stringify(response.session))
      
      // Get username from email if no name is provided in metadata
      const username = response.user.name || getUsernameFromEmail(email);
      
      // Store user info including name from metadata or email username
      localStorage.setItem('user', JSON.stringify({
        id: response.user.id,
        email: response.user.email,
        name: username
      }))

      // Check if email is verified
      if (!response.user.email_confirmed_at) {
        toast.error("Please verify your email before logging in")
        return
      }

      toast.success("Logged in successfully!")
      router.push("/dashboard")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to login")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#202123] px-4">
      {isCheckingAuth ? (
        <div className="flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-[#10a37f]" />
          <p className="text-white">Checking authentication status...</p>
        </div>
      ) : (
        <div className="w-full max-w-md space-y-8">
          <div className="flex justify-center">
            <Link href="/" className="flex items-center gap-2 text-white">
              <Zap className="h-8 w-8 text-[#10a37f]" />
              <span className="text-2xl font-semibold">TwinBot</span>
            </Link>
          </div>

          <Card className="border-0 shadow-lg bg-[#2c2c2c] text-white">
            <CardHeader className="space-y-2 pb-2">
              <CardTitle className="text-2xl font-bold text-center text-white">Welcome back</CardTitle>
              <CardDescription className="text-center text-gray-400">
                Log in to your TwinBot account to continue
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2.5">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-300">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 bg-[#343541] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#10a37f] focus:ring-1 focus:ring-[#10a37f] focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-300">
                      Password
                    </Label>
                    <Link href="#" className="text-xs font-medium text-[#10a37f] hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-[#343541] border-gray-700 text-white focus:border-[#10a37f] focus:ring-1 focus:ring-[#10a37f] focus:outline-none"
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="remember" className="data-[state=checked]:bg-[#10a37f] data-[state=checked]:border-[#10a37f] border-gray-700" />
                  <label
                    htmlFor="remember"
                    className="text-sm font-medium text-gray-400 cursor-pointer"
                  >
                    Remember me for 30 days
                  </label>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 font-medium bg-[#10a37f] hover:bg-[#0e8f6f] text-white transition-colors" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Log in"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center border-t border-gray-700 py-4 mt-2">
              <div className="text-sm text-gray-400">
                Don't have an account?{" "}
                <Link href="/signup" className="font-medium text-[#10a37f] hover:underline">
                  Sign up
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}

