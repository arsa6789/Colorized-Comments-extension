// 导入VS Code的扩展API模块，这是开发扩展的基础
const vscode = require("vscode");

// 颜色选项配置，使用十六进制颜色代码
// 格式说明：#后跟两位红、两位绿、两位蓝（00-FF）
const colorOptions = {
  yellow: "#FFD700", // 黄金色
  blue: "#4169E1", // 皇家蓝
  green: "#32CD32",
  red: "#FF4500",
  purple: "#9370DB",
  orange: "#FFA500",
  pink: "#FF69B4",
  cyan: "#00CED1",
  brown: "#A0522D",
  lime: "#00FF00",
};

// 不同编程语言的注释符号配置
// 结构说明：
// - 每个语言对应一个配置对象
// - line: 单行注释符号（如//、#）
// - block: 块注释符号（包含start和end）
const commentPatterns = {
  javascript: {
    line: "//", // 单行注释
    block: { start: "/*", end: "*/" }, // 多行注释
  },
  typescript: { line: "//", block: { start: "/*", end: "*/" } },
  java: { line: "//", block: { start: "/*", end: "*/" } },
  c: { line: "//", block: { start: "/*", end: "*/" } },
  cpp: { line: "//", block: { start: "/*", end: "*/" } },
  csharp: { line: "//", block: { start: "/*", end: "*/" } },
  go: { line: "//", block: { start: "/*", end: "*/" } },
  rust: { line: "//", block: { start: "/*", end: "*/" } },
  swift: { line: "//", block: { start: "/*", end: "*/" } },
  kotlin: { line: "//", block: { start: "/*", end: "*/" } },

  // Script languages
  python: { line: "#", block: { start: '"""', end: '"""' } },
  ruby: { line: "#", block: { start: "=begin", end: "=end" } },
  perl: { line: "#", block: { start: "=pod", end: "=cut" } },
  shell: { line: "#" },
  powershell: { line: "#", block: { start: "<#", end: "#>" } },
  batch: { line: "REM" },

  // Web languages
  html: { block: { start: "<!--", end: "-->" } },
  css: { block: { start: "/*", end: "*/" } },
  less: { line: "//", block: { start: "/*", end: "*/" } },
  scss: { line: "//", block: { start: "/*", end: "*/" } },
  xml: { block: { start: "<!--", end: "-->" } },
  php: { line: "//", block: { start: "/*", end: "*/" } },

  // Database
  sql: { line: "--", block: { start: "/*", end: "*/" } },
  plsql: { line: "--", block: { start: "/*", end: "*/" } },

  // Config files
  yaml: { line: "#" },
  toml: { line: "#" },
  ini: { line: ";" },
  properties: { line: "#" },

  // Other languages
  lua: { line: "--", block: { start: "--[[", end: "]]" } },
  matlab: { line: "%", block: { start: "%{", end: "%}" } },
  r: { line: "#" },
  haskell: { line: "--", block: { start: "{-", end: "-}" } },
  lisp: { line: ";", block: { start: "#|", end: "|#" } },
  erlang: { line: "%" },
  elixir: { line: "#" },
  julia: { line: "#", block: { start: "#=", end: "=#" } },
  dart: { line: "//", block: { start: "/*", end: "*/" } },
  scala: { line: "//", block: { start: "/*", end: "*/" } },
};

/**
 * 判断指定文本是否是注释行
 * @param {string} text - 需要检测的文本行
 * @param {string} languageId - 当前文件的语言类型（如javascript、python）
 * @returns {boolean} 是否是注释行
 *
 * 实现逻辑：
 * 1. 去除文本前后空白
 * 2. 根据语言获取对应的注释符号配置
 * 3. 检查是否以单行注释符号开头
 * 4. 或处于块注释范围内（开始符、结束符、中间以*开头的行）
 */
const isCommentLine = (text, languageId = "") => {
  // 移除首尾空白字符
  const trimmedText = text.trim();
  if (!trimmedText) return false;

  // 获取语言的注释格式，如果未找到则使用默认格式
  const pattern = commentPatterns[languageId.toLowerCase()] || {
    line: "//",
    block: { start: "/*", end: "*/" },
  };

  // 使用短路逻辑检查是否匹配任一注释格式
  return (
    (pattern.line && trimmedText.startsWith(pattern.line)) || // 检查单行注释
    (pattern.block &&
      (trimmedText.startsWith(pattern.block.start) || // 检查块注释开始
        trimmedText.endsWith(pattern.block.end) || // 检查块注释结束
        trimmedText.startsWith("*"))) // 检查块注释中间行
  );
};

