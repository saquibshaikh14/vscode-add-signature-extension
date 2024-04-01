// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import constans from "./constans";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	//TODO: New added for cmd file created
	const fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*');
	fileSystemWatcher.onDidCreate(uri => {
        if (uri.scheme === 'file') {
            // Do stuff
            addSignatureToFile(uri);
        }
    });


	// let onCredteFilesDisposable = vscode.workspace.onDidCreateFiles(
	// 	(event: vscode.FileCreateEvent) => {
	// 		event.files.forEach((uri) => {
	// 			if (uri.scheme == "file") {
	// 				//do stuff
	// 				addSignatureToFile(uri);
	// 			}
	// 		});
	// 	}
	// );

	let commandConfigurationDisposable = vscode.commands.registerCommand(
		"vscode-add-signature.configure",
		() => {
			vscode.commands.executeCommand(
				"workbench.action.openSettings",
				"vscode-add-signature"
			);
		}
	);

	context.subscriptions.push(
		// onCredteFilesDisposable,
		fileSystemWatcher,
		commandConfigurationDisposable
	);

	// addSignatureToFile(null);

	// context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

async function addSignatureToFile(uri: vscode.Uri) {
	const config = vscode.workspace.getConfiguration("vscode-add-signature");
	let enableAddSignature = config.get(constans.ENABLE_ADD_SIGNATURE) || false;
	let signatureText = config.get<string>(constans.SIGNATURE_TEXT) || "";

	let parsedSignatureText = replacePattern(signatureText);

	if (!enableAddSignature) {
		return;
	}
	//adding delay. having issue with new untitle file created and saved
	await delay(constans.DELAY_500);

	try {
		const document = await vscode.workspace.openTextDocument(uri);
		const edit = new vscode.WorkspaceEdit();
		edit.insert(
			uri,
			new vscode.Position(0, 0),
			parsedSignatureText + "\n\n"
		);

		await vscode.workspace.applyEdit(edit);
		await document.save();
	} catch (error) {
		if (error instanceof Error) {
			vscode.window.showErrorMessage(
				"Error adding signature to file: " + error!.message
			);
		} else {
			vscode.window.showErrorMessage(
				"Unknown error occured adding signature to file"
			);
			console.log(error);
		}
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

    // Preserve new line
    text = text.replace(/\\n/g, "\n");

    // Replace each component of the date pattern with the corresponding value
    // Use a regular expression with capturing groups to match any order of date components
    return text.replace(
        /\${(DD|MM|YYYY|hh|mm|YEAR)-?(DD|MM|YYYY|hh|mm|YEAR)?-?(DD|MM|YYYY|hh|mm|YEAR)?-?(DD|MM|YYYY|hh|mm|YEAR)?-?(DD|MM|YYYY|hh|mm|YEAR)?}/g,
        (match, p1, p2, p3, p4, p5) => {
            const components = [p1, p2, p3, p4, p5].filter(Boolean); // Remove undefined components
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
                        return component; // Leave unknown components unchanged
                }
            });
            return orderedValues.join("-"); // Join the ordered values with '-'
        }
    );
}
