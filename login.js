console.log('login js loaded')
import { auth } from "./firebase.js";
import {signInWithEmailAndPassword}
from
"https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const email =
  document.getElementById('email').value;
  const password =
  document.getElementById('password').value;
  signInWithEmailAndPassword(auth, email, password)
  .then(() => {
    alert("Login successful! Redirecting to dashboard....");
    window.location.href =
    "dashboard.html";
  })
  .catch(error => {
    alert("Error: " + error.message);
  });
});