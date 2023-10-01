import React from 'react';
import { TextField, IconButton} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
function MessagesInput(props) {
    return <div className='inputContainer'>
        <TextField className='messageInput' label="Type message..." variant="standard" onChange={props.onInputChange} value={props.inputValue}/>
        <IconButton onClick={props.onSendClicked}>
            <SendIcon/>
        </IconButton>
    </div>
}

export default MessagesInput;