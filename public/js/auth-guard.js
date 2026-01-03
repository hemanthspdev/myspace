const user = JSON.parse(localStorage.getItem('user') || 'null');

if (!user) {
  window.location.href = 'login.html';
}