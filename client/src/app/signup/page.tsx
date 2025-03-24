"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Zap, Loader2 } from "lucide-react"

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate account creation
    setTimeout(() => {
      setIsLoading(false)
      router.push("/dashboard")
    }, 1500)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#202123] px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Link href="/" className="flex items-center gap-2 text-white">
            <Zap className="h-8 w-8 text-[#10a37f]" />
            <span className="text-2xl font-semibold">TwinBot</span>
          </Link>
        </div>

        <Card className="border-0 shadow-lg bg-[#2c2c2c] text-white">
          <CardHeader className="space-y-2 pb-2">
            <CardTitle className="text-2xl font-bold text-center text-white">Create your account</CardTitle>
            <CardDescription className="text-center text-gray-400">
              Get started with TwinBot to boost your productivity
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2.5">
                <Label htmlFor="name" className="text-sm font-medium text-gray-300">
                  Full name
                </Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 input-focus bg-[#343541] border-gray-700 text-white placeholder:text-gray-500"
                  required
                />
              </div>
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
                  className="h-11 input-focus bg-[#343541] border-gray-700 text-white placeholder:text-gray-500"
                  required
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="password" className="text-sm font-medium text-gray-300">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 input-focus bg-[#343541] border-gray-700 text-white"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters long</p>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="terms" className="mt-1 data-[state=checked]:bg-[#10a37f] data-[state=checked]:border-[#10a37f] border-gray-700" required />
                <label
                  htmlFor="terms"
                  className="text-sm text-gray-400 cursor-pointer"
                >
                  I agree to the{" "}
                  <Link href="#" className="font-medium text-[#10a37f] hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="#" className="font-medium text-[#10a37f] hover:underline">
                    Privacy Policy
                  </Link>
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
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-gray-700 py-4 mt-2">
            <div className="text-sm text-gray-400">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-[#10a37f] hover:underline">
                Log in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

