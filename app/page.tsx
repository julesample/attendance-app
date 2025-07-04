"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Users, UserCheck, UserX, Plus, Trash2, Database, LogOut, Loader2, Menu } from "lucide-react"
import { format } from "date-fns"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, BarChart3 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { PasswordDialog } from "@/components/password-dialog"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface AttendanceRecord {
  [date: string]: {
    [name: string]:
      | {
          status: "present" | "absent"
          note?: string
        }
      | "present"
      | "absent" // backward compatibility
  }
}

export default function AttendanceSheet() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [names, setNames] = useState<string[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord>({})
  const [bulkNames, setBulkNames] = useState("")
  const [newName, setNewName] = useState("")
  const [showBulkInput, setShowBulkInput] = useState(false)
  const [selectedMember, setSelectedMember] = useState<string>("all")
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteText, setNoteText] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { toast } = useToast()

  const handleAuthenticated = (newSessionId: string, email: string, data: { names: string[]; attendance: any }) => {
    setSessionId(newSessionId)
    setUserEmail(email)
    setNames(data.names)
    setAttendance(data.attendance)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setSessionId(null)
    setUserEmail("")
    setNames([])
    setAttendance({})
    setMobileMenuOpen(false)
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    })
  }

  const saveData = async () => {
    if (!sessionId) return

    setIsSaving(true)
    try {
      const response = await fetch("/api/attendance/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, names, attendance }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Data saved",
          description: "Your attendance data has been saved to the database",
        })
      } else {
        toast({
          title: "Save failed",
          description: result.error || "Failed to save data",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Save error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Auto-save when data changes
  useEffect(() => {
    if (isAuthenticated && sessionId && (names.length > 0 || Object.keys(attendance).length > 0)) {
      const timeoutId = setTimeout(() => {
        saveData()
      }, 2000) // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timeoutId)
    }
  }, [names, attendance, isAuthenticated, sessionId])

  if (!isAuthenticated) {
    return <PasswordDialog onAuthenticated={handleAuthenticated} />
  }

  const dateKey = format(selectedDate, "yyyy-MM-dd")
  const todayAttendance = attendance[dateKey] || {}

  const addBulkNames = () => {
    const newNames = bulkNames
      .split("\n")
      .map((name) => name.trim())
      .filter((name) => name && !names.includes(name))

    setNames((prev) => [...prev, ...newNames])
    setBulkNames("")
    setShowBulkInput(false)
  }

  const addSingleName = () => {
    if (newName.trim() && !names.includes(newName.trim())) {
      setNames((prev) => [...prev, newName.trim()])
      setNewName("")
    }
  }

  const removeName = (nameToRemove: string) => {
    setNames((prev) => prev.filter((name) => name !== nameToRemove))
    // Also remove from all attendance records
    setAttendance((prev) => {
      const updated = { ...prev }
      Object.keys(updated).forEach((date) => {
        delete updated[date][nameToRemove]
      })
      return updated
    })
  }

  const getAttendanceStatus = (name: string) => {
    const record = todayAttendance[name]
    if (typeof record === "string") return record
    return record?.status || undefined
  }

  const getAttendanceNote = (name: string) => {
    const record = todayAttendance[name]
    if (typeof record === "object") return record.note || ""
    return ""
  }

  const updateNote = (name: string, note: string) => {
    const currentStatus = getAttendanceStatus(name)
    if (currentStatus) {
      setAttendance((prev) => ({
        ...prev,
        [dateKey]: {
          ...prev[dateKey],
          [name]: {
            status: currentStatus,
            note: note.trim(),
          },
        },
      }))
    }
    setEditingNote(null)
    setNoteText("")
  }

  const markAttendance = (name: string, status: "present" | "absent") => {
    setAttendance((prev) => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        [name]: {
          status,
          note: getAttendanceNote(name) || "",
        },
      },
    }))
  }

  const getAttendanceStats = () => {
    const total = names.length
    const present = names.filter((name) => getAttendanceStatus(name) === "present").length
    const absent = names.filter((name) => getAttendanceStatus(name) === "absent").length
    const unmarked = total - present - absent

    return { total, present, absent, unmarked }
  }

  const stats = getAttendanceStats()

  const exportToCSV = () => {
    const csvData = []
    const dates = Object.keys(attendance).sort()

    // Header row
    const headers = [
      "Name",
      ...dates.flatMap((date) => [date, `${date} Note`]),
      "Total Present",
      "Total Absent",
      "Attendance %",
    ]
    csvData.push(headers.join(","))

    // Data rows
    names.forEach((name) => {
      const row = [name]
      let totalPresent = 0
      let totalAbsent = 0

      dates.forEach((date) => {
        const record = attendance[date]?.[name]
        let status = "unmarked"
        let note = ""

        if (typeof record === "string") {
          status = record
        } else if (record) {
          status = record.status
          note = record.note || ""
        }

        row.push(status, `"${note.replace(/"/g, '""')}"`)
        if (status === "present") totalPresent++
        if (status === "absent") totalAbsent++
      })

      const total = totalPresent + totalAbsent
      const percentage = total > 0 ? ((totalPresent / total) * 100).toFixed(1) : "0"

      row.push(totalPresent.toString(), totalAbsent.toString(), `${percentage}%`)
      csvData.push(row.join(","))
    })

    const csvContent = csvData.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `attendance-with-notes-${format(new Date(), "yyyy-MM-dd")}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const getAttendanceChartData = () => {
    if (selectedMember === "all") {
      // Overall attendance by date
      return Object.keys(attendance)
        .sort()
        .map((date) => {
          const dayAttendance = attendance[date]
          const present = Object.values(dayAttendance).filter((status) => {
            return typeof status === "string" ? status === "present" : status?.status === "present"
          }).length
          const absent = Object.values(dayAttendance).filter((status) => {
            return typeof status === "string" ? status === "absent" : status?.status === "absent"
          }).length
          return {
            date: format(new Date(date), "MMM dd"),
            present,
            absent,
            total: present + absent,
          }
        })
    } else {
      // Individual member attendance over time
      return Object.keys(attendance)
        .sort()
        .map((date) => {
          const record = attendance[date]?.[selectedMember]
          const status = typeof record === "string" ? record : record?.status || "unmarked"
          return {
            date: format(new Date(date), "MMM dd"),
            status,
            present: status === "present" ? 1 : 0,
            absent: status === "absent" ? 1 : 0,
          }
        })
        .filter((item) => item.status !== "unmarked")
    }
  }

  const getMemberAttendanceStats = () => {
    return names
      .map((name) => {
        let totalPresent = 0
        let totalAbsent = 0

        Object.values(attendance).forEach((dayAttendance) => {
          const record = dayAttendance[name]
          const status = typeof record === "string" ? record : record?.status
          if (status === "present") totalPresent++
          if (status === "absent") totalAbsent++
        })

        const total = totalPresent + totalAbsent
        const percentage = total > 0 ? (totalPresent / total) * 100 : 0

        return {
          name,
          present: totalPresent,
          absent: totalAbsent,
          total,
          percentage: Math.round(percentage),
        }
      })
      .sort((a, b) => b.percentage - a.percentage)
  }

  const chartData = getAttendanceChartData()
  const memberStats = getMemberAttendanceStats()

  // Mobile Navigation Component
  const MobileNav = () => (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <div className="flex flex-col space-y-4 mt-6">
          <div className="text-center pb-4 border-b">
            <h3 className="font-semibold">Pagsanghan Ballers</h3>
            <p className="text-sm text-muted-foreground">{userEmail}</p>
          </div>

          <Button
            variant={showAnalytics ? "outline" : "default"}
            onClick={() => {
              setShowAnalytics(false)
              setMobileMenuOpen(false)
            }}
            className="justify-start"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Attendance
          </Button>

          <Button
            variant={showAnalytics ? "default" : "outline"}
            onClick={() => {
              setShowAnalytics(true)
              setMobileMenuOpen(false)
            }}
            className="justify-start"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              exportToCSV()
              setMobileMenuOpen(false)
            }}
            disabled={names.length === 0}
            className="justify-start"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              saveData()
              setMobileMenuOpen(false)
            }}
            disabled={isSaving}
            className="justify-start"
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
            {isSaving ? "Saving..." : "Save to DB"}
          </Button>

          <Button variant="outline" onClick={handleLogout} className="justify-start text-red-600 hover:text-red-700">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Pagsanghan Ballers</h1>
                <p className="text-sm sm:text-base text-muted-foreground">Attendance Management System</p>
              </div>
              <MobileNav />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex justify-center gap-2 flex-wrap">
              <Button variant={showAnalytics ? "outline" : "default"} onClick={() => setShowAnalytics(false)}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                Attendance
              </Button>
              <Button variant={showAnalytics ? "default" : "outline"} onClick={() => setShowAnalytics(true)}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button variant="outline" onClick={exportToCSV} disabled={names.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={saveData} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
                {isSaving ? "Saving..." : "Save to DB"}
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>

            {/* User Info & Status */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
              <Badge variant="secondary" className="text-xs">
                <Database className="h-3 w-3 mr-1" />
                {userEmail}
              </Badge>
              <Badge variant="default" className="text-xs">
                <Database className="h-3 w-3 mr-1" />
                Connected to Database
              </Badge>
            </div>
          </div>

          {/* Analytics Section */}
          {showAnalytics && names.length > 0 && (
            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Attendance Analytics</CardTitle>
                  <CardDescription>View attendance patterns and statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                    <Label htmlFor="member-select" className="text-sm font-medium">
                      View data for:
                    </Label>
                    <Select value={selectedMember} onValueChange={setSelectedMember}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Members</SelectItem>
                        {names.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Tabs defaultValue="chart" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="chart" className="text-xs sm:text-sm">
                        Attendance Chart
                      </TabsTrigger>
                      <TabsTrigger value="summary" className="text-xs sm:text-sm">
                        Member Summary
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="chart" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base sm:text-lg">
                            {selectedMember === "all" ? "Overall Attendance Trends" : `${selectedMember}'s Attendance`}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ChartContainer
                            config={{
                              present: {
                                label: "Present",
                                color: "hsl(142, 76%, 36%)",
                              },
                              absent: {
                                label: "Absent",
                                color: "hsl(0, 84%, 60%)",
                              },
                            }}
                            className="h-[250px] sm:h-[300px]"
                          >
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" fontSize={12} />
                                <YAxis fontSize={12} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="present" fill="var(--color-present)" name="Present" />
                                <Bar dataKey="absent" fill="var(--color-absent)" name="Absent" />
                              </BarChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="summary" className="space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* Member Statistics Table */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base sm:text-lg">Member Attendance Summary</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {memberStats.map((member) => (
                                <div
                                  key={member.name}
                                  className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium text-sm sm:text-base truncate">{member.name}</div>
                                    <div className="text-xs sm:text-sm text-muted-foreground">
                                      {member.present}P / {member.absent}A of {member.total} days
                                    </div>
                                  </div>
                                  <div className="text-right ml-2">
                                    <div className="text-base sm:text-lg font-bold">{member.percentage}%</div>
                                    <div
                                      className={`text-xs sm:text-sm ${member.percentage >= 80 ? "text-green-600" : member.percentage >= 60 ? "text-yellow-600" : "text-red-600"}`}
                                    >
                                      {member.percentage >= 80
                                        ? "Excellent"
                                        : member.percentage >= 60
                                          ? "Good"
                                          : "Needs Improvement"}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Attendance Distribution Pie Chart */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base sm:text-lg">Overall Attendance Distribution</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ChartContainer
                              config={{
                                excellent: { label: "Excellent (80%+)", color: "hsl(142, 76%, 36%)" },
                                good: { label: "Good (60-79%)", color: "hsl(45, 93%, 47%)" },
                                poor: { label: "Needs Improvement (<60%)", color: "hsl(0, 84%, 60%)" },
                              }}
                              className="h-[200px] sm:h-[250px]"
                            >
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={[
                                      {
                                        name: "Excellent (80%+)",
                                        value: memberStats.filter((m) => m.percentage >= 80).length,
                                        fill: "hsl(142, 76%, 36%)",
                                      },
                                      {
                                        name: "Good (60-79%)",
                                        value: memberStats.filter((m) => m.percentage >= 60 && m.percentage < 80)
                                          .length,
                                        fill: "hsl(45, 93%, 47%)",
                                      },
                                      {
                                        name: "Needs Improvement (<60%)",
                                        value: memberStats.filter((m) => m.percentage < 60).length,
                                        fill: "hsl(0, 84%, 60%)",
                                      },
                                    ].filter((item) => item.value > 0)}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={60}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}
                                    fontSize={10}
                                  />
                                  <ChartTooltip content={<ChartTooltipContent />} />
                                </PieChart>
                              </ResponsiveContainer>
                            </ChartContainer>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          )}

          {!showAnalytics && (
            <div className="space-y-4 sm:space-y-6">
              {/* Date Selection and Stats */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <CalendarIcon className="h-5 w-5 flex-shrink-0" />
                        <span className="truncate">Attendance for {format(selectedDate, "MMM d, yyyy")}</span>
                      </CardTitle>
                      <CardDescription className="text-sm">Select a date to view or mark attendance</CardDescription>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          Change Date
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => date && setSelectedDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-1">
                        <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                        Total
                      </div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.present}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-1">
                        <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                        Present
                      </div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-red-600">{stats.absent}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-1">
                        <UserX className="h-3 w-3 sm:h-4 sm:w-4" />
                        Absent
                      </div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.unmarked}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Unmarked</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Name Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <span className="text-lg sm:text-xl">Manage Names</span>
                    <Button onClick={() => setShowBulkInput(!showBulkInput)} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Bulk Add
                    </Button>
                  </CardTitle>
                  <CardDescription>Add or remove people from the attendance list</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Single Name Input */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1">
                      <Label htmlFor="single-name" className="text-sm">
                        Add Single Name
                      </Label>
                      <Input
                        id="single-name"
                        placeholder="Enter name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addSingleName()}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={addSingleName} className="w-full sm:w-auto">
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Bulk Input */}
                  {showBulkInput && (
                    <div className="space-y-2">
                      <Label htmlFor="bulk-names" className="text-sm">
                        Bulk Add Names (one per line)
                      </Label>
                      <Textarea
                        id="bulk-names"
                        placeholder="John Doe&#10;Jane Smith&#10;Bob Johnson"
                        value={bulkNames}
                        onChange={(e) => setBulkNames(e.target.value)}
                        rows={5}
                        className="text-sm"
                      />
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={addBulkNames} className="flex-1 sm:flex-none">
                          Add All Names
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowBulkInput(false)}
                          className="flex-1 sm:flex-none"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Current Names List */}
                  {names.length > 0 && (
                    <div>
                      <Label className="text-sm">Current Names ({names.length})</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {names.map((name) => (
                          <Badge key={name} variant="secondary" className="flex items-center gap-1 text-xs">
                            <span className="truncate max-w-[120px]">{name}</span>
                            <button onClick={() => removeName(name)} className="ml-1 hover:text-red-500">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Attendance Marking */}
              {names.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Mark Attendance</CardTitle>
                    <CardDescription>
                      Click to mark each person as present or absent, and add performance notes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {names.map((name) => {
                        const status = getAttendanceStatus(name)
                        const note = getAttendanceNote(name)
                        const isEditingThisNote = editingNote === name

                        return (
                          <div key={name} className="p-3 sm:p-4 border rounded-lg space-y-3">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <span className="font-medium text-sm sm:text-base truncate flex-1">{name}</span>
                              <div className="flex gap-2 w-full sm:w-auto">
                                <Button
                                  size="sm"
                                  variant={status === "present" ? "default" : "outline"}
                                  onClick={() => markAttendance(name, "present")}
                                  className={`flex-1 sm:flex-none text-xs sm:text-sm ${status === "present" ? "bg-green-600 hover:bg-green-700" : ""}`}
                                >
                                  <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                  Present
                                </Button>
                                <Button
                                  size="sm"
                                  variant={status === "absent" ? "default" : "outline"}
                                  onClick={() => markAttendance(name, "absent")}
                                  className={`flex-1 sm:flex-none text-xs sm:text-sm ${status === "absent" ? "bg-red-600 hover:bg-red-700" : ""}`}
                                >
                                  <UserX className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                  Absent
                                </Button>
                              </div>
                            </div>

                            {/* Notes Section */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs sm:text-sm font-medium">Performance Note:</Label>
                                {!isEditingThisNote && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingNote(name)
                                      setNoteText(note)
                                    }}
                                    className="h-6 px-2 text-xs"
                                  >
                                    {note ? "Edit" : "Add Note"}
                                  </Button>
                                )}
                              </div>

                              {isEditingThisNote ? (
                                <div className="space-y-2">
                                  <Textarea
                                    placeholder="Add a note about today's performance..."
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    rows={2}
                                    className="text-sm"
                                  />
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => updateNote(name, noteText)}
                                      className="h-7 px-3 text-xs flex-1 sm:flex-none"
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingNote(null)
                                        setNoteText("")
                                      }}
                                      className="h-7 px-3 text-xs flex-1 sm:flex-none"
                                    >
                                      Cancel
                                    </Button>
                                  </div>

                                  {/* Quick Note Templates */}
                                  <div className="flex flex-wrap gap-1">
                                    {[
                                      "Great participation",
                                      "Excellent work today",
                                      "Needs improvement",
                                      "Late arrival",
                                      "Left early",
                                      "Outstanding performance",
                                      "Distracted today",
                                      "Very engaged",
                                    ].map((template) => (
                                      <Button
                                        key={template}
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setNoteText(template)}
                                        className="h-6 px-2 text-xs"
                                      >
                                        {template}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="min-h-[2rem] p-2 bg-gray-50 rounded text-xs sm:text-sm text-gray-600 italic">
                                  {note || "No notes for today"}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {names.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Names Added Yet</h3>
                    <p className="text-muted-foreground mb-4 text-sm">Add names to start tracking attendance</p>
                    <Button onClick={() => setShowBulkInput(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Names
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
