// OpenClaw Mission Control - Main JS

document.addEventListener("DOMContentLoaded", () => {
    // === DOM Elements ===
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const toggleThemeBtn = document.getElementById('toggle-theme');

    const contextSwitcher = document.getElementById('context-switcher');
    const navMissionControl = document.getElementById('nav-mission-control');
    const navLifeOs = document.getElementById('nav-lifeos');
    
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');

    const keyUsageEl = document.getElementById('key-usage');
    const totalCreditsEl = document.getElementById('total-credits');
    const refreshBtn = document.getElementById('refresh-btn');
    const tableBody = document.getElementById('activity-table-body');
    const timeFilter = document.getElementById('time-filter');
    const costTitle = document.getElementById('cost-title');
    const tokensTitle = document.getElementById('tokens-title');

    const fileTabs = document.querySelectorAll('.file-tab');
    const fileContent = document.getElementById('file-content');
    const sidebarToggleIcon = toggleSidebarBtn?.querySelector('svg');

    let currentMetrics = null;

    // === Navigation Logic ===
    function switchView(targetId) {
        viewSections.forEach(v => {
            v.classList.remove('block');
            v.classList.add('hidden');
        });
        const targetView = document.getElementById(targetId);
        if (targetView) {
            targetView.classList.remove('hidden');
            targetView.classList.add('block');
        }
        navItems.forEach(n => {
            if (n.dataset.target === targetId) {
                n.classList.add('bg-gray-200', 'dark:bg-white/10', 'text-black', 'dark:text-white');
            } else {
                n.classList.remove('bg-gray-200', 'dark:bg-white/10', 'text-black', 'dark:text-white');
            }
        });
    }

    if (contextSwitcher) {
        contextSwitcher.addEventListener('change', (e) => {
            if (e.target.value === 'mission-control') {
                navMissionControl?.classList.remove('hidden');
                navLifeOs?.classList.add('hidden');
                switchView('view-usage');
            } else {
                navMissionControl?.classList.add('hidden');
                navLifeOs?.classList.remove('hidden');
                switchView('view-goals');
            }
        });
    }

    navItems.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(btn.dataset.target);
        });
    });

    // === Theme Logic ===
    if (toggleThemeBtn) {
        toggleThemeBtn.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        });
    }

    // Sidebar toggle
    if (toggleSidebarBtn && sidebar) {
        toggleSidebarBtn.addEventListener('click', () => {
            const isCollapsed = sidebar.classList.toggle('collapsed');
            toggleSidebarBtn.setAttribute('aria-expanded', String(!isCollapsed));
        });
    }

    // === Data Logic ===
    async function fetchData(silent = false) {
        try {
            const res = await fetch('/api/usage');
            if (!res.ok) throw new Error(`Usage request failed: ${res.status}`);
            const data = await res.json();
            currentMetrics = data.metrics || null;
            updateMetricsDisplay();
            
            if (tableBody) {
                const rows = Array.isArray(data.allActivity) ? data.allActivity : [];
                tableBody.innerHTML = rows.map(msg => `
                    <tr class="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td class="px-5 py-3 text-xs text-gray-500">${new Date(msg.timestamp).toLocaleString()}</td>
                        <td class="px-5 py-3 font-medium">${msg.label}</td>
                        <td class="px-5 py-3 text-xs text-gray-500">${msg.model}</td>
                        <td class="px-5 py-3 text-right">${Number(msg.tokens || 0).toLocaleString()}</td>
                        <td class="px-5 py-3 text-right font-bold">$${Number(msg.cost || 0).toFixed(2)}</td>
                    </tr>
                `).join('') || '<tr><td colspan="5" class="px-5 py-6 text-center text-gray-500">No usage data yet.</td></tr>';
            }
        } catch (e) {
            console.error("Fetch error:", e);
            if (tableBody && !silent) {
                tableBody.innerHTML = '<tr><td colspan="5" class="px-5 py-6 text-center text-red-500">Failed to load usage data.</td></tr>';
            }
        }
    }

    function updateMetricsDisplay() {
        if (!currentMetrics) return;
        const val = timeFilter?.value || 'today';
        const stats = currentMetrics[val] || currentMetrics.lifetime;
        if (keyUsageEl) keyUsageEl.innerText = `$${stats.cost.toFixed(2)}`;
        if (totalCreditsEl) totalCreditsEl.innerText = stats.tokens.toLocaleString();
    }

    // === File Viewer Logic ===
    fileTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            fileTabs.forEach(t => {
                t.classList.remove('active-tab', 'border-black', 'text-black', 'dark:border-white', 'dark:text-white');
                t.classList.add('border-transparent', 'text-gray-500', 'dark:text-gray-400');
            });
            tab.classList.remove('border-transparent', 'text-gray-500', 'dark:text-gray-400');
            tab.classList.add('active-tab', 'border-black', 'text-black', 'dark:border-white', 'dark:text-white');
            
            loadFile(tab.dataset.file);
        });
    });

    async function loadFile(filename, silent = false) {
        if (!fileContent) return;
        if (!silent) {
            fileContent.innerText = 'Loading...';
            fileContent.classList.add('opacity-50');
        }
        try {
            const res = await fetch('/api/files/' + filename);
            const data = await res.json();
            if (res.ok) {
                if (fileContent.innerText !== data.content) {
                    fileContent.innerText = data.content;
                }
            } else {
                if (!silent) fileContent.innerText = 'Error: ' + (data.error || 'File empty');
            }
        } catch (e) {
            if (!silent) fileContent.innerText = 'Failed to load file.';
        } finally {
            if (!silent) fileContent.classList.remove('opacity-50');
        }
    }

    // === Fleet Logic ===
    const refreshFleetBtn = document.getElementById('refresh-fleet-btn');
    const refreshOrgBtn = document.getElementById('refresh-org-btn');
    const refreshCalendarBtn = document.getElementById('refresh-calendar-btn');
    const calendarGrid = document.getElementById('calendar-grid');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskModal = document.getElementById('task-modal');
    const taskModalContent = document.getElementById('task-modal-content');
    const taskForm = document.getElementById('task-form');
    const cancelTaskBtn = document.getElementById('cancel-task-btn');
    const taskTitleInput = document.getElementById('task-title-input');
    const addLogBtn = document.getElementById('add-log-btn');
    const newLogInput = document.getElementById('new-log-input');

    let fleetData = { agents: [], activity: [], tasks: [], logs: [], orgChart: [] };

    if (refreshFleetBtn) refreshFleetBtn.addEventListener('click', loadFleet);
    if (refreshOrgBtn) refreshOrgBtn.addEventListener('click', loadFleet);
    if (refreshCalendarBtn) refreshCalendarBtn.addEventListener('click', loadCalendar);
    if (addTaskBtn) addTaskBtn.addEventListener('click', openTaskModal);
    if (cancelTaskBtn) cancelTaskBtn.addEventListener('click', closeTaskModal);
    if (taskModal) taskModal.addEventListener('click', (e) => { if (e.target === taskModal) closeTaskModal(); });
    if (taskForm) taskForm.addEventListener('submit', addNewTask);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && taskModal && !taskModal.classList.contains('hidden')) closeTaskModal();
    });

    async function loadFleet(silent = false) {
        if (!refreshFleetBtn) return;
        if (!silent) refreshFleetBtn.innerText = 'Loading...';
        try {
            const res = await fetch('/api/fleet');
            if (res.ok) {
                fleetData = await res.json();
                renderFleet();
                renderOrgChart();
                renderCalendar();
            }
        } catch(e) { console.error(e); }
        if (!silent) refreshFleetBtn.innerText = 'Refresh Board';
        if (!silent && refreshOrgBtn) refreshOrgBtn.innerText = 'Refresh Org';
    }

    async function loadCalendar(silent = false) {
        if (!calendarGrid) return;
        if (refreshCalendarBtn && !silent) refreshCalendarBtn.innerText = 'Loading...';
        try {
            const [fleetRes, cronRes] = await Promise.all([fetch('/api/fleet'), fetch('/api/cron')]);
            if (fleetRes.ok) fleetData = await fleetRes.json();
            if (cronRes.ok) {
                const data = await cronRes.json();
                cronJobs = Array.isArray(data.jobs) ? data.jobs : [];
            }
            renderCalendar();
        } catch(e) { console.error(e); }
        if (refreshCalendarBtn && !silent) refreshCalendarBtn.innerText = 'Refresh Calendar';
    }

    function renderFleet() {
        const todos = fleetData.tasks.filter(t => t.status === 'todo');
        const inprog = fleetData.tasks.filter(t => t.status === 'inprogress');
        const dones = fleetData.tasks.filter(t => t.status === 'done');
        const total = fleetData.tasks.length;
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const day = now.getDay() || 7;
        const startOfWeek = startOfToday - ((day - 1) * 86400000);
        const thisWeek = fleetData.tasks.filter(t => Number(t.timestamp || 0) >= startOfWeek).length;
        const completion = total ? Math.round((dones.length / total) * 100) : 0;
        
        if(document.getElementById('count-todo')) document.getElementById('count-todo').innerText = todos.length;
        if(document.getElementById('count-inprogress')) document.getElementById('count-inprogress').innerText = inprog.length;
        if(document.getElementById('count-done')) document.getElementById('count-done').innerText = dones.length;
        if(document.getElementById('metric-this-week')) document.getElementById('metric-this-week').innerText = thisWeek;
        if(document.getElementById('metric-in-progress')) document.getElementById('metric-in-progress').innerText = inprog.length;
        if(document.getElementById('metric-total')) document.getElementById('metric-total').innerText = total;
        if(document.getElementById('metric-completion')) document.getElementById('metric-completion').innerText = `${completion}%`;

        const renderTask = (t) => {
            const title = taskTitle(t);
            const description = taskDescription(t);
            const tag = taskTag(t);
            const lastActive = formatRelativeTime(t.lastActive || t.updatedAt || t.timestamp);
            const canStart = t.status === 'todo';
            const canComplete = t.status === 'inprogress';
            return `
                <div class="task-card bg-white dark:bg-[#212121] border border-gray-200 dark:border-white/10 rounded-xl p-4 text-sm mb-3 min-w-0 overflow-hidden shadow-sm" data-task-id="${escapeHtml(t.id)}">
                    <div class="flex items-start gap-2 mb-3">
                        <span class="mt-1.5 h-2 w-2 rounded-full ${t.status === 'done' ? 'bg-emerald-500' : t.status === 'inprogress' ? 'bg-indigo-500' : 'bg-red-500'} shrink-0"></span>
                        <div class="min-w-0 flex-1">
                            <div class="task-title font-semibold text-gray-900 dark:text-gray-100 break-words leading-snug">${escapeHtml(title)}</div>
                            ${description ? `<p class="task-description text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed break-words">${escapeHtml(description)}</p>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center justify-between gap-3 text-xs">
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="task-avatar h-7 w-7 rounded-full bg-emerald-900/10 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-semibold shrink-0">${escapeHtml(String(t.assignee || 'A').charAt(0).toUpperCase())}</span>
                            <span class="task-tag px-2 py-1 rounded-full bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-300 truncate">${escapeHtml(tag)}</span>
                        </div>
                        <span class="text-gray-400 dark:text-gray-500 whitespace-nowrap">${escapeHtml(lastActive)}</span>
                    </div>
                    <div class="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
                        ${canStart ? `<button class="task-action-btn task-start-btn text-xs px-2.5 py-1 rounded bg-black text-white dark:bg-white dark:text-black" data-task-id="${escapeHtml(t.id)}">Start</button>` : ''}
                        ${canComplete ? `<button class="task-action-btn task-complete-btn text-xs px-2.5 py-1 rounded bg-emerald-600 text-white" data-task-id="${escapeHtml(t.id)}">Complete</button>` : ''}
                        <button class="task-action-btn task-delete-btn text-xs px-2.5 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10" data-task-id="${escapeHtml(t.id)}">Delete</button>
                    </div>
                </div>
            `;
        };
        
        if(document.getElementById('tasks-todo')) document.getElementById('tasks-todo').innerHTML = todos.map(renderTask).join('');
        if(document.getElementById('tasks-inprogress')) document.getElementById('tasks-inprogress').innerHTML = inprog.map(renderTask).join('');
        if(document.getElementById('tasks-done')) document.getElementById('tasks-done').innerHTML = dones.map(renderTask).join('');
        attachTaskActionHandlers();
    }

    function attachTaskActionHandlers() {
        document.querySelectorAll('.task-start-btn').forEach(btn => {
            btn.addEventListener('click', () => updateTaskStatus(btn.dataset.taskId, 'inprogress'));
        });
        document.querySelectorAll('.task-complete-btn').forEach(btn => {
            btn.addEventListener('click', () => updateTaskStatus(btn.dataset.taskId, 'done'));
        });
        document.querySelectorAll('.task-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteTask(btn.dataset.taskId));
        });
    }

    function renderCalendar() {
        if (!calendarGrid) return;
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const weekDates = currentWeekDates();
        const eventsByDay = days.map(() => []);

        (Array.isArray(fleetData.tasks) ? fleetData.tasks : []).forEach(task => {
            const dayIndex = scheduledDayIndex(task);
            if (dayIndex === null) return;
            eventsByDay[dayIndex].push({
                title: taskTitle(task),
                description: taskDescription(task),
                tag: taskTag(task),
                time: timeRange(task.startTime, task.endTime),
                status: task.status || 'todo',
                source: 'task'
            });
        });

        (Array.isArray(cronJobs) ? cronJobs : []).filter(job => job.enabled !== false).forEach(job => {
            cronDays(job).forEach(dayIndex => {
                if (dayIndex < 0 || dayIndex > 6) return;
                eventsByDay[dayIndex].push({
                    title: job.name || 'Scheduled job',
                    description: jobMessage(job) || scheduleLabel(job.schedule || {}),
                    tag: 'Recurring',
                    time: cronTime(job),
                    status: 'scheduled',
                    source: 'cron'
                });
            });
        });

        calendarGrid.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-white/10">
                ${days.map((day, index) => `
                    <div class="calendar-day min-h-[420px] bg-white dark:bg-[#171717]">
                        <div class="calendar-day-header sticky top-0 z-10 bg-gray-50/95 dark:bg-[#111]/95 backdrop-blur px-4 py-3 border-b border-gray-200 dark:border-white/10">
                            <div class="text-sm font-semibold text-gray-900 dark:text-white">${day}</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">${weekDates[index]}</div>
                        </div>
                        <div class="p-3 space-y-3">
                            ${eventsByDay[index].sort(compareCalendarEvents).map(calendarBlock).join('') || '<div class="text-xs text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-white/10 rounded-xl p-4 text-center">No scheduled tasks</div>'}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function currentWeekDates() {
        const now = new Date();
        const day = now.getDay() || 7;
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day - 1));
        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        });
    }

    function scheduledDayIndex(task = {}) {
        if (task.scheduleDay !== undefined && task.scheduleDay !== null && task.scheduleDay !== '') {
            const n = Number(task.scheduleDay);
            return Number.isInteger(n) && n >= 0 && n <= 6 ? n : null;
        }
        if (task.scheduledDate) {
            const date = new Date(task.scheduledDate);
            if (!Number.isNaN(date.getTime())) return (date.getDay() + 6) % 7;
        }
        return null;
    }

    function timeRange(start, end) {
        if (start && end) return `${start}–${end}`;
        if (start) return start;
        return 'Any time';
    }

    function cronTime(job = {}) {
        const parts = String(job.schedule?.expr || '').trim().split(/\s+/);
        if (parts.length < 2) return scheduleLabel(job.schedule || {});
        const [minute, hour] = parts;
        if (!/^\d+$/.test(minute) || !/^\d+$/.test(hour)) return scheduleLabel(job.schedule || {});
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }

    function cronDays(job = {}) {
        const expr = String(job.schedule?.expr || '').trim();
        const parts = expr.split(/\s+/);
        if (parts.length < 5) return [];
        const dayPart = parts[4];
        if (dayPart === '*') return [0, 1, 2, 3, 4, 5, 6];
        return dayPart.split(',').flatMap(part => {
            if (part === '0' || part === '7') return [6];
            const n = Number(part);
            return Number.isInteger(n) && n >= 1 && n <= 6 ? [n - 1] : [];
        });
    }

    function compareCalendarEvents(a, b) {
        return String(a.time || '').localeCompare(String(b.time || '')) || String(a.title || '').localeCompare(String(b.title || ''));
    }

    function calendarBlock(event) {
        const colour = calendarColour(event.tag, event.source);
        return `
            <div class="calendar-block ${colour.bg} ${colour.text} ${colour.border} border rounded-xl p-3 shadow-sm">
                <div class="text-xs font-medium opacity-80 mb-1">${escapeHtml(event.time || 'Any time')}</div>
                <div class="font-semibold text-sm leading-snug break-words">${escapeHtml(event.title)}</div>
                ${event.description ? `<div class="text-xs opacity-80 mt-2 line-clamp-3 break-words">${escapeHtml(event.description)}</div>` : ''}
                <div class="mt-3 flex items-center justify-between gap-2">
                    <span class="text-[11px] px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20">${escapeHtml(event.tag || 'General')}</span>
                    <span class="text-[11px] opacity-70">${escapeHtml(event.status || '')}</span>
                </div>
            </div>
        `;
    }

    function calendarColour(tag = '', source = 'task') {
        const key = String(tag || '').toLowerCase();
        if (source === 'cron' || key.includes('recurring')) return { bg: 'bg-sky-50 dark:bg-sky-500/15', text: 'text-sky-900 dark:text-sky-100', border: 'border-sky-200 dark:border-sky-400/20' };
        if (key.includes('youtube')) return { bg: 'bg-pink-50 dark:bg-pink-500/15', text: 'text-pink-900 dark:text-pink-100', border: 'border-pink-200 dark:border-pink-400/20' };
        if (key.includes('coding')) return { bg: 'bg-indigo-50 dark:bg-indigo-500/15', text: 'text-indigo-900 dark:text-indigo-100', border: 'border-indigo-200 dark:border-indigo-400/20' };
        if (key.includes('marketing')) return { bg: 'bg-amber-50 dark:bg-amber-500/15', text: 'text-amber-900 dark:text-amber-100', border: 'border-amber-200 dark:border-amber-400/20' };
        if (key.includes('lifeos')) return { bg: 'bg-emerald-50 dark:bg-emerald-500/15', text: 'text-emerald-900 dark:text-emerald-100', border: 'border-emerald-200 dark:border-emerald-400/20' };
        return { bg: 'bg-gray-100 dark:bg-white/10', text: 'text-gray-900 dark:text-gray-100', border: 'border-gray-200 dark:border-white/10' };
    }

    async function updateTaskStatus(taskId, status) {
        const task = fleetData.tasks.find(t => t.id === taskId);
        if (!task) return;
        const now = Date.now();
        task.status = status;
        task.updatedAt = now;
        task.lastActive = now;
        fleetData.activity = Array.isArray(fleetData.activity) ? fleetData.activity : [];
        fleetData.activity.unshift({ agent: 'User', action: `${status === 'inprogress' ? 'Started' : 'Completed'} task: ${task.title}`, timestamp: now });
        renderFleet();
        try {
            await saveFleetData();
        } catch (e) {
            console.error(e);
            alert('Could not save the task update.');
        }
    }

    async function deleteTask(taskId) {
        const task = fleetData.tasks.find(t => t.id === taskId);
        if (!task) return;
        if (!confirm(`Delete task: ${taskTitle(task)}?`)) return;
        const now = Date.now();
        fleetData.tasks = fleetData.tasks.filter(t => t.id !== taskId);
        fleetData.activity = Array.isArray(fleetData.activity) ? fleetData.activity : [];
        fleetData.activity.unshift({ agent: 'User', action: `Deleted task: ${task.title}`, timestamp: now });
        renderFleet();
        try {
            await saveFleetData();
        } catch (e) {
            console.error(e);
            alert('Could not delete the task.');
        }
    }

    function taskTitle(task = {}) {
        if (task.titleShort) return task.titleShort;
        const title = String(task.title || 'Untitled task').trim();
        const firstLine = title.split('\n')[0].trim();
        return firstLine.length > 70 ? `${firstLine.slice(0, 67)}...` : firstLine;
    }

    function taskDescription(task = {}) {
        if (task.description) return task.description;
        const title = String(task.title || '').trim();
        const firstLine = title.split('\n')[0].trim();
        const rest = title.split('\n').slice(1).join(' ').trim();
        if (rest) return rest;
        return firstLine.length > 70 ? firstLine : '';
    }

    function taskTag(task = {}) {
        if (task.tag) return task.tag;
        const text = `${task.title || ''} ${task.description || ''}`.toLowerCase();
        if (text.includes('youtube')) return 'YouTube';
        if (text.includes('skool')) return 'Skool';
        if (text.includes('revenue') || text.includes('£')) return 'Revenue';
        if (text.includes('learning')) return 'Learning';
        if (text.includes('news')) return 'News';
        if (text.includes('lifeos')) return 'LifeOS';
        return 'General';
    }

    function formatRelativeTime(ms) {
        const time = Number(ms || 0);
        if (!time) return 'not active yet';
        const diff = Date.now() - time;
        if (diff < 60000) return 'less than a minute ago';
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
        return new Date(time).toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    async function saveFleetData() {
        const res = await fetch('/api/fleet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fleetData, null, 2)
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
    }

    function openTaskModal() {
        if (!taskModal) return;
        taskForm?.reset();
        taskModal.classList.remove('hidden');
        requestAnimationFrame(() => {
            taskModal.classList.remove('opacity-0');
            taskModalContent?.classList.remove('scale-95');
            taskTitleInput?.focus();
        });
    }

    function closeTaskModal() {
        if (!taskModal) return;
        taskModal.classList.add('opacity-0');
        taskModalContent?.classList.add('scale-95');
        setTimeout(() => taskModal.classList.add('hidden'), 180);
    }

    async function addNewTask(event) {
        event?.preventDefault();
        const formData = new FormData(taskForm);
        const title = String(formData.get('title') || '').trim();
        if (!title) return;
        const description = String(formData.get('description') || '').trim();
        const tag = String(formData.get('tag') || 'General').trim() || 'General';
        const assignee = String(formData.get('assignee') || 'main').trim() || 'main';
        const scheduleDay = String(formData.get('scheduleDay') || '').trim();
        const startTime = String(formData.get('startTime') || '').trim();
        const endTime = String(formData.get('endTime') || '').trim();
        const now = Date.now();
        const task = {
            id: `t_${now}`,
            title,
            description,
            tag,
            assignee,
            scheduleDay,
            startTime,
            endTime,
            status: 'todo',
            timestamp: now,
            lastActive: now,
            updatedAt: now
        };
        fleetData.tasks = Array.isArray(fleetData.tasks) ? fleetData.tasks : [];
        fleetData.activity = Array.isArray(fleetData.activity) ? fleetData.activity : [];
        fleetData.tasks.unshift(task);
        fleetData.activity.unshift({ agent: 'User', action: `Created task: ${task.title}`, timestamp: now });
        renderFleet();
        closeTaskModal();
        try {
            await saveFleetData();
        } catch (e) {
            console.error(e);
            alert('Could not save the task. Check the Mission Control server logs.');
        }
    }

    function orgStatusFor(member) {
        const raw = String(member.status || '').toLowerCase();
        if (raw === 'working' || raw === 'active') return 'active';
        return 'idle';
    }

    function memberCard(member, options = {}) {
        const status = orgStatusFor(member);
        const isActive = status === 'active';
        const capabilities = Array.isArray(member.capabilities) ? member.capabilities : [];
        const role = member.role || member.name || 'Team Member';
        return `
            <div class="${options.featured ? 'org-card-featured' : ''} bg-white dark:bg-[#171717] border border-gray-200 dark:border-white/10 rounded-xl p-5 shadow-sm hover:border-gray-300 dark:hover:border-white/20 transition-all">
                <div class="flex items-start justify-between gap-4 mb-3">
                    <div>
                        <div class="text-xs uppercase tracking-wide text-gray-500 mb-1">${escapeHtml(role)}</div>
                        <h3 class="text-xl font-semibold dark:text-white">${escapeHtml(member.name || role)}</h3>
                        ${member.model ? `<div class="text-xs text-gray-500 mt-1 font-mono">${escapeHtml(member.model)}</div>` : ''}
                    </div>
                    <span class="text-xs px-2.5 py-1 rounded-full ${isActive ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'}">${isActive ? 'Active' : 'Idle'}</span>
                </div>
                ${member.description ? `<p class="text-sm text-gray-600 dark:text-gray-300 mb-4">${escapeHtml(member.description)}</p>` : ''}
                ${capabilities.length ? `
                    <div class="flex flex-wrap gap-2">
                        ${capabilities.map(capability => `<span class="text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full px-2.5 py-1 text-gray-600 dark:text-gray-300">${escapeHtml(capability)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    function renderOrgChart() {
        const container = document.getElementById('org-chart-container');
        if (!container) return;

        const org = Array.isArray(fleetData.orgChart) ? fleetData.orgChart : [];
        const founder = org.find(m => m.id === 'phil') || { id: 'phil', name: 'Phil', role: 'Founder & CEO', status: 'active' };
        const chief = org.find(m => m.id === 'main') || { id: 'main', name: 'Chief of Staff', role: 'Chief of Staff', status: 'active', capabilities: ['Delegation', 'Planning', 'Coordination'] };
        const specialists = org.filter(m => !['phil', 'main'].includes(m.id));

        container.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                <div class="lg:col-start-2">${memberCard(founder, { featured: true })}</div>
            </div>
            <div class="org-connector mx-auto"></div>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                <div class="lg:col-start-2">${memberCard(chief, { featured: true })}</div>
            </div>
            <div class="org-connector mx-auto"></div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${specialists.map(member => memberCard(member)).join('') || '<div class="p-8 text-center text-gray-500 border border-dashed border-gray-300 dark:border-white/20 rounded-xl">No specialist agents configured yet.</div>'}
            </div>
        `;
    }

    // === Cron Jobs Logic ===
    const refreshCronBtn = document.getElementById('refresh-cron-btn');
    const cronJobsContainer = document.getElementById('cron-jobs-container');
    const cronTotal = document.getElementById('cron-total');
    const cronEnabled = document.getElementById('cron-enabled');
    const cronErrors = document.getElementById('cron-errors');
    const cronNext = document.getElementById('cron-next');
    const cronFilter = document.getElementById('cron-filter');
    const refreshMemoryBtn = document.getElementById('refresh-memory-btn');
    const memoryLongTermBtn = document.getElementById('memory-long-term-btn');
    const memoryNotesList = document.getElementById('memory-notes-list');
    const memoryTitle = document.getElementById('memory-title');
    const memoryMeta = document.getElementById('memory-meta');
    const memoryContent = document.getElementById('memory-content');

    let cronJobs = [];
    let memoryFiles = [];
    let selectedMemoryFile = 'MEMORY.md';

    if (refreshCronBtn) refreshCronBtn.addEventListener('click', loadCronJobs);
    if (cronFilter) cronFilter.addEventListener('change', renderCronJobs);
    if (refreshMemoryBtn) refreshMemoryBtn.addEventListener('click', () => loadMemoryIndex(false));
    if (memoryLongTermBtn) memoryLongTermBtn.addEventListener('click', () => loadMemoryFile('MEMORY.md'));

    function escapeHtml(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function formatDate(ms) {
        if (!ms) return 'Not scheduled';
        const date = new Date(ms);
        if (Number.isNaN(date.getTime())) return 'Not scheduled';
        return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    }

    function formatDuration(ms) {
        if (!ms) return '—';
        if (ms < 1000) return `${ms}ms`;
        const seconds = Math.round(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const remainder = seconds % 60;
        return `${minutes}m ${remainder}s`;
    }

    function scheduleLabel(schedule = {}) {
        if (schedule.kind === 'cron') return `${schedule.expr || '—'}${schedule.tz ? ` · ${schedule.tz}` : ''}`;
        if (schedule.kind === 'every') return `Every ${schedule.every || schedule.interval || '—'}`;
        if (schedule.kind === 'at') return `At ${formatDate(schedule.atMs || schedule.at)}`;
        return schedule.kind || 'Unknown';
    }

    function jobMessage(job = {}) {
        if (job.payload?.message) return job.payload.message;
        if (job.payload?.text) return job.payload.text;
        return '';
    }

    function updateMemorySelection() {
        if (memoryLongTermBtn) {
            memoryLongTermBtn.classList.toggle('bg-white', selectedMemoryFile === 'MEMORY.md');
            memoryLongTermBtn.classList.toggle('dark:bg-white/10', selectedMemoryFile === 'MEMORY.md');
        }
        if (!memoryNotesList) return;
        memoryNotesList.querySelectorAll('[data-memory-file]').forEach(btn => {
            const active = btn.dataset.memoryFile === selectedMemoryFile;
            btn.classList.toggle('bg-white', active);
            btn.classList.toggle('dark:bg-white/10', active);
            btn.classList.toggle('font-medium', active);
        });
    }

    async function loadMemoryIndex(silent = false) {
        if (!memoryNotesList) return;
        if (refreshMemoryBtn && !silent) refreshMemoryBtn.innerText = 'Loading...';
        try {
            const res = await fetch('/api/memory');
            if (!res.ok) throw new Error(`Memory index failed: ${res.status}`);
            const data = await res.json();
            memoryFiles = Array.isArray(data.notes) ? data.notes : [];
            memoryNotesList.innerHTML = memoryFiles.map(file => `
                <button class="w-full text-left px-4 py-3 text-sm hover:bg-white dark:hover:bg-white/10 transition-colors dark:text-gray-200" data-memory-file="${escapeHtml(file)}">
                    <div>${escapeHtml(file.replace(/\.md$/, ''))}</div>
                    <div class="text-[11px] text-gray-500 mt-0.5">memory/${escapeHtml(file)}</div>
                </button>
            `).join('') || '<div class="px-4 py-6 text-sm text-gray-500">No daily notes found.</div>';
            memoryNotesList.querySelectorAll('[data-memory-file]').forEach(btn => {
                btn.addEventListener('click', () => loadMemoryFile(btn.dataset.memoryFile));
            });
            updateMemorySelection();
            if (!memoryContent?.innerText || memoryContent.innerText === 'Loading memory...') loadMemoryFile(selectedMemoryFile, true);
        } catch (e) {
            console.error(e);
            memoryNotesList.innerHTML = '<div class="px-4 py-6 text-sm text-red-500">Failed to load notes.</div>';
        }
        if (refreshMemoryBtn && !silent) refreshMemoryBtn.innerText = 'Refresh Memory';
    }

    async function loadMemoryFile(file = 'MEMORY.md', silent = false) {
        if (!memoryContent) return;
        selectedMemoryFile = file;
        updateMemorySelection();
        if (!silent) memoryContent.innerText = 'Loading...';
        try {
            const res = await fetch('/api/memory?file=' + encodeURIComponent(file));
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Memory file failed: ${res.status}`);
            if (memoryTitle) memoryTitle.innerText = file === 'MEMORY.md' ? 'Long-term Memory' : file.replace(/\.md$/, '');
            if (memoryMeta) memoryMeta.innerText = `${data.label || file}${data.updatedAtMs ? ` · Updated ${formatDate(data.updatedAtMs)}` : ''}`;
            memoryContent.innerText = data.content || 'This memory file is empty.';
        } catch (e) {
            console.error(e);
            memoryContent.innerText = 'Failed to load memory file.';
        }
    }

    async function loadCronJobs(silent = false) {
        if (!cronJobsContainer) return;
        if (refreshCronBtn && !silent) refreshCronBtn.innerText = 'Loading...';
        try {
            const res = await fetch('/api/cron');
            if (!res.ok) throw new Error(`Cron request failed: ${res.status}`);
            const data = await res.json();
            cronJobs = Array.isArray(data.jobs) ? data.jobs : [];
            renderCronJobs();
        } catch (e) {
            console.error(e);
            cronJobsContainer.innerHTML = '<div class="p-8 text-center text-red-500">Cron jobs failed to load.</div>';
        }
        if (refreshCronBtn && !silent) refreshCronBtn.innerText = 'Refresh Jobs';
    }

    function renderCronJobs() {
        if (!cronJobsContainer) return;
        const jobs = Array.isArray(cronJobs) ? cronJobs : [];
        const enabledJobs = jobs.filter(job => job.enabled);
        const errorJobs = jobs.filter(job => job.state?.lastStatus === 'error' || job.state?.lastRunStatus === 'error');
        const nextJob = enabledJobs
            .filter(job => job.state?.nextRunAtMs)
            .sort((a, b) => a.state.nextRunAtMs - b.state.nextRunAtMs)[0];

        if (cronTotal) cronTotal.innerText = jobs.length;
        if (cronEnabled) cronEnabled.innerText = enabledJobs.length;
        if (cronErrors) cronErrors.innerText = errorJobs.length;
        if (cronNext) cronNext.innerText = nextJob ? `${nextJob.name}: ${formatDate(nextJob.state.nextRunAtMs)}` : '—';

        const filter = cronFilter?.value || 'all';
        let filtered = jobs;
        if (filter === 'enabled') filtered = enabledJobs;
        if (filter === 'errors') filtered = errorJobs;

        if (!jobs.length) {
            cronJobsContainer.innerHTML = '<div class="p-8 text-center text-gray-500 border border-dashed border-gray-300 dark:border-white/20 rounded-xl">No cron jobs found.</div>';
            return;
        }

        if (!filtered.length) {
            cronJobsContainer.innerHTML = '<div class="p-8 text-center text-gray-500 border border-dashed border-gray-300 dark:border-white/20 rounded-xl">No jobs match this filter.</div>';
            return;
        }

        const sorted = [...filtered].sort((a, b) => {
            const aNext = a.state?.nextRunAtMs || Number.MAX_SAFE_INTEGER;
            const bNext = b.state?.nextRunAtMs || Number.MAX_SAFE_INTEGER;
            return aNext - bNext;
        });

        cronJobsContainer.innerHTML = sorted.map(job => {
                const state = job.state || {};
                const isError = state.lastStatus === 'error' || state.lastRunStatus === 'error';
                const statusText = isError ? 'Error' : (state.lastStatus || state.lastRunStatus || 'No runs yet');
                const statusClass = isError
                    ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                    : 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300';
                const enabledClass = job.enabled
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400';
                const message = jobMessage(job);
                const delivery = job.delivery
                    ? `${job.delivery.mode || 'delivery'}${job.delivery.channel ? ` · ${job.delivery.channel}` : ''}${job.delivery.to ? ` · ${job.delivery.to}` : ''}`
                    : 'No delivery';

                return `
                    <div class="bg-white dark:bg-[#171717] border border-gray-200 dark:border-white/10 rounded-lg p-5 hover:border-gray-300 dark:hover:border-white/20 transition-colors">
                        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                            <div>
                                <div class="flex flex-wrap items-center gap-2 mb-2">
                                    <h3 class="font-semibold text-lg dark:text-white">${escapeHtml(job.name || job.id || 'Untitled job')}</h3>
                                    <span class="text-[11px] px-2 py-0.5 rounded-full ${enabledClass}">${job.enabled ? 'Enabled' : 'Disabled'}</span>
                                    <span class="text-[11px] px-2 py-0.5 rounded-full ${statusClass}">${escapeHtml(statusText)}</span>
                                </div>
                                <div class="text-xs text-gray-500 font-mono break-all">${escapeHtml(job.id || '')}</div>
                            </div>
                            <div class="text-sm text-right">
                                <div class="text-gray-500 dark:text-gray-400">Next run</div>
                                <div class="font-medium dark:text-white">${formatDate(state.nextRunAtMs)}</div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-4">
                            <div><div class="text-xs text-gray-500 mb-1">Schedule</div><div class="dark:text-gray-200">${escapeHtml(scheduleLabel(job.schedule))}</div></div>
                            <div><div class="text-xs text-gray-500 mb-1">Created</div><div class="dark:text-gray-200">${formatDate(job.createdAtMs)}</div></div>
                            <div><div class="text-xs text-gray-500 mb-1">Last run</div><div class="dark:text-gray-200">${formatDate(state.lastRunAtMs)}</div></div>
                            <div><div class="text-xs text-gray-500 mb-1">Duration</div><div class="dark:text-gray-200">${formatDuration(state.lastDurationMs)}</div></div>
                        </div>

                        <div class="text-xs text-gray-500 mb-2">Delivery: ${escapeHtml(delivery)} · Errors: ${Number(state.consecutiveErrors || 0)}</div>
                        ${message ? `<details class="text-sm"><summary class="cursor-pointer text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white">Prompt / event</summary><div class="mt-2 p-3 rounded bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">${escapeHtml(message)}</div></details>` : ''}
                        ${state.lastError ? `<div class="mt-3 text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded p-3">${escapeHtml(state.lastError)}</div>` : ''}
                    </div>
                `;
        }).join('');
    }

    // === Script Editor Logic ===
    const scriptModal = document.getElementById('script-modal');
    const scriptModalContent = document.getElementById('script-modal-content');
    const scriptTextarea = document.getElementById('script-textarea');
    const scriptPreview = document.getElementById('script-preview');
    const scriptModalTitle = document.getElementById('script-modal-title');
    const closeScriptBtn = document.getElementById('close-script-btn');
    const saveScriptBtn = document.getElementById('save-script-btn');
    const tabEdit = document.getElementById('tab-edit');
    const tabPreview = document.getElementById('tab-preview');
    const youtubeChecklistItems = document.getElementById('youtube-checklist-items');
    const youtubeChecklistProgress = document.getElementById('youtube-checklist-progress');

    let currentScriptPath = '';
    let currentYoutubeChecklist = [];

    if (tabEdit && tabPreview) {
        tabEdit.addEventListener('click', () => {
            scriptTextarea.classList.remove('hidden');
            scriptPreview.classList.add('hidden');
            tabEdit.classList.add('bg-white', 'dark:bg-[#171717]', 'shadow-sm', 'dark:text-white', 'pointer-events-none');
            tabEdit.classList.remove('text-gray-500', 'hover:text-black', 'dark:text-gray-400');
            tabPreview.classList.remove('bg-white', 'dark:bg-[#171717]', 'shadow-sm', 'dark:text-white', 'pointer-events-none');
            tabPreview.classList.add('text-gray-500', 'hover:text-black', 'dark:text-gray-400');
        });

        tabPreview.addEventListener('click', () => {
            scriptPreview.innerHTML = renderScriptPreview(scriptTextarea.value);
            scriptTextarea.classList.add('hidden');
            scriptPreview.classList.remove('hidden');
            tabPreview.classList.add('bg-white', 'dark:bg-[#171717]', 'shadow-sm', 'dark:text-white', 'pointer-events-none');
            tabPreview.classList.remove('text-gray-500', 'hover:text-black', 'dark:text-gray-400');
            tabEdit.classList.remove('bg-white', 'dark:bg-[#171717]', 'shadow-sm', 'dark:text-white', 'pointer-events-none');
            tabEdit.classList.add('text-gray-500', 'hover:text-black', 'dark:text-gray-400');
        });
    }

    function renderScriptPreview(markdown) {
        const html = marked.parse(markdown || '');
        const blocks = html.split(/(<h[12][^>]*>.*?<\/h[12]>)/gis).filter(Boolean);
        let current = 'script';
        return blocks.map(block => {
            const headingMatch = block.match(/<h[12][^>]*>(.*?)<\/h[12]>/is);
            if (headingMatch) {
                const title = headingMatch[1].replace(/<[^>]+>/g, '').trim().toLowerCase();
                if (/visual/.test(title)) current = 'visuals';
                else if (/audio|sound|music/.test(title)) current = 'audio';
                else if (/script/.test(title)) current = 'script';
                return block.replace(/<h([12])([^>]*)>/, `<h$1$2 class="script-section-heading script-section-${current}">`);
            }
            if (!block.trim()) return block;
            return `<div class="script-section-body script-section-${current}">${block}</div>`;
        }).join('');
    }

    function renderYoutubeChecklist() {
        if (!youtubeChecklistItems) return;
        const completed = currentYoutubeChecklist.filter(item => item.done).length;
        if (youtubeChecklistProgress) youtubeChecklistProgress.innerText = `${completed}/${currentYoutubeChecklist.length || 0} done`;
        youtubeChecklistItems.innerHTML = currentYoutubeChecklist.map((item, index) => `
            <label class="youtube-checklist-item flex items-start gap-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#212121] px-3 py-2 cursor-pointer hover:border-gray-300 dark:hover:border-white/20 transition-colors">
                <input type="checkbox" class="mt-0.5 rounded border-gray-300 text-black focus:ring-black dark:focus:ring-white" data-checklist-index="${index}" ${item.done ? 'checked' : ''}>
                <span class="text-gray-700 dark:text-gray-200 ${item.done ? 'line-through text-gray-400 dark:text-gray-500' : ''}">${escapeHtml(item.label)}</span>
            </label>
        `).join('');
        youtubeChecklistItems.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.addEventListener('change', async () => {
                const index = Number(input.dataset.checklistIndex);
                if (!currentYoutubeChecklist[index]) return;
                currentYoutubeChecklist[index].done = input.checked;
                renderYoutubeChecklist();
                await saveYoutubeChecklist();
            });
        });
    }

    async function loadYoutubeChecklist(path) {
        currentYoutubeChecklist = [];
        renderYoutubeChecklist();
        if (!path) return;
        try {
            const res = await fetch('/api/youtube/checklist?path=' + encodeURIComponent(path));
            const data = await res.json();
            currentYoutubeChecklist = Array.isArray(data.items) ? data.items : [];
        } catch(e) {
            console.error('Failed to load YouTube checklist:', e);
            currentYoutubeChecklist = [];
        }
        renderYoutubeChecklist();
    }

    async function saveYoutubeChecklist() {
        if (!currentScriptPath) return;
        try {
            await fetch('/api/youtube/checklist?path=' + encodeURIComponent(currentScriptPath), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: currentYoutubeChecklist })
            });
        } catch(e) {
            console.error('Failed to save YouTube checklist:', e);
        }
    }

    window.openScriptEditor = async (title, path) => {
        currentScriptPath = path;
        if(scriptModalTitle) scriptModalTitle.innerText = `Edit: ${title}`;
        if(scriptTextarea) scriptTextarea.value = 'Loading script...';
        
        if (scriptModal) {
            scriptModal.classList.remove('hidden');
            setTimeout(() => {
                scriptModal.classList.remove('opacity-0');
                if(scriptModalContent) scriptModalContent.classList.remove('scale-95');
            }, 10);
        }

        try {
            const [scriptRes, checklistResult] = await Promise.all([
                fetch('/api/youtube/script?path=' + encodeURIComponent(path)),
                loadYoutubeChecklist(path)
            ]);
            const data = await scriptRes.json();
            if (scriptRes.ok) {
                if(scriptTextarea) scriptTextarea.value = data.content;
            } else {
                if(scriptTextarea) scriptTextarea.value = 'Error loading script: ' + (data.error || 'Unknown error');
            }
        } catch(e) {
            if(scriptTextarea) scriptTextarea.value = 'Failed to fetch script.';
        }
    };

    const closeScriptEditor = () => {
        if (scriptModal) {
            scriptModal.classList.add('opacity-0');
            if(scriptModalContent) scriptModalContent.classList.add('scale-95');
            setTimeout(() => scriptModal.classList.add('hidden'), 300);
            currentScriptPath = '';
            currentYoutubeChecklist = [];
        }
    };

    if (closeScriptBtn) closeScriptBtn.addEventListener('click', closeScriptEditor);
    
    if (saveScriptBtn) saveScriptBtn.addEventListener('click', async () => {
        if (!currentScriptPath) return;
        const originalText = saveScriptBtn.innerText;
        saveScriptBtn.innerText = 'Saving...';
        saveScriptBtn.disabled = true;

        try {
            const res = await fetch('/api/youtube/script?path=' + encodeURIComponent(currentScriptPath), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: scriptTextarea.value })
            });
            if (res.ok) {
                saveScriptBtn.innerText = 'Saved!';
                setTimeout(() => closeScriptEditor(), 500);
            } else {
                alert('Failed to save script.');
            }
        } catch(e) {
            alert('Error saving script.');
        } finally {
            setTimeout(() => {
                saveScriptBtn.innerText = originalText;
                saveScriptBtn.disabled = false;
            }, 2000);
        }
    });

    window.toggleVideoStatus = async (title, newStatus) => {
        try {
            const res = await fetch('/api/youtube/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, status: newStatus })
            });
            if (res.ok) loadYouTubeData();
        } catch(e) { console.error(e); }
    };

    // === YouTube Logic ===
    const refreshYoutubeBtn = document.getElementById('refresh-youtube-btn');
    const ytContainer = document.getElementById('youtube-videos-container');
    const youtubeStrategyContent = document.getElementById('youtube-strategy-content');
    const youtubeSectionTabs = document.querySelectorAll('.youtube-section-tab');
    const youtubeSectionPanels = document.querySelectorAll('.youtube-section-panel');
    const ytTotal = document.getElementById('yt-total');
    const ytDone = document.getElementById('yt-done');
    const ytRemaining = document.getElementById('yt-remaining');
    const ytCompletion = document.getElementById('yt-completion');
    const youtubeFilterButtons = document.querySelectorAll('.youtube-filter-btn');
    const youtubeSwipeForm = document.getElementById('youtube-swipe-form');
    const youtubeSwipeType = document.getElementById('youtube-swipe-type');
    const youtubeSwipeTitle = document.getElementById('youtube-swipe-title');
    const youtubeSwipeSource = document.getElementById('youtube-swipe-source');
    const youtubeSwipeNotes = document.getElementById('youtube-swipe-notes');
    const youtubeSwipeItems = document.getElementById('youtube-swipe-items');
    const youtubeRefreshCompetitorsBtn = document.getElementById('youtube-refresh-competitors-btn');
    const youtubeCompetitorContainer = document.getElementById('youtube-competitor-container');
    const youtubePageRefreshAnalyticsBtn = document.getElementById('youtube-page-refresh-analytics-btn');
    const youtubePageSyncAnalyticsBtn = document.getElementById('youtube-page-sync-analytics-btn');
    const youtubePageAnalyticsVideoCount = document.getElementById('youtube-page-analytics-video-count');
    const youtubePageAnalyticsAvgCtr = document.getElementById('youtube-page-analytics-avg-ctr');
    const youtubePageAnalyticsAvgRetention = document.getElementById('youtube-page-analytics-avg-retention');
    const youtubePageAnalyticsTable = document.getElementById('youtube-page-analytics-table');
    let activeYoutubeFilter = 'all';
    let activeYoutubeSection = 'growth';
    const isDoneStatus = (status) => String(status || 'Planned').trim().toLowerCase() === 'done';

    function syncYoutubeSectionTabs() {
        youtubeSectionTabs.forEach(tab => {
            const isActive = tab.dataset.youtubeSection === activeYoutubeSection;
            tab.classList.toggle('bg-black', isActive);
            tab.classList.toggle('text-white', isActive);
            tab.classList.toggle('dark:bg-white', isActive);
            tab.classList.toggle('dark:text-black', isActive);
            tab.classList.toggle('text-gray-600', !isActive);
            tab.classList.toggle('dark:text-gray-300', !isActive);
        });
        youtubeSectionPanels.forEach(panel => {
            panel.classList.toggle('hidden', panel.dataset.youtubePanel !== activeYoutubeSection);
        });
        if (activeYoutubeSection === 'metrics') loadYouTubePageAnalytics(true);
        if (activeYoutubeSection === 'competitors') loadYouTubeCompetitors(true);
        if (activeYoutubeSection === 'swipe') loadYouTubeSwipeFile(true);
    }

    function syncYoutubeFilterButtons() {
        youtubeFilterButtons.forEach(filterBtn => {
            const isActive = filterBtn.dataset.filter === activeYoutubeFilter;
            filterBtn.classList.toggle('bg-black', isActive);
            filterBtn.classList.toggle('text-white', isActive);
            filterBtn.classList.toggle('dark:bg-white', isActive);
            filterBtn.classList.toggle('dark:text-black', isActive);
            filterBtn.classList.toggle('text-gray-600', !isActive);
            filterBtn.classList.toggle('dark:text-gray-300', !isActive);
        });
    }

    if (refreshYoutubeBtn) refreshYoutubeBtn.addEventListener('click', () => loadYouTubeData());
    youtubeSectionTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            activeYoutubeSection = tab.dataset.youtubeSection || 'growth';
            syncYoutubeSectionTabs();
        });
    });
    youtubeFilterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            activeYoutubeFilter = btn.dataset.filter || 'all';
            syncYoutubeFilterButtons();
            loadYouTubeData(true);
        });
    });
    if (youtubeSwipeForm) youtubeSwipeForm.addEventListener('submit', addYouTubeSwipeItem);
    if (youtubeRefreshCompetitorsBtn) youtubeRefreshCompetitorsBtn.addEventListener('click', () => loadYouTubeCompetitors());
    if (youtubePageRefreshAnalyticsBtn) youtubePageRefreshAnalyticsBtn.addEventListener('click', () => loadYouTubePageAnalytics());
    if (youtubePageSyncAnalyticsBtn) youtubePageSyncAnalyticsBtn.addEventListener('click', refreshYouTubePageAnalyticsFromApi);
    syncYoutubeSectionTabs();
    syncYoutubeFilterButtons();

    async function loadYouTubeStrategy(silent = false) {
        if (!youtubeStrategyContent) return;
        if (!silent) youtubeStrategyContent.innerHTML = 'Loading 100K strategy...';
        try {
            const res = await fetch('/api/youtube/strategy');
            if (!res.ok) throw new Error(`YouTube strategy request failed: ${res.status}`);
            const data = await res.json();
            const content = data.content || '';
            youtubeStrategyContent.innerHTML = window.marked
                ? marked.parse(content)
                : simpleMarkdownToHtml(content);
        } catch (e) {
            console.error(e);
            if (!silent) youtubeStrategyContent.innerHTML = '<p class="text-red-500">YouTube strategy failed to load.</p>';
        }
    }

    async function loadYouTubeData(silent = false) {
        if (!ytContainer) return;
        if (refreshYoutubeBtn && !silent) refreshYoutubeBtn.innerText = 'Loading...';
        try {
            await loadYouTubeStrategy(silent);
            await loadYouTubeTeam(silent);
            const res = await fetch('/api/youtube');
            if (!res.ok) throw new Error(`YouTube request failed: ${res.status}`);
            const data = await res.json();
            const videos = Array.isArray(data.videos) ? data.videos : [];
            const doneCount = videos.filter(v => isDoneStatus(v['Status'])).length;
            const remainingCount = videos.length - doneCount;
            const completionRate = videos.length ? Math.round((doneCount / videos.length) * 100) : 0;
            const filteredVideos = videos.filter(v => {
                const isDone = isDoneStatus(v['Status']);
                if (activeYoutubeFilter === 'done') return isDone;
                if (activeYoutubeFilter === 'todo') return !isDone;
                return true;
            });
            if (ytTotal) ytTotal.innerText = videos.length;
            if (ytDone) ytDone.innerText = doneCount;
            if (ytRemaining) ytRemaining.innerText = remainingCount;
            if (ytCompletion) ytCompletion.innerText = `${completionRate}%`;

            if (videos.length === 0) {
                ytContainer.innerHTML = '<div class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-8 text-gray-500">No videos found.</div>';
            } else if (filteredVideos.length === 0) {
                ytContainer.innerHTML = '<div class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-8 text-gray-500">No videos match this filter.</div>';
            } else {
                const jsString = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                const reversed = [...filteredVideos].reverse();
                ytContainer.innerHTML = reversed.map((v, index) => {
                    const title = v['Video Title'] || 'Untitled';
                    const status = v['Status'] || 'Planned';
                    const scriptLink = v['Script Link'] || '';
                    const done = isDoneStatus(status);
                    const latestPill = index === 0 && !done
                        ? '<span class="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Latest</span>'
                        : '';
                    return `
                        <article class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden ${done ? 'opacity-75' : ''}">
                            <div class="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-white/60 dark:bg-[#171717]/60 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <div class="min-w-0">
                                    ${scriptLink
                                        ? `<h3 onclick="openScriptEditor('${jsString(title)}', '${jsString(scriptLink)}')" class="text-lg font-semibold dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors ${done ? 'line-through text-gray-400 dark:text-gray-500' : ''}" title="Click to view/edit script">${escapeHtml(title)}</h3>`
                                        : `<h3 class="text-lg font-semibold dark:text-white ${done ? 'line-through text-gray-400 dark:text-gray-500' : ''}">${escapeHtml(title)}</h3>`}
                                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(v['The Promise'] || 'No promise set yet.')}</p>
                                </div>
                                <div class="flex items-center gap-2 flex-wrap md:justify-end">
                                    ${latestPill}
                                    <span class="text-xs px-2.5 py-1 rounded-full ${done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'}">${done ? 'Done' : 'Planned'}</span>
                                    ${scriptLink ? '<span class="text-xs px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">Script linked</span>' : '<span class="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400">No script</span>'}
                                    <button onclick="toggleVideoStatus('${jsString(title)}', '${done ? 'Planned' : 'Done'}')" class="text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${done ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-200'}">
                                        ${done ? 'Mark as Planned' : 'Mark as Done'}
                                    </button>
                                </div>
                            </div>
                            <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div class="youtube-detail-card">
                                    <div class="youtube-detail-label">Hook</div>
                                    <div class="youtube-detail-value">${escapeHtml(v['Hook Strategy'] || '-')}</div>
                                </div>
                                <div class="youtube-detail-card">
                                    <div class="youtube-detail-label">Aha Moment</div>
                                    <div class="youtube-detail-value">${escapeHtml(v['The Aha Moment'] || '-')}</div>
                                </div>
                                <div class="youtube-detail-card md:col-span-2">
                                    <div class="youtube-detail-label">Core Structure</div>
                                    <div class="youtube-detail-value">${escapeHtml(v['Core Structure'] || '-')}</div>
                                </div>
                                <div class="youtube-detail-card md:col-span-2">
                                    <div class="youtube-detail-label">Building Trust</div>
                                    <div class="youtube-detail-value">${escapeHtml(v['Building Trust'] || '-')}</div>
                                </div>
                            </div>
                        </article>
                    `;
                }).join('');
            }
        } catch(e) {
            console.error(e);
            ytContainer.innerHTML = '<div class="bg-gray-50 dark:bg-white/5 border border-red-200 dark:border-red-500/20 rounded-lg p-8 text-red-500">YouTube failed to load.</div>';
        }
        if (refreshYoutubeBtn && !silent) refreshYoutubeBtn.innerText = 'Refresh Data';
    }

    async function loadYouTubePageAnalytics(silent = false) {
        if (!youtubePageAnalyticsTable) return;
        if (youtubePageRefreshAnalyticsBtn && !silent) youtubePageRefreshAnalyticsBtn.innerText = 'Loading...';
        try {
            const res = await fetch('/api/analytics/youtube');
            if (!res.ok) throw new Error(`YouTube metrics request failed: ${res.status}`);
            const data = await res.json();
            renderYouTubePageAnalytics(data);
        } catch (e) {
            console.error(e);
            youtubePageAnalyticsTable.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-red-500">Failed to load YouTube metrics.</td></tr>';
        }
        if (youtubePageRefreshAnalyticsBtn && !silent) youtubePageRefreshAnalyticsBtn.innerText = 'Refresh Metrics';
    }

    function renderYouTubePageAnalytics(data = {}) {
        const summary = data.summary || {};
        const videos = Array.isArray(data.videos) ? data.videos : [];
        if (youtubePageAnalyticsVideoCount) youtubePageAnalyticsVideoCount.innerText = Number(summary.videoCount || videos.length || 0).toLocaleString();
        if (youtubePageAnalyticsAvgCtr) youtubePageAnalyticsAvgCtr.innerText = formatPercentMetric(summary.avgCtrPct);
        if (youtubePageAnalyticsAvgRetention) youtubePageAnalyticsAvgRetention.innerText = formatPercentMetric(summary.avgAudienceRetentionPct);

        if (!youtubePageAnalyticsTable) return;
        if (!videos.length) {
            youtubePageAnalyticsTable.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500">No long-form videos found yet.</td></tr>';
            return;
        }

        const sortedVideos = [...videos].sort((a, b) => {
            const aHas = typeof a.impressionsCtrPct === 'number' || typeof a.audienceRetentionPct === 'number';
            const bHas = typeof b.impressionsCtrPct === 'number' || typeof b.audienceRetentionPct === 'number';
            return Number(bHas) - Number(aHas) || String(a.title || '').localeCompare(String(b.title || ''));
        });

        youtubePageAnalyticsTable.innerHTML = sortedVideos.map(video => {
            const hasMetrics = typeof video.impressionsCtrPct === 'number' || typeof video.audienceRetentionPct === 'number';
            const titleHtml = video.url
                ? `<a href="${escapeHtml(video.url)}" target="_blank" rel="noopener" class="font-semibold dark:text-white hover:text-red-600 dark:hover:text-red-300">${escapeHtml(video.title || 'Untitled')}</a>`
                : `<span class="font-semibold dark:text-white">${escapeHtml(video.title || 'Untitled')}</span>`;
            return `
                <tr class="hover:bg-white/70 dark:hover:bg-white/5">
                    <td class="px-6 py-4 min-w-[320px]">
                        ${titleHtml}
                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(video.source === 'analytics-file' ? 'Analytics data loaded' : 'Waiting for CTR/retention metrics')}</div>
                    </td>
                    <td class="px-6 py-4 text-right font-semibold ${metricColour(video.impressionsCtrPct, 5)}">${formatPercentMetric(video.impressionsCtrPct)}</td>
                    <td class="px-6 py-4 text-right font-semibold ${metricColour(video.audienceRetentionPct, 45)}">${formatPercentMetric(video.audienceRetentionPct)}</td>
                    <td class="px-6 py-4 text-right"><span class="text-xs px-2.5 py-1 rounded-full ${hasMetrics ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'}">${hasMetrics ? 'Ready' : 'Needs metrics'}</span></td>
                </tr>
            `;
        }).join('');
    }

    async function refreshYouTubePageAnalyticsFromApi() {
        if (!youtubePageAnalyticsTable || !youtubePageSyncAnalyticsBtn) return;
        youtubePageSyncAnalyticsBtn.innerText = 'Pulling...';
        youtubePageSyncAnalyticsBtn.disabled = true;
        try {
            const res = await fetch('/api/analytics/youtube/refresh', { method: 'POST' });
            const data = await res.json();
            if (!res.ok || data.success === false) throw new Error(data.error || 'YouTube refresh failed');
            renderYouTubePageAnalytics(data);
        } catch (e) {
            console.error(e);
            alert(`YouTube Analytics refresh failed: ${e.message}`);
        } finally {
            youtubePageSyncAnalyticsBtn.innerText = 'Pull from YouTube';
            youtubePageSyncAnalyticsBtn.disabled = false;
        }
    }

    async function loadYouTubeCompetitors(silent = false) {
        if (!youtubeCompetitorContainer) return;
        if (youtubeRefreshCompetitorsBtn && !silent) youtubeRefreshCompetitorsBtn.innerText = 'Loading...';
        if (!silent) youtubeCompetitorContainer.innerHTML = '<div class="text-sm text-gray-500">Loading competitor analysis...</div>';
        try {
            const res = await fetch('/api/youtube/competitors');
            if (!res.ok) throw new Error(`Competitor analysis request failed: ${res.status}`);
            const data = await res.json();
            renderYouTubeCompetitors(Array.isArray(data.items) ? data.items : [], Array.isArray(data.competitors) ? data.competitors : []);
        } catch (e) {
            console.error(e);
            youtubeCompetitorContainer.innerHTML = '<div class="text-sm text-red-500">Failed to load competitor analysis.</div>';
        }
        if (youtubeRefreshCompetitorsBtn && !silent) youtubeRefreshCompetitorsBtn.innerText = 'Refresh Analysis';
    }

    function renderYouTubeCompetitors(items = [], competitors = []) {
        if (!youtubeCompetitorContainer) return;
        const competitorCards = competitors.length ? `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${competitors.map(competitor => `
                    <article class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-5">
                        <div class="flex items-start justify-between gap-3 mb-3">
                            <div>
                                <h3 class="text-lg font-semibold dark:text-white">${escapeHtml(competitor.name || 'Competitor')}</h3>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(competitor.handle || '')}</p>
                            </div>
                            <a href="${escapeHtml(competitor.url || '#')}" target="_blank" rel="noopener" class="text-xs px-3 py-1.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 shrink-0">Open Channel</a>
                        </div>
                        ${competitor.notes ? `<p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">${escapeHtml(competitor.notes)}</p>` : ''}
                    </article>
                `).join('')}
            </div>
        ` : '';
        const analysisCards = items.length ? items.map((item, index) => {
            const fullId = `youtube-competitor-full-${index}`;
            const summaryHtml = window.marked
                ? marked.parse(item.summary || '')
                : simpleMarkdownToHtml(item.summary || '');
            const contentHtml = window.marked
                ? marked.parse(item.content || '')
                : simpleMarkdownToHtml(item.content || '');
            return `
                <article class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-white/60 dark:bg-[#171717]/60 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h3 class="text-lg font-semibold dark:text-white">${escapeHtml(item.title || 'Analysis')}</h3>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(item.filename || '')}</p>
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 uppercase">${escapeHtml(item.type || 'md')}</span>
                            <button type="button" onclick="document.getElementById('${fullId}')?.classList.toggle('hidden')" class="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 w-fit">Toggle full notes</button>
                        </div>
                    </div>
                    <div class="p-6 youtube-competitor-copy text-sm text-gray-700 dark:text-gray-200">${summaryHtml}</div>
                    <div id="${fullId}" class="hidden border-t border-gray-200 dark:border-white/10 p-6 youtube-competitor-copy text-sm text-gray-700 dark:text-gray-200">${contentHtml}</div>
                </article>
            `;
        }).join('') : '';
        youtubeCompetitorContainer.innerHTML = competitorCards || analysisCards
            ? `${competitorCards}${analysisCards ? `<div class="pt-4 space-y-4"><h3 class="text-lg font-semibold dark:text-white">Analysis Notes</h3>${analysisCards}</div>` : ''}`
            : '<div class="text-sm text-gray-500">No competitors found in the YouTube skill folder.</div>';
    }

    async function loadYouTubeSwipeFile(silent = false) {
        if (!youtubeSwipeItems) return;
        if (!silent) youtubeSwipeItems.innerHTML = '<div class="text-sm text-gray-500">Loading swipe file...</div>';
        try {
            const res = await fetch('/api/youtube/swipe-file');
            if (!res.ok) throw new Error(`Swipe file request failed: ${res.status}`);
            const data = await res.json();
            renderYouTubeSwipeItems(Array.isArray(data.items) ? data.items : []);
        } catch (e) {
            console.error(e);
            youtubeSwipeItems.innerHTML = '<div class="text-sm text-red-500">Failed to load swipe file.</div>';
        }
    }

    function renderYouTubeSwipeItems(items = []) {
        if (!youtubeSwipeItems) return;
        youtubeSwipeItems.innerHTML = items.length ? items.map(item => {
            const isThumbnail = item.type === 'thumbnail';
            return `
                <article class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-5">
                    <div class="flex items-start justify-between gap-3 mb-3">
                        <span class="text-xs px-2.5 py-1 rounded-full ${isThumbnail ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' : 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'}">${isThumbnail ? 'Thumbnail' : 'Title'}</span>
                        ${item.source ? `<span class="text-xs text-gray-400 truncate max-w-[160px]">${escapeHtml(item.source)}</span>` : ''}
                    </div>
                    <h3 class="font-semibold dark:text-white leading-snug">${escapeHtml(item.title || 'Untitled')}</h3>
                    ${item.notes ? `<p class="text-sm text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">${escapeHtml(item.notes)}</p>` : ''}
                </article>
            `;
        }).join('') : '<div class="text-sm text-gray-500">No swipe ideas saved yet.</div>';
    }

    async function addYouTubeSwipeItem(e) {
        e.preventDefault();
        if (!youtubeSwipeTitle) return;
        const item = {
            type: youtubeSwipeType?.value || 'title',
            title: youtubeSwipeTitle.value.trim(),
            source: youtubeSwipeSource?.value.trim() || '',
            notes: youtubeSwipeNotes?.value.trim() || ''
        };
        if (!item.title) return;
        try {
            const res = await fetch('/api/youtube/swipe-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
            if (!res.ok) throw new Error('Failed to save swipe item');
            youtubeSwipeForm.reset();
            const data = await res.json();
            renderYouTubeSwipeItems(Array.isArray(data.items) ? data.items : []);
        } catch (err) {
            console.error(err);
            alert('Failed to save swipe file item.');
        }
    }

    // === Daily News Logic ===
    const refreshNewsBtn = document.getElementById('refresh-news-btn');
    const newsContent = document.getElementById('news-content');
    const refreshReleasesBtn = document.getElementById('refresh-releases-btn');
    const releasesContent = document.getElementById('releases-content');

    if (refreshNewsBtn) refreshNewsBtn.addEventListener('click', loadNews);
    if (refreshReleasesBtn) refreshReleasesBtn.addEventListener('click', loadReleases);

    async function loadNews(silent = false) {
        if (!newsContent) return;
        if (refreshNewsBtn && !silent) refreshNewsBtn.innerText = 'Loading...';
        try {
            const res = await fetch('/api/news');
            const data = await res.json();
            if (res.ok) {
                const items = Array.isArray(data.items) && data.items.length
                    ? data.items
                    : (data.content ? [{ title: 'Today', content: data.content }] : []);

                newsContent.innerHTML = items.length ? items.map((item, index) => {
                    const html = renderNewsMarkdown(item.content || '');
                    return `
                        <article class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                            <div class="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-white/60 dark:bg-[#171717]/60 flex items-center justify-between gap-4">
                                <h2 class="text-lg font-semibold dark:text-white">${escapeHtml(item.title || item.date || 'Daily briefing')}</h2>
                                ${index === 0 ? '<span class="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Latest</span>' : ''}
                            </div>
                            <div class="news-day-content prose dark:prose-invert prose-sm max-w-none text-gray-800 dark:text-gray-200 p-6 overflow-auto">${html}</div>
                        </article>
                    `;
                }).join('') : '<div class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-8 text-gray-500">No news briefings yet.</div>';
            }
        } catch(e) { console.error(e); }
        if (refreshNewsBtn && !silent) refreshNewsBtn.innerText = 'Refresh Data';
    }

    function renderNewsMarkdown(content = '') {
        if (window.marked?.parse) return window.marked.parse(content);
        return escapeHtml(content)
            .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-5 mb-3">$1</h2>')
            .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
            .replace(/^[-*] (.*$)/gim, '<li class="ml-4 list-disc mb-2">$1</li>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br/>');
    }

    async function loadReleases(silent = false) {
        if (!releasesContent) return;
        if (refreshReleasesBtn && !silent) refreshReleasesBtn.innerText = 'Loading...';
        try {
            const res = await fetch('/api/releases');
            const data = await res.json();
            if (res.ok) {
                if (Array.isArray(data.items) && data.items.length) {
                    const releases = data.items.filter(item => !/beta/i.test(item.title || ''));
                    releasesContent.innerHTML = releases.map(item => `
                        <div class="mb-6 p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#171717]">
                            <div class="text-xs uppercase tracking-wide text-gray-500 mb-2">${item.date || 'Undated'}</div>
                            <div class="font-semibold mb-2 dark:text-white">${item.link ? `<a href="${item.link}" target="_blank" rel="noopener noreferrer" class="hover:underline text-blue-600 dark:text-blue-400">${item.title || 'Release'}</a>` : (item.title || 'Release')}</div>
                            <div class="text-sm text-gray-700 dark:text-gray-300">${item.summary || ''}</div>
                        </div>
                    `).join('');
                    return;
                }
                const html = data.content || '';
                releasesContent.innerHTML = html ? html.replace(/\n/g, '<br/>') : '<p class="text-gray-500">No release notes yet.</p>';
            }
        } catch(e) { console.error(e); }
        if (refreshReleasesBtn && !silent) refreshReleasesBtn.innerText = 'Refresh Data';
    }

    window.loadReleases = loadReleases;

    // === Learnings Logic ===
    const refreshLearningsBtn = document.getElementById('refresh-learnings-btn');
    const learningsContainer = document.getElementById('learnings-container');

    if (refreshLearningsBtn) refreshLearningsBtn.addEventListener('click', loadLearnings);

    async function loadLearnings(silent = false) {
        if (!learningsContainer) return;
        if (refreshLearningsBtn && !silent) refreshLearningsBtn.innerText = 'Loading...';
        try {
            const res = await fetch('/api/learnings');
            const data = await res.json();
            if (res.ok) {
                const items = parseLearningsContent(data.content || '');
                learningsContainer.innerHTML = items.length ? items.map((item, index) => {
                    const html = renderLearningsMarkdown(item.body || '');
                    const sourcePill = item.sourceUrl
                        ? `<a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="text-xs px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 hover:opacity-80 transition-opacity">${escapeHtml(item.sourceLabel || 'Source')}</a>`
                        : (item.sourceLabel ? `<span class="text-xs px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">${escapeHtml(item.sourceLabel)}</span>` : '');
                    return `
                        <article class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                            <div class="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-white/60 dark:bg-[#171717]/60 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <div>
                                    <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">${escapeHtml(item.dateLabel || 'Learning')}</div>
                                    <h2 class="text-lg font-semibold dark:text-white">${escapeHtml(item.title || 'Learning')}</h2>
                                </div>
                                <div class="flex items-center gap-2 flex-wrap">
                                    ${sourcePill}
                                    ${index === 0 ? '<span class="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Latest</span>' : ''}
                                </div>
                            </div>
                            <div class="news-day-content prose dark:prose-invert prose-sm max-w-none text-gray-800 dark:text-gray-200 p-6 overflow-auto">${html}</div>
                        </article>
                    `;
                }).join('') : '<div class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-8 text-gray-500">No learnings logged yet.</div>';
            }
        } catch(e) {
            console.error(e);
            learningsContainer.innerHTML = '<div class="bg-gray-50 dark:bg-white/5 border border-red-200 dark:border-red-500/20 rounded-lg p-8 text-red-500">Failed to load learnings.</div>';
        }
        if (refreshLearningsBtn && !silent) refreshLearningsBtn.innerText = 'Refresh Data';
    }

    function parseLearningsContent(content = '') {
        const sections = content.split(/^##\s+/m).map(section => section.trim()).filter(Boolean);
        return sections.map(section => {
            const [headerLine = '', ...rest] = section.split('\n');
            const header = headerLine.trim();
            const dateMatch = header.match(/^(\d{4}-\d{2}-\d{2})\s*:\s*(.*)$/);
            const rawMeta = dateMatch ? dateMatch[2].trim() : header;
            const sourceMatch = rawMeta.match(/^(.*?)\s*\((.+?)\)$/);
            const title = (sourceMatch ? sourceMatch[1] : rawMeta).trim();
            const sourceRaw = sourceMatch ? sourceMatch[2].trim() : '';
            const urlMatch = sourceRaw.match(/(https?:\/\/\S+)/);
            const sourceUrl = urlMatch ? urlMatch[1].replace(/[),.;]+$/, '') : '';
            const sourceLabel = sourceRaw
                ? sourceRaw.replace(/\s*[-–—]?\s*https?:\/\/\S+\s*$/i, '').trim() || 'Source'
                : '';
            return {
                dateLabel: dateMatch ? dateMatch[1] : '',
                title: title || 'Learning',
                sourceLabel,
                sourceUrl,
                body: rest.join('\n').trim()
            };
        }).filter(item => item.title || item.body);
    }

    function renderLearningsMarkdown(content = '') {
        if (window.marked?.parse) return window.marked.parse(content);
        return escapeHtml(content)
            .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-5 mb-3">$1</h2>')
            .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
            .replace(/^[-*] (.*$)/gim, '<li class="ml-4 list-disc mb-2">$1</li>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br/>');
    }

    // === Read Logic ===
    const refreshReadBtn = document.getElementById('refresh-read-btn');
    const readLibraryEl = document.getElementById('read-library');
    const readAudioPlayer = document.getElementById('read-audio-player');
    const readForm = document.getElementById('read-form');
    const readSubmitBtn = document.getElementById('read-submit-btn');
    const readSpeedSelect = document.getElementById('read-speed');
    let activeReadId = null;

    const PLAY_ICON = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72c0 .72.78 1.17 1.4.81l10.2-5.86a.94.94 0 000-1.62L9.4 4.33A.94.94 0 008 5.14z"></path></svg>`;
    const PAUSE_ICON = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5.75A.75.75 0 017.75 5h2.5a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 01-.75-.75V5.75zm6 0A.75.75 0 0113.75 5h2.5a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 01-.75-.75V5.75z"></path></svg>`;
    const SPINNER_ICON = `<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12a9 9 0 11-6.219-8.56"></path></svg>`;

    function applyReadPlaybackRate(rate) {
        const safeRate = Number(rate) || 1;
        if (readAudioPlayer) readAudioPlayer.playbackRate = safeRate;
        if (readSpeedSelect) readSpeedSelect.value = String(safeRate);
        try { localStorage.setItem('readPlaybackRate', String(safeRate)); } catch {}
    }

    applyReadPlaybackRate((() => {
        try { return localStorage.getItem('readPlaybackRate') || '1'; } catch { return '1'; }
    })());

    if (readSpeedSelect) {
        readSpeedSelect.addEventListener('change', () => applyReadPlaybackRate(readSpeedSelect.value));
    }

    if (readForm) {
        readForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('read-title').value;
            const type = document.getElementById('read-type').value;
            const text = document.getElementById('read-text').value;
            if (!title || !text) return;
            
            const originalText = readSubmitBtn.innerText;
            readSubmitBtn.innerText = 'Saving + generating audio...';
            readSubmitBtn.disabled = true;
            try {
                const res = await fetch('/api/read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, type, text })
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || 'Failed to add item');
                }
                if (data.audioReady === false) {
                    alert(`Saved, but audio preprocessing failed: ${data.audioError || 'Unknown error'}`);
                }
                document.getElementById('read-title').value = '';
                document.getElementById('read-text').value = '';
                await loadReadLibrary();
            } catch (err) {
                console.error(err);
                alert('Error adding to library: ' + err.message);
            } finally {
                readSubmitBtn.innerText = originalText;
                readSubmitBtn.disabled = false;
            }
        });
    }

    if (refreshReadBtn) refreshReadBtn.addEventListener('click', loadReadLibrary);

    async function loadReadLibrary(silent = false) {
        if (!readLibraryEl) return;
        if (refreshReadBtn && !silent) refreshReadBtn.innerText = 'Loading...';
        try {
            const res = await fetch('/api/read');
            const data = await res.json();
            const items = Array.isArray(data.items) ? data.items : [];
            readLibraryEl.innerHTML = items.length ? items.map(renderReadItem).join('') : `
                <div class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-8 text-gray-500">
                    Nothing saved yet. Use the form above to add an article or book summary.
                </div>
            `;

        } catch (e) {
            console.error(e);
            readLibraryEl.innerHTML = '<div class="bg-gray-50 dark:bg-white/5 border border-red-200 dark:border-red-500/20 rounded-lg p-8 text-red-500">Failed to load Read library.</div>';
        }
        if (refreshReadBtn && !silent) refreshReadBtn.innerText = 'Refresh Library';
    }

    function renderReadItem(item) {
        const created = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '';
        const chars = Number(item.charCount || 0).toLocaleString();
        const listens = Number(item.listenCount || 0).toLocaleString();
        const id = escapeHtml(item.id);
        const title = escapeHtml(item.title || 'Untitled');
        return `
            <article class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                <div class="p-6 flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 flex-wrap mb-2">
                            <span class="text-xs px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">${escapeHtml(item.type || 'article')}</span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">${created}</span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">${chars} chars</span>
                            <span id="read-count-${id}" class="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Listened ${listens}×</span>
                        </div>
                        <button data-read-edit="${id}" data-read-title="${title}" class="read-title-btn bg-transparent border-0 p-0 text-left text-lg font-semibold dark:text-white mb-2 hover:underline underline-offset-4">${title}</button>
                        <button data-read-edit="${id}" data-read-title="${title}" class="read-preview-btn block w-full bg-transparent border-0 p-0 text-left text-sm text-gray-600 dark:text-gray-300 line-clamp-3 cursor-pointer">${escapeHtml(item.preview || '')}${(item.preview || '').length >= 240 ? '…' : ''}</button>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <button data-read-delete="${id}" data-read-title="${title}" class="read-delete-btn h-10 w-10 inline-flex items-center justify-center rounded-full border border-red-200 text-red-600 dark:border-red-500/30 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" aria-label="Delete ${title}" title="Delete">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v6M14 11v6"></path></svg>
                        </button>
                        <button data-read-play="${id}" class="read-play-btn h-10 w-10 inline-flex items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity" aria-label="Play ${title}" title="Play">${PLAY_ICON}</button>
                        <button data-read-pause="${id}" class="read-pause-btn h-10 w-10 inline-flex items-center justify-center rounded-full border border-gray-200 dark:border-white/10 dark:text-gray-200 hover:bg-white dark:hover:bg-white/10 transition-colors" aria-label="Pause ${title}" title="Pause">${PAUSE_ICON}</button>
                    </div>
                </div>
            </article>
        `;
    }

    if (readLibraryEl) {
        // Modal elements
        const editModal = document.getElementById('read-edit-modal');
        const editTitle = document.getElementById('read-edit-title');
        const editText = document.getElementById('read-edit-text');
        const editClose = document.getElementById('read-edit-close');
        const editCancel = document.getElementById('read-edit-cancel');
        const editSave = document.getElementById('read-edit-save');
        const editSpinner = document.getElementById('read-edit-spinner');
        let currentEditId = null;

        const closeEditModal = () => {
            editModal.classList.add('hidden');
            currentEditId = null;
            editText.value = '';
        };

        const deleteReadEntry = async (id, titleStr = 'this item') => {
            if (!confirm(`Delete “${titleStr}”? This cannot be undone.`)) return;
            try {
                const res = await fetch(`/api/read/${encodeURIComponent(id)}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to delete item');
                if (activeReadId === id && readAudioPlayer) {
                    readAudioPlayer.pause();
                    readAudioPlayer.removeAttribute('src');
                    readAudioPlayer.load();
                    activeReadId = null;
                }
                await loadReadLibrary();
            } catch (err) {
                console.error(err);
                alert('Error deleting content: ' + err.message);
            }
        };

        const openReadEditor = async (id, titleStr = 'Content') => {
            try {
                const res = await fetch(`/api/read/${encodeURIComponent(id)}/text`);
                if (!res.ok) throw new Error('Failed to fetch text');
                const data = await res.json();

                if (editModal && editText && editTitle) {
                    currentEditId = id;
                    editTitle.innerText = `Edit: ${titleStr}`;
                    editText.value = data.text || '';
                    editModal.classList.remove('hidden');
                }
            } catch (err) {
                console.error(err);
                alert('Error loading text: ' + err.message);
            }
        };

        if (editClose) editClose.addEventListener('click', closeEditModal);
        if (editCancel) editCancel.addEventListener('click', closeEditModal);

        if (editSave) {
            editSave.addEventListener('click', async () => {
                if (!currentEditId) return;
                const newText = editText.value;
                if (!newText.trim()) {
                    alert('Content cannot be empty.');
                    return;
                }

                editSave.disabled = true;
                if (editSpinner) editSpinner.classList.remove('hidden');
                try {
                    const res = await fetch(`/api/read/${encodeURIComponent(currentEditId)}/text`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: newText })
                    });
                    if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.error || 'Failed to update content');
                    }
                    closeEditModal();
                    await loadReadLibrary();
                } catch (err) {
                    console.error(err);
                    alert('Error saving edits: ' + err.message);
                } finally {
                    editSave.disabled = false;
                    if (editSpinner) editSpinner.classList.add('hidden');
                }
            });
        }

        readLibraryEl.addEventListener('click', async (event) => {
            const playBtn = event.target.closest('[data-read-play]');
            const pauseBtn = event.target.closest('[data-read-pause]');
            const editBtn = event.target.closest('[data-read-edit]');
            const deleteBtn = event.target.closest('[data-read-delete]');
            
            if (editBtn) {
                await openReadEditor(editBtn.dataset.readEdit, editBtn.dataset.readTitle || 'Content');
            } else if (deleteBtn) {
                await deleteReadEntry(deleteBtn.dataset.readDelete, deleteBtn.dataset.readTitle || 'this item');
            } else if (playBtn) {
                await playReadItem(playBtn.dataset.readPlay, playBtn);
            } else if (pauseBtn && readAudioPlayer) {
                readAudioPlayer.pause();
            }
        });
    }

    async function playReadItem(id, button) {
        if (!id || !readAudioPlayer) return;
        const originalHtml = button?.innerHTML || PLAY_ICON;
        if (button) {
            button.innerHTML = SPINNER_ICON;
            button.disabled = true;
        }
        if (activeReadId !== id) {
            readAudioPlayer.src = `/api/read/${encodeURIComponent(id)}/audio`;
            activeReadId = id;
            try {
                const res = await fetch(`/api/read/${encodeURIComponent(id)}/listened`, { method: 'POST' });
                const data = await res.json();
                const countEl = document.getElementById(`read-count-${id}`);
                if (countEl && data.item) countEl.innerText = `Listened ${Number(data.item.listenCount || 0).toLocaleString()}×`;
            } catch (e) { console.error(e); }
        }
        try {
            applyReadPlaybackRate(readSpeedSelect?.value || readAudioPlayer.playbackRate || 1);
            await readAudioPlayer.play();
        } catch (e) {
            alert(`Could not play audio yet: ${e.message}`);
        } finally {
            if (button) {
                button.innerHTML = originalHtml;
                button.disabled = false;
            }
        }
    }

    // === Goals Logic ===
    window.editGoal = async (goalId) => {
        let promptText = '';
        if (goalId === 'youtube') promptText = 'Enter current YouTube subscribers (Target: 100,000):';
        if (goalId === 'skool') promptText = 'Enter current Skool members (Target: 10,000):';
        if (goalId === 'revenue') promptText = 'Enter current revenue in £ (Target: £10,000):';

        const input = prompt(promptText);
        if (input === null || input.trim() === '') return;

        const val = parseFloat(input.replace(/,/g, ''));
        if (isNaN(val)) {
            alert('Please enter a valid number.');
            return;
        }

        try {
            const res = await fetch('/api/goals');
            let currentGoals = { youtube: 0, skool: 0, revenue: 0 };
            if (res.ok) currentGoals = await res.json();

            currentGoals[goalId] = val;

            const postRes = await fetch('/api/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentGoals)
            });

            if (postRes.ok) {
                loadGoals();
            }
        } catch(e) { console.error('Failed to update goal', e); }
    };

    async function loadGoals(silent = false) {
        try {
            const res = await fetch('/api/goals');
            if (res.ok) {
                const data = await res.json();
                const ytVal = data.youtube || 0;
                const skoolVal = data.skool || 0;
                const revVal = data.revenue || 0;

                if(document.getElementById('val-youtube')) document.getElementById('val-youtube').innerText = ytVal.toLocaleString();
                if(document.getElementById('val-skool')) document.getElementById('val-skool').innerText = skoolVal.toLocaleString();
                if(document.getElementById('val-revenue')) document.getElementById('val-revenue').innerText = revVal.toLocaleString();

                const pctYt = Math.min(100, (ytVal / 100000) * 100);
                if(document.getElementById('bar-youtube')) document.getElementById('bar-youtube').style.width = pctYt + '%';
                if(document.getElementById('pct-youtube')) document.getElementById('pct-youtube').innerText = pctYt.toFixed(1) + '%';

                const pctSkool = Math.min(100, (skoolVal / 10000) * 100);
                if(document.getElementById('bar-skool')) document.getElementById('bar-skool').style.width = pctSkool + '%';
                if(document.getElementById('pct-skool')) document.getElementById('pct-skool').innerText = pctSkool.toFixed(1) + '%';

                const pctRev = Math.min(100, (revVal / 10000) * 100);
                if(document.getElementById('bar-revenue')) document.getElementById('bar-revenue').style.width = pctRev + '%';
                if(document.getElementById('pct-revenue')) document.getElementById('pct-revenue').innerText = pctRev.toFixed(1) + '%';
            }
        } catch(e) { console.error(e); }
    }

    
    // === Health & Fitness Logic ===
    const healthSectionTabs = document.querySelectorAll('.health-section-tab');
    const healthSectionPanels = document.querySelectorAll('.health-section-panel');

    healthSectionTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetSection = tab.dataset.healthSection;
            
            healthSectionTabs.forEach(t => {
                t.classList.remove('bg-black', 'text-white', 'dark:bg-white', 'dark:text-black');
                t.classList.add('text-gray-600', 'dark:text-gray-300');
            });
            
            tab.classList.remove('text-gray-600', 'dark:text-gray-300');
            tab.classList.add('bg-black', 'text-white', 'dark:bg-white', 'dark:text-black');

            healthSectionPanels.forEach(panel => {
                if (panel.dataset.healthPanel === targetSection) {
                    panel.classList.remove('hidden');
                } else {
                    panel.classList.add('hidden');
                }
            });
        });
    });

    const refreshHealthBtn = document.getElementById('refresh-health-btn');
    const healthSessions = document.getElementById('health-sessions');
    const healthDateRange = document.getElementById('health-date-range');
    const healthVolume = document.getElementById('health-volume');
    const healthDeadHang = document.getElementById('health-deadhang');
    const healthLatestDay = document.getElementById('health-latest-day');
    const healthLatestDate = document.getElementById('health-latest-date');
    const healthWeightCurrent = document.getElementById('health-weight-current');
    const healthWeightDate = document.getElementById('health-weight-date');
    const healthWeightSummary = document.getElementById('health-weight-summary');
    const healthWeightChange = document.getElementById('health-weight-change');
    const healthWeightChart = document.getElementById('health-weight-chart');
    const healthVolumeChart = document.getElementById('health-volume-chart');
    const healthSplitBars = document.getElementById('health-split-bars');
    const healthExerciseProgress = document.getElementById('health-exercise-progress');
    const healthRecentWorkouts = document.getElementById('health-recent-workouts');

    if (refreshHealthBtn) refreshHealthBtn.addEventListener('click', loadHealthData);

    async function loadHealthData(silent = false) {
        if (!healthVolumeChart) return;
        if (refreshHealthBtn && !silent) refreshHealthBtn.innerText = 'Loading...';
        try {
            const res = await fetch('/api/workouts');
            if (!res.ok) throw new Error(`Workout request failed: ${res.status}`);
            const data = await res.json();
            renderHealthDashboard(data);
        } catch (e) {
            console.error(e);
            healthVolumeChart.innerHTML = '<div class="text-sm text-red-500 border border-red-200 dark:border-red-500/20 rounded-lg p-6">Workout dashboard failed to load.</div>';
        }
        if (refreshHealthBtn && !silent) refreshHealthBtn.innerText = 'Refresh Health';
    }

    function renderHealthDashboard(data = {}) {
        const summary = data.summary || {};
        const sessions = Array.isArray(data.sessions) ? data.sessions : [];
        const exercises = Array.isArray(data.exercises) ? data.exercises : [];
        const weight = data.weight || {};
        const latestSessions = [...sessions].reverse().slice(0, 5);

        if (healthSessions) healthSessions.innerText = Number(summary.sessionCount || 0).toLocaleString();
        if (healthDateRange) healthDateRange.innerText = summary.firstDate && summary.latestDate ? `${formatWorkoutDate(summary.firstDate)} → ${formatWorkoutDate(summary.latestDate)}` : 'No workouts yet';
        if (healthVolume) healthVolume.innerText = `${Number(summary.totalVolume || 0).toLocaleString()} kg`;
        if (healthDeadHang) healthDeadHang.innerText = `${Number(summary.bestDeadHang || 0)}s`;
        if (healthLatestDay) healthLatestDay.innerText = summary.latestWorkoutDay || '-';
        if (healthLatestDate) healthLatestDate.innerText = summary.latestDate ? formatWorkoutDate(summary.latestDate) : '-';

        renderHealthWeight(weight);
        renderHealthVolumeChart(sessions);
        renderHealthSplitBars(summary.splitCounts || {}, sessions.length);
        renderHealthExerciseProgress(exercises);
        renderHealthRecentWorkouts(latestSessions);
    }

    function renderHealthWeight(weight = {}) {
        const summary = weight.summary || {};
        const latest = summary.latest || null;
        const chartRows = Array.isArray(weight.chartRows) ? weight.chartRows : [];
        if (healthWeightCurrent) healthWeightCurrent.innerText = latest ? `${Number(latest.weightLbs || 0).toFixed(1)} lb` : '-';
        if (healthWeightDate) healthWeightDate.innerText = latest ? `${Number(latest.weightKg || 0).toFixed(2)} kg · ${formatWorkoutDate(latest.date)}` : 'No weigh-ins yet';

        const prevChange = summary.changeSincePreviousLbs;
        const thirtyDayChange = summary.change30dLbs;
        const changeLabel = prevChange === null || prevChange === undefined ? 'First log' : `${prevChange >= 0 ? '+' : ''}${Number(prevChange).toFixed(1)} lb vs last`;
        const changeClass = Number(prevChange || 0) >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
        if (healthWeightChange) {
            healthWeightChange.className = `text-xs px-2.5 py-1 rounded-full ${changeClass}`;
            healthWeightChange.innerText = changeLabel;
        }
        if (healthWeightSummary) {
            const thirty = thirtyDayChange === null || thirtyDayChange === undefined ? '30-day change unavailable yet' : `${thirtyDayChange >= 0 ? '+' : ''}${Number(thirtyDayChange).toFixed(1)} lb over ~30 days`;
            healthWeightSummary.innerText = `${Number(summary.count || 0).toLocaleString()} weigh-ins · ${thirty}`;
        }
        if (!healthWeightChart) return;
        if (!chartRows.length) {
            healthWeightChart.innerHTML = '<div class="text-sm text-gray-500">No weight logs yet.</div>';
            return;
        }
        const values = chartRows.map(r => Number(r.weightLbs || 0));
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = Math.max(1, max - min);
        const points = chartRows.map((r, i) => {
            const x = chartRows.length === 1 ? 50 : (i / (chartRows.length - 1)) * 100;
            const y = 88 - (((Number(r.weightLbs || 0) - min) / range) * 72);
            return `${x},${y}`;
        }).join(' ');
        healthWeightChart.innerHTML = `
            <svg viewBox="0 0 100 100" class="w-full h-56 overflow-visible" preserveAspectRatio="none" role="img" aria-label="Weight trend">
                <line x1="0" x2="100" y1="88" y2="88" class="stroke-gray-200 dark:stroke-white/10" stroke-width="0.5"></line>
                <polyline points="${points}" fill="none" class="stroke-blue-500" stroke-width="2.4" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"></polyline>
                ${chartRows.map((r, i) => {
                    const x = chartRows.length === 1 ? 50 : (i / (chartRows.length - 1)) * 100;
                    const y = 88 - (((Number(r.weightLbs || 0) - min) / range) * 72);
                    return `<circle cx="${x}" cy="${y}" r="1.6" class="fill-blue-500"></circle>`;
                }).join('')}
            </svg>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs text-gray-500 dark:text-gray-400">
                ${chartRows.slice(-4).map(r => `<div class="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#171717] p-3"><div class="font-medium text-gray-900 dark:text-white">${Number(r.weightLbs || 0).toFixed(1)} lb</div><div>${escapeHtml(formatWorkoutDate(r.date))}</div><div class="mt-1 text-blue-600 dark:text-blue-300">${Number(r.weightKg || 0).toFixed(2)} kg</div></div>`).join('')}
            </div>
        `;
    }

    function renderHealthVolumeChart(sessions = []) {
        if (!healthVolumeChart) return;
        if (!sessions.length) {
            healthVolumeChart.innerHTML = '<div class="text-sm text-gray-500">No workout sessions logged yet.</div>';
            return;
        }
        const maxVolume = Math.max(1, ...sessions.map(s => Number(s.volume || 0)));
        const points = sessions.map((s, i) => {
            const x = sessions.length === 1 ? 50 : (i / (sessions.length - 1)) * 100;
            const y = 92 - ((Number(s.volume || 0) / maxVolume) * 78);
            return `${x},${y}`;
        }).join(' ');
        const bars = sessions.map((s, i) => {
            const x = sessions.length === 1 ? 45 : (i / Math.max(1, sessions.length - 1)) * 90 + 5;
            const h = Math.max(4, (Number(s.volume || 0) / maxVolume) * 72);
            return `<rect x="${x - 2.2}" y="${92 - h}" width="4.4" height="${h}" rx="2" class="fill-emerald-500/25"></rect>`;
        }).join('');
        healthVolumeChart.innerHTML = `
            <svg viewBox="0 0 100 100" class="w-full h-64 overflow-visible" preserveAspectRatio="none" role="img" aria-label="Workout volume trend">
                <line x1="0" x2="100" y1="92" y2="92" class="stroke-gray-200 dark:stroke-white/10" stroke-width="0.5"></line>
                ${bars}
                <polyline points="${points}" fill="none" class="stroke-emerald-500" stroke-width="2.2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"></polyline>
            </svg>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs text-gray-500 dark:text-gray-400">
                ${sessions.slice(-4).map(s => `<div class="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#171717] p-3"><div class="font-medium text-gray-900 dark:text-white">${escapeHtml(s.workoutDay || '')}</div><div>${escapeHtml(formatWorkoutDate(s.date))}</div><div class="mt-1 text-emerald-600 dark:text-emerald-300">${Math.round(s.volume || 0).toLocaleString()} kg</div></div>`).join('')}
            </div>
        `;
    }

    function renderHealthSplitBars(splitCounts = {}, total = 0) {
        if (!healthSplitBars) return;
        const days = ['Day A', 'Day B', 'Day C'];
        healthSplitBars.innerHTML = days.map((day, index) => {
            const count = Number(splitCounts[day] || 0);
            const pct = total ? Math.round((count / total) * 100) : 0;
            const colours = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500'];
            return `
                <div>
                    <div class="flex items-center justify-between mb-2 text-sm">
                        <span class="font-medium dark:text-white">${day}</span>
                        <span class="text-gray-500 dark:text-gray-400">${count} sessions · ${pct}%</span>
                    </div>
                    <div class="h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                        <div class="h-full rounded-full ${colours[index]}" style="width:${pct}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderHealthExerciseProgress(exercises = []) {
        if (!healthExerciseProgress) return;
        const visible = exercises.filter(e => e.shortcode !== 'DEADHANG').slice(0, 10);
        healthExerciseProgress.innerHTML = visible.length ? visible.map(ex => {
            const latestTop = ex.latest?.parsed?.topSet;
            const previousTop = ex.previous?.parsed?.topSet;
            const latestLabel = latestTop ? `${latestTop.reps}×${latestTop.weight ? latestTop.weight + 'kg' : 'BW'}` : (ex.latest?.LogString || '-');
            const previousLabel = previousTop ? `${previousTop.reps}×${previousTop.weight ? previousTop.weight + 'kg' : 'BW'}` : (ex.previous?.LogString || 'First log');
            const volumeChange = ex.volumeChange;
            const positive = Number(volumeChange || 0) >= 0;
            return `
                <div class="px-6 py-4 flex items-center justify-between gap-4">
                    <div class="min-w-0">
                        <div class="font-semibold dark:text-white">${escapeHtml(ex.shortcode)}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Latest ${escapeHtml(formatWorkoutDate(ex.latest?.Date))}: ${escapeHtml(latestLabel)} · Previous: ${escapeHtml(previousLabel)}</div>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="text-sm font-semibold ${positive ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-500'}">${volumeChange === null ? 'New' : `${positive ? '+' : ''}${Math.round(volumeChange).toLocaleString()} kg`}</div>
                        <div class="text-xs text-gray-400">volume</div>
                    </div>
                </div>
            `;
        }).join('') : '<div class="p-6 text-sm text-gray-500">No exercise logs yet.</div>';
    }

    function renderHealthRecentWorkouts(sessions = []) {
        if (!healthRecentWorkouts) return;
        healthRecentWorkouts.innerHTML = sessions.length ? sessions.map(session => {
            const exerciseList = (session.exercises || []).slice(0, 5).map(ex => `<span class="text-xs px-2 py-1 rounded-full bg-white dark:bg-[#171717] border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300">${escapeHtml(ex.Shortcode)}</span>`).join('');
            return `
                <div class="px-6 py-4">
                    <div class="flex items-start justify-between gap-4 mb-3">
                        <div>
                            <div class="font-semibold dark:text-white">${escapeHtml(session.workoutDay || 'Workout')}</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(formatWorkoutDate(session.date))} · ${(session.exercises || []).length} exercises</div>
                        </div>
                        <div class="text-right text-sm text-emerald-600 dark:text-emerald-300 font-semibold">${Math.round(session.volume || 0).toLocaleString()} kg</div>
                    </div>
                    <div class="flex flex-wrap gap-2">${exerciseList}</div>
                </div>
            `;
        }).join('') : '<div class="p-6 text-sm text-gray-500">No recent workouts yet.</div>';
    }

    function formatWorkoutDate(value) {
        if (!value) return '-';
        const date = new Date(`${value}T00:00:00`);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    // === Social Analytics Logic ===
    const refreshAnalyticsBtn = document.getElementById('refresh-analytics-btn');
    const syncYoutubeAnalyticsBtn = document.getElementById('sync-youtube-analytics-btn');
    const analyticsVideoCount = document.getElementById('analytics-video-count');
    const analyticsAvgCtr = document.getElementById('analytics-avg-ctr');
    const analyticsAvgRetention = document.getElementById('analytics-avg-retention');
    const youtubeAnalyticsTable = document.getElementById('youtube-analytics-table');

    if (refreshAnalyticsBtn) refreshAnalyticsBtn.addEventListener('click', loadAnalyticsData);
    if (syncYoutubeAnalyticsBtn) syncYoutubeAnalyticsBtn.addEventListener('click', refreshYouTubeAnalyticsFromApi);

    async function loadAnalyticsData(silent = false) {
        if (!youtubeAnalyticsTable) return;
        if (refreshAnalyticsBtn && !silent) refreshAnalyticsBtn.innerText = 'Loading...';
        try {
            const res = await fetch('/api/analytics/youtube');
            if (!res.ok) throw new Error(`Analytics request failed: ${res.status}`);
            const data = await res.json();
            renderYouTubeAnalytics(data);
        } catch (e) {
            console.error(e);
            youtubeAnalyticsTable.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-red-500">Failed to load YouTube analytics.</td></tr>';
        }
        if (refreshAnalyticsBtn && !silent) refreshAnalyticsBtn.innerText = 'Refresh Analytics';
    }

    function renderYouTubeAnalytics(data = {}) {
        const summary = data.summary || {};
        const videos = Array.isArray(data.videos) ? data.videos : [];
        if (analyticsVideoCount) analyticsVideoCount.innerText = Number(summary.videoCount || videos.length || 0).toLocaleString();
        if (analyticsAvgCtr) analyticsAvgCtr.innerText = formatPercentMetric(summary.avgCtrPct);
        if (analyticsAvgRetention) analyticsAvgRetention.innerText = formatPercentMetric(summary.avgAudienceRetentionPct);

        if (!youtubeAnalyticsTable) return;
        if (!videos.length) {
            youtubeAnalyticsTable.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500">No long-form videos found yet.</td></tr>';
            return;
        }

        const sortedVideos = [...videos].sort((a, b) => {
            const aHas = typeof a.impressionsCtrPct === 'number' || typeof a.audienceRetentionPct === 'number';
            const bHas = typeof b.impressionsCtrPct === 'number' || typeof b.audienceRetentionPct === 'number';
            return Number(bHas) - Number(aHas) || String(a.title || '').localeCompare(String(b.title || ''));
        });

        youtubeAnalyticsTable.innerHTML = sortedVideos.map(video => {
            const hasMetrics = typeof video.impressionsCtrPct === 'number' || typeof video.audienceRetentionPct === 'number';
            const titleHtml = video.url
                ? `<a href="${escapeHtml(video.url)}" target="_blank" rel="noopener" class="font-semibold dark:text-white hover:text-red-600 dark:hover:text-red-300">${escapeHtml(video.title || 'Untitled')}</a>`
                : `<span class="font-semibold dark:text-white">${escapeHtml(video.title || 'Untitled')}</span>`;
            return `
                <tr class="hover:bg-white/70 dark:hover:bg-white/5">
                    <td class="px-6 py-4 min-w-[320px]">
                        ${titleHtml}
                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(video.source === 'analytics-file' ? 'Analytics data loaded' : 'Waiting for CTR/retention metrics')}</div>
                    </td>
                    <td class="px-6 py-4 text-right font-semibold ${metricColour(video.impressionsCtrPct, 5)}">${formatPercentMetric(video.impressionsCtrPct)}</td>
                    <td class="px-6 py-4 text-right font-semibold ${metricColour(video.audienceRetentionPct, 45)}">${formatPercentMetric(video.audienceRetentionPct)}</td>
                    <td class="px-6 py-4 text-right"><span class="text-xs px-2.5 py-1 rounded-full ${hasMetrics ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'}">${hasMetrics ? 'Ready' : 'Needs metrics'}</span></td>
                </tr>
            `;
        }).join('');
    }

    async function refreshYouTubeAnalyticsFromApi() {
        if (!youtubeAnalyticsTable || !syncYoutubeAnalyticsBtn) return;
        syncYoutubeAnalyticsBtn.innerText = 'Pulling...';
        syncYoutubeAnalyticsBtn.disabled = true;
        try {
            const res = await fetch('/api/analytics/youtube/refresh', { method: 'POST' });
            const data = await res.json();
            if (!res.ok || data.success === false) throw new Error(data.error || 'YouTube refresh failed');
            renderYouTubeAnalytics(data);
        } catch (e) {
            console.error(e);
            alert(`YouTube Analytics refresh failed: ${e.message}`);
        } finally {
            syncYoutubeAnalyticsBtn.innerText = 'Pull from YouTube';
            syncYoutubeAnalyticsBtn.disabled = false;
        }
    }

    function formatPercentMetric(value) {
        return typeof value === 'number' ? `${value.toFixed(1)}%` : '-';
    }

    function metricColour(value, goodThreshold) {
        if (typeof value !== 'number') return 'text-gray-400';
        return value >= goodThreshold ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-300';
    }

    // === Auto Refresh ===
    setInterval(() => {
        const activeView = Array.from(viewSections).find(v => v.classList.contains('block'));
        if (!activeView) return;
        if (activeView.id === 'view-usage') fetchData(true);
        else if (activeView.id === 'view-fleet') loadFleet(true);
        else if (activeView.id === 'view-org-chart') loadFleet(true);
        else if (activeView.id === 'view-calendar') loadCalendar(true);
        else if (activeView.id === 'view-youtube') loadYouTubeData(true);
        else if (activeView.id === 'view-memory') loadMemoryIndex(true);
        else if (activeView.id === 'view-cron') loadCronJobs(true);
        else if (activeView.id === 'view-news') loadNews(true);
        else if (activeView.id === 'view-releases') loadReleases(true);
        else if (activeView.id === 'view-learnings') loadLearnings(true);
        else if (activeView.id === 'view-read') loadReadLibrary(true);
        else if (activeView.id === 'view-goals') loadGoals(true);
        else if (activeView.id === 'view-health') loadHealthData(true);
        else if (activeView.id === 'view-analytics') loadAnalyticsData(true);
    }, 5000);

    // Initial Load
    fetchData();
    loadFleet();
    loadYouTubeData();
    loadMemoryIndex(true);
    loadCronJobs();
    loadCalendar(true);
    loadNews();
    loadReleases();
    loadLearnings();
    loadReadLibrary();
    loadGoals();
    loadHealthData();
    loadAnalyticsData();
    switchView('view-usage');

    async function loadYouTubeTeam(silent = false) {
        const teamContainer = document.getElementById('youtube-team-container');
        if (!teamContainer) return;
        try {
            const res = await fetch('/api/youtube/team');
            if (res.ok) {
                const data = await res.json();
                const team = Array.isArray(data.team) ? data.team : [];
                teamContainer.innerHTML = team.length ? team.map(member => `
                    <div class="bg-gray-50 dark:bg-[#171717]/50 border border-gray-200 dark:border-white/10 rounded-xl p-5 flex flex-col gap-3">
                        <div class="flex justify-between items-start gap-2">
                            <div>
                                <h3 class="font-semibold text-lg dark:text-white">${escapeHtml(member['Name'] || 'Unknown')}</h3>
                                <span class="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 mt-2 inline-block">${escapeHtml(member['Role/Tags'] || 'Team Member')}</span>
                            </div>
                        </div>
                        <div class="flex flex-col gap-1.5 mt-auto pt-2">
                            ${member['Link/Contact'] ? `<a href="${member['Link/Contact'].startsWith('http') ? escapeHtml(member['Link/Contact']) : '#'}" ${member['Link/Contact'].startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : ''} class="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white truncate" title="${escapeHtml(member['Link/Contact'])}">📞 ${escapeHtml(member['Link/Contact'])}</a>` : ''}
                            ${member['Date Added'] ? `<span class="text-xs text-gray-500">Added: ${escapeHtml(member['Date Added'])}</span>` : ''}
                        </div>
                    </div>
                `).join('') : '<div class="col-span-full text-sm text-gray-500 dark:text-gray-400">No YouTube team members found in Personal CRM.</div>';
            }
        } catch (e) {
            console.error(e);
            teamContainer.innerHTML = '<div class="text-sm text-red-500">Failed to load CRM team data.</div>';
        }
    }
});
