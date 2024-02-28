const {
    BrowserRouter,
    Switch,
    Route,
    Link,
    useHistory,
} = ReactRouterDOM;

// Refactor App component to use BrowserRouter and Route
function App() {
    const [user, setUser] = React.useState(null);
    const [apikey, setapikey] = React.useState(localStorage.getItem('api_key'));
    const [channels, setChannels] = React.useState([]);

    const handleLogin = (username, password) => {
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
                console.log("data", data)
                // Assuming the API returns a user object with an api_key on successful login
                setUser({
                    id: data.id,
                    username: data.username,
                    apiKey: data.api_key
                });

                console.log("user", user);

                // Store the api_key in localStorage or another secure place for future requests
                localStorage.setItem('api_key', data.api_key);
                setapikey(localStorage.getItem('api_key'))
                // Navigate to the splash page or another appropriate page upon login
                // This can be done using the useHistory hook if this logic is inside a component or withRouter HOC
                // For example: history.push('/');

                return true; // Indicate success
            })
            .catch(error => {
                console.error('Error during login:', error);
                // Optionally handle login failure (e.g., by showing an error message) here
                return false; // Indicate failure
            });
    };


    // Placeholder function for user logout
    const handleLogout = () => {
        setUser(null);
        // Redirect to login page using useHistory hook in a component or withRouter HOC
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        // Use props.onLogin, not props.handleLogin
        props.onLogin(username, password)
            .then(success => {
                if (!success) {
                    setErrorMessage('Login error message');
                }
            })
            .catch(error => {
                console.error('Error during login:', error);
                setErrorMessage('An error occurred. Please try again.');
            });
    };


    // Placeholder function for fetching chat channels
    const fetchChannels = async () => {
        // Implement logic to fetch channels
        // Update channels state with the fetched data
    };

    React.useEffect(() => {
        const apiKey = localStorage.getItem('api_key');
        console.log("apikey in App useEffect", apiKey);
        if (apiKey) {
            fetch('/api/profile', {
                method: 'GET',
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json',
                },
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to fetch user data');
                    }
                    return response.json();
                })
                .then(userData => {
                    setUser({
                        id: userData.id,
                        username: userData.username,
                        // Include any other user fields you need
                    });
                })
                .catch(error => {
                    console.error('Error fetching user data:', error);
                    // Handle error, e.g., by clearing localStorage if the API key is invalid
                });
        }
    }, []);


    return (
        <BrowserRouter>
            <div>
                <Switch>
                    <Route path="/login">
                        <LoginForm handleLogin={handleLogin}/>
                    </Route>
                    <Route path="/profile">
                        <Profile user={user} setUser={setUser}/>
                    </Route>
                    <Route path="/channel/:id">
                        <ChatChannel user={user} apiKey={apikey}/>
                    </Route>
                    <Route exact path="/">
                        <SplashScreen user={user} apikey={apikey}/>
                    </Route>
                    <Route path="*">
                        <div>Page not found</div>
                    </Route>
                </Switch>
            </div>
        </BrowserRouter>
    );
}

// Refactor other components as needed to work with react-router-dom

