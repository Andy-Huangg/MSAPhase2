import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Check, Add, Remove, School } from "@mui/icons-material";
import { useCourses } from "../hooks/useCourses";

interface Course {
  id: number;
  name: string;
  userCount?: number;
}

export default function CourseEnrollment() {
  const {
    allCourses,
    enrolledCourses,
    isLoading,
    error,
    updateEnrollment,
    addNewCourse,
  } = useCourses();

  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("jwt");

  // Memoize enrollment status to avoid recalculation
  const enrollmentStatus = useMemo(() => {
    const statusMap: { [courseId: number]: boolean } = {};
    allCourses.forEach((course) => {
      statusMap[course.id] = enrolledCourses.some(
        (enrolled) => enrolled.id === course.id
      );
    });
    return statusMap;
  }, [allCourses, enrolledCourses]);

  // Filter enrolled courses to exclude Global course (cached)
  const displayEnrolledCourses = useMemo(() => {
    return enrolledCourses.filter((course) => course.id !== 1);
  }, [enrolledCourses]);

  const handleEnrollment = async (courseId: number, enroll: boolean) => {
    try {
      setActionLoading(courseId);
      setLocalError(null);

      const method = enroll ? "POST" : "DELETE";
      const response = await fetch(`${apiUrl}/api/Course/${courseId}/enroll`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          errorText ||
            `Failed to ${enroll ? "enroll in" : "unenroll from"} course`
        );
      }

      // Update the context instead of local state
      updateEnrollment(courseId, enroll);
    } catch (error) {
      console.error("Error updating enrollment:", error);
      setLocalError(
        error instanceof Error
          ? error.message
          : `Failed to ${
              enroll ? "enroll in" : "unenroll from"
            } course. Please try again.`
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourseName.trim()) return;

    try {
      setCreateLoading(true);
      setLocalError(null);

      const response = await fetch(`${apiUrl}/api/Course`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newCourseName.trim() }),
      });

      if (response.ok) {
        const newCourse: Course = await response.json();

        // Add to context
        addNewCourse(newCourse);

        // Close dialog and reset form
        setCreateDialogOpen(false);
        setNewCourseName("");
      } else if (response.status === 409) {
        const errorData = await response.json();
        setLocalError(errorData.message || "Course already exists!");
      } else {
        throw new Error("Failed to create course");
      }
    } catch (error) {
      console.error("Error creating course:", error);
      setLocalError("Failed to create course. Please try again.");
    } finally {
      setCreateLoading(false);
    }
  };

  const displayError = error || localError;

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4">Course Enrollment</Typography>
        <Button
          variant="contained"
          startIcon={<School />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Course
        </Button>
      </Box>

      {displayError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {displayError}
        </Alert>
      )}

      {/* Enrolled Courses Section */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            My Enrolled Courses ({displayEnrolledCourses.length})
          </Typography>
          {displayEnrolledCourses.length === 0 ? (
            <Typography color="text.secondary">
              You are not enrolled in any courses yet.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {displayEnrolledCourses.map((course) => (
                <Chip
                  key={course.id}
                  label={`${course.name}${
                    course.userCount !== undefined
                      ? ` (${course.userCount} ${
                          course.userCount === 1 ? "user" : "users"
                        })`
                      : ""
                  }`}
                  color="primary"
                  icon={<Check />}
                  sx={{ fontSize: "0.9rem" }}
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      <Divider sx={{ mb: 3 }} />

      {/* All Courses Section */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        All Available Courses
      </Typography>

      {/* Help Message */}
      <Alert
        severity="info"
        sx={{
          mb: 3,
          backgroundColor: "rgba(102, 51, 153, 0.05)",
          borderColor: "rgba(102, 51, 153, 0.2)",
          "& .MuiAlert-icon": {
            color: "primary.main",
          },
        }}
      >
        <Typography variant="body2">
          Can't see your course? <strong>Create it</strong> using the "Create
          Course" button above.
        </Typography>
      </Alert>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            md: "1fr 1fr 1fr",
          },
          gap: 2,
        }}
      >
        {allCourses.map((course) => {
          const isEnrolled = enrollmentStatus[course.id];
          const isLoading = actionLoading === course.id;

          return (
            <Card
              key={course.id}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                border: isEnrolled ? "2px solid" : "1px solid",
                borderColor: isEnrolled ? "primary.main" : "divider",
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" component="div" sx={{ mb: 1 }}>
                  {course.name}
                </Typography>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
                >
                  {isEnrolled && (
                    <Chip
                      label="Enrolled"
                      color="primary"
                      size="small"
                      icon={<Check />}
                    />
                  )}
                  {course.userCount !== undefined && (
                    <Chip
                      label={`${course.userCount} ${
                        course.userCount === 1 ? "user" : "users"
                      }`}
                      variant="outlined"
                      size="small"
                    />
                  )}
                </Box>
              </CardContent>
              <Box sx={{ p: 2, pt: 0 }}>
                <Button
                  variant={isEnrolled ? "outlined" : "contained"}
                  color={isEnrolled ? "secondary" : "primary"}
                  fullWidth
                  onClick={() => handleEnrollment(course.id, !isEnrolled)}
                  disabled={isLoading}
                  startIcon={
                    isLoading ? (
                      <CircularProgress size={16} />
                    ) : isEnrolled ? (
                      <Remove />
                    ) : (
                      <Add />
                    )
                  }
                >
                  {isLoading
                    ? "Loading..."
                    : isEnrolled
                    ? "Unenroll"
                    : "Enroll"}
                </Button>
              </Box>
            </Card>
          );
        })}
      </Box>

      {allCourses.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
          No courses available. Create your first course to get started!
        </Typography>
      )}

      {/* Create Course Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      >
        <DialogTitle>Create New Course</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Course Name"
            fullWidth
            variant="outlined"
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
            placeholder="e.g., CS150, Web Development, Math 101"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateCourse}
            variant="contained"
            disabled={!newCourseName.trim() || createLoading}
            startIcon={createLoading ? <CircularProgress size={16} /> : <Add />}
          >
            {createLoading ? "Creating..." : "Create & Enroll"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
