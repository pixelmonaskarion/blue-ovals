import React from 'react';

function Message(props) {
	const message = props.message;
	const self = props.self;
    const timestamp = props.timestamp;

	const showTimestamp = props.showTimestamp;

	return (
		<div id={message.uuid} className={self ? 'selfMessageWrapper' : 'otherMessageWrapper'} onClick={props.onClick}>
			<div className={self ? 'selfInnerMessage' : 'otherInnerMessage'}>
				<p>{message.text}</p>
			</div>
			
			<p style={{display: (showTimestamp ? 'block' : 'none')}} className='timestamp'>{timestamp.getHours()%12}:{timestamp.getMinutes()}</p>
		</div>
	);
}

export default Message;