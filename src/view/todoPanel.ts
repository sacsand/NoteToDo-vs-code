
import * as vscode from 'vscode';

interface Task {
  text: string;
  completed: boolean;
}

export class TodoPanel {
  public static currentPanel: TodoPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _tasks: Task[] = [];

  public static createOrShow(context: vscode.ExtensionContext) {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    // If we already have a panel, show it.
    if (TodoPanel.currentPanel) {
      TodoPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      'todoList', // Identifies the type of the webview. Used internally
      'To-Do List', // Title of the panel displayed to the user
      column || vscode.ViewColumn.One, // Editor column to show the new webview panel in
      {
        enableScripts: true, // Enable scripts in the webview
      }
    );

    TodoPanel.currentPanel = new TodoPanel(panel, context);
  }

  private constructor(panel: vscode.WebviewPanel, private context: vscode.ExtensionContext) {
    this._panel = panel;

    // Load tasks from storage
    this._tasks = this.context.globalState.get<Task[]>('tasks', []) || [];

    // Set the webview's initial HTML content
    this._panel.webview.html = this._getHtmlForWebview();

    // Send the current tasks to the webview
    this._panel.webview.postMessage({ command: 'loadTasks', tasks: this._tasks });

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (message) => {
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
        }
      },
      null,
      this._disposables
    );
  }

  public dispose() {
    TodoPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private addTask(taskText: string) {
    const newTask: Task = { text: taskText, completed: false };
    this._tasks.push(newTask);
    this.context.globalState.update('tasks', this._tasks);
    this._panel.webview.postMessage({ command: 'newTask', task: newTask });
  }

  private deleteTask(taskText: string) {
    this._tasks = this._tasks.filter((task) => task.text !== taskText);
    this.context.globalState.update('tasks', this._tasks);
    this._panel.webview.postMessage({ command: 'loadTasks', tasks: this._tasks });
  }

  private toggleTaskCompletion(taskText: string) {
    const task = this._tasks.find((t) => t.text === taskText);
    if (task) {
      task.completed = !task.completed;
      this.context.globalState.update('tasks', this._tasks);
      this._panel.webview.postMessage({ command: 'loadTasks', tasks: this._tasks });
    }
  }

  private _getHtmlForWebview(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>To-Do List</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 10px; }
          h1 { color: #444; }
          ul { padding-left: 0; list-style: none; }
          li { display: flex; align-items: center; padding: 5px 0; }
          li.completed span { text-decoration: line-through; color: grey; }
          button { margin-left: 10px; }
        </style>
      </head>
      <body>
        <h1>To-Do List</h1>
        <ul id="tasks"></ul>
        <input type="text" id="newTask" placeholder="Enter new task">
        <button onclick="addTask()">Add Task</button>

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
              case 'newTask':
                const ulNew = document.getElementById('tasks');
                const liNew = document.createElement('li');

                const checkboxNew = document.createElement('input');
                checkboxNew.type = 'checkbox';
                checkboxNew.checked = false;
                checkboxNew.onchange = () => toggleTask(message.task.text);

                const spanNew = document.createElement('span');
                spanNew.textContent = message.task.text;

                const deleteButtonNew = document.createElement('button');
                deleteButtonNew.textContent = 'Delete';
                deleteButtonNew.onclick = () => deleteTask(message.task.text);

                liNew.appendChild(checkboxNew);
                liNew.appendChild(spanNew);
                liNew.appendChild(deleteButtonNew);
                ulNew.appendChild(liNew);
                break;
            }
          });
        </script>
      </body>
      </html>
    `;
  }
}

// import * as vscode from 'vscode';

// export class TodoPanel {
//   public static currentPanel: TodoPanel | undefined;
//   private readonly _panel: vscode.WebviewPanel;
//   private _disposables: vscode.Disposable[] = [];
//   private _tasks: string[] = [];

//   public static createOrShow(context: vscode.ExtensionContext) {
//     const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

//     // If we already have a panel, show it.
//     if (TodoPanel.currentPanel) {
//       TodoPanel.currentPanel._panel.reveal(column);
//       return;
//     }

//     // Otherwise, create a new panel.
//     const panel = vscode.window.createWebviewPanel(
//       'todoList', // Identifies the type of the webview. Used internally
//       'To-Do List', // Title of the panel displayed to the user
//       column || vscode.ViewColumn.One, // Editor column to show the new webview panel in
//       {
//         enableScripts: true, // Enable scripts in the webview
//       }
//     );

//     TodoPanel.currentPanel = new TodoPanel(panel, context);
//   }

//   private constructor(panel: vscode.WebviewPanel, private context: vscode.ExtensionContext) {
//     this._panel = panel;

//     // Load tasks from storage
//     this._tasks = this.context.globalState.get<string[]>('tasks', []);

//     // Set the webview's initial HTML content
//     this._panel.webview.html = this._getHtmlForWebview();

//     // Send the current tasks to the webview
//     this._panel.webview.postMessage({ command: 'loadTasks', tasks: this._tasks });

//     // Listen for when the panel is disposed
//     this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

//     // Handle messages from the webview
//     this._panel.webview.onDidReceiveMessage(
//       (message) => {
//         switch (message.command) {
//           case 'addTask':
//             this.addTask(message.text);
//             return;
//           case 'deleteTask':
//             this.deleteTask(message.text);
//             return;
//         }
//       },
//       null,
//       this._disposables
//     );
//   }

//   public dispose() {
//     TodoPanel.currentPanel = undefined;

//     // Clean up our resources
//     this._panel.dispose();

//     while (this._disposables.length) {
//       const x = this._disposables.pop();
//       if (x) {
//         x.dispose();
//       }
//     }
//   }

//   private addTask(task: string) {
//     this._tasks.push(task);
//     this.context.globalState.update('tasks', this._tasks);
//     this._panel.webview.postMessage({ command: 'newTask', text: task });
//   }

//   private deleteTask(task: string) {
//     this._tasks = this._tasks.filter((t) => t !== task);
//     this.context.globalState.update('tasks', this._tasks);
//     this._panel.webview.postMessage({ command: 'loadTasks', tasks: this._tasks });
//   }

//   private _getHtmlForWebview(): string {
//     return `
//       <!DOCTYPE html>
//       <html lang="en">
//       <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>To-Do List x</title>
//         <style>
//           body { font-family: Arial, sans-serif; padding: 10px; }
//           h1 { color: #444; }
//           ul { padding-left: 0; list-style: none; }
//           li { display: flex; justify-content: space-between; padding: 5px 0; }
//           button { margin-left: 10px; }
//         </style>
//       </head>
//       <body>
//         <h1>To-Do List</h1>
//         <ul id="tasks"></ul>
//         <input type="text" id="newTask" placeholder="Enter new task">
//         <button onclick="addTask()">Add Task</button>

