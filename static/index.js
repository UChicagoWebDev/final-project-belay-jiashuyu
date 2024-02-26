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
            this.setState({currentPage: 'login'});
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
                this.setState({currentPage: 'login'});
                localStorage.removeItem('apiKey'); // Clear stored API key if session check fails
            });
    };


    handleLogin = (username, password) => {
        return fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({username, password}),
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
        this.setState({user: null, currentPage: 'login'});

        // Remove the stored API key or token from local storage
        localStorage.removeItem('apiKey');
    };

    navigateTo = (page) => {
        this.setState({currentPage: page});
    };

    // Function to handle user click on the Signup button
    onSignupClick = () => {
        this.setState({currentPage: 'signup'});
        // For a more advanced setup, you might navigate to a signup route using React Router
    };

    // Function to handle user click on the Create Room button
    onCreateRoomClick = () => {
        // Check if the user is not null (meaning, the user is logged in)
        if (this.state.user) {
            // Here you might implement the logic to show a room creation form
            // Or directly create a room if no additional information is needed from the user
            this.createRoom(); // Assume this is a method to create a room
        } else {
            alert('You must be logged in to create a room.');
            // Optionally, redirect the user to the login page
            this.setState({currentPage: 'login'});
        }
    };

    // Placeholder for a method to create a room
    createRoom = () => {
        // Assuming an API call to create a room, then fetch rooms list again
        fetch('/api/channel', {
            method: 'POST',
            headers: {
                'Authorization': `${this.state.user.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({name: 'New Room'}), // Example payload
        })
            .then(response => response.json())
            .then(data => {
                console.log('Room created:', data);
                // Optionally, fetch the updated list of rooms here
                this.fetchRooms();
            })
            .catch(error => {
                console.error('Error creating room:', error);
            });
    };

    fetchRooms = () => {
        fetch('/api/channel', {
            method: 'GET',
            headers: {
                'Authorization': `${this.state.user ? this.state.user.apiKey : ''}`,
                'Content-Type': 'application/json',
            },
        })
            .then(response => {
                if (!response.ok) {
                    // Handle HTTP errors
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                this.setState({rooms: data}); // Assuming the API response is the array of rooms
            })
            .catch(error => {
                console.error('Error fetching rooms:', error);
                // Handle fetch error (e.g., network error, authorization failure)
            });
    }

    renderPage() {
        const {currentPage, user, channels} = this.state;

        switch (currentPage) {
            case 'splash':
                return (
                    <SplashScreen
                        user={user}
                        channels={channels}
                        onLoginClick={() => this.setState({currentPage: 'login'})}
                        onSignupClick={() => this.setState({currentPage: 'signup'})}
                        onCreateRoomClick={this.onCreateRoomClick}
                    />
                );

            case 'login':
                return (
                    <LoginForm
                        handleLogin={this.handleLogin}
                        onSignupClick={() => this.setState({currentPage: 'signup'})}
                    />
                );

            case 'signup':
                // Assuming you have a SignupForm component
                return (
                    <SignupForm
                        handleSignup={this.handleSignup}
                        onLoginClick={() => this.setState({currentPage: 'login'})}
                    />
                );

            case 'profile':
                return (
                    <Profile
                        user={user}
                        handleLogout={this.handleLogout}
                    />
                );

            case 'createRoom':
                // Assuming you have a CreateRoom component or method
                // This case could be handled within the SplashScreen or a dedicated page
                return (
                    <div>Create Room Page (to be implemented)</div>
                );

            default:
                // Optionally handle unknown pages
                return <NotFoundPage/>;
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
function SplashScreen({user, rooms, onLoginClick, onSignupClick, onCreateRoomClick}) {
    return (
        <div className="splash container">
            <div className="splashHeader">
                <div className="loginHeader">
                    {user ? (
                        <div className="loggedIn">
                            <a className="welcomeBack">
                                <span className="username">Welcome back, {user.username}!</span>
                                <span className="material-symbols-outlined md-18">person</span>
                            </a>
                        </div>
                    ) : (
                        <div className="loggedOut">
                            <a onClick={onLoginClick}>Login</a>
                        </div>
                    )}
                </div>
            </div>

            <div className="hero">
                <div className="logo">
                    <img id="tv" src="/static/tv.jpeg" alt="TV"/>
                    <img id="popcorn" src="/static/popcorn.png" alt="Popcorn"/>
                </div>
                <h1>Watch Party</h1>
                <h2>2</h2>
                {user ? (
                    <button className="create" onClick={onCreateRoomClick}>Create a Room</button>
                ) : (
                    <button className="signup" onClick={onSignupClick}>Signup</button>
                )}
            </div>

            <h2>Rooms</h2>
            <div className="rooms">
                {rooms && rooms.length > 0 ? (
                    <div className="roomList">
                        {rooms.map((room, index) => (
                            <div key={index}>{room.name}</div>
                        ))}
                    </div>
                ) : (
                    <div className="noRooms">No rooms yet! You get to be first!</div>
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
        const {name, value} = event.target;
        this.setState({[name]: value});
    };

    handleSubmit = (event) => {
        event.preventDefault();
        const {username, password} = this.state;

        this.props.handleLogin(username, password)
            .then(success => {
                if (!success) {
                    this.setState({errorMessage: 'Oops, that username and password don\'t match any of our users!'});
                }
            })
            .catch(error => {
                this.setState({errorMessage: 'An error occurred. Please try again.'});
            });
    };

    render() {
        const {username, password, errorMessage} = this.state;

        return (
            <div className="login"> {/* This div is shown only on "/login" route */}
                <div className="header">
                    <h2><a href=" ">Watch Party</a></h2>
                    <h4>2</h4>
                </div>
                <div className="clip">
                    <div className="auth container">
                        <h3>Enter your username and password to log in:</h3>
                        <form onSubmit={this.handleSubmit} className="alignedForm login">
                            <label htmlFor="username">Username</label>
                            <input
                                type="text"
                                name="username"
                                value={username}
                                onChange={this.handleInputChange}
                                required
                            />
                            <div></div>
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                name="password"
                                value={password}
                                onChange={this.handleInputChange}
                                required
                            />
                            <button type="submit">Login</button>
                        </form>
                        {errorMessage && (
                            <div className="failed"> {/* Show this div only on failed login attempts */}
                                <div className="message">
                                    {errorMessage}
                                </div>
                                <button type="button" onClick={this.props.onNavigateSignup}>Create a new Account
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
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
        const {user} = this.props;

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
            .then(data => this.setState({messages: data}))
            .catch(error => console.error('Error fetching messages:', error));
    };

    handleInputChange = (event) => {
        this.setState({newMessage: event.target.value});
    };

    handleSubmit = (event) => {
        event.preventDefault();
        const {newMessage} = this.state;
        const {channelId} = this.props;

        // Replace with your API call to post a new message
        fetch(`/api/channel/${channelId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.props.user.apiKey}`, // Assuming you use API keys for authorization
            },
            body: JSON.stringify({body: newMessage}),
        })
            .then(response => {
                if (response.ok) {
                    this.setState({newMessage: ''}); // Clear input after sending
                    this.fetchMessages(); // Fetch messages again to show the new one
                } else {
                    console.error('Failed to send message');
                }
            })
            .catch(error => console.error('Error posting message:', error));
    };

    render() {
        const {messages, newMessage} = this.state;

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

// TODO: NOT found page
function NotFoundPage() {
    return (
        <div className="notFound">
            <div className="header">
                <h2><a href="/">Watch Party</a></h2>
                <h4>2</h4>
            </div>
            <div className="clip">
                <div className="container">
                    <h1>404</h1>
                    <div className="message">
                        <h2>Oops, we can't find that page!</h2>
                        <a href="/">Let's go home and try again.</a>
                    </div>
                </div>
            </div>
        </div>
    );
}

const rootContainer = document.getElementById("root");
const root = ReactDOM.createRoot(rootContainer);
root.render(<App/>);