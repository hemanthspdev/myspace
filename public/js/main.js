/* ===================================
   MYSPACE V2 - MAIN JAVASCRIPT (MongoDB)
=================================== */

// ===================================
// STATE MANAGEMENT
// ===================================

const AppState = {
  user: null,
  tasks: [],
  notes: [],
  sessions: [],
  analytics: null,
  settings: {
    theme: 'dark',
    notifications: true,
    focusAlerts: true,
    weatherCity: ''
  }
};

// ===================================
// INITIALIZATION
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
  await loadUserData();
  initializeNavigation();
  initializeClock();
  initializeTheme();
  initializeDashboard();
  initializeTasks();
  initializeFocus();
  initializeNotes();
  initializeWeather();
  initializeSettings();
  
  // Initial data load
  await loadAllData();
});

async function loadUserData() {
  try {
    const response = await API.getCurrentUser();
    AppState.user = response.user;
    AppState.settings = response.user.settings || AppState.settings;
    
    if (AppState.user) {
      document.getElementById('userName').textContent = AppState.user.name;
      document.getElementById('userAvatar').textContent = AppState.user.name.charAt(0).toUpperCase();
    }
  } catch (error) {
    console.error('Failed to load user:', error);
    window.location.href = 'login.html';
  }
}

async function loadAllData() {
  try {
    // Load all data in parallel
    const [tasksData, notesData, sessionsData, analyticsData] = await Promise.all([
      API.getTasks(),
      API.getNotes(),
      API.getSessions(),
      API.getAnalytics()
    ]);
    
    AppState.tasks = tasksData.tasks || [];
    AppState.notes = notesData.notes || [];
    AppState.sessions = sessionsData.sessions || [];
    AppState.analytics = analyticsData.analytics || null;
    
    // Update UI
    refreshDashboard();
    renderTasks();
    renderNotes();
    renderSessions();
  } catch (error) {
    console.error('Failed to load data:', error);
    showToast('Failed to load data', 'error');
  }
}

// ===================================
// NAVIGATION
// ===================================

function initializeNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      switchPage(page);
    });
  });
}

function switchPage(pageName) {
  // Update nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.page === pageName) {
      item.classList.add('active');
    }
  });
  
  // Update page
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  const targetPage = document.getElementById(`${pageName}-page`);
  if (targetPage) {
    targetPage.classList.add('active');
    
    // Refresh page-specific data
    if (pageName === 'dashboard') refreshDashboard();
    if (pageName === 'tasks') renderTasks();
    if (pageName === 'notes') renderNotes();
    if (pageName === 'analytics') renderAnalytics();
  }
}

window.switchPage = switchPage;

// ===================================
// CLOCK
// ===================================

function initializeClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  // Update live time
  const liveTime = document.getElementById('liveTime');
  if (liveTime) {
    liveTime.textContent = `${hours}:${minutes}:${seconds}`;
  }
  
  // Update greeting
  const greeting = document.getElementById('greeting');
  if (greeting) {
    if (hours < 12) {
      greeting.textContent = 'Good Morning ☀️';
    } else if (hours < 18) {
      greeting.textContent = 'Good Afternoon 🌤️';
    } else {
      greeting.textContent = 'Good Evening 🌙';
    }
  }
  
  // Update date
  const dateEl = document.getElementById('currentDate');
  if (dateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString('en-US', options);
  }
}

// ===================================
// THEME
// ===================================

