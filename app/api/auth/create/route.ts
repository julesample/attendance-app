import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { hashPassword } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: "Invalid email format" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters long" },
        { status: 400 },
      )
    }

    // Check if email already exists
    const { data: existingSession } = await supabase
      .from("attendance_sessions")
      .select("id")
      .eq("email", email.toLowerCase())
      .single()

    if (existingSession) {
      return NextResponse.json({ success: false, error: "Email already registered" }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)

    const { data, error } = await supabase
      .from("attendance_sessions")
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        names: [],
        attendance_data: {},
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ success: false, error: "Failed to create account" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      sessionId: data.id,
      email: data.email,
      message: "Account created successfully",
    })
  } catch (error) {
    console.error("Create account error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
