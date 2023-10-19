const { app, BrowserWindow, session } = require('electron');
const Electron = require("electron");
const { Menu, Tray } = require("electron");
const Crypto = require("./NodeCrypto");
const sqlite3 = require('sqlite3').verbose();
var protobuf = require("protobufjs");
const WebSocket = require("ws").WebSocket;
const { existsSync, writeFileSync, readFileSync, mkdirSync } = require("fs");
var mime = require('mime-types');
import SharedClipboardColorPNG from "../assets/SharedClipboardColor.png";
import SharedClipboardColorICO from "../assets/SharedClipboardColor.ico";
import SharedClipboardColorIcon from "../assets/SharedClipboardIcon.png";
import ProtoFile from "../assets/message.proto";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
	app.quit();
}

let mainWindow;
let auth;
let protos;
let messages_db;

async function load_protobufs() {
	return new Promise((resolve, reject) => {
		protobuf.load(__dirname + "/" + ProtoFile, function (err, root) {
			if (err) {
				reject(err);
			}
			resolve(root);
		});
	})
}

let tray = null

let quitFromTray = false;

async function createWindow() {
	session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
		callback({
		  responseHeaders: {
			...details.responseHeaders,
			'Content-Security-Policy': [ "default-src 'self'; connect-src 'self' ws://localhost:3000 https://chrissytopher.com:40441; script-src 'self' 'unsafe-eval' http://localhost:3000; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://raw.githubusercontent.com/" ]
		  }
		});
	  });
	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
		},
	});
	//Trays are cool right?
	if (process.platform === "darwin") {
		tray = new Tray(Electron.nativeImage.createFromPath(__dirname + "/" + SharedClipboardColorIcon));
	} else if (process.platform === "win32") {
		tray = new Tray(__dirname + "/" + SharedClipboardColorICO);
	} else {
		tray = new Tray(__dirname + "/" + SharedClipboardColorPNG);
	}
	const contextMenu = Menu.buildFromTemplate([
		{ label: 'Blue Ovals', type: 'normal', enabled: false },
		{ label: 'Show/Hide', type: 'checkbox', click: () => {
			try {
				if (mainWindow.isVisible()) {
					mainWindow.hide();
				} else {
					mainWindow.show();
				}
			} catch {
				mainWindow = new BrowserWindow({
					width: 800,
					height: 600,
					webPreferences: {
						preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
					},
				});
				mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
			}
		}},
		{ label: 'Quit', type: 'checkbox', click: () => {quitFromTray = true; app.quit()} },
	])
	tray.setContextMenu(contextMenu)

	// protos = await load_protobufs();
	console.log(app.getPath("userData"));
	if (existsSync(app.getPath("userData") + "/auth.json")) {
		auth = JSON.parse(readFileSync(app.getPath("userData") + "/auth.json"));
	}
	protos = await load_protobufs();
	messages_db = new sqlite3.Database(app.getPath("userData") + "/messages.db");
	//unsure of what will happen if an older version has different/less fields, if this fails after changes delete the database file
	messages_db.run("CREATE TABLE IF NOT EXISTS messages (uuid TEXT, text TEXT, sender TEXT, sentTimestamp BIGINT, reply BIT, aboutuuid TEXT, status TEXT, reaction TEXT, recipients TEXT, chatid TEXT, attachments TEXT)");
	
	// and load the index.html of the app.
	mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
// app.on('window-all-closed', () => {
// 	if (process.platform !== 'darwin') {
// 		app.quit();
// 	}
// });

app.on("will-quit", (event) => {
	if (!quitFromTray) {
		event.preventDefault();
	}
});