function initializeTheme() {
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = themeToggle.querySelector('.theme-icon');
  const themeText = themeToggle.querySelector('.theme-text');
  
  // Apply saved theme
  if (AppState.settings.theme === 'light') {
    document.body.classList.add('light-mode');
    themeIcon.textContent = '☀️';
    themeText.textContent = 'Light Mode';
  }
  
  themeToggle.addEventListener('click', async () => {
    document.body.classList.toggle('light-mode');
    
    if (document.body.classList.contains('light-mode')) {
      themeIcon.textContent = '☀️';
      themeText.textContent = 'Light Mode';
      AppState.settings.theme = 'light';
    } else {
      themeIcon.textContent = '🌙';
      themeText.textContent = 'Dark Mode';
      AppState.settings.theme = 'dark';
    }
    
    try {
      await API.updateSettings({ theme: AppState.settings.theme });
      showToast('Theme updated!', 'success');
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  });
}

// ===================================
// DASHBOARD
// ===================================

function initializeDashboard() {
  refreshDashboard();
  initializeQuickFocus();
}

async function refreshDashboard() {
  try {
    // Reload analytics
    const analyticsData = await API.getAnalytics();
    AppState.analytics = analyticsData.analytics;
    
    updateStats();
    updateTodayTasks();
    updateNotesPreview();
  } catch (error) {
    console.error('Failed to refresh dashboard:', error);
  }
}

function updateStats() {
  if (!AppState.analytics) return;
  
  const { tasks, focus, streak } = AppState.analytics;
  
  document.getElementById('totalTasks').textContent = tasks.total;
  document.getElementById('completedTasks').textContent = tasks.completed;
  document.getElementById('focusHours').textContent = `${Math.floor(focus.todayMinutes / 60)}h ${focus.todayMinutes % 60}m`;
  document.getElementById('streak').textContent = streak;
  
  // Update task badge
  document.getElementById('taskBadge').textContent = tasks.pending;
}

function updateTodayTasks() {
  const container = document.getElementById('todayTasks');
  const today = new Date().toDateString();
  const todayTasks = AppState.tasks.filter(t => {
    if (!t.date) return false;
    return new Date(t.date).toDateString() === today && !t.completed;
  }).slice(0, 5);
  
  if (todayTasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📋</span>
        <p>No tasks for today</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = todayTasks.map(task => `
    <div class="task-item" onclick="toggleTaskQuick('${task._id}')">
      <div class="task-checkbox"></div>
      <div class="task-text">${task.title}</div>
      ${task.time ? `<div class="task-time">${task.time}</div>` : ''}
    </div>
  `).join('');
}

function updateNotesPreview() {
  const container = document.getElementById('notesPreview');
  const recentNotes = AppState.notes.slice(0, 3);
  
  if (recentNotes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📝</span>
        <p>No notes yet</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = recentNotes.map(note => `
    <div class="note-preview-item" onclick="editNote('${note._id}')">
      <div class="note-title">${note.title}</div>
      <div class="note-excerpt">${note.content.substring(0, 100)}...</div>
    </div>
  `).join('');
}

// ===================================
// QUICK FOCUS
// ===================================

let quickFocusTimer = null;
let quickFocusTimeLeft = 25 * 60;
let quickFocusRunning = false;

function initializeQuickFocus() {
  const startBtn = document.getElementById('quickStart');
  const pauseBtn = document.getElementById('quickPause');
  const resetBtn = document.getElementById('quickReset');
  
  startBtn.addEventListener('click', startQuickFocus);
  pauseBtn.addEventListener('click', pauseQuickFocus);
  resetBtn.addEventListener('click', resetQuickFocus);
  
  updateQuickFocusDisplay();
}

function startQuickFocus() {
  if (quickFocusRunning) return;
  
  quickFocusRunning = true;
  document.getElementById('quickStart').style.display = 'none';
  document.getElementById('quickPause').style.display = 'inline-flex';
  document.getElementById('quickStatus').textContent = '🔥 Focusing...';
  
  const startTime = new Date();
  
  quickFocusTimer = setInterval(() => {
    if (quickFocusTimeLeft > 0) {
      quickFocusTimeLeft--;
      updateQuickFocusDisplay();
    } else {
      completeQuickFocus(startTime);
    }
  }, 1000);
}

function pauseQuickFocus() {
  clearInterval(quickFocusTimer);
  quickFocusRunning = false;
  document.getElementById('quickStart').style.display = 'inline-flex';
  document.getElementById('quickPause').style.display = 'none';
  document.getElementById('quickStatus').textContent = '⏸️ Paused';
}

function resetQuickFocus() {
  clearInterval(quickFocusTimer);
  quickFocusRunning = false;
  quickFocusTimeLeft = 25 * 60;
  document.getElementById('quickStart').style.display = 'inline-flex';
  document.getElementById('quickPause').style.display = 'none';
  document.getElementById('quickStatus').textContent = 'Ready to focus';
  updateQuickFocusDisplay();
}

async function completeQuickFocus(startTime) {
  clearInterval(quickFocusTimer);
  quickFocusRunning = false;
  
  try {
    // Save session to database
    await API.createSession({
      task: 'Quick Focus',
      duration: 25,
      startTime: startTime.toISOString(),
      endTime: new Date().toISOString()
    });
    
    // Reload sessions and analytics
    const [sessionsData, analyticsData] = await Promise.all([
      API.getSessions(),
      API.getAnalytics()
    ]);
    
    AppState.sessions = sessionsData.sessions || [];
    AppState.analytics = analyticsData.analytics || null;
    
    // Reset UI
    resetQuickFocus();
    
    // Show completion
    showToast('🎉 Focus session complete!', 'success');
    playCompletionSound();
    createConfetti();
    
    // Update stats
    updateStats();
    renderSessions();
  } catch (error) {
    console.error('Failed to save session:', error);
    showToast('Failed to save session', 'error');
  }
}

function updateQuickFocusDisplay() {
  const minutes = Math.floor(quickFocusTimeLeft / 60);
  const seconds = String(quickFocusTimeLeft % 60).padStart(2, '0');
  document.getElementById('quickTimer').textContent = `${minutes}:${seconds}`;
}

// ===================================
// TASKS
// ===================================

function initializeTasks() {
  const addTaskBtn = document.getElementById('addTaskBtn');
  const saveTaskBtn = document.getElementById('saveTaskBtn');
  
  addTaskBtn.addEventListener('click', () => openTaskModal());
  saveTaskBtn.addEventListener('click', saveTask);
  
  // Task tabs
  document.querySelectorAll('.tasks-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tasks-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      filterTasks(tab.dataset.filter);
    });
  });
  
  renderTasks();
}

