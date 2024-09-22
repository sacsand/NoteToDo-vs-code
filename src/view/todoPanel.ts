import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface Task {
  text: string;
  completed: boolean;
}

export class TodoPanel {
  private static currentPanel: TodoPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _tasks: Task[] = [];
  private _tasksFilePath: string | undefined;
  private _markdownFilePath: string | undefined;

  public static async createOrShow() {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    if (TodoPanel.currentPanel) {
      TodoPanel.currentPanel._panel.reveal(column);
      await TodoPanel.currentPanel.loadData();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'todoAndMarkdown',
      'To-Do List & Markdown Editor',
      column || vscode.ViewColumn.One,
      { enableScripts: true, localResourceRoots: [vscode.Uri.file(path.join(__dirname, 'media'))] }
    );

    TodoPanel.currentPanel = new TodoPanel(panel);
    await TodoPanel.currentPanel.loadData();
  }

  private constructor(panel: vscode.WebviewPanel) {
    this._panel = panel;

    this.setFilePaths();

    this._panel.webview.html = this._getHtmlForWebview();
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'addTask':
            this.addTask(message.text);
            return;
          case 'deleteTask':
            this.deleteTask(message.text);
            return;
          case 'toggleTask':
            this.toggleTaskCompletion(message.text);
            return;
          case 'saveMarkdown':
            await this.saveMarkdownContent(message.content);
            return;
        }
      },
      null,
      this._disposables
    );

    vscode.window.onDidChangeActiveTextEditor(() => {
      this.setFilePaths();
      this.loadData();
    }, null, this._disposables);
  }

  private setFilePaths() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const noteToDoDir = path.join(workspaceRoot, '.noteToDo');
      if (!fs.existsSync(noteToDoDir)) {
        fs.mkdirSync(noteToDoDir);
      }
      this._tasksFilePath = path.join(noteToDoDir, 'todo-list.json');
      this._markdownFilePath = path.join(noteToDoDir, 'notes.md');
    }
  }

  public dispose() {
    TodoPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private async loadData() {
    await this.loadTasks();
    await this.loadMarkdownContent();
  }

  private async loadTasks() {
    if (this._tasksFilePath && fs.existsSync(this._tasksFilePath)) {
      try {
        const fileContent = fs.readFileSync(this._tasksFilePath, 'utf8');
        this._tasks = JSON.parse(fileContent) || [];
      } catch (err) {
        console.error('Error reading the tasks file:', err);
        this._tasks = [];
      }
    } else {
      this._tasks = [];
    }

    this._panel.webview.postMessage({ command: 'loadTasks', tasks: this._tasks });
  }

  private saveTasks() {
    if (this._tasksFilePath) {
      try {
        fs.writeFileSync(this._tasksFilePath, JSON.stringify(this._tasks, null, 2));
      } catch (err) {
        console.error('Error writing the tasks file:', err);
      }
    }
  }

  private addTask(taskText: string) {
    const newTask: Task = { text: taskText, completed: false };
    this._tasks.push(newTask);
    this.saveTasks();
    this._panel.webview.postMessage({ command: 'loadTasks', tasks: this._tasks });
  }

  private deleteTask(taskText: string) {
    this._tasks = this._tasks.filter((task) => task.text !== taskText);
    this.saveTasks();
    this._panel.webview.postMessage({ command: 'loadTasks', tasks: this._tasks });
  }

  private toggleTaskCompletion(taskText: string) {
    const task = this._tasks.find((t) => t.text === taskText);
    if (task) {
      task.completed = !task.completed;
      this.saveTasks();
      this._panel.webview.postMessage({ command: 'loadTasks', tasks: this._tasks });
    }
  }

  private async loadMarkdownContent() {
    if (this._markdownFilePath && fs.existsSync(this._markdownFilePath)) {
      try {
        const content = fs.readFileSync(this._markdownFilePath, 'utf8');
        this._panel.webview.postMessage({ command: 'loadMarkdownContent', content });
      } catch (err) {
        console.error('Error reading the markdown file:', err);
      }
    }
  }

  private async saveMarkdownContent(content: string) {
    if (this._markdownFilePath) {
      try {
        fs.writeFileSync(this._markdownFilePath, content);
      } catch (err) {
        console.error('Error writing the markdown file:', err);
      }
    }
  }

  private _getHtmlForWebview(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>To-Do List & Markdown Editor</title>
        <style>
          body { display: flex; height: 100vh; margin: 0; font-family: Arial, sans-serif; }
          .panel { flex: 1; overflow: auto; padding: 10px; }
          .left { border-right: 1px solid #ddd; }
          .right { padding-left: 20px; }
          ul { padding-left: 0; list-style: none; }
          li { display: flex; align-items: center; padding: 5px 0; }
          li.completed span { text-decoration: line-through; color: grey; }
          button { margin-left: 10px; }
          textarea { width: 100%; height: 100%; border: none; padding: 10px; box-sizing: border-box; 
                     background-color: #1e1e1e; color: #d4d4d4; } /* VS Code dark theme colors */
        </style>
      </head>
      <body>
        <div class="panel left">
          <h1>To-Do List</h1>
          <ul id="tasks"></ul>
          <input type="text" id="newTask" placeholder="Enter new task">
          <button onclick="addTask()">Add Task</button>
        </div>
        <div class="panel right">
          <h1>Markdown Editor</h1>
          <textarea id="editor"></textarea>
        </div>

        <script>
          const vscode = acquireVsCodeApi();

          function addTask() {
            const input = document.getElementById('newTask');
            const taskText = input.value;
            if (taskText) {
              vscode.postMessage({
                command: 'addTask',
                text: taskText
              });
              input.value = '';
            }
          }

          function toggleTask(taskText) {
            vscode.postMessage({
              command: 'toggleTask',
              text: taskText
            });
          }

          function deleteTask(taskText) {
            vscode.postMessage({
              command: 'deleteTask',
              text: taskText
            });
          }

          function saveMarkdown() {
            const content = document.getElementById('editor').value;
            vscode.postMessage({
              command: 'saveMarkdown',
              content: content
            });
          }

          window.addEventListener('message', event => {
            const message = event.data;

            switch (message.command) {
              case 'loadTasks':
                const ul = document.getElementById('tasks');
                ul.innerHTML = '';
                message.tasks.forEach(task => {
                  const li = document.createElement('li');
                  li.classList.toggle('completed', task.completed);

                  const checkbox = document.createElement('input');
                  checkbox.type = 'checkbox';
                  checkbox.checked = task.completed;
                  checkbox.onchange = () => toggleTask(task.text);

                  const span = document.createElement('span');
                  span.textContent = task.text;

                  const deleteButton = document.createElement('button');
                  deleteButton.textContent = 'Delete';
                  deleteButton.onclick = () => deleteTask(task.text);

                  li.appendChild(checkbox);
                  li.appendChild(span);
                  li.appendChild(deleteButton);
                  ul.appendChild(li);
                });
                break;
              case 'loadMarkdownContent':
                const editor = document.getElementById('editor');
                editor.value = message.content;
                break;
            }
          });

          // Save markdown content periodically
          setInterval(saveMarkdown, 5000);
        </script>
      </body>
      </html>
    `;
  }
}