/**
 * 扩展的激活函数，VS Code会在扩展激活时自动调用
 * @param {vscode.ExtensionContext} context - 扩展上下文对象
 * 上下文对象提供：
 * - subscriptions: 用于注册需要清理的资源
 * - workspaceState: 持久化存储数据
 */
function activate(context) {
  console.log("Colorized Comments 扩展正在启动...");

  // 强制设置 activateHover 为 false
  const config = vscode.workspace.getConfiguration("colorizedComments");
  config.update("activateHover", false, true).then(() => {
    console.log("已强制设置 activateHover 为 false");
    // 初始化 hover provider
    updateHoverProvider(context);
  });

  // 显示通知提醒用户扩展已激活
  vscode.window.showInformationMessage("彩色注释扩展已启动！");

  // 从持久化存储中读取之前的装饰器配置
  // decorations结构：{ 文件URI: { 行号: { 颜色配置 } } }
  let decorations = context.workspaceState.get("decorations") || {};

  // 使用Map存储当前装饰器实例，便于快速查找和管理
  let lineDecorations = new Map();

  /**
   * 应用装饰器到指定行
   * @param {vscode.TextEditor} editor - 当前文本编辑器实例
   * @param {number} line - 要装饰的行号（从0开始）
   * @param {string} color - 颜色值（十六进制）
   * @param {string} type - 装饰类型：'background'背景色 或 'text'文字颜色
   *
   * VS Code装饰器原理：
   * 1. 创建装饰器类型（TextEditorDecorationType）
   * 2. 指定装饰范围（Range）
   * 3. 将装饰器应用到编辑器
   */
  function applyDecoration(editor, line, color, type) {
    const range = editor.document.lineAt(line).range;
    const uri = editor.document.uri.toString();
    const key = `${uri}:${line}`;

    // 使用可选链操作符安全访问嵌套属性
    let currentDecoration = decorations[uri]?.[line] || {};

    // 根据类型更新颜色
    if (type === "background") {
      currentDecoration.backgroundColor = color;
    } else {
      currentDecoration.color = color;
    }

    // 清理已存在的装饰器以避免重叠
    if (lineDecorations.has(key)) {
      lineDecorations.get(key).dispose(); // 释放资源
      lineDecorations.delete(key);
    }

    // 创建装饰器选项对象
    const decorationOptions = {};
    if (currentDecoration.backgroundColor) {
      // 添加透明度：55 表示 33% 透明度（十六进制）
      decorationOptions.backgroundColor =
        currentDecoration.backgroundColor + "55";
      decorationOptions.isWholeLine = true; // 整行应用背景色
    }
    if (currentDecoration.color) {
      decorationOptions.color = currentDecoration.color;
    }

    // 创建并应用新装饰器
    const decoration =
      vscode.window.createTextEditorDecorationType(decorationOptions);
    editor.setDecorations(decoration, [range]);
    lineDecorations.set(key, decoration);

    // 更新持久化存储
    decorations[uri] = decorations[uri] || {};
    decorations[uri][line] = currentDecoration;
    context.workspaceState.update("decorations", decorations);
  }

  // 创建颜色选择项的辅助函数
  function createColorItems() {
    // 返回带有图标和表情符号的选择项
    return [
      {
        label: "$(symbol-color) 阳光黄 🌞",
        description: "明亮温暖的黄色",
        color: colorOptions.yellow,
      },
      {
        label: "$(symbol-color) 海洋蓝 🌊",
        description: "深邃的蓝色",
        color: colorOptions.blue,
      },
      {
        label: "$(symbol-color) 森林绿 🌲",
        description: "自然的绿色",
        color: colorOptions.green,
      },
      {
        label: "$(symbol-color) 玫瑰红 🌹",
        description: "热情的红色",
        color: colorOptions.red,
      },
      {
        label: "$(symbol-color) 梦幻紫 🌌",
        description: "神秘的紫色",
        color: colorOptions.purple,
      },
      {
        label: "$(symbol-color) 橙子橙 🍊",
        description: "活力的橙色",
        color: colorOptions.orange,
      },
      {
        label: "$(symbol-color) 樱花粉 🌸",
        description: "甜美的粉色",
        color: colorOptions.pink,
      },
      {
        label: "$(symbol-color) 碧海青 🌿",
        description: "清新的青色",
        color: colorOptions.cyan,
      },
      {
        label: "$(symbol-color) 可可棕 🍫",
        description: "温暖的棕色",
        color: colorOptions.brown,
      },
      {
        label: "$(symbol-color) 柠檬绿 🍋",
        description: "清爽的青柠色",
        color: colorOptions.lime,
      },
    ];
  }

  /**
   * 显示颜色选择器
   * @param {vscode.TextEditor} editor - 当前编辑器实例
   * @param {number} line - 要装饰的行号
   *
   * 使用VS Code的QuickPick API创建选择界面：
   * 1. 先选择修改类型（背景/文字）
   * 2. 再选择具体颜色
   */
  async function showColorPicker(editor, line) {
    // 首先选择修改类型（背景色或文字颜色）
    const typeItems = [
      {
        label: "$(paintcan) 修改背景色",
        description: "给注释添加背景色",
        detail: "让注释更加醒目",
        type: "background",
      },
      {
        label: "$(edit) 修改文字颜色",
        description: "改变注释文字颜色",
        detail: "让文字更有特色",
        type: "text",
      },
    ];

    // 使用 VS Code 的 QuickPick API 显示选择器
    const selectedType = await vscode.window.showQuickPick(typeItems, {
      placeHolder: "✨ 选择要修改的样式 ✨",
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (!selectedType) return;

    // 展示颜色选项
    const colorItems = createColorItems().map((item) => ({
      ...item,
      picked: false,
    }));

    const selected = await vscode.window.showQuickPick(colorItems, {
      placeHolder: `🎨 选择${
        selectedType.type === "background" ? "背景" : "文字"
      }颜色`,
    });

    // 应用选择的颜色
    if (selected?.color) {
      applyDecoration(editor, line, selected.color, selectedType.type);
    }
  }

  // 全局变量来跟踪当前的 hover provider
  let currentHoverProvider = null;

  // 检查是否启用悬停功能并相应地更新
  function updateHoverProvider(context) {
    console.log("正在检查 hover provider 状态...");

    // 如果存在旧的 provider，先清理掉
    if (currentHoverProvider) {
      console.log("清理旧的 hover provider");
      currentHoverProvider.dispose();
      currentHoverProvider = null;
    }

    // 检查设置
    const config = vscode.workspace.getConfiguration("colorizedComments");
    const activateHover = config.get("activateHover");

    console.log("activateHover 设置值:", activateHover);
    console.log("activateHover 类型:", typeof activateHover);

    // 只有在明确设置为 true 时才创建新的 provider
    if (activateHover === true) {
      console.log("创建新的 hover provider");
      currentHoverProvider = vscode.languages.registerHoverProvider("*", {
        provideHover(document, position) {
          const line = document.lineAt(position.line);
          if (isCommentLine(line.text, document.languageId)) {
            return new Promise((resolve) => {
              const config = vscode.workspace.getConfiguration("colorizedComments");
              const hoverDelay = config.get("hoverDelay", 3000);

              setTimeout(async () => {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                  await showColorPicker(editor, position.line);
                }
                resolve(null);
              }, hoverDelay);
            });
          }
          return null;
        },
      });

      if (currentHoverProvider) {
        context.subscriptions.push(currentHoverProvider);
        console.log("hover provider 已注册");
      }
    } else {
      console.log("hover provider 已禁用");
    }
  }

  // 监听设置变化
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("colorizedComments.activateHover")) {
        console.log("检测到 activateHover 设置变化");
        updateHoverProvider(context);
      }
    })
  );

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

  // 当切换编辑器时，重新应用该文件的装饰器
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        const uri = editor.document.uri.toString();
        const fileDecorations = decorations[uri] || {};
        Object.entries(fileDecorations).forEach(([line, decoration]) => {
          if (decoration.backgroundColor) {
            applyDecoration(
              editor,
              parseInt(line),
              decoration.backgroundColor,
              "background"
            );
          }
          if (decoration.color) {
            applyDecoration(editor, parseInt(line), decoration.color, "text");
          }
        });
      }
    })
  );

  // 扩展激活时初始化已有装饰器
  if (vscode.window.activeTextEditor) {
    const uri = vscode.window.activeTextEditor.document.uri.toString();
    const fileDecorations = decorations[uri] || {};
    Object.entries(fileDecorations).forEach(([line, decoration]) => {
      if (decoration.backgroundColor) {
        applyDecoration(
          vscode.window.activeTextEditor,
          parseInt(line),
          decoration.backgroundColor,
          "background"
        );
      }
      if (decoration.color) {
        applyDecoration(
          vscode.window.activeTextEditor,
          parseInt(line),
          decoration.color,
          "text"
        );
      }
    });
  }

  // 将右键菜单命令添加到上下文中
  context.subscriptions.push(rightClickCommand);
}

// 导出模块必须的激活/停用函数
module.exports = {
  activate,
  deactivate: () => {}, // 停用时不需要特殊操作
};