// SplashScreen component changes
function SplashScreen(props) {
    const [rooms, setRooms] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const apiKey = localStorage.getItem('api_key');
    const history = useHistory();
    console.log("props", props);
    const handleLoginClick = () => {
        history.push('/login');
    };

    const onSignupClick = () => {
        history.push('/profile');
        // TODO
    };

    const onProfileClick = () => {
        history.push('/profile');
    }

    React.useEffect(() => {
        fetchRooms();
    }, []); // The empty array ensures this effect runs only once after the initial render

    function fetchRooms() {

        console.log("splashScreen apiKey", apiKey);
        if (!apiKey) {
            console.error("API key not found.");
            setIsLoading(false);
            return;
        }

        fetch('/api/channel', {
            method: 'GET',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                setRooms(data);
                setIsLoading(false);
            })
            .catch(error => {
                console.error('There has been a problem with your fetch operation:', error);
                setIsLoading(false);
            });
    }

    function navigateToChannel(channelId) {
        history.push(`/channel/${channelId}`);
    }

    return (
        <div className="splash container">
            <div className="splashHeader">
                <div className="loginHeader">
                    {props.user ? (
                        <div className="loggedIn" onClick={onProfileClick}>
                            <span className="username">Welcome back, {props.user.username}!</span>
                            <span className="material-symbols-outlined md-18">person</span>
                        </div>
                    ) : (
                        <button onClick={handleLoginClick}>Login</button>
                    )}
                </div>
            </div>

            <div className="hero">
                <div className="logo">
                    <img id="tv" src="/static/tv.jpeg" alt="TV"/>
                    <img id="popcorn" src="/static/popcorn.png" alt="Popcorn"/>
                </div>
                <h1>Slack</h1>
                {props.user ? (
                    <button className="create" onClick={props.onCreateRoomClick}>Create a Room</button>
                ) : (
                    <button className="signup" onClick={onSignupClick}>Signup</button>
                )}
            </div>

            <h2>Rooms</h2>
            <div className="rooms">
                {!isLoading && rooms.length > 0 ? (
                    <div className="roomList">
                        {rooms.map((room) => (
                            <button key={room.id} onClick={() => navigateToChannel(room.id)}>
                                {room.name}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="noRooms">No rooms yet! You get to be first!</div>
                )}
            </div>
        </div>
    );
}


// LoginForm component changes
function LoginForm(props) {
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [errorMessage, setErrorMessage] = React.useState('');
    const history = useHistory();

    const handleInputChange = (event) => {
        const {name, value} = event.target;
        if (name === 'username') {
            setUsername(value);
        } else if (name === 'password') {
            setPassword(value);
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        props.handleLogin(username, password)
            .then(success => {
                if (!success) {
                    setErrorMessage('Oops, that username and password don\'t match any of our users!');
                } else {
                    history.push('/');
                    console.log("login successfully")
                }
            })
            .catch(error => {
                console.error('Login error:', error);
                setErrorMessage('An error occurred. Please try again.');
            });
    };

    return (
        <div className="login">
            <div className="header">
                <h2><a href="#">Watch Party</a></h2>
                <h4>2</h4>
            </div>
            <div className="clip">
                <div className="auth container">
                    <h3>Enter your username and password to log in:</h3>
                    <form onSubmit={handleSubmit} className="alignedForm login">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            name="username"
                            value={username}
                            onChange={handleInputChange}
                            required
                        />
                        <div></div>
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            name="password"
                            value={password}
                            onChange={handleInputChange}
                            required
                        />
                        <button type="submit">Login</button>
                    </form>
                    <div className="failed">
                        <button type="button" onClick={props.onSignupClick}>Create a new Account</button>
                    </div>

                    {errorMessage && (
                        <div className="failed">
                            <div className="message">
                                {errorMessage}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


function Profile({user, setUser}) {
    const history = useHistory();

    // Assuming useState hook is used for form fields
    const [username, setUsername] = React.useState(user ? user.username : '');
    const [password, setPassword] = React.useState('');
    const [repeatPassword, setRepeatPassword] = React.useState('');
    const [error, setError] = React.useState('');

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('api_key'); // Ensure key matches what's used elsewhere
        history.push("/login");
    };

    const handleUpdateUsername = () => {
        const apiKey = localStorage.getItem('api_key');
        fetch('/api/profile', {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({name: username}) // Assuming the API expects the new username under the key 'name'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update username');
                }
                return response.json();
            })
            .then(updatedUser => {
                console.log('Username updated to', updatedUser.username);
                setUser(updatedUser); // Update the user state with the new user information
                setUsername(updatedUser.username); // Update the username state to reflect the change
            })
            .catch(error => {
                console.error('Error updating username:', error);
                setError('Failed to update username');
            });
    };

    const handleUpdatePassword = () => {
        if (password !== repeatPassword) {
            setError("Passwords don't match");
            return;
        }
        const apiKey = localStorage.getItem('api_key');
        fetch('/api/profile', {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({password: password}) // Assuming the API expects the new password under the key 'password'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update password');
                }
                console.log('Password updated successfully');
                // Optionally, clear the password fields after successful update
                setPassword('');
                setRepeatPassword('');
            })
            .catch(error => {
                console.error('Error updating password:', error);
                setError('Failed to update password');
            });
    };


    const goToSplash = () => {
        history.push('/');
    };

    React.useEffect(() => {
        const apiKey = localStorage.getItem('api_key');
        if (!apiKey) {
            history.push('/login');
        } else {
            fetch('/api/profile', {
                method: 'GET',
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json',
                },
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to fetch user data');
                    }
                    return response.json();
                })
                .then(userData => {
                    setUsername(userData.username);
                    setPassword(userData.password); // Note: Storing and displaying passwords in the client-side is not recommended
                    setRepeatPassword(userData.password);
                })
                .catch(error => {
                    console.error('Error fetching user data:', error);
                });
        }
    }, [history]);

    return (
        <div className="profile">
            <div className="header">
                <h2><a className="go_to_splash_page" onClick={goToSplash}>Slack</a></h2>
                <h4>Profile Page</h4>
            </div>
            <div className="clip">
                <div className="auth container">
                    <h2>Welcome to Watch Party!</h2>
                    <div className="alignedForm">
                        <label htmlFor="username">Username: </label>
                        <input name="username" value={username} onChange={(e) => setUsername(e.target.value)}/>
                        <button className="update_name" onClick={handleUpdateUsername}>update</button>

                        <label htmlFor="password">Password: </label>
                        <input type="password" name="password" value={password}
                               onChange={(e) => setPassword(e.target.value)}/>
                        <button className="update_password" onClick={handleUpdatePassword}>update</button>

                        <label htmlFor="repeatPassword">Repeat: </label>
                        <input type="password" name="repeatPassword" value={repeatPassword}
                               onChange={(e) => setRepeatPassword(e.target.value)}/>
                        {error && <div className="error">{error}</div>}

                        <button className="exit goToSplash" onClick={goToSplash}>Cool, let's go!</button>
                        <button className="exit logout" onClick={handleLogout}>Log out</button>
                    </div>
                </div>
            </div>
        </div>
    );
}


// ChatChannel component changes
// Extract channelId from URL params using useParams hook
function ChatChannel() {
    const {id} = ReactRouterDOM.useParams(); // Get the channel ID from the URL
    const history = useHistory();
    const [room, setRoom] = React.useState({name: ''}); // State to hold room details
    const [isEditing, setIsEditing] = React.useState(false); // State to toggle edit mode
    const [newRoomName, setNewRoomName] = React.useState(''); // State for the new room name input
    const [messages, setMessages] = React.useState([]); // State to hold messages
    const [newMessage, setNewMessage] = React.useState(''); // State for the new message input
    const [userName, setUserName] = React.useState({name: ''});

    const handleEditClick = () => {
        setIsEditing(true); // Enable edit mode
    };

    const fetch_room_detail =() => {
        fetch(`/api/channel/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': localStorage.getItem('api_key'),
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                setRoom({name: data.name});
                setNewRoomName(data.name); // Pre-fill with current room name
            })
            .catch(error => console.error("Failed to fetch room details:", error));
    }

    const fetch_messages = () => {
         fetch(`/api/channel/${id}/messages`, {
            method: 'GET',
            headers: {
                'Authorization': localStorage.getItem('api_key'),
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                console.log("Fetched messages: ", data); // Log the fetched data for debugging
                setMessages(data);
            })
            .catch(error => console.error("Failed to fetch messages:", error));
    }

    React.useEffect(() => {
        // Fetch room details
        fetch_room_detail();
        fetch_messages();
        // const room_interval = setInterval(fetch_room_detail, 500);
        const message_interval = setInterval(fetch_messages, 500);

        return () => clearInterval(message_interval);

    }, [id]); // Re-run the effect if the room ID changes

    const handleUpdateRoomName = () => {
        // API call to update the room name
        fetch(`/api/channel/${id}`, {
            method: 'POST', // Or 'PUT', depending on your API
            headers: {
                'Authorization': localStorage.getItem('api_key'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({name: newRoomName}),
        })
            .then(() => {
                setRoom({name: newRoomName});
                setIsEditing(false);
            })
            .catch(error => console.error("Failed to update room name:", error));
    };

    const handlePostMessage = (event) => {
        event.preventDefault(); // Prevent form submission from reloading the page
        // API call to post a new message
        fetch(`/api/channel/${id}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': localStorage.getItem('api_key'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({body: newMessage}),
        })
            .then(() => {
                setMessages([...messages, {body: newMessage}]); // Optimistically update the UI
                setNewMessage(''); // Clear input field
            })
            .catch(error => console.error("Failed to post message:", error));
    };

    const goToSplash = () => {
        history.push('/');
    };

    return (
        <div className="channel">
            <div className="header">
                <h2><a className="go_to_splash_page" onClick={goToSplash}>Watch Party</a ></h2>
                <h4>2</h4>
                <div className="channelDetail">
                    {!isEditing && room ? (
                        <div className="displayRoomName">
                            <h3 className="curr_room_name">
                                Chatting in <strong>{room.name}</strong>
                                <a onClick={handleEditClick}><span
                                    className="material-symbols-outlined md-18">edit</span></a >
                            </h3>
                        </div>
                    ) : (
                        <div className="editRoomName">
                            <h3>
                                Chatting in <input value={newRoomName}
                                                   onChange={(e) => setNewRoomName(e.target.value)}/>
                                <button onClick={handleUpdateRoomName}>Update</button>
                            </h3>
                        </div>
                    )}
                    Invite users to this chat at:
                    <a href={`/channel/${id}`}>/channel/{id}</a>
                </div>
            </div>

            <div className="clip">
                <div className="container">
                    <div className="chat">
                        <div className="comment_box">
                            <label htmlFor="comment">What do you have to say?</label>
                            <textarea name="comment" value={newMessage}
                                      onChange={(e) => setNewMessage(e.target.value)}></textarea>
                            <button onClick={handlePostMessage} className="post_room_messages">Post</button>
                        </div>
                        <div className="messages">
                            {messages.map((message, index) => (
                                <div key={index} className="message">
                                    <div className="author">{message.name} : </div>
                                    <div className="content">{message.body}</div>
                                    <div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {!messages.length && (
                        <div className="noMessages">
                            <h2>Oops, we can't find that room!</h2>
                            <p><a onClick={goToSplash}>Let's go home and try again.</a ></p >
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Render your App component as before
const rootContainer = document.getElementById('root');
const root = ReactDOM.createRoot(rootContainer);
root.render(<App/>);
