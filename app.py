import sqlite3
import string
import random
from flask import Flask, g, jsonify, request

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0


def get_db():
    db = getattr(g, '_database', None)

    if db is None:
        db = g._database = sqlite3.connect('db/belay.sqlite3')
        db.row_factory = sqlite3.Row
        setattr(g, '_database', db)
    return db


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


def query_db(query, args=(), one=False):
    db = get_db()
    cursor = db.execute(query, args)
    rows = cursor.fetchall()
    db.commit()
    cursor.close()
    if rows:
        if one:
            return rows[0]
        return rows
    return None


def new_user():
    name = "Unnamed User #" + ''.join(random.choices(string.digits, k=6))
    password = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    api_key = ''.join(random.choices(string.ascii_lowercase + string.digits, k=40))
    u = query_db('INSERT INTO users (name, password, api_key) VALUES (?, ?, ?) RETURNING id, name, password, api_key',
                 (name, password, api_key), one=True)
    return u


# TODO: If your app sends users to any other routes, include them here. (This should not be necessary).
@app.route('/')
@app.route('/profile')
@app.route('/login')
@app.route('/channel')
@app.route('/channel/<channel_id>')
def index(channel_id=None):
    return app.send_static_file('index.html')


@app.errorhandler(404)
def page_not_found(e):
    return app.send_static_file('404.html'), 404


# -------------------------------- API ROUTES ----------------------------------
# TODO: Create the API
@app.route('/api/signup', methods=['POST'])
def signup():
    print("signup")  # For debugging
    user = new_user()
    if user:
        response = {
            'status': 'success',
            'id': user['id'],
            'username': user['name'],
            'api_key': user['api_key']
        }
        return jsonify(response), 201
    else:
        return jsonify({
            'status': 'fail',
            'error': 'User creation failed'
        }), 500


@app.route('/api/login', methods=['POST'])
def login():
    print("login")  # For debugging
    if not request.is_json:
        return jsonify({
            'status': 'fail',
            'error': 'Missing JSON in request'
        }), 400

    username = request.get_json().get('username')
    password = request.get_json().get('password')

    if not username or not password:
        return jsonify({
            'status': 'fail',
            'error': 'Please provide both username and password'
        }), 400

    user = query_db('SELECT * FROM users WHERE name = ? AND password = ?', [username, password], one=True)
    if user:
        return jsonify({
            'status': 'success',
            "api_key": user['api_key'],
            "id": user['id'],
            'username': user['name']
        }), 200
    else:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid username or password'
        }), 403


@app.route('/api/profile', methods=['GET', 'POST'])
def profile():
    api_key = request.headers.get('Authorization')
    if not api_key:
        return jsonify({
            'status': 'fail',
            'error': 'Missing API key in request header'
        }), 400

    user = query_db('SELECT * FROM users WHERE api_key = ?', [api_key], one=True)
    if not user:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid API key'
        }), 403

    if request.method == 'GET':
        print("get profile info")  # For debugging
        return jsonify({
            'status': 'success',
            'id': user['id'],
            'username': user['name'],
            'password': user['password'],
            'api_key': user['api_key']
        }), 200

    elif request.method == 'POST':
        print("update profile")  # For debugging
        updated_name = request.get_json().get('name')
        updated_password = request.get_json().get('password')
        if updated_name:
            query_db('UPDATE users SET name = ? WHERE api_key = ?', [updated_name, api_key])
        if updated_password:
            query_db('UPDATE users SET password = ? WHERE api_key = ?', [updated_password, api_key])

        return jsonify({
            'status': 'success',
            'id': user['id'],
            'username': updated_name,
            'password': updated_password,
            'api_key': user['api_key']
        }), 200

    else:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid method. Only takes POST and GET methods in the request'
        }), 400


@app.route('/api/channel', methods=['GET', 'POST'])
def channel():
    api_key = request.headers.get('Authorization')
    if not api_key:
        return jsonify({
            'status': 'fail',
            'error': 'Missing API key in request header'
        }), 400

    user = query_db('SELECT * FROM users WHERE api_key = ?', [api_key], one=True)
    if not user:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid API key'
        }), 403

    if request.method == 'GET':
        print("get all channels")  # For debugging
        channels = query_db('SELECT * FROM channels')
        if channels:
            return jsonify([dict(r) for r in channels]), 200
        else:
            return jsonify([]), 200

    elif request.method == 'POST':
        print("create channel")  # For debugging
        new_channel_name = "Unnamed Channel " + ''.join(random.choices(string.digits, k=6))
        channel = query_db('INSERT INTO channels (name) VALUES (?) RETURNING id, name', [new_channel_name], one=True)
        return jsonify({
            'status': 'success',
            'id': channel['id'],
            'name': channel['name']
        }), 200

    else:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid method. Only takes POST and GET methods in the request'
        }), 400


