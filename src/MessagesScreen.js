import { useEffect, useState, useRef } from 'react';
import Crypto from "./Crypto.js"
import { styled } from '@mui/material/styles';
import React from 'react';
import ProtoFile from "../assets/message.proto";
import { TextField, IconButton, Button, Divider} from '@mui/material';
import { List, ListItem, ListItemText, ListItemButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MessagesInput from './MessagesInput.js';
import Message from './Message.js';
var protobuf = require("protobufjs");
let protos = await load_protobufs();

let currentNewMessageCallback = undefined;

//create your forceUpdate hook
function useForceUpdate(){
    const [value, setValue] = useState(0); // integer state
    return () => setValue(value => value + 1); // update state to force render
    // A function that increment 👆🏻 the previous state like here 
    // is better than directly setting `setValue(value + 1)`
}

function MessagesScreen() {
    const [auth, setAuth] = useState(undefined);

	const [messageList, setMessageList] = useState([]);

	const [chats, setChats] = useState([]);

	const [searchResults, setSearchResults] = useState([]);

	const forceUpdate = useForceUpdate();

	const [showNewChat, setShowNewChat] = useState(false);

	currentNewMessageCallback = (message) => {
		console.log("websocket message");
		console.log(message);
		let newMessagesList = messageList;
		if (message.reaction === undefined && message.status === undefined) {
			newMessagesList.push(message);
		} else {
			newMessagesList.forEach((list_message, i) => {
				if (list_message.uuid === message.aboutuuid) {
					newMessagesList[i].children.push(message);
				}
			});
		}
		setMessageList(newMessagesList);
		setChats(getUniqueChats(newMessagesList, auth.email));
		forceUpdate();
	};


    useEffect(() => {
		window.electronAPI.onWebsocketOpened(() => {
			console.log("websocket opened");
		});
		window.electronAPI.onReceivedMessage((message) => {
			currentNewMessageCallback(message);
		});
        window.electronAPI.startWebsocket();
		let email;
        window.electronAPI.getAuth().then(data => {
			email = data.email;
            setAuth(data);
        });
		window.electronAPI.getAllMessages().then(data => {
			console.log("got messages: ", data);
			//get all of the unique chats you are in
			setChats(getUniqueChats(data, email));
			setMessageList(afterGetmessages(data));
		});
    }, []);


	const [fieldValue, setFieldValue] = useState('');

	const [recipientInputValue, setRecipientInputValue] = useState('');

	const [recipients, setRecipients] = useState(['christopher@huntwork.net']);
	const [chatid, setChatId] = useState(undefined);
	
	const [drawerOpen, setOpen] = useState(false);

    const messagesEndRef = useRef();

	const chatsListRef = useRef();

	const searchResultsRef = useRef();

	function handleTextFieldChange(e) {
		setFieldValue(e.target.value);
	}

	function handleSearchChange(e) {
		if (e.target.value == '')
		{
			searchResultsRef.current.style.display = 'none';
			chatsListRef.current.style.display = 'block';
			return;
		}

		searchResultsRef.current.style.display = 'block';
		chatsListRef.current.style.display = 'none';

		var result = [];

		for (var i = 0; i < messageList.length; i++)
		{
			if (messageList[i].text.toLowerCase().includes(e.target.value.toLowerCase()))
			{
				result.push(messageList[i]);
			}
		}

		setSearchResults(result);

		console.log(result);
	}

	function switchChatInputChange(e) {
		setRecipientInputValue(e.target.value);
	}

	function switchRecipient() {
		setRecipients([...recipientInputValue.split("\n"), auth.email]);
		setChatId(window.crypto.randomUUID())
	}

	const CssTextField = styled(TextField, {
		shouldForwardProp: (props) => props !== "focusColor" && props !== "unfocusedColor"
	  })((p) => ({
		// input label when focused
		"& label.Mui-focused": {
		  color: p.focusColor
		},
		// focused color for input with variant='standard'
		"& .MuiInput-underline:after": {
		  borderBottomColor: p.focusColor
		},
		// input label when focused
		"& label": {
			color: p.unfocusedColor
		},
		// focused color for input with variant='standard'
		"& .MuiInput-underline:before": {
			borderBottomColor: p.unfocusedColor
		},
		// focused color for input with variant='standard'
		"&:hover:not($disabled):before": {
			borderBottomColor: p.unfocusedColor,
			backgroundColor: p.unfocusedColor
		},
		// focused color for input with variant='filled'
		"& .MuiFilledInput-underline:after": {
		  borderBottomColor: p.focusColor
		},
		// focused color for input with variant='outlined'
		"& .MuiOutlinedInput-root": {
		  "&.Mui-focused fieldset": {
			borderColor: p.focusColor
		  }
		}
	  }));


    useEffect(() => {
        if (messageList.length)
        {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
        });
        }

    }, [messageList.length, auth]);


	let message_elements = [];
	let [clickedMessages, setClickedMessages] = useState([]);
	let [selectedMessage, setSelectedMessage] = useState(undefined);
	let [attachmentFiles, setAttachmentFiles] = useState([]);
    if (auth !== undefined) {
		message_elements.push(
			<div style={{height: "7vh"}}>
				<p style={{visibility: 'hidden'}}>hi</p>
			</div>
		);
		messageList.forEach((message, id) => {
			if ( (recipients.length == 1 && message.recipients.length == 1) && ((message.sender == auth.email && message.recipients[0] == recipients[0]) || (message.sender == recipients[0] && message.recipients[0] == auth.email)) || (chatid == message.chatid && chatid != undefined)) {
				
				const timestamp = new Date(new Number(message.sentTimestamp));

				//difference in minutes between messages to show timestamp
				const time_difference_thresh = 10;

				let showTimestamp = clickedMessages.includes(id);
				if (id != messageList.length - 1) {
					var millisDiff = new Date(messageList[id + 1].sentTimestamp) - timestamp;
					var minutesDiff = Math.floor((millisDiff/1000)/60);
					if (minutesDiff > time_difference_thresh) {
						showTimestamp = true;
					}
				}
				message_elements.push(
					<Message message={message} self={(message.sender == auth.email)} onClick={() => {
						if (!clickedMessages.includes(id)) {
							clickedMessages.push(id);
						} else {
							clickedMessages.splice(clickedMessages.indexOf(id), 1);
						}
						setClickedMessages(clickedMessages);
						forceUpdate();
					}} showTimestamp={showTimestamp} timestamp={timestamp}
					readMessage={() => {
						send_message(message.recipients, message.chatid, new_read_receipt(message.uuid));
					}}
					selected={message.uuid === selectedMessage} setSelected={setSelectedMessage}
					react={(emoji) => {
						send_message(message.recipients, message.chatid, new_reaction(emoji, message.uuid));
					}}/>
				);
			}
		});
		message_elements.push(
			<div style={{height: "10vh"}}>
				<p style={{visibility: 'hidden'}}>hi</p>
			</div>
		);
    }

	let headerText = "";
	recipients.forEach((recipient) => {
		headerText += recipient + ", "
	});
	headerText = headerText.slice(0, -2);

	return (
		<div className='flex-container'>
			<div className='drawer'>

				<div style={{display: 'flex', flexDirection: 'row', padding: '5px'}}>
					<CssTextField unfocusedColor='white' focusColor='white' label='Search' variant='standard' onChange={handleSearchChange} sx={{ input: { color: 'white' } }}/>
					<IconButton style={{color: 'white'}} onClick={() => setShowNewChat(!showNewChat)}>
						<AddIcon/>
					</IconButton>
				</div>
				
				<div style={{padding: '10px', textAlign: 'center', display: (showNewChat ? 'block' : 'none')}}>
					<CssTextField unfocusedColor='white' focusColor='white' onChange={switchChatInputChange} label="Recipient" variant='standard' multiline/>
					<Button onClick={switchRecipient}>Chat</Button>
				</div>
				

				<Divider/>
				<div ref={chatsListRef}>
					<List>
						{chats.map((chat, i) => {
							let text  = ""
							chat.recipients.forEach((recipient) => {
								text += recipient + ", "
							});
							text = text.slice(0, -2);
							return <ListItem>
								<ListItemButton onClick={() => {setRecipients(chat.recipients); setChatId(chat.chatid)}}>
									<ListItemText style={{color: 'white'}}>
										{text}
									</ListItemText>
								</ListItemButton>
							</ListItem>
						})}
					</List>
				</div>
				<div ref={searchResultsRef} style={{display: 'none'}}>
					<h3 style={{color: 'white'}}>Search Results</h3>
					<List>
						{searchResults.map((result, i) => (
							<ListItem>
								<ListItemButton onClick={() => {
									//TODO: fix search
									// setRecipient(result.sender == auth.email ? result.recipients[0] : result.sender);
									// document.getElementById(result.uuid).scrollIntoView();
								}}>
									<ListItemText style={{color: 'white'}} secondaryTypographyProps={{style: {color: 'white'}}} secondary={(result.sender == auth.email ? result.recipients[0] : result.sender)} primary={result.text}/>
								</ListItemButton>
							</ListItem>
						))}
					</List>
				</div>

				
			</div>
			<div className='MessagesContainer' onClick={() => {setSelectedMessage(undefined)}}>
				<div id='chatHeader'>
					<p className='MessagesHeader'>{headerText}</p>
				</div>
				<div className='messagesList'>
					{message_elements}
					<div ref={messagesEndRef}/>
        		</div>
				<MessagesInput onFileUpload={async () => setAttachmentFiles(await addAttachment(attachmentFiles))} onInputChange={handleTextFieldChange} inputValue={fieldValue} onSendClicked={() => {handleSend(fieldValue, recipients, chatid, attachmentFiles); setFieldValue(""); setAttachmentFiles([]);}}/>
			</div>
		</div>
	);
}

