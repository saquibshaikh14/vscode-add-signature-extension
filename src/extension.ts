// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import constants from "./constants";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let onCreateFilesDisposable = vscode.workspace.onDidCreateFiles(
		(event: vscode.FileCreateEvent) => {
			event.files.forEach((uri) => {
				console.log(uri);
				if (uri.scheme == "file") {
					vscode.workspace.fs.stat(uri).then((stats) => {
						if (stats.type === vscode.FileType.File) {
							addSignatureToFile(uri);
						}
					});
				}
			});
		}
	);

	let commandConfigurationDisposable = vscode.commands.registerCommand(
		"vscode-add-signature.configure",
		() => {
			vscode.commands.executeCommand(
				"workbench.action.openSettings",
				"vscode-add-signature"
			);
		}
	);

	let addSignatureDisposable = vscode.commands.registerCommand(
		"vscode-add-signature.addSignature",
		async () => {
			const editor = vscode.window.activeTextEditor;
			if (editor) {
				const document = editor.document;
				const uri = document.uri;
				let displaymessage = await addSignatureToFile(uri);
				if (displaymessage) {
					vscode.window.showInformationMessage(displaymessage);
				}
			} else {
				vscode.window.showInformationMessage(
					"No file is currently opened."
				);
			}
		}
	);

	context.subscriptions.push(
		onCreateFilesDisposable,
		commandConfigurationDisposable,
		addSignatureDisposable
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}

async function addSignatureToFile(uri: vscode.Uri) {
	const config = vscode.workspace.getConfiguration("vscode-add-signature");
	let enableAddSignature =
		config.get(constants.ENABLE_ADD_SIGNATURE) || false;
	let signatureText = config.get<string>(constants.SIGNATURE_TEXT) || "";

	const fileExtension = uri.fsPath
		.toLowerCase()
		.slice(uri.fsPath.lastIndexOf("."));
	let parsedSignatureText = replacePattern(signatureText);
	const comment = generateComment(fileExtension, parsedSignatureText);
	if (!comment) {
		return "Add Signature Error: File not supported";
	}
	if (!enableAddSignature) {
		return "Please enable extension from settings: vscode-add-signature";
	}
	await delay(constants.DELAY_500);

	try {
		const document = await vscode.workspace.openTextDocument(uri);
		const edit = new vscode.WorkspaceEdit();
		edit.insert(uri, new vscode.Position(0, 0), comment);

		await vscode.workspace.applyEdit(edit);
		await document.save();
	} catch (error) {
		if (error instanceof Error) {
			vscode.window.showErrorMessage(
				"Error adding signature to file: " + error!.message
			);
		} else {
			vscode.window.showErrorMessage(
				"Unknown error occurred adding signature to file"
			);
			console.error(error);
		}
	} finally {
		return false;
	}
}

async function delay(ms: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

function replacePattern(text: string): string {
	const now = new Date();
	const year = now.getFullYear().toString();
	const month = (now.getMonth() + 1).toString().padStart(2, "0");
	const day = now.getDate().toString().padStart(2, "0");
	const hours = now.getHours().toString().padStart(2, "0");
	const minutes = now.getMinutes().toString().padStart(2, "0");

	return text.replace(
		/\${(DD|MM|YYYY|hh|mm|YEAR)-?(DD|MM|YYYY|hh|mm|YEAR)?-?(DD|MM|YYYY|hh|mm|YEAR)?-?(DD|MM|YYYY|hh|mm|YEAR)?-?(DD|MM|YYYY|hh|mm|YEAR)?}/g,
		(match, p1, p2, p3, p4, p5) => {
			const components = [p1, p2, p3, p4, p5].filter(Boolean);
			const orderedValues = components.map((component) => {
				switch (component) {
					case "DD":
						return day;
					case "MM":
						return month;
					case "YYYY":
						return year;
					case "hh":
						return hours + "h";
					case "mm":
						return minutes + "m";
					case "YEAR":
						return year;
					default:
						return component;
				}
			});
			return orderedValues.join("-");
		}
	);
}

function generateComment(fileExtension: string, parsedSignatureText: string) {
	console.log({ fileExtension, parsedSignatureText });

	const commentFormats: { [key: string]: string } = {
		".js": "/**\n",
		".ts": "/**\n",
		".html": "<!--\n",
		".css": "/*\n",
		".rb": "=begin\n",
		".rs": "/*\n",
		".java": "/*\n",
		".kt": "/*\n",
		".kts": "/*\n",
		".php": "/*\n",
		".c": "/*\n",
		".cpp": "/*\n",
		".cs": "/*\n",
		".lua": "--[[\n",
		".py": '"""\n',
		".swift": "/*\n",
		".pl": "#\n",
		".hs": "{-\n",
		".rb": "=begin\n",
		".rs": "/*\n",
		".java": "/*\n",
		".kt": "/*\n",
		".kts": "/*\n",
		".php": "/*\n",
		".c": "/*\n",
		".cpp": "/*\n",
		".cs": "/*\n",
		".lua": "--[[\n",
		".py": '"""\n',
		".swift": "/*\n",
		".pl": "#\n",
		".hs": "{-\n"
	};

	const commentFormat = commentFormats[fileExtension.toLowerCase()];

	if (!commentFormat) {
		return;
	}

	let commentLines = parsedSignatureText.split("\n");

	if (commentLines[0] === "") {
		commentLines.shift();
	}

	let commentBlock = "";

	commentBlock = `${commentFormat}`;
	commentLines.forEach((line) => {
		commentBlock += ` ${line}\n`;
	});

	commentBlock += `${
		commentFormat.startsWith('"""')
			? '"""'
			: commentFormat.startsWith("<!--")
			? "-->"
			: commentFormat.startsWith("=begin")
			? "=end"
			: commentFormat.startsWith("--[[")
			? "--]]"
			: commentFormat.startsWith("{-")
			? "-}"
			: commentFormat.startsWith("#")
			? "#"
			: "*/"
	}\n\n`;

	console.log(commentBlock);
	return commentBlock;
}
