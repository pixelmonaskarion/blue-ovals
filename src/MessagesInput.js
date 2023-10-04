import React from 'react';
import { TextField, IconButton} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
function MessagesInput(props) {
    return <div className='inputContainer'>
        <input type="text" className='messageInput' placeholder="Type message..." onChange={props.onInputChange} value={props.inputValue}/>
        <IconButton onClick={props.onSendClicked} style={{backgroundColor: "#404040"}}>
            <SendIcon/>
        </IconButton>
    </div>
}

export default MessagesInput;