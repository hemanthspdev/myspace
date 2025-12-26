/* ===================================
   MYSPACE V2 - MAIN JAVASCRIPT
=================================== */

// ===================================
// STATE MANAGEMENT
// ===================================

const AppState = {
  user: null,
  tasks: [],
  notes: [],
  sessions: [],
  settings: {
    theme: 'dark',
    notifications: true,
    focusAlerts: true
  }
};

// ===================================
// LOCAL STORAGE HELPERS
// ===================================

const Storage = {
  get: (key) => {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },
  
  set: (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  },
  
  remove: (key) => {
    localStorage.removeItem(key);
  }
};

// ===================================
// INITIALIZATION
// ===================================

document.addEventListener('DOMContentLoaded', () => {
  loadUserData();
  initializeNavigation();
  initializeClock();
  initializeTheme();
  initializeDashboard();
  initializeTasks();
  initializeFocus();
  initializeNotes();
  initializeWeather();
  initializeSettings();
});

function loadUserData() {
  AppState.user = Storage.get('user');
  AppState.tasks = Storage.get('tasks') || [];
  AppState.notes = Storage.get('notes') || [];
  AppState.sessions = Storage.get('sessions') || [];
  AppState.settings = Storage.get('settings') || AppState.settings;
  
  if (AppState.user) {
    document.getElementById('userName').textContent = AppState.user.name;
    document.getElementById('userAvatar').textContent = AppState.user.name.charAt(0).toUpperCase();
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
  
  themeToggle.addEventListener('click', () => {
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
    
    Storage.set('settings', AppState.settings);
    showToast('Theme updated!', 'success');
  });
}

// ===================================
// DASHBOARD
// ===================================

function initializeDashboard() {
  refreshDashboard();
  initializeQuickFocus();
}

function refreshDashboard() {
  updateStats();
  updateTodayTasks();
  updateNotesPreview();
}

function updateStats() {
  const totalTasks = AppState.tasks.length;
  const completedTasks = AppState.tasks.filter(t => t.completed).length;
  const todaySessions = AppState.sessions.filter(s => {
    const sessionDate = new Date(s.date).toDateString();
    const today = new Date().toDateString();
    return sessionDate === today;
  });
  const focusMinutes = todaySessions.reduce((sum, s) => sum + s.duration, 0);
  
  document.getElementById('totalTasks').textContent = totalTasks;
  document.getElementById('completedTasks').textContent = completedTasks;
  document.getElementById('focusHours').textContent = `${Math.floor(focusMinutes / 60)}h ${focusMinutes % 60}m`;
  
  // Update task badge
  const pendingTasks = AppState.tasks.filter(t => !t.completed).length;
  document.getElementById('taskBadge').textContent = pendingTasks;
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
    <div class="task-item" onclick="toggleTaskQuick('${task.id}')">
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
    <div class="note-preview-item" onclick="editNote('${note.id}')">
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

function completeQuickFocus(startTime) {
  clearInterval(quickFocusTimer);
  quickFocusRunning = false;
  
  // Save session
  const session = {
    id: Date.now().toString(),
    task: 'Quick Focus',
    duration: 25,
    date: new Date().toISOString(),
    startTime: startTime.toISOString(),
    endTime: new Date().toISOString()
  };
  
  AppState.sessions.push(session);
  Storage.set('sessions', AppState.sessions);
  
  // Reset UI
  resetQuickFocus();
  
  // Show completion
  showToast('🎉 Focus session complete!', 'success');
  playCompletionSound();
  
  // Update stats
  updateStats();
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
    const task = AppState.tasks.find(t => t.id === taskId);
    if (task) {
      document.getElementById('taskTitleInput').value = task.title;
      document.getElementById('taskDescInput').value = task.description || '';
      document.getElementById('taskDateInput').value = task.date || '';
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

function saveTask() {
  const title = document.getElementById('taskTitleInput').value.trim();
  if (!title) {
    showToast('Please enter a task title', 'error');
    return;
  }
  
  const task = {
    id: currentTaskId || Date.now().toString(),
    title,
    description: document.getElementById('taskDescInput').value.trim(),
    date: document.getElementById('taskDateInput').value,
    time: document.getElementById('taskTimeInput').value,
    priority: document.getElementById('taskPriorityInput').value,
    completed: false,
    createdAt: currentTaskId ? AppState.tasks.find(t => t.id === currentTaskId).createdAt : new Date().toISOString()
  };
  
  if (currentTaskId) {
    const index = AppState.tasks.findIndex(t => t.id === currentTaskId);
    AppState.tasks[index] = task;
    showToast('Task updated!', 'success');
  } else {
    AppState.tasks.unshift(task);
    showToast('Task created!', 'success');
    createConfetti();
  }
  
  Storage.set('tasks', AppState.tasks);
  closeModal('taskModal');
  renderTasks();
  updateStats();
  updateTodayTasks();
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
        <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask('${task.id}')">
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
        <button onclick="openTaskModal('${task.id}')" class="btn-icon-small">✏️</button>
        <button onclick="deleteTask('${task.id}')" class="btn-icon-small">🗑️</button>
      </div>
    </div>
  `).join('');
}

function filterTasks(filter) {
  renderTasks(filter);
}

function toggleTask(taskId) {
  const task = AppState.tasks.find(t => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    Storage.set('tasks', AppState.tasks);
    renderTasks();
    updateStats();
    updateTodayTasks();
    
    if (task.completed) {
      showToast('Task completed! 🎉', 'success');
      createConfetti();
    }
  }
}

function toggleTaskQuick(taskId) {
  toggleTask(taskId);
}

window.toggleTaskQuick = toggleTaskQuick;

function deleteTask(taskId) {
  if (confirm('Are you sure you want to delete this task?')) {
    AppState.tasks = AppState.tasks.filter(t => t.id !== taskId);
    Storage.set('tasks', AppState.tasks);
    renderTasks();
    updateStats();
    updateTodayTasks();
    showToast('Task deleted', 'success');
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

function completeMainFocus(startTime) {
  clearInterval(mainFocusTimer);
  mainFocusRunning = false;
  
  const taskName = document.getElementById('sessionTask').value || 'Focus Session';
  const duration = Math.floor(mainFocusTotal / 60);
  
  // Save session
  const session = {
    id: Date.now().toString(),
    task: taskName,
    duration,
    date: new Date().toISOString(),
    startTime: startTime.toISOString(),
    endTime: new Date().toISOString()
  };
  
  AppState.sessions.push(session);
  Storage.set('sessions', AppState.sessions);
  
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
}

function updateMainFocusDisplay() {
  const minutes = Math.floor(mainFocusTimeLeft / 60);
  const seconds = String(mainFocusTimeLeft % 60).padStart(2, '0');
  document.getElementById('mainTimer').textContent = `${minutes}:${seconds}`;
}

function updateTimerProgress() {
  const progress = ((mainFocusTotal - mainFocusTimeLeft) / mainFocusTotal) * 565; // 2πr where r=90
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
    const note = AppState.notes.find(n => n.id === noteId);
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

function saveNote() {
  const title = document.getElementById('noteTitleInput').value.trim();
  const content = document.getElementById('noteContentInput').value.trim();
  
  if (!title) {
    showToast('Please enter a note title', 'error');
    return;
  }
  
  const note = {
    id: currentNoteId || Date.now().toString(),
    title,
    content,
    createdAt: currentNoteId ? AppState.notes.find(n => n.id === currentNoteId).createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  if (currentNoteId) {
    const index = AppState.notes.findIndex(n => n.id === currentNoteId);
    AppState.notes[index] = note;
    showToast('Note updated!', 'success');
  } else {
    AppState.notes.unshift(note);
    showToast('Note created!', 'success');
  }
  
  Storage.set('notes', AppState.notes);
  closeModal('noteModal');
  renderNotes();
  updateNotesPreview();
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
    <div class="note-card" onclick="editNote('${note.id}')">
      <h4 class="note-card-title">${note.title}</h4>
      <p class="note-card-content">${note.content.substring(0, 200)}${note.content.length > 200 ? '...' : ''}</p>
      <div class="note-card-footer">
        <span class="note-date">${new Date(note.updatedAt).toLocaleDateString()}</span>
        <div class="note-actions" onclick="event.stopPropagation()">
          <button onclick="deleteNote('${note.id}')" class="btn-icon-small">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

function editNote(noteId) {
  openNoteModal(noteId);
}

function deleteNote(noteId) {
  if (confirm('Are you sure you want to delete this note?')) {
    AppState.notes = AppState.notes.filter(n => n.id !== noteId);
    Storage.set('notes', AppState.notes);
    renderNotes();
    updateNotesPreview();
    showToast('Note deleted', 'success');
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
  const savedCity = Storage.get('weatherCity');
  if (savedCity) {
    fetchWeather(savedCity);
  }
}

function openWeatherModal() {
  const modal = document.getElementById('weatherModal');
  modal.classList.add('active');
  
  const savedCity = Storage.get('weatherCity');
  if (savedCity) {
    document.getElementById('cityInput').value = savedCity;
  }
}

window.openWeatherModal = openWeatherModal;

function saveLocation() {
  const city = document.getElementById('cityInput').value.trim();
  if (!city) {
    showToast('Please enter a city name', 'error');
    return;
  }
  
  fetchWeather(city);
  Storage.set('weatherCity', city);
  closeModal('weatherModal');
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
  themeSelect.addEventListener('change', (e) => {
    AppState.settings.theme = e.target.value;
    Storage.set('settings', AppState.settings);
    
    if (e.target.value === 'light') {
      document.body.classList.add('light-mode');
    } else if (e.target.value === 'dark') {
      document.body.classList.remove('light-mode');
    }
    
    showToast('Theme updated!', 'success');
  });
  
  taskNotifications.addEventListener('change', (e) => {
    AppState.settings.notifications = e.target.checked;
    Storage.set('settings', AppState.settings);
    showToast('Notification settings updated!', 'success');
  });
  
  focusAlerts.addEventListener('change', (e) => {
    AppState.settings.focusAlerts = e.target.checked;
    Storage.set('settings', AppState.settings);
    showToast('Alert settings updated!', 'success');
  });
  
  clearDataBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      localStorage.clear();
      showToast('All data cleared. Reloading...', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    }
  });
}

// ===================================
// ANALYTICS
// ===================================

function renderAnalytics() {
  // Simple analytics for now
  const score = calculateProductivityScore();
  document.getElementById('productivityScore').innerHTML = `
    <span class="score-value">${score}</span>
    <span class="score-label">%</span>
  `;
}

function calculateProductivityScore() {
  const totalTasks = AppState.tasks.length;
  if (totalTasks === 0) return 0;
  
  const completedTasks = AppState.tasks.filter(t => t.completed).length;
  return Math.round((completedTasks / totalTasks) * 100);
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
    Storage.remove('user');
    window.location.href = 'login.html';
  }
});