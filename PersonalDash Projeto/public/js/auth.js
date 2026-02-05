// auth.js - Sistema de autenticação seguro para PersonalDash

// ============================================
// 1. CONSTANTES E CONFIGURAÇÕES DE SEGURANÇA
// ============================================

const AUTH_KEY = 'personalDashAuth_v2';
const USERS_KEY = 'personalDashUsers_v2';

// ============================================
// 2. FUNÇÕES DE SEGURANÇA
// ============================================

// Sanitização básica contra XSS
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

// Hash de senha usando Web Crypto API
async function hashPassword(password, salt = 'personalDashSalt_v2') {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + salt);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
        console.error("Erro ao gerar hash:", error);
        throw new Error("Erro ao processar senha");
    }
}

// Verificar força da senha
function checkPasswordStrength(password) {
    const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const passed = Object.values(checks).filter(Boolean).length;

    return {
        strong: passed >= 3,
        score: passed,
        message: passed >= 3 ? "Senha forte!" : "Use maiúsculas, minúsculas, números e símbolos."
    };
}

// ============================================
// 3. FUNÇÃO DE VISIBILIDADE DA SENHA
// ============================================

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // Encontrar o botão de visibilidade correspondente
    const parentDiv = input.parentElement;
    const btn = parentDiv.querySelector('.show-password-btn');

    if (!btn) return;

    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }

    // Focar novamente no input para continuar digitando
    input.focus();
}

// Torna disponível globalmente
window.togglePasswordVisibility = togglePasswordVisibility;

// ============================================
// 4. FUNÇÕES PRINCIPAIS DE AUTENTICAÇÃO
// ============================================

// Verificar autenticação
function isAuthenticated() {
    try {
        const authData = JSON.parse(localStorage.getItem(AUTH_KEY));
        return authData && authData.loggedIn === true;
    } catch (error) {
        console.error("Erro na verificação de autenticação:", error);
        return false;
    }
}

// Login seguro
async function login(username, password) {
    try {
        if (!username || !password) {
            return { success: false, message: "Por favor, preencha todos os campos." };
        }

        const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
        const normalizedUsername = username.trim().toLowerCase();

        // Encontrar usuário
        const user = users.find(u =>
            u.username === normalizedUsername ||
            u.email === normalizedUsername
        );

        if (!user) {
            return { success: false, message: "Usuário não encontrado." };
        }

        // Verificar senha
        const passwordHash = await hashPassword(password);

        if (user.passwordHash === passwordHash) {
            localStorage.setItem(AUTH_KEY, JSON.stringify({
                loggedIn: true,
                userId: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                sessionStart: new Date().toISOString()
            }));

            return { success: true, message: 'Login realizado com sucesso!' };
        } else {
            return { success: false, message: "Senha incorreta. Tente novamente." };
        }
    } catch (error) {
        console.error("Erro no login:", error);
        return { success: false, message: "Erro interno. Tente novamente." };
    }
}

// Registro seguro
async function register(userData) {
    try {
        if (!userData) return { success: false, message: "Dados inválidos." };

        const { name, email, username, password, confirmPassword } = userData;

        // Validações básicas
        if (!name || !email || !username || !password || !confirmPassword) {
            return { success: false, message: "Todos os campos são obrigatórios." };
        }

        if (password !== confirmPassword) {
            return { success: false, message: "As senhas não coincidem." };
        }

        if (password.length < 6) {
            return { success: false, message: "A senha deve ter pelo menos 6 caracteres." };
        }

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedUsername = username.trim().toLowerCase();

        const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];

        // Verificar duplicatas
        const userExists = users.some(u =>
            u.username === normalizedUsername || u.email === normalizedEmail
        );

        if (userExists) {
            return { success: false, message: "Usuário ou e-mail já cadastrado." };
        }

        // Criar hash da senha
        const passwordHash = await hashPassword(password);

        // Criar usuário
        const newUser = {
            id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: name.trim(),
            email: normalizedEmail,
            username: normalizedUsername,
            passwordHash: passwordHash,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));

        return {
            success: true,
            message: "Conta criada com sucesso! Faça login para continuar."
        };

    } catch (error) {
        console.error("Erro no registro:", error);
        return { success: false, message: "Erro ao criar conta. Tente novamente." };
    }
}

// Logout
function logout() {
    localStorage.removeItem(AUTH_KEY);
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 300);
    return false;
}

// ============================================
// 5. FUNÇÕES AUXILIARES
// ============================================

