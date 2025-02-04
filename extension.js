const vscode = require("vscode");

// 定义颜色选项
const colorOptions = {
  yellow: "#FFD700",
  blue: "#4169E1",
  green: "#32CD32",
  red: "#FF4500",
  purple: "#9370DB",
  orange: "#FFA500",
  pink: "#FF69B4",
  cyan: "#00CED1",
  brown: "#A0522D",
  lime: "#32CD32"
};

// 检查是否是注释行
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

  // 初始化装饰器存储
  let decorations = context.workspaceState.get("decorations") || {};
  let lineDecorations = new Map();

  // 应用装饰器到指定行
  function applyDecoration(editor, line, color, type) {
    const range = editor.document.lineAt(line).range;
    const uri = editor.document.uri.toString();

    // 清除已有的装饰器
    if (lineDecorations.has(`${uri}:${line}`)) {
      const oldDecoration = lineDecorations.get(`${uri}:${line}`);
      oldDecoration.dispose();
      lineDecorations.delete(`${uri}:${line}`);
    }

    // 创建新的装饰器
    const decorationOptions = {};
    if (type === 'background') {
      decorationOptions.backgroundColor = color + "55"; // 添加透明度
      decorationOptions.isWholeLine = true;
    } else {
      decorationOptions.color = color;
    }

    const decoration = vscode.window.createTextEditorDecorationType(decorationOptions);

    // 应用装饰器
    editor.setDecorations(decoration, [range]);

    // 保存装饰器实例
    lineDecorations.set(`${uri}:${line}`, decoration);

    // 更新持久化存储
    decorations[uri] = decorations[uri] || {};
    decorations[uri][line] = { color, type };
    context.workspaceState.update("decorations", decorations);
  }

  // 创建颜色选择项
  function createColorItems() {
    return [
      { label: "黄色", color: colorOptions.yellow },
      { label: "蓝色", color: colorOptions.blue },
      { label: "绿色", color: colorOptions.green },
      { label: "红色", color: colorOptions.red },
      { label: "紫色", color: colorOptions.purple },
      { label: "橙色", color: colorOptions.orange },
      { label: "粉色", color: colorOptions.pink },
      { label: "青色", color: colorOptions.cyan },
      { label: "棕色", color: colorOptions.brown },
      { label: "青柠色", color: colorOptions.lime }
    ];
  }

  // 显示颜色选择器
  async function showColorPicker(editor, line) {
    // 首先选择修改类型
    const typeItems = [
      { label: "修改背景色", type: "background" },
      { label: "修改文字颜色", type: "text" }
    ];

    const selectedType = await vscode.window.showQuickPick(typeItems, {
      placeHolder: "选择要修改的样式"
    });

    if (!selectedType) return;

    // 然后选择具体颜色
    const colorItems = createColorItems();
    const selected = await vscode.window.showQuickPick(colorItems, {
      placeHolder: `选择${selectedType.type === 'background' ? '背景' : '文字'}颜色`
    });

    if (selected) {
      applyDecoration(editor, line, selected.color, selectedType.type);
    }
  }

  // 注册悬浮提示提供器
  const hoverProvider = vscode.languages.registerHoverProvider("*", {
    provideHover(document, position) {
      const line = document.lineAt(position.line);
      if (isCommentLine(line.text)) {
        return new Promise((resolve) => {
          setTimeout(async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
              await showColorPicker(editor, position.line);
            }
            resolve(null);
          }, 1000);
        });
      }
    },
  });

  // 注册右键菜单命令
  let rightClickCommand = vscode.commands.registerCommand(
    "colorized-comments.changeCommentColorByMenu",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const position = editor.selection.active;
      const line = editor.document.lineAt(position.line);
      
      if (isCommentLine(line.text)) {
        await showColorPicker(editor, position.line);
      }
    }
  );

  // 添加编辑器切换事件监听
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        const uri = editor.document.uri.toString();
        const fileDecorations = decorations[uri] || {};
        Object.entries(fileDecorations).forEach(([line, decoration]) => {
          applyDecoration(editor, parseInt(line), decoration.color, decoration.type);
        });
      }
    })
  );

  // 初始化时应用已有装饰器
  if (vscode.window.activeTextEditor) {
    const uri = vscode.window.activeTextEditor.document.uri.toString();
    const fileDecorations = decorations[uri] || {};
    Object.entries(fileDecorations).forEach(([line, decoration]) => {
      applyDecoration(vscode.window.activeTextEditor, parseInt(line), decoration.color, decoration.type);
    });
  }

  // 注册到订阅列表
  context.subscriptions.push(hoverProvider, rightClickCommand);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