let currentTaskId = null;

function openTaskModal(taskId = null) {
  currentTaskId = taskId;
  const modal = document.getElementById('taskModal');
  const title = document.getElementById('taskModalTitle');
  
  if (taskId) {
    title.textContent = 'Edit Task';
    const task = AppState.tasks.find(t => t._id === taskId);
    if (task) {
      document.getElementById('taskTitleInput').value = task.title;
      document.getElementById('taskDescInput').value = task.description || '';
      document.getElementById('taskDateInput').value = task.date ? new Date(task.date).toISOString().split('T')[0] : '';
      document.getElementById('taskTimeInput').value = task.time || '';
      document.getElementById('taskPriorityInput').value = task.priority || 'medium';
    }
  } else {
    title.textContent = 'New Task';
    document.getElementById('taskTitleInput').value = '';
    document.getElementById('taskDescInput').value = '';
    document.getElementById('taskDateInput').value = '';
    document.getElementById('taskTimeInput').value = '';
    document.getElementById('taskPriorityInput').value = 'medium';
  }
  
  modal.classList.add('active');
}

async function saveTask() {
  const title = document.getElementById('taskTitleInput').value.trim();
  if (!title) {
    showToast('Please enter a task title', 'error');
    return;
  }
  
  const taskData = {
    title,
    description: document.getElementById('taskDescInput').value.trim(),
    date: document.getElementById('taskDateInput').value || null,
    time: document.getElementById('taskTimeInput').value,
    priority: document.getElementById('taskPriorityInput').value
  };
  
  try {
    if (currentTaskId) {
      await API.updateTask(currentTaskId, taskData);
      showToast('Task updated!', 'success');
    } else {
      await API.createTask(taskData);
      showToast('Task created!', 'success');
      createConfetti();
    }
    
    // Reload tasks and analytics
    const [tasksData, analyticsData] = await Promise.all([
      API.getTasks(),
      API.getAnalytics()
    ]);
    
    AppState.tasks = tasksData.tasks || [];
    AppState.analytics = analyticsData.analytics || null;
    
    closeModal('taskModal');
    renderTasks();
    updateStats();
    updateTodayTasks();
  } catch (error) {
    console.error('Failed to save task:', error);
    showToast('Failed to save task', 'error');
  }
}

