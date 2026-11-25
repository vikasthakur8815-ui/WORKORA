
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";

type Task = {
  id: number;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High";
  status: "To Do" | "In Progress" | "Completed";
  dueDate: string;
  projectId?: number | null;
};

type Project = {
  id: number;
  name: string;
  status: "Planning" | "In Progress" | "Completed";
  progress: number;
};

type Activity = {
  id: number;
  taskId: number;
  action: string;
  details: string;
  timestamp: string;
};

const TASK_KEY = "phrasis_tasks";
const PROJECT_KEY = "phrasis_projects";
const ACTIVITY_KEY = "phrasis_activities";

const initialTasks: Task[] = [
  {
    id: 1,
    title: "Design Dashboard UI",
    description: "Create the main dashboard interface.",
    priority: "High",
    status: "In Progress",
    dueDate: "2026-11-15",
    projectId: null,
  },
  {
    id: 2,
    title: "Build Authentication",
    description: "Implement user authentication.",
    priority: "High",
    status: "To Do",
    dueDate: "2026-11-20",
    projectId: null,
  },
  {
    id: 3,
    title: "Review Project Documentation",
    description: "Review and update documentation.",
    priority: "Low",
    status: "Completed",
    dueDate: "2026-11-10",
    projectId: null,
  },
];

const initialProjects: Project[] = [
  { id: 1, name: "Website Redesign", status: "In Progress", progress: 75 },
  { id: 2, name: "Mobile App Development", status: "Planning", progress: 25 },
  { id: 3, name: "Dashboard Analytics", status: "Completed", progress: 100 },
];

