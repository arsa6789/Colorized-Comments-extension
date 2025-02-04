const vscode = require("vscode");

// 检查是否是注释行
function isCommentLine(text) {
  const trimmedText = text.trim();
  return (
    trimmedText.startsWith("//") ||
    trimmedText.startsWith("#") ||
    trimmedText.startsWith("/*")
  );
}

function activate(context) {
  console.log(
    'Congratulations, your extension "colorized-comments" is now active!'
  );

  const disposable = vscode.commands.registerCommand(
    "colorized-comments.helloWorld",
    function () {
      vscode.window.showInformationMessage(
        "Hello World from Colorized-Comments!"
      );
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
