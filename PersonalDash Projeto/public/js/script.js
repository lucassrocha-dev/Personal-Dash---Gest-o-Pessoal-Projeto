// script.js - PersonalDash Task Manager
// Gerencia tarefas com persistência em localStorage

// ============================================
// 1. SELEÇÃO DE ELEMENTOS DO DOM
// ============================================

const taskInput = document.getElementById("taskInput");
const taskTime = document.getElementById("taskTime");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskList = document.getElementById("taskList");

// ============================================
// 2. FUNÇÕES AUXILIARES
// ============================================

const getUserId = () => {
    try {
        const auth = JSON.parse(localStorage.getItem('personalDashAuth_v2'));
        return auth ? auth.userId : 'guest';
    } catch {
        return 'guest';
    }
};

// ============================================
// 3. VARIÁVEIS GLOBAIS
// ============================================

let tasks = JSON.parse(localStorage.getItem(`personalDashTasks_${getUserId()}`)) || [];

// ============================================
// 4. FUNÇÕES PRINCIPAIS
// ============================================

function addTask() {
    const taskText = taskInput.value.trim();
    const taskTimeValue = taskTime.value.trim();

    if (taskText === "" || taskTimeValue === "") {
        alert("Por favor, preencha tanto a tarefa quanto o horário.");
        return;
    }

    const newTask = {
        id: Date.now(),
        text: taskText,
        time: taskTimeValue,
        completed: false,
        createdAt: new Date().toISOString()
    };

    tasks.push(newTask);
    saveTasksToStorage();
    renderTasks();
    updateTaskCounter();

    taskInput.value = "";
    taskTime.value = "";
    taskInput.focus();
}

function removeTask(taskId) {
    tasks = tasks.filter(task => task.id !== taskId);
    saveTasksToStorage();
    renderTasks();
    updateTaskCounter();
}

function toggleTaskComplete(taskId) {
    const taskIndex = tasks.findIndex(task => task.id === taskId);

    if (taskIndex !== -1) {
        tasks[taskIndex].completed = !tasks[taskIndex].completed;
        saveTasksToStorage();
        renderTasks();
        updateTaskCounter();
    }
}

function saveTasksToStorage() {
    try {
        localStorage.setItem(`personalDashTasks_${getUserId()}`, JSON.stringify(tasks));
    } catch (error) {
        console.error("Erro ao salvar tarefas:", error);
        alert("Não foi possível salvar as tarefas. O localStorage pode estar cheio.");
    }
}

function renderTasks() {
    taskList.innerHTML = '';

    if (tasks.length === 0) {
        taskList.innerHTML = '<li class="empty-message">Nenhuma tarefa cadastrada. Adicione uma acima!</li>';
        return;
    }

    tasks.forEach(task => {
        const li = document.createElement("li");

        if (task.completed) {
            li.classList.add("completed");
        }

        li.innerHTML = `
            <div class="task-content">
                <span class="task-text">${task.text}</span>
                <span class="task-time">${task.time}</span>
            </div>
            <button class="delete-btn" aria-label="Excluir tarefa">X</button>
        `;

        li.dataset.taskId = task.id;

        li.addEventListener("click", (event) => {
            if (!event.target.classList.contains('delete-btn')) {
                toggleTaskComplete(task.id);
            }
        });

        const deleteBtn = li.querySelector('.delete-btn');
        deleteBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            removeTask(task.id);
        });

        taskList.appendChild(li);
    });

    const activeFilterBtn = document.querySelector('.filter-btn.active');
    if (activeFilterBtn) {
        const filterText = activeFilterBtn.textContent.toLowerCase();
        let filterType = 'all';
        if (filterText.includes('pendente')) filterType = 'active';
        if (filterText.includes('completa')) filterType = 'completed';

        setTimeout(() => filterTasks(filterType), 10);
    }

    updateTaskCounter();
}

function updateTaskCounter() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;

    const totalElement = document.getElementById('taskCounter');
    const completedElement = document.getElementById('completedCounter');

    if (totalElement) {
        totalElement.textContent = `${total} ${total === 1 ? 'tarefa' : 'tarefas'}`;
    }

    if (completedElement) {
        completedElement.textContent = `${completed} ${completed === 1 ? 'completa' : 'completas'}`;
    }
}

function updateFilteredCounter(filterType) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;

    let visibleCount = 0;

    switch (filterType) {
        case 'all':
            visibleCount = total;
            break;
        case 'active':
            visibleCount = active;
            break;
        case 'completed':
            visibleCount = completed;
            break;
    }

    const title = document.querySelector('.container-tasks h1');
    if (title && filterType !== 'all') {
        const typeText = filterType === 'active' ? 'pendentes' : 'completas';
        title.textContent = `Minhas Tarefas (${visibleCount} ${typeText})`;
    } else if (title) {
        title.textContent = 'Minhas Tarefas';
    }
}

function filterTasks(filterType) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');

        if (filterType === 'all' && btn.textContent === 'Todas') {
            btn.classList.add('active');
        } else if (filterType === 'active' && btn.textContent === 'Pendentes') {
            btn.classList.add('active');
        } else if (filterType === 'completed' && btn.textContent === 'Completas') {
            btn.classList.add('active');
        }
    });

    if (filterType === 'all') {
        document.querySelectorAll('#taskList li').forEach(li => {
            li.style.display = 'flex';
        });
        updateFilteredCounter('all');
        return;
    }

    document.querySelectorAll('#taskList li').forEach(li => {
        const taskId = parseInt(li.dataset.taskId);
        const task = tasks.find(t => t.id === taskId);

        if (!task) return;

        if (filterType === 'active') {
            li.style.display = !task.completed ? 'flex' : 'none';
        } else if (filterType === 'completed') {
            li.style.display = task.completed ? 'flex' : 'none';
        }
    });

    updateFilteredCounter(filterType);
}

function setupFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach(button => {
        button.addEventListener('click', function () {
            const filterText = this.textContent.toLowerCase();

            let filterValue = 'all';
            if (filterText.includes('pendente')) filterValue = 'active';
            if (filterText.includes('completa')) filterValue = 'completed';

            filterTasks(filterValue);
        });
    });
}

function initApp() {
    tasks = JSON.parse(localStorage.getItem(`personalDashTasks_${getUserId()}`)) || [];

    renderTasks();
    setupFilterButtons();

    addTaskBtn.addEventListener("click", addTask);

    taskInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            addTask();
        }
    });

    taskTime.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            addTask();
        }
    });
}

// ============================================
// 5. INICIALIZAÇÃO DA APLICAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', initApp);