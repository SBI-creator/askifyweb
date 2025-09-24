console.log('signup js loaded')

import {auth} from "./firebase.js";
import {
  createUserWithEmailAndPassword
} from
"https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById('signup-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const email =
  document.getElementById('email').value;
  const password = 
  document.getElementById('password').value;
  createUserWithEmailAndPassword(auth, email, password)
  .then(() => {
    alert("Signup successful! Redirecting to login.... ");
    window.location.href = "login.html";
  })
  .catch(error => {
    alert("Error: " + error.message);
  });
});
  
});