@app.route('/api/channel/<int:channel_id>', methods=['GET', 'POST'])
def channel_name(channel_id):
    api_key = request.headers.get('Authorization')
    if not api_key:
        return jsonify({
            'status': 'fail',
            'error': 'Missing API key in request header'
        }), 400

    user = query_db('SELECT * FROM users WHERE api_key = ?', [api_key], one=True)
    if not user:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid API key'
        }), 403

    if request.method == 'GET':
        print("get channel info")  # For debugging
        channel = query_db('SELECT * FROM channels WHERE id = ?', [channel_id], one=True)
        return jsonify({
            'status': 'success',
            'id': channel['id'],
            'name': channel['name'],
            'username': user['name']
        }), 200

    elif request.method == 'POST':
        print("update channel name")  # For debugging
        new_channel_name = request.get_json().get('name')
        query_db('UPDATE channels set name = ? WHERE id = ?', [new_channel_name, channel_id])
        return jsonify({'status': 'success'}), 200

    else:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid method. Only takes POST and GET methods in the request'
        }), 400


@app.route('/api/channel/<int:channel_id>/messages', methods=['GET', 'POST'])
def messages(channel_id):
    api_key = request.headers.get('Authorization')
    if not api_key:
        return jsonify({
            'status': 'fail',
            'error': 'Missing API key in request header'
        }), 400

    user = query_db('SELECT * FROM users WHERE api_key = ?', [api_key], one=True)
    if not user:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid API key'
        }), 403

    if request.method == 'GET':
        print("get messages")  # For debugging
        messages = query_db('SELECT * FROM messages LEFT JOIN users ON messages.user_id = users.id WHERE channel_id = ? AND replies_to IS NULL',
                            [channel_id])
        if messages:
            return jsonify([dict(m) for m in messages]), 200
        else:
            return jsonify([]), 200

    elif request.method == 'POST':
        print("post message")  # For debugging
        message = request.get_json().get('body')
        user_id = user['id']
        query_db('INSERT INTO messages (user_id, channel_id, body) VALUES (?, ?, ?)', [user_id, channel_id, message])
        return {}, 200

    else:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid method. Only takes POST and GET methods in the request'
        }), 400

@app.route('/api/channel/<int:channel_id>/last-viewed', methods=['POST'])
def update_last_message_seen(channel_id):
    api_key = request.headers.get('Authorization')
    if not api_key:
        return jsonify({
            'status': 'fail',
            'error': 'Missing API key in request header'
        }), 400

    user = query_db('SELECT * FROM users WHERE api_key = ?', [api_key], one=True)
    if not user:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid API key'
        }), 403

    print("update last message seen")  # For debugging
    last_message_seen = request.get_json().get('last_message_id_seen')
    if not all([channel_id, last_message_seen]):
        return jsonify({'status': 'fail', 'error': 'Missing required fields'})

    existing_view = query_db('SELECT * FROM user_message_views WHERE user_id = ? AND channel_id = ?',
                             [user['id'], channel_id], one=True)
    if existing_view:
        query_db('UPDATE user_message_views SET last_message_seen = ? WHERE user_id = ? AND channel_id = ?',
                 [last_message_seen, user['id'], channel_id])
    else:
        query_db('INSERT INTO user_message_views (user_id, channel_id, last_message_seen) VALUES (?, ?, ?)',
                 [user['id'], channel_id, last_message_seen])

    return jsonify({'status': 'success',
                    'message': 'User message view updated successfully'}), 200


@app.route('/api/user/unread-messages', methods=['GET'])
def get_unread_messages_count():
    api_key = request.headers.get('Authorization')
    if not api_key:
        return jsonify({
            'status': 'fail',
            'error': 'Missing API key in request header'
        }), 400

    user = query_db('SELECT * FROM users WHERE api_key = ?', [api_key], one=True)
    if not user:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid API key'
        }), 403

    channels = query_db('select * from channels')
    unread_messages_counts = []

    for channel in channels:
        last_viewed_message_id = query_db('select last_message_seen from user_message_views where user_id = ? and channel_id = ?',
                                          [user['id'], channel['id']], one=True)

        if last_viewed_message_id:
            unread_count = query_db('select count(*) as count from messages where channel_id = ? and id > ? and replies_to is null',
                                    [channel['id'], last_viewed_message_id['last_message_seen']], one=True)
        else:
            unread_count = query_db('select count(*) as count from messages where channel_id = ? and replies_to is null',
                                    [channel['id']], one=True)

        unread_messages_counts.append({'channel_id': channel['id'], 'unread_count': unread_count['count']})

    return jsonify(unread_messages_counts), 200


@app.route('/api/message/<int:message_id>/reply', methods=['GET'])
def get_reply(message_id):
    api_key = request.headers.get('Authorization')
    if not api_key:
        return jsonify({
            'status': 'fail',
            'error': 'Missing API key in request header'
        }), 400

    user = query_db('SELECT * FROM users WHERE api_key = ?', [api_key], one=True)
    if not user:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid API key'
        }), 403

    replies = query_db('SELECT * FROM messages WHERE replies_to = ?', [message_id], one=True)
    if replies:
        return jsonify([dict(r) for r in replies]), 200
    else:
        return jsonify([]), 200
