/* ===================================
   MYSPACE V2 - AUTHENTICATION (MongoDB)
=================================== */

console.log('Auth.js loaded');

// Wait for DOM and API to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing auth...');
  
  // Check if API is available
  if (typeof API === 'undefined') {
    console.error('API not loaded! Make sure api.js is loaded before auth.js');
    alert('Error: API not loaded. Please check the console.');
    return;
  }
  
  console.log('API is available');
  
  // Check if already logged in
  const token = localStorage.getItem('token');
  if (token) {
    console.log('Token found, verifying...');
    API.getCurrentUser()
      .then(() => {
        console.log('Token valid, redirecting to dashboard');
        window.location.href = 'index.html';
      })
      .catch(() => {
        console.log('Token invalid, clearing...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      });
  }
  
  initializeAuth();
});

function initializeAuth() {
  console.log('Initializing auth forms...');
  
  // DOM Elements
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const showSignupLink = document.getElementById('showSignup');
  const showLoginLink = document.getElementById('showLogin');
  const loginFormElement = document.getElementById('loginFormElement');
  const signupFormElement = document.getElementById('signupFormElement');
  
  // Check if elements exist
  if (!loginForm || !signupForm || !showSignupLink || !showLoginLink) {
    console.error('Auth form elements not found!');
    return;
  }
  
  console.log('All form elements found');
  
  // Switch between login and signup
  showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('Switching to signup form');
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
  });
  
  showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('Switching to login form');
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  });
  
  // Login
  loginFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Login form submitted');
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    console.log('Login attempt for:', email);
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';
    
    try {
      console.log('Calling API.login...');
      const response = await API.login(email, password);
      console.log('Login successful:', response);
      
      // Store token and user
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      showMessage('Login successful! Redirecting...', 'success');
      
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    } catch (error) {
      console.error('Login failed:', error);
      showMessage(error.message || 'Login failed. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
  
  // Signup
  signupFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Signup form submitted');
    
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    
    console.log('Signup attempt for:', email);
    
    if (password.length < 6) {
      showMessage('Password must be at least 6 characters', 'error');
      return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';
    
    try {
      console.log('Calling API.register...');
      const response = await API.register(name, email, password);
      console.log('Registration successful:', response);
      
      // Store token and user
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      showMessage('Account created! Redirecting...', 'success');
      
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    } catch (error) {
      console.error('Registration failed:', error);
      showMessage(error.message || 'Registration failed. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
  
  console.log('Auth initialization complete');
}

// Show message
function showMessage(message, type) {
  console.log(`Showing message: ${message} (${type})`);
  
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
if (particles) {
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
}

console.log('Auth.js fully loaded');