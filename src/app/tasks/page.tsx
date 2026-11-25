"use client";

import { createPortal } from "react-dom";
import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import Sidebar from "@/components/layout/Sidebar";

type Task = {
  id: number;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High";
  status: "To Do" | "In Progress" | "Completed";
  dueDate: string;

  // Connect task with a project
  projectId: number | null;
};


function generateUniqueTaskId(usedIds: Set<number>): number {
  let candidateId = Date.now() * 1000;

  while (usedIds.has(candidateId)) {
    candidateId += 1;
  }

  usedIds.add(candidateId);

  return candidateId;
}








type TaskActivity = {
  id: number;
  taskId: number;
  action: string;
  details: string;
  timestamp: string;
};

type TaskComment = {
  id: number;
  taskId: number;
  text: string;
  timestamp: string;
};

type TaskAttachment = {
  id: number;
  taskId: number;
  name: string;
  type: string;
  size: number;
  timestamp: string;
};
function getTaskReminderStatus(dueDate: string) {
  if (!dueDate) {
    return "No Due Date";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${dueDate}T00:00:00`);
  due.setHours(0, 0, 0, 0);

  const differenceInDays = Math.ceil(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (differenceInDays < 0) {
    return "Overdue";
  }

  if (differenceInDays === 0) {
    return "Due Today";
  }

  if (differenceInDays <= 3) {
    return "Upcoming";
  }

  return "Normal";
}

function openAttachmentDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("phrasis_attachments_db", 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", {
          keyPath: "id",
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

function saveAttachmentFile(id: number, file: File): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openAttachmentDB();

      const transaction = db.transaction("files", "readwrite");
      const store = transaction.objectStore("files");

      store.put({
        id,
        file,
      });

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };

      transaction.onabort = () => {
        db.close();
        reject(transaction.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

function getAttachmentFile(id: number): Promise<File | null> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openAttachmentDB();

      const transaction = db.transaction("files", "readonly");
      const store = transaction.objectStore("files");
      const request = store.get(id);

      request.onsuccess = () => {
        db.close();

        const result = request.result;
        resolve(result ? result.file : null);
      };

      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

function deleteAttachmentFile(id: number): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openAttachmentDB();

      const transaction = db.transaction("files", "readwrite");
      const store = transaction.objectStore("files");

      store.delete(id);

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };

      transaction.onabort = () => {
        db.close();
        reject(transaction.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"' && field.length === 0) {
        insideQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (char !== "\r") {
        field += char;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

const initialTasks: Task[] = [
  {
    id: 1,
    title: "Design Dashboard UI",
    description: "Create a modern dashboard layout",
    priority: "High",
    status: "In Progress",
    dueDate: "2026-11-15",
    projectId: null,
  },
  {
    id: 2,
    title: "Build Authentication",
    description: "Implement login and signup pages",
    priority: "High",
    status: "To Do",
    dueDate: "2026-11-20",
    projectId: null,
  },
  {
    id: 3,
    title: "Review Project Documentation",
    description: "Check project requirements",
    priority: "Low",
    status: "Completed",
    dueDate: "2026-11-10",
    projectId: null,
  },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [reminderFilter, setReminderFilter] = useState<
    "All" | "Overdue" | "Due Today" | "Upcoming"
  >("All");

  const dueTodayTasks = tasks.filter(
    (task) =>
      task.status !== "Completed" &&
      getTaskReminderStatus(task.dueDate) === "Due Today",
  );

  const upcomingTasks = tasks.filter(
    (task) =>
      task.status !== "Completed" &&
      getTaskReminderStatus(task.dueDate) === "Upcoming",
  );

  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activities, setActivities] = useState<TaskActivity[]>([]);

  const [commentTask, setCommentTask] = useState<Task | null>(null);

  const [comments, setComments] = useState<TaskComment[]>([]);

  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [attachmentTask, setAttachmentTask] = useState<Task | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [hasLoadedAttachments, setHasLoadedAttachments] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [hasLoadedComments, setHasLoadedComments] = useState(false);

  const [hasLoadedActivities, setHasLoadedActivities] = useState(false);
  const [previewTasks, setPreviewTasks] = useState<Task[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    imported: number;
    skipped: number;
  } | null>(null);

  const [hasLoadedTasks, setHasLoadedTasks] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activityTask, setActivityTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const tasksPerPage = 5;
  useEffect(() => {
    const savedTasks = localStorage.getItem("phrasis_tasks");

    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }

    setHasLoadedTasks(true);
  }, []);
  useEffect(() => {
    const savedActivities = localStorage.getItem("phrasis_activities");

    if (savedActivities) {
      setActivities(JSON.parse(savedActivities));
    }

    setHasLoadedActivities(true);
  }, []);

  useEffect(() => {
    const savedComments = localStorage.getItem("phrasis_comments");

    if (savedComments) {
      setComments(JSON.parse(savedComments));
    }

    setHasLoadedComments(true);
  }, []);

  useEffect(() => {
    const savedAttachments = localStorage.getItem("phrasis_attachments");

    if (savedAttachments) {
      setAttachments(JSON.parse(savedAttachments));
    }

    setHasLoadedAttachments(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedAttachments) {
      return;
    }

    localStorage.setItem("phrasis_attachments", JSON.stringify(attachments));
  }, [attachments, hasLoadedAttachments]);

  useEffect(() => {
    if (hasLoadedTasks) {
      localStorage.setItem("phrasis_tasks", JSON.stringify(tasks));
    }
  }, [tasks, hasLoadedTasks]);

  useEffect(() => {
    if (!hasLoadedActivities) {
      return;
    }

    localStorage.setItem("phrasis_activities", JSON.stringify(activities));
  }, [activities, hasLoadedActivities]);

  useEffect(() => {
    if (!hasLoadedComments) {
      return;
    }

    localStorage.setItem("phrasis_comments", JSON.stringify(comments));
  }, [comments, hasLoadedComments]);

  const getDueDateStatus = (dueDate: string, status: string) => {
    if (!dueDate || status === "Completed") {
      return "Normal";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(dueDate + "T00:00:00");

    if (deadline < today) {
      return "Overdue";
    }

    if (deadline.getTime() === today.getTime()) {
      return "Due Today";
    }

    return "Upcoming";
  };

  const filteredTasks = tasks
    .filter((task) => {
      const matchesStatus =
        activeFilter === "All" || task.status === activeFilter;

      const matchesPriority =
        priorityFilter === "All" || task.priority === priorityFilter;

      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesReminder =
        reminderFilter === "All" ||
        (reminderFilter === "Overdue" &&
          getTaskReminderStatus(task.dueDate) === "Overdue") ||
        (reminderFilter === "Due Today" &&
          getTaskReminderStatus(task.dueDate) === "Due Today") ||
        (reminderFilter === "Upcoming" &&
          getTaskReminderStatus(task.dueDate) === "Upcoming");

      return (
        matchesStatus && matchesPriority && matchesSearch && matchesReminder
      );
    })
    .sort((a, b) => {
      if (sortOrder === "newest") {
        return b.id - a.id;
      }

      if (sortOrder === "oldest") {
        return a.id - b.id;
      }

      if (sortOrder === "due-asc") {
        return a.dueDate.localeCompare(b.dueDate);
      }

      if (sortOrder === "due-desc") {
        return b.dueDate.localeCompare(a.dueDate);
      }
      if (sortOrder === "priority") {
        const priorityOrder = {
          High: 3,
          Medium: 2,
          Low: 1,
        };

        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }

      return 0;
    });

  // Task Statistics
  const totalTasks = tasks.length;

  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);

  const startIndex = (currentPage - 1) * tasksPerPage;

  const currentTasks = filteredTasks.slice(
    startIndex,
    startIndex + tasksPerPage,
  );

  const todoTasks = tasks.filter((task) => task.status === "To Do").length;

  const inProgressTasks = tasks.filter(
    (task) => task.status === "In Progress",
  ).length;

  const completedTasks = tasks.filter(
    (task) => task.status === "Completed",
  ).length;

  const overdueTasks = tasks.filter(
    (task) => getDueDateStatus(task.dueDate, task.status) === "Overdue",
  ).length;

  const completionPercentage =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const [showForm, setShowForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("Medium");
  const [status, setStatus] = useState<Task["status"]>("To Do");

  function resetForm() {
    setTitle("");
    setDescription("");
    setDueDate("");
    setPriority("Medium");
    setStatus("To Do");
    setEditingTaskId(null);
    setShowForm(false);
  }

  function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) return;

    const newTask: Task = {
      id: generateUniqueTaskId(new Set(tasks.map((task) => task.id))),
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      dueDate,
      projectId: null,
    };

    setTasks((previousTasks) => [...previousTasks, newTask]);

    addActivity(
      newTask.id,
      "Task Created",
      `Task "${newTask.title}" was created`,
    );

    resetForm();
  }

  function handleEditTask(task: Task) {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description);
    setDueDate(task.dueDate);
    setPriority(task.priority);
    setStatus(task.status);
    setShowForm(true);
  }

  function handleUpdateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim() || editingTaskId === null) return;

    const previousTask = tasks.find((task) => task.id === editingTaskId);

    if (!previousTask) return;

    setTasks((previousTasks) =>
      previousTasks.map((task) =>
        task.id === editingTaskId
          ? {
              ...task,
              title: title.trim(),
              description: description.trim(),
              dueDate,
              priority,
              status,
            }
          : task,
      ),
    );

    addActivity(
      editingTaskId,
      "Task Updated",
      `Task "${title.trim()}" was updated`,
    );

    resetForm();
  }

  function handleQuickStatusUpdate(taskId: number, newStatus: Task["status"]) {
    const previousTask = tasks.find((task) => task.id === taskId);

    if (!previousTask || previousTask.status === newStatus) {
      return;
    }

    setTasks((previousTasks) =>
      previousTasks.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task,
      ),
    );

    addActivity(
      taskId,
      "Status Changed",
      `${previousTask.status} → ${newStatus}`,
    );
  }

  function handleAddComment() {
    if (!commentTask || !commentText.trim()) {
      return;
    }

    const newComment: TaskComment = {
      id: Date.now(),
      taskId: commentTask.id,
      text: commentText.trim(),
      timestamp: new Date().toISOString(),
    };

    setComments((previousComments) => [newComment, ...previousComments]);

    setCommentText("");
  }

  async function handleUploadAttachments(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFiles = event.target.files;

    if (!selectedFiles || !attachmentTask) {
      return;
    }

    setIsUploading(true);

    try {
      for (let index = 0; index < selectedFiles.length; index++) {
        const file = selectedFiles[index];

        if (
          file.type !== "application/pdf" &&
          !file.type.startsWith("image/")
        ) {
          alert(`${file.name} is not a supported file.`);
          continue;
        }

        const attachmentId = Date.now() + index;

        await saveAttachmentFile(attachmentId, file);

        const newAttachment: TaskAttachment = {
          id: attachmentId,
          taskId: attachmentTask.id,
          name: file.name,
          type: file.type,
          size: file.size,
          timestamp: new Date().toISOString(),
        };

        setAttachments((previousAttachments) => [
          newAttachment,
          ...previousAttachments,
        ]);
      }
    } catch (error) {
      console.error("Attachment upload failed:", error);
      alert("Unable to upload attachment.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  async function handleDownloadAttachment(attachment: TaskAttachment) {
    try {
      const file = await getAttachmentFile(attachment.id);

      if (!file) {
        alert("Attachment file not found.");
        return;
      }

      const fileUrl = URL.createObjectURL(file);

      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = attachment.name;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(fileUrl);
    } catch (error) {
      console.error("Attachment download failed:", error);
      alert("Unable to download attachment.");
    }
  }

  async function handleDeleteAttachment(attachmentId: number) {
    try {
      await deleteAttachmentFile(attachmentId);

      setAttachments((previousAttachments) =>
        previousAttachments.filter(
          (attachment) => attachment.id !== attachmentId,
        ),
      );
    } catch (error) {
      console.error("Attachment deletion failed:", error);
      alert("Unable to delete attachment.");
    }
  }

  function handleDeleteComment(commentId: number) {
    setComments((previousComments) =>
      previousComments.filter((comment) => comment.id !== commentId),
    );
  }

  function handleDeleteTask(taskId: number) {
    setTaskToDelete(taskId);
  }

  function handleExportTasks() {
    const headers = [
      "Task ID",
      "Title",
      "Description",
      "Priority",
      "Status",
      "Due Date",
    ];

    const rows = filteredTasks.map((task) => [
      task.id,
      task.title,
      task.description,
      task.priority,
      task.status,
      task.dueDate,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "phrasis_tasks.csv";

    link.click();

    URL.revokeObjectURL(url);
  }


  function handleExportSelectedTasks() {
    const headers = [
      "Task ID",
      "Title",
      "Description",
      "Priority",
      "Status",
      "Due Date",
    ];

    const selectedTasks = tasks.filter((task) =>
      selectedTaskIds.includes(task.id),
    );

    const rows = selectedTasks.map((task) => [
      task.id,
      task.title,
      task.description,
      task.priority,
      task.status,
      task.dueDate,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "phrasis_selected_tasks.csv";

    link.click();

    URL.revokeObjectURL(url);
  }





  async function handleImportTasks(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const csvText = await file.text();

      const rows = parseCSV(csvText.trimStart());

      if (rows.length === 0 || rows[0].length === 0) {
        alert("CSV file is empty!");
        event.target.value = "";
        return;
      }

      const requiredHeaders = [
        "Task ID",
        "Title",
        "Description",
        "Priority",
        "Status",
        "Due Date",
      ];

      const headers =
        rows[0]?.map((header) => header.replace(/^\uFEFF/, "").trim()) ?? [];

      const titleIndex = headers.indexOf("Title");
      const descriptionIndex = headers.indexOf("Description");
      const priorityIndex = headers.indexOf("Priority");
      const statusIndex = headers.indexOf("Status");
      const dueDateIndex = headers.indexOf("Due Date");

      const isValidCSV =
        requiredHeaders.length === headers.length &&
        requiredHeaders.every((header) => headers.includes(header)) &&
        new Set(headers).size === headers.length;

      if (!isValidCSV) {
        alert("Invalid CSV file! Please upload a valid WorkOra Tasks CSV.");
        event.target.value = "";
        return;
      }

      const dataRows = rows
        .slice(1)
        .filter((row) => row.some((cell) => cell.trim() !== ""));

      const hasInvalidRowLength = dataRows.some(
        (row) => row.length !== requiredHeaders.length,
      );

      if (hasInvalidRowLength) {
        alert("Invalid CSV! Every row must contain exactly 6 columns.");
        event.target.value = "";
        return;
      }

      // Validate empty task titles
      const hasEmptyTitle = dataRows.some((row) => !row[titleIndex]?.trim());

      if (hasEmptyTitle) {
        alert("Invalid CSV! Every task must have a title.");
        event.target.value = "";
        return;
      }

      // Validate task priorities
      const validPriorities = ["Low", "Medium", "High"];

      const hasInvalidPriority = dataRows.some(
        (row) => !validPriorities.includes(row[priorityIndex]?.trim() ?? ""),
      );

      if (hasInvalidPriority) {
        alert("Invalid CSV! Priority must be Low, Medium, or High.");
        event.target.value = "";
        return;
      }

      // Validate task status
      const validStatuses = ["To Do", "In Progress", "Completed"];

      const hasInvalidStatus = dataRows.some(
        (row) => !validStatuses.includes(row[statusIndex]?.trim() ?? ""),
      );

      // Validate due dates
      const hasInvalidDueDate = dataRows.some((row) => {
        const dueDate = row[dueDateIndex]?.trim() ?? "";

        if (!dueDate) {
          return false;
        }

        const datePattern = /^\d{4}-\d{2}-\d{2}$/;

        if (!datePattern.test(dueDate)) {
          return true;
        }

        const [year, month, day] = dueDate.split("-").map(Number);

        const date = new Date(Date.UTC(year, month - 1, day));

        return (
          date.getUTCFullYear() !== year ||
          date.getUTCMonth() !== month - 1 ||
          date.getUTCDate() !== day
        );
      });

      if (hasInvalidDueDate) {
        alert("Invalid CSV! Due Date must be in YYYY-MM-DD format.");
        event.target.value = "";
        return;
      }

      if (hasInvalidStatus) {
        alert("Invalid CSV! Status must be To Do, In Progress, or Completed.");
        event.target.value = "";
        return;
      }

      // Convert CSV rows into Task objects


      const usedIds = new Set(tasks.map((task) => task.id));

      const importedTasks: Task[] = dataRows.map((row) => ({
        id: generateUniqueTaskId(usedIds),
        title: row[titleIndex],
        description: row[descriptionIndex],
        priority: row[priorityIndex] as Task["priority"],
        status: row[statusIndex] as Task["status"],
        dueDate: row[dueDateIndex],
        projectId: null,
      }));







    

      const newTasks = importedTasks.filter(
        (importedTask) =>
          !tasks.some(
            (existingTask) =>
              existingTask.title.trim().toLowerCase() ===
                importedTask.title.trim().toLowerCase() &&
              existingTask.description === importedTask.description &&
              existingTask.priority === importedTask.priority &&
              existingTask.status === importedTask.status &&
              existingTask.dueDate === importedTask.dueDate,
          ),
      );

      console.log("Imported Tasks:", importedTasks);

      setImportSummary({
        total: importedTasks.length,
        imported: newTasks.length,
        skipped: importedTasks.length - newTasks.length,
      });

      setPreviewTasks(newTasks);
      setIsPreviewOpen(true);

      event.target.value = "";
    } catch (error) {
      console.error("CSV Import Error:", error);
      alert("Something went wrong while importing the CSV file.");
      event.target.value = "";
    }
  }

  function addActivity(taskId: number, action: string, details: string) {
    const newActivity: TaskActivity = {
      id: Date.now(),
      taskId,
      action,
      details,
      timestamp: new Date().toISOString(),
    };

    setActivities((previousActivities) => [newActivity, ...previousActivities]);
  }

  const selectedTaskActivities = activityTask
    ? activities.filter((activity) => activity.taskId === activityTask.id)
    : [];

  const toggleTaskSelection = (taskId: number) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );
  };

  const toggleSelectCurrentPage = () => {
    const currentPageTaskIds = currentTasks.map((task) => task.id);

    const allSelected = currentPageTaskIds.every((id) =>
      selectedTaskIds.includes(id),
    );

    setSelectedTaskIds((prev) =>
      allSelected
        ? prev.filter((id) => !currentPageTaskIds.includes(id))
        : Array.from(new Set([...prev, ...currentPageTaskIds])),
    );
  };

  const selectedTaskIdSet = new Set(selectedTaskIds);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="min-w-0 flex-1 px-4 pb-4 pt-20 sm:px-6 sm:pb-6 sm:pt-20 md:p-6 lg:p-8">
        {isPreviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
           <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    CSV Import Preview
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {previewTasks.length} new tasks ready to import
                  </p>
                </div>

                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-slate-600">
                      <th className="p-3">Title</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Due Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {previewTasks.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center text-slate-500"
                        >
                          No new tasks to import. All tasks are duplicates.
                        </td>
                      </tr>
                    ) : (
                      previewTasks.map((task) => (
                        <tr key={task.id} className="border-b">
                          <td className="p-3 font-medium text-slate-800">
                            {task.title}
                          </td>

                          <td className="p-3 text-slate-600">
                            {task.description}
                          </td>

                          <td className="p-3 font-medium text-slate-800">
                            {task.priority}
                          </td>

                          <td className="p-3 font-medium text-slate-800">
                            {task.status}
                          </td>

                          <td className="p-3 text-slate-700">
                            {task.dueDate || "No due date"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  onClick={() => {
                    setIsPreviewOpen(false);
                    setPreviewTasks([]);
                    setImportSummary(null);
                  }}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>


                <button
                  onClick={() => {
                    setTasks((previousTasks) => {
                      const allTasks = [...previousTasks, ...previewTasks];

                      const ids = allTasks.map((task) => task.id);

                      const duplicateIds = ids.filter(
                        (id, index) => ids.indexOf(id) !== index,
                      );

                      console.log(
                        "Existing Task IDs:",
                        previousTasks.map((task) => task.id),
                      );

                      console.log(
                        "Preview Task IDs:",
                        previewTasks.map((task) => task.id),
                      );

                      console.log("Duplicate IDs:", duplicateIds);

                      return allTasks;
                    });

                    setCurrentPage(1);
                    setIsPreviewOpen(false);
                    setPreviewTasks([]);
                    setIsSummaryOpen(true);
                  }}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                >
                  {previewTasks.length === 0
                    ? "View Summary"
                    : "Confirm Import"}
                </button>

              </div>
            </div>
          </div>
        )}

        {isSummaryOpen && importSummary && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="text-2xl font-bold text-slate-900">
                Import Summary
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Your CSV import has been completed.
              </p>

              <div className="mt-6 space-y-4">
                <div className="flex justify-between rounded-lg bg-slate-50 p-4">
                  <span className="text-slate-600">Total CSV Tasks</span>
                  <span className="font-bold text-slate-900">
                    {importSummary.total}
                  </span>
                </div>

                <div className="flex justify-between rounded-lg bg-green-50 p-4">
                  <span className="text-green-700">Successfully Imported</span>
                  <span className="font-bold text-green-700">
                    {importSummary.imported}
                  </span>
                </div>

                <div className="flex justify-between rounded-lg bg-amber-50 p-4">
                  <span className="text-amber-700">Duplicates Skipped</span>
                  <span className="font-bold text-amber-700">
                    {importSummary.skipped}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsSummaryOpen(false);
                  setImportSummary(null);
                }}
                className="mt-6 w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        )}

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Tasks</h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage and track your daily tasks.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              Import CSV
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleImportTasks}
                className="hidden"
              />
            </label>

            <button
              onClick={handleExportTasks}
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Export CSV
            </button>

            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              + Add Task
            </button>
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={editingTaskId !== null ? handleUpdateTask : handleAddTask}
            className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="mb-5 text-lg font-semibold text-slate-900">
              {editingTaskId !== null ? "Edit Task" : "Create New Task"}
            </h2>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Task Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Enter task title"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Enter task description"
                rows={3}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Due Date
              </label>

              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900"
              />
            </div>

            <div className="mb-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value as Task["priority"])
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as Task["status"])
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900"
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {editingTaskId !== null ? "Update Task" : "Create Task"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Task Statistics Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <div
            onClick={() => {
              setReminderFilter("Overdue");
              setActiveFilter("All");
              setPriorityFilter("All");
              setSearchQuery("");
            }}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <p className="text-sm font-medium text-slate-500">Total Tasks</p>
            <h3 className="mt-2 text-3xl font-bold text-slate-900">
              {totalTasks}
            </h3>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">To Do</p>
            <h3 className="mt-2 text-3xl font-bold text-slate-600">
              {todoTasks}
            </h3>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">In Progress</p>
            <h3 className="mt-2 text-3xl font-bold text-blue-600">
              {inProgressTasks}
            </h3>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Completed</p>
            <h3 className="mt-2 text-3xl font-bold text-green-600">
              {completedTasks}
            </h3>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Overdue</p>
            <h3 className="mt-2 text-3xl font-bold text-red-600">
              {overdueTasks}
            </h3>
          </div>

          {/* Due Today Card */}
          <div
            onClick={() => {
              setReminderFilter("Due Today");
              setActiveFilter("All");
              setPriorityFilter("All");
              setSearchQuery("");
            }}
            className="cursor-pointer rounded-xl border border-amber-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <p className="text-sm font-medium text-amber-600">Due Today</p>
            <h3 className="mt-2 text-3xl font-bold text-amber-600">
              {dueTodayTasks.length}
            </h3>
            <p className="mt-1 text-xs text-slate-500">Tasks due today</p>
          </div>

          {/* Upcoming Card */}
          <div
            onClick={() => {
              setReminderFilter("Upcoming");
              setActiveFilter("All");
              setPriorityFilter("All");
              setSearchQuery("");
            }}
            className="cursor-pointer rounded-xl border border-blue-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <p className="text-sm font-medium text-blue-600">Upcoming</p>
            <h3 className="mt-2 text-3xl font-bold text-blue-600">
              {upcomingTasks.length}
            </h3>
            <p className="mt-1 text-xs text-slate-500">Next 3 days</p>
          </div>
        </div>

        <div className="mb-8">
          {/* Overall Task Progress */}
          <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between border-b border-slate-200/70 pb-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Overall Progress
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Track your task completion
                </p>
              </div>

              <span className="text-2xl font-bold text-green-600">
                {completionPercentage}%
              </span>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            <div className="mt-3 flex justify-between text-sm text-slate-500">
              <span>{completedTasks} Completed</span>
              <span>{totalTasks} Total Tasks</span>
            </div>
          </div>

          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">All Tasks</h2>
            <p className="text-sm text-slate-500">{tasks.length} Tasks</p>
          </div>
        </div>

        <div className="mb-5">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search tasks by title or description..."
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500"
          />
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {["All", "To Do", "In Progress", "Completed"].map((filter) => (
            <button
              key={filter}
              onClick={() => {
                setActiveFilter(filter);
                setCurrentPage(1);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeFilter === filter
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="mb-6 flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">
            Filter by Priority:
          </label>

          <select
            value={priorityFilter}
            onChange={(event) => {
              setPriorityFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900"
          >
            <option value="All">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>

        {/* Sort Tasks */}

        <div className="mb-6 flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Sort By:</label>

          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="due-asc">Due Date (Earliest First)</option>
            <option value="due-desc">Due Date (Latest First)</option>
            <option value="priority">Priority (High to Low)</option>
          </select>
        </div>

        <div className="space-y-4">
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={
                filteredTasks.length > 0 &&
                filteredTasks.every((task) => selectedTaskIdSet.has(task.id))
              }
              onChange={(event) => {
                if (event.target.checked) {
                  setSelectedTaskIds((previousIds) =>
                    Array.from(
                      new Set([
                        ...previousIds,
                        ...filteredTasks.map((task) => task.id),
                      ]),
                    ),
                  );
                } else {
                  setSelectedTaskIds((previousIds) =>
                    previousIds.filter(
                      (id) => !filteredTasks.some((task) => task.id === id),
                    ),
                  );
                }
              }}
              className="h-4 w-4 cursor-pointer accent-blue-600"
            />
            Select All
          </label>


          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                viewMode === "list"
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              List View
            </button>

            <button
              onClick={() => setViewMode("kanban")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                viewMode === "kanban"
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              Kanban View
            </button>
          </div>





      

          {selectedTaskIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
              <p className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-blue-700">
                {selectedTaskIds.length} task(s) selected
              </p>

              <button
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                onClick={async () => {
                  if (
                    !window.confirm(
                      `Are you sure you want to delete ${selectedTaskIds.length} selected task(s) and their related data?`,
                    )
                  ) {
                    return;
                  }
                  setIsDeleting(true);

                  await new Promise((resolve) => setTimeout(resolve, 100));

                  const deletedTaskIds = [...selectedTaskIds];
                  const deletedTaskIdSet = new Set(deletedTaskIds);

                  const attachmentsToDelete = attachments.filter((attachment) =>
                    deletedTaskIdSet.has(attachment.taskId),
                  );

                  try {
                    await Promise.all(
                      attachmentsToDelete.map((attachment) =>
                        deleteAttachmentFile(attachment.id),
                      ),
                    );

                    // Delete selected tasks
                    setTasks((previousTasks) =>
                      previousTasks.filter(
                        (task) => !deletedTaskIdSet.has(task.id),
                      ),
                    );

                    // Delete related activity history
                    setActivities((previousActivities) =>
                      previousActivities.filter(
                        (activity) => !deletedTaskIdSet.has(activity.taskId),
                      ),
                    );

                    // Delete related attachment metadata
                    setAttachments((previousAttachments) =>
                      previousAttachments.filter(
                        (attachment) =>
                          !deletedTaskIdSet.has(attachment.taskId),
                      ),
                    );

                    setSelectedTaskIds([]);
                    setCurrentPage(1);
                  } catch (error) {
                    console.error("Bulk delete failed:", error);
                    window.alert(
                      "Unable to delete all related task data. Please try again.",
                    );
                  } finally {
                    setIsDeleting(false);
                  }
                }}
              >
                {isDeleting ? "Deleting..." : "Delete Selected"}
              </button>

              <button
                onClick={handleExportSelectedTasks}
                className="rounded-lg border border-green-200 bg-white px-4 py-2 text-sm font-semibold text-green-700 transition-colors hover:bg-green-50"
              >
                Export Selected
              </button>






              <button
                onClick={() => {
                  setSelectedTaskIds([]);
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                Clear Selection
              </button>


              <button
                onClick={() => {
                  const visibleTasks =
                    viewMode === "list" ? currentTasks : filteredTasks;

                  setSelectedTaskIds((previousIds) => {
                    const visibleTaskIdSet = new Set(
                      visibleTasks.map((task) => task.id),
                    );

                    const previousSelectedSet = new Set(previousIds);

                    const selectedOutsideVisibleView = previousIds.filter(
                      (id) => !visibleTaskIdSet.has(id),
                    );

                    const newlySelected = visibleTasks
                      .filter((task) => !previousSelectedSet.has(task.id))
                      .map((task) => task.id);

                    return [...selectedOutsideVisibleView, ...newlySelected];
                  });
                }}
                className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
              >
                Invert Selection
              </button>


              <select
                defaultValue=""
                onChange={(event) => {
                  const newStatus = event.target.value as Task["status"];

                  if (!newStatus) {
                    return;
                  }

                  const confirmUpdate = window.confirm(
                    `Are you sure you want to update the status of ${selectedTaskIds.length} selected task(s) to ${newStatus}?`,
                  );

                  if (!confirmUpdate) {
                    event.target.value = "";
                    return;
                  }

                  const selectedTaskIdSet = new Set(selectedTaskIds);

                  const selectedTasks = tasks.filter((task) =>
                    selectedTaskIdSet.has(task.id),
                  );

                  selectedTasks.forEach((task) => {
                    if (task.status !== newStatus) {
                      addActivity(
                        task.id,
                        "Status Changed",
                        `${task.status} → ${newStatus}`,
                      );
                    }
                  });

                  setTasks((previousTasks) =>
                    previousTasks.map((task) =>
                      selectedTaskIdSet.has(task.id)
                        ? { ...task, status: newStatus }
                        : task,
                    ),
                  );

                  setSelectedTaskIds([]);
                  event.target.value = "";
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="" disabled>
                  Update Selected Status
                </option>
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>

              <select
                defaultValue=""
                onChange={(event) => {
                  const newPriority = event.target.value as Task["priority"];

                  if (!newPriority) {
                    return;
                  }

                  const confirmUpdate = window.confirm(
                    `Are you sure you want to update the priority of ${selectedTaskIds.length} selected task(s) to ${newPriority}?`,
                  );

                  if (!confirmUpdate) {
                    event.target.value = "";
                    return;
                  }

                  const selectedTaskIdSet = new Set(selectedTaskIds);

                  const selectedTasks = tasks.filter((task) =>
                    selectedTaskIdSet.has(task.id),
                  );

                  selectedTasks.forEach((task) => {
                    if (task.priority !== newPriority) {
                      addActivity(
                        task.id,
                        "Priority Changed",
                        `${task.priority} → ${newPriority}`,
                      );
                    }
                  });

                  setTasks((previousTasks) =>
                    previousTasks.map((task) =>
                      selectedTaskIdSet.has(task.id)
                        ? { ...task, priority: newPriority }
                        : task,
                    ),
                  );

                  setSelectedTaskIds([]);
                  event.target.value = "";
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="" disabled>
                  Update Selected Priority
                </option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          )}

          {viewMode === "list" && currentTasks.map((task) => (
            <div
              key={task.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <input
                  type="checkbox"
                  checked={selectedTaskIds.includes(task.id)}
                  onChange={() => toggleTaskSelection(task.id)}
                  className="mt-1 h-4 w-4 cursor-pointer accent-blue-600"
                />

                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900">
                    {task.title}
                  </h3>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    {task.description || "No description provided"}
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Due Date:{" "}
                    {task.dueDate
                      ? new Date(task.dueDate + "T00:00:00").toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )
                      : "Not set"}
                  </p>

                  <div className="mt-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        getDueDateStatus(task.dueDate, task.status) ===
                        "Overdue"
                          ? "bg-red-100 text-red-700"
                          : getDueDateStatus(task.dueDate, task.status) ===
                              "Due Today"
                            ? "bg-orange-100 text-orange-700"
                            : getDueDateStatus(task.dueDate, task.status) ===
                                "Upcoming"
                              ? "bg-blue-100 text-blue-700"
                              : getDueDateStatus(task.dueDate, task.status) ===
                                  "Normal"
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {getDueDateStatus(task.dueDate, task.status) === "Overdue"
                        ? "⚠️ Overdue"
                        : getDueDateStatus(task.dueDate, task.status) ===
                            "Due Today"
                          ? "🔔 Due Today"
                          : getDueDateStatus(task.dueDate, task.status) ===
                              "Upcoming"
                            ? "📅 Upcoming"
                            : getDueDateStatus(task.dueDate, task.status)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        task.priority === "Low"
                          ? "bg-green-50 text-green-600"
                          : task.priority === "Medium"
                            ? "bg-orange-50 text-orange-600"
                            : "bg-red-50 text-red-600"
                      }`}
                    >
                      Priority: {task.priority}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        task.status === "To Do"
                          ? "bg-slate-100 text-slate-600"
                          : task.status === "In Progress"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-green-50 text-green-600"
                      }`}
                    >
                      {task.status}
                    </span>

                    <select
                      value={task.status}
                      onChange={(event) =>
                        handleQuickStatusUpdate(
                          task.id,
                          event.target.value as Task["status"],
                        )
                      }
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-nowrap gap-2 max-lg:flex-wrap">
                  <button
                    onClick={() => setSelectedTask(task)}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => setActivityTask(task)}
                    className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100"
                  >
                    Activity History
                  </button>

                  <button
                    onClick={() => {
                      setCommentTask(task);
                      setCommentText("");
                    }}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    Comments & Notes
                  </button>

                  <button
                    onClick={() => {
                      setAttachmentTask(task);
                    }}
                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
                  >
                    Attachments (
                    {
                      attachments.filter(
                        (attachment) => attachment.taskId === task.id,
                      ).length
                    }
                    )
                  </button>

                  <button
                    type="button"
                    draggable={false}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleEditTask(task);
                    }}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {viewMode === "kanban" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {(["To Do", "In Progress", "Completed"] as const).map(
                (status) => {

                  const columnTasks = filteredTasks.filter(
                    (task) => task.status === status,
                  );


                  return (
                  <div
                    key={status}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (draggedTaskId === null) {
                        return;
                      }

                      handleQuickStatusUpdate(draggedTaskId, status);
                      setDraggedTaskId(null);
                    }}
                    className={`rounded-xl border p-4 transition-colors ${
                      status === "To Do"
                        ? "border-slate-200 bg-slate-50"
                        : status === "In Progress"
                          ? "border-blue-200 bg-blue-50/50"
                          : "border-green-200 bg-green-50/50"
                    }`}
                  >
                      <div className="mb-4 flex items-center justify-between">
                      <h3
                        className={`font-bold ${
                          status === "To Do"
                            ? "text-slate-700"
                            : status === "In Progress"
                              ? "text-blue-700"
                              : "text-green-700"
                        }`}
                      >
                        {status}
                      </h3>

                      <span
                        className={`rounded-full min-w-8 px-3 py-1.5 text-center text-sm font-bold shadow-sm ${
                          status === "To Do"
                            ? "bg-slate-200 text-slate-700"
                            : status === "In Progress"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {columnTasks.length}
                      </span>
                      </div>

                      <div className="space-y-3">
                        {columnTasks.length === 0 ? (
                      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white/60 px-4 py-8 text-center">
                        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                          <span className="text-xl text-slate-400">+</span>
                        </div>

                        <p className="text-sm font-semibold text-slate-500">
                          No tasks in this column
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Tasks will appear here when assigned
                        </p>
                      </div>
                        ) : (
                          columnTasks.map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => setDraggedTaskId(task.id)}
                        onDragEnd={() => setDraggedTaskId(null)}
                        className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm cursor-grab active:cursor-grabbing transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg ${
                          draggedTaskId === task.id ? "opacity-40" : ""
                        }`}
                      >
                        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                          <label className="flex items-center gap-2 text-sm text-slate-600">
                            <input
                              type="checkbox"
                              checked={selectedTaskIds.includes(task.id)}
                              onChange={(event) => {
                                if (event.target.checked) {
                                  setSelectedTaskIds((previousIds) => [
                                    ...previousIds,
                                    task.id,
                                  ]);
                                } else {
                                  setSelectedTaskIds((previousIds) =>
                                    previousIds.filter((id) => id !== task.id),
                                  );
                                }
                              }}
                              onClick={(event) => event.stopPropagation()}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            Select
                          </label>
                        </div>



                        <h4 className="text-base font-bold leading-6 text-slate-900 break-words">
                          {task.title}
                        </h4>

                        <p className="mt-2 min-h-10 text-sm leading-5 text-slate-600 break-words whitespace-pre-wrap">
                          {task.description || "No description provided."}
                        </p>

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                task.priority === "High"
                                  ? "bg-red-100 text-red-700"
                                  : task.priority === "Medium"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-green-100 text-green-700"
                              }`}
                            >
                              {task.priority}
                            </span>

                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                !task.dueDate
                                  ? "bg-slate-100 text-slate-600"
                                  : getDueDateStatus(task.dueDate, task.status) === "Overdue"
                                    ? "bg-red-100 text-red-700"
                                    : getDueDateStatus(task.dueDate, task.status) === "Due Today"
                                      ? "bg-orange-100 text-orange-700"
                                      : getDueDateStatus(task.dueDate, task.status) === "Upcoming"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-green-100 text-green-700"
                              }`}
                            >
                              {task.dueDate || "No Due Date"}
                            </span>
                            </div>

                            <div
                              className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4"
                              onPointerDown={(event) => event.stopPropagation()}
                            >
                              <button
                                draggable={false}
                                onClick={() => setSelectedTask(task)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                              >
                                View Details
                              </button>

                              <button
                                draggable={false}
                                onClick={() => setActivityTask(task)}
                                className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100"
                              >
                                Activity History
                              </button>

                              <button
                                draggable={false}
                                onClick={() => {
                                  setCommentTask(task);
                                  setCommentText("");
                                }}
                                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
                              >
                                Comments & Notes
                              </button>

                              <button
                                draggable={false}
                                onClick={() => setAttachmentTask(task)}
                                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
                              >
                                Attachments (
                                {
                                  attachments.filter(
                                    (attachment) =>
                                      attachment.taskId === task.id,
                                  ).length
                                }
                                )
                              </button>

                              <button
                                draggable={false}
                                onClick={() => handleEditTask(task)}
                                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                              >
                                Edit
                              </button>

                              <button
                                draggable={false}
                                onClick={() => handleDeleteTask(task.id)}
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                              >
                                Delete
                              </button>
                            </div>


                            
                          </div>
                            ))
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}





          {/* Pagination Controls */}

        {viewMode === "list" && totalPages > 1 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() =>
                setCurrentPage((previous) => Math.max(previous - 1, 1))
              }
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            {Array.from(
              { length: Math.min(totalPages, 5) },
              (_, index) =>
                Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + index,
            ).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  currentPage === page
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() =>
                setCurrentPage((previous) =>
                  Math.min(previous + 1, totalPages),
                )
              }
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}


          {/* Task Details Modal */}
          {selectedTask && (
            <div className="fixed left-0 top-0 z-50 flex h-[100dvh] w-[100dvw] items-center justify-center overflow-y-auto bg-black/50 p-3 sm:p-4">
              <div className="my-auto box-border max-h-[calc(100dvh-1.5rem)] w-full max-w-[32rem] overflow-x-hidden overflow-y-auto rounded-xl bg-white p-4 shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">
                    Task Details
                  </h2>

                  <button
                    onClick={() => setSelectedTask(null)}
                    className="text-2xl text-slate-500 hover:text-slate-900"
                  >
                    &times;
                  </button>
                </div>

                <h3 className="text-lg font-semibold text-slate-900">
                  {selectedTask.title}
                </h3>

                <p className="mt-2 text-sm text-slate-600">
                  {selectedTask.description || "No description provided"}
                </p>

                <div className="mt-5 space-y-3 border-t border-slate-200 pt-4">
                  <p className="text-sm text-slate-700">
                    <strong>Priority:</strong> {selectedTask.priority}
                  </p>

                  <p className="text-sm text-slate-700">
                    <strong>Status:</strong> {selectedTask.status}
                  </p>

                  <p className="text-sm text-slate-700">
                    <strong>Due Date:</strong>{" "}
                    {selectedTask.dueDate
                      ? new Date(
                          selectedTask.dueDate + "T00:00:00",
                        ).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "Not set"}
                  </p>

                  <p className="text-sm text-slate-700">
                    <strong>Deadline Status:</strong>{" "}
                    {getDueDateStatus(
                      selectedTask.dueDate,
                      selectedTask.status,
                    )}
                  </p>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {activityTask && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">
                    Activity History
                  </h2>

                  <button
                    onClick={() => setActivityTask(null)}
                    className="text-2xl text-slate-500 hover:text-slate-900"
                  >
                    &times;
                  </button>
                </div>

                <h3 className="mb-5 text-lg font-semibold text-slate-900">
                  {activityTask.title}
                </h3>

                {selectedTaskActivities.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">
                    No activity history available for this task.
                  </p>
                ) : (
                  <div className="max-h-80 space-y-4 overflow-y-auto">
                    {selectedTaskActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="border-l-2 border-blue-500 pl-4"
                      >
                        <h4 className="text-sm font-semibold text-slate-900">
                          {activity.action}
                        </h4>

                        <p className="mt-1 text-sm text-slate-600">
                          {activity.details}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(activity.timestamp).toLocaleString("en-IN")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setActivityTask(null)}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}


          {commentTask &&
          typeof document !== "undefined" &&
          createPortal((
            <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-x-hidden overflow-y-auto bg-black/50 p-3">
              <div className="relative m-auto box-border w-full min-w-0 max-w-lg overflow-x-hidden rounded-xl bg-white p-4 shadow-xl sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">
                    Comments & Notes
                  </h2>

                  <button
                    onClick={() => setCommentTask(null)}
                    className="text-2xl text-slate-500 hover:text-slate-900"
                  >
                    &times;
                  </button>
                </div>

                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  {commentTask.title}
                </h3>

                <textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Write a comment or note..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500"
                />


                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  className="w-full rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  Add Comment
                </button>


                <div className="mt-6">
                  <h3 className="mb-4 font-semibold text-slate-900">
                    Previous Comments
                  </h3>

                  <div className="max-h-72 space-y-4 overflow-y-auto">
                    {comments.filter(
                      (comment) => comment.taskId === commentTask.id,
                    ).length === 0 ? (
                      <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">
                        No comments available.
                      </p>
                    ) : (
                      comments
                        .filter((comment) => comment.taskId === commentTask.id)
                        .map((comment) => (
                          <div
                            key={comment.id}
                            className="rounded-lg border border-slate-200 p-4"
                          >
                            <p className="whitespace-pre-wrap text-sm text-slate-700">
                              {comment.text}
                            </p>

                            <div className="mt-3 flex items-center justify-between">
                              <p className="text-xs text-slate-400">
                                {new Date(comment.timestamp).toLocaleString(
                                  "en-IN",
                                )}
                              </p>

                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-xs font-medium text-red-600 hover:text-red-800"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                <div className="mt-6 flex w-full min-w-0 justify-end">
                  <button
                    onClick={() => setCommentTask(null)}
                    className="w-full rounded-lg bg-slate-200 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300 sm:w-auto"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          ), document.body)}


          {attachmentTask && (
            <div className="fixed left-0 top-0 z-50 flex h-[100dvh] w-[100dvw] items-center justify-center overflow-y-auto bg-black/50 p-3 sm:p-4">
              <div className="my-auto box-border h-[calc(100dvh-1.5rem)] w-full max-w-[32rem] overflow-x-hidden overflow-y-auto rounded-xl bg-white p-4 shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Task Attachments
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {attachmentTask.title}
                    </p>
                  </div>

                  <button
                    onClick={() => setAttachmentTask(null)}
                    className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-6 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50 p-6 text-center">
                  <label className="cursor-pointer">
                    <span className="font-semibold text-indigo-700">
                      {isUploading ? "Uploading..." : "Choose PDF or Images"}
                    </span>

                    <input
                      type="file"
                      accept=".pdf,image/*"
                      multiple
                      disabled={isUploading}
                      onChange={handleUploadAttachments}
                      className="hidden"
                    />
                  </label>

                  <p className="mt-2 text-xs text-slate-500">
                    Upload PDF and image files
                  </p>
                </div>

                <div className="space-y-4">
                  {attachments
                    .filter(
                      (attachment) => attachment.taskId === attachmentTask.id,
                    )
                    .map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0">
                          <p className="break-all font-medium text-slate-900">
                            {attachment.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {attachment.type} ·{" "}
                            {attachment.size >= 1024 * 1024
                              ? `${(attachment.size / (1024 * 1024)).toFixed(2)} MB`
                              : `${(attachment.size / 1024).toFixed(2)} KB`}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDownloadAttachment(attachment)}
                            className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                          >
                            Download
                          </button>

                          <button
                            onClick={() =>
                              handleDeleteAttachment(attachment.id)
                            }
                            className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}

                  {attachments.filter(
                    (attachment) => attachment.taskId === attachmentTask.id,
                  ).length === 0 && (
                    <p className="py-6 text-center text-sm text-slate-500">
                      No attachments added yet.
                    </p>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setAttachmentTask(null)}
                    className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {taskToDelete !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <h2 className="text-xl font-bold text-slate-900">
                  Delete Task?
                </h2>

                <p className="mt-3 text-sm text-slate-600">
                  Are you sure you want to delete this task? This action cannot
                  be undone.
                </p>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setTaskToDelete(null)}
                    className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => {
                      setTasks((previousTasks) =>
                        previousTasks.filter(
                          (task) => task.id !== taskToDelete,
                        ),
                      );
                      setTaskToDelete(null);
                    }}
                    className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {reminderFilter !== "All" && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-800">
                Active Reminder Filter: {reminderFilter}
              </p>

              <button
                onClick={() => setReminderFilter("All")}
                className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-blue-100"
              >
                Clear Filter ✕
              </button>
            </div>
          )}

          {filteredTasks.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl">
                📋
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-900">
                No tasks found
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                No tasks match your current search or filters. Try changing your
                filters or create a new task.
              </p>

              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter("All");
                  setPriorityFilter("All");
                  setCurrentPage(1);
                }}
                className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
