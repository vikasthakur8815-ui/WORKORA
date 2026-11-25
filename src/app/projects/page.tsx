
"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import Sidebar from "@/components/layout/Sidebar";

type ProjectStatus = "Planning" | "In Progress" | "Completed";

type Project = {
  id: number;
  name: string;
  status: ProjectStatus;
  progress: number;
};

type Task = {
  id: number;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High";
  status: "To Do" | "In Progress" | "Completed";
  dueDate: string;
  projectId?: number | null;
};

const PROJECTS_KEY = "phrasis_projects";
const TASKS_KEY = "phrasis_tasks";

const initialProjects: Project[] = [
  { id: 1, name: "Website Redesign", status: "In Progress", progress: 75 },
  { id: 2, name: "Mobile App Development", status: "Planning", progress: 25 },
  { id: 3, name: "Dashboard Analytics", status: "Completed", progress: 100 },
];

const statusStyles: Record<ProjectStatus, string> = {
  Planning: "bg-amber-100 text-amber-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Completed: "bg-green-100 text-green-700",
};

function getStatusFromProgress(progress: number): ProjectStatus {
  if (progress === 0) return "Planning";
  if (progress === 100) return "Completed";
  return "In Progress";
}

function normalizeProgress(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  // LOAD DATA
  useEffect(() => {
    try {
      const savedProjects = localStorage.getItem(PROJECTS_KEY);
      const savedTasks = localStorage.getItem(TASKS_KEY);

      if (savedProjects) {
        const parsed = JSON.parse(savedProjects);
        setProjects(Array.isArray(parsed) ? parsed : initialProjects);
      } else {
        setProjects(initialProjects);
      }

      if (savedTasks) {
        const parsed = JSON.parse(savedTasks);
        if (Array.isArray(parsed)) setTasks(parsed);
      }
    } catch (error) {
      console.error("Unable to load data:", error);
      setProjects(initialProjects);
    }

    setLoaded(true);
  }, []);

  // SAVE PROJECTS
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }, [projects, loaded]);

  // REFRESH DATA
  function refreshData() {
    try {
      const savedProjects = localStorage.getItem(PROJECTS_KEY);
      const savedTasks = localStorage.getItem(TASKS_KEY);

      if (savedProjects) {
        const parsed = JSON.parse(savedProjects);
        if (Array.isArray(parsed)) setProjects(parsed);
      }

      if (savedTasks) {
        const parsed = JSON.parse(savedTasks);
        if (Array.isArray(parsed)) setTasks(parsed);
      }
    } catch (error) {
      console.error("Unable to refresh data:", error);
    }
  }

  useEffect(() => {
    window.addEventListener("storage", refreshData);
    window.addEventListener("focus", refreshData);
    window.addEventListener("phrasis-data-updated", refreshData);

    return () => {
      window.removeEventListener("storage", refreshData);
      window.removeEventListener("focus", refreshData);
      window.removeEventListener("phrasis-data-updated", refreshData);
    };
  }, []);

  function saveProjects(updated: Project[]) {
    setProjects(updated);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("phrasis-data-updated"));
  }

  // CREATE PROJECT
  function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = newName.trim();
    if (!name) return;

    const newProject: Project = {
      id: Date.now(),
      name,
      status: "Planning",
      progress: 0,
    };

    saveProjects([newProject, ...projects]);
    setNewName("");
  }

  // DELETE PROJECT
  function handleDeleteProject(projectId: number) {
    const linkedTasks = tasks.filter(
      (task) => task.projectId === projectId
    );

    const message =
      linkedTasks.length > 0
        ? `This project has ${linkedTasks.length} linked tasks. Deleting it will unassign them. Continue?`
        : "Are you sure you want to delete this project?";

    if (!window.confirm(message)) return;

    const updatedProjects = projects.filter(
      (project) => project.id !== projectId
    );

    const updatedTasks = tasks.map((task) =>
      task.projectId === projectId
        ? { ...task, projectId: null }
        : task
    );

    saveProjects(updatedProjects);
    setTasks(updatedTasks);
    localStorage.setItem(TASKS_KEY, JSON.stringify(updatedTasks));

    window.dispatchEvent(new Event("phrasis-data-updated"));
  }

  // RENAME PROJECT
  function handleRenameProject(projectId: number) {
    const name = editingName.trim();
    if (!name) return;

    const updated = projects.map((project) =>
      project.id === projectId ? { ...project, name } : project
    );

    saveProjects(updated);
    setEditingId(null);
    setEditingName("");
  }

  // UPDATE PROGRESS
  function updateProjectProgress(projectId: number, value: number) {
    const progress = normalizeProgress(value);

    const updated = projects.map((project) =>
      project.id === projectId
        ? {
            ...project,
            progress,
            status: getStatusFromProgress(progress),
          }
        : project
    );

    saveProjects(updated);
  }

  // UPDATE STATUS
  function updateProjectStatus(
    projectId: number,
    status: ProjectStatus
  ) {
    const updated = projects.map((project) => {
      if (project.id !== projectId) return project;

      let progress = project.progress;

      if (status === "Planning") progress = 0;
      if (status === "Completed") progress = 100;

      return { ...project, status, progress };
    });

    saveProjects(updated);
  }

  // PROJECT TASK STATISTICS
  const projectData = useMemo(() => {
    return projects.map((project) => {
      const linkedTasks = tasks.filter(
        (task) => task.projectId === project.id
      );

      const completedTasks = linkedTasks.filter(
        (task) => task.status === "Completed"
      ).length;

      const overdueTasks = linkedTasks.filter((task) => {
        if (!task.dueDate || task.status === "Completed") return false;

        return task.dueDate < new Date().toISOString().split("T")[0];
      }).length;

      return {
        ...project,
        linkedTasks: linkedTasks.length,
        completedTasks,
        remainingTasks: linkedTasks.length - completedTasks,
        overdueTasks,
      };
    });
  }, [projects, tasks]);

  // SEARCH AND FILTER
  const filteredProjects = useMemo(() => {
    return projectData.filter((project) => {
      const matchesSearch = project.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesFilter =
        filter === "All" || project.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [projectData, search, filter]);

  // SUMMARY
  const totalProjects = projects.length;

  const completedProjects = projects.filter(
    (project) => project.status === "Completed"
  ).length;

  const activeProjects = projects.filter(
    (project) => project.status === "In Progress"
  ).length;

  const planningProjects = projects.filter(
    (project) => project.status === "Planning"
  ).length;

  const averageProgress =
    projects.length > 0
      ? Math.round(
          projects.reduce((sum, project) => sum + project.progress, 0) /
            projects.length
        )
      : 0;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* HEADER */}
          <header>
            <p className="text-sm font-medium text-blue-600">
              Workspace
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Projects
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage projects, track progress and monitor work.
            </p>
          </header>

          {/* STATISTICS */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total Projects", value: totalProjects, color: "text-slate-900" },
              { label: "In Progress", value: activeProjects, color: "text-blue-600" },
              { label: "Planning", value: planningProjects, color: "text-amber-600" },
              { label: "Completed", value: completedProjects, color: "text-green-600" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className={`mt-3 text-3xl font-bold ${item.color}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </section>

          {/* OVERALL PROGRESS */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Overall Project Progress
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Average completion across all projects
                </p>
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {averageProgress}%
              </p>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{ width: `${averageProgress}%` }}
              />
            </div>
          </section>

          {/* CREATE PROJECT */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Create New Project
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Add a new project to your workspace.
            </p>

            <form
              onSubmit={handleCreateProject}
              className="mt-5 flex flex-col gap-3 sm:flex-row"
            >
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Enter project name"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500"
                required
              />

              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                + Create Project
              </button>
            </form>
          </section>

          {/* SEARCH AND FILTER */}
          <section className="flex flex-col gap-3 sm:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects..."
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500"
            />

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
            >
              <option value="All">All Projects</option>
              <option value="Planning">Planning</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </section>

          {/* PROJECT LIST */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                Your Projects
              </h2>
              <p className="text-sm text-slate-500">
                {filteredProjects.length} projects
              </p>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <h3 className="font-semibold text-slate-800">
                  No projects found
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Create a project or change your search/filter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {filteredProjects.map((project) => (
                  <article
                    key={project.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
                  >
                    {/* PROJECT HEADER */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        {editingId === project.id ? (
                          <div className="flex flex-col gap-2">
                            <input
                              value={editingName}
                              onChange={(event) =>
                                setEditingName(event.target.value)
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleRenameProject(project.id)}
                                className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <h3 className="break-words text-lg font-bold text-slate-900">
                            {project.name}
                          </h3>
                        )}

                        <span
                          className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[project.status]}`}
                        >
                          {project.status}
                        </span>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(project.id);
                            setEditingName(project.name);
                          }}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProject(project.id)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* PROGRESS */}
                    <div className="mt-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-700">
                          Project Progress
                        </h4>
                        <span className="text-xl font-bold text-blue-600">
                          {project.progress}%
                        </span>
                      </div>

                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>

                      <div className="mt-4 flex justify-between text-xs text-slate-500">
                        <span>0%</span>
                        <span>Adjust project progress</span>
                        <span>100%</span>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={project.progress}
                        onChange={(event) =>
                          updateProjectProgress(
                            project.id,
                            Number(event.target.value)
                          )
                        }
                        className="mt-3 w-full cursor-pointer accent-blue-600"
                        aria-label={`Progress for ${project.name}`}
                      />
                    </div>

                    {/* STATUS */}
                    <div className="mt-5">
                      <label
                        htmlFor={`status-${project.id}`}
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Update Project Status
                      </label>

                      <select
                        id={`status-${project.id}`}
                        value={project.status}
                        onChange={(event) =>
                          updateProjectStatus(
                            project.id,
                            event.target.value as ProjectStatus
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                      >
                        <option value="Planning">Planning</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>

                      <p className="mt-2 text-xs text-slate-500">
                        Planning sets progress to 0%. Completed sets it to 100%.
                      </p>
                    </div>

                    {/* TASK STATISTICS */}
                    <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-4">
                      <div>
                        <p className="text-xs text-slate-500">Total Tasks</p>
                        <p className="mt-1 text-xl font-bold text-slate-900">
                          {project.linkedTasks}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Completed</p>
                        <p className="mt-1 text-xl font-bold text-green-600">
                          {project.completedTasks}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Remaining</p>
                        <p className="mt-1 text-xl font-bold text-blue-600">
                          {project.remainingTasks}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Overdue</p>
                        <p className="mt-1 text-xl font-bold text-red-600">
                          {project.overdueTasks}
                        </p>
                      </div>
                    </div>

                    {project.linkedTasks === 0 && (
                      <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                        No tasks are linked to this project yet. Progress is
                        currently managed manually.
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
