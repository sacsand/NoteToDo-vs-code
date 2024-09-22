import * as vscode from 'vscode';

interface Task {
  text: string;
  completed: boolean;
}

export class TodoPanel {
  private static currentPanel: TodoPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _tasks: Task[] = [];
  private _markdownContent: string = '';

  private static readonly TASKS_KEY = 'todoPanel.tasks';
  private static readonly MARKDOWN_KEY = 'todoPanel.markdownContent';

  public static async createOrShow(context: vscode.ExtensionContext) {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    if (TodoPanel.currentPanel) {
      TodoPanel.currentPanel._panel.reveal(column);
      await TodoPanel.currentPanel.loadData(context);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'todoAndMarkdown',
      'To-Do List & Markdown Editor',
      column || vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    TodoPanel.currentPanel = new TodoPanel(panel, context);
    await TodoPanel.currentPanel.loadData(context);
  }

  private constructor(panel: vscode.WebviewPanel, private context: vscode.ExtensionContext) {
    this._panel = panel;

    this._panel.title = this.getWorkspaceTitle();

    this._panel.webview.html = this._getHtmlForWebview();
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.onDidChangeViewState((e) => {
      if (e.webviewPanel.visible) {
        this.loadData(context);
      }
    }, null, this._disposables);

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
            this.saveMarkdownContent(message.content);
            return;
        }
      },
      null,
      this._disposables
    );

    vscode.window.onDidChangeActiveTextEditor(() => {
      this.loadData(context);
    }, null, this._disposables);
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

  private async loadData(context: vscode.ExtensionContext) {
    await this.loadTasks(context);
    await this.loadMarkdownContent(context);
  }

  private async loadTasks(context: vscode.ExtensionContext) {
    this._tasks = context.workspaceState.get<Task[]>(TodoPanel.TASKS_KEY, []);
    this._panel.webview.postMessage({ command: 'loadTasks', tasks: this._tasks });
  }

  private saveTasks() {
    this.context.workspaceState.update(TodoPanel.TASKS_KEY, this._tasks);
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

  private async loadMarkdownContent(context: vscode.ExtensionContext) {
    this._markdownContent = context.workspaceState.get<string>(TodoPanel.MARKDOWN_KEY, '');
    this._panel.webview.postMessage({ command: 'loadMarkdownContent', content: this._markdownContent });
  }

  private saveMarkdownContent(content: string) {
    this._markdownContent = content;
    this.context.workspaceState.update(TodoPanel.MARKDOWN_KEY, this._markdownContent);
  }

  private getWorkspaceTitle(): string {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      const workspaceName = folders[0].name;
      const workspacePath = folders[0].uri.fsPath;
      return `To-Do & Markdown Editor - ${workspaceName} (${workspacePath})`;
    }
    return 'To-Do & Markdown Editor (No Workspace)';
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
          #editor { height: 100%; }
        </style>
        <link href="https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.snow.css" rel="stylesheet" />
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
          <div id="editor"></div>
          <button onclick="saveMarkdown()">Save Markdown</button>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.min.js"></script>
        <script>
          const vscode = acquireVsCodeApi();
          let quill = new Quill('#editor', { theme: 'snow' });

          window.addEventListener('message', (event) => {
            const message = event.data;
            switch (message.command) {
              case 'loadTasks':
                loadTasks(message.tasks);
                break;
              case 'loadMarkdownContent':
                // Safely set the content of the editor
                quill.root.innerHTML = message.content || '<p><br></p>'; // Ensure an empty editor state
                break;
            }
          });

          quill.on('text-change', () => {
            autoSaveMarkdown(); // Trigger auto-save on text change
          });

          function loadTasks(tasks) {
            const ul = document.getElementById('tasks');
            ul.innerHTML = '';
            tasks.forEach(task => {
              const li = document.createElement('li');
              li.className = task.completed ? 'completed' : '';
              li.innerHTML = \`
                <span onclick="toggleTask(\\'\${task.text}\\')">\${task.text}</span>
                <button onclick="deleteTask(\\'\${task.text}\\')">Delete</button>
              \`;
              ul.appendChild(li);
            });
          }

          function addTask() {
            const input = document.getElementById('newTask');
            if (input.value.trim() === '') return;
            vscode.postMessage({ command: 'addTask', text: input.value.trim() });
            input.value = '';
          }

          function deleteTask(text) {
            vscode.postMessage({ command: 'deleteTask', text });
          }

          function toggleTask(text) {
            vscode.postMessage({ command: 'toggleTask', text });
          }

          function saveMarkdown() {
            const content = quill.root.innerHTML;
            vscode.postMessage({ command: 'saveMarkdown', content });
            vscode.setState({ markdownContent: content });
          }

          function autoSaveMarkdown() {
            saveMarkdown();
          }

          window.addEventListener('beforeunload', () => {
            saveMarkdown(); // Save markdown before the window is unloaded
          });
        </script>
      </body>
      </html>
    `;
  }
}