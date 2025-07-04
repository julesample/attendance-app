import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, names, attendance } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "Session ID is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("attendance_sessions")
      .update({
        names: names || [],
        attendance_data: attendance || {},
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ success: false, error: "Failed to save data" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Data saved successfully to database",
    })
  } catch (error) {
    console.error("Save error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