function renderTasks(filter = 'all') {
  const container = document.getElementById('tasksGrid');
  let filteredTasks = AppState.tasks;
  
  const today = new Date().toDateString();
  
  if (filter === 'today') {
    filteredTasks = AppState.tasks.filter(t => {
      if (!t.date) return false;
      return new Date(t.date).toDateString() === today;
    });
  } else if (filter === 'upcoming') {
    filteredTasks = AppState.tasks.filter(t => {
      if (!t.date) return false;
      return new Date(t.date) > new Date() && !t.completed;
    });
  } else if (filter === 'completed') {
    filteredTasks = AppState.tasks.filter(t => t.completed);
  }
  
  if (filteredTasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <span class="empty-icon">📋</span>
        <p>No tasks found</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = filteredTasks.map(task => `
    <div class="task-card ${task.completed ? 'completed' : ''}" data-priority="${task.priority}">
      <div class="task-card-header">
        <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask('${task._id}')">
          ${task.completed ? '✓' : ''}
        </div>
        <div class="task-priority priority-${task.priority}"></div>
      </div>
      <h4 class="task-card-title">${task.title}</h4>
      ${task.description ? `<p class="task-card-desc">${task.description}</p>` : ''}
      <div class="task-card-footer">
        ${task.date ? `<span class="task-date">📅 ${new Date(task.date).toLocaleDateString()}</span>` : ''}
        ${task.time ? `<span class="task-time">🕐 ${task.time}</span>` : ''}
      </div>
      <div class="task-card-actions">
        <button onclick="openTaskModal('${task._id}')" class="btn-icon-small">✏️</button>
        <button onclick="deleteTask('${task._id}')" class="btn-icon-small">🗑️</button>
      </div>
    </div>
  `).join('');
}

function filterTasks(filter) {
  renderTasks(filter);
}

async function toggleTask(taskId) {
  const task = AppState.tasks.find(t => t._id === taskId);
  if (!task) return;
  
  try {
    await API.updateTask(taskId, { completed: !task.completed });
    
    // Reload tasks and analytics
    const [tasksData, analyticsData] = await Promise.all([
      API.getTasks(),
      API.getAnalytics()
    ]);
    
    AppState.tasks = tasksData.tasks || [];
    AppState.analytics = analyticsData.analytics || null;
    
    renderTasks();
    updateStats();
    updateTodayTasks();
    
    if (!task.completed) {
      showToast('Task completed! 🎉', 'success');
      createConfetti();
    }
  } catch (error) {
    console.error('Failed to toggle task:', error);
    showToast('Failed to update task', 'error');
  }
}

function toggleTaskQuick(taskId) {
  toggleTask(taskId);
}

window.toggleTaskQuick = toggleTaskQuick;

async function deleteTask(taskId) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  
  try {
    await API.deleteTask(taskId);
    
    // Reload tasks and analytics
    const [tasksData, analyticsData] = await Promise.all([
      API.getTasks(),
      API.getAnalytics()
    ]);
    
    AppState.tasks = tasksData.tasks || [];
    AppState.analytics = analyticsData.analytics || null;
    
    renderTasks();
    updateStats();
    updateTodayTasks();
    showToast('Task deleted', 'success');
  } catch (error) {
    console.error('Failed to delete task:', error);
    showToast('Failed to delete task', 'error');
  }
}

window.openTaskModal = openTaskModal;
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;

