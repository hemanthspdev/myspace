/* ===================================
   MYSPACE V2 - AUTH GUARD
   Include this on all protected pages
=================================== */

const user = JSON.parse(localStorage.getItem('user') || 'null');

if (!user) {
  window.location.href = 'login.html';
}