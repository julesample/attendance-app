interface AttendanceData {
  names: string[]
  attendance: {
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
}

export async function saveAttendanceData(data: AttendanceData) {
  try {
    // Save to Vercel Blob
    const response = await fetch("/api/attendance/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to save to cloud storage")
    }

    // Also save to localStorage as backup
    localStorage.setItem("attendance-backup", JSON.stringify(data))

    return { success: true }
  } catch (error) {
    console.error("Error saving attendance data:", error)
    // Fallback to localStorage only
    localStorage.setItem("attendance-backup", JSON.stringify(data))
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function loadAttendanceData(): Promise<AttendanceData> {
  try {
    // Try to load from Vercel Blob first
    const response = await fetch("/api/attendance/load")

    if (response.ok) {
      const data = await response.json()
      // Validate the data structure
      if (data && typeof data === "object" && Array.isArray(data.names) && typeof data.attendance === "object") {
        return data
      }
    }
  } catch (error) {
    console.error("Error loading from cloud storage:", error)
  }

  // Fallback to localStorage
  try {
    const localData = localStorage.getItem("attendance-backup")
    if (localData) {
      const parsed = JSON.parse(localData)
      // Validate the local data structure too
      if (
        parsed &&
        typeof parsed === "object" &&
        Array.isArray(parsed.names) &&
        typeof parsed.attendance === "object"
      ) {
        return parsed
      }
    }
  } catch (error) {
    console.error("Error loading from localStorage:", error)
  }

  // Return empty data structure
  return {
    names: [],
    attendance: {},
  }
}
