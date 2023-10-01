import { useEffect, useState, useRef } from 'react';
import Crypto from "./Crypto.js"
import { styled, useTheme } from '@mui/material/styles';
import React from 'react';
import ProtoFile from "../assets/message.proto";
import { TextField, IconButton, Drawer, Button, Divider} from '@mui/material';
import { List, ListItem, ListItemIcon, ListItemText, ListItemButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import MessagesInput from './MessagesInput.js';
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

	const forceUpdate = useForceUpdate();

	currentNewMessageCallback = (message) => {
		console.log("websocket message");
		let newMessagesList = messageList;
		newMessagesList.push(message);
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
		var email;
        window.electronAPI.getAuth().then(data => {
            console.log(data);
			email = data.email;
            setAuth(data);
        });
		window.electronAPI.getAllMessages().then(data => {
			//get all of the unique chats you are in
			setChats(getUniqueChats(data, email));
			setMessageList(afterGetmessages(data));
		});
		
    }, []);


	const [fieldValue, setFieldValue] = useState('');

	const [recipientInputValue, setRecipientInputValue] = useState('');

	const [recipient, setRecipient] = useState('christopher@huntwork.net');
	
	const [drawerOpen, setOpen] = useState(false);

    const messagesEndRef = useRef();

	function handleTextFieldChange(e) {
		setFieldValue(e.target.value);
	}

	function switchChatInputChange(e) {
		setRecipientInputValue(e.target.value);
	}

	function switchRecipient() {
		setRecipient(recipientInputValue);
	}

	const handleDrawerOpen = () => {
		setOpen(true);
	};

	const handleDrawerClose = () => {
		console.log("close Drawer");
		setOpen(false);
	};

	const DrawerHeader = styled('div')(() => ({
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'flex-end',
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


	let message_elements;
    if (auth !== undefined) {
        message_elements = <div className='messagesList'>
            {/* Render chat messages here */}
            {messageList.map((message2, i) => (
                (((message2.sender == auth.email && message2.recipients[0] == recipient) || (message2.sender == recipient && message2.recipients[0] == auth.email)) ? <Message message={message2.text} self={(message2.sender === auth.email)} timestamp={message2.sent_timestamp} messageList={messageList} id={i}/> : <></>)
            ))}
            {/* Add more message items as needed */}
            <div ref={messagesEndRef} />
        </div>
    }
	return (
		<div>

			<div style={{height: '9vh'}}>
				<IconButton onClick={handleDrawerOpen} edge='start' style={{ display: (drawerOpen ? 'none' : 'block'), marginLeft: '10px'}}>
					<MenuIcon/>
				</IconButton>
			</div>
			<Drawer  anchor='left' open={drawerOpen} 
			variant='temporary'
			sx={{width: '100px', 
			flexShrink: 0,
			'& .MuiDrawer-paper': {
				width: '250px',
				boxSizing: 'border-box',
			  }}}>
				<div style={{display: "flex", alignItems: "center", justifyContent: "flex-end"}}>
					<IconButton onClick={handleDrawerClose}>
						<ChevronLeftIcon/>
					</IconButton>
				</div>
				
				<div style={{padding: '10px', textAlign: 'center'}}>
					<TextField onChange={switchChatInputChange} label="Recipient" variant='standard'/>
					<Button onClick={switchRecipient}>Chat</Button>
				</div>
				

				<Divider/>

				<List>
					{chats.map((chat, i) => (
						<ListItem>
							<ListItemButton onClick={() => setRecipient(chat)}>
								<ListItemText>
									{chat}
								</ListItemText>
							</ListItemButton>
						</ListItem>
					))}
				</List>
			</Drawer>
            {message_elements}
			<MessagesInput onInputChange={handleTextFieldChange} inputValue={fieldValue} onSendClicked={() => {handleSend(fieldValue, recipient); setFieldValue("");}}/>
		</div>
	);
}

async function handleSend(message, recipient) {
	send_message(recipient, new_message(message));
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

async function send_message(recipient, message_info) {
	let message = add_chat_info(message_info, recipient);
	console.log(message);
	let auth = await window.electronAPI.getAuth();
	let ids = await (await fetch("https://chrissytopher.com:40441/query-ids/" + recipient)).json();
	ids.ids.forEach(async device => {
		try {
			let Message = protos.lookupType("Message");
			let encrypted_message = await Crypto.encryptBytes(device.public_key, Message.encode(message).finish());
			// eslint-disable-next-line no-unused-vars
			let res = await fetch("https://chrissytopher.com:40441/post-message/", {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					account: {
						email: auth.email,
						password: auth.password,
					},
					recipient: device.uuid,
					data: encrypted_message,
				})
			});
			console.log("successfully sent message to device", device);
		} catch {
			console.log("failed to send message to device", device);
		}
	});
	if (recipient !== auth.email) {
		let your_ids = await (await fetch("https://chrissytopher.com:40441/query-ids/" + auth.email)).json();
		your_ids.ids.forEach(async device => {
			let Message = protos.lookupType("Message");
			let encrypted_message = await Crypto.encryptBytes(device.public_key, Message.encode(message).finish());
			// eslint-disable-next-line no-unused-vars
			let res = await fetch("https://chrissytopher.com:40441/post-message/", {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					account: {
						email: auth.email,
						password: auth.password,
					},
					recipient: device.uuid,
					data: encrypted_message,
				})
			});
		});
	}
}



