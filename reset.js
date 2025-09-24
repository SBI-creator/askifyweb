console.log('reset.js loaded')
import { auth } from "./firebase.js";
import {sendPasswordResetEmail}
from
"https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
document.getElementById('forgotForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = 
  document.getElementById('email').value;
  sendPasswordResetEmail( auth, email)
  .then(() => {
    alert('Password reset email sent !');
  })
  .catch((error) => {
    alert("Error: " + error.message);
  });
});