//         <script>
//           const vscode = acquireVsCodeApi();

//           function addTask() {
//             const input = document.getElementById('newTask');
//             const taskText = input.value;
//             if (taskText) {
//               vscode.postMessage({
//                 command: 'addTask',
//                 text: taskText
//               });
//               input.value = '';
//             }
//           }

//           function deleteTask(taskText) {
//             vscode.postMessage({
//               command: 'deleteTask',
//               text: taskText
//             });
//           }

//           window.addEventListener('message', event => {
//             const message = event.data;

//             switch (message.command) {
//               case 'loadTasks':
//                 const ul = document.getElementById('tasks');
//                 ul.innerHTML = '';
//                 message.tasks.forEach(task => {
//                   const li = document.createElement('li');
//                   li.textContent = task;
//                   const deleteButton = document.createElement('button');
//                   deleteButton.textContent = 'Delete';
//                   deleteButton.onclick = () => deleteTask(task);
//                   li.appendChild(deleteButton);
//                   ul.appendChild(li);
//                 });
//                 break;
//               case 'newTask':
//                 const ulNew = document.getElementById('tasks');
//                 const liNew = document.createElement('li');
//                 liNew.textContent = message.text;
//                 const deleteButtonNew = document.createElement('button');
//                 deleteButtonNew.textContent = 'Delete';
//                 deleteButtonNew.onclick = () => deleteTask(message.text);
//                 liNew.appendChild(deleteButtonNew);
//                 ulNew.appendChild(liNew);
//                 break;
//             }
//           });
//         </script>
//       </body>
//       </html>
//     `;
//   }
// }

