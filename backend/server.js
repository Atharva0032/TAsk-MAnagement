const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(cors());
app.use(express.json());

const JWT_SECRET = "super_secret_jwt_key_12345"; // For demo purposes

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token == null) return res.sendStatus(401);
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({error: 'Username and password required'});
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
      if (err) {
        return res.status(400).json({error: 'Username already exists'});
      }
      const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET);
      res.json({ token, user: { id: this.lastID, username } });
    });
  } catch (error) {
    res.status(500).json({error: 'Server error'});
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) return res.status(400).json({error: 'Invalid credentials'});
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({error: 'Invalid credentials'});
    
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username } });
  });
});

app.get('/api/tasks', authenticateToken, (req, res) => {
  db.all('SELECT * FROM tasks WHERE userId = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({error: 'Database error'});
    res.json(rows);
  });
});

app.post('/api/tasks', authenticateToken, (req, res) => {
  const { title, description, status } = req.body;
  if (!title) return res.status(400).json({error: 'Title is required'});
  
  const taskStatus = status || 'pending';
  
  db.run('INSERT INTO tasks (title, description, status, userId) VALUES (?, ?, ?, ?)', 
    [title, description, taskStatus, req.user.id], 
    function(err) {
      if (err) return res.status(500).json({error: 'Database error'});
      
      const newTask = { id: this.lastID, title, description, status: taskStatus, userId: req.user.id };
      io.emit(`task_added_${req.user.id}`, newTask);
      res.json(newTask);
  });
});

app.put('/api/tasks/:id', authenticateToken, (req, res) => {
  const { title, description, status } = req.body;
  const taskId = req.params.id;
  
  db.run('UPDATE tasks SET title = ?, description = ?, status = ? WHERE id = ? AND userId = ?',
    [title, description, status, taskId, req.user.id],
    function(err) {
      if (err) return res.status(500).json({error: 'Database error'});
      if (this.changes === 0) return res.status(404).json({error: 'Task not found'});
      
      const updatedTask = { id: parseInt(taskId), title, description, status, userId: req.user.id };
      io.emit(`task_updated_${req.user.id}`, updatedTask);
      res.json(updatedTask);
  });
});

app.delete('/api/tasks/:id', authenticateToken, (req, res) => {
  const taskId = req.params.id;
  
  db.run('DELETE FROM tasks WHERE id = ? AND userId = ?', [taskId, req.user.id], function(err) {
    if (err) return res.status(500).json({error: 'Database error'});
    if (this.changes === 0) return res.status(404).json({error: 'Task not found'});
    
    io.emit(`task_deleted_${req.user.id}`, taskId);
    res.json({ message: 'Task deleted successfully' });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
