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

// 定义各种语言的注释格式
const commentPatterns = {
  // C-style languages
  'javascript': { line: '//', block: { start: '/*', end: '*/' } },
  'typescript': { line: '//', block: { start: '/*', end: '*/' } },
  'java': { line: '//', block: { start: '/*', end: '*/' } },
  'c': { line: '//', block: { start: '/*', end: '*/' } },
  'cpp': { line: '//', block: { start: '/*', end: '*/' } },
  'csharp': { line: '//', block: { start: '/*', end: '*/' } },
  'go': { line: '//', block: { start: '/*', end: '*/' } },
  'rust': { line: '//', block: { start: '/*', end: '*/' } },
  'swift': { line: '//', block: { start: '/*', end: '*/' } },
  'kotlin': { line: '//', block: { start: '/*', end: '*/' } },
  
  // Script languages
  'python': { line: '#', block: { start: '"""', end: '"""' } },
  'ruby': { line: '#', block: { start: '=begin', end: '=end' } },
  'perl': { line: '#', block: { start: '=pod', end: '=cut' } },
  'shell': { line: '#' },
  'powershell': { line: '#', block: { start: '<#', end: '#>' } },
  'batch': { line: 'REM' },
  
  // Web languages
  'html': { block: { start: '<!--', end: '-->' } },
  'css': { block: { start: '/*', end: '*/' } },
  'less': { line: '//', block: { start: '/*', end: '*/' } },
  'scss': { line: '//', block: { start: '/*', end: '*/' } },
  'xml': { block: { start: '<!--', end: '-->' } },
  'php': { line: '//', block: { start: '/*', end: '*/' } },
  
  // Database
  'sql': { line: '--', block: { start: '/*', end: '*/' } },
  'plsql': { line: '--', block: { start: '/*', end: '*/' } },
  
  // Config files
  'yaml': { line: '#' },
  'toml': { line: '#' },
  'ini': { line: ';' },
  'properties': { line: '#' },
  
  // Other languages
  'lua': { line: '--', block: { start: '--[[', end: ']]' } },
  'matlab': { line: '%', block: { start: '%{', end: '%}' } },
  'r': { line: '#' },
  'haskell': { line: '--', block: { start: '{-', end: '-}' } },
  'lisp': { line: ';', block: { start: '#|', end: '|#' } },
  'erlang': { line: '%' },
  'elixir': { line: '#' },
  'julia': { line: '#', block: { start: '#=', end: '=#' } },
  'dart': { line: '//', block: { start: '/*', end: '*/' } },
  'scala': { line: '//', block: { start: '/*', end: '*/' } }
};