// import * as vscode from 'vscode';
// import * as path from 'path';
// import * as fs from 'fs';

// export class TodoPanel {
//   public static currentPanel: TodoPanel | undefined;
//   private readonly _panel: vscode.WebviewPanel;
//   private readonly _extensionUri: vscode.Uri;
//   private _disposables: vscode.Disposable[] = [];

//   public static createOrShow(extensionUri: vscode.Uri) {
//     const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

//     // If we already have a panel, show it.
//     if (TodoPanel.currentPanel) {
//       TodoPanel.currentPanel._panel.reveal(column);
//       return;
//     }

//     // Otherwise, create a new panel.
//     const panel = vscode.window.createWebviewPanel(
//       'todoList', // Identifies the type of the webview. Used internally
//       'To-Do List', // Title of the panel displayed to the user
//       column || vscode.ViewColumn.One, // Editor column to show the new webview panel in
//       {
//         // Enable scripts in the webview
//         enableScripts: true,

//         // Local resource roots for loading assets
//         localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
//       }
//     );

//     TodoPanel.currentPanel = new TodoPanel(panel, extensionUri);
//   }

//   private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
//     this._panel = panel;
//     this._extensionUri = extensionUri;

//     // Set the webview's initial HTML content
//     this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

//     // Listen for when the panel is disposed
//     this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

//     // Handle messages from the webview
//     this._panel.webview.onDidReceiveMessage(
//       message => {
//         switch (message.command) {
//           case 'addTask':
//             this.addTask(message.text);
//             return;
//         }
//       },
//       null,
//       this._disposables
//     );
//   }

//   public dispose() {
//     TodoPanel.currentPanel = undefined;

//     // Clean up our resources
//     this._panel.dispose();

//     while (this._disposables.length) {
//       const x = this._disposables.pop();
//       if (x) {
//         x.dispose();
//       }
//     }
//   }

//   private _getHtmlForWebview(webview: vscode.Webview): string {
//     // HTML content for the panel
//     return `
//       <!DOCTYPE html>
//       <html lang="en">
//       <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>To-Do List</title>
//       </head>
//       <body>
//         <h1>To-Do List</h1>
//         <ul id="tasks"></ul>
//         <input type="text" id="newTask" placeholder="Enter new task">
//         <button onclick="addTask()">Add Task</button>

//         <script>
//           const vscode = acquireVsCodeApi();

//           function addTask() {
//             const input = document.getElementById('newTask');
//             const taskText = input.value;
//             if (taskText) {
//               vscode.postMessage({
//                 command: 'addTask',
//                 text: taskText
//               });
//               input.value = '';
//             }
//           }

//           window.addEventListener('message', event => {
//             const message = event.data;

//             switch (message.command) {
//               case 'newTask':
//                 const ul = document.getElementById('tasks');
//                 const li = document.createElement('li');
//                 li.textContent = message.text;
//                 ul.appendChild(li);
//                 break;
//             }
//           });
//         </script>
//       </body>
//       </html>`;
//   }

//   private addTask(task: string) {
//     // Store the task locally (in memory for simplicity, you can use local storage or file system)
//     const tasksFile = path.join(this._extensionUri.fsPath, 'tasks.json');
//     let tasks: string[] = [];

//     if (fs.existsSync(tasksFile)) {
//       tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
//     }
//     tasks.push(task);
//     fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));

//     this._panel.webview.postMessage({ command: 'newTask', text: task });
//   }
// }