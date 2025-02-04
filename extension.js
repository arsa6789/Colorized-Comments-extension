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

// 使用Map数据结构存储装饰器信息
let decorationMap = new Map(); // 使用new关键字创建Map实例

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

// 函数声明：应用装饰器到指定行
function applyDecoration(editor, line, color) {
  // 获取Range对象：new 构造函数调用
  const range = editor.document.lineAt(line).range; // lineAt()返回TextLine对象

  // Map的has()和get()方法
  if (decorationMap.has(line)) {
    const oldDecoration = decorationMap.get(line);
    // 调用setDecorations方法清除旧装饰
    editor.setDecorations(oldDecoration, []); // 第二个参数是空数组
  }

  // 对象属性访问：commentDecorations[color]
  const decoration = commentDecorations[color];
  // 应用新装饰器，参数为装饰器类型和范围数组
  editor.setDecorations(decoration, [range]);
  // Map的set()方法存储新装饰器
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

  // 注册命令（命令ID与package.json对应）
  let colorSetCommand = vscode.commands.registerCommand(
    "colorized-comments.setCommentColor",
    // 箭头函数作为回调
    (args) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return; // 提前返回模式

      // 对象解构赋值
      const { line, color } = args;
      applyDecoration(editor, line, color);
    }
  );

  // 将提供器和命令加入订阅列表（扩展生命周期管理）
  context.subscriptions.push(hoverProvider, colorSetCommand);

  // 事件监听：文档内容变化事件
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      // 条件判断和可选链操作
      const editor = vscode.window.activeTextEditor;
      if (editor?.document === event.document) {
        // 可选链操作符?.
        // 遍历Map的回调函数
        decorationMap.forEach((decoration, line) => {
          try {
            const range = editor.document.lineAt(line).range;
            editor.setDecorations(decoration, [range]);
          } catch (error) {
            // 错误处理：删除无效条目
            decorationMap.delete(line);
          }
        });
      }
    })
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