function showMessage(elementId, text, type = "error") {
    const messageDiv = document.getElementById(elementId);
    if (!messageDiv) return;

    const colors = {
        success: { bg: '#d4edda', text: '#155724', border: '#c3e6cb' },
        error: { bg: '#f8d7da', text: '#721c24', border: '#f5c6cb' },
        info: { bg: '#d1ecf1', text: '#0c5460', border: '#bee5eb' }
    };

    const color = colors[type] || colors.error;

    messageDiv.textContent = text;
    messageDiv.style.display = 'block';
    messageDiv.style.backgroundColor = color.bg;
    messageDiv.style.color = color.text;
    messageDiv.style.border = `1px solid ${color.border}`;
    messageDiv.style.padding = '10px 15px';
    messageDiv.style.borderRadius = '5px';
    messageDiv.style.marginBottom = '15px';
    messageDiv.style.textAlign = 'center';
}

// ============================================
// 6. FUNÇÕES DE VALIDAÇÃO EM TEMPO REAL
// ============================================

function validatePasswordMatch() {
    const password = document.getElementById('regPassword')?.value || '';
    const confirmPassword = document.getElementById('regConfirmPassword')?.value || '';
    const messageDiv = document.getElementById('registerMessage');
    const registerBtn = document.getElementById('registerBtn');

    if (!messageDiv || !registerBtn) return;

    if (password && confirmPassword) {
        if (password !== confirmPassword) {
            messageDiv.textContent = "As senhas não coincidem.";
            messageDiv.style.color = '#dc3545';
            messageDiv.style.display = 'block';
            registerBtn.disabled = true;
            registerBtn.style.opacity = '0.5';
        } else {
            messageDiv.style.display = 'none';
            registerBtn.disabled = false;
            registerBtn.style.opacity = '1';
        }
    } else {
        messageDiv.style.display = 'none';
        registerBtn.disabled = false;
        registerBtn.style.opacity = '1';
    }
}

function updatePasswordStrength() {
    const password = document.getElementById('regPassword')?.value || '';
    const strengthDiv = document.getElementById('passwordStrength');
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');

    if (!strengthDiv || !strengthBar || !strengthText) return;

    if (password.length === 0) {
        strengthDiv.style.display = 'none';
        return;
    }

    strengthDiv.style.display = 'block';
    const strength = checkPasswordStrength(password);

    // Reset classes
    strengthDiv.className = 'password-strength';

    // Aplicar classe baseada na força
    if (strength.score <= 2) {
        strengthDiv.classList.add('strength-weak');
        strengthText.textContent = 'Senha fraca';
        strengthBar.style.width = '25%';
        strengthBar.style.backgroundColor = '#dc3545';
    } else if (strength.score === 3) {
        strengthDiv.classList.add('strength-medium');
        strengthText.textContent = 'Senha média';
        strengthBar.style.width = '50%';
        strengthBar.style.backgroundColor = '#ffc107';
    } else if (strength.score === 4) {
        strengthDiv.classList.add('strength-strong');
        strengthText.textContent = 'Senha forte';
        strengthBar.style.width = '75%';
        strengthBar.style.backgroundColor = '#28a745';
    } else {
        strengthDiv.classList.add('strength-very-strong');
        strengthText.textContent = 'Senha muito forte';
        strengthBar.style.width = '100%';
        strengthBar.style.backgroundColor = '#007bff';
    }
}

