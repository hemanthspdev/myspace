const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://autosphere:4OlHLxxrplXTfySN@autosphere.nqica9s.mongodb.net/myspace';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ===================================
// MONGOOSE SCHEMAS
// ===================================

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
  settings: {
    theme: { type: String, default: 'dark' },
    notifications: { type: Boolean, default: true },
    focusAlerts: { type: Boolean, default: true },
    weatherCity: { type: String, default: '' }
  },
  streak: { type: Number, default: 0 },
  lastActiveDate: { type: Date, default: Date.now }
});

// Task Schema
const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  date: { type: Date },
  time: { type: String },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

// Note Schema
const noteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Focus Session Schema
const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  task: { type: String, required: true },
  duration: { type: Number, required: true }, // in minutes
  date: { type: Date, default: Date.now },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true }
});

// Models
const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);
const Note = mongoose.model('Note', noteSchema);
const Session = mongoose.model('Session', sessionSchema);

// ===================================
// AUTHENTICATION MIDDLEWARE
// ===================================

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ===================================
// AUTH ROUTES
// ===================================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword
    });
    
    await user.save();
    
    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        settings: user.settings,
        streak: user.streak
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Update last login and streak
    await updateStreak(user);
    user.lastLogin = new Date();
    await user.save();
    
    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        settings: user.settings,
        streak: user.streak
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      settings: req.user.settings,
      streak: req.user.streak
    }
  });
});

// ===================================
// USER ROUTES
// ===================================

// Update user settings
app.put('/api/user/settings', authMiddleware, async (req, res) => {
  try {
    const { theme, notifications, focusAlerts, weatherCity } = req.body;
    
    const user = await User.findById(req.userId);
    
    if (theme !== undefined) user.settings.theme = theme;
    if (notifications !== undefined) user.settings.notifications = notifications;
    if (focusAlerts !== undefined) user.settings.focusAlerts = focusAlerts;
    if (weatherCity !== undefined) user.settings.weatherCity = weatherCity;
    
    await user.save();
    
    res.json({ message: 'Settings updated', settings: user.settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===================================
// TASK ROUTES
// ===================================

// Get all tasks
app.get('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create task
app.post('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const { title, description, date, time, priority } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const task = new Task({
      userId: req.userId,
      title,
      description,
      date,
      time,
      priority
    });
    
    await task.save();
    res.status(201).json({ message: 'Task created', task });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update task
app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, date, time, priority, completed } = req.body;
    
    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (date !== undefined) task.date = date;
    if (time !== undefined) task.time = time;
    if (priority !== undefined) task.priority = priority;
    if (completed !== undefined) {
      task.completed = completed;
      if (completed) {
        task.completedAt = new Date();
      } else {
        task.completedAt = null;
      }
    }
    
    await task.save();
    res.json({ message: 'Task updated', task });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete task
app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===================================
// NOTE ROUTES
// ===================================

// Get all notes
app.get('/api/notes', authMiddleware, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.userId }).sort({ updatedAt: -1 });
    res.json({ notes });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create note
app.post('/api/notes', authMiddleware, async (req, res) => {
  try {
    const { title, content } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const note = new Note({
      userId: req.userId,
      title,
      content
    });
    
    await note.save();
    res.status(201).json({ message: 'Note created', note });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update note
app.put('/api/notes/:id', authMiddleware, async (req, res) => {
  try {
    const { title, content } = req.body;
    
    const note = await Note.findOne({ _id: req.params.id, userId: req.userId });
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    note.updatedAt = new Date();
    
    await note.save();
    res.json({ message: 'Note updated', note });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete note
app.delete('/api/notes/:id', authMiddleware, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json({ message: 'Note deleted' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===================================
// SESSION ROUTES
// ===================================

// Get all sessions
app.get('/api/sessions', authMiddleware, async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.userId }).sort({ date: -1 });
    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create session
app.post('/api/sessions', authMiddleware, async (req, res) => {
  try {
    const { task, duration, startTime, endTime } = req.body;
    
    if (!task || !duration || !startTime || !endTime) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const session = new Session({
      userId: req.userId,
      task,
      duration,
      startTime,
      endTime
    });
    
    await session.save();
    
    // Update user streak
    await updateStreak(await User.findById(req.userId));
    
    res.status(201).json({ message: 'Session created', session });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===================================
// ANALYTICS ROUTES
// ===================================

// Get analytics data
app.get('/api/analytics', authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.userId });
    const sessions = await Session.find({ userId: req.userId });
    const user = await User.findById(req.userId);
    
    // Calculate stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    
    const totalFocusMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalFocusHours = Math.floor(totalFocusMinutes / 60);
    
    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySessions = sessions.filter(s => new Date(s.date) >= today);
    const todayFocusMinutes = todaySessions.reduce((sum, s) => sum + s.duration, 0);
    
    const todayCompletedTasks = tasks.filter(t => 
      t.completed && t.completedAt && new Date(t.completedAt) >= today
    ).length;
    
    // Week stats
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekSessions = sessions.filter(s => new Date(s.date) >= weekAgo);
    const weekFocusMinutes = weekSessions.reduce((sum, s) => sum + s.duration, 0);
    
    // Productivity score
    const productivityScore = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0;
    
    res.json({
      analytics: {
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          pending: pendingTasks,
          todayCompleted: todayCompletedTasks
        },
        focus: {
          totalMinutes: totalFocusMinutes,
          totalHours: totalFocusHours,
          todayMinutes: todayFocusMinutes,
          weekMinutes: weekFocusMinutes,
          sessionsCount: sessions.length
        },
        streak: user.streak,
        productivityScore
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===================================
// UTILITY FUNCTIONS
// ===================================

async function updateStreak(user) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastActive = new Date(user.lastActiveDate);
  lastActive.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 0) {
    // Same day, no change
    return;
  } else if (daysDiff === 1) {
    // Consecutive day, increment streak
    user.streak += 1;
  } else {
    // Streak broken, reset to 1
    user.streak = 1;
  }
  
  user.lastActiveDate = new Date();
  await user.save();
}

// ===================================
// START SERVER
// ===================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});