function readArray<T>(key: string, fallback: T[]): T[] {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;

    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function getToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  if (!value) return "No deadline";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refreshData = useCallback(() => {
    setTasks(readArray<Task>(TASK_KEY, initialTasks));
    setProjects(readArray<Project>(PROJECT_KEY, initialProjects));
    setActivities(readArray<Activity>(ACTIVITY_KEY, []));
  }, []);

  useEffect(() => {
    refreshData();
    setLoaded(true);

    function handleStorage(event: StorageEvent) {
      if (
        event.key === TASK_KEY ||
        event.key === PROJECT_KEY ||
        event.key === ACTIVITY_KEY ||
        event.key === null
      ) {
        refreshData();
      }
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", refreshData);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", refreshData);
    };
  }, [refreshData]);

  const today = getToday();

  const stats = useMemo(() => {
    const completed = tasks.filter(
      (task) => task.status === "Completed"
    ).length;

    const open = tasks.filter(
      (task) => task.status !== "Completed"
    ).length;

    const overdue = tasks.filter(
      (task) =>
        task.status !== "Completed" &&
        task.dueDate &&
        task.dueDate < today
    ).length;

    const dueToday = tasks.filter(
      (task) =>
        task.status !== "Completed" &&
        task.dueDate === today
    ).length;

    const completion = tasks.length
      ? Math.round((completed / tasks.length) * 100)
      : 0;

    return {
      totalTasks: tasks.length,
      completed,
      open,
      overdue,
      dueToday,
      completion,
      totalProjects: projects.length,
      activeProjects: projects.filter(
        (project) => project.status === "In Progress"
      ).length,
      completedProjects: projects.filter(
        (project) => project.status === "Completed"
      ).length,
      planningProjects: projects.filter(
        (project) => project.status === "Planning"
      ).length,
    };
  }, [tasks, projects, today]);

  const projectHealth = useMemo(() => {
    return projects.map((project) => {
      const linkedTasks = tasks.filter(
        (task) => task.projectId === project.id
      );

      const completed = linkedTasks.filter(
        (task) => task.status === "Completed"
      ).length;

      const progress = linkedTasks.length
        ? Math.round((completed / linkedTasks.length) * 100)
        : project.progress;

      const overdue = linkedTasks.filter(
        (task) =>
          task.status !== "Completed" &&
          task.dueDate &&
          task.dueDate < today
      ).length;

      return {
        ...project,
        totalTasks: linkedTasks.length,
        completedTasks: completed,
        progress,
        overdue,
      };
    });
  }, [projects, tasks, today]);

  const attentionTasks = useMemo(() => {
    return tasks
      .filter(
        (task) =>
          task.status !== "Completed" &&
          task.dueDate &&
          task.dueDate <= today
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5);
  }, [tasks, today]);

  const upcomingTasks = useMemo(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const endDate = `${nextWeek.getFullYear()}-${String(
      nextWeek.getMonth() + 1
    ).padStart(2, "0")}-${String(nextWeek.getDate()).padStart(2, "0")}`;

    return tasks
      .filter(
        (task) =>
          task.status !== "Completed" &&
          task.dueDate > today &&
          task.dueDate <= endDate
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5);
  }, [tasks, today]);

  const priorityStats = useMemo(() => {
    return {
      high: tasks.filter(
        (task) => task.priority === "High" && task.status !== "Completed"
      ).length,
      medium: tasks.filter(
        (task) => task.priority === "Medium" && task.status !== "Completed"
      ).length,
      low: tasks.filter(
        (task) => task.priority === "Low" && task.status !== "Completed"
      ).length,
    };
  }, [tasks]);

  const recentTasks = [...tasks]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  const recentActivities = [...activities]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() -
        new Date(a.timestamp).getTime()
    )
    .slice(0, 5);

  if (!loaded) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-slate-500">Loading dashboard...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-600">WORKSPACE OVERVIEW</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Here's what's happening across your workspace.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/projects"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              View Projects
            </Link>
            <Link
              href="/tasks"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              My Tasks
            </Link>
          </div>
        </header>

        {/* Workspace overview */}
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Workspace Overview
            </h2>
            <p className="text-sm text-slate-500">
              A quick snapshot of your projects and work.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total Projects"
              value={stats.totalProjects}
              note={`${stats.activeProjects} currently active`}
              icon="📁"
            />
            <MetricCard
              title="Total Tasks"
              value={stats.totalTasks}
              note={`${stats.completed} completed`}
              icon="✓"
            />
            <MetricCard
              title="Open Tasks"
              value={stats.open}
              note={`${stats.dueToday} due today`}
              icon="◷"
            />
            <MetricCard
              title="Overdue Tasks"
              value={stats.overdue}
              note="Need your attention"
              icon="!"
              alert
            />
          </div>
        </section>

        {/* Productivity and priorities */}
        <section className="mb-8 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">
                  Task Completion
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Overall completed work across the workspace
                </p>
              </div>
              <span className="text-3xl font-bold text-blue-600">
                {stats.completion}%
              </span>
            </div>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{ width: `${stats.completion}%` }}
              />
            </div>

            <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm">
              <span className="text-slate-500">
                {stats.completed} completed
              </span>
              <span className="font-medium text-slate-700">
                {stats.open} remaining
              </span>
            </div>

            <div className="mt-7 grid grid-cols-3 gap-3 border-t border-slate-100 pt-5">
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.planningProjects}
                </p>
                <p className="text-xs text-slate-500">Planning projects</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.activeProjects}
                </p>
                <p className="text-xs text-slate-500">Active projects</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">
                  {stats.completedProjects}
                </p>
                <p className="text-xs text-slate-500">Completed projects</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-slate-900">Open Task Priorities</h2>
            <p className="mt-1 text-sm text-slate-500">
              Where your workload stands
            </p>

            <PriorityRow label="High" value={priorityStats.high} color="bg-red-500" />
            <PriorityRow label="Medium" value={priorityStats.medium} color="bg-amber-500" />
            <PriorityRow label="Low" value={priorityStats.low} color="bg-emerald-500" />

            <Link
              href="/tasks"
              className="mt-6 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Review all tasks →
            </Link>
          </div>
        </section>

        {/* Project health */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">Project Health</h2>
              <p className="mt-1 text-sm text-slate-500">
                Progress and overdue work by project
              </p>
            </div>
            <Link
              href="/projects"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              All projects →
            </Link>
          </div>

          {projectHealth.length === 0 ? (
            <EmptyMessage message="No projects have been created yet." />
          ) : (
            <div className="space-y-5">
              {projectHealth.slice(0, 5).map((project) => (
                <div key={project.id}>
                  <div className="mb-2 flex flex-col justify-between gap-2 sm:flex-row">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {project.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {project.completedTasks} of {project.totalTasks} tasks completed
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {project.overdue > 0 && (
                        <span className="text-xs font-semibold text-red-600">
                          {project.overdue} overdue
                        </span>
                      )}
                      <span className="text-sm font-bold text-slate-800">
                        {project.progress}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Deadlines */}
        <section className="mb-8 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <TaskList
            title="Needs Attention"
            subtitle="Overdue and due today"
            tasks={attentionTasks}
            empty="Nothing overdue or due today. Great work!"
            today={today}
          />

          <TaskList
            title="Upcoming Deadlines"
            subtitle="Tasks due in the next 7 days"
            tasks={upcomingTasks}
            empty="No upcoming deadlines in the next 7 days."
            today={today}
          />
        </section>

        {/* Recent updates */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Recently Added Tasks</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Latest tasks in your workspace
                </p>
              </div>
              <Link href="/tasks" className="text-sm font-semibold text-blue-600">
                View all →
              </Link>
            </div>

            {recentTasks.length === 0 ? (
              <EmptyMessage message="No tasks available." />
            ) : (
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div key={task.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {task.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Due {formatDate(task.dueDate)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="font-bold text-slate-900">Recent Activity</h2>
              <p className="mt-1 text-sm text-slate-500">
                Latest recorded task updates
              </p>
            </div>

            {recentActivities.length === 0 ? (
              <EmptyMessage message="Activity updates will appear here when recorded by the Tasks page." />
            ) : (
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="border-l-2 border-blue-200 pl-4">
                    <p className="text-sm font-semibold text-slate-800">
                      {activity.action}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {activity.details}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(activity.timestamp).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <p className="mt-6 text-xs text-slate-400">
          Workspace metrics are calculated from the data saved in this browser.
        </p>
      </main>
    </div>
  );
}

function MetricCard({
  title,
  value,
  note,
  icon,
  alert = false,
}: {
  title: string;
  value: number;
  note: string;
  icon: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${
            alert ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
          }`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function PriorityRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const [unused] = useState(0);
  void unused;

  return (
    <div className="mt-6">
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-bold text-slate-900">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${value === 0 ? 0 : Math.min(100, value * 10)}%` }}
        />
      </div>
    </div>
  );
}

function TaskList({
  title,
  subtitle,
  tasks,
  empty,
  today,
}: {
  title: string;
  subtitle: string;
  tasks: Task[];
  empty: string;
  today: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      {tasks.length === 0 ? (
        <EmptyMessage message={empty} />
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {task.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {task.dueDate < today ? "Overdue" : "Due today"} · {formatDate(task.dueDate)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                  task.priority === "High"
                    ? "bg-red-50 text-red-600"
                    : task.priority === "Medium"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {task.priority}
              </span>
            </div>
          ))}
        </div>
      )}

      <Link
        href="/tasks"
        className="mt-5 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        Open My Tasks →
      </Link>
    </div>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
      {message}
    </p>
  );
}
