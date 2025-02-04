const vscode = require("vscode");

// 创建装饰器类型对象，使用对象字面量语法定义不同颜色的装饰器
const commentDecorations = {
  yellow: vscode.window.createTextEditorDecorationType({
    backgroundColor: "#FFD70055",
    isWholeLine: true,
  }),
  blue: vscode.window.createTextEditorDecorationType({
    backgroundColor: "#4169E155",
    isWholeLine: true,
  }),
  green: vscode.window.createTextEditorDecorationType({
    backgroundColor: "#32CD3255",
    isWholeLine: true,
  }),
  red: vscode.window.createTextEditorDecorationType({
    backgroundColor: "#FF450055",
    isWholeLine: true,
  }),
  purple: vscode.window.createTextEditorDecorationType({
    backgroundColor: "#9370DB55",
    isWholeLine: true,
  }),
  orange: vscode.window.createTextEditorDecorationType({
    backgroundColor: "#FFA50055",
    isWholeLine: true,
  }),
  pink: vscode.window.createTextEditorDecorationType({
    backgroundColor: "#FF69B455",
    isWholeLine: true,
  }),
  cyan: vscode.window.createTextEditorDecorationType({
    backgroundColor: "#00CED155",
    isWholeLine: true,
  }),
  brown: vscode.window.createTextEditorDecorationType({
    backgroundColor: "#A0522D55",
    isWholeLine: true,
  }),
  lime: vscode.window.createTextEditorDecorationType({
    backgroundColor: "#32CD3255",
    isWholeLine: true,
  }),
};

// 箭头函数定义：检查是否是注释行
const isCommentLine = (text) => {
  const trimmedText = text.trim();
  return (
    trimmedText.startsWith("//") ||
    trimmedText.startsWith("#") ||
    trimmedText.startsWith("/*")
  );
};

function activate(context) {
  console.log("=============================");
  console.log("Colorized Comments 扩展正在启动...");

  // 显示通知
  vscode.window.showInformationMessage("彩色注释扩展已启动！");

  const interval = setInterval(() => {
    if (vscode.workspace.textDocuments.length === 0) {
      vscode.window.showInformationMessage("启动彩色注释扩展需先打开一个文件");
    } else {
      clearInterval(interval);
    }
  }, 2000);

  // 初始化装饰器存储
  let decorations = context.workspaceState.get("decorations") || {};
  let lineDecorations = new Map();

  // 应用装饰器到指定行
  function applyDecoration(editor, line, color) {
    const range = editor.document.lineAt(line).range;
    const uri = editor.document.uri.toString();

    // 清除已有的装饰器
    if (lineDecorations.has(`${uri}:${line}`)) {
      const oldDecoration = lineDecorations.get(`${uri}:${line}`);
      oldDecoration.dispose();
      lineDecorations.delete(`${uri}:${line}`);
    }

    // 为这一行创建新的装饰器实例
    const decoration = vscode.window.createTextEditorDecorationType({
      backgroundColor: {
        yellow: "#FFD70055",
        blue: "#4169E155",
        green: "#32CD3255",
        red: "#FF450055",
        purple: "#9370DB55",
        orange: "#FFA50055",
        pink: "#FF69B455",
        cyan: "#00CED155",
        brown: "#A0522D55",
        lime: "#32CD3255",
      }[color] || "#FFD70055",
      isWholeLine: true,
    });

    // 应用新装饰器
    editor.setDecorations(decoration, [range]);

    // 保存新的装饰器实例
    lineDecorations.set(`${uri}:${line}`, decoration);

    // 更新持久化存储
    decorations[uri] = decorations[uri] || {};
    decorations[uri][line] = color;
    context.workspaceState.update("decorations", decorations);
  }

  // 注册悬浮提示提供器
  const hoverProvider = vscode.languages.registerHoverProvider("*", {
    provideHover(document, position) {
      const line = document.lineAt(position.line);
      if (isCommentLine(line.text)) {
        // 定义颜色命令数组
        const colorCommands = [
          { label: "黄色", color: "yellow" },
          { label: "蓝色", color: "blue" },
          { label: "绿色", color: "green" },
          { label: "红色", color: "red" },
          { label: "紫色", color: "purple" },
          { label: "橙色", color: "orange" },
          { label: "粉色", color: "pink" },
          { label: "青色", color: "cyan" },
          { label: "棕色", color: "brown" },
          { label: "青柠色", color: "lime" },
        ];

        const colorLinks = colorCommands
          .map(
            (c) =>
              `[${
                c.label
              }](command:colorized-comments.setCommentColor?${encodeURIComponent(
                JSON.stringify({
                  color: c.color,
                  line: position.line,
                })
              )})`
          )
          .join(" | ");

        const mdString = new vscode.MarkdownString();
        mdString.isTrusted = true;
        mdString.appendMarkdown("选择注释颜色：\n\n" + colorLinks);

        return new vscode.Hover(mdString);
      }
    },
  });

  // 注册命令
  let colorSetCommand = vscode.commands.registerCommand(
    "colorized-comments.setCommentColor",
    (args) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const { line, color } = args;
      applyDecoration(editor, line, color);
    }
  );

  // 注册右键菜单命令
  let rightClickCommand = vscode.commands.registerCommand(
    "colorized-comments.changeCommentColorByMenu",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const position = editor.selection.active;
      const line = editor.document.lineAt(position.line);

      if (isCommentLine(line.text)) {
        // 创建快速选择项
        const items = [
          { label: "黄色", color: "yellow" },
          { label: "蓝色", color: "blue" },
          { label: "绿色", color: "green" },
          { label: "红色", color: "red" },
          { label: "紫色", color: "purple" },
          { label: "橙色", color: "orange" },
          { label: "粉色", color: "pink" },
          { label: "青色", color: "cyan" },
          { label: "棕色", color: "brown" },
          { label: "青柠色", color: "lime" },
        ];

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: "选择注释颜色",
        });

        if (selected) {
          applyDecoration(editor, position.line, selected.color);
        }
      }
    }
  );

  // 添加编辑器切换事件监听
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        const uri = editor.document.uri.toString();
        const fileDecorations = decorations[uri] || {};
        Object.entries(fileDecorations).forEach(([line, color]) => {
          applyDecoration(editor, parseInt(line), color);
        });
      }
    })
  );

  // 初始化时应用已有装饰器
  if (vscode.window.activeTextEditor) {
    const uri = vscode.window.activeTextEditor.document.uri.toString();
    const fileDecorations = decorations[uri] || {};
    Object.entries(fileDecorations).forEach(([line, color]) => {
      applyDecoration(vscode.window.activeTextEditor, parseInt(line), color);
    });
  }

  // 将提供器和命令加入订阅列表
  context.subscriptions.push(hoverProvider, colorSetCommand, rightClickCommand);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