app.on('activate', () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
Electron.ipcMain.handle('save-auth', async (event, new_auth) => {
	auth = new_auth;
	writeFileSync(app.getPath("userData") + "/auth.json", JSON.stringify(auth));
});

Electron.ipcMain.handle('get-auth', async (event) => {
	return auth;
});

Electron.ipcMain.handle('save-message', async (event, message, sender) => {
	return save_message(message, sender);
});

function serialize_recipients(message) {
	let recipients = "";
	message.recipients.forEach((recipient) => {
		recipients += recipient + ";";
	});
	return recipients.slice(0, -1);
}

function serialize_attachments(message) {
	let attachments = "";
	if (message.attachments == undefined) return attachments;
	message.attachments.forEach((attachment) => {
		if (!existsSync(app.getPath("userData") + "/attachments")) {
			mkdirSync(app.getPath("userData") + "/attachments");
		}
		writeFileSync(app.getPath("userData") + "/attachments/" + attachment.fileName, attachment.data);
		attachments += attachment.fileName + ";";
	});
	return attachments.slice(0, -1);
}

function deserialize_row(row) {
	if (row.attachments == "") {
		return {...row, recipients: row.recipients.split(";"), attachments: []};
	}
	return {...row, recipients: row.recipients.split(";"), attachments: row.attachments.split(";").map((fileName) => {
		let mime_type = mime.lookup(fileName);
		if (!mime_type) {
			mime_type = "application/" + fileName.split(".").slice(-1)[0];
		}
		return {
			fileName: fileName,
			mimeType: mime_type,
			data: readFileSync(app.getPath("userData") + "/attachments/" + fileName),
		};
	})};
}

function save_message(message, sender) {
	console.log("saving message", message, sender);
	let message_object = protos.lookupType("Message").toObject(message);
	let sql_command = `INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
	const stmt = messages_db.prepare(sql_command);
	stmt.run(message_object.uuid, message_object.text, sender, message_object.sentTimestamp, message_object.reply, message_object.aboutuuid, message_object.status, message_object.reaction, serialize_recipients(message_object), message_object.chatid, serialize_attachments(message_object));
	//assuming new messages don't already have children
	return {...message_object, sender: sender, children: []};
}

Electron.ipcMain.handle('get-all-messages', async (event) => {
	return getSomeMessages("SELECT * FROM messages WHERE aboutuuid IS NULL OR reply=1");
});

Electron.ipcMain.handle('get-some-messages', async (event, sql) => {
	return getSomeMessages(sql);
});

Electron.ipcMain.handle('pick-files', async (event, filters) => {
	let files = Electron.dialog.showOpenDialogSync({ properties: ['openFile', 'multiSelections'], filters: filters });
	if (files == undefined) {
		return [];
	}
	return files.map((file_path) => {
		let file_name = file_path.split("/").slice(-1)[0];
		let mime_type = mime.lookup(file_path);
		if (!mime_type) {
			mime_type = "application/" + file_path.split(".").slice(-1)[0];
		}
		let data = readFileSync(file_path);
		return {fileName: file_name, mimeType: mime_type, data: data};
	});
});

async function getSomeMessages(sql) {
	let promise = new Promise((resolve, reject) => {
		let messages = [];
		messages_db.each(sql, (err, row) => {
			if (err) {
				reject(err);
			}
			let message = deserialize_row(row);
			//TODO: sql injection can happen here
			message.children = getSomeMessages(`SELECT * FROM messages WHERE aboutuuid='${row.uuid}' AND reply=0`);
			messages.push(message);
		}, async () => {
			for (var i = 0; i < messages.length; i++) {
				messages[i].children = await messages[i].children;
			}
			resolve(messages);
		});
	})
	return promise;
}

Electron.ipcMain.handle('start-websocket', async (event) => {
	const ws = new WebSocket('wss://chrissytopher.com:40441/events/' + auth.uuid);

	ws.on('error', console.error);

	ws.on('open', function open() {
		console.log("ws started");
		ws.send(auth.email);
		ws.send(auth.password);
		mainWindow.webContents.send('websocket-open');
	});

	ws.on('message', async function message(data) {
		if (data == "😝") return;
		let ServerMessage = protos.lookupType("ServerMessage");
		let Message = protos.lookupType("Message");
		let server_message = ServerMessage.decode(data);
		let decrypted_message = await Crypto.decryptAsArray(auth.private_key, server_message.data);
		let message = Message.decode(decrypted_message);
		console.log(message);
		let showNotification = () => {
			new Electron.Notification({title: "New Message", subtitle:"Blue Ovals", body: server_message.sender + ": " + message.text}).show();
		}
		try {
			mainWindow.webContents.send('websocket-message', save_message(message, server_message.sender));
			if (!mainWindow.isVisible()) {
				showNotification();
			}
		} catch (e) {
			console.log(e);
			showNotification();
		}
		
	});
});