// ===================================
// FOCUS MODE
// ===================================

let mainFocusTimer = null;
let mainFocusTimeLeft = 25 * 60;
let mainFocusTotal = 25 * 60;
let mainFocusRunning = false;

function initializeFocus() {
  const startBtn = document.getElementById('mainStart');
  const pauseBtn = document.getElementById('mainPause');
  const resetBtn = document.getElementById('mainReset');
  const customBtn = document.getElementById('customTimeBtn');
  
  startBtn.addEventListener('click', startMainFocus);
  pauseBtn.addEventListener('click', pauseMainFocus);
  resetBtn.addEventListener('click', resetMainFocus);
  customBtn.addEventListener('click', setCustomTime);
  
  // Preset buttons
  document.querySelectorAll('.preset-btn[data-minutes]').forEach(btn => {
    btn.addEventListener('click', () => {
      const minutes = parseInt(btn.dataset.minutes);
      setFocusTime(minutes);
    });
  });
  
  updateMainFocusDisplay();
  renderSessions();
}

function setFocusTime(minutes) {
  mainFocusTimeLeft = minutes * 60;
  mainFocusTotal = minutes * 60;
  updateMainFocusDisplay();
  showToast(`Timer set to ${minutes} minutes`, 'success');
}

function setCustomTime() {
  const minutes = prompt('Enter minutes (1-120):');
  if (minutes && !isNaN(minutes)) {
    const mins = Math.max(1, Math.min(120, parseInt(minutes)));
    setFocusTime(mins);
  }
}

function startMainFocus() {
  if (mainFocusRunning) return;
  
  mainFocusRunning = true;
  document.getElementById('mainStart').style.display = 'none';
  document.getElementById('mainPause').style.display = 'inline-flex';
  document.getElementById('timerLabel').textContent = '🔥 Focusing...';
  
  const startTime = new Date();
  
  mainFocusTimer = setInterval(() => {
    if (mainFocusTimeLeft > 0) {
      mainFocusTimeLeft--;
      updateMainFocusDisplay();
      updateTimerProgress();
    } else {
      completeMainFocus(startTime);
    }
  }, 1000);
}

function pauseMainFocus() {
  clearInterval(mainFocusTimer);
  mainFocusRunning = false;
  document.getElementById('mainStart').style.display = 'inline-flex';
  document.getElementById('mainPause').style.display = 'none';
  document.getElementById('timerLabel').textContent = '⏸️ Paused';
}

function resetMainFocus() {
  clearInterval(mainFocusTimer);
  mainFocusRunning = false;
  mainFocusTimeLeft = mainFocusTotal;
  document.getElementById('mainStart').style.display = 'inline-flex';
  document.getElementById('mainPause').style.display = 'none';
  document.getElementById('timerLabel').textContent = 'Focus Time';
  updateMainFocusDisplay();
  updateTimerProgress();
}

async function completeMainFocus(startTime) {
  clearInterval(mainFocusTimer);
  mainFocusRunning = false;
  
  const taskName = document.getElementById('sessionTask').value || 'Focus Session';
  const duration = Math.floor(mainFocusTotal / 60);
  
  try {
    // Save session to database
    await API.createSession({
      task: taskName,
      duration,
      startTime: startTime.toISOString(),
      endTime: new Date().toISOString()
    });
    
    // Reload sessions and analytics
    const [sessionsData, analyticsData] = await Promise.all([
      API.getSessions(),
      API.getAnalytics()
    ]);
    
    AppState.sessions = sessionsData.sessions || [];
    AppState.analytics = analyticsData.analytics || null;
    
    // Reset
    resetMainFocus();
    document.getElementById('sessionTask').value = '';
    
    // Show completion
    showToast(`🎉 ${duration} minute focus session complete!`, 'success');
    playCompletionSound();
    createConfetti();
    
    // Update UI
    renderSessions();
    updateStats();
  } catch (error) {
    console.error('Failed to save session:', error);
    showToast('Failed to save session', 'error');
  }
}

