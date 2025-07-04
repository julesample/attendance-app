import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface AttendanceSession {
  id: string
  email: string
  password_hash: string
  names: string[]
  attendance_data: {
    [date: string]: {
      [name: string]:
        | {
            status: "present" | "absent"
            note?: string
          }
        | "present"
        | "absent"
    }
  }
  created_at: string
  updated_at: string
}
