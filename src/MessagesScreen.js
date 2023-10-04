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

	const [recipient, setRecipient] = useState('christopher@huntwork.net');
	
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
		setRecipient(recipientInputValue);
	}


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
    if (auth !== undefined) {
		messageList.forEach((message, id) => {
			if ((message.sender == auth.email && message.recipients[0] == recipient) || (message.sender == recipient && message.recipients[0] == auth.email)) {
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
						send_message(message.recipients[0], new_read_receipt(message.uuid));	
					}}
					selected={message.uuid === selectedMessage} setSelected={setSelectedMessage}
					react={(emoji) => {
						send_message(message.recipients[0], new_reaction(emoji, message.uuid));
					}}/>
				);
			}
		});
		message_elements.push(
			<div style={{height: "8vh"}}>
				<p style={{visibility: 'hidden'}}>hi</p>
			</div>
		);
    }
	return (
		<div className='flex-container'>
			<div className='drawer'>

				<div style={{display: 'flex', flexDirection: 'row', padding: '5px'}}>
					<TextField label='Search' variant='standard' onChange={handleSearchChange}/>
					<IconButton onClick={() => setShowNewChat(!showNewChat)}>
						<AddIcon/>
					</IconButton>
				</div>
				
				<div style={{padding: '10px', textAlign: 'center', display: (showNewChat ? 'block' : 'none')}}>
					<TextField onChange={switchChatInputChange} label="Recipient" variant='standard'/>
					<Button onClick={switchRecipient}>Chat</Button>
				</div>
				

				<Divider/>
				<div ref={chatsListRef}>
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
				</div>
				<div ref={searchResultsRef} style={{display: 'none'}}>
					<h3>Search Results</h3>
					<List>
						{searchResults.map((result, i) => (
							<ListItem>
								<ListItemButton onClick={() => {
									setRecipient(result.sender == auth.email ? result.recipients[0] : result.sender);
									document.getElementById(result.uuid).scrollIntoView();
								}}>
									<ListItemText secondary={(result.sender == auth.email ? result.recipients[0] : result.sender)} primary={result.text}/>
								</ListItemButton>
							</ListItem>
						))}
					</List>
				</div>

				
			</div>
			<div className='MessagesContainer' onClick={() => {setSelectedMessage(undefined)}}>
				<div className='messagesList'>
					{message_elements}
					<div ref={messagesEndRef}/>
        		</div>
				<MessagesInput onInputChange={handleTextFieldChange} inputValue={fieldValue} onSendClicked={() => {handleSend(fieldValue, recipient); setFieldValue("");}}/>
			</div>
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
		} catch (e) {
			console.log(e, "failed to send message to device", device);
		}
	});
	if (recipient !== auth.email) {
		let your_ids = await (await fetch("https://chrissytopher.com:40441/query-ids/" + auth.email)).json();
		your_ids.ids.forEach(async device => {
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
	}
}



function getUniqueChats(data, email)
{
	var chats = [];
	data.forEach((message) => {
		if (message.recipients.length == 1) {
			if (message.recipients[0] != email) {
				if (!chats.includes(message.recipients[0])) {
					chats.push(message.recipients[0]);
				}
			} else if (!chats.includes(message.sender)) {
				chats.push(message.sender);
			}
		}
	});
	return chats;
}


function add_chat_info(message, recipient) {
	let Message = protos.lookupType("Message");
	return Message.create({...Message.toObject(message), recipients: [recipient]});
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