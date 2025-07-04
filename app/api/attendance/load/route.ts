import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "Session ID is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("attendance_sessions")
      .select("names, attendance_data")
      .eq("id", sessionId)
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ success: false, error: "Failed to load data" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        names: data.names || [],
        attendance: data.attendance_data || {},
      },
    })
  } catch (error) {
    console.error("Load error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