// ============================================
// 7. INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    console.log("Sistema de autenticação seguro iniciado");

    // 7.1 PÁGINA DE LOGIN
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', async function () {
            const username = document.getElementById('login1')?.value || '';
            const password = document.getElementById('password1')?.value || '';

            const result = await login(username, password);

            if (result.success) {
                showMessage('loginMessage', result.message, 'success');
                setTimeout(() => window.location.href = 'index.html', 1000);
            } else {
                showMessage('loginMessage', result.message, 'error');
            }
        });

        // Enter para login
        document.getElementById('password1')?.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') loginBtn.click();
        });
    }

    // 7.2 PÁGINA DE REGISTRO
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        // Validação de senha em tempo real
        const regPassword = document.getElementById('regPassword');
        const regConfirmPassword = document.getElementById('regConfirmPassword');

        if (regPassword) {
            regPassword.addEventListener('input', updatePasswordStrength);
        }

        if (regConfirmPassword) {
            regConfirmPassword.addEventListener('input', validatePasswordMatch);
        }

        registerBtn.addEventListener('click', async function () {
            const name = document.getElementById('regName')?.value || '';
            const email = document.getElementById('regEmail')?.value || '';
            const username = document.getElementById('regUsername')?.value || '';
            const password = document.getElementById('regPassword')?.value || '';
            const confirmPassword = document.getElementById('regConfirmPassword')?.value || '';

            const userData = { name, email, username, password, confirmPassword };

            // Desabilitar botão durante processamento
            registerBtn.disabled = true;
            registerBtn.textContent = 'Processando...';

            const result = await register(userData);

            if (result.success) {
                showMessage('registerMessage', result.message, 'success');
                setTimeout(() => window.location.href = 'login.html', 2000);
            } else {
                showMessage('registerMessage', result.message, 'error');
                registerBtn.disabled = false;
                registerBtn.textContent = 'Criar Conta';
            }
        });

        // Enter para registrar
        document.getElementById('regConfirmPassword')?.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') registerBtn.click();
        });
    }

    // 7.3 PÁGINA PRINCIPAL - HOTBAR
    const hotbar = document.querySelector('.hotbar');
    if (hotbar && isAuthenticated()) {
        try {
            const authData = JSON.parse(localStorage.getItem(AUTH_KEY));
            const userName = sanitizeInput(authData?.name || authData?.username || 'Usuário');

            hotbar.innerHTML = '';

            const container = document.createElement('div');
            container.style.cssText = 'display: flex; align-items: center; gap: 15px; padding-right: 20px;';

            const greeting = document.createElement('span');
            greeting.style.cssText = 'color: white; font-size: 0.9em;';
            greeting.innerHTML = `Olá, <strong>${userName}</strong>`;

            const logoutButton = document.createElement('button');
            logoutButton.textContent = 'Sair';
            logoutButton.style.cssText = `
                background-color: #dc3545;
                color: white;
                border: none;
                padding: 8px 15px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 0.9em;
            `;

            logoutButton.addEventListener('click', logout);

            container.appendChild(greeting);
            container.appendChild(logoutButton);
            hotbar.appendChild(container);

            const currentPage = window.location.pathname;

            // Se tentar acessar login/register já estando logado
            if (isAuthenticated() && (currentPage.includes('login.html') || currentPage.includes('register.html'))) {
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 100);
            }

            // Se tentar acessar index sem estar logado
            if (!isAuthenticated() && currentPage.includes('index.html')) {
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 100);
            }

        } catch (error) {
            console.error("Erro ao criar hotbar:", error);
        }
    }
});

// ============================================
// 8. EVENT LISTENER GLOBAL PARA BOTÕES DE VISIBILIDADE
// ============================================

document.addEventListener('click', function (event) {
    if (event.target.classList.contains('show-password-btn')) {
        event.preventDefault();

        // Encontrar o input mais próximo
        const parentDiv = event.target.closest('div');
        const input = parentDiv.querySelector('input[type="password"], input[type="text"]');

        if (input) {
            // Alternar visibilidade
            if (input.type === 'password') {
                input.type = 'text';
                event.target.textContent = '🙈';
            } else {
                input.type = 'password';
                event.target.textContent = '👁️';
            }

            // Focar no input
            input.focus();
        }
    }
});

// ===========================================
// ANIMAÇÃO SIMPLES DO FOOTER
// ===========================================

// ===========================================
// ANIMAÇÃO DO FOOTER COM INDICADOR
// ===========================================

document.addEventListener('DOMContentLoaded', function() {
    const footer = document.querySelector('.footer');
    if (!footer) return;
    
    let hideTimeout;
    let isMouseOverFooter = false;
    
    // Inicialmente mostra apenas a linha indicadora
    footer.classList.remove('visible');
    
    // Mostra o footer totalmente quando mouse sobre a linha indicadora
    footer.addEventListener('mouseenter', function() {
        clearTimeout(hideTimeout);
        isMouseOverFooter = true;
        footer.classList.add('visible');
    });
    
    // Esconde o footer quando mouse sai (com delay)
    footer.addEventListener('mouseleave', function() {
        isMouseOverFooter = false;
        hideTimeout = setTimeout(() => {
            if (!isMouseOverFooter) {
                footer.classList.remove('visible');
            }
        }, 800); // Delay maior para evitar fechar muito rápido
    });
    
    // Também mostra quando mouse chega no final da tela
    document.addEventListener('mousemove', function(e) {
        const windowHeight = window.innerHeight;
        const mouseY = e.clientY;
        
        // Se o mouse estiver nos últimos 30px da tela
        if (mouseY > (windowHeight - 30)) {
            clearTimeout(hideTimeout);
            footer.classList.add('visible');
            
            // Se mouse sair da área, esconde após um tempo
            if (!footer.matches(':hover')) {
                hideTimeout = setTimeout(() => {
                    if (!footer.matches(':hover')) {
                        footer.classList.remove('visible');
                    }
                }, 1500);
            }
        }
    });
    
    // Clique na linha indicadora também mostra/esconde
    footer.addEventListener('click', function(e) {
        if (!isMouseOverFooter && e.target === footer) {
            footer.classList.toggle('visible');
        }
    });
});