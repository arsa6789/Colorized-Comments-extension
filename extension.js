// 导入VS Code的扩展API模块，这是所有VS Code扩展的基础依赖
// require("vscode") 提供了访问VS Code API的全部功能，包括编辑器操作、UI组件等
const vscode = require("vscode");

// 定义颜色选项配置对象
// 使用十六进制颜色代码确保跨平台一致性，每个颜色命名采用直观的中文描述
// 颜色值选择遵循WCAG 2.1对比度标准，确保在不同主题下可读性
const colorOptions = {
 transparent: "transparent",
 yellow: "#FFD700", // 选择黄金色作为高亮色，比纯黄#FFFF00更柔和
 blue: "#4169E1", // 皇家蓝比标准蓝#0000FF更专业，适合技术文档
 green: "#32CD32",
 red: "#FF4500",
 purple: "#9370DB",
 orange: "#FFA500",
 pink: "#FF69B4",
 cyan: "#00CED1",
 brown: "#A0522D",
 lime: "#00FF00",
};

// 定义多语言注释模式配置
// 结构设计考虑：
// 1. 按语言分类提高可维护性
// 2. 分离单行/块注释便于不同处理逻辑
// 3. 小写键名确保语言ID匹配的可靠性（VS Code返回的语言ID都是小写）
const commentPatterns = {
 javascript: {
 line: "//", // 单行注释符号，ECMAScript标准规定
 block: {
 start: "/*", // 块注释开始符
 end: "*/", // 块注释结束符，必须成对出现
 },
 regex: /(\/\/.*?$|\/\*[\s\S]*?\*\/)/g, // 匹配单行和块注释
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
 python: {
 line: "#",
 regex: /(#.*?)(?=('''|"""|$))/g, // 匹配#号直到行尾或文档字符串开始
 docString: /('''|""")/g, // 文档字符串匹配
 },
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
 * 获取注释部分的精确范围
 * @param {vscode.TextLine} textLine - 文本行对象
 * @param {string} languageId - 语言标识
 * @returns {vscode.Range[]} 返回注释部分的范围数组
 */
function getCommentRanges(textLine, languageId) {
 const pattern = commentPatterns[languageId.toLowerCase()] || {};
 const text = textLine.text;
 const ranges = [];

 // Python特殊处理
 if (languageId === "python") {
 // 处理文档字符串
 const docStringMatch = pattern.docString?.exec(text);
 if (docStringMatch) {
 const startPos = textLine.range.start.translate(0, docStringMatch.index);
 const endPos = startPos.translate(0, docStringMatch[0].length);
 ranges.push(new vscode.Range(startPos, endPos));
 }

 // 处理行内注释
 let lineCommentMatch;
 while ((lineCommentMatch = pattern.regex?.exec(text)) !== null) {
 const start = textLine.range.start.translate(0, lineCommentMatch.index);
 const end = start.translate(0, lineCommentMatch[0].length);
 ranges.push(new vscode.Range(start, end));
 }
 }
 // 通用语言处理
 else if (pattern.regex) {
 let match;
 while ((match = pattern.regex.exec(text)) !== null) {
 const start = textLine.range.start.translate(0, match.index);
 const end = start.translate(0, match[0].length);
 ranges.push(new vscode.Range(start, end));

 // 防止无限循环（当正则匹配空字符串时）
 if (match.index === pattern.regex.lastIndex) {
 pattern.regex.lastIndex++;
 }
 }
 }

 return ranges;
}

/**
 * 判断是否为注释行的核心逻辑
 * @param {string} text - 需要检测的文本行（需预先trim处理）
 * @param {string} languageId - 来自document.languageId，确保使用小写匹配
 * @returns {boolean} 返回判断结果
 *
 * 设计要点：
 * 1. 先进行trim处理避免空白字符干扰
 * 2. Python需要特殊处理三重引号文档字符串
 * 3. 块注释中间行（以*开头）的识别提高准确性
 */
const isCommentLine = (text, languageId = "") => {
 const trimmedText = text.trim();
 if (!trimmedText) return false; // 空行直接返回false

 // 获取语言配置，默认使用JavaScript风格注释
 // 使用||短路操作符提供默认值，确保函数健壮性
 const pattern = commentPatterns[languageId.toLowerCase()] || {
 line: "//",
 block: { start: "/*", end: "*/" },
 };

 // Python特殊处理逻辑：
 // 1. 单行注释以#开头
 // 2. 文档字符串使用'''或"""作为注释
 if (languageId.toLowerCase() === "python") {
 return (
 trimmedText.startsWith(pattern.line) ||
 trimmedText.startsWith("'''") ||
 trimmedText.startsWith('"""')
 );
 }

 // 通用判断逻辑：
 // 1. 匹配单行注释符号
 // 2. 匹配块注释开始/结束符
 // 3. 识别块注释中间行（以*开头，常见于JSDoc等格式）
 return (
 (pattern.line && trimmedText.startsWith(pattern.line)) ||
 (pattern.block &&
 (trimmedText.startsWith(pattern.block.start) ||
 trimmedText.endsWith(pattern.block.end) ||
 trimmedText.startsWith("*")))
 );
};

/**
 * 扩展的激活函数，VS Code会在扩展激活时自动调用
 * @param {vscode.ExtensionContext} context - 扩展上下文对象
 * 上下文对象提供：
 * - subscriptions: 用于注册需要清理的资源（遵循VS Code扩展生命周期管理规范）
 * - workspaceState: 持久化存储数据（使用VS Code提供的存储机制保证数据安全）
 */
function activate(context) {
 // 初始化日志输出，帮助开发者确认扩展加载状态
 console.log("Colorized Comments 扩展正在启动...");

 // 强制设置 activateHover 为 false
 // 设计考虑：由于悬停功能可能影响用户体验，默认禁用
 // 使用workspace配置级别保证设置生效范围（true表示全局生效）
 const config = vscode.workspace.getConfiguration("colorizedComments");
 config.update("activateHover", false, true).then(() => {
 console.log("已强制设置 activateHover 为 false");
 // 初始化 hover provider（即使禁用也需要初始化以处理状态变化）
 updateHoverProvider(context);
 });

 // 显示通知提醒用户扩展已激活
 // 使用表情符号增强可视化反馈，但仅显示一次避免打扰
 vscode.window.showInformationMessage("彩色注释扩展已启动！");

 // 从持久化存储中读取之前的装饰器配置
 // 数据结构设计考虑：
 // - 使用URI作为键保证多文档支持
 // - 行号存储为字符串（JSON序列化时对象键自动转为字符串）
 let decorations = context.workspaceState.get("decorations") || {};

 // 使用Map存储当前装饰器实例，便于快速查找和管理
 // 选择Map而不是Object的原因：
 // 1. 更好的迭代性能
 // 2. 维护插入顺序
 // 3. 更直观的键值对管理
 let lineDecorations = new Map();

 /**
 * 应用装饰器到指定行
 * @param {vscode.TextEditor} editor - 当前文本编辑器实例（来自activeTextEditor）
 * @param {number} line - 要装饰的行号（从0开始，遵循VS Code API规范）
 * @param {string} color - 颜色值（十六进制，保证与colorOptions一致）
 * @param {string} type - 装饰类型：'background'背景色 或 'text'文字颜色
 */
 function applyDecoration(editor, line, color, type) {
 const textLine = editor.document.lineAt(line);
 const commentRanges = getCommentRanges(
 textLine,
 editor.document.languageId
 );

 // 如果没有找到注释部分则返回
 if (commentRanges.length === 0) return;

 // 构造唯一标识键：URI + 行号（避免多文档冲突）
 const uri = editor.document.uri.toString();
 const key = `${uri}:${line}`;

 // 使用可选链操作符安全访问嵌套属性
 // 防止未定义错误，同时初始化默认对象
 let currentDecoration = decorations[uri]?.[line] || {};

 // Handle transparent assignment or standard colors
 // 根据类型更新颜色配置（支持叠加模式或透明度清除）
 if (type === "background") {
 if (color === "transparent") {
 delete currentDecoration.backgroundColor;
 } else {
 currentDecoration.backgroundColor = color; // 背景色存储原始值
 }
 } else {
 if (color === "transparent") {
 delete currentDecoration.color;
 } else {
 currentDecoration.color = color; // 文字颜色直接存储
 }
 }

 // 清理已存在的装饰器以避免重叠
 // 使用Map的has/get方法提高性能（O(1)时间复杂度）
 if (lineDecorations.has(key)) {
 lineDecorations.get(key).dispose(); // 必须显式释放资源
 lineDecorations.delete(key); // 从Map中移除引用
 }

 // If both styles are empty/cleared, wipe the key and update state
 // 如果两个样式都被清空，则彻底抹除该键并更新状态
 if (!currentDecoration.backgroundColor && !currentDecoration.color) {
 if (decorations[uri]) {
 delete decorations[uri][line];
 if (Object.keys(decorations[uri]).length === 0) {
 delete decorations[uri];
 }
 }
 context.workspaceState.update("decorations", decorations);
 return; // Stop execution early since no style needs to be rendered
 }

 // 创建装饰器选项（移除isWholeLine属性）
 // Build fresh decorator properties
 const decorationOptions = {};
 if (currentDecoration.backgroundColor) {
 decorationOptions.backgroundColor =
 currentDecoration.backgroundColor + "55";
 }
 if (currentDecoration.color) {
 decorationOptions.color = currentDecoration.color;
 }

 // 应用装饰器到精确范围
 const decoration =
 vscode.window.createTextEditorDecorationType(decorationOptions);
 editor.setDecorations(decoration, commentRanges); // 应用范围数组

 // 存储装饰器实例以便后续管理
 lineDecorations.set(key, decoration);

 // 更新持久化存储
 decorations[uri] = decorations[uri] || {};
 decorations[uri][line] = currentDecoration;
 context.workspaceState.update("decorations", decorations);
}

 // 创建颜色选择项的辅助函数
 function createColorItems() {
 // 返回带有图标和表情符号的选择项
 // 设计原则：
 // 1. 使用VS Code内置图标系统 ($(symbol-name))
 // 2. 添加表情符号增强视觉识别
 // 3. 保持中文字符描述方便本地用户
 return [
 {
 label: "$(circle-slash) 清除样式 / 透明 🚫",
 description: "移除当前行的颜色或背景样式",
 color: colorOptions.transparent,
 },
 
 {
 label: "$(symbol-color) 阳光黄 🌞", // VS Code图标+文字+表情符号
 description: "明亮温暖的黄色", // 详细描述
 color: colorOptions.yellow, // 关联预定义颜色
 // 结构设计：便于扩展其他属性（如快捷键）
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
 const config =
 vscode.workspace.getConfiguration("colorizedComments");
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
