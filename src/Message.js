import React, { useEffect, useRef, useState } from 'react';

function Message(props) {
	const message = props.message;
	const self = props.self;

	const showTimestamp = props.showTimestamp;

	const messageRef = useRef(undefined);

	let highest_status = {status: 0, timestamp: message.sentTimestamp, text: "Sent"};
	message.children.forEach(child => {
		if (child.status !== undefined) {
			if (child.status > highest_status.status) {
				highest_status = {status: child.status, timestamp: child.sentTimestamp, text: (child.status === 0) ? "Delivers" : "Read"};
			}
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

	return (
		<div id={message.uuid} className={self ? 'selfMessageWrapper' : 'otherMessageWrapper'} onClick={props.onClick} ref={messageRef}>
			<div className={self ? 'selfInnerMessage' : 'otherInnerMessage'}>
				<p>{message.text}</p>
			</div>
			
			<p style={{display: (showTimestamp ? 'block' : 'none')}} className='timestamp'>{highest_status.text} {(timestamp.getHours()%12 == 0) ? 12 : timestamp.getHours()%12}:{timestamp.getMinutes()}</p>
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