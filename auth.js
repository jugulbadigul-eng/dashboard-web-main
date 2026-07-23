// Local / Normal Authentication Handler (localStorage)
document.addEventListener('DOMContentLoaded', () => {
  // Ensure initial users list exists in localStorage
  function getUsers() {
    try {
      const raw = localStorage.getItem('app_users');
      return raw ? JSON.parse(raw) : [
        { username: 'admin', email: 'admin@example.com', password: 'password123' }
      ];
    } catch {
      return [{ username: 'admin', email: 'admin@example.com', password: 'password123' }];
    }
  }

  function saveUsers(users) {
    localStorage.setItem('app_users', JSON.stringify(users));
  }

  // Handle Login
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const emailInput = document.getElementById('email').value.trim().toLowerCase();
      const passwordInput = document.getElementById('password').value;
      const errorMsg = document.getElementById('errorMsg');
      const loginBtn = document.getElementById('loginBtn');

      errorMsg.style.display = 'none';

      const users = getUsers();
      const user = users.find(u => (u.email.toLowerCase() === emailInput || u.username.toLowerCase() === emailInput) && u.password === passwordInput);

      if (user) {
        // Store current user session in localStorage
        localStorage.setItem('currentUser', JSON.stringify({
          username: user.username,
          email: user.email
        }));
        window.location.href = 'index.html';
      } else {
        errorMsg.textContent = 'Invalid email/username or password.';
        errorMsg.style.display = 'block';
      }
    });
  }

  // Handle Signup
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const username = document.getElementById('username').value.trim();
      const email = document.getElementById('email').value.trim().toLowerCase();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const errorMsg = document.getElementById('errorMsg');
      const successMsg = document.getElementById('successMsg');
      const signupBtn = document.getElementById('signupBtn');

      errorMsg.style.display = 'none';
      if (successMsg) successMsg.style.display = 'none';

      if (password !== confirmPassword) {
        errorMsg.textContent = 'Passwords do not match.';
        errorMsg.style.display = 'block';
        return;
      }

      const users = getUsers();
      if (users.some(u => u.email.toLowerCase() === email)) {
        errorMsg.textContent = 'An account with this email already exists.';
        errorMsg.style.display = 'block';
        return;
      }

      // Add new user
      const newUser = { username, email, password };
      users.push(newUser);
      saveUsers(users);

      if (successMsg) {
        successMsg.textContent = 'Account created successfully! Redirecting to login...';
        successMsg.style.display = 'block';
      }

      signupBtn.disabled = true;
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    });
  }
});
