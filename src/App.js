import React, { Component } from 'react';
import './App.css';
import MessageList from './MessageList';
import MessageForm from './MessageForm';
import TwilioChat from 'twilio-chat';

class App extends Component {
  constructor(props) {  
    super(props)
    this.state = {
      messages: [],
      username: null,
      channel: null,
    }
  }

  addMessage = (message) => {
    const messageData = { ...message, me: message.author === this.state.username }
    this.setState({
      messages: [...this.state.messages, messageData],
    })
  }

  handleNewMessage = (text) => {
    if(this.state.channel) {
      this.state.channel.sendMessage(text);
    }
  }

  // need to update tutorial for how to create a chat client with the newest version of the twilio-chat package
  // using twilio-chat 1.1.1 instead of latest version
  createChatClient = async (token) => {
    try {
      const client = new TwilioChat(token.jwt)
      console.log('chat client', client);
      return client;
    } catch(err) {
      console.log(err);
      return err;
    }
  }

  getToken = async () => {
    this.setState({
      messages: [...this.state.messages, { body: `Connecting...` }],
    })

    try {
      let token = await fetch('/token', {
        headers: {
          'Content-type': 'application/json' 
        }
      });
      token = await token.json();
      // console.log(token);
      this.setState({ username: token.identity })
      return token;
    } catch(err) {
      console.log(err);
      this.addMessage({ body: 'Error: Failed to connect' })
    }
  }

  joinGeneralChannel = async (chatClient) => {
    try {
      const subscribedChannels = await chatClient.getSubscribedChannels();
      console.log('subscribedChannels', subscribedChannels);
      try {
        const channel = await chatClient.getChannelByUniqueName('general');
        this.addMessage({ body: 'Joining general channel...' })
        this.setState({ channel })

        await channel.join();
        this.addMessage({ body: `Joined general channel as ${this.state.username}` })
        window.addEventListener('beforeunload', () => channel.leave())
        return channel;
      } catch(err) {
        return this.createGeneralChannel(chatClient)
      }
    } catch(err) {
      console.log(err);
    }
  }

  createGeneralChannel = async (chatClient) => {
    try {
      this.addMessage({ body: 'Creating general channel...' })
      const channel = await chatClient.createChannel({ uniqueName: 'general', friendlyName: 'General Chat' })
      this.joinGeneralChannel(chatClient);
      console.log('general channel after being created', channel);
      return channel;
    } catch(err) {
      console.log(err);
    }
  }

  configureChannelEvents = (channel) => {
    channel.on('messageAdded', ({ author, body }) => {
      this.addMessage({ author, body })
    })
  
    channel.on('memberJoined', (member) => {
      this.addMessage({ body: `${member.identity} has joined the channel.` })
    })
  
    channel.on('memberLeft', (member) => {
      this.addMessage({ body: `${member.identity} has left the channel.` })
    })
  }

  componentDidMount = async () => {
    try {
      const token = await this.getToken();
      const chatClient = await this.createChatClient(token);
      const channel = await this.joinGeneralChannel(chatClient);
      // console.log('channel', channel);
      await this.configureChannelEvents(channel);
    } catch(err) {
      console.log(err);
      this.addMessage({ body: `Error: ${err}` })
    }
  }

  render() {
    return (
      <div className="App">
        <MessageList messages={this.state.messages} />
        <MessageForm onMessageSend={this.handleNewMessage} />
      </div>
    );
  }
}

export default App;
