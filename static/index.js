// TODO: App component
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentPage: 'splash', // This could be 'splash', 'profile', 'login', or 'channel'
      user: null, // User details or null if not logged in
      channels: [], // List of channels
    };
  }

  // componentDidMount() {
  //   this.checkUserSession();
  // }

  checkUserSession = () => {
    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) {
      this.setState({ currentPage: 'login' });
      return;
    }

    // Assuming you have an endpoint '/api/profile' that returns user details based on a valid API key
    fetch('/api/profile', {
      method: 'GET',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
    })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Session validation failed');
      }
    })
    .then(data => {
      this.setState({
        user: {
          id: data.id,
          username: data.username,
          apiKey: data.api_key, // Consider if you really need to store the API key in state
        },
        currentPage: 'splash', // Redirect to the splash page or another appropriate page
      });
      // Optionally, fetch channels or other data now that the user is confirmed logged in
    })
    .catch(error => {
      console.error('Error checking user session:', error);
      this.setState({ currentPage: 'login' });
      localStorage.removeItem('apiKey'); // Clear stored API key if session check fails
    });
  };


  handleLogin = (username, password) => {
    return fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    })
    .then(response => {
      if (!response.ok) {
        // Convert non-2xx HTTP responses into errors
        throw new Error('Login failed');
      }
      return response.json();
    })
    .then(data => {
      // Assuming the API returns a user object with an api_key on successful login
      this.setState({
        user: {
          id: data.id,
          username: data.username,
          apiKey: data.api_key,
        },
        currentPage: 'splash', // Navigate to the splash page or another appropriate page upon login
      });
      // Store the api_key in localStorage or another secure place for future requests
      localStorage.setItem('apiKey', data.api_key);
      return true; // Indicate success
    })
    .catch(error => {
      console.error('Error during login:', error);
      // Optionally handle login failure (e.g., by showing an error message) here
      return false; // Indicate failure
    });
  };

  handleLogout = () => {
    // Clear user details from the state
    this.setState({ user: null, currentPage: 'login' });

    // Remove the stored API key or token from local storage
    localStorage.removeItem('apiKey');
  };

  navigateTo = (page) => {
    this.setState({ currentPage: page });
  };

  renderPage() {
    const { currentPage, user, channels } = this.state;

    switch (currentPage) {
      case 'splash':
        return <SplashScreen user={user} channels={channels} navigateTo={this.navigateTo} />;
      case 'login':
        return <LoginForm handleLogin={this.handleLogin} />;
      case 'profile':
        return <Profile user={user} handleLogout={this.handleLogout} />;
      case 'channel':
        return <Channel user={user} channels={channels} />;
      default:
        return <div>Page not found</div>;
    }
  }

  render() {
    return (
      <div>
        {this.renderPage()}
      </div>
    );
  }
}

// TODO: Splash component
function SplashScreen({ user, channels, navigateTo }) {
  return (
    <div className="splashScreen">
      <h1>Welcome to Belay</h1>
      {user ? (
        <div>
          <p>Welcome back, {user.username}!</p>
          <button onClick={() => navigateTo('profile')}>Go to Profile</button>
          <button onClick={() => navigateTo('channel')}>Join a Channel</button>
        </div>
      ) : (
        <div>
          <button onClick={() => navigateTo('login')}>Login</button>
          <button onClick={() => navigateTo('signup')}>Sign Up</button>
        </div>
      )}
      <div className="channels">
        <h2>Available Channels</h2>
        {channels && channels.length > 0 ? (
          <ul>
            {channels.map((channel, index) => (
              <li key={index} onClick={() => navigateTo(`channel/${channel.id}`)}>
                {channel.name}
              </li>
            ))}
          </ul>
        ) : (
          <p>No channels available. Why not create one?</p>
        )}
      </div>
    </div>
  );
}

// TODO: LoginForm component
class LoginForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      errorMessage: '', // Used to display login errors
    };
  }

  handleInputChange = (event) => {
    const { name, value } = event.target;
    this.setState({ [name]: value });
  };

  handleSubmit = (event) => {
    event.preventDefault();
    const { username, password } = this.state;

    // Assuming handleLogin is an async function that returns true on success and false on failure
    this.props.handleLogin(username, password)
      .then(success => {
        if (!success) {
          this.setState({ errorMessage: 'Invalid username or password' });
        }
      })
      .catch(error => {
        // Handle or display error message
        this.setState({ errorMessage: 'An error occurred. Please try again.' });
      });
  };

  render() {
    const { username, password, errorMessage } = this.state;

    return (
      <form onSubmit={this.handleSubmit}>
        <div>
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            name="username"
            value={username}
            onChange={this.handleInputChange}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={this.handleInputChange}
            required
          />
        </div>
        {errorMessage && <div className="error">{errorMessage}</div>}
        <button type="submit">Login</button>
      </form>
    );
  }
}

// TODO: Profile component
class Profile extends React.Component {
  handleLogout = () => {
    // Call the logout function provided by the parent component
    this.props.handleLogout();
  };

  render() {
    const { user } = this.props;

    return (
      <div className="profile">
        <h2>Profile</h2>
        <p>Welcome, {user.username}!</p>
        {/* Optionally include more user details here */}
        <button onClick={this.handleLogout}>Log out</button>
      </div>
    );
  }
}

// TODO: Channel component
class Channel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      messages: [], // Messages will be stored here
      newMessage: '', // The new message to send
    };
  }

  componentDidMount() {
    this.fetchMessages();
  }

  fetchMessages = () => {
    // Replace with your API call to fetch messages for the current channel
    fetch(`/api/channel/${this.props.channelId}/messages`)
      .then(response => response.json())
      .then(data => this.setState({ messages: data }))
      .catch(error => console.error('Error fetching messages:', error));
  };

  handleInputChange = (event) => {
    this.setState({ newMessage: event.target.value });
  };

  handleSubmit = (event) => {
    event.preventDefault();
    const { newMessage } = this.state;
    const { channelId } = this.props;

    // Replace with your API call to post a new message
    fetch(`/api/channel/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.props.user.apiKey}`, // Assuming you use API keys for authorization
      },
      body: JSON.stringify({ body: newMessage }),
    })
    .then(response => {
      if (response.ok) {
        this.setState({ newMessage: '' }); // Clear input after sending
        this.fetchMessages(); // Fetch messages again to show the new one
      } else {
        console.error('Failed to send message');
      }
    })
    .catch(error => console.error('Error posting message:', error));
  };

  render() {
    const { messages, newMessage } = this.state;

    return (
      <div className="channel">
        <h2>Channel</h2>
        <div className="messages">
          {messages.map((message, index) => (
            <div key={index} className="message">
              <strong>{message.sender}:</strong> {message.text}
            </div>
          ))}
        </div>
        <form onSubmit={this.handleSubmit}>
          <input
            type="text"
            value={newMessage}
            onChange={this.handleInputChange}
            placeholder="Type a message..."
          />
          <button type="submit">Send</button>
        </form>
      </div>
    );
  }
}

const rootContainer = document.getElementById("root");
const root = ReactDOM.createRoot(rootContainer);
root.render(<App />);