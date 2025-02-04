const vscode = require("vscode");

// 创建装饰器类型对象，使用对象字面量语法定义不同颜色的装饰器
const commentDecorations = {
  yellow: vscode.window.createTextEditorDecorationType({
    backgroundColor: "#FFD70055", // 使用ARGB格式颜色代码，最后两位是透明度
    isWholeLine: true, // 布尔值，表示是否应用整行
  }),
  blue: vscode.window.createTextEditorDecorationType({
    backgroundColor: "#4169E155", // 使用十六进制颜色表示法
    isWholeLine: true,
  }),
  green: vscode.window.createTextEditorDecorationType({
    backgroundColor: "#32CD3255", // 绿色带透明度
    isWholeLine: true,
  }),
  red: vscode.window.createTextEditorDecorationType({
    backgroundColor: "#FF450055", // 红色带透明度
    isWholeLine: true,
  }),
  purple: vscode.window.createTextEditorDecorationType({
    backgroundColor: "#9370DB55", // 紫色带透明度
    isWholeLine: true,
  }),
};

// 箭头函数定义：检查是否是注释行
const isCommentLine = (text) => {
  // 字符串处理方法：
  const trimmedText = text.trim(); // trim() 去除首尾空白字符
  return (
    trimmedText.startsWith("//") || // 双斜杠注释
    trimmedText.startsWith("#") || // shell/python注释
    trimmedText.startsWith("/*") // 多行注释开始
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
  let lineDecorations = new Map(); // 存储每行的装饰器实例

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

    // 为这一行创建新的装饰器实例，直接使用颜色值
    const decoration = vscode.window.createTextEditorDecorationType({
      backgroundColor:
        color === "yellow"
          ? "#FFD70055"
          : color === "blue"
          ? "#4169E155"
          : color === "green"
          ? "#32CD3255"
          : color === "red"
          ? "#FF450055"
          : color === "purple"
          ? "#9370DB55"
          : "#FFD70055",
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

  // 注册悬浮提示提供器（Hover Provider）
  const hoverProvider = vscode.languages.registerHoverProvider("*", {
    // 实现provideHover方法（接口实现）
    provideHover(document, position) {
      // 获取TextLine对象
      const line = document.lineAt(position.line);
      if (isCommentLine(line.text)) {
        // 定义颜色命令数组（对象数组）
        const colorCommands = [
          { label: "黄色", color: "yellow" },
          { label: "蓝色", color: "blue" },
          { label: "绿色", color: "green" },
          { label: "红色", color: "red" },
          { label: "紫色", color: "purple" },
        ];

        // 使用数组map()方法和模板字符串
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
          .join(" | "); // 数组join()方法

        // 创建Markdown字符串
        const mdString = new vscode.MarkdownString();
        mdString.isTrusted = true; // 启用命令执行
        mdString.appendMarkdown("选择注释颜色：\n\n" + colorLinks);

        // 返回Hover对象（new 构造函数）
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
      applyDecoration(editor, line, color); // 不需要传递 context
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

  // 将提供器和命令加入订阅列表（扩展生命周期管理）
  context.subscriptions.push(hoverProvider, colorSetCommand);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
