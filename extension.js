const vscode = require("vscode");

// 创建装饰器类型
const commentDecorations = {
  yellow: vscode.window.createTextEditorDecorationType({
    backgroundColor: '#FFD70055', // 黄色带透明度
    isWholeLine: true  // 整行应用背景色
  }),
  blue: vscode.window.createTextEditorDecorationType({
    backgroundColor: '#4169E155', // 蓝色带透明度
    isWholeLine: true
  }),
  green: vscode.window.createTextEditorDecorationType({
    backgroundColor: '#32CD3255', // 绿色带透明度
    isWholeLine: true
  }),
  red: vscode.window.createTextEditorDecorationType({
    backgroundColor: '#FF450055', // 红色带透明度
    isWholeLine: true
  }),
  purple: vscode.window.createTextEditorDecorationType({
    backgroundColor: '#9370DB55', // 紫色带透明度
    isWholeLine: true
  })
};

// 存储每行的装饰器信息
let decorationMap = new Map();

// 检查是否是注释行
function isCommentLine(text) {
  const trimmedText = text.trim();
  return (
    trimmedText.startsWith("//") ||
    trimmedText.startsWith("#") ||
    trimmedText.startsWith("/*")
  );
}

// 应用装饰器到指定行
function applyDecoration(editor, line, color) {
  const range = editor.document.lineAt(line).range;
  
  // 如果这一行之前有装饰器，先清除
  if (decorationMap.has(line)) {
    const oldDecoration = decorationMap.get(line);
    editor.setDecorations(oldDecoration, []);
  }

  // 应用新的装饰器
  const decoration = commentDecorations[color];
  editor.setDecorations(decoration, [range]);
  decorationMap.set(line, decoration);
}

function activate(context) {
  console.log("=============================");
  console.log("Colorized Comments 扩展正在启动...");

  // 显示通知
  vscode.window.showInformationMessage("彩色注释扩展已启动！");

  // 添加初始化确认
  vscode.window.showInformationMessage("Colorized Comments: 扩展已启动");
  const interval = setInterval(() => {
    if (vscode.workspace.textDocuments.length === 0) {
      vscode.window.showInformationMessage("启动彩色注释扩展需先打开一个文件");
    } else {
      clearInterval(interval);
    }
  }, 2000);

  // 注册悬浮提供器
  const hoverProvider = vscode.languages.registerHoverProvider('*', {
    provideHover(document, position, token) {
      const line = document.lineAt(position.line);
      if (isCommentLine(line.text)) {
        const colorCommands = [
          { label: "黄色", color: "yellow" },
          { label: "蓝色", color: "blue" },
          { label: "绿色", color: "green" },
          { label: "红色", color: "red" },
          { label: "紫色", color: "purple" }
        ];

        // 创建命令链接
        const colorLinks = colorCommands.map(c => 
          `[${c.label}](command:colorized-comments.setCommentColor?${encodeURIComponent(JSON.stringify({ color: c.color, line: position.line }))})`
        ).join(' | ');

        const mdString = new vscode.MarkdownString();
        mdString.isTrusted = true;
        mdString.appendMarkdown('选择注释颜色：\n\n' + colorLinks);

        return new vscode.Hover(mdString);
      }
    }
  });
  context.subscriptions.push(hoverProvider);

  // 注册设置颜色命令
  let colorSetCommand = vscode.commands.registerCommand('colorized-comments.setCommentColor', args => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const { line, color } = args;
    applyDecoration(editor, line, color);
  });
  context.subscriptions.push(colorSetCommand);

  // 监听文档变化，重新应用装饰器
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(event => {
      const editor = vscode.window.activeTextEditor;
      if (editor && event.document === editor.document) {
        // 重新应用所有装饰器
        decorationMap.forEach((decoration, line) => {
          try {
            const range = editor.document.lineAt(line).range;
            editor.setDecorations(decoration, [range]);
          } catch (error) {
            // 如果行不存在，从Map中删除
            decorationMap.delete(line);
          }
        });
      }
    })
  );

  // 监听编辑器切换
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) {
        // 清除所有装饰器
        decorationMap.clear();
      }
    })
  );
}

function deactivate() {
  // 清除所有装饰器
  decorationMap.clear();
}

module.exports = {
  activate,
  deactivate,
};
