import React, { useEffect, useRef, useState } from 'react';
import { useLongPress } from 'use-long-press';
import { MessageReaction, Reactions } from './Reactions';

function Message(props) {
	const message = props.message;
	const self = props.self;

	const showTimestamp = props.showTimestamp;

	const messageRef = useRef(undefined);

	const selected = props.selected;

	let highest_status = {status: 0, timestamp: message.sentTimestamp, text: "Sent"};
	let reactions = [];
	message.children.forEach(child => {
		if (child.status !== undefined) {
			if (child.status > highest_status.status) {
				highest_status = {status: child.status, timestamp: child.sentTimestamp, text: (child.status === 0) ? "Delivers" : "Read"};
			}
		}
		if (child.reaction) {
			reactions.push(child);
		}
	});

	let [sentRead, setSentRead] = useState(highest_status.status === 1);

	useEffect(() => {
		if (!sentRead) {
			let updater = setInterval(() => {
				if (messageRef.current !== undefined) {
					if (isInViewport(messageRef.current)) {
						setSentRead(true);
						props.readMessage();
						clearInterval(updater);
					}
				}
			}, 100);
			return () => {
				clearInterval(updater);
			}
		}
	});

	const timestamp = new Date(new Number(highest_status.timestamp));

	const longPressAction = useLongPress(()=>{props.setSelected(message.uuid);}, {onFinish: (event) => {
		console.log("long pressed");
		event.preventDefault();
		setTimeout(() => {
			props.setSelected(message.uuid);
		}, 0)
	  }});

	let reactionSelect;
	if (selected) {
		reactionSelect = <Reactions from_me={self ? "Me" : "Other"} react={props.react}/>
	}
	let reactionElements = [];
	reactions.forEach((reaction) => {
		reactionElements.push(<MessageReaction color="#262628" user={reaction.sender} emoji={reaction.reaction}/>)
	});

	return (
		<div {...longPressAction()} id={message.uuid} className={self ? 'selfMessageWrapper' : 'otherMessageWrapper'} onClick={() => {props.onClick();}} ref={messageRef}>
			{reactionSelect}

			<div className={self ? 'selfInnerMessage' : 'otherInnerMessage'} style={selected ? {background: "#7cacf8"} : {}}>
				<p className='messageText'>{message.text}</p>
			</div>
			<div className='MessageReactionsWrapper' style={{textAlign: self ? "right" : "left"}}>
				{reactionElements}
			</div>
			
			<p style={{display: (showTimestamp ? 'block' : 'none'), textAlign: self ? "right" : "left"}} className='timestamp'>{highest_status.text} {(timestamp.getHours()%12 == 0) ? 12 : timestamp.getHours()%12}:{timestamp.getMinutes()}</p>
		</div>
	);
}

function isInViewport(element) {
	const rect = element.getBoundingClientRect();
	return (
		rect.top >= 0 &&
		rect.left >= 0 &&
		rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
		rect.right <= (window.innerWidth || document.documentElement.clientWidth)
	);
}

export default Message;