function updateMainFocusDisplay() {
  const minutes = Math.floor(mainFocusTimeLeft / 60);
  const seconds = String(mainFocusTimeLeft % 60).padStart(2, '0');
  document.getElementById('mainTimer').textContent = `${minutes}:${seconds}`;
}

function updateTimerProgress() {
  const progress = ((mainFocusTotal - mainFocusTimeLeft) / mainFocusTotal) * 565;
  const circle = document.getElementById('timerProgress');
  if (circle) {
    circle.style.strokeDashoffset = 565 - progress;
  }
}

function renderSessions() {
  const container = document.getElementById('sessionsList');
  const today = new Date().toDateString();
  const todaySessions = AppState.sessions.filter(s => {
    return new Date(s.date).toDateString() === today;
  }).reverse();
  
  if (todaySessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🎯</span>
        <p>No sessions yet</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = todaySessions.map(session => `
    <div class="session-item">
      <div class="session-icon">🎯</div>
      <div class="session-info">
        <div class="session-task">${session.task}</div>
        <div class="session-time">${new Date(session.startTime).toLocaleTimeString()} - ${new Date(session.endTime).toLocaleTimeString()}</div>
      </div>
      <div class="session-duration">${session.duration}m</div>
    </div>
  `).join('');
}

// ===================================
// NOTES
// ===================================

function initializeNotes() {
  const addNoteBtn = document.getElementById('addNoteBtn');
  const saveNoteBtn = document.getElementById('saveNoteBtn');
  
  addNoteBtn.addEventListener('click', () => openNoteModal());
  saveNoteBtn.addEventListener('click', saveNote);
  
  renderNotes();
}

let currentNoteId = null;

function openNoteModal(noteId = null) {
  currentNoteId = noteId;
  const modal = document.getElementById('noteModal');
  const title = document.getElementById('noteModalTitle');
  
  if (noteId) {
    title.textContent = 'Edit Note';
    const note = AppState.notes.find(n => n._id === noteId);
    if (note) {
      document.getElementById('noteTitleInput').value = note.title;
      document.getElementById('noteContentInput').value = note.content;
    }
  } else {
    title.textContent = 'New Note';
    document.getElementById('noteTitleInput').value = '';
    document.getElementById('noteContentInput').value = '';
  }
  
  modal.classList.add('active');
}

async function saveNote() {
  const title = document.getElementById('noteTitleInput').value.trim();
  const content = document.getElementById('noteContentInput').value.trim();
  
  if (!title) {
    showToast('Please enter a note title', 'error');
    return;
  }
  
  try {
    if (currentNoteId) {
      await API.updateNote(currentNoteId, { title, content });
      showToast('Note updated!', 'success');
    } else {
      await API.createNote({ title, content });
      showToast('Note created!', 'success');
    }
    
    // Reload notes
    const notesData = await API.getNotes();
    AppState.notes = notesData.notes || [];
    
    closeModal('noteModal');
    renderNotes();
    updateNotesPreview();
  } catch (error) {
    console.error('Failed to save note:', error);
    showToast('Failed to save note', 'error');
  }
}

function renderNotes() {
  const container = document.getElementById('notesGrid');
  
  if (AppState.notes.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <span class="empty-icon">📝</span>
        <p>No notes yet</p>
        <button class="btn-primary" onclick="openNoteModal()">Create your first note</button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = AppState.notes.map(note => `
    <div class="note-card" onclick="editNote('${note._id}')">
      <h4 class="note-card-title">${note.title}</h4>
      <p class="note-card-content">${note.content.substring(0, 200)}${note.content.length > 200 ? '...' : ''}</p>
      <div class="note-card-footer">
        <span class="note-date">${new Date(note.updatedAt).toLocaleDateString()}</span>
        <div class="note-actions" onclick="event.stopPropagation()">
          <button onclick="deleteNote('${note._id}')" class="btn-icon-small">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

function editNote(noteId) {
  openNoteModal(noteId);
}

async function deleteNote(noteId) {
  if (!confirm('Are you sure you want to delete this note?')) return;
  
  try {
    await API.deleteNote(noteId);
    
    // Reload notes
    const notesData = await API.getNotes();
    AppState.notes = notesData.notes || [];
    
    renderNotes();
    updateNotesPreview();
    showToast('Note deleted', 'success');
  } catch (error) {
    console.error('Failed to delete note:', error);
    showToast('Failed to delete note', 'error');
  }
}

window.openNoteModal = openNoteModal;
window.editNote = editNote;
window.deleteNote = deleteNote;

// ===================================
// WEATHER
// ===================================

const WEATHER_API_KEY = '347c6cedc233f2189f0b8d7bbfaef08d';

function initializeWeather() {
  const saveLocationBtn = document.getElementById('saveLocationBtn');
  saveLocationBtn.addEventListener('click', saveLocation);
  
  loadWeather();
}

function loadWeather() {
  if (AppState.settings.weatherCity) {
    fetchWeather(AppState.settings.weatherCity);
  }
}

function openWeatherModal() {
  const modal = document.getElementById('weatherModal');
  modal.classList.add('active');
  
  if (AppState.settings.weatherCity) {
    document.getElementById('cityInput').value = AppState.settings.weatherCity;
  }
}

window.openWeatherModal = openWeatherModal;

async function saveLocation() {
  const city = document.getElementById('cityInput').value.trim();
  if (!city) {
    showToast('Please enter a city name', 'error');
    return;
  }
  
  try {
    await API.updateSettings({ weatherCity: city });
    AppState.settings.weatherCity = city;
    
    fetchWeather(city);
    closeModal('weatherModal');
    showToast('Location saved!', 'success');
  } catch (error) {
    console.error('Failed to save location:', error);
    showToast('Failed to save location', 'error');
  }
}

async function fetchWeather(city) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${WEATHER_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('City not found');
    }
    
    const data = await response.json();
    updateWeatherUI(data);
  } catch (error) {
    showToast('Failed to fetch weather', 'error');
    console.error(error);
  }
}

function updateWeatherUI(data) {
  const icon = getWeatherIcon(data.weather[0].main);
  const temp = Math.round(data.main.temp);
  const city = data.name;
  const description = data.weather[0].description;
  
  const weatherContent = document.getElementById('weatherContent');
  weatherContent.innerHTML = `
    <div class="weather-icon">${icon}</div>
    <div class="weather-temp">${temp}°</div>
    <div class="weather-city">${city}</div>
    <div class="weather-desc">${description}</div>
  `;
}

function getWeatherIcon(condition) {
  const icons = {
    'Clear': '☀️',
    'Clouds': '☁️',
    'Rain': '🌧️',
    'Snow': '❄️',
    'Thunderstorm': '⛈️',
    'Drizzle': '🌦️',
    'Mist': '🌫️',
    'Fog': '🌫️'
  };
  
  return icons[condition] || '🌤️';
}

// ===================================
// SETTINGS
// ===================================

function initializeSettings() {
  const clearDataBtn = document.getElementById('clearDataBtn');
  const themeSelect = document.getElementById('themeSelect');
  const taskNotifications = document.getElementById('taskNotifications');
  const focusAlerts = document.getElementById('focusAlerts');
  
  // Load settings
  themeSelect.value = AppState.settings.theme;
  taskNotifications.checked = AppState.settings.notifications;
  focusAlerts.checked = AppState.settings.focusAlerts;
  
  // Event listeners
  themeSelect.addEventListener('change', async (e) => {
    try {
      await API.updateSettings({ theme: e.target.value });
      AppState.settings.theme = e.target.value;
      
      if (e.target.value === 'light') {
        document.body.classList.add('light-mode');
      } else if (e.target.value === 'dark') {
        document.body.classList.remove('light-mode');
      }
      
      showToast('Theme updated!', 'success');
    } catch (error) {
      console.error('Failed to update theme:', error);
      showToast('Failed to update theme', 'error');
    }
  });
  
  taskNotifications.addEventListener('change', async (e) => {
    try {
      await API.updateSettings({ notifications: e.target.checked });
      AppState.settings.notifications = e.target.checked;
      showToast('Notification settings updated!', 'success');
    } catch (error) {
      console.error('Failed to update notifications:', error);
      showToast('Failed to update notifications', 'error');
    }
  });
  
  focusAlerts.addEventListener('change', async (e) => {
    try {
      await API.updateSettings({ focusAlerts: e.target.checked });
      AppState.settings.focusAlerts = e.target.checked;
      showToast('Alert settings updated!', 'success');
    } catch (error) {
      console.error('Failed to update alerts:', error);
      showToast('Failed to update alerts', 'error');
    }
  });
  
  clearDataBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      localStorage.clear();
      showToast('Logging out...', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    }
  });
}

// ===================================
// ANALYTICS
// ===================================

async function renderAnalytics() {
  try {
    // Reload analytics
    const analyticsData = await API.getAnalytics();
    AppState.analytics = analyticsData.analytics;
    
    if (!AppState.analytics) return;
    
    const score = AppState.analytics.productivityScore || 0;
    document.getElementById('productivityScore').innerHTML = `
      <span class="score-value">${score}</span>
      <span class="score-label">%</span>
    `;
  } catch (error) {
    console.error('Failed to render analytics:', error);
  }
}

// ===================================
// UTILITIES
// ===================================

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? '✅' : '❌';
  
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('active');
}

window.closeModal = closeModal;

function createConfetti() {
  const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
  const confettiCount = 50;
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.style.cssText = `
      position: fixed;
      width: 10px;
      height: 10px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${Math.random() * 100}vw;
      top: -10px;
      border-radius: 50%;
      animation: confettiFall ${2 + Math.random() * 2}s linear forwards;
      z-index: 9999;
      pointer-events: none;
    `;
    
    document.body.appendChild(confetti);
    
    setTimeout(() => confetti.remove(), 4000);
  }
}

// Add confetti animation
const style = document.createElement('style');
style.textContent = `
  @keyframes confettiFall {
    to {
      transform: translateY(100vh) rotate(${Math.random() * 720}deg);
      opacity: 0;
    }
  }
  
  @keyframes slideOutRight {
    to {
      transform: translateX(120%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

function playCompletionSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    console.log('Audio not supported');
  }
}

// ===================================
// LOGOUT
// ===================================

document.getElementById('logoutBtn').addEventListener('click', () => {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  }
});

/* ===================================
   ADD THIS TO THE END OF public/js/main.js
=================================== */

// ===================================
// MOBILE MENU
// ===================================

function initializeMobileMenu() {
  const menuToggle = document.getElementById('mobileMenuToggle');
  const overlay = document.getElementById('mobileOverlay');
  const sidebar = document.querySelector('.sidebar');
  const navItems = document.querySelectorAll('.nav-item');
  
  if (!menuToggle || !overlay || !sidebar) return;
  
  // Toggle menu
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
    menuToggle.querySelector('span').textContent = 
      sidebar.classList.contains('mobile-open') ? '✕' : '☰';
  });
  
  // Close on overlay click
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
    menuToggle.querySelector('span').textContent = '☰';
  });
  
  // Close on nav item click
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 968) {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
        menuToggle.querySelector('span').textContent = '☰';
      }
    });
  });
  
  // Handle window resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth > 968) {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
        menuToggle.querySelector('span').textContent = '☰';
      }
    }, 250);
  });
}

// Add to DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
  await loadUserData();
  initializeNavigation();
  initializeClock();
  initializeTheme();
  initializeDashboard();
  initializeTasks();
  initializeFocus();
  initializeNotes();
  initializeWeather();
  initializeSettings();
  initializeMobileMenu(); // ADD THIS LINE
  
  // Initial data load
  await loadAllData();
});