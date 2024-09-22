# To-Do & Markdown Editor

This VS Code extension provides a dual-purpose panel for managing your tasks and editing markdown notes within your workspace. It allows you to keep track of your to-dos while simultaneously working on markdown files, enhancing productivity and organization.

## Features

- **To-Do List Management**:
  - Add, edit, and delete tasks.
  - Mark tasks as completed or incomplete.
  - Automatically save your tasks within your workspace for easy access.

- **Markdown Editor**:
  - Create and edit markdown notes alongside your to-do list.
  - Automatic periodic saving of markdown content.
  - Supports standard markdown syntax for quick note-taking and documentation.

- **Workspace Integration**:
  - Automatically detects the current workspace and saves data within the `.noteToDo` directory.
  - Displays the current workspace name and path in the panel title for easy identification.

## Getting Started

1. **Installation**: 
   - Install the extension from the [Visual Studio Code Marketplace](#).
   - Reload your VS Code window to activate the extension.

2. **Opening the Panel**:
   - Open the To-Do & Markdown panel via the command palette (`Ctrl + Shift + P` or `Cmd + Shift + P` on Mac) and select `To-Do & Markdown: Open Panel`.
   - You can also use the shortcut `Alt + T` to quickly open the panel.

3. **Managing Tasks**:
   - Add a new task by entering text in the input box and clicking the "Add Task" button.
   - Mark a task as complete by checking the checkbox next to it.
   - Delete a task by clicking the "Delete" button next to the task.

4. **Editing Markdown**:
   - Use the markdown editor on the right side of the panel to write or edit markdown content.
   - Content is auto-saved every 5 seconds, or you can manually trigger a save by editing the content.

## Configuration

No specific configuration is required. The extension automatically creates a `.noteToDo` directory in the workspace root to store your to-do list and markdown files.

## Known Issues

- If the panel is reloaded or switched to another tab, the data may briefly disappear. Switching back to the panel reloads the saved data.
- The extension currently supports only one active workspace at a time. Switching between multiple workspaces may cause some data inconsistencies.

## Release Notes

### 1.0.0
- Initial release with basic to-do list and markdown editor features.

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request on the [GitHub repository](#).

## License

This project is licensed under the MIT License. See the [LICENSE](https://github.com/sacsand/NoteToDo-vs-code/blob/develop/LICENSE) file for details.

---

