/* ===================================
   MYSPACE V2 - AUTHENTICATION
=================================== */

// Check if already logged in
const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
if (currentUser) {
  window.location.href = 'index.html';
}

// DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignupLink = document.getElementById('showSignup');
const showLoginLink = document.getElementById('showLogin');
const loginFormElement = document.getElementById('loginFormElement');
const signupFormElement = document.getElementById('signupFormElement');

// Switch between login and signup
showSignupLink.addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.classList.add('hidden');
  signupForm.classList.remove('hidden');
});

showLoginLink.addEventListener('click', (e) => {
  e.preventDefault();
  signupForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
});

// Login
loginFormElement.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const user = users.find(u => u.email === email);
  
  if (!user) {
    showMessage('No account found with this email', 'error');
    return;
  }
  
  const passwordHash = await hashPassword(password);
  if (user.passwordHash !== passwordHash) {
    showMessage('Incorrect password', 'error');
    return;
  }
  
  // Login successful
  const userData = {
    id: user.id,
    name: user.name,
    email: user.email,
    loginAt: new Date().toISOString()
  };
  
  localStorage.setItem('user', JSON.stringify(userData));
  
  showMessage('Login successful! Redirecting...', 'success');
  
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1000);
});

// Signup
signupFormElement.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim().toLowerCase();
  const password = document.getElementById('signupPassword').value;
  
  if (password.length < 6) {
    showMessage('Password must be at least 6 characters', 'error');
    return;
  }
  
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  
  if (users.find(u => u.email === email)) {
    showMessage('Email already registered', 'error');
    return;
  }
  
  const passwordHash = await hashPassword(password);
  
  const newUser = {
    id: Date.now().toString(),
    name,
    email,
    passwordHash,
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  localStorage.setItem('users', JSON.stringify(users));
  
  // Auto login
  const userData = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    loginAt: new Date().toISOString()
  };
  
  localStorage.setItem('user', JSON.stringify(userData));
  
  showMessage('Account created! Redirecting...', 'success');
  
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1000);
});

// Hash password
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Show message
function showMessage(message, type) {
  const existingMsg = document.querySelector('.auth-message');
  if (existingMsg) existingMsg.remove();
  
  const messageDiv = document.createElement('div');
  messageDiv.className = 'auth-message';
  messageDiv.textContent = message;
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white;
    border-radius: 12px;
    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    animation: slideInDown 0.3s ease;
  `;
  
  document.body.appendChild(messageDiv);
  
  setTimeout(() => {
    messageDiv.style.animation = 'slideOutUp 0.3s ease';
    setTimeout(() => messageDiv.remove(), 300);
  }, 3000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInDown {
    from {
      opacity: 0;
      transform: translateY(-100px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideOutUp {
    to {
      opacity: 0;
      transform: translateY(-100px);
    }
  }
`;
document.head.appendChild(style);

// Create particles background
const particles = document.getElementById('particles');
for (let i = 0; i < 50; i++) {
  const particle = document.createElement('div');
  particle.style.cssText = `
    position: absolute;
    width: ${2 + Math.random() * 4}px;
    height: ${2 + Math.random() * 4}px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 50%;
    left: ${Math.random() * 100}%;
    top: ${Math.random() * 100}%;
    animation: particleFloat ${5 + Math.random() * 10}s infinite;
  `;
  particles.appendChild(particle);
}

const particleStyle = document.createElement('style');
particleStyle.textContent = `
  @keyframes particleFloat {
    0%, 100% {
      transform: translateY(0) translateX(0);
      opacity: 0;
    }
    10%, 90% {
      opacity: 1;
    }
    50% {
      transform: translateY(-100px) translateX(${Math.random() * 100 - 50}px);
    }
  }
`;
document.head.appendChild(particleStyle);