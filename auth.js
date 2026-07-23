// Initialize Supabase (User needs to replace these placeholders!)
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('errorMsg');
            const loginBtn = document.getElementById('loginBtn');
            
            loginBtn.textContent = 'Signing In...';
            loginBtn.disabled = true;
            errorMsg.style.display = 'none';
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });
            
            if (error) {
                errorMsg.textContent = error.message;
                errorMsg.style.display = 'block';
                loginBtn.textContent = 'Sign In';
                loginBtn.disabled = false;
            } else {
                // Success! Redirect to dashboard
                window.location.href = 'index.html';
            }
        });
    }
});
