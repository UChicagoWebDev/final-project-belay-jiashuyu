const {
    BrowserRouter,
    Switch,
    Route,
    useHistory,
    useParams
} = ReactRouterDOM;


// TODO: --------------------------------------------- App Component ---------------------------------------------
function App() {
    const apiKey = localStorage.getItem('shuyuj_belay_auth_key');

    const [user, setUser] = React.useState(null); // State to hold current user info
    const [channels, setChannels] = React.useState([]); // State to hold current channel list
    const [unreadCounts, setUnreadCounts] = React.useState({}); // State to hold unread counts for each channel
    const [channel, setChannel] = React.useState({name: ''}); // State to hold channel details
    const [isEditing, setIsEditing] = React.useState(false); // State to toggle edit mode
    const [newChannelName, setNewChannelName] = React.useState(''); // State for the new channel name input
    const [messages, setMessages] = React.useState([]); // State to hold messages
    const [newMessage, setNewMessage] = React.useState(''); // State for the new message input
    const [repliesCount, setRepliesCount] = React.useState({}); // State for the reply counts
    const [selectedMessageId, setSelectedMessageId] = React.useState(null); // State for the selected message id
    const [selectedMessage, setSelectedMessage] = React.useState(null); // State for the selected message
    const [replies, setReplies] = React.useState([]); // State to hold replies
    const [replyInput, setReplyInput] = React.useState({}); // State for the new reply input

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
                setUser({
                    id: data.id,
                    username: data.username,
                    apiKey: data.api_key
                });
                localStorage.setItem('shuyuj_belay_auth_key', data.api_key);
                return true;
            })
            .catch(error => {
                console.error('Error during login:', error);
                return false;
            });
    };

    function fetchChannelList() {
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
                setChannels(data);
            })
            .catch(error => {
                console.error('There has been a problem with your fetch operation:', error);
            });
    }

    const fetchUnreadMessageCounts = () => {
        if (apiKey) {
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
        }
    };

    const updateLastViewed = (id) => {
        fetch(`/api/channel/${id}/messages`, {
            method: 'GET',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
        })
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    const lastMessageId = data[data.length - 1].id;
                    // Update last viewed message
                    fetch(`/api/channel/${id}/last-viewed`, {
                        method: 'POST',
                        headers: {
                            'Authorization': apiKey,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({last_message_id_seen: lastMessageId}),
                    })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Failed to update last viewed message');
                            }
                            return response.json();
                        })
                        .catch(error => console.error('Failed to update last viewed message:', error));
                }
            })
            .catch(error => console.error("Failed to fetch messages:", error));
    };

    const handleEditClick = () => {
        setIsEditing(true);
    };

    const fetchRepliesCount = (id) => {
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

    const fetchChannelDetail = (id) => {
        fetch(`/api/channel/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                setChannel({name: data.name});
                setNewChannelName(data.name);
            })
            .catch(error => console.error("Failed to fetch channel details:", error));
    }

    const fetchMessagesWithReactions = (id) => {
        fetch(`/api/channel/${id}/messages`, {
            method: 'GET',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(messagesData => {
                // Fetch reactions for each message
                const fetchReactionsPromises = messagesData.map(message =>
                    fetch(`/api/message/${message.id}/reaction`, {
                        method: 'GET',
                        headers: {
                            'Authorization': apiKey,
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

    const fetchParentMessage = (id) => {
        fetch(`/api/message/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(message => {
                setSelectedMessage(message);
            })
            .catch(error => console.error("Failed to fetch messages:", error));
    };

    const handleUpdateChannelName = (id) => {
        fetch(`/api/channel/${id}`, {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({name: newChannelName}),
        })
            .then(() => {
                setChannel({name: newChannelName});
                setIsEditing(false);
            })
            .catch(error => console.error("Failed to update channel name:", error));
    };

    const handlePostMessage = (event, id) => {
        event.preventDefault(); // Prevent form submission from reloading the page
        if (!newMessage) {
            alert('Message cannot be empty');
            return;
        }
        fetch(`/api/channel/${id}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({body: newMessage}),
        })
            .then(() => {
                setMessages([...messages, {body: newMessage}]);
                setNewMessage(''); // Clear input field
                updateLastViewed(id);
            })
            .catch(error => console.error("Failed to post message:", error));
    };

    const handleAddReaction = (messageId, emoji) => {
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

    // Test image url: https://uchicagowebdev.com/examples/week_1/homecoming.jpeg
    const parseImageUrls = (message) => {
        // Check if message is null or undefined
        if (!message) return [];
        const regex = /https?:\/\/\S+\.(jpg|jpeg|png|gif)/gi;
        return message.match(regex) || [];
    };

    const fetchRepliesForMessage = (messageId) => {
        fetch(`/api/message/${messageId}/reply`, {
            method: 'GET',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
        })
            .then(response => response.json())
            .then(messagesData => {
                // Fetch reactions for each reply
                const fetchReactionsPromises = messagesData.map(message =>
                    fetch(`/api/message/${message.id}/reaction`, {
                        method: 'GET',
                        headers: {
                            'Authorization': apiKey,
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

                    setReplies(messagesWithReactions);
                });
            })
            .catch(error => console.error("Failed to fetch replies:", error));
    };

    const handlePostReply = (event, messageId) => {
        event.preventDefault(); // Prevent the default form submission behavior
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
                setReplyInput(prev => ({...prev, [messageId]: ''}));
                fetchRepliesForMessage(messageId); // Refresh the replies to include the new one
            })
            .catch(error => console.error('Failed to post reply:', error));
    };

    return (
        <BrowserRouter>
            <div>
                <Switch>
                    <Route exact path="/">
                        <SplashScreen user={user} setUser={setUser}
                                      channels={channels} setChannels={setChannels}
                                      unreadCounts={unreadCounts} setUnreadCounts={setUnreadCounts}
                                      selectedMessageId={selectedMessageId} setSelectedMessageId={setSelectedMessageId}
                                      fetchChannelList={fetchChannelList}
                                      fetchUnreadMessageCounts={fetchUnreadMessageCounts}/>
                    </Route>
                    <Route path="/login">
                        <LoginForm user={user} setUser={setUser} handleLogin={handleLogin}/>
                    </Route>
                    <Route path="/profile">
                        <Profile user={user} setUser={setUser}/>
                    </Route>
                    <Route exact path="/channel/:id">
                        <ChatChannel user={user} setUser={setUser}
                                     channels={channels} setChannels={setChannels}
                                     unreadCounts={unreadCounts} setUnreadCounts={setUnreadCounts}
                                     channel={channel} setChannel={setChannel}
                                     isEditing={isEditing} setIsEditing={setIsEditing}
                                     newChannelName={newChannelName} setNewChannelName={setNewChannelName}
                                     messages={messages} setMessages={setMessages}
                                     newMessage={newMessage} setNewMessage={setNewMessage}
                                     repliesCount={repliesCount} setRepliesCount={setRepliesCount}
                                     selectedMessageId={selectedMessageId} setSelectedMessageId={setSelectedMessageId}
                                     selectedMessage={selectedMessage} setSelectedMessage={setSelectedMessage}
                                     fetchChannelList={fetchChannelList}
                                     fetchUnreadMessageCounts={fetchUnreadMessageCounts}
                                     updateLastViewed={updateLastViewed}
                                     handleEditClick={handleEditClick}
                                     fetchRepliesCount={fetchRepliesCount}
                                     fetchChannelDetail={fetchChannelDetail}
                                     fetchMessagesWithReactions={fetchMessagesWithReactions}
                                     handleUpdateChannelName={handleUpdateChannelName}
                                     handlePostMessage={handlePostMessage}
                                     handleAddReaction={handleAddReaction}
                                     parseImageUrls={parseImageUrls}/>
                    </Route>
                    <Route exact path="/channel/:id/thread/:msg_id">
                        <Thread user={user} setUser={setUser}
                                channels={channels} setChannels={setChannels}
                                unreadCounts={unreadCounts} setUnreadCounts={setUnreadCounts}
                                channel={channel} setChannel={setChannel}
                                isEditing={isEditing} setIsEditing={setIsEditing}
                                newChannelName={newChannelName} setNewChannelName={setNewChannelName}
                                messages={messages} setMessages={setMessages}
                                newMessage={newMessage} setNewMessage={setNewMessage}
                                repliesCount={repliesCount} setRepliesCount={setRepliesCount}
                                selectedMessageId={selectedMessageId} setSelectedMessageId={setSelectedMessageId}
                                selectedMessage={selectedMessage} setSelectedMessage={setSelectedMessage}
                                replies={replies} setReplies={setReplies}
                                replyInput={replyInput} setReplyInput={setReplyInput}
                                fetchChannelList={fetchChannelList}
                                fetchUnreadMessageCounts={fetchUnreadMessageCounts}
                                updateLastViewed={updateLastViewed}
                                handleEditClick={handleEditClick}
                                fetchRepliesCount={fetchRepliesCount}
                                fetchChannelDetail={fetchChannelDetail}
                                fetchMessagesWithReactions={fetchMessagesWithReactions}
                                fetchParentMessage={fetchParentMessage}
                                handleUpdateChannelName={handleUpdateChannelName}
                                handlePostMessage={handlePostMessage}
                                handleAddReaction={handleAddReaction}
                                parseImageUrls={parseImageUrls}
                                fetchRepliesForMessage={fetchRepliesForMessage}
                                handlePostReply={handlePostReply}/>
                    </Route>
                    <Route path="*">
                        <NotFoundPage/>
                    </Route>
                </Switch>
            </div>
        </BrowserRouter>
    );
}


// TODO: --------------------------------------------- Splash Component ---------------------------------------------
function SplashScreen(props) {
    const apiKey = localStorage.getItem('shuyuj_belay_auth_key');
    const history = useHistory();

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
                localStorage.setItem('shuyuj_belay_auth_key', data.api_key);
                props.setUser({id: data.id, username: data.username, apiKey: data.api_key});
                history.push('/profile');
            })
            .catch(error => {
                console.error('Error during signup:', error);
            });
    };

    const handleCreateChannel = () => {
        fetch('/api/channel', {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to create a new channel');
                }
                return response.json();
            })
            .then(newChannel => {
                history.push(`/channel/${newChannel.id}`);
                // Add the new channel to the existing list of channels
                props.setChannels(prevChannels => [...prevChannels, newChannel]);
                props.setSelectedMessageId(null);
            })
            .catch(error => {
                console.error('Error creating a new channel:', error);
            });
    };

    function fetchUserInfo() {
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

    React.useEffect(() => {
        document.title = "Belay Main Page";
        props.fetchChannelList();
        fetchUserInfo();
        props.fetchUnreadMessageCounts();
        const counts_interval = setInterval(() => {
            props.fetchChannelList();
            props.fetchUnreadMessageCounts();
        }, 200);
        return () => clearInterval(counts_interval);
    }, []); // The empty array ensures this effect runs only once after the initial render

    const handleLoginClick = () => {
        history.push('/login');
    };

    const handleProfileClick = () => {
        history.push('/profile');
    }

    function redirectToChannel(channelId) {
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

            <div className="channels">
                {props.channels.length > 0 ? (
                    <div className="channelList">
                        {props.channels.map((channel) => (
                            <button key={channel.id} onClick={() => redirectToChannel(channel.id)}>
                                {channel.name}
                                {props.unreadCounts[channel.id] !== 0 && props.user &&
                                    <strong>({props.unreadCounts[channel.id]} unread messages)</strong>}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="noChannels">No channels yet! Create the first channel on Belay!</div>
                )}
            </div>

            <div className="hero">
                <div className="logo">
                    <img id="tv" src="/static/tv.jpeg" alt="TV"/>
                    <img id="popcorn" src="/static/popcorn.png" alt="Popcorn"/>
                </div>
                <h1>Belay</h1>
                {props.user ? (
                    <button className="create" onClick={handleCreateChannel}>Create a Channel</button>
                ) : (
                    <button className="signup" onClick={handleSignup}>Signup</button>
                )}
            </div>

        </div>
    );
}


// TODO: --------------------------------------------- Login Component ---------------------------------------------
function LoginForm(props) {
    const history = useHistory();

    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [errorMessage, setErrorMessage] = React.useState('');

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
                localStorage.setItem('shuyuj_belay_auth_key', data.api_key);
                props.setUser({id: data.id, username: data.username, apiKey: data.api_key});
                history.push('/profile');
            })
            .catch(error => {
                console.error('Error during signup:', error);
            });
    };

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
                }
            })
            .catch(error => {
                console.error('Login error:', error);
                setErrorMessage('An error occurred. Please try again.');
            });
    };

    React.useEffect(() => {
        const apiKey = localStorage.getItem('shuyuj_belay_auth_key');
        if (apiKey) {
            history.push('/profile');
        }
        document.title = "Belay Login Page";
    }, []); // The empty array ensures this effect runs only once after the initial render

    return (
        <div className="login">
            <div className="header">
                <h2><a href="/">Belay</a></h2>
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
                        <button type="button" onClick={handleSignup}>Create a new Account</button>
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


// TODO: --------------------------------------------- Profile Component ---------------------------------------------
function Profile(props) {
    const apiKey = localStorage.getItem('shuyuj_belay_auth_key');
    const history = useHistory();

    const [username, setUsername] = React.useState(props.user ? props.user.username : '');
    const [password, setPassword] = React.useState('');
    const [repeatPassword, setRepeatPassword] = React.useState('');
    const [error, setError] = React.useState('');

    const handleLogout = () => {
        props.setUser(null);
        localStorage.removeItem('shuyuj_belay_auth_key');
        history.push("/login");
    };

    const handleUpdateUsername = () => {
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
                props.setUser(updatedUser);
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
        } else {
            setError(null);
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
                    setPassword(password);
                    setRepeatPassword(repeatPassword);
                    alert("Password has been updated!");
                })
                .catch(error => {
                    console.error('Error updating password:', error);
                    setError('Failed to update password');
                });
        }
    };

    const goToSplash = () => {
        history.push('/');
    };

    React.useEffect(() => {
        if (!apiKey) {
            history.push('/login');
        } else {
            document.title = "Belay Profile Page";
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
                <h2><a href="/">Belay</a></h2>
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


// TODO: --------------------------------------------- Channel Component ---------------------------------------------
function ChatChannel(props) {
    const apiKey = localStorage.getItem('shuyuj_belay_auth_key');
    const {id} = useParams();
    const history = useHistory();

    const [view, setView] = React.useState('message'); // set default view as channel messages

    React.useEffect(() => {
        if (!apiKey) {
            history.push('/login');
            alert("Please login before entering to the channels.")
        }
        document.title = `Belay Channel #${id}`;
        props.fetchChannelList();
        props.fetchUnreadMessageCounts();
        props.fetchChannelDetail(id);
        props.fetchMessagesWithReactions(id);
        props.updateLastViewed(id);
        props.fetchRepliesCount(id);
        const message_interval = setInterval(() => {
            props.fetchChannelList();
            props.fetchUnreadMessageCounts();
            props.fetchMessagesWithReactions(id);
            props.updateLastViewed(id);
            props.fetchRepliesCount(id);
        }, 200);
        return () => clearInterval(message_interval);
    }, [id, props.selectedMessageId]); // Re-run the effect if the channel ID and selected message id changes

    const goToSplash = () => {
        history.push('/');
    };

    const redirectToChannel = (channelId) => {
        history.push(`/channel/${channelId}`);
        props.setSelectedMessageId(null);
        setView('message'); // show message once channel is clicked
    };

    const redirectToThread = (channelId, messageId) => {
        props.setSelectedMessageId(messageId);
        const message = props.messages.find(m => m.id === messageId);
        props.setSelectedMessage(message);
        history.push(`/channel/${channelId}/thread/${messageId}`);
    };

    const handleBackToChannels = () => {
        props.setSelectedMessageId(null);
        setView('channel'); // only show channel list
        history.push(`/`);
    };

    if (props.channels.length < parseInt(id, 10)) {
        return <NotFoundPage/>;
    } else {
        return (
            <div className="splash container">
                <div className="channel">
                    <div className="header">
                        <h2><a href="/">Belay</a></h2>
                        <div className="channelDetail">
                            {!props.isEditing && props.channel ? (
                                <div>
                                    <h3>
                                        Chatting in <strong>{props.channel.name}</strong>
                                        <a onClick={props.handleEditClick}><span
                                            className="material-symbols-outlined md-18">edit</span></a>
                                    </h3>
                                </div>
                            ) : (
                                <div>
                                    <h3>
                                        Chatting in <input value={props.newChannelName}
                                                           onChange={(e) => props.setNewChannelName(e.target.value)}/>
                                        <button onClick={() => props.handleUpdateChannelName(id)}>Update</button>
                                    </h3>
                                </div>
                            )}
                            Invite users to this chat at:
                            <a href={`/channel/${id}`}>/channel/{id}</a>
                        </div>
                    </div>

                    <div className="channel-container">

                        <div className={`channel-list ${view !== 'channel' ? 'hidden' : ''}`}>
                            {props.channels.length > 0 ? (
                                <div className="channelList">
                                    {props.channels.map((channel) => (
                                        <button key={channel.id} onClick={() => redirectToChannel(channel.id)}
                                                style={{backgroundColor: channel.id === parseInt(id, 10) ? 'orange' : 'transparent'}}>
                                            {channel.name}
                                            {props.unreadCounts[channel.id] !== 0 && props.user &&
                                                <strong>({props.unreadCounts[channel.id]} unread messages)</strong>}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="noChannels">No channels yet! Create the first channel on Belay!</div>
                            )}
                        </div>

                        <div className="clip">
                            <div className="container">
                                <div className="chat">

                                    <div className={`message-list ${view !== 'message' ? 'hidden' : ''}`}>
                                        <div className="back-button" onClick={handleBackToChannels}>Back to Channels</div>
                                        <div className="messages">
                                            {props.messages.map((message, index) => (
                                                <div key={index} className="message">
                                                    <div className="author">{message.name}</div>
                                                    <div className="content">
                                                        {message.body}
                                                        {/* Display images after the message content */}
                                                        {props.parseImageUrls(message.body).map((url, imgIndex) => (
                                                            <img key={imgIndex} src={url} alt="Message Attachment"
                                                                 style={{
                                                                     maxWidth: '200px',
                                                                     maxHeight: '200px',
                                                                     marginTop: '10px'
                                                                 }}/>
                                                        ))}
                                                    </div>

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
                                                                    <span className="users">{reaction.users}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="message-reactions">
                                                        {['😀', '❤️', '👍'].map(emoji => (
                                                            <button key={emoji}
                                                                    onClick={() => props.handleAddReaction(message.id, emoji)}>{emoji}</button>
                                                        ))}
                                                    </div>

                                                    {props.repliesCount[message.id] > 0 ? (
                                                        <button onClick={() => redirectToThread(id, message.id)}>
                                                            Replies: {props.repliesCount[message.id]}
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => redirectToThread(id, message.id)}>Reply!</button>
                                                    )}

                                                </div>
                                            ))}
                                        </div>

                                        {(<div></div>)}
                                        <div className="comment_box">
                                            <label htmlFor="comment">What do you want to say?</label>
                                            <textarea name="comment" value={props.newMessage}
                                                      onChange={(e) => props.setNewMessage(e.target.value)}></textarea>
                                            <button onClick={(e) => props.handlePostMessage(e, id)}>Post</button>
                                        </div>
                                    </div>
                                </div>

                                {!props.messages.length && (
                                    <div>
                                        <h2>Oops, we can't find that channel!</h2>
                                        <p><a href="/">Let's go home and try again.</a></p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}


// TODO: --------------------------------------------- Thread Component ---------------------------------------------
function Thread(props) {
    const apiKey = localStorage.getItem('shuyuj_belay_auth_key');
    const {id, msg_id} = useParams();
    const history = useHistory();

    const [view, setView] = React.useState('reply'); // set default view as reply thread page
    const [valid, setValid] = React.useState(true); // state to check if message exists in current channel

    React.useEffect(() => {
        if (!apiKey) {
            history.push('/login');
            alert("Please login before entering to the thread.")
        }
        document.title = `Belay Channel #${id} Thread #${msg_id}`;
        props.setSelectedMessageId(msg_id);
        props.fetchChannelList();
        props.fetchUnreadMessageCounts();
        props.fetchChannelDetail(id);
        props.fetchMessagesWithReactions(id);
        props.fetchParentMessage(msg_id);
        props.updateLastViewed(id);
        props.fetchRepliesCount(id);
        props.fetchRepliesForMessage(props.selectedMessageId);
        checkValidThread(id, msg_id);
        const thread_interval = setInterval(() => {
            props.fetchChannelList();
            props.fetchUnreadMessageCounts();
            props.fetchMessagesWithReactions(id);
            props.fetchParentMessage(msg_id);
            props.updateLastViewed(id);
            props.fetchRepliesCount(id);
            props.fetchRepliesForMessage(props.selectedMessageId);
        }, 200);
        return () => clearInterval(thread_interval);
    }, [id, props.selectedMessageId]); // Re-run the effect if the channel ID and selected message id changes

    const goToSplash = () => {
        history.push('/');
    };

    const redirectToChannel = (channelId) => {
        history.push(`/channel/${channelId}`);
        props.setSelectedMessageId(null);
        setView('message');
    };

    const redirectToThread = (channelId, messageId) => {
        history.push(`/channel/${channelId}/thread/${messageId}`);
        props.setSelectedMessageId(messageId);
        const message = props.messages.find(m => m.id === messageId);
        props.setSelectedMessage(message);
        setView('reply');
    };

    const handleBackToChannels = () => {
        props.setSelectedMessageId(null);
        setView('channel');
        history.push(`/`);
    };

    const checkValidThread = () => {
        fetch(`/api/check_valid/${id}/${msg_id}`, {
            method: 'GET',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                if (!response.ok) {
                    setValid(false);
                }
            })
            .catch(error => console.error("Failed to check if thread is valid:", error));
    }

    if (props.channels.length < parseInt(id, 10) || !valid) {
        return <NotFoundPage/>;
    } else {
        return (
            <div className="splash container">

                <div className="channel">
                    <div className="header">
                        <h2><a href="/">Belay</a></h2>
                        <div className="channelDetail">
                            {!props.isEditing && props.channel ? (
                                <div>
                                    <h3>
                                        Chatting in <strong>{props.channel.name}</strong>
                                        <a onClick={props.handleEditClick}><span
                                            className="material-symbols-outlined md-18">edit</span></a>
                                    </h3>
                                </div>
                            ) : (
                                <div>
                                    <h3>
                                        Chatting in <input value={props.newChannelName}
                                                           onChange={(e) => props.setNewChannelName(e.target.value)}/>
                                        <button onClick={() => props.handleUpdateChannelName(id)}>Update</button>
                                    </h3>
                                </div>
                            )}
                            Invite users to this chat at:
                            <a href={`/channel/${id}`}>/channel/{id}</a>
                        </div>
                    </div>

                    <div className="channel-container">

                        <div className={`channel-list ${view !== 'channel' ? 'hidden' : ''}`}>
                            {props.channels.length > 0 ? (
                                <div className="channelList">
                                    {props.channels.map((channel) => (
                                        <button key={channel.id} onClick={() => redirectToChannel(channel.id)}
                                                style={{backgroundColor: channel.id === parseInt(id, 10) ? 'orange' : 'transparent'}}>
                                            {channel.name}
                                            {props.unreadCounts[channel.id] !== 0 && props.user &&
                                                <strong>({props.unreadCounts[channel.id]} unread messages)</strong>}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="noChannels">No channels yet! Create the first channel on Belay!</div>
                            )}
                        </div>

                        <div className="clip">
                            <div className="container">
                                <div className="chat">
                                    <div className={`narrow-message-list ${view !== 'message' ? 'hidden' : ''}`}>
                                        <div className="back-button" onClick={handleBackToChannels}>Back to Channels</div>

                                        <div className="messages">
                                            {props.messages.map((message, index) => (
                                                <div key={index} className="message">
                                                    <div className="author">{message.name}</div>
                                                    <div className="content">
                                                        {message.body}
                                                        {/* Display images after the message content */}
                                                        {props.parseImageUrls(message.body).map((url, imgIndex) => (
                                                            <img key={imgIndex} src={url} alt="Message Attachment"
                                                                 style={{
                                                                     maxWidth: '200px',
                                                                     maxHeight: '200px',
                                                                     marginTop: '10px'
                                                                 }}/>
                                                        ))}
                                                    </div>

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
                                                                    <span className="users">{reaction.users}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="message-reactions">
                                                        {['😀', '❤️', '👍'].map(emoji => (
                                                            <button key={emoji}
                                                                    onClick={() => props.handleAddReaction(message.id, emoji)}>{emoji}</button>
                                                        ))}
                                                    </div>

                                                    {props.repliesCount[message.id] > 0 ? (
                                                        <button onClick={() => redirectToThread(id, message.id)}>
                                                            Replies: {props.repliesCount[message.id]}
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => redirectToThread(id, message.id)}>Reply!</button>
                                                    )}

                                                </div>
                                            ))}
                                        </div>

                                        {(<div></div>)}
                                        <div className="comment_box">
                                            <label htmlFor="comment">What do you want to say?</label>
                                            <textarea name="comment" value={props.newMessage}
                                                      onChange={(e) => props.setNewMessage(e.target.value)}></textarea>
                                            <button onClick={(e) => props.handlePostMessage(e, id)}>Post</button>
                                        </div>
                                    </div>


                                    <div className={`reply-list ${view !== 'reply' ? 'hidden' : ''}`}>
                                        <div className="back-button" onClick={handleBackToChannels}>Back to Channels</div>
                                        <button onClick={() => redirectToChannel(id)}>close</button>
                                        <h3>Message</h3>
                                        <div className="message">
                                            <div className="author">{props.selectedMessage && props.selectedMessage.name}</div>
                                            <div className="content">
                                                {props.selectedMessage && props.selectedMessage.body}
                                                {/* Display images after the message content */}
                                                {props.selectedMessage && props.parseImageUrls(props.selectedMessage.body).map((url, imgIndex) => (
                                                    <img key={imgIndex} src={url} alt="Message Attachment"
                                                         style={{
                                                             maxWidth: '100px',
                                                             maxHeight: '100px',
                                                             marginTop: '10px'
                                                         }}/>
                                                ))}
                                            </div>
                                        </div>

                                        <h3>Replies</h3>
                                        {props.replies && props.replies.length > 0 ? (
                                            props.replies.map((reply, index) => (
                                                <div key={index} className="reply">
                                                    <div className="author">{reply.name}</div>
                                                    <div className="content">
                                                        {reply.body}
                                                        {/* Display images after the reply content */}
                                                        {props.parseImageUrls(reply.body).map((url, imgIndex) => (
                                                            <img key={imgIndex} src={url} alt="Message Attachment"
                                                                 style={{
                                                                     maxWidth: '100px',
                                                                     maxHeight: '100px',
                                                                     marginTop: '10px'
                                                                 }}/>
                                                        ))}
                                                    </div>

                                                    {reply.reactions && reply.reactions.length > 0 && (
                                                        <div className="reactions">
                                                            {reply.reactions.map((reaction, index) => (
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
                                                                    <span className="users">{reaction.users}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="message-reactions">
                                                        {['😀', '❤️', '👍'].map(emoji => (
                                                            <button key={emoji}
                                                                    onClick={() => props.handleAddReaction(reply.id, emoji)}>{emoji}</button>
                                                        ))}
                                                    </div>

                                                </div>
                                            ))
                                        ) : (
                                            <p>No replies yet.</p>
                                        )}
                                        {(<div></div>)}
                                        <div className="comment_box">
                                            <label htmlFor="comment">What do you want to reply?</label>
                                            <textarea
                                                name="comment"
                                                value={props.replyInput[props.selectedMessageId] || ''}
                                                onChange={(e) => props.setReplyInput({
                                                    ...props.replyInput,
                                                    [props.selectedMessageId]: e.target.value
                                                })}
                                            ></textarea>
                                            <button onClick={(e) => props.handlePostReply(e, props.selectedMessageId)}>Post</button>
                                        </div>
                                    </div>

                                </div>

                                {!props.messages.length && (
                                    <div>
                                        <h2>Oops, we can't find that channel!</h2>
                                        <p><a onClick={goToSplash}>Let's go home and try again.</a></p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}


// TODO: --------------------------------------------- 404 Component ---------------------------------------------
function NotFoundPage() {
    document.title = "Belay 404 Page";
    return (
        <div className="notFound">
            <div className="header">
                <h2><a href="/">Belay</a></h2>
                <h4>404 Error</h4>
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


// Render the App component
const rootContainer = document.getElementById('root');
const root = ReactDOM.createRoot(rootContainer);
root.render(<App/>);
