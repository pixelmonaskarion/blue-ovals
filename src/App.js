import './App.css';
import { useState } from 'react';
import React from 'react';
import MessagesScreen from "./MessagesScreen"
import SignInScreen from "./SignInScreen"

function App() {
	const [authed, setAuthed] = useState(undefined);
	window.electronAPI.getAuth().then(data => {
        setAuthed((data !== undefined));
    });
	if (authed === true) {
		return (
			<div className='App'>
				<MessagesScreen/>
			</div>
		);
	} else if (authed === false) {
		return (
			<div className='App'>
				<SignInScreen authed={() => {setAuthed(true)}}/>
			</div>
		);
	}
}

export default App;
