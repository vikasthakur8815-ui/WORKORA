# 🚀 Phrasis – Project Management Platform

**From Ideas to Execution.**

Phrasis is a modern and responsive Project Management Platform designed to help users organize projects, manage tasks, track progress, and improve productivity through a clean and intuitive interface.

The project focuses on providing an organized workspace where users can manage their tasks and projects efficiently.

## 🌐 Live Demo

**Live Application:** https://phrasis.vercel.app/

## ✨ Features

### 📊 Interactive Dashboard
- Overview of workspace activity.
- Project and task statistics.
- Task completion insights.
- Priority distribution.
- Recent activities and upcoming tasks.

### ✅ Task Management
- Create, update, and delete tasks.
- Set task priorities: Low, Medium, and High.
- Manage task statuses.
- Assign due dates.
- Search, filter, and sort tasks.
- Kanban-style task management.
- Bulk task operations.
- CSV import and export.
- Task comments, notes, and activity history.

### 📁 Project Management
- Create, edit, and delete projects.
- Track project progress.
- Manage project statuses.
- View project-related task statistics.
- Search and filter projects.

### 📱 Responsive Design
- Responsive user interface.
- Mobile-friendly navigation.
- Optimized layouts for different screen sizes.

### 💾 Data Persistence
- Browser-based data storage using LocalStorage.
- IndexedDB support for attachment data.
- Data remains available after refreshing the browser.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Next.js | React framework |
| React.js | User interface development |
| TypeScript | Static typing and type safety |
| Tailwind CSS | Styling and responsive design |
| LocalStorage | Client-side data persistence |
| IndexedDB | Browser-based attachment storage |
| Git & GitHub | Version control |
| Vercel | Deployment |

## 📂 Project Structure

```text
phrasis/
│
├── public/
│
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── projects/
│   │   │   └── page.tsx
│   │   └── tasks/
│   │       └── page.tsx
│   │
│   └── components/
│       └── layout/
│           └── Sidebar.tsx
│
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

## ⚙️ Getting Started

Follow these steps to run Phrasis locally.

### 1. Clone the Repository

```bash
git clone https://github.com/vikasthakur8815-ui/phrasis.git
```

### 2. Navigate to the Project Directory

```bash
cd phrasis
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start the Development Server

```bash
npm run dev
```

### 5. Open in Browser

Visit:

```text
http://localhost:3000
```

## 🏗️ Build for Production

To create a production build:

```bash
npm run build
```

To run the production build locally:

```bash
npm run start
```

## 🚧 Current Development Status

**Version 1.0 – Beta**

The first version focuses on frontend functionality, task management, project management, responsive design, and browser-based data persistence.

Phrasis is currently a frontend-based application. It does not yet provide backend-powered multi-user collaboration or centralized cloud data synchronization.

## 🔮 Future Improvements

Future development will focus on:

- Backend integration using FastAPI.
- PostgreSQL database integration.
- Secure user authentication and authorization.
- Cloud-based data storage.
- Team collaboration and multi-user support.
- Real-time notifications.
- Advanced analytics and reporting.
- Improved security and scalability.

These improvements are part of the project's ongoing development roadmap.

## 🎯 Project Objective

The objective of Phrasis is to build a practical project management solution while exploring modern web development technologies, software architecture, and real-world application development.

## 👨‍💻 Developer

**Vikas Singh**

- GitHub: [vikasthakur8815-ui](https://github.com/vikasthakur8815-ui)
- Project Repository: [Phrasis](https://github.com/vikasthakur8815-ui/phrasis)

---

⭐ If you find this project interesting, consider giving the repository a star!

**Phrasis – From Ideas to Execution.**
