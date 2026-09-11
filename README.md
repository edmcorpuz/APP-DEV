# Taskflow — To-Do List Application

A simple, responsive, Notion-inspired to-do list web application for the
Applications Development and Emerging Technologies prelim examination.

## Features

- Create tasks through a focused floating form without refreshing the page
- JavaScript validation prevents empty tasks
- View all, active, or completed tasks
- Assign an existing category from a dropdown or create a new category
- Automatically group tasks by category
- Open any task in an editable floating detail window
- Add rich task details with bold text, strikethrough, bullets, uppercase, and lowercase formatting
- Use Select all to safely reveal bulk deletion, with confirmation before deleting
- Mark tasks as completed with visual feedback
- Edit task text
- Delete individual tasks
- Delete all tasks with a simulated two-second asynchronous loading state
- Persist tasks in browser Local Storage
- Responsive, presentable UI with a workspace sidebar and database-style list

## Run in VS Code

1. Open this folder in VS Code:

   ```text
   C:\Users\BloodMank\Desktop\To-Do-List-Application
   ```

2. Install the **Live Server** VS Code extension if it is not installed.
3. Right-click `index.html`.
4. Select **Open with Live Server**.
5. The application opens in your browser.

You can also use the included VS Code launch configuration and press `F5`.

## GitHub Pages

This is a static website, so it can be published directly with GitHub Pages.

```bash
git init -b Prelim-Exam
git add .
git commit -m "Create prelim to-do list application"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin Prelim-Exam
```

Then in GitHub:

1. Open **Settings → Pages**.
2. Choose **Deploy from a branch**.
3. Select `Prelim-Exam` and the `/ (root)` folder.
4. Save and open the generated Pages URL.

## Project structure

```text
index.html   page structure and accessible controls
styles.css   responsive visual design
app.js       state, events, validation, CRUD, and Local Storage
.vscode/     VS Code launch settings
```

The task state is kept in one JavaScript array and saved under:

```text
localStorage["taskflow.tasks.v1"]
```

This keeps the first version simple while leaving room for categories, due dates,
accounts, a backend, or a database later.