// 检查是否是注释行
const isCommentLine = (text, languageId = '') => {
  const trimmedText = text.trim();
  if (!trimmedText) return false;

  // 获取当前语言的注释格式
  const pattern = commentPatterns[languageId.toLowerCase()] || {
    line: '//',  // 默认使用C风格注释
    block: { start: '/*', end: '*/' }
  };

  // 检查行注释
  if (pattern.line && trimmedText.startsWith(pattern.line)) {
    return true;
  }

  // 检查块注释
  if (pattern.block) {
    if (trimmedText.startsWith(pattern.block.start) || 
        trimmedText.endsWith(pattern.block.end) ||
        trimmedText.startsWith('*')) {  // 处理多行块注释的中间行
      return true;
    }
  }

  return false;
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
    const key = `${uri}:${line}`;

    // 获取现有的装饰器选项
    let currentDecoration = decorations[uri]?.[line] || {};
    
    // 更新当前类型的颜色
    if (type === 'background') {
      currentDecoration.backgroundColor = color;
    } else {
      currentDecoration.color = color;
    }

    // 清除已有的装饰器
    if (lineDecorations.has(key)) {
      lineDecorations.get(key).dispose();
      lineDecorations.delete(key);
    }

    // 创建新的装饰器选项
    const decorationOptions = {};
    if (currentDecoration.backgroundColor) {
      decorationOptions.backgroundColor = currentDecoration.backgroundColor + "55"; // 添加透明度
      decorationOptions.isWholeLine = true;
    }
    if (currentDecoration.color) {
      decorationOptions.color = currentDecoration.color;
    }

    // 创建并应用新的装饰器
    const decoration = vscode.window.createTextEditorDecorationType(decorationOptions);
    editor.setDecorations(decoration, [range]);
    lineDecorations.set(key, decoration);

    // 更新持久化存储
    decorations[uri] = decorations[uri] || {};
    decorations[uri][line] = currentDecoration;
    context.workspaceState.update("decorations", decorations);
  }

  // 创建颜色选择项
  function createColorItems() {
    return [
      { label: "$(symbol-color) 阳光黄 🌞", description: "明亮温暖的黄色", color: colorOptions.yellow },
      { label: "$(symbol-color) 海洋蓝 🌊", description: "深邃的蓝色", color: colorOptions.blue },
      { label: "$(symbol-color) 森林绿 🌲", description: "自然的绿色", color: colorOptions.green },
      { label: "$(symbol-color) 玫瑰红 🌹", description: "热情的红色", color: colorOptions.red },
      { label: "$(symbol-color) 梦幻紫 🌌", description: "神秘的紫色", color: colorOptions.purple },
      { label: "$(symbol-color) 橙子橙 🍊", description: "活力的橙色", color: colorOptions.orange },
      { label: "$(symbol-color) 樱花粉 🌸", description: "甜美的粉色", color: colorOptions.pink },
      { label: "$(symbol-color) 碧海青 🌿", description: "清新的青色", color: colorOptions.cyan },
      { label: "$(symbol-color) 可可棕 🍫", description: "温暖的棕色", color: colorOptions.brown },
      { label: "$(symbol-color) 柠檬绿 🍋", description: "清爽的青柠色", color: colorOptions.lime }
    ];
  }

  // 显示颜色选择器
  async function showColorPicker(editor, line) {
    // 首先选择修改类型
    const typeItems = [
      { label: "$(paintcan) 修改背景色", description: "给注释添加背景色", detail: "让注释更加醒目", type: "background" },
      { label: "$(edit) 修改文字颜色", description: "改变注释文字颜色", detail: "让文字更有特色", type: "text" }
    ];

    const selectedType = await vscode.window.showQuickPick(typeItems, {
      placeHolder: "✨ 选择要修改的样式 ✨",
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (!selectedType) return;

    // 然后选择具体颜色
    const colorItems = createColorItems();
    const selected = await vscode.window.showQuickPick(colorItems, {
      placeHolder: `🎨 选择${selectedType.type === 'background' ? '背景' : '文字'}颜色`,
      matchOnDescription: true
    });

    if (selected) {
      applyDecoration(editor, line, selected.color, selectedType.type);
    }
  }

  // 注册悬浮提示提供器
  const hoverProvider = vscode.languages.registerHoverProvider("*", {
    provideHover(document, position) {
      const line = document.lineAt(position.line);
      if (isCommentLine(line.text, document.languageId)) {
        return new Promise((resolve) => {
          // 从配置中获取延迟时间
          const config = vscode.workspace.getConfiguration('colorizedComments');
          const hoverDelay = config.get('hoverDelay', 2000);

          setTimeout(async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
              await showColorPicker(editor, position.line);
            }
            resolve(null);
          }, hoverDelay);
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
      
      if (isCommentLine(line.text, editor.document.languageId)) {
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
          if (decoration.backgroundColor) {
            applyDecoration(editor, parseInt(line), decoration.backgroundColor, 'background');
          }
          if (decoration.color) {
            applyDecoration(editor, parseInt(line), decoration.color, 'text');
          }
        });
      }
    })
  );

  // 初始化时应用已有装饰器
  if (vscode.window.activeTextEditor) {
    const uri = vscode.window.activeTextEditor.document.uri.toString();
    const fileDecorations = decorations[uri] || {};
    Object.entries(fileDecorations).forEach(([line, decoration]) => {
      if (decoration.backgroundColor) {
        applyDecoration(vscode.window.activeTextEditor, parseInt(line), decoration.backgroundColor, 'background');
      }
      if (decoration.color) {
        applyDecoration(vscode.window.activeTextEditor, parseInt(line), decoration.color, 'text');
      }
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
