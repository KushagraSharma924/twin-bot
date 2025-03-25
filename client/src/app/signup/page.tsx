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
import { signup, checkVerificationStatus, resendVerification, getUser } from "@/lib/api"
import { toast } from "sonner"

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)
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
      // Use provided name or email username as fallback
      const username = name || getUsernameFromEmail(email);
      const response = await signup(email, password, username)
      setVerificationSent(true)
      
      // Store the user for verification purposes
      localStorage.setItem('pendingVerification', JSON.stringify({
        id: response.user.id,
        email: response.user.email,
        name: response.user.name || username
      }))
      
      toast.success("Account created! Please check your email to verify your account.")
      
      // Check verification status periodically
      const checkStatus = async () => {
        try {
          const status = await checkVerificationStatus(email)
          if (status.verified) {
            toast.success("Email verified! You can now log in.")
            router.push("/login")
          } else {
            // Check again in 5 seconds
            setTimeout(checkStatus, 5000)
          }
        } catch (error) {
          console.error("Error checking verification status:", error)
        }
      }
      
      checkStatus()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign up")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    try {
      await resendVerification(email)
      toast.success("Verification email resent!")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resend verification email")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#202123] px-4">
      {isCheckingAuth ? (
        <div className="flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-[#10a37f]" />
          <p className="text-white">Checking authentication status...</p>
        </div>
      ) : (
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center space-x-2">
              <Zap className="h-6 w-6 text-[#10A37F]" />
              <span className="text-xl font-bold text-white">TwinBot</span>
            </Link>
          </div>

          <Card className="bg-[#2c2c2c] border-[#444654]">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center text-white">Create an account</CardTitle>
              <CardDescription className="text-center text-gray-400">
                Enter your information to create your TwinBot account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {verificationSent ? (
                <div className="space-y-4 text-center">
                  <p className="text-white">Please check your email to verify your account.</p>
                  <p className="text-sm text-gray-400">Didn't receive the email?</p>
                  <Button
                    onClick={handleResendVerification}
                    variant="outline"
                    className="w-full"
                  >
                    Resend verification email
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-[#343541] border-[#444654] text-white"
                    />
                    <p className="text-xs text-gray-400">This will be used as your display name</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-[#343541] border-[#444654] text-white"
                    />
                    <p className="text-xs text-gray-400">If no name is provided, we'll use the part before @ in your email</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-[#343541] border-[#444654] text-white"
                    />
                    <p className="text-xs text-gray-400">Password must be at least 8 characters long</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="terms" required />
                    <label
                      htmlFor="terms"
                      className="text-sm font-medium leading-none text-gray-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I agree to the{" "}
                      <Link href="#" className="text-[#10A37F] hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="#" className="text-[#10A37F] hover:underline">
                        Privacy Policy
                      </Link>
                    </label>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-[#10A37F] text-white hover:bg-[#0D8A6A]" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Sign up"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
            <CardFooter className="flex justify-center">
              <div className="text-sm text-gray-400">
                Already have an account?{" "}
                <Link href="/login" className="text-[#10A37F] hover:underline">
                  Log in
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}