function getUniqueChats(data, email)
{
	var chats = [];
	for (var i = 0; i < data.length; i++)
	{

		//Check if the chat is with yourself
		if (data[i].recipients[0] == data[i].sender)
		{
			if (!chats.includes(data[i].sender))
			{
				chats.push(data[i].sender);
			}

			continue;
		}

		var inChat = false;
		for (var j = 0; j < chats.length; j++)
		{
			if (data[i].recipients[0] == chats[j] || data[i].sender == chats[j])
			{
				inChat = true;
			}
		}
		

		if (!inChat)
		{
			chats.push(
				data[i].recipients[0] == email ? data[i].sender : data[i].recipients[0]
			)
		}
	}

	console.log(chats);
	return chats;
}


function add_chat_info(message, recipient) {
	let Message = protos.lookupType("Message");
	return Message.create({...Message.toObject(message), recipients: [recipient]});
}

function new_message(text, replyuuid) {
	let Message = protos.lookupType("Message");
	return Message.create({text: text, uuid: window.crypto.randomUUID(), timestamp: ""+Date.now(), aboutuuid: replyuuid, reply: (replyuuid !== undefined)});
}

function new_reaction(reaction, aboutuuid) {
	let Message = protos.lookupType("Message");
	return Message.create({text: "", uuid: window.crypto.randomUUID(), timestamp: ""+Date.now(), aboutuuid: aboutuuid, reaction: reaction});
}

function new_delivered_receipt(message_uuid) {
	let Message = protos.lookupType("Message");
	return Message.create({text: "", uuid: window.crypto.randomUUID(), timestamp: ""+Date.now(), aboutuuid: message_uuid, status: 0});
}

function new_read_receipt(message_uuid) {
	let Message = protos.lookupType("Message");
	return Message.create({text: "", uuid: window.crypto.randomUUID(), timestamp: ""+Date.now(), aboutuuid: message_uuid, status: 1});
}

function afterGetmessages(messages)
{
  //console.log(messages);
  return messages;
}

const Message = (props) => {
	const message = props.message ? props.message : "no message";
	const self = props.self;
	const timestamp = new Date(props.timestamp);
	//passing in the message list allows to be able to compare to other messagess
	const messageList = props.messageList;
	//id is the number message it is
	const id = props.id;

	//difference in minutes between messages to show timestamp
	const time_difference_thresh = 10;

	var showTimestamp = false;

	if (id != messageList.length - 1)
	{
		var millisDiff = new Date(messageList[id + 1].sent_timestamp) - timestamp;
		var minutesDiff = Math.floor((millisDiff/1000)/60);
		if (minutesDiff > time_difference_thresh)
		{
			showTimestamp = true;
		}
	}
	

	return (
		<div className={self ? 'selfMessageWrapper' : 'otherMessageWrapper'}>
			<div className={self ? 'selfInnerMessage' : 'otherInnerMessage'}>
				<p>{message}</p>
			</div>
			
			<p style={{display: (showTimestamp ? 'block' : 'none')}} className='timestamp'>{timestamp.getHours()%12}:{timestamp.getMinutes()}</p>
		</div>
	);
}

export default MessagesScreen;