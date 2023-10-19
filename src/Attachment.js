import React from 'react';
import Crypto from "./Crypto"

function Attachment(props) {
    if (props.attachment.mimeType.startsWith("image/")) {
        return <img src={`data:${props.attachment.mimeType};base64,${Crypto.arrayBufferToBase64(props.attachment.data)}`} style={{width: '90%', paddingTop: '20px'}}/>
    }
    return <div className='Attachment'>
        <span>{props.attachment.fileName}</span>
        <a onClick={() => {
            alert("idk!");
        }}> Download</a>
    </div>
}

export default Attachment;