async function handleSend(message, recipients, chatid, attachment) {
	//let attachments = await window.electronAPI.pickFiles();
	let attachments = attachment;
	send_message(recipients, chatid, add_attachments(new_message(message), attachments));
}

async function addAttachment(attachments)
{
	let files = await window.electronAPI.pickFiles();
	files.forEach((attachment) => {
		attachments.push(attachment);
	});
	console.log(attachments);
	return attachments;
}


async function load_protobufs() {
	return new Promise((resolve, reject) => {
		protobuf.load(ProtoFile, function (err, root) {
			if (err) {
				reject(err);
			}
			resolve(root);
		});
	})
}

async function send_message(recipients, chatid, message_info) {
	let auth = await window.electronAPI.getAuth();
	if (!recipients.includes(auth.email) && chatid != undefined) {
		recipients.push(auth.email);
	}
	console.log(recipients, chatid, message_info)
	let message = add_chat_info(message_info, recipients, chatid);
	recipients.forEach(async (recipient) => {
		let ids = await (await fetch("https://chrissytopher.com:40441/query-ids/" + recipient)).json();
		ids.ids.forEach(async device => {
			try {
				let Message = protos.lookupType("Message");
				let ServerPost = protos.lookupType("ServerPost");
				let encrypted_message = await Crypto.encryptAsArray(device.public_key, Message.encode(message).finish());
				// eslint-disable-next-line no-unused-vars
				let res = await fetch("https://chrissytopher.com:40441/post-message/", {
					method: 'POST',
					body: ServerPost.encode(ServerPost.create({
						email: auth.email,
						password: auth.password,
						recipient: device.uuid,
						data: encrypted_message,
					})).finish()
				});
				console.log("successfully sent message to device", device);
			} catch (e) {
				console.log(e, "failed to send message to device", device);
			}
		});
	});
	if (!recipients.includes(auth.email)) {
		let your_ids = await (await fetch("https://chrissytopher.com:40441/query-ids/" + auth.email)).json();
		your_ids.ids.forEach(async device => {
			try {
				let Message = protos.lookupType("Message");
				let ServerPost = protos.lookupType("ServerPost");
				let encrypted_message = await Crypto.encryptAsArray(device.public_key, Message.encode(message).finish());
				// eslint-disable-next-line no-unused-vars
				let res = await fetch("https://chrissytopher.com:40441/post-message/", {
					method: 'POST',
					body: ServerPost.encode(ServerPost.create({
						email: auth.email,
						password: auth.password,
						recipient: device.uuid,
						data: encrypted_message,
					})).finish()
				});
				console.log("successfully sent message to device", device);
			} catch {
				console.log("failed to send message to device", device);
			}
		});
	}
}



