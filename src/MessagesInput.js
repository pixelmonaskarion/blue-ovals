import React from 'react';
import { TextField, IconButton, SpeedDial, SpeedDialAction} from '@mui/material';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SendIcon from '@mui/icons-material/Send';
function MessagesInput(props) {
    return <div className='inputContainer'>
        <input type="text" id='messageInput' className='messageInput' placeholder="Type message..." onChange={props.onInputChange} value={props.inputValue}/>
        <IconButton onClick={props.onSendClicked} style={{backgroundColor: "#404040", marginRight: "1vw"}}>
            <SendIcon/>
        </IconButton>
    </div>
}

export default MessagesInput;