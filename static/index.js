const {
    BrowserRouter,
    Switch,
    Route,
    Link,
    useHistory,
    useParams
} = ReactRouterDOM;

// TODO: ------------------------ App Component -------------------------------
function App() {
    const [user, setUser] = React.useState(null);

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
                    throw new Error('Login failed');
                }
                return response.json();
            })
            .then(data => {
                console.log("data", data)
                setUser({
                    id: data.id,
                    username: data.username,
                    apiKey: data.api_key
                });
                console.log("user", user);
                localStorage.setItem('api_key', data.api_key);
                return true;
            })
            .catch(error => {
                console.error('Error during login:', error);
                return false;
            });
    };

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
                        <ChatChannel/>
                    </Route>
                    <Route exact path="/">
                        <SplashScreen user={user} setUser={setUser}/>
                    </Route>
                    <Route path="*">
                        <div>Page not found</div>
                    </Route>
                </Switch>
            </div>
        </BrowserRouter>
    );
}


// TODO: ------------------------ Splash Component -------------------------------
function SplashScreen(props) {
    const [rooms, setRooms] = React.useState([]);
    const [unreadCounts, setUnreadCounts] = React.useState({});
    const [isLoading, setIsLoading] = React.useState(true);
    const apiKey = localStorage.getItem('api_key');
    const history = useHistory();
    console.log("props", props);

    const handleSignup = () => {
        fetch('/api/signup', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Signup failed');
                }
                return response.json();
            })
            .then(data => {
                console.log("New user data:", data);
                localStorage.setItem('api_key', data.api_key);
                props.setUser({id: data.id, username: data.username, apiKey: data.api_key});
                history.push('/profile');
            })
            .catch(error => {
                console.error('Error during signup:', error);
            });
    };

    const handleCreateRoom = () => {
        fetch('/api/channel', {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to create a new room');
                }
                return response.json();
            })
            .then(newRoom => {
                history.push(`/channel/${newRoom.id}`);
                // Add the new room to the existing list of rooms
                setRooms(prevRooms => [...prevRooms, newRoom]);

            })
            .catch(error => {
                console.error('Error creating a new room:', error);
            });
    };


    function fetchUserInfo() {
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
                    props.setUser({
                        id: userData.id,
                        username: userData.username,
                    });
                })
                .catch(error => {
                    console.error('Error fetching user data:', error);
                });
        }
    }

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

    const fetchUnreadMessageCounts = () => {
        fetch('/api/user/unread-messages', {
            method: 'GET',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
        })
            .then((response) => response.json())
            .then((data) => {
                const counts = data.reduce((acc, curr) => {
                    acc[curr.channel_id] = curr.unread_count;
                    return acc;
                }, {});
                setUnreadCounts(counts);
            })
            .catch((error) => console.error('Failed to fetch unread messages count:', error));
    };

    React.useEffect(() => {
        fetchRooms();
        fetchUserInfo();
        fetchUnreadMessageCounts();
        const counts_interval = setInterval(fetchUnreadMessageCounts, 1000);
        return () => clearInterval(counts_interval);
    }, []); // The empty array ensures this effect runs only once after the initial render

    const handleLoginClick = () => {
        history.push('/login');
    };

    const handleProfileClick = () => {
        history.push('/profile');
    }

    function navigateToChannel(channelId) {
        history.push(`/channel/${channelId}`);
    }

    return (
        <div className="splash container">
            <div className="splashHeader">
                <div className="loginHeader">
                    {props.user ? (
                        <div className="loggedIn" onClick={handleProfileClick}>
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
                <h1>Belay</h1>
                {props.user ? (
                    <button className="create" onClick={handleCreateRoom}>Create a Room</button>
                ) : (
                    <button className="signup" onClick={handleSignup}>Signup</button>
                )}
            </div>

            <h2>Channels</h2>
            <div className="channels">
                {!isLoading && rooms.length > 0 ? (
                    <div className="channelList">
                        {rooms.map((room) => (
                            <button key={room.id} onClick={() => navigateToChannel(room.id)}>
                                {room.name}
                                {unreadCounts[room.id] !== 0 && <strong>({unreadCounts[room.id]} unread messages)</strong>}
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


// TODO: ------------------------ Login Component -------------------------------
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

    const goToSplash = () => {
        history.push('/');
    }

    return (
        <div className="login">
            <div className="header">
                <h2><a onClick={goToSplash}>Belay</a></h2>
                <h4>Login Page</h4>
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


// TODO: ------------------------ Profile Component -------------------------------
function Profile({user, setUser}) {
    const history = useHistory();

    const [username, setUsername] = React.useState(user ? user.username : '');
    const [password, setPassword] = React.useState('');
    const [repeatPassword, setRepeatPassword] = React.useState('');
    const [error, setError] = React.useState('');

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('api_key');
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
            body: JSON.stringify({name: username})
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update username');
                }
                return response.json();
            })
            .then(updatedUser => {
                console.log('Username updated to', updatedUser.username);
                setUser(updatedUser);
                setUsername(updatedUser.username);
                alert("Username has been updated!");
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
            body: JSON.stringify({password: password})
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update password');
                }
                console.log('Password updated successfully');
                setPassword('');
                setRepeatPassword('');
                alert("Password has been updated!");
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
                    setPassword(userData.password);
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
                <h2><a className="go_to_splash_page" onClick={goToSplash}>Belay</a></h2>
                <h4>Profile Page</h4>
            </div>
            <div className="clip">
                <div className="auth container">
                    <h2>Welcome to Belay!</h2>
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


// TODO: ------------------------ Channel Component -------------------------------
function ChatChannel() {
    const {id} = useParams();
    const history = useHistory();
    const [room, setRoom] = React.useState({name: ''}); // State to hold room details
    const [isEditing, setIsEditing] = React.useState(false); // State to toggle edit mode
    const [newRoomName, setNewRoomName] = React.useState(''); // State for the new room name input
    const [messages, setMessages] = React.useState([]); // State to hold messages
    const [newMessage, setNewMessage] = React.useState(''); // State for the new message input
    const [repliesCount, setRepliesCount] = React.useState({});
    const [selectedMessageId, setSelectedMessageId] = React.useState(null);
    const [replies, setReplies] = React.useState([]);
    const [replyInput, setReplyInput] = React.useState({});

    const fetchRepliesForMessage = (messageId) => {
        const apiKey = localStorage.getItem('api_key');
        fetch(`/api/message/${messageId}/reply`, {
            method: 'GET',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
        })
            .then(response => response.json())
            .then(data => {
                console.log(data);
                setReplies(data);
            })
            .catch(error => console.error("Failed to fetch replies:", error));
    };

    const handleShowReplies = (messageId) => {
        setSelectedMessageId(messageId);
        fetchRepliesForMessage(messageId);
    };

    const handlePostReply = (event, messageId) => {
        event.preventDefault(); // Prevent the default form submission behavior
        const apiKey = localStorage.getItem('api_key');
        const replyBody = replyInput[messageId];

        if (!replyBody) {
            alert('Reply cannot be empty');
            return;
        }

        fetch(`/api/message/${messageId}/reply`, {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({body: replyBody}),
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to post reply');
                }
                return response.json();
            })
            .then(() => {
                console.log('Reply posted successfully');
                setReplyInput(prev => ({...prev, [messageId]: ''}));
                fetchRepliesForMessage(messageId); // Refresh the replies to include the new one
            })
            .catch(error => console.error('Failed to post reply:', error));
    };

    const updateLastViewed = () => {
        const apiKey = localStorage.getItem('api_key');
        fetch(`/api/channel/${id}/messages`, {
            method: 'GET',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
        })
        .then(response => response.json())
        .then(data => {
            setMessages(data);
            if (data.length > 0) {
                const lastMessageId = data[data.length - 1].id;
                // Update last viewed message
                fetch(`/api/channel/${id}/last-viewed`, {
                    method: 'POST',
                    headers: {
                        'Authorization': apiKey,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ last_message_id_seen: lastMessageId }),
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to update last viewed message');
                    }
                    return response.json();
                })
                .then(() => console.log('Last viewed message updated successfully'))
                .catch(error => console.error('Failed to update last viewed message:', error));
            }
        })
        .catch(error => console.error("Failed to fetch messages:", error));
    };

    const handleEditClick = () => {
        setIsEditing(true);
    };

    const fetchRepliesCount = () => {
        const apiKey = localStorage.getItem('api_key');
        fetch(`/api/channel/${id}/count-replies`, {
            method: 'GET',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
        })
            .then(response => response.json())
            .then(data => {
                const repliesMap = data.reduce((acc, item) => {
                    acc[item.message_id] = item.reply_count;
                    return acc;
                }, {});
                setRepliesCount(repliesMap);
            })
            .catch(error => console.error("Failed to fetch replies count:", error));
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
                setNewRoomName(data.name);
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
        .then(messagesData => {
            console.log("Fetched messages: ", messagesData);

            // Fetch reactions for each message
            const fetchReactionsPromises = messagesData.map(message =>
                fetch(`/api/message/${message.id}/reaction`, {
                    method: 'GET',
                    headers: {
                        'Authorization': localStorage.getItem('api_key'),
                        'Content-Type': 'application/json'
                    }
                }).then(response => response.json())
            );

            // Wait for all reactions to be fetched
            Promise.all(fetchReactionsPromises).then(reactionsData => {
                const messagesWithReactions = messagesData.map((message, index) => ({
                    ...message,
                    reactions: reactionsData[index]
                }));

                setMessages(messagesWithReactions);
            });
        })
        .catch(error => console.error("Failed to fetch messages:", error));
    };


    React.useEffect(() => {
        fetch_room_detail();
        fetch_messages();
        updateLastViewed();
        const message_interval = setInterval(() => {
            fetch_messages();
            fetchRepliesCount();
        }, 500);
        return () => clearInterval(message_interval);
    }, [id]); // Re-run the effect if the room ID changes

    const handleUpdateRoomName = () => {
        fetch(`/api/channel/${id}`, {
            method: 'POST',
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
        fetch(`/api/channel/${id}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': localStorage.getItem('api_key'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({body: newMessage}),
        })
            .then(() => {
                setMessages([...messages, {body: newMessage}]);
                setNewMessage(''); // Clear input field
                updateLastViewed();
            })
            .catch(error => console.error("Failed to post message:", error));
    };
    const handleAddReaction = (messageId, emoji) => {
        const apiKey = localStorage.getItem('api_key');
        fetch(`/api/message/${messageId}/reaction`, {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({emoji}),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to add reaction');
            }
            return response.json();
        })
        .then(data => {
            if (data.message === "Reaction already exists") {
                alert("You have already added this emoji :)");
            }
        })
        .catch(error => console.error('Error adding reaction:', error));
    };

    const goToSplash = () => {
        history.push('/');
    };

    return (
        <div className="channel">
            <div className="header">
                <h2><a className="go_to_splash_page" onClick={goToSplash}>Belay</a></h2>
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

                        <div className="messages">
                            {messages.map((message, index) => (
                                <div key={index} className="message">
                                    <div className="author">{message.name}</div>
                                    <div className="content">{message.body}</div>

                                    {message.reactions && message.reactions.length > 0 && (
                                        <div className="reactions">
                                            {message.reactions.map((reaction, index) => (
                                                <span key={index} className="reaction"
                                                    onMouseEnter={(e) => {
                                                        // Show tooltip
                                                        e.currentTarget.querySelector('.users').classList.add('show');
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        // Hide tooltip
                                                        e.currentTarget.querySelector('.users').classList.remove('show');
                                                    }}>
                                                    {reaction.emoji} {reaction.users.split(',').length}&nbsp;
                                                    <span className="users">
                                                        {reaction.users}
                                                    </span>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="message-reactions">
                                        {['😀', '❤️', '👍'].map(emoji => (
                                            <button key={emoji}
                                                    onClick={() => handleAddReaction(message.id, emoji)}>{emoji}</button>
                                        ))}
                                    </div>

                                    {repliesCount[message.id] > 0 && (
                                        <button onClick={() => handleShowReplies(message.id)}>
                                            Replies: {repliesCount[message.id]}
                                        </button>
                                    )}
                                    <button onClick={() => handleShowReplies(message.id)}>Reply!</button>
                                </div>
                            ))}
                        </div>

                        {selectedMessageId && (
                            <div className="replies">
                                <h3>Replies</h3>
                                {replies.length > 0 ? (
                                    replies.map((reply, index) => (
                                        <div key={index} className="reply">
                                            <div><strong>{reply.name}</strong>: {reply.body}</div>
                                        </div>
                                    ))
                                ) : (
                                    <p>No replies yet.</p>
                                )}
                                <div className="comment_box">
                                    <label htmlFor="comment">What do you want to reply?</label>
                                    <textarea
                                        name="comment"
                                        value={replyInput[selectedMessageId] || ''}
                                        onChange={(e) => setReplyInput({
                                            ...replyInput,
                                            [selectedMessageId]: e.target.value
                                        })}
                                    ></textarea>
                                    <button onClick={(e) => handlePostReply(e, selectedMessageId)}
                                            className="post_room_messages">Post
                                    </button>
                                </div>
                            </div>
                        )}

                        {!selectedMessageId && (<div></div>)}
                        <div className="comment_box">
                            <label htmlFor="comment">What do you want to say?</label>
                            <textarea name="comment" value={newMessage}
                                      onChange={(e) => setNewMessage(e.target.value)}></textarea>
                            <button onClick={handlePostMessage} className="post_room_messages">Post</button>
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

// Render the App component
const rootContainer = document.getElementById('root');
const root = ReactDOM.createRoot(rootContainer);
root.render(<App/>);