function getUniqueChats(data, email)
{
	var justSenders = [];
	var chats = [];
	data.forEach((message) => {
		if (message.recipients.length == 1) {
			if (message.recipients[0] != email) {
				if (!justSenders.includes(message.recipients[0])) {
					chats.push({recipients: message.recipients});
					justSenders.push(message.recipients[0]);
				}
			} else if (!justSenders.includes(message.sender)) {
				chats.push({recipients: [message.sender]});
				justSenders.push(message.sender);
			}
		} else {
			if (!justSenders.includes(message.chatid) && message.chatid) {
				chats.push({recipients: message.recipients, chatid: message.chatid});
				justSenders.push(message.chatid);
			}
		}
	});
	return chats;
}


function add_chat_info(message, recipients, chatid) {
	let Message = protos.lookupType("Message");
	return Message.create({...Message.toObject(message), recipients: recipients, chatid: chatid});
}

function add_attachments(message, attachments) {
	let Message = protos.lookupType("Message");
	let Attachment = protos.lookupType("Attachment");
	let attachment_protos = null;
	if (attachments != null)
	{
		console.log(attachments);
		attachment_protos = attachments.map((attachment) => {
			return Attachment.create(attachment);
		});
	} 
	
	return Message.create({...Message.toObject(message), attachments: attachment_protos});
}

function new_message(text, replyuuid) {
	let Message = protos.lookupType("Message");
	return Message.create({text: text, uuid: window.crypto.randomUUID(), sentTimestamp: ""+Date.now(), aboutuuid: replyuuid, reply: (replyuuid !== undefined)});
}

function new_reaction(reaction, aboutuuid) {
	let Message = protos.lookupType("Message");
	return Message.create({text: "", uuid: window.crypto.randomUUID(), sentTimestamp: ""+Date.now(), aboutuuid: aboutuuid, reaction: reaction, reply: false});
}

function new_delivered_receipt(message_uuid) {
	let Message = protos.lookupType("Message");
	return Message.create({text: "", uuid: window.crypto.randomUUID(), sentTimestamp: ""+Date.now(), aboutuuid: message_uuid, status: 0, reply: false});
}

function new_read_receipt(message_uuid) {
	let Message = protos.lookupType("Message");
	return Message.create({text: "", uuid: window.crypto.randomUUID(), sentTimestamp: ""+Date.now(), aboutuuid: message_uuid, status: 1, reply: false});
}

function afterGetmessages(messages)
{
  //console.log(messages);
  return messages;
}

export default MessagesScreen;