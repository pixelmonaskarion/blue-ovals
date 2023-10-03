import React from 'react';

class MessageReaction extends React.Component {
	constructor(props) {
		super(props);
		this.divRef = React.createRef();
		this.state = {
			show_user: false,
		};
	}
	render() {
		return <div className='MessageReactionOuter'>
				<div ref={this.divRef} style={{backgroundColor: this.props.color}} className='MessageReactionBackground'>
					<img alt=""  src={"https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/72/emoji_"+this.props.emoji+".png"} className="MessageReaction"></img>
				</div>
				<div className='MessageReactionInfo' style={{opacity: this.state.show_user ? 1.0 : 0.0}}>
					<span>{this.props.user}</span>
				</div>
		</div>;
	}

	componentDidMount() {
		this.divRef.current.addEventListener("mouseenter", (e) => {
			this.setState({...this.state, show_user: true});
		});
		this.divRef.current.addEventListener("mouseleave", (e) => {
			this.setState({...this.state, show_user: false});
		});
		this.divRef.current.addEventListener("click", (e) => {
			this.setState({...this.state, show_user: !this.state.show_user});
		});
	}

}

class Reactions extends React.Component {
	render() {
		let emojis = ["u1f44d", "u1f44e", "u2764", "u1f602", "u1f601", "u1f625", "u1f62e"];
		let emojiElements = [];
		emojis.forEach(emoji => {
			emojiElements.push(<Reaction key={emoji} emoji={emoji} react={this.props.react}></Reaction>);
		});
		return <div className={'ReactionsOuter'+this.props.from_me} onClick={(e) => this.stopClick(e)}>
			<div className={'Reactions'+this.props.from_me}>
				{emojiElements}
			</div>
		</div>;
	}

	stopClick(e) {
		e.stopPropagation();
	}
}

class Reaction extends React.Component {
	constructor(props) {
		super(props);
		this.divRef = React.createRef();
	}
	render() {
		return <div ref={this.divRef} className='ReactionBackground'>
			<img alt=""  src={"https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/72/emoji_"+this.props.emoji+".png"} className="Reaction"></img>
		</div>;
	}

	componentDidMount() {
		this.divRef.current.addEventListener("click", (e) => {
			e.stopPropagation();
			this.props.react(this.props.emoji);
		});
	}
}

export {Reaction, Reactions, MessageReaction};