// OpenClaw Mission Control - Main JS

document.addEventListener("DOMContentLoaded", () => {
    const apiPath = (path) => path;

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
            const isActive = n.dataset.target === targetId;
            if (isActive) {
                n.classList.add('bg-gray-200', 'dark:bg-white/10', 'text-black', 'dark:text-white');
                n.classList.remove('text-gray-600', 'dark:text-gray-300');
            } else {
                n.classList.remove('bg-gray-200', 'dark:bg-white/10', 'text-black', 'dark:text-white', 'text-gray-900');
                n.classList.add('text-gray-600', 'dark:text-gray-300');
            }
        });
        if (targetId === 'view-business-ideas') loadBusinessIdeas(true);
        if (targetId === 'view-ytjobs') loadYtJobs(true);
        if (targetId === 'view-people') loadPeople(true);
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
    const fleetAgentsContainer = document.getElementById('fleet-agents-container');
    const fleetActivityList = document.getElementById('fleet-activity-list');
    const fleetLogsContainer = document.getElementById('fleet-logs-container');
    const focusModeContainer = document.getElementById('focus-mode-container');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskModal = document.getElementById('task-modal');
    const taskModalContent = document.getElementById('task-modal-content');
    const taskDetailModal = document.getElementById('task-detail-modal');
    const taskDetailContent = document.getElementById('task-detail-content');
    const taskDetailBody = document.getElementById('task-detail-body');
    const closeTaskDetailBtn = document.getElementById('close-task-detail-btn');
    const taskForm = document.getElementById('task-form');
    const cancelTaskBtn = document.getElementById('cancel-task-btn');
    const createFocusTaskBtn = document.getElementById('create-focus-task-btn');
    const taskTitleInput = document.getElementById('task-title-input');
    const addLogBtn = document.getElementById('add-log-btn');
    const newLogInput = document.getElementById('new-log-input');

    let fleetData = { agents: [], activity: [], tasks: [], logs: [], orgChart: [] };
    let taskModalMode = 'normal';

    if (refreshFleetBtn) refreshFleetBtn.addEventListener('click', loadFleet);
    if (refreshOrgBtn) refreshOrgBtn.addEventListener('click', loadFleet);
    if (refreshCalendarBtn) refreshCalendarBtn.addEventListener('click', loadCalendar);
    if (addTaskBtn) addTaskBtn.addEventListener('click', () => openTaskModal('normal'));
    if (cancelTaskBtn) cancelTaskBtn.addEventListener('click', closeTaskModal);
    if (taskModal) taskModal.addEventListener('click', (e) => { if (e.target === taskModal) closeTaskModal(); });
    if (taskDetailModal) taskDetailModal.addEventListener('click', (e) => { if (e.target === taskDetailModal) closeTaskDetailModal(); });
    if (closeTaskDetailBtn) closeTaskDetailBtn.addEventListener('click', closeTaskDetailModal);
    if (taskForm) taskForm.addEventListener('submit', addNewTask);
    if (createFocusTaskBtn) createFocusTaskBtn.addEventListener('click', () => {
        taskModalMode = 'focus';
        const priorityInput = document.getElementById('task-priority-input');
        if (priorityInput) priorityInput.value = 'high';
        taskForm?.requestSubmit();
    });
    if (addLogBtn) addLogBtn.addEventListener('click', addSharedLogNote);
    if (newLogInput) newLogInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSharedLogNote();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && taskModal && !taskModal.classList.contains('hidden')) closeTaskModal();
        if (e.key === 'Escape' && taskDetailModal && !taskDetailModal.classList.contains('hidden')) closeTaskDetailModal();
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
        const focusMode = currentFocusMode();
        const taskSorter = (a, b) => compareFocusPriority(a, b, focusMode) || compareTaskPriority(a, b) || Number(b.updatedAt || b.lastActive || b.timestamp || 0) - Number(a.updatedAt || a.lastActive || a.timestamp || 0);
        const todos = fleetData.tasks.filter(t => t.status === 'todo' || t.status === 'error').sort(taskSorter);
        const inprog = fleetData.tasks.filter(t => t.status === 'inprogress').sort(taskSorter);
        const dones = fleetData.tasks.filter(t => t.status === 'done').sort(taskSorter);
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
            const priority = taskPriority(t);
            const priorityMeta = taskPriorityMeta(priority);
            const agentTheme = agentThemeMeta(t.assignee);
            const assigneeName = displayAgentName(t.assignee || 'main');
            const assigneeBadge = displayAgentBadge(t.assignee || 'main');
            const lastActive = formatRelativeTime(t.lastActive || t.updatedAt || t.timestamp);
            const isFailed = t.status === 'error';
            const isFocusTask = focusMode.active && focusMode.taskId === t.id;
            const isPausedByFocus = focusMode.active && !isFocusTask && t.status !== 'done';
            const canStart = (t.status === 'todo' || isFailed) && !isPausedByFocus;
            const canComplete = t.status === 'inprogress' && !isPausedByFocus;
            const canDelete = t.status !== 'done' && !focusMode.active;
            return `
                <div class="task-card bg-white dark:bg-[#212121] border ${isFocusTask ? 'border-red-300 dark:border-red-500/40 ring-2 ring-red-200 dark:ring-red-500/20' : 'border-gray-200 dark:border-white/10'} border-l-4 ${isFocusTask ? 'border-l-red-600' : priorityMeta.borderClass} rounded-xl p-4 text-sm mb-3 min-w-0 overflow-hidden shadow-sm ${isPausedByFocus ? 'opacity-60' : ''}" data-task-id="${escapeHtml(t.id)}">
                    <div class="flex items-start gap-2 mb-3">
                        <span class="mt-1.5 h-2 w-2 rounded-full ${t.status === 'done' ? 'bg-emerald-500' : t.status === 'inprogress' ? 'bg-indigo-500' : 'bg-red-500'} shrink-0"></span>
                        <div class="min-w-0 flex-1">
                            <div class="task-title font-semibold text-gray-900 dark:text-gray-100 break-words leading-snug">${escapeHtml(title)}</div>
                            ${description ? `<p class="task-description text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed break-words max-h-16 overflow-hidden">${escapeHtml(description)}</p>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center justify-between gap-3 text-xs">
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="task-avatar h-7 min-w-[2.5rem] px-2 rounded-full ${agentTheme.avatarClass} inline-flex items-center justify-center font-semibold shrink-0" title="${escapeHtml(assigneeName)}">${escapeHtml(assigneeBadge)}</span>
                            <span class="px-2 py-1 rounded-full ${priorityMeta.badgeClass}">${escapeHtml(priorityMeta.label)}</span>
                            ${isFocusTask ? '<span class="px-2 py-1 rounded-full bg-red-600 text-white">FOCUS</span>' : ''}
                            ${isPausedByFocus ? '<span class="px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300">Paused</span>' : ''}
                            ${isFailed ? '<span class="px-2 py-1 rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">Failed</span>' : ''}
                        </div>
                        <span class="text-gray-400 dark:text-gray-500 whitespace-nowrap">${escapeHtml(lastActive)}</span>
                    </div>
                    <div class="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
                        <button class="task-action-btn task-view-btn text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5" data-task-id="${escapeHtml(t.id)}">View</button>
                        ${canStart ? `<button class="task-action-btn task-start-btn text-xs px-2.5 py-1 rounded bg-black text-white dark:bg-white dark:text-black" data-task-id="${escapeHtml(t.id)}">${isFailed ? 'Retry' : 'Start'}</button>` : ''}
                        ${canComplete ? `<button class="task-action-btn task-complete-btn text-xs px-2.5 py-1 rounded bg-emerald-600 text-white" data-task-id="${escapeHtml(t.id)}">Complete</button>` : ''}
                        ${canDelete ? `<button class="task-action-btn task-delete-btn text-xs px-2.5 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10" data-task-id="${escapeHtml(t.id)}">Delete</button>` : ''}
                    </div>
                </div>
            `;
        };
        
        if (focusModeContainer) {
            if (focusMode.active) {
                const focusTask = fleetData.tasks.find(task => task.id === focusMode.taskId);
                focusModeContainer.innerHTML = `
                    <div class="rounded-2xl border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-5 shadow-sm">
                        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-semibold mb-3">FOCUS MODE</div>
                                <h2 class="text-xl font-semibold text-red-900 dark:text-red-100">${escapeHtml(focusMode.title || taskTitle(focusTask || {} ) || 'Critical issue')}</h2>
                                <p class="text-sm text-red-800/80 dark:text-red-200/80 mt-1">${escapeHtml(focusMode.reason || 'All non-critical tasks are paused while agents focus on this issue.')}</p>
                                <div class="text-xs text-red-800/70 dark:text-red-200/70 mt-3">Activated ${escapeHtml(formatRelativeTime(focusMode.activatedAt))}</div>
                            </div>
                            <div class="flex items-center gap-2">
                                <button id="stop-focus-mode-btn" class="px-3 py-2 rounded-lg bg-white text-red-700 border border-red-200 hover:bg-red-100 dark:bg-[#171717] dark:text-red-200 dark:border-red-500/20 dark:hover:bg-red-500/10 text-sm">Exit Focus Mode</button>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                focusModeContainer.innerHTML = '';
            }
        }

        if (fleetAgentsContainer) {
            fleetAgentsContainer.innerHTML = buildAgentSnapshots().map(renderAgentCard).join('') || '<div class="col-span-full text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-white/10 rounded-xl p-4 text-center">No agents found.</div>';
        }
        if (fleetActivityList) {
            const activity = Array.isArray(fleetData.activity) ? fleetData.activity.slice(0, 8) : [];
            fleetActivityList.innerHTML = activity.map(item => `
                <li class="px-4 py-3">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">${escapeHtml(displayAgentName(item.agent))}</div>
                            <div class="text-sm text-gray-500 dark:text-gray-400 break-words">${escapeHtml(item.action || '')}</div>
                        </div>
                        <div class="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">${escapeHtml(formatRelativeTime(item.timestamp))}</div>
                    </div>
                </li>
            `).join('') || '<li class="px-4 py-6 text-sm text-center text-gray-500 dark:text-gray-400">No activity yet.</li>';
        }
        if (fleetLogsContainer) {
            const logs = Array.isArray(fleetData.logs) ? [...fleetData.logs].sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0)).slice(0, 40) : [];
            fleetLogsContainer.innerHTML = logs.length ? logs.map(log => `
                <article class="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#171717] p-4">
                    <div class="flex items-center justify-between gap-3 mb-2">
                        <div class="text-sm font-medium text-gray-900 dark:text-gray-100">${escapeHtml(displayAgentName(log.author || log.agent || 'System'))}</div>
                        <div class="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">${escapeHtml(formatRelativeTime(log.timestamp))}</div>
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-300 break-words">${escapeHtml(log.message || log.action || '')}</div>
                </article>
            `).join('') : '<div class="text-sm text-gray-500 dark:text-gray-400">No shared logs yet.</div>';
        }
        if(document.getElementById('tasks-todo')) document.getElementById('tasks-todo').innerHTML = todos.map(renderTask).join('');
        if(document.getElementById('tasks-inprogress')) document.getElementById('tasks-inprogress').innerHTML = inprog.map(renderTask).join('');
        if(document.getElementById('tasks-done')) document.getElementById('tasks-done').innerHTML = dones.map(renderTask).join('');
        attachTaskActionHandlers();
    }

    function buildAgentSnapshots() {
        const agents = Array.isArray(fleetData.agents) ? fleetData.agents : [];
        return agents.map(agent => {
            const agentId = String(agent.id || '').toLowerCase();
            const activeTasks = (Array.isArray(fleetData.tasks) ? fleetData.tasks : []).filter(task => String(task.assignee || '').toLowerCase() === agentId && task.status === 'inprogress');
            const activityMatch = (Array.isArray(fleetData.activity) ? fleetData.activity : []).find(item => {
                const value = String(item.agent || '').toLowerCase();
                return value === agentId || value === String(agent.name || '').toLowerCase();
            });
            const lastActiveCandidates = [
                Number(agent.lastActive || 0),
                ...activeTasks.map(task => Number(task.lastActive || task.updatedAt || task.timestamp || 0)),
                Number(activityMatch?.timestamp || 0)
            ].filter(Boolean);
            const lastActive = lastActiveCandidates.length ? Math.max(...lastActiveCandidates) : null;
            const isWorking = activeTasks.length > 0;
            return {
                ...agent,
                isWorking,
                activeTaskCount: activeTasks.length,
                lastActive
            };
        });
    }

    function renderAgentCard(agent) {
        const statusText = agent.isWorking ? 'Working' : 'Idle';
        const statusClasses = agent.isWorking
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20'
            : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10';
        const initial = String(agent.name || agent.id || '?').trim().charAt(0).toUpperCase();
        const theme = agentThemeMeta(agent.id || agent.name);
        const lastActiveLabel = formatRelativeTime(agent.lastActive);
        return `
            <article class="border border-gray-200 dark:border-white/10 rounded-xl p-5 bg-white dark:bg-[#171717] shadow-sm min-w-0">
                <div class="flex items-start justify-between gap-3 mb-4">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="h-10 w-10 rounded-full ${theme.avatarClass} flex items-center justify-center font-semibold shrink-0">${escapeHtml(initial)}</div>
                        <div class="min-w-0">
                            <h3 class="font-semibold text-gray-900 dark:text-white truncate">${escapeHtml(agent.name || agent.id || 'Unknown agent')}</h3>
                            <div class="text-xs text-gray-500 dark:text-gray-400">${escapeHtml(shortModelName(agent.model || agent.id || ''))}</div>
                        </div>
                    </div>
                    <span class="text-xs px-2.5 py-1 rounded-full border ${statusClasses}">${statusText}</span>
                </div>
                <dl class="space-y-3 text-sm">
                    <div class="flex items-center justify-between gap-3">
                        <dt class="text-gray-500 dark:text-gray-400">Last activity</dt>
                        <dd class="text-gray-900 dark:text-gray-100 text-right">${escapeHtml(lastActiveLabel)}</dd>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                        <dt class="text-gray-500 dark:text-gray-400">Current tasks</dt>
                        <dd class="text-gray-900 dark:text-gray-100 text-right">${agent.activeTaskCount || 0}</dd>
                    </div>
                </dl>
            </article>
        `;
    }

    function agentThemeMeta(agentValue) {
        const value = String(agentValue || '').trim().toLowerCase();
        if (value === 'cto' || value === 'technical lead' || value === 'cto') {
            return {
                avatarClass: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
                chipClass: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300'
            };
        }
        if (value === 'cmo' || value === 'marketing lead') {
            return {
                avatarClass: 'bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300',
                chipClass: 'bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300'
            };
        }
        if (value === 'daily-tasks' || value === 'daily tasks' || value === 'operations assistant') {
            return {
                avatarClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
                chipClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
            };
        }
        if (value === 'cco' || value === 'chief customer officer') {
            return {
                avatarClass: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
                chipClass: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
            };
        }
        return {
            avatarClass: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
            chipClass: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300'
        };
    }

    function displayAgentName(agentValue) {
        const value = String(agentValue || '').trim().toLowerCase();
        if (!value) return 'Unknown';
        const match = (Array.isArray(fleetData.agents) ? fleetData.agents : []).find(agent => {
            const id = String(agent.id || '').toLowerCase();
            const name = String(agent.name || '').toLowerCase();
            return value === id || value === name;
        });
        return match?.name || agentValue;
    }

    function displayAgentBadge(agentValue) {
        const value = String(agentValue || '').trim().toLowerCase();
        if (!value) return 'AG';
        if (value === 'main' || value === 'vin' || value === 'chief ai officer') return 'CAIO';
        if (value === 'cto' || value === 'chief technology officer') return 'CTO';
        if (value === 'cmo' || value === 'chief marketing officer') return 'CMO';
        if (value === 'daily-tasks' || value === 'daily tasks') return 'DT';
        if (value === 'cco' || value === 'chief customer officer') return 'CCO';
        return String(displayAgentName(agentValue) || 'AG').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'AG';
    }

    function shortModelName(modelValue) {
        const value = String(modelValue || '').trim();
        if (!value) return '';
        const parts = value.split('/').filter(Boolean);
        return parts[parts.length - 1] || value;
    }

    function attachTaskActionHandlers() {
        document.querySelectorAll('.task-view-btn').forEach(btn => {
            btn.addEventListener('click', () => openTaskDetail(btn.dataset.taskId));
        });
        document.getElementById('stop-focus-mode-btn')?.addEventListener('click', deactivateFocusMode);
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
                    tag: job.meta?.calendarTag || 'Recurring',
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
        const showTag = event.source !== 'cron' && event.tag;
        return `
            <div class="calendar-block ${colour.bg} ${colour.text} ${colour.border} border rounded-xl p-3 shadow-sm">
                <div class="text-xs font-medium opacity-80 mb-1">${escapeHtml(event.time || 'Any time')}</div>
                <div class="font-semibold text-sm leading-snug break-words">${escapeHtml(event.title)}</div>
                <div class="mt-3 flex items-center ${showTag ? 'justify-between' : 'justify-end'} gap-2">
                    ${showTag ? `<span class="text-[11px] px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20">${escapeHtml(event.tag || 'General')}</span>` : ''}
                    <span class="text-[11px] opacity-70">${escapeHtml(event.status || '')}</span>
                </div>
            </div>
        `;
    }

    function calendarColour(tag = '', source = 'task') {
        const key = String(tag || '').toLowerCase();
        if (key.includes('youtube')) return { bg: 'bg-pink-50 dark:bg-pink-500/15', text: 'text-pink-900 dark:text-pink-100', border: 'border-pink-200 dark:border-pink-400/20' };
        if (key.includes('check-in')) return { bg: 'bg-amber-50 dark:bg-amber-500/15', text: 'text-amber-900 dark:text-amber-100', border: 'border-amber-200 dark:border-amber-400/20' };
        if (key.includes('wrap up')) return { bg: 'bg-indigo-50 dark:bg-indigo-500/15', text: 'text-indigo-900 dark:text-indigo-100', border: 'border-indigo-200 dark:border-indigo-400/20' };
        if (key.includes('journal')) return { bg: 'bg-emerald-50 dark:bg-emerald-500/15', text: 'text-emerald-900 dark:text-emerald-100', border: 'border-emerald-200 dark:border-emerald-400/20' };
        if (source === 'cron' || key.includes('recurring')) return { bg: 'bg-sky-50 dark:bg-sky-500/15', text: 'text-sky-900 dark:text-sky-100', border: 'border-sky-200 dark:border-sky-400/20' };
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
        if (status === 'inprogress') {
            delete task.dispatchedAt;
            delete task.dispatchPid;
            delete task.dispatchStatus;
            delete task.failedAt;
            delete task.completedAt;
        }
        fleetData.activity = Array.isArray(fleetData.activity) ? fleetData.activity : [];
        fleetData.activity.unshift({ agent: 'User', action: `${status === 'inprogress' ? 'Started' : 'Completed'} task: ${task.title}`, timestamp: now });
        appendSharedLog('Mission Control', `${status === 'inprogress' ? 'Started' : 'Completed'} task: ${task.title}`, now);
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
        appendSharedLog('Mission Control', `Deleted task: ${task.title}`, now);
        renderFleet();
        try {
            await saveFleetData();
        } catch (e) {
            console.error(e);
            alert('Could not delete the task.');
        }
    }

    function appendSharedLog(author, message, timestamp = Date.now()) {
        const text = String(message || '').trim();
        if (!text) return;
        fleetData.logs = Array.isArray(fleetData.logs) ? fleetData.logs : [];
        fleetData.logs.unshift({ author, message: text, timestamp });
    }

    async function addSharedLogNote() {
        const text = String(newLogInput?.value || '').trim();
        if (!text) return;
        const now = Date.now();
        appendSharedLog('Mission Control', text, now);
        if (newLogInput) newLogInput.value = '';
        renderFleet();
        try {
            await saveFleetData();
        } catch (e) {
            console.error(e);
            alert('Could not save the shared log note.');
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

    function taskPriority(task = {}) {
        const value = String(task.priority || 'medium').trim().toLowerCase();
        if (value === 'high' || value === 'low') return value;
        return 'medium';
    }

    function taskPriorityMeta(priority) {
        const value = taskPriority({ priority });
        if (value === 'high') {
            return {
                label: 'H',
                badgeClass: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
                borderClass: 'border-l-red-500'
            };
        }
        if (value === 'low') {
            return {
                label: 'L',
                badgeClass: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
                borderClass: 'border-l-sky-500'
            };
        }
        return {
            label: 'M',
            badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
            borderClass: 'border-l-amber-500'
        };
    }

    function compareTaskPriority(a = {}, b = {}) {
        const rank = { high: 3, medium: 2, low: 1 };
        return (rank[taskPriority(b)] || 0) - (rank[taskPriority(a)] || 0);
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

    function openTaskModal(mode = 'normal') {
        if (!taskModal) return;
        taskModalMode = mode;
        taskForm?.reset();
        const heading = taskModal.querySelector('h2');
        const subheading = taskModal.querySelector('p');
        const submitBtn = taskModal.querySelector('button[type="submit"]');
        if (heading) heading.textContent = 'Create New Task';
        if (subheading) subheading.textContent = 'Add it to your parked To Do backlog. It won’t be actioned until you click Start.';
        const priorityInput = document.getElementById('task-priority-input');
        if (priorityInput) priorityInput.value = 'medium';
        if (submitBtn) submitBtn.textContent = 'Create Task';
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

    function openTaskDetail(taskId) {
        const task = fleetData.tasks.find(t => t.id === taskId);
        if (!task || !taskDetailModal || !taskDetailBody) return;
        const priorityMeta = taskPriorityMeta(task.priority);
        const assigneeName = displayAgentName(task.assignee || 'main');
        const scheduleDay = scheduledDayIndex(task);
        const scheduleLabel = scheduleDay === null ? 'Unscheduled' : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][scheduleDay];
        const statusLabel = String(task.status || 'todo').replace(/^./, s => s.toUpperCase());
        taskDetailBody.innerHTML = `
            <div class="space-y-6">
                <div>
                    <h3 class="text-2xl font-semibold text-gray-900 dark:text-white leading-tight break-words">${escapeHtml(task.title || 'Untitled task')}</h3>
                    <div class="flex flex-wrap items-center gap-2 mt-3 text-xs">
                        <span class="px-2.5 py-1 rounded-full ${priorityMeta.badgeClass}">${escapeHtml(priorityMeta.label)} priority</span>
                        <span class="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300">${escapeHtml(statusLabel)}</span>
                        <span class="px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">${escapeHtml(assigneeName)}</span>
                        <span class="px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300">${escapeHtml(taskTag(task))}</span>
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div class="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4">
                        <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Last activity</div>
                        <div class="text-gray-900 dark:text-gray-100">${escapeHtml(formatRelativeTime(task.lastActive || task.updatedAt || task.timestamp))}</div>
                    </div>
                    <div class="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4">
                        <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Schedule</div>
                        <div class="text-gray-900 dark:text-gray-100">${escapeHtml(scheduleLabel)}${task.startTime ? ` · ${escapeHtml(task.startTime)}` : ''}${task.endTime ? `–${escapeHtml(task.endTime)}` : ''}</div>
                    </div>
                </div>
                <div>
                    <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Full instructions</div>
                    <div class="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-200">${escapeHtml(task.description || task.title || 'No extra instructions provided.')}</div>
                </div>
            </div>
        `;
        taskDetailModal.classList.remove('hidden');
        requestAnimationFrame(() => {
            taskDetailModal.classList.remove('opacity-0');
            taskDetailContent?.classList.remove('scale-95');
        });
    }

    function closeTaskDetailModal() {
        if (!taskDetailModal) return;
        taskDetailModal.classList.add('opacity-0');
        taskDetailContent?.classList.add('scale-95');
        setTimeout(() => taskDetailModal.classList.add('hidden'), 180);
    }

    function currentFocusMode() {
        const focusMode = fleetData.focusMode || {};
        return {
            active: Boolean(focusMode.active && focusMode.taskId),
            taskId: focusMode.taskId || null,
            title: focusMode.title || '',
            reason: focusMode.reason || '',
            activatedAt: Number(focusMode.activatedAt || 0) || null
        };
    }

    function compareFocusPriority(a = {}, b = {}, focusMode = currentFocusMode()) {
        if (!focusMode.active) return 0;
        const aFocus = a.id === focusMode.taskId ? 1 : 0;
        const bFocus = b.id === focusMode.taskId ? 1 : 0;
        return bFocus - aFocus;
    }

    async function activateFocusMode(taskId) {
        const task = fleetData.tasks.find(t => t.id === taskId);
        if (!task) return;
        const reason = prompt('What changed / why is this now critical?', task.title || '') || task.title || 'Critical issue';
        const now = Date.now();
        fleetData.focusMode = {
            active: true,
            taskId: task.id,
            title: task.title || 'Critical issue',
            reason: String(reason).trim(),
            activatedAt: now
        };
        appendSharedLog('Mission Control', `Activated focus mode for: ${task.title}`, now);
        fleetData.activity = Array.isArray(fleetData.activity) ? fleetData.activity : [];
        fleetData.activity.unshift({ agent: 'Mission Control', action: `Activated focus mode for "${task.title}".`, timestamp: now });
        renderFleet();
        try {
            await saveFleetData();
        } catch (e) {
            console.error(e);
            alert('Could not activate focus mode.');
        }
    }

    async function deactivateFocusMode() {
        if (!currentFocusMode().active) return;
        const title = currentFocusMode().title || 'focus mode';
        const now = Date.now();
        fleetData.focusMode = { active: false };
        appendSharedLog('Mission Control', `Exited focus mode: ${title}`, now);
        fleetData.activity = Array.isArray(fleetData.activity) ? fleetData.activity : [];
        fleetData.activity.unshift({ agent: 'Mission Control', action: `Exited focus mode for "${title}".`, timestamp: now });
        renderFleet();
        try {
            await saveFleetData();
        } catch (e) {
            console.error(e);
            alert('Could not exit focus mode.');
        }
    }

    async function addNewTask(event) {
        event?.preventDefault();
        const formData = new FormData(taskForm);
        const title = String(formData.get('title') || '').trim();
        if (!title) return;
        const description = String(formData.get('description') || '').trim();
        const tag = String(formData.get('tag') || 'General').trim() || 'General';
        const priority = String(formData.get('priority') || (taskModalMode === 'focus' ? 'high' : 'medium')).trim().toLowerCase() || 'medium';
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
            priority,
            assignee,
            scheduleDay,
            startTime,
            endTime,
            status: taskModalMode === 'focus' ? 'inprogress' : 'todo',
            timestamp: now,
            lastActive: now,
            updatedAt: now
        };
        fleetData.tasks = Array.isArray(fleetData.tasks) ? fleetData.tasks : [];
        fleetData.activity = Array.isArray(fleetData.activity) ? fleetData.activity : [];
        fleetData.tasks.unshift(task);
        fleetData.activity.unshift({ agent: 'User', action: `Created task: ${task.title}`, timestamp: now });
        appendSharedLog('Mission Control', `Created task: ${task.title}`, now);
        if (taskModalMode === 'focus') {
            fleetData.focusMode = {
                active: true,
                taskId: task.id,
                title: task.title,
                reason: description || task.title,
                activatedAt: now
            };
            fleetData.activity.unshift({ agent: 'Mission Control', action: `Activated focus mode for "${task.title}".`, timestamp: now });
            appendSharedLog('Mission Control', `Activated focus mode for: ${task.title}`, now);
        }
        renderFleet();
        closeTaskModal();
        taskModalMode = 'normal';
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
        const chief = org.find(m => m.id === 'main') || { id: 'main', name: 'Vin', role: 'Chief AI Officer', status: 'active', capabilities: ['Delegation', 'Planning', 'Coordination'] };
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
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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

    function formatDateShort(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString([], { dateStyle: 'medium' });
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
            } else if (scriptRes.status === 404) {
                if(scriptTextarea) scriptTextarea.value = `# ${title}\n\n## Hook\n\n## Script\n\n## Thumbnail / Packaging Notes\n\n## CTA\n`;
            } else {
                if(scriptTextarea) scriptTextarea.value = 'Error loading script: ' + (data.error || 'Unknown error');
            }
        } catch(e) {
            if(scriptTextarea) scriptTextarea.value = `# ${title}\n\n## Hook\n\n## Script\n\n## Thumbnail / Packaging Notes\n\n## CTA\n`;
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

    window.setVideoPriority = async (title, slot) => {
        try {
            const res = await fetch('/api/youtube/priority', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, slot })
            });
            if (res.ok) loadYouTubeData(true);
        } catch (e) {
            console.error(e);
        }
    };

    window.deleteYouTubeVideo = async (title) => {
        if (!confirm(`Permanently delete this video from the pipeline?\n\n${title}`)) return;
        try {
            const res = await fetch('/api/youtube/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title })
            });
            if (!res.ok) throw new Error('Delete failed');
            loadYouTubeData();
        } catch (e) {
            console.error(e);
            alert('Could not delete the video from the pipeline.');
        }
    };

    window.renameYouTubeVideo = async (title) => {
        const newTitle = prompt('New video title:', title);
        if (newTitle === null) return;
        const cleanTitle = String(newTitle || '').trim();
        if (!cleanTitle || cleanTitle === title) return;
        try {
            const res = await fetch('/api/youtube/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, newTitle: cleanTitle })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.success === false) throw new Error(data.error || 'Rename failed');
            loadYouTubeData(true);
            return data.item || { 'Video Title': cleanTitle };
        } catch (e) {
            console.error(e);
            alert(`Could not rename the video: ${e.message}`);
            return null;
        }
    };

    window.toggleYouTubeShortStatus = async (title, newStatus) => {
        try {
            const res = await fetch('/api/youtube/shorts/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, status: newStatus })
            });
            if (res.ok) loadYouTubeShortsData();
        } catch(e) { console.error(e); }
    };

    window.setYouTubeShortPriority = async (title, slot) => {
        try {
            const res = await fetch('/api/youtube/shorts/priority', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, slot })
            });
            if (res.ok) loadYouTubeShortsData(true);
        } catch (e) {
            console.error(e);
        }
    };

    window.deleteYouTubeShort = async (title) => {
        if (!confirm(`Permanently delete this short from the pipeline?\n\n${title}`)) return;
        try {
            const res = await fetch('/api/youtube/shorts/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title })
            });
            if (!res.ok) throw new Error('Delete failed');
            loadYouTubeShortsData();
        } catch (e) {
            console.error(e);
            alert('Could not delete the short from the pipeline.');
        }
    };

    window.renameYouTubeShort = async (title) => {
        const newTitle = prompt('New short title:', title);
        if (newTitle === null) return;
        const cleanTitle = String(newTitle || '').trim();
        if (!cleanTitle || cleanTitle === title) return;
        try {
            const res = await fetch('/api/youtube/shorts/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, newTitle: cleanTitle })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.success === false) throw new Error(data.error || 'Rename failed');
            loadYouTubeShortsData(true);
        } catch (e) {
            console.error(e);
            alert(`Could not rename the short: ${e.message}`);
        }
    };

    window.openYouTubeShortDetails = (title) => {
        const short = currentYouTubeShorts.find(item => item['Video Title'] === title);
        if (!short) return;

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4';
        const detail = (label, value, extraClass = '') => `
            <div class="youtube-detail-card ${extraClass}">
                <div class="youtube-detail-label">${escapeHtml(label)}</div>
                <div class="youtube-detail-value whitespace-pre-wrap">${escapeHtml(value || '-')}</div>
            </div>
        `;
        modal.innerHTML = `
            <div class="bg-white dark:bg-[#212121] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                <div class="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-white/70 dark:bg-[#171717]/70 flex items-start justify-between gap-4">
                    <div class="min-w-0">
                        <h2 class="text-lg font-semibold tracking-tight dark:text-white">${escapeHtml(short['Video Title'] || 'Untitled short')}</h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(short['Core Idea'] || 'No core idea set yet.')}</p>
                    </div>
                    <button type="button" data-close class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" aria-label="Close short details">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    ${detail('Platform Target', short['Platform Target'])}
                    ${detail('Target Length', short['Target Length'])}
                    ${detail('Personal Why / Twist', short['Personal Why / Twist'], 'md:col-span-2')}
                    ${detail('Viewer Avatar', short['Viewer Avatar'], 'md:col-span-2')}
                    ${detail('First Frame', short['First Frame'])}
                    ${detail('On-screen Text', short['On-screen Text'])}
                    ${detail('Spoken Hook', short['Spoken Hook'])}
                    ${detail('Payoff', short['Payoff'])}
                    ${detail('Script Beats', short['Script Beats'], 'md:col-span-2')}
                    ${detail('Edit Notes', short['Edit Notes'])}
                    ${detail('Analytics Hypothesis', short['Analytics Hypothesis'])}
                    ${detail('Status', short['Status'])}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const close = () => modal.remove();
        modal.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', close));
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
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
    const youtubeAddVideoBtn = document.getElementById('youtube-add-video-btn');
    const ytShortsContainer = document.getElementById('youtube-shorts-container');
    const ytShortsTotal = document.getElementById('yt-shorts-total');
    const ytShortsDone = document.getElementById('yt-shorts-done');
    const ytShortsRemaining = document.getElementById('yt-shorts-remaining');
    const ytShortsCompletion = document.getElementById('yt-shorts-completion');
    const youtubeShortsFilterButtons = document.querySelectorAll('.youtube-shorts-filter-btn');
    const youtubeAddShortBtn = document.getElementById('youtube-add-short-btn');
    let currentYouTubeShorts = [];
    const youtubeSwipeForm = document.getElementById('youtube-swipe-form');
    const youtubeSwipeType = document.getElementById('youtube-swipe-type');
    const youtubeSwipeTitle = document.getElementById('youtube-swipe-title');
    const youtubeSwipeSource = document.getElementById('youtube-swipe-source');
    const youtubeSwipeNotes = document.getElementById('youtube-swipe-notes');
    const youtubeSwipeItems = document.getElementById('youtube-swipe-items');
    const youtubeRefreshCompetitorsBtn = document.getElementById('youtube-refresh-competitors-btn');
    const youtubeAddCompetitorBtn = document.getElementById('youtube-add-competitor-btn');
    const youtubeCompetitorContainer = document.getElementById('youtube-competitor-container');
    const youtubePageRefreshAnalyticsBtn = document.getElementById('youtube-page-refresh-analytics-btn');
    const youtubePageSyncAnalyticsBtn = document.getElementById('youtube-page-sync-analytics-btn');
    const youtubePageAnalyticsVideoCount = document.getElementById('youtube-page-analytics-video-count');
    const youtubePageAnalyticsAvgCtr = document.getElementById('youtube-page-analytics-avg-ctr');
    const youtubePageAnalyticsAvgRetention = document.getElementById('youtube-page-analytics-avg-retention');
    const youtubePageAnalyticsTable = document.getElementById('youtube-page-analytics-table');
    let activeYoutubeFilter = 'all';
    let activeYoutubeShortsFilter = 'all';
    let activeYoutubeSection = 'pipeline';
    const isDoneStatus = (status) => String(status || 'Planned').trim().toLowerCase() === 'done';
    const refreshInstagramBtn = document.getElementById('refresh-instagram-btn');
    const instagramReelsContainer = document.getElementById('instagram-reels-container');
    const instagramTotal = document.getElementById('ig-total');
    const instagramProgress = document.getElementById('ig-progress');
    const instagramPublished = document.getElementById('ig-published');
    const instagramCompletion = document.getElementById('ig-completion');
    const instagramFilterButtons = document.querySelectorAll('.instagram-filter-btn');
    const instagramAddReelBtn = document.getElementById('instagram-add-reel-btn');
    const instagramSectionTabs = document.querySelectorAll('.instagram-section-tab');
    const instagramSectionPanels = document.querySelectorAll('.instagram-section-panel');
    const instagramIdeaForm = document.getElementById('instagram-idea-form');
    const instagramIdeaType = document.getElementById('instagram-idea-type');
    const instagramIdeaTitle = document.getElementById('instagram-idea-title');
    const instagramIdeaNotes = document.getElementById('instagram-idea-notes');
    const instagramIdeasContainer = document.getElementById('instagram-ideas-container');
    const instagramAccountForm = document.getElementById('instagram-account-form');
    const instagramAccountHandle = document.getElementById('instagram-account-handle');
    const instagramAccountUrl = document.getElementById('instagram-account-url');
    const instagramAccountNiche = document.getElementById('instagram-account-niche');
    const instagramAccountNotes = document.getElementById('instagram-account-notes');
    const instagramAccountsContainer = document.getElementById('instagram-accounts-container');
    let activeInstagramFilter = 'all';
    let activeInstagramSection = 'pipeline';
    let currentInstagramReels = [];
    let currentInstagramIdeas = [];
    let currentInstagramAccounts = [];
    const isInstagramPublished = (status) => ['published', 'done'].includes(String(status || 'Idea').trim().toLowerCase());
    const isInstagramActive = (status) => ['ready to film', 'filmed', 'editing', 'scheduled'].includes(String(status || '').trim().toLowerCase());

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
        if (activeYoutubeSection === 'shorts') loadYouTubeShortsData(true);
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

    function syncYoutubeShortsFilterButtons() {
        youtubeShortsFilterButtons.forEach(filterBtn => {
            const isActive = filterBtn.dataset.filter === activeYoutubeShortsFilter;
            filterBtn.classList.toggle('bg-black', isActive);
            filterBtn.classList.toggle('text-white', isActive);
            filterBtn.classList.toggle('dark:bg-white', isActive);
            filterBtn.classList.toggle('dark:text-black', isActive);
            filterBtn.classList.toggle('text-gray-600', !isActive);
            filterBtn.classList.toggle('dark:text-gray-300', !isActive);
        });
    }

    function syncInstagramFilterButtons() {
        instagramFilterButtons.forEach(filterBtn => {
            const isActive = filterBtn.dataset.filter === activeInstagramFilter;
            filterBtn.classList.toggle('bg-black', isActive);
            filterBtn.classList.toggle('text-white', isActive);
            filterBtn.classList.toggle('dark:bg-white', isActive);
            filterBtn.classList.toggle('dark:text-black', isActive);
            filterBtn.classList.toggle('text-gray-600', !isActive);
            filterBtn.classList.toggle('dark:text-gray-300', !isActive);
        });
    }

    function syncInstagramSectionTabs() {
        instagramSectionTabs.forEach(tab => {
            const isActive = tab.dataset.instagramSection === activeInstagramSection;
            tab.classList.toggle('bg-black', isActive);
            tab.classList.toggle('text-white', isActive);
            tab.classList.toggle('dark:bg-white', isActive);
            tab.classList.toggle('dark:text-black', isActive);
            tab.classList.toggle('text-gray-600', !isActive);
            tab.classList.toggle('dark:text-gray-300', !isActive);
        });
        instagramSectionPanels.forEach(panel => {
            panel.classList.toggle('hidden', panel.dataset.instagramPanel !== activeInstagramSection);
        });
        if (activeInstagramSection === 'ideas') loadInstagramIdeas(true);
        if (activeInstagramSection === 'accounts') loadInstagramAccounts(true);
        if (activeInstagramSection === 'pipeline') loadInstagramReelsData(true);
    }

    if (refreshYoutubeBtn) refreshYoutubeBtn.addEventListener('click', () => {
        if (activeYoutubeSection === 'shorts') loadYouTubeShortsData();
        else loadYouTubeData();
    });
    youtubeSectionTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            activeYoutubeSection = tab.dataset.youtubeSection || 'pipeline';
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
    youtubeShortsFilterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            activeYoutubeShortsFilter = btn.dataset.filter || 'all';
            syncYoutubeShortsFilterButtons();
            loadYouTubeShortsData(true);
        });
    });
    if (youtubeAddVideoBtn) youtubeAddVideoBtn.addEventListener('click', () => openYouTubeAddModal('video'));
    if (youtubeAddShortBtn) youtubeAddShortBtn.addEventListener('click', () => openYouTubeAddModal('short'));
    if (youtubeSwipeForm) youtubeSwipeForm.addEventListener('submit', addYouTubeSwipeItem);
    if (youtubeRefreshCompetitorsBtn) youtubeRefreshCompetitorsBtn.addEventListener('click', () => loadYouTubeCompetitors());
    if (youtubeAddCompetitorBtn) youtubeAddCompetitorBtn.addEventListener('click', openYouTubeAddCompetitorModal);
    if (youtubePageRefreshAnalyticsBtn) youtubePageRefreshAnalyticsBtn.addEventListener('click', () => loadYouTubePageAnalytics());
    if (youtubePageSyncAnalyticsBtn) youtubePageSyncAnalyticsBtn.addEventListener('click', refreshYouTubePageAnalyticsFromApi);
    if (refreshInstagramBtn) refreshInstagramBtn.addEventListener('click', () => loadInstagramReelsData());
    if (instagramAddReelBtn) instagramAddReelBtn.addEventListener('click', openInstagramAddModal);
    instagramSectionTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            activeInstagramSection = tab.dataset.instagramSection || 'pipeline';
            syncInstagramSectionTabs();
        });
    });
    instagramFilterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            activeInstagramFilter = btn.dataset.filter || 'all';
            syncInstagramFilterButtons();
            loadInstagramReelsData(true);
        });
    });
    if (instagramIdeaForm) instagramIdeaForm.addEventListener('submit', addInstagramIdea);
    if (instagramAccountForm) instagramAccountForm.addEventListener('submit', addInstagramAccount);
    syncYoutubeSectionTabs();
    syncYoutubeFilterButtons();
    syncYoutubeShortsFilterButtons();
    syncInstagramFilterButtons();
    syncInstagramSectionTabs();

    function openYouTubeAddModal(kind = 'video') {
        const isShort = kind === 'short';
        const fields = isShort
            ? [
                ['Video Title', 'Short title', 'input', true],
                ['Platform Target', 'YouTube Shorts / TikTok / Reels', 'input'],
                ['Target Length', '30-45s', 'input'],
                ['Core Idea', 'What is the short about?', 'textarea'],
                ['First Frame', 'What do we see immediately?', 'input'],
                ['On-screen Text', 'Text on screen in first second', 'input'],
                ['Spoken Hook', 'Opening line', 'textarea'],
                ['Script Beats', 'Beat-by-beat outline', 'textarea'],
                ['Payoff', 'What does the viewer get?', 'textarea'],
                ['Edit Notes', 'Cuts, captions, B-roll', 'textarea'],
                ['Analytics Hypothesis', 'What are we testing?', 'textarea']
            ]
            : [
                ['Video Title', 'Long-form video title', 'input', true],
                ['Script Link', 'Optional script/doc link', 'input'],
                ['Hook Strategy', 'Opening hook angle', 'textarea'],
                ['The Promise', 'What result does the viewer get?', 'textarea'],
                ['Core Structure', 'Main sections / flow', 'textarea'],
                ['Building Trust', 'Proof, examples, credibility', 'textarea'],
                ['The Aha Moment', 'The key insight', 'textarea'],
                ['Call to Action (Binge Loop)', 'What should they watch/do next?', 'textarea']
            ];
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4';
        modal.innerHTML = `
            <div class="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#171717] border border-gray-200 dark:border-white/10 shadow-2xl">
                <form id="youtube-add-item-form" class="p-6 space-y-4">
                    <div class="flex items-start justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-4">
                        <div>
                            <h2 class="text-xl font-semibold dark:text-white">${isShort ? 'Add Short' : 'Add Video'}</h2>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Manual pipeline entry — no AI tokens burned. You can ask me to expand it later.</p>
                        </div>
                        <button type="button" data-close class="text-sm px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10">Close</button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${fields.map(([name, placeholder, type, required]) => `
                            <label class="block ${type === 'textarea' ? 'md:col-span-2' : ''}">
                                <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">${escapeHtml(name)}${required ? ' *' : ''}</span>
                                ${type === 'textarea'
                                    ? `<textarea name="${escapeHtml(name)}" rows="3" ${required ? 'required' : ''} placeholder="${escapeHtml(placeholder)}" class="mt-1 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm dark:text-white"></textarea>`
                                    : `<input name="${escapeHtml(name)}" ${required ? 'required' : ''} placeholder="${escapeHtml(placeholder)}" class="mt-1 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm dark:text-white" />`}
                            </label>
                        `).join('')}
                        <label class="block">
                            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">Status</span>
                            <select name="Status" class="mt-1 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm dark:text-white">
                                <option value="Planned">Planned</option>
                                <option value="Done">Done</option>
                            </select>
                        </label>
                        <label class="block">
                            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">Priority slot</span>
                            <select name="prioritySlot" class="mt-1 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm dark:text-white">
                                <option value="">None</option>
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4">4</option>
                                <option value="5">5</option>
                                <option value="6">6</option>
                                <option value="7">7</option>
                            </select>
                        </label>
                    </div>
                    <div class="flex items-center justify-end gap-2 pt-2">
                        <button type="button" data-close class="text-sm px-4 py-2 rounded-full border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10">Cancel</button>
                        <button type="submit" class="text-sm bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 transition-colors">Add to pipeline</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        const close = () => modal.remove();
        modal.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', close));
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        modal.querySelector('form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.currentTarget.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerText = 'Adding...';
            const formData = new FormData(e.currentTarget);
            const row = {};
            fields.forEach(([name]) => row[name] = String(formData.get(name) || '').trim());
            row.Status = String(formData.get('Status') || 'Planned');
            try {
                const res = await fetch(isShort ? '/api/youtube/shorts/add' : '/api/youtube/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ row, prioritySlot: String(formData.get('prioritySlot') || '') })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || data.success === false) throw new Error(data.error || 'Add failed');
                close();
                if (isShort) {
                    activeYoutubeSection = 'shorts';
                    syncYoutubeSectionTabs();
                    loadYouTubeShortsData(true);
                } else {
                    activeYoutubeSection = 'pipeline';
                    syncYoutubeSectionTabs();
                    loadYouTubeData(true);
                }
            } catch (err) {
                alert(`Could not add ${isShort ? 'short' : 'video'}: ${err.message}`);
                submitBtn.disabled = false;
                submitBtn.innerText = 'Add to pipeline';
            }
        });
        modal.querySelector('input[name="Video Title"]')?.focus();
    }

    function defaultYouTubeScriptPath(title = '') {
        const slug = String(title || 'untitled-video')
            .trim()
            .replace(/&/g, 'and')
            .replace(/[^a-z0-9]+/gi, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 90) || 'untitled-video';
        return `Scripts/${slug}.md`;
    }

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
                const jsString = (s) => String(s ?? '')
                    .replace(/\\/g, '\\\\')
                    .replace(/'/g, "\\'")
                    .replace(/"/g, '&quot;')
                    .replace(/[\r\n]+/g, ' ');
                const reversed = [...filteredVideos].reverse();
                const pinned = ['1', '2', '3', '4', '5', '6', '7']
                    .map(slot => reversed.find(video => String(video.prioritySlot || '') === slot))
                    .filter(Boolean);
                const pinnedTitles = new Set(pinned.map(video => video['Video Title']));
                const orderedVideos = [...pinned, ...reversed.filter(video => !pinnedTitles.has(video['Video Title']))];
                ytContainer.innerHTML = orderedVideos.map((v, index) => {
                    const title = v['Video Title'] || 'Untitled';
                    const status = v['Status'] || 'Planned';
                    const scriptLink = v['Script Link'] || defaultYouTubeScriptPath(title);
                    const hasScriptLink = Boolean(v['Script Link']);
                    const done = isDoneStatus(status);
                    const latestPill = index === 0 && !done
                        ? '<span class="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Latest</span>'
                        : '';
                    return `
                        <article class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden ${done ? 'opacity-75' : ''}">
                            <div class="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-white/60 dark:bg-[#171717]/60 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <div class="min-w-0">
                                    <h3 onclick="openScriptEditor('${jsString(title)}', '${jsString(scriptLink)}')" class="text-lg font-semibold dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors ${done ? 'line-through text-gray-400 dark:text-gray-500' : ''}" title="Click to view/edit script">${escapeHtml(title)}</h3>
                                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(v['The Promise'] || 'No promise set yet.')}</p>
                                </div>
                                <div class="flex items-center gap-2 flex-wrap md:justify-end">
                                    ${latestPill}
                                    <div class="flex items-center gap-1 rounded-full border border-gray-200 dark:border-white/10 px-1.5 py-1 bg-white/80 dark:bg-white/5">
                                        ${['1', '2', '3', '4', '5', '6', '7'].map(slot => {
                                            const active = String(v.prioritySlot || '') === slot;
                                            return `<button onclick="setVideoPriority('${jsString(title)}', '${active ? '' : slot}')" class="text-[11px] w-6 h-6 rounded-full transition-colors ${active ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}">${slot}</button>`;
                                        }).join('')}
                                    </div>
                                    <span class="text-xs px-2.5 py-1 rounded-full ${done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'}">${done ? 'Done' : 'Planned'}</span>
                                    ${hasScriptLink ? '<span class="text-xs px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">Script linked</span>' : '<span class="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400">Draft script</span>'}
                                    <button onclick="toggleVideoStatus('${jsString(title)}', '${done ? 'Planned' : 'Done'}')" class="text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${done ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-200'}">
                                        ${done ? 'Mark as Planned' : 'Mark as Done'}
                                    </button>
                                    <button onclick="renameYouTubeVideo('${jsString(title)}')" class="text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" title="Edit video title">
                                        Edit title
                                    </button>
                                    <button onclick="deleteYouTubeVideo('${jsString(title)}')" class="text-xs px-2.5 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10 transition-colors">
                                        Delete
                                    </button>
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

    async function loadYouTubeShortsData(silent = false) {
        if (!ytShortsContainer) return;
        try {
            const res = await fetch('/api/youtube/shorts');
            if (!res.ok) throw new Error(`YouTube Shorts request failed: ${res.status}`);
            const data = await res.json();
            const shorts = Array.isArray(data.shorts) ? data.shorts : [];
            currentYouTubeShorts = shorts;
            const doneCount = shorts.filter(v => isDoneStatus(v['Status'])).length;
            const remainingCount = shorts.length - doneCount;
            const completionRate = shorts.length ? Math.round((doneCount / shorts.length) * 100) : 0;
            const filteredShorts = shorts.filter(v => {
                const isDone = isDoneStatus(v['Status']);
                if (activeYoutubeShortsFilter === 'done') return isDone;
                if (activeYoutubeShortsFilter === 'todo') return !isDone;
                return true;
            });
            if (ytShortsTotal) ytShortsTotal.innerText = shorts.length;
            if (ytShortsDone) ytShortsDone.innerText = doneCount;
            if (ytShortsRemaining) ytShortsRemaining.innerText = remainingCount;
            if (ytShortsCompletion) ytShortsCompletion.innerText = `${completionRate}%`;

            if (shorts.length === 0) {
                ytShortsContainer.innerHTML = '<div class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-8 text-gray-500">No shorts found yet. Add ideas to <code>skills/youtube-short-form-planner/references/Short_Video_Planner.csv</code>.</div>';
                return;
            }
            if (filteredShorts.length === 0) {
                ytShortsContainer.innerHTML = '<div class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-8 text-gray-500">No shorts match this filter.</div>';
                return;
            }

            const jsString = (s) => String(s ?? '')
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "\\'")
                .replace(/"/g, '&quot;')
                .replace(/[\r\n]+/g, ' ');
            const reversed = [...filteredShorts].reverse();
            const pinned = ['1', '2', '3']
                .map(slot => reversed.find(short => String(short.prioritySlot || '') === slot))
                .filter(Boolean);
            const pinnedTitles = new Set(pinned.map(short => short['Video Title']));
            const orderedShorts = [...pinned, ...reversed.filter(short => !pinnedTitles.has(short['Video Title']))];

            ytShortsContainer.innerHTML = orderedShorts.map((v, index) => {
                const title = v['Video Title'] || 'Untitled short';
                const status = v['Status'] || 'Planned';
                const done = isDoneStatus(status);
                const latestPill = index === 0 && !done
                    ? '<span class="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Latest</span>'
                    : '';
                return `
                    <article class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden ${done ? 'opacity-75' : ''}">
                        <div class="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-white/60 dark:bg-[#171717]/60 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div class="min-w-0">
                                <h3 onclick="openYouTubeShortDetails('${jsString(title)}')" class="text-lg font-semibold dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors ${done ? 'line-through text-gray-400 dark:text-gray-500' : ''}" title="Click to view short details">${escapeHtml(title)}</h3>
                                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(v['Core Idea'] || v['Premise'] || 'No core idea set yet.')}</p>
                            </div>
                            <div class="flex items-center gap-2 flex-wrap md:justify-end">
                                ${latestPill}
                                <div class="flex items-center gap-1 rounded-full border border-gray-200 dark:border-white/10 px-1.5 py-1 bg-white/80 dark:bg-white/5">
                                    ${['1', '2', '3'].map(slot => {
                                        const active = String(v.prioritySlot || '') === slot;
                                        return `<button onclick="setYouTubeShortPriority('${jsString(title)}', '${active ? '' : slot}')" class="text-[11px] w-6 h-6 rounded-full transition-colors ${active ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}">${slot}</button>`;
                                    }).join('')}
                                </div>
                                <span class="text-xs px-2.5 py-1 rounded-full ${done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'}">${done ? 'Done' : 'Planned'}</span>
                                <button onclick="toggleYouTubeShortStatus('${jsString(title)}', '${done ? 'Planned' : 'Done'}')" class="text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${done ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-200'}">
                                    ${done ? 'Mark as Planned' : 'Mark as Done'}
                                </button>
                                <button onclick="renameYouTubeShort('${jsString(title)}')" class="text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">Rename</button>
                                <button onclick="deleteYouTubeShort('${jsString(title)}')" class="text-xs px-2.5 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10 transition-colors">Delete</button>
                            </div>
                        </div>
                    </article>
                `;
            }).join('');
        } catch(e) {
            console.error(e);
            ytShortsContainer.innerHTML = '<div class="bg-gray-50 dark:bg-white/5 border border-red-200 dark:border-red-500/20 rounded-lg p-8 text-red-500">YouTube Shorts failed to load.</div>';
        }
    }

    function instagramStatusClass(status) {
        const key = String(status || 'Idea').trim().toLowerCase();
        if (key === 'published' || key === 'done') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
        if (key === 'scheduled') return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
        if (key === 'editing' || key === 'filmed') return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300';
        if (key === 'ready to film') return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
        return 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400';
    }

    async function loadInstagramReelsData(silent = false) {
        if (!instagramReelsContainer) return;
        if (refreshInstagramBtn && !silent) refreshInstagramBtn.innerText = 'Loading...';
        try {
            const res = await fetch('/api/instagram/reels');
            if (!res.ok) throw new Error(`Instagram request failed: ${res.status}`);
            const data = await res.json();
            const reels = Array.isArray(data.reels) ? data.reels : [];
            currentInstagramReels = reels;
            const publishedCount = reels.filter(v => isInstagramPublished(v.Status)).length;
            const activeCount = reels.filter(v => isInstagramActive(v.Status)).length;
            const completionRate = reels.length ? Math.round((publishedCount / reels.length) * 100) : 0;
            const filteredReels = reels.filter(v => {
                const done = isInstagramPublished(v.Status);
                if (activeInstagramFilter === 'done') return done;
                if (activeInstagramFilter === 'todo') return !done;
                return true;
            });
            if (instagramTotal) instagramTotal.innerText = reels.length;
            if (instagramProgress) instagramProgress.innerText = activeCount;
            if (instagramPublished) instagramPublished.innerText = publishedCount;
            if (instagramCompletion) instagramCompletion.innerText = `${completionRate}%`;

            if (!reels.length) {
                instagramReelsContainer.innerHTML = '<div class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-8 text-gray-500">No Instagram Reel ideas yet. Add your first one above.</div>';
                return;
            }
            if (!filteredReels.length) {
                instagramReelsContainer.innerHTML = '<div class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-8 text-gray-500">No Reels match this filter.</div>';
                return;
            }

            const jsString = (s) => String(s ?? '')
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "\\'")
                .replace(/"/g, '&quot;')
                .replace(/[\r\n]+/g, ' ');
            const reversed = [...filteredReels].reverse();
            const pinned = ['1', '2', '3']
                .map(slot => reversed.find(reel => String(reel.prioritySlot || '') === slot))
                .filter(Boolean);
            const pinnedTitles = new Set(pinned.map(reel => reel['Video Title']));
            const orderedReels = [...pinned, ...reversed.filter(reel => !pinnedTitles.has(reel['Video Title']))];

            instagramReelsContainer.innerHTML = orderedReels.map((v, index) => {
                const title = v['Video Title'] || 'Untitled Reel';
                const status = v.Status || 'Idea';
                const published = isInstagramPublished(status);
                const latestPill = index === 0 && !published
                    ? '<span class="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Latest</span>'
                    : '';
                return `
                    <article class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden ${published ? 'opacity-75' : ''}">
                        <div class="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-white/60 dark:bg-[#171717]/60 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div class="min-w-0">
                                <h3 onclick="editInstagramReel('${jsString(title)}')" class="text-lg font-semibold dark:text-white hover:text-pink-600 dark:hover:text-pink-400 cursor-pointer transition-colors ${published ? 'line-through text-gray-400 dark:text-gray-500' : ''}" title="Click to edit this Reel">${escapeHtml(title)}</h3>
                                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(v['Core Idea'] || 'No core idea set yet.')}</p>
                            </div>
                            <div class="flex items-center gap-2 flex-wrap md:justify-end">
                                ${latestPill}
                                <div class="flex items-center gap-1 rounded-full border border-gray-200 dark:border-white/10 px-1.5 py-1 bg-white/80 dark:bg-white/5">
                                    ${['1', '2', '3'].map(slot => {
                                        const active = String(v.prioritySlot || '') === slot;
                                        return `<button onclick="setInstagramReelPriority('${jsString(title)}', '${active ? '' : slot}')" class="text-[11px] w-6 h-6 rounded-full transition-colors ${active ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}">${slot}</button>`;
                                    }).join('')}
                                </div>
                                <span class="text-xs px-2.5 py-1 rounded-full ${instagramStatusClass(status)}">${escapeHtml(status)}</span>
                                <button onclick="toggleInstagramReelStatus('${jsString(title)}', '${published ? 'Idea' : 'Done'}')" class="text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${published ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-200'}">
                                    ${published ? 'Mark as Planned' : 'Mark as Done'}
                                </button>
                                <button onclick="deleteInstagramReel('${jsString(title)}')" class="text-xs px-2.5 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10 transition-colors">Delete</button>
                            </div>
                        </div>
                    </article>
                `;
            }).join('');
        } catch(e) {
            console.error(e);
            instagramReelsContainer.innerHTML = '<div class="bg-gray-50 dark:bg-white/5 border border-red-200 dark:border-red-500/20 rounded-lg p-8 text-red-500">Instagram failed to load.</div>';
        }
        if (refreshInstagramBtn && !silent) refreshInstagramBtn.innerText = 'Refresh Data';
    }

    async function loadInstagramIdeas(silent = false) {
        if (!instagramIdeasContainer) return;
        if (!silent) instagramIdeasContainer.innerHTML = '<div class="col-span-full text-sm text-gray-500 dark:text-gray-400">Loading ideas...</div>';
        try {
            const res = await fetch('/api/instagram/ideas');
            if (!res.ok) throw new Error(`Instagram ideas request failed: ${res.status}`);
            const data = await res.json();
            const items = Array.isArray(data.items) ? data.items : [];
            currentInstagramIdeas = items;
            if (!items.length) {
                instagramIdeasContainer.innerHTML = '<div class="col-span-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-8 text-gray-500">No Instagram inspiration saved yet. Use this for non-video ideas like daily Reel habits, music/B-roll patterns, and repeatable creative prompts.</div>';
                return;
            }
            const jsString = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/[\r\n]+/g, ' ');
            instagramIdeasContainer.innerHTML = items.map(item => `
                <article class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                    <div class="px-5 py-4 border-b border-gray-200 dark:border-white/10 bg-white/60 dark:bg-[#171717]/60 flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2 flex-wrap mb-2">
                                <span class="text-[11px] px-2.5 py-1 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300">${escapeHtml(item.type || 'idea')}</span>
                                <span class="text-[11px] text-gray-400 dark:text-gray-500">${escapeHtml(formatDateShort(item.createdAt))}</span>
                            </div>
                            <h3 class="text-base font-semibold dark:text-white">${escapeHtml(item.title || 'Untitled idea')}</h3>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="editInstagramIdea('${jsString(item.id)}')" class="text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">Edit</button>
                            <button onclick="deleteInstagramIdea('${jsString(item.id)}')" class="text-xs px-2.5 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10 transition-colors">Delete</button>
                        </div>
                    </div>
                    ${item.notes ? `<div class="p-5 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">${escapeHtml(item.notes)}</div>` : ''}
                </article>
            `).join('');
        } catch (e) {
            console.error(e);
            instagramIdeasContainer.innerHTML = '<div class="col-span-full bg-gray-50 dark:bg-white/5 border border-red-200 dark:border-red-500/20 rounded-lg p-8 text-red-500">Instagram ideas failed to load.</div>';
        }
    }

    async function addInstagramIdea(e) {
        e.preventDefault();
        const title = String(instagramIdeaTitle?.value || '').trim();
        if (!title) return;
        const submitBtn = instagramIdeaForm?.querySelector('button[type="submit"]');
        const originalText = submitBtn?.innerText || 'Add idea';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = 'Adding...';
        }
        try {
            const res = await fetch('/api/instagram/ideas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: instagramIdeaType?.value || 'inspiration',
                    title,
                    notes: String(instagramIdeaNotes?.value || '').trim()
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.success === false) throw new Error(data.error || 'Add failed');
            if (instagramIdeaTitle) instagramIdeaTitle.value = '';
            if (instagramIdeaNotes) instagramIdeaNotes.value = '';
            loadInstagramIdeas(true);
        } catch (err) {
            alert(`Could not add Instagram idea: ${err.message}`);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            }
        }
    }

    window.editInstagramIdea = (id) => {
        const idea = currentInstagramIdeas.find(item => item.id === id);
        if (!idea) return alert('Idea not found. Refresh and try again.');
        openInstagramIdeaEditModal(idea);
    };

    function openInstagramIdeaEditModal(idea) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4';
        const option = (value, label) => `<option value="${escapeHtml(value)}" ${String(idea.type || '') === value ? 'selected' : ''}>${escapeHtml(label)}</option>`;
        modal.innerHTML = `
            <div class="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#171717] border border-gray-200 dark:border-white/10 shadow-2xl">
                <form id="instagram-edit-idea-form" class="p-6 space-y-4">
                    <div class="flex items-start justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-4">
                        <div>
                            <h2 class="text-xl font-semibold dark:text-white">Edit Idea & Inspiration</h2>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Update the category, title, or notes.</p>
                        </div>
                        <button type="button" data-close class="text-sm px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10">Close</button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <label class="block">
                            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">Type</span>
                            <select name="type" class="mt-1 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm dark:text-white">
                                ${option('principle', 'Content principle')}
                                ${option('habit', 'Habit / cadence')}
                                ${option('music', 'Music / audio')}
                                ${option('b-roll', 'B-roll')}
                                ${option('inspiration', 'Inspiration')}
                                ${option('prompt', 'Recurring prompt')}
                            </select>
                        </label>
                        <label class="block md:col-span-3">
                            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">Title *</span>
                            <input name="title" required value="${escapeHtml(idea.title || '')}" class="mt-1 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm dark:text-white" />
                        </label>
                        <label class="block md:col-span-4">
                            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">Notes</span>
                            <textarea name="notes" rows="6" class="mt-1 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm dark:text-white">${escapeHtml(idea.notes || '')}</textarea>
                        </label>
                    </div>
                    <div class="flex items-center justify-end gap-2 pt-2">
                        <button type="button" data-close class="text-sm px-4 py-2 rounded-full border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10">Cancel</button>
                        <button type="submit" class="text-sm bg-pink-600 text-white px-4 py-2 rounded-full hover:bg-pink-700 transition-colors">Save changes</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        const close = () => modal.remove();
        modal.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', close));
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        modal.querySelector('form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.currentTarget.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerText = 'Saving...';
            const formData = new FormData(e.currentTarget);
            try {
                const res = await fetch(`/api/instagram/ideas/${encodeURIComponent(idea.id)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: String(formData.get('type') || 'inspiration'),
                        title: String(formData.get('title') || '').trim(),
                        notes: String(formData.get('notes') || '').trim()
                    })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || data.success === false) throw new Error(data.error || 'Update failed');
                close();
                loadInstagramIdeas(true);
            } catch (err) {
                alert(`Could not update Instagram idea: ${err.message}`);
                submitBtn.disabled = false;
                submitBtn.innerText = 'Save changes';
            }
        });
        modal.querySelector('input[name="title"]')?.focus();
    }

    window.deleteInstagramIdea = async (id) => {
        if (!confirm('Delete this Instagram idea?')) return;
        try {
            const res = await fetch(`/api/instagram/ideas/${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            loadInstagramIdeas(true);
        } catch (e) {
            console.error(e);
            alert('Could not delete the Instagram idea.');
        }
    };

    async function loadInstagramAccounts(silent = false) {
        if (!instagramAccountsContainer) return;
        if (!silent) instagramAccountsContainer.innerHTML = '<div class="col-span-full text-sm text-gray-500 dark:text-gray-400">Loading accounts...</div>';
        try {
            const res = await fetch('/api/instagram/accounts');
            if (!res.ok) throw new Error(`Instagram accounts request failed: ${res.status}`);
            const data = await res.json();
            const items = Array.isArray(data.items) ? data.items : [];
            currentInstagramAccounts = items;
            if (!items.length) {
                instagramAccountsContainer.innerHTML = '<div class="col-span-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-8 text-gray-500">No inspiration accounts saved yet. Add similar accounts you want to study for formats, hooks, edits, B-roll, and positioning.</div>';
                return;
            }
            const jsString = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/[\r\n]+/g, ' ');
            instagramAccountsContainer.innerHTML = items.map(item => {
                const cleanUrl = String(item.url || '').trim();
                const accountUrl = cleanUrl || `https://www.instagram.com/${String(item.handle || '').replace(/^@/, '')}`;
                return `
                    <article class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                        <div class="px-5 py-4 border-b border-gray-200 dark:border-white/10 bg-white/60 dark:bg-[#171717]/60 flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <a href="${escapeHtml(accountUrl)}" target="_blank" rel="noopener" class="text-base font-semibold dark:text-white hover:text-pink-600 dark:hover:text-pink-400">${escapeHtml(item.handle || '@account')}</a>
                                ${item.niche ? `<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(item.niche)}</p>` : ''}
                            </div>
                            <div class="flex items-center gap-2">
                                <button onclick="editInstagramAccount('${jsString(item.id)}')" class="text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">Edit</button>
                                <button onclick="deleteInstagramAccount('${jsString(item.id)}')" class="text-xs px-2.5 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10 transition-colors">Delete</button>
                            </div>
                        </div>
                        ${item.notes ? `<div class="p-5 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">${escapeHtml(item.notes)}</div>` : ''}
                    </article>
                `;
            }).join('');
        } catch (e) {
            console.error(e);
            instagramAccountsContainer.innerHTML = '<div class="col-span-full bg-gray-50 dark:bg-white/5 border border-red-200 dark:border-red-500/20 rounded-lg p-8 text-red-500">Instagram accounts failed to load.</div>';
        }
    }

    async function addInstagramAccount(e) {
        e.preventDefault();
        const handle = String(instagramAccountHandle?.value || '').trim();
        if (!handle) return;
        const submitBtn = instagramAccountForm?.querySelector('button[type="submit"]');
        const originalText = submitBtn?.innerText || 'Add account';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = 'Adding...';
        }
        try {
            const res = await fetch('/api/instagram/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    handle,
                    url: String(instagramAccountUrl?.value || '').trim(),
                    niche: String(instagramAccountNiche?.value || '').trim(),
                    notes: String(instagramAccountNotes?.value || '').trim()
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.success === false) throw new Error(data.error || 'Add failed');
            if (instagramAccountHandle) instagramAccountHandle.value = '';
            if (instagramAccountUrl) instagramAccountUrl.value = '';
            if (instagramAccountNiche) instagramAccountNiche.value = '';
            if (instagramAccountNotes) instagramAccountNotes.value = '';
            loadInstagramAccounts(true);
        } catch (err) {
            alert(`Could not add Instagram account: ${err.message}`);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            }
        }
    }

    window.editInstagramAccount = (id) => {
        const account = currentInstagramAccounts.find(item => item.id === id);
        if (!account) return alert('Account not found. Refresh and try again.');
        openInstagramAccountEditModal(account);
    };

    function openInstagramAccountEditModal(account) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4';
        modal.innerHTML = `
            <div class="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#171717] border border-gray-200 dark:border-white/10 shadow-2xl">
                <form class="p-6 space-y-4">
                    <div class="flex items-start justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-4">
                        <div><h2 class="text-xl font-semibold dark:text-white">Edit Inspiration Account</h2><p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Update the account and what you want to study.</p></div>
                        <button type="button" data-close class="text-sm px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10">Close</button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label class="block"><span class="text-xs font-semibold text-gray-600 dark:text-gray-300">Handle *</span><input name="handle" required value="${escapeHtml(account.handle || '')}" class="mt-1 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm dark:text-white" /></label>
                        <label class="block"><span class="text-xs font-semibold text-gray-600 dark:text-gray-300">Instagram URL</span><input name="url" value="${escapeHtml(account.url || '')}" class="mt-1 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm dark:text-white" /></label>
                        <label class="block md:col-span-2"><span class="text-xs font-semibold text-gray-600 dark:text-gray-300">Niche / why similar</span><input name="niche" value="${escapeHtml(account.niche || '')}" class="mt-1 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm dark:text-white" /></label>
                        <label class="block md:col-span-2"><span class="text-xs font-semibold text-gray-600 dark:text-gray-300">What to study</span><textarea name="notes" rows="6" class="mt-1 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm dark:text-white">${escapeHtml(account.notes || '')}</textarea></label>
                    </div>
                    <div class="flex items-center justify-end gap-2 pt-2"><button type="button" data-close class="text-sm px-4 py-2 rounded-full border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10">Cancel</button><button type="submit" class="text-sm bg-pink-600 text-white px-4 py-2 rounded-full hover:bg-pink-700 transition-colors">Save changes</button></div>
                </form>
            </div>`;
        document.body.appendChild(modal);
        const close = () => modal.remove();
        modal.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', close));
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        modal.querySelector('form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.currentTarget.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerText = 'Saving...';
            const formData = new FormData(e.currentTarget);
            try {
                const res = await fetch(`/api/instagram/accounts/${encodeURIComponent(account.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle: String(formData.get('handle') || '').trim(), url: String(formData.get('url') || '').trim(), niche: String(formData.get('niche') || '').trim(), notes: String(formData.get('notes') || '').trim() }) });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || data.success === false) throw new Error(data.error || 'Update failed');
                close();
                loadInstagramAccounts(true);
            } catch (err) {
                alert(`Could not update Instagram account: ${err.message}`);
                submitBtn.disabled = false;
                submitBtn.innerText = 'Save changes';
            }
        });
        modal.querySelector('input[name="handle"]')?.focus();
    }

    window.deleteInstagramAccount = async (id) => {
        if (!confirm('Delete this Instagram inspiration account?')) return;
        try {
            const res = await fetch(`/api/instagram/accounts/${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            loadInstagramAccounts(true);
        } catch (e) {
            console.error(e);
            alert('Could not delete the Instagram account.');
        }
    };

    function openInstagramAddModal() {
        const fields = [
            ['Video Title', 'Reel idea title', 'input', true],
            ['Core Idea', 'What is the Reel about?', 'textarea'],
            ['Inspo', 'Reference links, examples, creators, screenshots, sounds, or notes', 'textarea']
        ];
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4';
        modal.innerHTML = `
            <div class="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#171717] border border-gray-200 dark:border-white/10 shadow-2xl">
                <form id="instagram-add-reel-form" class="p-6 space-y-4">
                    <div class="flex items-start justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-4">
                        <div>
                            <h2 class="text-xl font-semibold dark:text-white">Add Instagram Reel Idea</h2>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Manual idea capture - write it your way, then track production.</p>
                        </div>
                        <button type="button" data-close class="text-sm px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10">Close</button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${fields.map(([name, placeholder, type, required]) => `
                            <label class="block ${type === 'textarea' ? 'md:col-span-2' : ''}">
                                <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">${escapeHtml(name)}${required ? ' *' : ''}</span>
                                ${type === 'textarea'
                                    ? `<textarea name="${escapeHtml(name)}" rows="3" ${required ? 'required' : ''} placeholder="${escapeHtml(placeholder)}" class="mt-1 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm dark:text-white"></textarea>`
                                    : `<input name="${escapeHtml(name)}" ${required ? 'required' : ''} placeholder="${escapeHtml(placeholder)}" class="mt-1 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm dark:text-white" />`}
                            </label>
                        `).join('')}
                    </div>
                    <div class="flex items-center justify-end gap-2 pt-2">
                        <button type="button" data-close class="text-sm px-4 py-2 rounded-full border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10">Cancel</button>
                        <button type="submit" class="text-sm bg-pink-600 text-white px-4 py-2 rounded-full hover:bg-pink-700 transition-colors">Add to pipeline</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        const close = () => modal.remove();
        modal.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', close));
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        modal.querySelector('form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.currentTarget.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerText = 'Adding...';
            const formData = new FormData(e.currentTarget);
            const row = {};
            fields.forEach(([name]) => row[name] = String(formData.get(name) || '').trim());
            row.Status = 'Idea';
            try {
                const res = await fetch('/api/instagram/reels/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ row })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || data.success === false) throw new Error(data.error || 'Add failed');
                close();
                loadInstagramReelsData(true);
            } catch (err) {
                alert(`Could not add Reel: ${err.message}`);
                submitBtn.disabled = false;
                submitBtn.innerText = 'Add to pipeline';
            }
        });
        modal.querySelector('input[name="Video Title"]')?.focus();
    }

    window.setInstagramReelPriority = async (title, slot) => {
        try {
            const res = await fetch('/api/instagram/reels/priority', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, slot })
            });
            if (res.ok) loadInstagramReelsData(true);
        } catch (e) { console.error(e); }
    };

    window.toggleInstagramReelStatus = async (title, newStatus) => {
        try {
            const res = await fetch('/api/instagram/reels/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, status: newStatus })
            });
            if (res.ok) loadInstagramReelsData();
        } catch (e) { console.error(e); }
    };

    window.setInstagramReelStatus = async (title) => {
        const current = currentInstagramReels.find(item => item['Video Title'] === title);
        const nextStatus = prompt('Status: Idea, Ready to Film, Filmed, Editing, Scheduled, Published', current?.Status || 'Idea');
        if (nextStatus === null) return;
        const cleanStatus = String(nextStatus || '').trim() || 'Idea';
        try {
            const res = await fetch('/api/instagram/reels/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, status: cleanStatus })
            });
            if (res.ok) loadInstagramReelsData(true);
        } catch (e) { console.error(e); }
    };

    window.editInstagramReel = (title) => {
        const reel = currentInstagramReels.find(item => item['Video Title'] === title);
        if (!reel) return alert('Reel not found. Refresh and try again.');
        openInstagramEditModal(reel);
    };

    function openInstagramEditModal(reel) {
        const originalTitle = reel['Video Title'] || '';
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4';
        modal.innerHTML = `
            <div class="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#171717] border border-gray-200 dark:border-white/10 shadow-2xl">
                <form id="instagram-edit-reel-form" class="p-6 space-y-4">
                    <div class="flex items-start justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-4">
                        <div>
                            <h2 class="text-xl font-semibold dark:text-white">Edit Instagram Reel Idea</h2>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Update the title or core idea.</p>
                        </div>
                        <button type="button" data-close class="text-sm px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10">Close</button>
                    </div>
                    <div class="grid grid-cols-1 gap-4">
                        <label class="block">
                            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">Video Title *</span>
                            <input name="Video Title" required value="${escapeHtml(originalTitle)}" class="mt-1 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm dark:text-white" />
                        </label>
                        <label class="block">
                            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">Core Idea</span>
                            <textarea name="Core Idea" rows="5" placeholder="What is the Reel about?" class="mt-1 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm dark:text-white">${escapeHtml(reel['Core Idea'] || '')}</textarea>
                        </label>
                        <label class="block">
                            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">Inspo</span>
                            <textarea name="Inspo" rows="5" placeholder="Reference links, examples, creators, screenshots, sounds, or notes" class="mt-1 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm dark:text-white">${escapeHtml(reel.Inspo || '')}</textarea>
                        </label>
                    </div>
                    <div class="flex items-center justify-end gap-2 pt-2">
                        <button type="button" data-close class="text-sm px-4 py-2 rounded-full border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10">Cancel</button>
                        <button type="submit" class="text-sm bg-pink-600 text-white px-4 py-2 rounded-full hover:bg-pink-700 transition-colors">Save changes</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        const close = () => modal.remove();
        modal.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', close));
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        modal.querySelector('form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.currentTarget.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerText = 'Saving...';
            const formData = new FormData(e.currentTarget);
            const row = {
                'Video Title': String(formData.get('Video Title') || '').trim(),
                'Core Idea': String(formData.get('Core Idea') || '').trim(),
                'Inspo': String(formData.get('Inspo') || '').trim(),
                'Status': reel.Status || 'Idea'
            };
            try {
                const res = await fetch('/api/instagram/reels/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: originalTitle, row })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || data.success === false) throw new Error(data.error || 'Update failed');
                close();
                loadInstagramReelsData(true);
            } catch (err) {
                alert(`Could not update Reel: ${err.message}`);
                submitBtn.disabled = false;
                submitBtn.innerText = 'Save changes';
            }
        });
        modal.querySelector('input[name="Video Title"]')?.focus();
    }

    window.deleteInstagramReel = async (title) => {
        if (!confirm(`Permanently delete this Instagram Reel from the pipeline?\n\n${title}`)) return;
        try {
            const res = await fetch('/api/instagram/reels/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title })
            });
            if (!res.ok) throw new Error('Delete failed');
            loadInstagramReelsData();
        } catch (e) {
            console.error(e);
            alert('Could not delete the Reel from the pipeline.');
        }
    };

    window.openInstagramReelDetails = (title) => {
        const reel = currentInstagramReels.find(item => item['Video Title'] === title);
        if (!reel) return;
        const detail = (label, value, extraClass = '') => `
            <div class="youtube-detail-card ${extraClass}">
                <div class="youtube-detail-label">${escapeHtml(label)}</div>
                <div class="youtube-detail-value whitespace-pre-wrap">${escapeHtml(value || '-')}</div>
            </div>
        `;
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4';
        modal.innerHTML = `
            <div class="bg-white dark:bg-[#212121] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                <div class="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-white/70 dark:bg-[#171717]/70 flex items-start justify-between gap-4">
                    <div class="min-w-0">
                        <h2 class="text-lg font-semibold tracking-tight dark:text-white">${escapeHtml(reel['Video Title'] || 'Untitled Reel')}</h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(reel['Core Idea'] || 'No core idea set yet.')}</p>
                    </div>
                    <button type="button" data-close class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" aria-label="Close Reel details">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    ${detail('Status', reel.Status)}
                    ${detail('Core Idea', reel['Core Idea'], 'md:col-span-2')}
                    ${detail('Inspo', reel.Inspo, 'md:col-span-2')}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const close = () => modal.remove();
        modal.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', close));
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    };

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

    function openYouTubeAddCompetitorModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white dark:bg-[#171717] w-full max-w-lg rounded-2xl shadow-xl overflow-hidden">
                <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10">
                    <div><h2 class="text-xl font-semibold dark:text-white">Add Competitor</h2><p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Save a YouTube channel to study.</p></div>
                    <button type="button" data-close class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none" aria-label="Close">×</button>
                </div>
                <form class="p-6 space-y-4">
                    <label class="block text-sm font-medium dark:text-gray-200">Channel name<input name="name" required class="mt-1.5 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 dark:text-white" placeholder="e.g. Alex Hormozi"></label>
                    <label class="block text-sm font-medium dark:text-gray-200">YouTube channel URL<input name="url" required type="url" class="mt-1.5 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 dark:text-white" placeholder="https://www.youtube.com/@channel"></label>
                    <label class="block text-sm font-medium dark:text-gray-200">Handle <span class="text-gray-400 font-normal">(optional)</span><input name="handle" class="mt-1.5 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 dark:text-white" placeholder="@channel"></label>
                    <label class="block text-sm font-medium dark:text-gray-200">What to study <span class="text-gray-400 font-normal">(optional)</span><textarea name="notes" rows="3" class="mt-1.5 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 dark:text-white" placeholder="Formats, hooks, thumbnails, etc."></textarea></label>
                    <div class="flex justify-end gap-2 pt-2"><button type="button" data-close class="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">Cancel</button><button type="submit" class="px-4 py-2 text-sm bg-black text-white dark:bg-white dark:text-black rounded-lg">Add Competitor</button></div>
                </form>
            </div>`;
        document.body.appendChild(modal);
        const close = () => modal.remove();
        modal.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', close));
        modal.addEventListener('click', event => { if (event.target === modal) close(); });
        modal.querySelector('form').addEventListener('submit', async event => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const submit = event.currentTarget.querySelector('[type="submit"]');
            submit.disabled = true;
            submit.textContent = 'Adding…';
            try {
                const res = await fetch('/api/youtube/competitors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form.entries())) });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.error || 'Could not add competitor');
                close();
                loadYouTubeCompetitors(true);
            } catch (error) {
                alert(error.message || 'Could not add competitor');
                submit.disabled = false;
                submit.textContent = 'Add Competitor';
            }
        });
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
                const md = data.content || '';
                releasesContent.innerHTML = md ? (typeof marked !== 'undefined' ? marked.parse(md) : md.replace(/\n/g, '<br/>')) : '<p class="text-gray-500">No release notes yet.</p>';
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
        }).filter(item => item.title || item.body).reverse();
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

    // === Journal Logic ===
    const refreshJournalBtn = document.getElementById('refresh-journal-btn');
    const toggleJournalFormBtn = document.getElementById('toggle-journal-form-btn');
    const journalContainer = document.getElementById('journal-container');
    const journalEntryCount = document.getElementById('journal-entry-count');
    const journalCurrentStreak = document.getElementById('journal-current-streak');
    const journalLatestDate = document.getElementById('journal-latest-date');
    const journalFormPanel = document.getElementById('journal-form-panel');
    const journalForm = document.getElementById('journal-form');
    const journalFormHeading = document.getElementById('journal-form-heading');
    const journalOriginalTitleInput = document.getElementById('journal-original-title');
    const journalTitleInput = document.getElementById('journal-title');
    const journalContentInput = document.getElementById('journal-content');
    const journalSubmitBtn = document.getElementById('journal-submit-btn');
    const journalFormCancelBtn = document.getElementById('journal-form-cancel-btn');
    const journalSearchInput = document.getElementById('journal-search-input');
    const journalDateFilter = document.getElementById('journal-date-filter');
    const journalClearFiltersBtn = document.getElementById('journal-clear-filters-btn');
    let journalEntries = [];

    if (refreshJournalBtn) refreshJournalBtn.addEventListener('click', loadJournal);
    if (toggleJournalFormBtn) toggleJournalFormBtn.addEventListener('click', () => openJournalForm());
    if (journalFormCancelBtn) journalFormCancelBtn.addEventListener('click', closeJournalForm);
    if (journalForm) journalForm.addEventListener('submit', submitJournalForm);
    if (journalSearchInput) journalSearchInput.addEventListener('input', renderJournalEntries);
    if (journalDateFilter) journalDateFilter.addEventListener('change', renderJournalEntries);
    if (journalClearFiltersBtn) journalClearFiltersBtn.addEventListener('click', clearJournalFilters);

    async function loadJournal(silent = false) {
        if (!journalContainer) return;
        if (refreshJournalBtn && !silent) refreshJournalBtn.innerText = 'Loading...';
        try {
            const res = await fetch('/api/journal');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load journal');
            journalEntries = parseJournalContent(data.content || '');
            renderJournalEntries();
        } catch(e) {
            console.error(e);
            journalContainer.innerHTML = '<div class="bg-gray-50 dark:bg-white/5 border border-red-200 dark:border-red-500/20 rounded-lg p-8 text-red-500">Failed to load journal.</div>';
        }
        if (refreshJournalBtn && !silent) refreshJournalBtn.innerText = 'Refresh Data';
    }

    function renderJournalEntries() {
        if (!journalContainer) return;
        const filteredEntries = filterJournalEntries(journalEntries);
        if (journalEntryCount) journalEntryCount.innerText = String(filteredEntries.length);
        if (journalCurrentStreak) journalCurrentStreak.innerText = formatJournalStreak(calculateJournalStreak(filteredEntries));
        if (journalLatestDate) journalLatestDate.innerText = filteredEntries[0]?.title || '—';
        journalContainer.innerHTML = filteredEntries.length ? filteredEntries.map((item, index) => `
                <article class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-white/60 dark:bg-[#171717]/60 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                            <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">${escapeHtml(item.kind || 'Journal Entry')}</div>
                            <h2 class="text-lg font-semibold dark:text-white">${escapeHtml(item.title || 'Journal Entry')}</h2>
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                            ${index === 0 ? '<span class="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Latest</span>' : ''}
                            <button type="button" class="journal-edit-btn text-xs px-3 py-1.5 rounded border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" data-title="${escapeHtml(item.title)}">Edit</button>
                            <button type="button" class="journal-delete-btn text-xs px-3 py-1.5 rounded border border-red-200 text-red-600 dark:border-red-500/20 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" data-title="${escapeHtml(item.title)}">Delete</button>
                        </div>
                    </div>
                    <div class="news-day-content prose dark:prose-invert prose-sm max-w-none text-gray-800 dark:text-gray-200 p-6 overflow-auto">${item.body ? renderJournalMarkdown(item.body) : '<p class="text-sm text-gray-500 dark:text-gray-400 italic">Blank entry created - no text added yet</p>'}</div>
                </article>
            `).join('') : '<div class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-8 text-gray-500">No journal entries match your filters.</div>';

            journalContainer.querySelectorAll('.journal-edit-btn').forEach(btn => {
                btn.addEventListener('click', () => editJournalEntry(btn.dataset.title || ''));
            });
            journalContainer.querySelectorAll('.journal-delete-btn').forEach(btn => {
                btn.addEventListener('click', () => deleteJournalEntry(btn.dataset.title || ''));
            });
    }

    function filterJournalEntries(entries = []) {
        const search = String(journalSearchInput?.value || '').trim().toLowerCase();
        const dateFilter = String(journalDateFilter?.value || '').trim();
        return entries
            .filter(entry => {
                const matchesSearch = !search || `${entry.title || ''}\n${entry.body || ''}`.toLowerCase().includes(search);
                const entryDate = parseJournalDate(entry.title);
                const matchesDate = !dateFilter || (entryDate && formatDateForInput(entryDate) === dateFilter);
                return matchesSearch && matchesDate;
            })
            .sort(compareJournalEntries);
    }

    function clearJournalFilters() {
        if (journalSearchInput) journalSearchInput.value = '';
        if (journalDateFilter) journalDateFilter.value = '';
        renderJournalEntries();
    }

    function parseJournalContent(content = '') {
        const normalized = String(content || '');
        const firstSectionIndex = normalized.search(/^##\s+/m);
        if (firstSectionIndex === -1) return [];
        const sections = normalized.slice(firstSectionIndex).split(/^##\s+/m).map(section => section.trim()).filter(Boolean);
        return sections.map((section, index) => {
            const [headerLine = '', ...rest] = section.split('\n');
            const title = headerLine.trim();
            const body = rest.join('\n').trim().replace(/^---\s*$/gm, '').trim();
            const isTemplate = /^template$/i.test(title);
            const isDailyEntry = /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+\d{1,2}(?:st|nd|rd|th)?\s+[A-Z][a-z]+(?:,)?\s+\d{4}$/i.test(title)
                || /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+[A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,\s+\d{4}$/i.test(title);
            return {
                title,
                kind: isDailyEntry ? 'Daily Entry' : 'Reflection',
                body,
                isTemplate,
                sourceIndex: index
            };
        }).filter(item => item.title && !item.isTemplate);
    }

    function renderJournalMarkdown(content = '') {
        if (window.marked?.parse) return window.marked.parse(content);
        return escapeHtml(content)
            .replace(/^[-*] (.*$)/gim, '<li class="ml-4 list-disc mb-2">$1</li>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br/>');
    }

    function parseJournalDate(title = '') {
        const cleaned = String(title || '').trim().replace(/(\d+)(st|nd|rd|th)/i, '$1');
        const parsed = new Date(cleaned);
        if (Number.isNaN(parsed.getTime())) return null;
        parsed.setHours(0, 0, 0, 0);
        return parsed;
    }

    function compareJournalEntries(a = {}, b = {}) {
        const aDate = parseJournalDate(a.title);
        const bDate = parseJournalDate(b.title);
        const aTime = aDate ? aDate.getTime() : Number.NEGATIVE_INFINITY;
        const bTime = bDate ? bDate.getTime() : Number.NEGATIVE_INFINITY;
        if (bTime !== aTime) return bTime - aTime;
        return Number(a.sourceIndex || 0) - Number(b.sourceIndex || 0);
    }

    function formatDateForInput(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function calculateJournalStreak(entries = []) {
        const uniqueDays = [...new Set(entries
            .map(entry => parseJournalDate(entry.title))
            .filter(Boolean)
            .map(date => date.getTime()))].sort((a, b) => b - a);
        if (!uniqueDays.length) return 0;

        let streak = 1;
        for (let i = 1; i < uniqueDays.length; i += 1) {
            const diffDays = Math.round((uniqueDays[i - 1] - uniqueDays[i]) / 86400000);
            if (diffDays === 1) {
                streak += 1;
            } else {
                break;
            }
        }
        return streak;
    }

    function formatJournalStreak(streak = 0) {
        const count = Number(streak) || 0;
        return `${count} day${count === 1 ? '' : 's'}`;
    }

    function openJournalForm(entry = null) {
        if (!journalFormPanel) return;
        journalFormPanel.classList.remove('hidden');
        if (entry) {
            if (journalFormHeading) journalFormHeading.innerText = 'Edit Journal Entry';
            if (journalOriginalTitleInput) journalOriginalTitleInput.value = entry.title || '';
            if (journalTitleInput) journalTitleInput.value = entry.title || '';
            if (journalContentInput) journalContentInput.value = entry.body || '';
            if (journalSubmitBtn) journalSubmitBtn.innerText = 'Save Changes';
        } else {
            if (journalFormHeading) journalFormHeading.innerText = 'Add Journal Entry';
            if (journalOriginalTitleInput) journalOriginalTitleInput.value = '';
            if (journalTitleInput) journalTitleInput.value = '';
            if (journalContentInput) journalContentInput.value = '';
            if (journalSubmitBtn) journalSubmitBtn.innerText = 'Save Entry';
        }
        journalTitleInput?.focus();
    }

    function closeJournalForm() {
        journalFormPanel?.classList.add('hidden');
        journalForm?.reset();
        if (journalOriginalTitleInput) journalOriginalTitleInput.value = '';
    }

    function editJournalEntry(title) {
        const entry = journalEntries.find(item => item.title === title);
        if (!entry) return;
        openJournalForm(entry);
    }

    async function submitJournalForm(event) {
        event.preventDefault();
        const originalTitle = journalOriginalTitleInput?.value?.trim() || '';
        const title = journalTitleInput?.value?.trim() || '';
        const content = journalContentInput?.value?.trim() || '';
        if (!title || !content) return;
        if (journalSubmitBtn) journalSubmitBtn.innerText = 'Saving...';
        try {
            const method = originalTitle ? 'PUT' : 'POST';
            const payload = originalTitle ? { originalTitle, title, content } : { title, content };
            const res = await fetch('/api/journal', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save journal entry');
            closeJournalForm();
            await loadJournal(true);
        } catch (error) {
            alert(error.message || 'Failed to save journal entry');
        } finally {
            if (journalSubmitBtn) journalSubmitBtn.innerText = originalTitle ? 'Save Changes' : 'Save Entry';
        }
    }

    async function deleteJournalEntry(title) {
        if (!title) return;
        if (!window.confirm(`Delete journal entry "${title}"?`)) return;
        try {
            const res = await fetch('/api/journal', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete journal entry');
            await loadJournal(true);
        } catch (error) {
            alert(error.message || 'Failed to delete journal entry');
        }
    }

    // === Read Logic ===
    const refreshReadBtn = document.getElementById('refresh-read-btn');
    const readLibraryEl = document.getElementById('read-library');
    const readAudioPlayer = document.getElementById('read-audio-player');
    const readForm = document.getElementById('read-form');
    const readFormPanel = document.getElementById('read-form-panel');
    const readFormCancelBtn = document.getElementById('read-form-cancel-btn');
    const toggleReadFormBtn = document.getElementById('toggle-read-form-btn');
    const readSubmitBtn = document.getElementById('read-submit-btn');
    const readSpeedSelect = document.getElementById('read-speed');
    const readSortSelect = document.getElementById('read-sort');
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
        try { return localStorage.getItem('readPlaybackRate') || '2'; } catch { return '2'; }
    })());

    if (readSpeedSelect) {
        readSpeedSelect.addEventListener('change', () => applyReadPlaybackRate(readSpeedSelect.value));
    }

    function getReadSort() {
        try { return localStorage.getItem('readSort') || 'created'; } catch { return 'created'; }
    }

    function sortReadItems(items) {
        const sort = readSortSelect?.value || getReadSort();
        const timestamp = (value) => {
            const parsed = Date.parse(value || '');
            return Number.isNaN(parsed) ? 0 : parsed;
        };
        return [...items].sort((a, b) => {
            if (sort === 'listened') {
                const listenedDifference = timestamp(b.lastListenedAt) - timestamp(a.lastListenedAt);
                if (listenedDifference) return listenedDifference;
            }
            return timestamp(b.createdAt) - timestamp(a.createdAt);
        });
    }

    if (readSortSelect) {
        readSortSelect.value = getReadSort();
        readSortSelect.addEventListener('change', () => {
            try { localStorage.setItem('readSort', readSortSelect.value); } catch {}
            loadReadLibrary(true);
        });
    }

    function setReadFormOpen(open) {
        if (!readFormPanel || !toggleReadFormBtn) return;
        readFormPanel.classList.toggle('hidden', !open);
        toggleReadFormBtn.innerText = open ? 'Hide form' : 'Add content';
        if (open) document.getElementById('read-title')?.focus();
    }

    if (toggleReadFormBtn) {
        toggleReadFormBtn.addEventListener('click', () => {
            const isHidden = readFormPanel?.classList.contains('hidden');
            setReadFormOpen(Boolean(isHidden));
        });
    }

    if (readFormCancelBtn) {
        readFormCancelBtn.addEventListener('click', () => setReadFormOpen(false));
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
                setReadFormOpen(false);
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
            const items = sortReadItems(Array.isArray(data.items) ? data.items : []);
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
        const editDelete = document.getElementById('read-edit-delete');
        const editSpinner = document.getElementById('read-edit-spinner');
        let currentEditId = null;
        let currentEditTitle = null;

        const closeEditModal = () => {
            editModal.classList.add('hidden');
            currentEditId = null;
            currentEditTitle = null;
            editText.value = '';
        };

        const deleteReadEntry = async (id, titleStr = 'this item') => {
            if (!confirm(`Delete “${titleStr}”? This cannot be undone.`)) return false;
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
                return true;
            } catch (err) {
                console.error(err);
                alert('Error deleting content: ' + err.message);
                return false;
            }
        };

        const openReadEditor = async (id, titleStr = 'Content') => {
            try {
                const res = await fetch(`/api/read/${encodeURIComponent(id)}/text`);
                if (!res.ok) throw new Error('Failed to fetch text');
                const data = await res.json();

                if (editModal && editText && editTitle) {
                    currentEditId = id;
                    currentEditTitle = titleStr;
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
        if (editDelete) {
            editDelete.addEventListener('click', async () => {
                if (!currentEditId) return;
                const deleted = await deleteReadEntry(currentEditId, currentEditTitle || 'this item');
                if (deleted) closeEditModal();
            });
        }

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
            
            if (editBtn) {
                await openReadEditor(editBtn.dataset.readEdit, editBtn.dataset.readTitle || 'Content');
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
    const defaultGoalTargets = { youtube: 100000, skool: 10000, revenue: 10000 };
    const goalLabels = { youtube: 'YouTube subscribers', skool: 'Skool members', revenue: 'revenue' };
    const dreamForm = document.getElementById('dream-form');
    const dreamDescriptionInput = document.getElementById('dream-description');
    const dreamUrlInput = document.getElementById('dream-url');
    const dreamsContainer = document.getElementById('dreams-container');
    let currentDreams = [];

    function formatGoalNumber(value, goalId, short = false) {
        const num = Number(value) || 0;
        if (goalId === 'revenue') {
            if (short && Math.abs(num) >= 1000) return `£${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}k`;
            return `£${num.toLocaleString()}`;
        }
        if (short && Math.abs(num) >= 1000) return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}k`;
        return num.toLocaleString();
    }

    function normalizeGoalData(data = {}) {
        const normalizeEntry = (value, fallbackTarget) => {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                return {
                    current: Number(value.current) || 0,
                    target: Number(value.target) || fallbackTarget
                };
            }
            return {
                current: Number(value) || 0,
                target: fallbackTarget
            };
        };

        return {
            youtube: normalizeEntry(data.youtube, defaultGoalTargets.youtube),
            skool: normalizeEntry(data.skool, defaultGoalTargets.skool),
            revenue: normalizeEntry(data.revenue, defaultGoalTargets.revenue)
        };
    }

    async function saveGoalData(goals) {
        const postRes = await fetch('/api/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            body: JSON.stringify(goals)
        });
        const result = await postRes.json().catch(() => ({}));
        if (!postRes.ok || result.success === false) throw new Error('Goal save failed');
        renderGoals(normalizeGoalData(result.goals || goals));
        await loadGoals(true);
    }

    window.editGoal = async (goalId) => {
        try {
            const res = await fetch('/api/goals', { cache: 'no-store' });
            const currentGoals = res.ok ? normalizeGoalData(await res.json()) : normalizeGoalData();
            const currentGoal = currentGoals[goalId] || { current: 0, target: defaultGoalTargets[goalId] || 0 };
            const promptText = `Enter current ${goalLabels[goalId] || 'goal value'} (Target: ${formatGoalNumber(currentGoal.target, goalId)}):`;
            const input = prompt(promptText, String(currentGoal.current || ''));
            if (input === null || input.trim() === '') return;

            const val = parseFloat(input.replace(/,/g, '').replace(/£/g, ''));
            if (isNaN(val)) {
                alert('Please enter a valid number.');
                return;
            }

            currentGoal.current = val;
            currentGoals[goalId] = currentGoal;
            await saveGoalData(currentGoals);
        } catch(e) { console.error('Failed to update goal', e); }
    };

    window.editGoalTarget = async (goalId) => {
        try {
            const res = await fetch('/api/goals', { cache: 'no-store' });
            const currentGoals = res.ok ? normalizeGoalData(await res.json()) : normalizeGoalData();
            const currentGoal = currentGoals[goalId] || { current: 0, target: defaultGoalTargets[goalId] || 0 };
            const promptText = `Enter target ${goalLabels[goalId] || 'goal value'}:`;
            const input = prompt(promptText, String(currentGoal.target || ''));
            if (input === null || input.trim() === '') return;

            const val = parseFloat(input.replace(/,/g, '').replace(/£/g, ''));
            if (isNaN(val) || val <= 0) {
                alert('Please enter a valid target greater than 0.');
                return;
            }

            currentGoal.target = val;
            currentGoals[goalId] = currentGoal;
            await saveGoalData(currentGoals);
        } catch(e) { console.error('Failed to update goal target', e); }
    };

    function renderGoals(data = {}) {
        const ytVal = data.youtube.current;
        const skoolVal = data.skool.current;
        const revVal = data.revenue.current;
        const ytTarget = data.youtube.target;
        const skoolTarget = data.skool.target;
        const revTarget = data.revenue.target;

        if(document.getElementById('val-youtube')) document.getElementById('val-youtube').innerText = ytVal.toLocaleString();
        if(document.getElementById('val-skool')) document.getElementById('val-skool').innerText = skoolVal.toLocaleString();
        if(document.getElementById('val-revenue')) document.getElementById('val-revenue').innerText = revVal.toLocaleString();
        if(document.getElementById('target-youtube')) document.getElementById('target-youtube').innerText = `Target: ${formatGoalNumber(ytTarget, 'youtube')}`;
        if(document.getElementById('target-skool')) document.getElementById('target-skool').innerText = `Target: ${formatGoalNumber(skoolTarget, 'skool')}`;
        if(document.getElementById('target-revenue')) document.getElementById('target-revenue').innerText = `Target: ${formatGoalNumber(revTarget, 'revenue')}`;
        if(document.getElementById('denominator-youtube')) document.getElementById('denominator-youtube').innerText = `/ ${formatGoalNumber(ytTarget, 'youtube', true)}`;
        if(document.getElementById('denominator-skool')) document.getElementById('denominator-skool').innerText = `/ ${formatGoalNumber(skoolTarget, 'skool', true)}`;
        if(document.getElementById('denominator-revenue')) document.getElementById('denominator-revenue').innerText = `/ ${formatGoalNumber(revTarget, 'revenue', true)}`;

        const pctYt = Math.min(100, ytTarget > 0 ? (ytVal / ytTarget) * 100 : 0);
        if(document.getElementById('bar-youtube')) document.getElementById('bar-youtube').style.width = pctYt + '%';
        if(document.getElementById('pct-youtube')) document.getElementById('pct-youtube').innerText = pctYt.toFixed(1) + '%';

        const pctSkool = Math.min(100, skoolTarget > 0 ? (skoolVal / skoolTarget) * 100 : 0);
        if(document.getElementById('bar-skool')) document.getElementById('bar-skool').style.width = pctSkool + '%';
        if(document.getElementById('pct-skool')) document.getElementById('pct-skool').innerText = pctSkool.toFixed(1) + '%';

        const pctRev = Math.min(100, revTarget > 0 ? (revVal / revTarget) * 100 : 0);
        if(document.getElementById('bar-revenue')) document.getElementById('bar-revenue').style.width = pctRev + '%';
        if(document.getElementById('pct-revenue')) document.getElementById('pct-revenue').innerText = pctRev.toFixed(1) + '%';
    }

    async function loadGoals(silent = false) {
        try {
            const res = await fetch('/api/goals', { cache: 'no-store' });
            if (res.ok) renderGoals(normalizeGoalData(await res.json()));
            await loadDreams(true);
        } catch(e) { console.error(e); }
    }

    function renderDreams(items = []) {
        if (!dreamsContainer) return;
        currentDreams = Array.isArray(items) ? items : [];
        if (!currentDreams.length) {
            dreamsContainer.innerHTML = '<div class="col-span-full rounded-xl border border-dashed border-gray-300 dark:border-white/20 bg-white/50 dark:bg-white/5 p-8 text-center text-sm text-gray-500 dark:text-gray-400">No dreams saved yet. Add one above with a description and a link you can visualise.</div>';
            return;
        }
        const jsString = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/[\r\n]+/g, ' ');
        dreamsContainer.innerHTML = currentDreams.map(dream => {
            const url = String(dream.url || '').trim();
            return `
                <article class="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#171717] overflow-hidden">
                    <div class="p-5">
                        <div class="flex items-start justify-between gap-3 mb-3">
                            <span class="text-[11px] px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">Dream</span>
                            <div class="flex items-center gap-2">
                                <button onclick="editDream('${jsString(dream.id)}')" class="text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">Edit</button>
                                <button onclick="deleteDream('${jsString(dream.id)}')" class="text-xs px-2.5 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10 transition-colors">Delete</button>
                            </div>
                        </div>
                        <p class="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">${escapeHtml(dream.description || '')}</p>
                        ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="mt-4 inline-flex items-center text-sm font-medium text-purple-700 dark:text-purple-300 hover:underline">Open visual link →</a>` : ''}
                        <div class="mt-3 text-[11px] text-gray-400 dark:text-gray-500">${escapeHtml(formatDateShort(dream.createdAt))}</div>
                    </div>
                </article>
            `;
        }).join('');
    }

    async function loadDreams(silent = false) {
        if (!dreamsContainer) return;
        if (!silent) dreamsContainer.innerHTML = '<div class="col-span-full text-sm text-gray-500 dark:text-gray-400">Loading dreams...</div>';
        try {
            const res = await fetch(apiPath('/api/dreams'), { cache: 'no-store' });
            if (!res.ok) throw new Error(`Dreams request failed: ${res.status}`);
            const data = await res.json();
            renderDreams(Array.isArray(data.items) ? data.items : []);
        } catch (e) {
            console.error(e);
            dreamsContainer.innerHTML = '<div class="col-span-full rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-8 text-sm text-red-600 dark:text-red-300">Dreams failed to load.</div>';
        }
    }

    async function addDream(e) {
        e.preventDefault();
        const description = String(dreamDescriptionInput?.value || '').trim();
        if (!description) return;
        const submitBtn = dreamForm?.querySelector('button[type="submit"]');
        const originalText = submitBtn?.innerText || 'Add dream';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = 'Adding...';
        }
        try {
            const res = await fetch(apiPath('/api/dreams'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description, url: String(dreamUrlInput?.value || '').trim() })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.success === false) throw new Error(data.error || 'Add failed');
            if (dreamDescriptionInput) dreamDescriptionInput.value = '';
            if (dreamUrlInput) dreamUrlInput.value = '';
            renderDreams(Array.isArray(data.items) ? data.items : []);
        } catch (err) {
            alert(`Could not add dream: ${err.message}`);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            }
        }
    }

    window.editDream = (id) => {
        const dream = currentDreams.find(item => item.id === id);
        if (!dream) return alert('Dream not found. Refresh and try again.');
        const description = prompt('Dream description:', dream.description || '');
        if (description === null) return;
        const cleanDescription = String(description || '').trim();
        if (!cleanDescription) return alert('Description is required.');
        const url = prompt('Visual link / URL:', dream.url || '');
        if (url === null) return;
        updateDream(id, cleanDescription, String(url || '').trim());
    };

    async function updateDream(id, description, url) {
        try {
            const res = await fetch(apiPath(`/api/dreams/${encodeURIComponent(id)}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description, url })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.success === false) throw new Error(data.error || 'Update failed');
            renderDreams(Array.isArray(data.items) ? data.items : currentDreams.map(item => item.id === id ? data.item : item));
        } catch (err) {
            alert(`Could not update dream: ${err.message}`);
        }
    }

    window.deleteDream = async (id) => {
        if (!confirm('Delete this dream?')) return;
        try {
            const res = await fetch(apiPath(`/api/dreams/${encodeURIComponent(id)}`), { method: 'DELETE' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.success === false) throw new Error(data.error || 'Delete failed');
            renderDreams(Array.isArray(data.items) ? data.items : []);
        } catch (err) {
            alert(`Could not delete dream: ${err.message}`);
        }
    };

    if (dreamForm) dreamForm.addEventListener('submit', addDream);

    // === Business Ideas Logic ===
    const businessIdeasPodium = document.getElementById('business-ideas-podium');
    const businessIdeasTable = document.getElementById('business-ideas-table');
    const businessIdeaAddBtn = document.getElementById('business-idea-add-btn');
    let currentBusinessIdeas = [];
    const ideaDate = (value) => {
        if (!value) return '—';
        const date = new Date(`${value}T12:00:00`);
        return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    };
    const sortedBusinessIdeas = (items = currentBusinessIdeas) => [...items].sort((a, b) => Number(a.rank || 9999) - Number(b.rank || 9999) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    function renderBusinessIdeas(items = []) {
        currentBusinessIdeas = Array.isArray(items) ? items : [];
        const sorted = sortedBusinessIdeas();
        const podiumStyles = [
            'border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-100 dark:border-amber-400/50 dark:from-amber-500/20 dark:to-yellow-500/10',
            'border-slate-300 bg-gradient-to-br from-slate-50 to-gray-100 dark:border-slate-300/40 dark:from-slate-400/15 dark:to-gray-500/10',
            'border-orange-300 bg-gradient-to-br from-orange-50 to-amber-100 dark:border-orange-400/40 dark:from-orange-500/15 dark:to-amber-500/10'
        ];
        const podiumIcons = ['👑', '🥈', '🥉'];
        if (businessIdeasPodium) businessIdeasPodium.innerHTML = sorted.slice(0, 3).map((item, index) => `
            <article class="rounded-2xl border p-5 ${podiumStyles[index]} ${index === 0 ? 'md:-translate-y-2 shadow-lg shadow-amber-500/10' : ''}">
                <div class="flex items-center justify-between gap-3"><span class="text-2xl">${podiumIcons[index]}</span><span class="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">#${Number(item.rank)}</span></div>
                <h3 class="mt-5 text-lg font-semibold leading-snug dark:text-white">${escapeHtml(item.idea)}</h3>
                <p class="mt-3 text-xs text-gray-600 dark:text-gray-300">${escapeHtml(item.source)} · ${escapeHtml(ideaDate(item.date))}</p>
            </article>`).join('') || '<div class="md:col-span-3 rounded-xl border border-dashed border-gray-300 dark:border-white/20 p-8 text-center text-sm text-gray-500">Your Hall of Fame is waiting for its first idea.</div>';
        if (!businessIdeasTable) return;
        businessIdeasTable.innerHTML = sorted.length ? sorted.map((item, index) => {
            const topClass = index === 0 ? 'bg-amber-50/80 dark:bg-amber-500/10' : index === 1 ? 'bg-slate-50 dark:bg-slate-400/10' : index === 2 ? 'bg-orange-50/70 dark:bg-orange-500/10' : '';
            const badge = index === 0 ? '👑 #1' : index === 1 ? '🥈 #2' : index === 2 ? '🥉 #3' : `#${Number(item.rank)}`;
            return `<tr class="${topClass} hover:bg-gray-50 dark:hover:bg-white/5"><td class="px-6 py-4 font-semibold dark:text-white whitespace-nowrap">${badge}</td><td class="px-6 py-4 font-medium dark:text-white max-w-md">${escapeHtml(item.idea)}</td><td class="px-6 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">${escapeHtml(ideaDate(item.date))}</td><td class="px-6 py-4 text-gray-600 dark:text-gray-300">${escapeHtml(item.source)}</td><td class="px-6 py-4 text-right whitespace-nowrap"><button onclick="moveBusinessIdea('${escapeHtml(item.id)}', -1)" ${index === 0 ? 'disabled' : ''} title="Move up" class="text-xs px-2 py-1 rounded border border-gray-200 dark:border-white/10 dark:text-gray-200 hover:bg-white/70 disabled:opacity-30 disabled:cursor-not-allowed">↑</button><button onclick="moveBusinessIdea('${escapeHtml(item.id)}', 1)" ${index === sorted.length - 1 ? 'disabled' : ''} title="Move down" class="ml-1 text-xs px-2 py-1 rounded border border-gray-200 dark:border-white/10 dark:text-gray-200 hover:bg-white/70 disabled:opacity-30 disabled:cursor-not-allowed">↓</button><button onclick="editBusinessIdea('${escapeHtml(item.id)}')" class="ml-2 text-xs px-2.5 py-1 rounded border border-gray-200 dark:border-white/10 dark:text-gray-200 hover:bg-white/70">Edit</button><button onclick="deleteBusinessIdea('${escapeHtml(item.id)}')" class="ml-2 text-xs px-2.5 py-1 rounded border border-red-200 text-red-600 dark:border-red-500/20 dark:text-red-300 hover:bg-red-50">Delete</button></td></tr>`;
        }).join('') : '<tr><td colspan="5" class="px-6 py-10 text-center text-sm text-gray-500">No business ideas saved yet. Add the first one above.</td></tr>';
    }

    async function loadBusinessIdeas(silent = false) {
        try {
            const res = await fetch('/api/business-ideas', { cache: 'no-store' });
            if (!res.ok) throw new Error('Business ideas request failed');
            const data = await res.json();
            renderBusinessIdeas(data.items);
        } catch (error) {
            console.error(error);
            if (!silent && businessIdeasTable) businessIdeasTable.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-red-500">Could not load business ideas.</td></tr>';
        }
    }

    function openBusinessIdeaModal(existing = null) {
        const item = existing || { idea: '', date: new Date().toISOString().slice(0, 10), source: '', rank: sortedBusinessIdeas().length + 1 };
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4';
        modal.innerHTML = `<div class="w-full max-w-xl rounded-2xl bg-white dark:bg-[#171717] border border-gray-200 dark:border-white/10 shadow-2xl p-6"><div class="flex items-start justify-between gap-4 mb-5"><div><h2 class="text-xl font-semibold dark:text-white">${existing ? 'Edit business idea' : 'Add business idea'}</h2><p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Give it a place on the leaderboard.</p></div><button data-close class="text-gray-500 text-xl leading-none">×</button></div><form class="space-y-4"><div><label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Business idea</label><textarea name="idea" required rows="4" class="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-[#111] p-3 text-sm dark:text-white" placeholder="What is the idea?">${escapeHtml(item.idea)}</textarea></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Date</label><input name="date" required type="date" value="${escapeHtml(item.date)}" class="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-[#111] p-2.5 text-sm dark:text-white"></div><div><label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Rank</label><input name="rank" required min="1" type="number" value="${Number(item.rank) || 1}" class="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-[#111] p-2.5 text-sm dark:text-white"></div></div><div><label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Where I thought of it</label><input name="source" required value="${escapeHtml(item.source)}" class="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-[#111] p-2.5 text-sm dark:text-white" placeholder="e.g. In a dream, on a walk, in the gym"></div><div class="flex justify-end gap-3 pt-2"><button type="button" data-close class="px-4 py-2 text-sm dark:text-gray-300">Cancel</button><button class="px-4 py-2 text-sm rounded-lg bg-black text-white dark:bg-white dark:text-black">${existing ? 'Save changes' : 'Add to leaderboard'}</button></div></form></div>`;
        document.body.appendChild(modal);
        const close = () => modal.remove();
        modal.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', close));
        modal.addEventListener('click', event => { if (event.target === modal) close(); });
        modal.querySelector('form').addEventListener('submit', async event => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const payload = Object.fromEntries(form.entries());
            try {
                const res = await fetch(existing ? `/api/business-ideas/${encodeURIComponent(existing.id)}` : '/api/business-ideas', { method: existing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || data.success === false) throw new Error(data.error || 'Save failed');
                close(); renderBusinessIdeas(data.items);
            } catch (error) { alert(`Could not save business idea: ${error.message}`); }
        });
        modal.querySelector('[name="idea"]').focus();
    }
    window.editBusinessIdea = (id) => { const item = currentBusinessIdeas.find(idea => idea.id === id); if (item) openBusinessIdeaModal(item); };
    window.moveBusinessIdea = async (id, direction) => {
        const ordered = sortedBusinessIdeas();
        const index = ordered.findIndex(item => item.id === id);
        const destination = index + Number(direction);
        if (index < 0 || destination < 0 || destination >= ordered.length) return;
        [ordered[index], ordered[destination]] = [ordered[destination], ordered[index]];
        try {
            const res = await fetch('/api/business-ideas/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: ordered.map(item => item.id) }) });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.success === false) throw new Error(data.error || 'Reorder failed');
            renderBusinessIdeas(data.items);
        } catch (error) { alert(`Could not reorder business ideas: ${error.message}`); }
    };
    window.deleteBusinessIdea = async (id) => { if (!confirm('Delete this business idea?')) return; try { const res = await fetch(`/api/business-ideas/${encodeURIComponent(id)}`, { method: 'DELETE' }); const data = await res.json(); if (!res.ok || data.success === false) throw new Error(data.error || 'Delete failed'); renderBusinessIdeas(data.items); } catch (error) { alert(`Could not delete business idea: ${error.message}`); } };
    businessIdeaAddBtn?.addEventListener('click', () => openBusinessIdeaModal());

    
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
    const nutritionCalories = document.getElementById('nutrition-calories');
    const nutritionLatestDate = document.getElementById('nutrition-latest-date');
    const nutritionProtein = document.getElementById('nutrition-protein');
    const nutritionFat = document.getElementById('nutrition-fat');
    const nutritionCarbs = document.getElementById('nutrition-carbs');
    const nutritionProteinPercent = document.getElementById('nutrition-protein-percent');
    const nutritionFatPercent = document.getElementById('nutrition-fat-percent');
    const nutritionCarbsPercent = document.getElementById('nutrition-carbs-percent');
    const nutritionCost = document.getElementById('nutrition-cost');
    const nutritionCaloriesChart = document.getElementById('nutrition-calories-chart');
    const nutritionAverageBars = document.getElementById('nutrition-average-bars');
    const nutritionMealPlan = document.getElementById('nutrition-meal-plan');
    const nutritionFoodForm = document.getElementById('nutrition-food-form');
    const nutritionFoodId = document.getElementById('nutrition-food-id');
    const nutritionFoodDate = document.getElementById('nutrition-food-date');
    const nutritionFoodMeal = document.getElementById('nutrition-food-meal');
    const nutritionFoodTime = document.getElementById('nutrition-food-time');
    const nutritionRecipeDbSelect = document.getElementById('nutrition-recipe-db-select');
    const nutritionRecipeSearchResults = document.getElementById('nutrition-recipe-search-results');
    const nutritionFoodDbSelect = document.getElementById('nutrition-food-db-select');
    const nutritionRecipeIngredientsAdjuster = document.getElementById('nutrition-recipe-ingredients-adjuster');
    const nutritionRecipeIngredientInputs = document.getElementById('nutrition-recipe-ingredient-inputs');
    const nutritionFoodItem = document.getElementById('nutrition-food-item');
    const nutritionFoodAmount = document.getElementById('nutrition-food-amount');
    const nutritionFoodAmountHint = document.getElementById('nutrition-food-amount-hint');
    const nutritionFoodCalories = document.getElementById('nutrition-food-calories');
    const nutritionFoodProtein = document.getElementById('nutrition-food-protein');
    const nutritionFoodFat = document.getElementById('nutrition-food-fat');
    const nutritionFoodCarbs = document.getElementById('nutrition-food-carbs');
    const nutritionFoodCost = document.getElementById('nutrition-food-cost');
    const nutritionFoodNotes = document.getElementById('nutrition-food-notes');
    const nutritionFoodSaveBtn = document.getElementById('nutrition-food-save-btn');
    const nutritionFoodDetailsBtn = document.getElementById('nutrition-food-details-btn');
    const nutritionFoodCancelBtn = document.getElementById('nutrition-food-cancel-btn');
    const nutritionFoodLog = document.getElementById('nutrition-food-log');
    const nutritionFoodLogDateFilter = document.getElementById('nutrition-food-log-date-filter');
    const nutritionFoodLogDayTotal = document.getElementById('nutrition-food-log-day-total');
    const nutritionFoodDbForm = document.getElementById('nutrition-food-db-form');
    const nutritionFoodDbId = document.getElementById('nutrition-food-db-id');
    const nutritionFoodDbName = document.getElementById('nutrition-food-db-name');
    const nutritionFoodDbAmount = document.getElementById('nutrition-food-db-amount');
    const nutritionFoodDbCalories = document.getElementById('nutrition-food-db-calories');
    const nutritionFoodDbProtein = document.getElementById('nutrition-food-db-protein');
    const nutritionFoodDbFat = document.getElementById('nutrition-food-db-fat');
    const nutritionFoodDbCarbs = document.getElementById('nutrition-food-db-carbs');
    const nutritionFoodDbSugars = document.getElementById('nutrition-food-db-sugars');
    const nutritionFoodDbFibre = document.getElementById('nutrition-food-db-fibre');
    const nutritionFoodDbSalt = document.getElementById('nutrition-food-db-salt');
    const nutritionFoodDbPrice = document.getElementById('nutrition-food-db-price');
    const nutritionFoodDbNotes = document.getElementById('nutrition-food-db-notes');
    const nutritionFoodDbSaveBtn = document.getElementById('nutrition-food-db-save-btn');
    const nutritionFoodDbCancelBtn = document.getElementById('nutrition-food-db-cancel-btn');
    const nutritionFoodDatabase = document.getElementById('nutrition-food-database');
    const nutritionRecipeDbForm = document.getElementById('nutrition-recipe-db-form');
    const nutritionRecipeDbId = document.getElementById('nutrition-recipe-db-id');
    const nutritionRecipeDbName = document.getElementById('nutrition-recipe-db-name');
    const nutritionRecipeDbMeal = document.getElementById('nutrition-recipe-db-meal');
    const nutritionRecipeDbAmount = document.getElementById('nutrition-recipe-db-amount');
    const nutritionRecipeDbCalories = document.getElementById('nutrition-recipe-db-calories');
    const nutritionRecipeDbProtein = document.getElementById('nutrition-recipe-db-protein');
    const nutritionRecipeDbFat = document.getElementById('nutrition-recipe-db-fat');
    const nutritionRecipeDbCarbs = document.getElementById('nutrition-recipe-db-carbs');
    const nutritionRecipeDbCost = document.getElementById('nutrition-recipe-db-cost');
    const nutritionRecipeDbIngredients = document.getElementById('nutrition-recipe-db-ingredients');
    const nutritionRecipeDbNotes = document.getElementById('nutrition-recipe-db-notes');
    const nutritionRecipeDbSaveBtn = document.getElementById('nutrition-recipe-db-save-btn');
    const nutritionRecipeDbCancelBtn = document.getElementById('nutrition-recipe-db-cancel-btn');
    const nutritionRecipeSortField = document.getElementById('nutrition-recipe-sort-field');
    const nutritionRecipeSortDirection = document.getElementById('nutrition-recipe-sort-direction');
    const nutritionRecipeDatabase = document.getElementById('nutrition-recipe-database');
    const nutritionRecentLogs = document.getElementById('nutrition-recent-logs');
    const healthVolumeChart = document.getElementById('health-volume-chart');
    const healthSplitBars = document.getElementById('health-split-bars');
    const healthExerciseProgress = document.getElementById('health-exercise-progress');
    const healthExerciseChartSelect = document.getElementById('health-exercise-chart-select');
    const healthExerciseWeightChart = document.getElementById('health-exercise-weight-chart');
    const healthRecentWorkouts = document.getElementById('health-recent-workouts');
    const biomarkerTestDate = document.getElementById('biomarker-test-date');
    const biomarkerPrintDate = document.getElementById('biomarker-print-date');
    const biomarkerMarkerCount = document.getElementById('biomarker-marker-count');
    const biomarkerNormalCount = document.getElementById('biomarker-normal-count');
    const biomarkerVitaminD = document.getElementById('biomarker-vitamin-d');
    const biomarkerHba1c = document.getElementById('biomarker-hba1c');
    const biomarkerResults = document.getElementById('biomarker-results');
    const biomarkerCategoryBars = document.getElementById('biomarker-category-bars');
    let currentHealthExercises = [];
    let currentNutritionFoodRows = [];
    let currentNutritionFoodLog = {};
    let selectedNutritionFoodLogDate = '';
    let currentNutritionFoodDatabaseRows = [];
    let currentNutritionRecipeDatabaseRows = [];
    let nutritionServingBaseline = null;
    let nutritionRecipeIngredientBaseline = null;
    let nutritionFoodDetailsVisible = false;

    function setNutritionFoodDetailsVisible(visible) {
        nutritionFoodDetailsVisible = Boolean(visible);
        nutritionFoodForm?.querySelectorAll('.nutrition-food-detail').forEach(element => {
            const isRecipeAdjuster = element === nutritionRecipeIngredientsAdjuster;
            const shouldShow = nutritionFoodDetailsVisible && (!isRecipeAdjuster || Boolean(nutritionRecipeIngredientBaseline));
            element.classList.toggle('hidden', !shouldShow);
        });
        if (nutritionFoodDetailsBtn) nutritionFoodDetailsBtn.innerText = nutritionFoodDetailsVisible ? 'Hide details' : 'Edit details';
    }

    if (refreshHealthBtn) refreshHealthBtn.addEventListener('click', loadHealthData);
    if (healthExerciseChartSelect) healthExerciseChartSelect.addEventListener('change', () => renderHealthExerciseWeightChart(currentHealthExercises, healthExerciseChartSelect.value));
    if (nutritionFoodForm) nutritionFoodForm.addEventListener('submit', saveNutritionFoodEntry);
    if (nutritionFoodCancelBtn) nutritionFoodCancelBtn.addEventListener('click', resetNutritionFoodForm);
    if (nutritionFoodLogDateFilter) nutritionFoodLogDateFilter.addEventListener('change', () => {
        selectedNutritionFoodLogDate = nutritionFoodLogDateFilter.value;
        renderNutritionFoodLog(currentNutritionFoodLog);
    });
    if (nutritionFoodDbForm) nutritionFoodDbForm.addEventListener('submit', saveNutritionFoodDatabaseEntry);
    if (nutritionFoodDbCancelBtn) nutritionFoodDbCancelBtn.addEventListener('click', resetNutritionFoodDatabaseForm);
    if (nutritionFoodDbSelect) nutritionFoodDbSelect.addEventListener('change', applySelectedFoodDatabaseItem);
    if (nutritionFoodAmount) nutritionFoodAmount.addEventListener('input', scaleNutritionFoodEntryFromAmount);
    if (nutritionFoodDetailsBtn) nutritionFoodDetailsBtn.addEventListener('click', () => setNutritionFoodDetailsVisible(!nutritionFoodDetailsVisible));
    if (nutritionRecipeDbForm) nutritionRecipeDbForm.addEventListener('submit', saveNutritionRecipeDatabaseEntry);
    if (nutritionRecipeDbCancelBtn) nutritionRecipeDbCancelBtn.addEventListener('click', resetNutritionRecipeDatabaseForm);
    if (nutritionRecipeDbSelect) {
        nutritionRecipeDbSelect.addEventListener('input', renderNutritionRecipeSearchResults);
        nutritionRecipeDbSelect.addEventListener('focus', renderNutritionRecipeSearchResults);
    }
    document.addEventListener('click', event => {
        if (!nutritionRecipeDbSelect?.parentElement.contains(event.target)) nutritionRecipeSearchResults?.classList.add('hidden');
    });
    if (nutritionRecipeSortField) nutritionRecipeSortField.addEventListener('change', renderNutritionRecipeDatabase);
    if (nutritionRecipeSortDirection) nutritionRecipeSortDirection.addEventListener('change', renderNutritionRecipeDatabase);

    async function loadHealthData(silent = false) {
        if (!document.getElementById('view-health')) return;
        if (refreshHealthBtn && !silent) refreshHealthBtn.innerText = 'Loading...';
        try {
            const [workoutRes, nutritionRes, biomarkerRes] = await Promise.all([
                fetch('/api/workouts'),
                fetch('/api/nutrition'),
                fetch('/api/biomarkers')
            ]);
            if (!workoutRes.ok) throw new Error(`Workout request failed: ${workoutRes.status}`);
            const data = await workoutRes.json();
            renderHealthDashboard(data);
            if (nutritionRes.ok) renderNutritionDashboard(await nutritionRes.json());
            if (biomarkerRes.ok) renderBiomarkerDashboard(await biomarkerRes.json());
        } catch (e) {
            console.error(e);
            if (healthVolumeChart) healthVolumeChart.innerHTML = '<div class="text-sm text-red-500 border border-red-200 dark:border-red-500/20 rounded-lg p-6">Workout dashboard failed to load.</div>';
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
        if (healthDeadHang) healthDeadHang.innerText = Number(exercises.length || 0).toLocaleString();
        if (healthLatestDay) healthLatestDay.innerText = summary.latestWorkoutDay || '-';
        if (healthLatestDate) healthLatestDate.innerText = summary.latestDate ? formatWorkoutDate(summary.latestDate) : '-';

        renderHealthWeight(weight);
        renderHealthVolumeChart(sessions);
        renderHealthSplitBars(summary.splitCounts || {}, sessions.length);
        renderHealthExerciseProgress(exercises);
        renderHealthExerciseSelector(exercises);
        renderHealthRecentWorkouts(latestSessions);
    }

    function renderBiomarkerDashboard(data = {}) {
        const markers = Array.isArray(data.markers) ? data.markers : [];
        const summary = data.summary || {};
        const findMarker = (needle) => markers.find(marker => String(marker.name || '').toLowerCase().includes(needle));
        const vitaminD = findMarker('vitamin d');
        const hba1c = findMarker('hba1c');
        const categories = summary.categoryCounts || {};
        const maxCategory = Math.max(1, ...Object.values(categories).map(Number));

        if (biomarkerTestDate) biomarkerTestDate.innerText = summary.testDate ? formatWorkoutDate(summary.testDate) : '-';
        if (biomarkerPrintDate) biomarkerPrintDate.innerText = summary.printedAt ? `Printed ${new Date(summary.printedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}` : 'No biomarker data yet';
        if (biomarkerMarkerCount) biomarkerMarkerCount.innerText = Number(summary.markerCount || markers.length || 0).toLocaleString();
        if (biomarkerNormalCount) biomarkerNormalCount.innerText = `${Number(summary.normalCount || 0).toLocaleString()} normal / no-action markers`;
        if (biomarkerVitaminD) biomarkerVitaminD.innerText = vitaminD ? `${escapeHtml(vitaminD.value)} ${escapeHtml(vitaminD.unit || '')}` : '-';
        if (biomarkerHba1c) biomarkerHba1c.innerText = hba1c ? `${escapeHtml(hba1c.value)} ${escapeHtml(hba1c.unit || '')}` : '-';

        if (biomarkerCategoryBars) {
            const entries = Object.entries(categories).sort((a, b) => Number(b[1]) - Number(a[1]));
            biomarkerCategoryBars.innerHTML = entries.length ? entries.map(([category, count]) => {
                const pct = Math.round((Number(count || 0) / maxCategory) * 100);
                return `
                    <div>
                        <div class="flex items-center justify-between mb-2 text-sm">
                            <span class="font-medium dark:text-white">${escapeHtml(category)}</span>
                            <span class="text-gray-500 dark:text-gray-400">${Number(count).toLocaleString()}</span>
                        </div>
                        <div class="h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                            <div class="h-full rounded-full bg-purple-500" style="width:${pct}%"></div>
                        </div>
                    </div>
                `;
            }).join('') : '<div class="text-sm text-gray-500">No biomarker categories yet.</div>';
        }

        if (biomarkerResults) {
            biomarkerResults.innerHTML = markers.length ? markers.map(marker => `
                <div class="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div class="min-w-0">
                        <div class="font-semibold dark:text-white">${escapeHtml(marker.name || '')}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(marker.category || 'Other')} · Ref: ${escapeHtml(marker.reference_range || 'Not visible')}</div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <span class="text-sm font-semibold text-gray-900 dark:text-white">${escapeHtml(marker.value || '')} ${escapeHtml(marker.unit || '')}</span>
                        <span class="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">${escapeHtml(marker.status || 'Saved')}</span>
                    </div>
                </div>
            `).join('') : '<div class="p-6 text-sm text-gray-500">No biomarker data yet.</div>';
        }
    }

    function renderNutritionDashboard(data = {}) {
        const summary = data.summary || {};
        const foodLog = data.foodLog || {};
        const foodLogSummary = foodLog.summary || {};
        const foodLogDailyTotals = Array.isArray(foodLog.dailyTotals) ? foodLog.dailyTotals : [];
        const latest = foodLogSummary.latestTotal || summary.latest || null;
        const loggedDays = Number(foodLogSummary.loggedDays || summary.count || 0);
        const legacyRows = Array.isArray(data.rows) ? data.rows : [];
        const rows = foodLogDailyTotals.length ? foodLogDailyTotals : legacyRows;
        const chartRows = rows.slice(-30);
        const last7 = rows.slice(-7);
        const average = key => last7.length
            ? Math.round((last7.reduce((total, row) => total + Number(row[key] || 0), 0) / last7.length) * 10) / 10
            : 0;
        const avg = last7.length ? {
            calories: average('calories'),
            protein: average('protein'),
            fat: average('fat'),
            carbs: average('carbs')
        } : (summary.last7Average || {});

        if (nutritionCalories) nutritionCalories.innerText = latest ? Number(latest.calories || 0).toLocaleString() : '-';
        if (nutritionLatestDate) nutritionLatestDate.innerText = latest ? `${formatWorkoutDate(latest.date)} · ${loggedDays} logged ${loggedDays === 1 ? 'day' : 'days'}` : 'No food logged yet';
        const formatMacroTotal = value => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
        if (nutritionProtein) nutritionProtein.innerText = latest ? `${formatMacroTotal(latest.protein)}g` : '-';
        if (nutritionFat) nutritionFat.innerText = latest ? `${formatMacroTotal(latest.fat)}g` : '-';
        if (nutritionCarbs) nutritionCarbs.innerText = latest ? `${formatMacroTotal(latest.carbs)}g` : '-';
        const proteinCalories = Number(latest?.protein || 0) * 4;
        const fatCalories = Number(latest?.fat || 0) * 9;
        const carbsCalories = Number(latest?.carbs || 0) * 4;
        const macroCalories = proteinCalories + fatCalories + carbsCalories;
        const macroPercent = (calories, label) => macroCalories > 0 ? `${Math.round((calories / macroCalories) * 100)}% ${label}` : '-';
        if (nutritionProteinPercent) nutritionProteinPercent.innerText = latest ? macroPercent(proteinCalories, 'protein') : '-';
        if (nutritionFatPercent) nutritionFatPercent.innerText = latest ? macroPercent(fatCalories, 'fat') : '-';
        if (nutritionCarbsPercent) nutritionCarbsPercent.innerText = latest ? macroPercent(carbsCalories, 'carbs') : '-';
        if (nutritionCost) nutritionCost.innerText = latest ? `£${Number(latest.cost || 0).toFixed(2)}` : '-';

        renderNutritionCaloriesChart(chartRows);
        renderNutritionAverageBars(avg);
        renderNutritionFoodDatabase(data.foodDatabase || {});
        renderNutritionRecipeDatabase(data.recipeDatabase || {});
        renderNutritionFoodLog(data.foodLog || {});
        renderNutritionMealPlan(data.mealPlan || {}, data.macroTargets || {});
        renderNutritionRecentLogs(rows.slice(-7).reverse());
    }

    function resetNutritionFoodForm() {
        if (!nutritionFoodForm) return;
        nutritionFoodForm.reset();
        nutritionServingBaseline = null;
        nutritionRecipeIngredientBaseline = null;
        if (nutritionRecipeIngredientsAdjuster) nutritionRecipeIngredientsAdjuster.classList.add('hidden');
        if (nutritionRecipeIngredientInputs) nutritionRecipeIngredientInputs.innerHTML = '';
        if (nutritionFoodId) nutritionFoodId.value = '';
        if (nutritionFoodDate) nutritionFoodDate.value = new Date().toISOString().slice(0, 10);
        if (nutritionFoodAmountHint) nutritionFoodAmountHint.innerText = 'Choose a saved food or recipe to scale its nutrition automatically.';
        if (nutritionFoodSaveBtn) nutritionFoodSaveBtn.innerText = 'Add to log';
        if (nutritionFoodCancelBtn) nutritionFoodCancelBtn.classList.add('hidden');
        setNutritionFoodDetailsVisible(false);
    }

    function parseNutritionAmount(value = '', fallbackUnit = '') {
        const match = String(value).trim().toLowerCase().replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?/);
        if (!match) return null;
        const unitAliases = {
            gram: 'g', grams: 'g',
            millilitre: 'ml', millilitres: 'ml', milliliter: 'ml', milliliters: 'ml',
            serving: 'serving', servings: 'serving', portion: 'serving', portions: 'serving',
            piece: 'piece', pieces: 'piece', item: 'piece', items: 'piece'
        };
        const rawUnit = match[2] || fallbackUnit;
        return {
            quantity: Number(match[1]),
            unit: unitAliases[rawUnit] || rawUnit || ''
        };
    }

    function setNutritionServingBaseline(row = null, kind = 'food') {
        const parsedAmount = parseNutritionAmount(row?.defaultAmount || '');
        nutritionServingBaseline = row && parsedAmount && parsedAmount.quantity > 0 ? {
            kind,
            label: row.food || row.recipe || 'Selected item',
            amount: row.defaultAmount || '',
            quantity: parsedAmount.quantity,
            unit: parsedAmount.unit,
            calories: Number(row.calories || 0),
            protein: Number(row.protein || 0),
            fat: Number(row.fat || 0),
            carbs: Number(row.carbs || 0),
            cost: Number(kind === 'recipe' ? row.cost : row.price || 0)
        } : null;
        if (nutritionFoodAmountHint) {
            nutritionFoodAmountHint.innerText = nutritionServingBaseline
                ? `Nutrition will scale from ${nutritionServingBaseline.amount}.`
                : 'This item has no numeric default amount, so enter its nutrition manually.';
        }
    }

    function scaledNutritionValue(value, ratio, decimals = 1) {
        return Number((Number(value || 0) * ratio).toFixed(decimals));
    }

    function findNutritionFoodForIngredient(name = '') {
        const clean = String(name).trim().toLowerCase();
        return currentNutritionFoodDatabaseRows.find(row => String(row.food || '').trim().toLowerCase() === clean)
            || currentNutritionFoodDatabaseRows.find(row => {
                const food = String(row.food || '').trim().toLowerCase();
                return food.startsWith(clean) || clean.startsWith(food);
            });
    }

    function parseRecipeIngredients(value = '') {
        return String(value).split(';').map(part => {
            const text = part.trim();
            const match = text.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s*([a-z]+)\s*$/i);
            if (!match) return null;
            return { name: match[1].trim(), quantity: Number(match[2]), unit: match[3].toLowerCase() };
        }).filter(Boolean);
    }

    function nutritionIngredientContribution(food, quantity, unit) {
        const defaultAmount = parseNutritionAmount(food?.defaultAmount || '', unit);
        if (!food || !defaultAmount || defaultAmount.quantity <= 0 || defaultAmount.unit !== unit) return null;
        const ratio = quantity / defaultAmount.quantity;
        return {
            calories: Number(food.calories || 0) * ratio,
            protein: Number(food.protein || 0) * ratio,
            fat: Number(food.fat || 0) * ratio,
            carbs: Number(food.carbs || 0) * ratio,
            cost: Number(food.price || 0) * ratio
        };
    }

    function recalculateRecipeFromIngredients() {
        if (!nutritionRecipeIngredientBaseline || !nutritionRecipeIngredientInputs) return;
        const totals = { ...nutritionRecipeIngredientBaseline.totals };
        const amounts = [];
        nutritionRecipeIngredientInputs.querySelectorAll('[data-ingredient-index]').forEach(input => {
            const ingredient = nutritionRecipeIngredientBaseline.ingredients[Number(input.dataset.ingredientIndex)];
            if (!ingredient) return;
            const quantity = Math.max(0, Number(input.value || 0));
            amounts.push(`${ingredient.name} ${quantity}${ingredient.unit}`);
            if (!ingredient.baseContribution) return;
            const current = nutritionIngredientContribution(ingredient.food, quantity, ingredient.unit);
            if (!current) return;
            ['calories', 'protein', 'fat', 'carbs', 'cost'].forEach(field => {
                totals[field] += current[field] - ingredient.baseContribution[field];
            });
        });
        if (nutritionFoodAmount) nutritionFoodAmount.value = amounts.join('; ');
        if (nutritionFoodCalories) nutritionFoodCalories.value = Number(Math.max(0, totals.calories).toFixed(1));
        if (nutritionFoodProtein) nutritionFoodProtein.value = Number(Math.max(0, totals.protein).toFixed(1));
        if (nutritionFoodFat) nutritionFoodFat.value = Number(Math.max(0, totals.fat).toFixed(1));
        if (nutritionFoodCarbs) nutritionFoodCarbs.value = Number(Math.max(0, totals.carbs).toFixed(1));
        if (nutritionFoodCost) nutritionFoodCost.value = Number(Math.max(0, totals.cost).toFixed(2));
        if (nutritionFoodAmountHint) nutritionFoodAmountHint.innerText = 'Recipe totals reflect the ingredient amounts above.';
    }

    function showRecipeIngredientAdjuster(row) {
        const ingredients = parseRecipeIngredients(row?.ingredients || '').map(ingredient => {
            const food = findNutritionFoodForIngredient(ingredient.name);
            return { ...ingredient, food, baseContribution: nutritionIngredientContribution(food, ingredient.quantity, ingredient.unit) };
        });
        if (!ingredients.length || !nutritionRecipeIngredientsAdjuster || !nutritionRecipeIngredientInputs) return;
        nutritionRecipeIngredientBaseline = {
            totals: {
                calories: Number(row.calories || 0), protein: Number(row.protein || 0), fat: Number(row.fat || 0),
                carbs: Number(row.carbs || 0), cost: Number(row.cost || 0)
            },
            ingredients
        };
        nutritionRecipeIngredientInputs.innerHTML = ingredients.map((ingredient, index) => `
            <label class="text-xs text-gray-600 dark:text-gray-300">
                <span class="block mb-1">${escapeHtml(ingredient.name)} (${escapeHtml(ingredient.unit)})</span>
                <input type="number" min="0" step="1" value="${ingredient.quantity}" data-ingredient-index="${index}" class="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111] px-3 py-2 text-sm dark:text-white">
            </label>
        `).join('');
        nutritionRecipeIngredientInputs.querySelectorAll('[data-ingredient-index]').forEach(input => input.addEventListener('input', recalculateRecipeFromIngredients));
        nutritionRecipeIngredientsAdjuster.classList.toggle('hidden', !nutritionFoodDetailsVisible);
        recalculateRecipeFromIngredients();
    }

    function scaleNutritionFoodEntryFromAmount() {
        if (!nutritionServingBaseline || !nutritionFoodAmount) return;
        const entered = parseNutritionAmount(nutritionFoodAmount.value, nutritionServingBaseline.unit);
        if (!entered || entered.quantity < 0 || entered.unit !== nutritionServingBaseline.unit) {
            if (nutritionFoodAmountHint) nutritionFoodAmountHint.innerText = `Use ${nutritionServingBaseline.unit || 'the same unit'} to scale from ${nutritionServingBaseline.amount}.`;
            return;
        }
        const ratio = entered.quantity / nutritionServingBaseline.quantity;
        if (nutritionFoodCalories) nutritionFoodCalories.value = scaledNutritionValue(nutritionServingBaseline.calories, ratio);
        if (nutritionFoodProtein) nutritionFoodProtein.value = scaledNutritionValue(nutritionServingBaseline.protein, ratio);
        if (nutritionFoodFat) nutritionFoodFat.value = scaledNutritionValue(nutritionServingBaseline.fat, ratio);
        if (nutritionFoodCarbs) nutritionFoodCarbs.value = scaledNutritionValue(nutritionServingBaseline.carbs, ratio);
        if (nutritionFoodCost) nutritionFoodCost.value = scaledNutritionValue(nutritionServingBaseline.cost, ratio, 2);
        if (nutritionFoodAmountHint) {
            const percentage = Math.round(ratio * 100);
            nutritionFoodAmountHint.innerText = `${percentage}% of ${nutritionServingBaseline.amount} · nutrition and cost updated.`;
        }
    }

    async function saveNutritionFoodEntry(e) {
        e.preventDefault();
        if (!nutritionFoodItem?.value.trim()) {
            alert('Choose a saved recipe or food first.');
            return;
        }
        const selectedRecipe = currentNutritionRecipeDatabaseRows.find(entry => entry.recipe === nutritionRecipeDbSelect?.value || entry.id === nutritionRecipeDbSelect?.value);
        const payload = {
            id: nutritionFoodId?.value || '',
            date: nutritionFoodDate?.value || '',
            meal: nutritionFoodMeal?.value || '',
            time: nutritionFoodTime?.value || '',
            foodId: nutritionFoodDbSelect?.value || selectedRecipe?.id || '',
            item: nutritionFoodItem?.value || '',
            amount: nutritionFoodAmount?.value || '',
            calories: Number(nutritionFoodCalories?.value || 0),
            protein: Number(nutritionFoodProtein?.value || 0),
            fat: Number(nutritionFoodFat?.value || 0),
            carbs: Number(nutritionFoodCarbs?.value || 0),
            cost: Number(nutritionFoodCost?.value || 0),
            notes: nutritionFoodNotes?.value || ''
        };
        try {
            const res = await fetch('/api/nutrition/food-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to save food entry');
            selectedNutritionFoodLogDate = payload.date;
            resetNutritionFoodForm();
            await loadHealthData(true);
        } catch (err) {
            alert(err.message || 'Failed to save food entry');
        }
    }

    function editNutritionFoodEntry(id = '') {
        const row = currentNutritionFoodRows.find(entry => entry.id === id);
        if (!row) return;
        const savedFood = currentNutritionFoodDatabaseRows.find(entry => entry.id === row.foodId)
            || currentNutritionFoodDatabaseRows.find(entry => entry.food === row.item);
        const savedRecipe = currentNutritionRecipeDatabaseRows.find(entry => entry.id === row.foodId)
            || currentNutritionRecipeDatabaseRows.find(entry => entry.recipe === row.item);
        setNutritionServingBaseline(savedFood || savedRecipe || null, savedRecipe && !savedFood ? 'recipe' : 'food');
        if (nutritionFoodId) nutritionFoodId.value = row.id || '';
        if (nutritionFoodDate) nutritionFoodDate.value = row.date || '';
        if (nutritionFoodMeal) nutritionFoodMeal.value = row.meal || '';
        if (nutritionFoodTime) nutritionFoodTime.value = row.time || '';
        if (nutritionRecipeDbSelect) nutritionRecipeDbSelect.value = savedRecipe?.recipe || '';
        if (nutritionFoodDbSelect) nutritionFoodDbSelect.value = row.foodId || '';
        if (nutritionFoodItem) nutritionFoodItem.value = row.item || '';
        if (nutritionFoodAmount) nutritionFoodAmount.value = row.amount || '';
        if (nutritionFoodCalories) nutritionFoodCalories.value = row.calories || '';
        if (nutritionFoodProtein) nutritionFoodProtein.value = row.protein || '';
        if (nutritionFoodFat) nutritionFoodFat.value = row.fat || '';
        if (nutritionFoodCarbs) nutritionFoodCarbs.value = row.carbs || '';
        if (nutritionFoodCost) nutritionFoodCost.value = row.cost || '';
        if (nutritionFoodNotes) nutritionFoodNotes.value = row.notes || '';
        if (nutritionFoodSaveBtn) nutritionFoodSaveBtn.innerText = 'Update food';
        if (nutritionFoodCancelBtn) nutritionFoodCancelBtn.classList.remove('hidden');
        setNutritionFoodDetailsVisible(true);
        nutritionFoodForm?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    async function deleteNutritionFoodEntry(id = '') {
        if (!id || !confirm('Delete this food entry?')) return;
        try {
            const res = await fetch(`/api/nutrition/food-log/${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete food entry');
            await loadHealthData(true);
        } catch (err) {
            alert(err.message || 'Failed to delete food entry');
        }
    }


    function resetNutritionFoodDatabaseForm() {
        if (!nutritionFoodDbForm) return;
        nutritionFoodDbForm.reset();
        if (nutritionFoodDbId) nutritionFoodDbId.value = '';
        if (nutritionFoodDbSaveBtn) nutritionFoodDbSaveBtn.innerText = 'Save food';
        if (nutritionFoodDbCancelBtn) nutritionFoodDbCancelBtn.classList.add('hidden');
    }

    async function saveNutritionFoodDatabaseEntry(e) {
        e.preventDefault();
        const payload = {
            id: nutritionFoodDbId?.value || '',
            food: nutritionFoodDbName?.value || '',
            defaultAmount: nutritionFoodDbAmount?.value || '',
            calories: Number(nutritionFoodDbCalories?.value || 0),
            protein: Number(nutritionFoodDbProtein?.value || 0),
            fat: Number(nutritionFoodDbFat?.value || 0),
            carbs: Number(nutritionFoodDbCarbs?.value || 0),
            sugars: Number(nutritionFoodDbSugars?.value || 0),
            fibre: Number(nutritionFoodDbFibre?.value || 0),
            salt: Number(nutritionFoodDbSalt?.value || 0),
            price: Number(nutritionFoodDbPrice?.value || 0),
            notes: nutritionFoodDbNotes?.value || ''
        };
        try {
            const res = await fetch('/api/nutrition/food-database', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to save food database item');
            resetNutritionFoodDatabaseForm();
            await loadHealthData(true);
        } catch (err) {
            alert(err.message || 'Failed to save food database item');
        }
    }

    function editNutritionFoodDatabaseEntry(id = '') {
        const row = currentNutritionFoodDatabaseRows.find(entry => entry.id === id);
        if (!row) return;
        if (nutritionFoodDbId) nutritionFoodDbId.value = row.id || '';
        if (nutritionFoodDbName) nutritionFoodDbName.value = row.food || '';
        if (nutritionFoodDbAmount) nutritionFoodDbAmount.value = row.defaultAmount || '';
        if (nutritionFoodDbCalories) nutritionFoodDbCalories.value = row.calories || '';
        if (nutritionFoodDbProtein) nutritionFoodDbProtein.value = row.protein || '';
        if (nutritionFoodDbFat) nutritionFoodDbFat.value = row.fat || '';
        if (nutritionFoodDbCarbs) nutritionFoodDbCarbs.value = row.carbs || '';
        if (nutritionFoodDbSugars) nutritionFoodDbSugars.value = row.sugars || '';
        if (nutritionFoodDbFibre) nutritionFoodDbFibre.value = row.fibre || '';
        if (nutritionFoodDbSalt) nutritionFoodDbSalt.value = row.salt || '';
        if (nutritionFoodDbPrice) nutritionFoodDbPrice.value = row.price || '';
        if (nutritionFoodDbNotes) nutritionFoodDbNotes.value = row.notes || '';
        if (nutritionFoodDbSaveBtn) nutritionFoodDbSaveBtn.innerText = 'Update food';
        if (nutritionFoodDbCancelBtn) nutritionFoodDbCancelBtn.classList.remove('hidden');
        nutritionFoodDbForm?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    async function deleteNutritionFoodDatabaseEntry(id = '') {
        if (!id || !confirm('Delete this food database item?')) return;
        try {
            const res = await fetch(`/api/nutrition/food-database/${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete food database item');
            await loadHealthData(true);
        } catch (err) {
            alert(err.message || 'Failed to delete food database item');
        }
    }

    function applySelectedFoodDatabaseItem() {
        const id = nutritionFoodDbSelect?.value || '';
        const row = currentNutritionFoodDatabaseRows.find(entry => entry.id === id);
        if (!row) {
            setNutritionServingBaseline(null);
            return;
        }
        nutritionRecipeIngredientBaseline = null;
        if (nutritionRecipeIngredientsAdjuster) nutritionRecipeIngredientsAdjuster.classList.add('hidden');
        setNutritionServingBaseline(row, 'food');
        if (nutritionRecipeDbSelect) nutritionRecipeDbSelect.value = '';
        if (nutritionFoodItem) nutritionFoodItem.value = row.food || '';
        if (nutritionFoodAmount) nutritionFoodAmount.value = row.defaultAmount || '';
        if (nutritionFoodCalories) nutritionFoodCalories.value = row.calories || '';
        if (nutritionFoodProtein) nutritionFoodProtein.value = row.protein || '';
        if (nutritionFoodFat) nutritionFoodFat.value = row.fat || '';
        if (nutritionFoodCarbs) nutritionFoodCarbs.value = row.carbs || '';
        if (nutritionFoodCost) nutritionFoodCost.value = row.price || '';
    }

    function renderNutritionFoodDatabase(foodDatabase = {}) {
        if (!nutritionFoodDatabase) return;
        currentNutritionFoodDatabaseRows = Array.isArray(foodDatabase.rows) ? foodDatabase.rows : [];
        if (nutritionFoodDbSelect) {
            nutritionFoodDbSelect.innerHTML = '<option value="">Choose saved food</option>' + currentNutritionFoodDatabaseRows.map(row => `<option value="${escapeHtml(row.id)}">${escapeHtml(row.food)}</option>`).join('');
        }
        if (!currentNutritionFoodDatabaseRows.length) {
            nutritionFoodDatabase.innerHTML = '<div class="p-6 text-sm text-gray-500">No saved foods yet.</div>';
            return;
        }
        nutritionFoodDatabase.innerHTML = currentNutritionFoodDatabaseRows.map(row => `
            <div class="px-6 py-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div class="min-w-0">
                    <div class="font-semibold dark:text-white">${escapeHtml(row.food || '')}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(row.defaultAmount || 'Default serving')}${row.notes ? ` · ${escapeHtml(row.notes)}` : ''}</div>
                </div>
                <div class="flex flex-wrap items-center gap-2 text-xs">
                    <span class="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">${Number(row.calories || 0).toLocaleString()} kcal</span>
                    <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">P ${Number(row.protein || 0)}g</span>
                    <span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">F ${Number(row.fat || 0)}g</span>
                    <span class="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">C ${Number(row.carbs || 0)}g</span>
                    <span class="px-2.5 py-1 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300">Sugars ${Number(row.sugars || 0)}g</span>
                    <span class="px-2.5 py-1 rounded-full bg-lime-100 text-lime-700 dark:bg-lime-500/20 dark:text-lime-300">Fibre ${Number(row.fibre || 0)}g</span>
                    <span class="px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300">Salt ${Number(row.salt || 0)}g</span>
                    <span class="px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">£${Number(row.price || 0).toFixed(2)}</span>
                    <button type="button" class="nutrition-food-db-edit text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 hover:bg-gray-100 dark:hover:bg-white/5" data-id="${escapeHtml(row.id)}">Edit</button>
                    <button type="button" class="nutrition-food-db-delete text-red-600 dark:text-red-300 border border-red-200 dark:border-red-500/20 rounded-lg px-2.5 py-1 hover:bg-red-50 dark:hover:bg-red-500/10" data-id="${escapeHtml(row.id)}">Delete</button>
                </div>
            </div>
        `).join('');
        nutritionFoodDatabase.querySelectorAll('.nutrition-food-db-edit').forEach(btn => btn.addEventListener('click', () => editNutritionFoodDatabaseEntry(btn.dataset.id)));
        nutritionFoodDatabase.querySelectorAll('.nutrition-food-db-delete').forEach(btn => btn.addEventListener('click', () => deleteNutritionFoodDatabaseEntry(btn.dataset.id)));
    }


    function resetNutritionRecipeDatabaseForm() {
        if (!nutritionRecipeDbForm) return;
        nutritionRecipeDbForm.reset();
        if (nutritionRecipeDbId) nutritionRecipeDbId.value = '';
        if (nutritionRecipeDbSaveBtn) nutritionRecipeDbSaveBtn.innerText = 'Save recipe';
        if (nutritionRecipeDbCancelBtn) nutritionRecipeDbCancelBtn.classList.add('hidden');
    }

    async function saveNutritionRecipeDatabaseEntry(e) {
        e.preventDefault();
        const payload = {
            id: nutritionRecipeDbId?.value || '',
            recipe: nutritionRecipeDbName?.value || '',
            meal: nutritionRecipeDbMeal?.value || '',
            defaultAmount: nutritionRecipeDbAmount?.value || '',
            calories: Number(nutritionRecipeDbCalories?.value || 0),
            protein: Number(nutritionRecipeDbProtein?.value || 0),
            fat: Number(nutritionRecipeDbFat?.value || 0),
            carbs: Number(nutritionRecipeDbCarbs?.value || 0),
            cost: Number(nutritionRecipeDbCost?.value || 0),
            ingredients: nutritionRecipeDbIngredients?.value || '',
            notes: nutritionRecipeDbNotes?.value || ''
        };
        try {
            const res = await fetch('/api/nutrition/recipe-database', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to save recipe');
            resetNutritionRecipeDatabaseForm();
            await loadHealthData(true);
        } catch (err) {
            alert(err.message || 'Failed to save recipe');
        }
    }

    function editNutritionRecipeDatabaseEntry(id = '') {
        const row = currentNutritionRecipeDatabaseRows.find(entry => entry.id === id);
        if (!row) return;
        if (nutritionRecipeDbId) nutritionRecipeDbId.value = row.id || '';
        if (nutritionRecipeDbName) nutritionRecipeDbName.value = row.recipe || '';
        if (nutritionRecipeDbMeal) nutritionRecipeDbMeal.value = row.meal || '';
        if (nutritionRecipeDbAmount) nutritionRecipeDbAmount.value = row.defaultAmount || '';
        if (nutritionRecipeDbCalories) nutritionRecipeDbCalories.value = row.calories || '';
        if (nutritionRecipeDbProtein) nutritionRecipeDbProtein.value = row.protein || '';
        if (nutritionRecipeDbFat) nutritionRecipeDbFat.value = row.fat || '';
        if (nutritionRecipeDbCarbs) nutritionRecipeDbCarbs.value = row.carbs || '';
        if (nutritionRecipeDbCost) nutritionRecipeDbCost.value = row.cost || '';
        if (nutritionRecipeDbIngredients) nutritionRecipeDbIngredients.value = row.ingredients || '';
        if (nutritionRecipeDbNotes) nutritionRecipeDbNotes.value = row.notes || '';
        if (nutritionRecipeDbSaveBtn) nutritionRecipeDbSaveBtn.innerText = 'Update recipe';
        if (nutritionRecipeDbCancelBtn) nutritionRecipeDbCancelBtn.classList.remove('hidden');
        nutritionRecipeDbForm?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    async function deleteNutritionRecipeDatabaseEntry(id = '') {
        if (!id || !confirm('Delete this recipe?')) return;
        try {
            const res = await fetch(`/api/nutrition/recipe-database/${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete recipe');
            await loadHealthData(true);
        } catch (err) {
            alert(err.message || 'Failed to delete recipe');
        }
    }

    function applySelectedRecipeDatabaseItem() {
        const selection = nutritionRecipeDbSelect?.value || '';
        const row = currentNutritionRecipeDatabaseRows.find(entry => entry.id === selection || entry.recipe === selection);
        if (!row) {
            setNutritionServingBaseline(null);
            nutritionRecipeIngredientBaseline = null;
            if (nutritionRecipeIngredientsAdjuster) nutritionRecipeIngredientsAdjuster.classList.add('hidden');
            return;
        }
        setNutritionServingBaseline(row, 'recipe');
        if (nutritionFoodDbSelect) nutritionFoodDbSelect.value = '';
        if (nutritionFoodMeal) nutritionFoodMeal.value = row.meal || nutritionFoodMeal.value;
        if (nutritionFoodItem) nutritionFoodItem.value = row.recipe || '';
        if (nutritionFoodAmount) nutritionFoodAmount.value = row.defaultAmount || '';
        if (nutritionFoodCalories) nutritionFoodCalories.value = row.calories || '';
        if (nutritionFoodProtein) nutritionFoodProtein.value = row.protein || '';
        if (nutritionFoodFat) nutritionFoodFat.value = row.fat || '';
        if (nutritionFoodCarbs) nutritionFoodCarbs.value = row.carbs || '';
        if (nutritionFoodCost) nutritionFoodCost.value = row.cost || '';
        showRecipeIngredientAdjuster(row);
    }

    function selectNutritionRecipeSearchResult(id = '') {
        const row = currentNutritionRecipeDatabaseRows.find(entry => entry.id === id);
        if (!row || !nutritionRecipeDbSelect) return;
        nutritionRecipeDbSelect.value = row.recipe;
        nutritionRecipeSearchResults?.classList.add('hidden');
        applySelectedRecipeDatabaseItem();
    }

    function renderNutritionRecipeSearchResults() {
        if (!nutritionRecipeSearchResults || !nutritionRecipeDbSelect) return;
        const query = nutritionRecipeDbSelect.value.trim().toLowerCase();
        const terms = query.split(/\s+/).filter(Boolean);
        const exactMatch = currentNutritionRecipeDatabaseRows.find(row => String(row.recipe || '').toLowerCase() === query);
        if (exactMatch) {
            applySelectedRecipeDatabaseItem();
            nutritionRecipeSearchResults.classList.add('hidden');
            return;
        }
        if (!nutritionFoodDbSelect?.value) {
            nutritionServingBaseline = null;
            nutritionRecipeIngredientBaseline = null;
            if (nutritionFoodItem) nutritionFoodItem.value = '';
            if (nutritionRecipeIngredientsAdjuster) nutritionRecipeIngredientsAdjuster.classList.add('hidden');
        }
        if (!terms.length) {
            nutritionRecipeSearchResults.innerHTML = '<div class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Type a few words, e.g. workout peach broccoli</div>';
            nutritionRecipeSearchResults.classList.remove('hidden');
            return;
        }
        const matches = currentNutritionRecipeDatabaseRows.filter(row => {
            const searchable = `${row.recipe || ''} ${row.meal || ''} ${row.ingredients || ''}`.toLowerCase();
            const recipeName = String(row.recipe || '').toLowerCase();
            if (terms.includes('workout') && !terms.includes('non') && !recipeName.startsWith('workout')) return false;
            if (terms.includes('non') && !recipeName.startsWith('non-workout')) return false;
            return terms.every(term => searchable.includes(term));
        }).slice(0, 20);
        nutritionRecipeSearchResults.innerHTML = matches.length
            ? matches.map(row => `<button type="button" class="nutrition-recipe-search-result block w-full text-left px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 border-b border-gray-100 dark:border-white/5 last:border-0" data-id="${escapeHtml(row.id)}">${escapeHtml(row.recipe)}</button>`).join('')
            : '<div class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No matching recipes</div>';
        nutritionRecipeSearchResults.querySelectorAll('.nutrition-recipe-search-result').forEach(button => {
            button.addEventListener('click', () => selectNutritionRecipeSearchResult(button.dataset.id));
        });
        nutritionRecipeSearchResults.classList.remove('hidden');
    }

    function renderNutritionRecipeDatabase(recipeDatabase) {
        if (!nutritionRecipeDatabase) return;
        const receivedRows = recipeDatabase && Array.isArray(recipeDatabase.rows);
        if (receivedRows) currentNutritionRecipeDatabaseRows = recipeDatabase.rows;
        if (!currentNutritionRecipeDatabaseRows.length) {
            nutritionRecipeDatabase.innerHTML = '<div class="p-6 text-sm text-gray-500">No saved recipes yet.</div>';
            return;
        }
        const sortField = nutritionRecipeSortField?.value || 'recipe';
        const sortDirection = nutritionRecipeSortDirection?.value === 'desc' ? -1 : 1;
        const numericFields = new Set(['cost', 'calories', 'protein', 'fat', 'carbs']);
        const sortedRows = [...currentNutritionRecipeDatabaseRows].sort((a, b) => {
            if (numericFields.has(sortField)) {
                const difference = Number(a[sortField] || 0) - Number(b[sortField] || 0);
                if (difference) return difference * sortDirection;
            } else {
                const difference = String(a.recipe || '').localeCompare(String(b.recipe || ''), undefined, { sensitivity: 'base' });
                if (difference) return difference * sortDirection;
            }
            return String(a.recipe || '').localeCompare(String(b.recipe || ''), undefined, { sensitivity: 'base' });
        });
        nutritionRecipeDatabase.innerHTML = sortedRows.map(row => `
            <div class="px-6 py-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div class="min-w-0">
                    <div class="font-semibold dark:text-white">${escapeHtml(row.recipe || '')}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(row.meal || 'Meal')}${row.defaultAmount ? ` · ${escapeHtml(row.defaultAmount)}` : ''}${row.notes ? ` · ${escapeHtml(row.notes)}` : ''}</div>
                    ${row.ingredients ? `<div class="text-xs text-gray-600 dark:text-gray-300 mt-2">Ingredients: ${escapeHtml(row.ingredients)}</div>` : ''}
                </div>
                <div class="flex flex-wrap items-center gap-2 text-xs">
                    <span class="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">${Number(row.calories || 0).toLocaleString()} kcal</span>
                    <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">P ${Number(row.protein || 0)}g</span>
                    <span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">F ${Number(row.fat || 0)}g</span>
                    <span class="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">C ${Number(row.carbs || 0)}g</span>
                    <span class="px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">£${Number(row.cost || 0).toFixed(2)}</span>
                    <button type="button" class="nutrition-recipe-db-edit text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 hover:bg-gray-100 dark:hover:bg-white/5" data-id="${escapeHtml(row.id)}">Edit</button>
                    <button type="button" class="nutrition-recipe-db-delete text-red-600 dark:text-red-300 border border-red-200 dark:border-red-500/20 rounded-lg px-2.5 py-1 hover:bg-red-50 dark:hover:bg-red-500/10" data-id="${escapeHtml(row.id)}">Delete</button>
                </div>
            </div>
        `).join('');
        nutritionRecipeDatabase.querySelectorAll('.nutrition-recipe-db-edit').forEach(btn => btn.addEventListener('click', () => editNutritionRecipeDatabaseEntry(btn.dataset.id)));
        nutritionRecipeDatabase.querySelectorAll('.nutrition-recipe-db-delete').forEach(btn => btn.addEventListener('click', () => deleteNutritionRecipeDatabaseEntry(btn.dataset.id)));
    }

    function renderNutritionFoodLog(foodLog = {}) {
        if (!nutritionFoodLog) return;
        currentNutritionFoodLog = foodLog;
        currentNutritionFoodRows = Array.isArray(foodLog.rows) ? foodLog.rows : [];
        const today = new Date().toISOString().slice(0, 10);
        if (!selectedNutritionFoodLogDate) selectedNutritionFoodLogDate = today;
        if (nutritionFoodDate && !nutritionFoodDate.value) nutritionFoodDate.value = today;
        if (nutritionFoodLogDateFilter) nutritionFoodLogDateFilter.value = selectedNutritionFoodLogDate;
        const dayRows = currentNutritionFoodRows.filter(row => row.date === selectedNutritionFoodLogDate).sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
        const dayTotal = dayRows.reduce((total, row) => ({
            calories: total.calories + Number(row.calories || 0),
            protein: total.protein + Number(row.protein || 0),
            fat: total.fat + Number(row.fat || 0),
            carbs: total.carbs + Number(row.carbs || 0),
            cost: total.cost + Number(row.cost || 0)
        }), { calories: 0, protein: 0, fat: 0, carbs: 0, cost: 0 });
        const cleanMacro = value => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
        if (nutritionFoodLogDayTotal) nutritionFoodLogDayTotal.innerText = dayRows.length
            ? `${Math.round(dayTotal.calories).toLocaleString()} kcal · P ${cleanMacro(dayTotal.protein)}g · F ${cleanMacro(dayTotal.fat)}g · C ${cleanMacro(dayTotal.carbs)}g · £${dayTotal.cost.toFixed(2)}`
            : 'No entries';
        if (!dayRows.length) {
            nutritionFoodLog.innerHTML = `<div class="p-6 text-sm text-gray-500">No food logged for ${escapeHtml(formatWorkoutDate(selectedNutritionFoodLogDate))}.</div>`;
            return;
        }
        nutritionFoodLog.innerHTML = dayRows.map(row => `
            <div class="px-6 py-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div class="min-w-0">
                    <div class="font-semibold dark:text-white">${escapeHtml(row.item || '')}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(formatWorkoutDate(row.date))}${row.meal ? ` · ${escapeHtml(row.meal)}` : ''}${row.time ? ` · ${escapeHtml(row.time)}` : ''}${row.amount ? ` · ${escapeHtml(row.amount)}` : ''}</div>
                    ${row.notes ? `<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(row.notes)}</div>` : ''}
                </div>
                <div class="flex flex-wrap items-center gap-2 text-xs">
                    <span class="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">${Number(row.calories || 0).toLocaleString()} kcal</span>
                    <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">P ${Number(row.protein || 0)}g</span>
                    <span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">F ${Number(row.fat || 0)}g</span>
                    <span class="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">C ${Number(row.carbs || 0)}g</span>
                    <span class="px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">£${Number(row.cost || 0).toFixed(2)}</span>
                    <button type="button" class="nutrition-food-edit text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 hover:bg-gray-100 dark:hover:bg-white/5" data-id="${escapeHtml(row.id)}">Edit</button>
                    <button type="button" class="nutrition-food-delete text-red-600 dark:text-red-300 border border-red-200 dark:border-red-500/20 rounded-lg px-2.5 py-1 hover:bg-red-50 dark:hover:bg-red-500/10" data-id="${escapeHtml(row.id)}">Delete</button>
                </div>
            </div>
        `).join('');
        nutritionFoodLog.querySelectorAll('.nutrition-food-edit').forEach(btn => btn.addEventListener('click', () => editNutritionFoodEntry(btn.dataset.id)));
        nutritionFoodLog.querySelectorAll('.nutrition-food-delete').forEach(btn => btn.addEventListener('click', () => deleteNutritionFoodEntry(btn.dataset.id)));
    }

    function renderNutritionMealPlan(mealPlan = {}, macroTargets = {}) {
        if (!nutritionMealPlan) return;
        const dayTypes = Array.isArray(mealPlan.dayTypes) ? mealPlan.dayTypes : [];
        const targetMap = new Map((macroTargets.dayTypes || []).map(day => [day.dayType, day]));
        if (!dayTypes.length) {
            nutritionMealPlan.innerHTML = '<div class="text-sm text-gray-500">No meal plan saved yet.</div>';
            return;
        }
        nutritionMealPlan.innerHTML = `<div class="grid grid-cols-1 xl:grid-cols-2 gap-6">${dayTypes.map(day => {
            const target = targetMap.get(day.dayType) || {};
            const total = target.total || {};
            const mealMacroMap = new Map((target.meals || []).map(meal => [meal.meal, meal]));
            const macroPills = (macro = {}) => macro.calories ? `<div class="flex flex-wrap gap-2 text-xs"><span class="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">${Math.round(macro.calories).toLocaleString()} kcal</span><span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">P ${Math.round(macro.protein)}g</span><span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">F ${Math.round(macro.fat)}g</span><span class="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">C ${Math.round(macro.carbs)}g</span></div>` : '';
            return `
                <div class="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#171717] overflow-hidden">
                    <div class="px-5 py-4 border-b border-gray-200 dark:border-white/10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h3 class="text-base font-semibold dark:text-white">${escapeHtml(day.dayType)} Day</h3>
                            <p class="text-xs text-gray-500 dark:text-gray-400">${day.meals.length} meals planned</p>
                        </div>
                        ${macroPills(total)}
                    </div>
                    <div class="divide-y divide-gray-200 dark:divide-white/10">
                        ${day.meals.map(meal => {
                            const mealMacros = mealMacroMap.get(meal.meal) || {};
                            return `
                            <div class="p-5">
                                <div class="flex flex-col gap-3 mb-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div class="font-semibold dark:text-white">${escapeHtml(meal.meal)}</div>
                                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(meal.time)}</div>
                                    </div>
                                    ${macroPills(mealMacros)}
                                </div>
                                <ul class="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                                    ${meal.items.map(item => `<li class="flex items-start justify-between gap-3"><span>${escapeHtml(item.item)}</span><span class="shrink-0 font-medium text-gray-900 dark:text-white">${escapeHtml(item.amount)}${escapeHtml(item.unit)}</span></li>`).join('')}
                                </ul>
                            </div>
                        `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('')}</div>`;
    }

    function renderNutritionCaloriesChart(rows = []) {
        if (!nutritionCaloriesChart) return;
        if (!rows.length) {
            nutritionCaloriesChart.innerHTML = '<div class="text-sm text-gray-500">No daily macro logs yet.</div>';
            return;
        }
        const maxCalories = Math.max(1, ...rows.map(row => Number(row.calories || 0)));
        const points = rows.map((row, i) => {
            const x = rows.length === 1 ? 50 : (i / (rows.length - 1)) * 100;
            const y = 90 - ((Number(row.calories || 0) / maxCalories) * 76);
            return `${x},${y}`;
        }).join(' ');
        nutritionCaloriesChart.innerHTML = `
            <svg viewBox="0 0 100 100" class="w-full h-56 overflow-visible" preserveAspectRatio="none" role="img" aria-label="Calories trend">
                <line x1="0" x2="100" y1="90" y2="90" class="stroke-gray-200 dark:stroke-white/10" stroke-width="0.5"></line>
                <polyline points="${points}" fill="none" class="stroke-orange-500" stroke-width="2.4" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"></polyline>
                ${rows.map((row, i) => {
                    const x = rows.length === 1 ? 50 : (i / (rows.length - 1)) * 100;
                    const y = 90 - ((Number(row.calories || 0) / maxCalories) * 76);
                    return `<circle cx="${x}" cy="${y}" r="1.6" class="fill-orange-500"></circle>`;
                }).join('')}
            </svg>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs text-gray-500 dark:text-gray-400">
                ${rows.slice(-4).map(row => `<div class="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#171717] p-3"><div class="font-medium text-gray-900 dark:text-white">${Number(row.calories || 0).toLocaleString()} kcal</div><div>${escapeHtml(formatWorkoutDate(row.date))}</div><div class="mt-1 text-orange-600 dark:text-orange-300">P ${Number(row.protein || 0)}g · F ${Number(row.fat || 0)}g · C ${Number(row.carbs || 0)}g</div></div>`).join('')}
            </div>
        `;
    }

    function renderNutritionAverageBars(avg = {}) {
        if (!nutritionAverageBars) return;
        const items = [
            ['Calories', Number(avg.calories || 0), 'kcal', 'bg-orange-500', 3000],
            ['Protein', Number(avg.protein || 0), 'g', 'bg-emerald-500', 220],
            ['Fat', Number(avg.fat || 0), 'g', 'bg-amber-500', 120],
            ['Carbs', Number(avg.carbs || 0), 'g', 'bg-blue-500', 350]
        ];
        nutritionAverageBars.innerHTML = items.map(([label, value, unit, colour, max]) => {
            const pct = Math.min(100, Math.round((value / max) * 100));
            return `
                <div>
                    <div class="flex items-center justify-between mb-2 text-sm">
                        <span class="font-medium dark:text-white">${label}</span>
                        <span class="text-gray-500 dark:text-gray-400">${value.toLocaleString()} ${unit}</span>
                    </div>
                    <div class="h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                        <div class="h-full rounded-full ${colour}" style="width:${pct}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderNutritionRecentLogs(rows = []) {
        if (!nutritionRecentLogs) return;
        nutritionRecentLogs.innerHTML = rows.length ? rows.map(row => `
            <div class="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <div class="font-semibold dark:text-white">${escapeHtml(formatWorkoutDate(row.date))}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${row.count ? `${Number(row.count)} ${Number(row.count) === 1 ? 'meal' : 'meals'} logged` : escapeHtml(row.notes || 'Daily total')}</div>
                </div>
                <div class="flex flex-wrap gap-2 text-xs">
                    <span class="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">${Number(row.calories || 0).toLocaleString()} kcal</span>
                    <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">P ${Number(row.protein || 0)}g</span>
                    <span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">F ${Number(row.fat || 0)}g</span>
                    <span class="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">C ${Number(row.carbs || 0)}g</span>
                </div>
            </div>
        `).join('') : '<div class="p-6 text-sm text-gray-500">No food entries logged yet.</div>';
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

    function renderHealthExerciseSelector(exercises = []) {
        currentHealthExercises = exercises.filter(e => e.shortcode !== 'DEADHANG' && (e.history || []).some(point => Number(point.weight || 0) > 0));
        if (!healthExerciseChartSelect) return;
        const previousSelection = healthExerciseChartSelect.value;
        healthExerciseChartSelect.innerHTML = currentHealthExercises.length
            ? currentHealthExercises.map(ex => `<option value="${escapeHtml(ex.shortcode)}">${escapeHtml(ex.shortcode)}</option>`).join('')
            : '<option value="">No weighted exercises</option>';
        const preferred = currentHealthExercises.find(ex => ex.shortcode === previousSelection)?.shortcode || currentHealthExercises[0]?.shortcode || '';
        healthExerciseChartSelect.value = preferred;
        renderHealthExerciseWeightChart(currentHealthExercises, preferred);
    }

    function renderHealthExerciseWeightChart(exercises = [], shortcode = '') {
        if (!healthExerciseWeightChart) return;
        const exercise = exercises.find(ex => ex.shortcode === shortcode);
        const history = (exercise?.history || []).filter(point => Number(point.weight || 0) > 0);
        if (!exercise || !history.length) {
            healthExerciseWeightChart.innerHTML = '<div class="text-sm text-gray-500">No weighted history for this exercise yet.</div>';
            return;
        }
        const weights = history.map(point => Number(point.weight || 0));
        const min = Math.min(...weights);
        const max = Math.max(...weights);
        const range = Math.max(1, max - min);
        const points = history.map((point, i) => {
            const x = history.length === 1 ? 50 : (i / (history.length - 1)) * 100;
            const y = 88 - (((Number(point.weight || 0) - min) / range) * 72);
            return `${x},${y}`;
        }).join(' ');
        const latest = history[history.length - 1];
        const first = history[0];
        const change = Number(latest.weight || 0) - Number(first.weight || 0);
        const previous = history.length > 1 ? history[history.length - 2] : null;
        const weeklyDirection = previous ? Number(latest.weight || 0) - Number(previous.weight || 0) : null;
        healthExerciseWeightChart.innerHTML = `
            <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
                <div>
                    <div class="text-2xl font-semibold dark:text-white">${escapeHtml(exercise.shortcode)} · ${Number(latest.weight || 0)}kg</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Latest top weight on ${escapeHtml(formatWorkoutDate(latest.date))}: ${Number(latest.reps || 0)} reps · ${escapeHtml(latest.logString || '')}</div>
                </div>
                <div class="flex gap-2 text-xs flex-wrap">
                    <span class="px-2.5 py-1 rounded-full ${change >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'}">${change >= 0 ? '+' : ''}${change}kg all-time</span>
                    <span class="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300">${weeklyDirection === null ? 'First log' : `${weeklyDirection >= 0 ? '+' : ''}${weeklyDirection}kg vs previous`}</span>
                </div>
            </div>
            <svg viewBox="0 0 100 100" class="w-full h-56 overflow-visible" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(exercise.shortcode)} weight trend">
                <line x1="0" x2="100" y1="88" y2="88" class="stroke-gray-200 dark:stroke-white/10" stroke-width="0.5"></line>
                <polyline points="${points}" fill="none" class="stroke-indigo-500" stroke-width="2.4" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"></polyline>
                ${history.map((point, i) => {
                    const x = history.length === 1 ? 50 : (i / (history.length - 1)) * 100;
                    const y = 88 - (((Number(point.weight || 0) - min) / range) * 72);
                    return `<circle cx="${x}" cy="${y}" r="1.7" class="fill-indigo-500"><title>${escapeHtml(formatWorkoutDate(point.date))}: ${Number(point.weight || 0)}kg x ${Number(point.reps || 0)}</title></circle>`;
                }).join('')}
            </svg>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs text-gray-500 dark:text-gray-400">
                ${history.slice(-4).map(point => `<div class="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#171717] p-3"><div class="font-medium text-gray-900 dark:text-white">${Number(point.weight || 0)}kg × ${Number(point.reps || 0)}</div><div>${escapeHtml(formatWorkoutDate(point.date))}</div><div class="mt-1 text-indigo-600 dark:text-indigo-300">${escapeHtml(point.workoutDay || '')}</div></div>`).join('')}
            </div>
        `;
    }

    function renderHealthExerciseProgress(exercises = []) {
        if (!healthExerciseProgress) return;
        const visible = exercises.filter(e => e.shortcode !== 'DEADHANG').slice(0, 10);
        healthExerciseProgress.innerHTML = visible.length ? visible.map(ex => {
            const latestTop = ex.latest?.parsed?.topSet;
            const previousTop = ex.previous?.parsed?.topSet;
            const latestLabel = latestTop ? `${latestTop.reps}×${latestTop.weight ? latestTop.weight + 'kg' : 'BW'}` : (ex.latest?.LogString || '-');
            const previousLabel = previousTop ? `${previousTop.reps}×${previousTop.weight ? previousTop.weight + 'kg' : 'BW'}` : (ex.previous?.LogString || 'First log');
            const weightChange = ex.topSetChangeKg;
            const positive = Number(weightChange || 0) >= 0;
            return `
                <div class="px-6 py-4 flex items-center justify-between gap-4">
                    <div class="min-w-0">
                        <div class="font-semibold dark:text-white">${escapeHtml(ex.shortcode)}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Latest ${escapeHtml(formatWorkoutDate(ex.latest?.Date))}: ${escapeHtml(latestLabel)} · Previous: ${escapeHtml(previousLabel)}</div>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="text-sm font-semibold ${positive ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-500'}">${weightChange === null || weightChange === undefined ? 'New' : `${positive ? '+' : ''}${Number(weightChange).toLocaleString()} kg`}</div>
                        <div class="text-xs text-gray-400">top weight</div>
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

    // === Property Deals Logic ===
    const refreshPropertyBtn = document.getElementById('refresh-property-btn');
    const propertyList = document.getElementById('property-list');
    const propertyTotal = document.getElementById('property-total');
    const propertyOutstanding = document.getElementById('property-outstanding');
    const propertyReviewed = document.getElementById('property-reviewed');
    const propertySearch = document.getElementById('property-search');
    const propertyStatusFilter = document.getElementById('property-status-filter');
    const propertyRoiFilter = document.getElementById('property-roi-filter');
    const propertySourceFilter = document.getElementById('property-source-filter');
    const propertySort = document.getElementById('property-sort');
    const propertyAnalysisModal = document.getElementById('property-analysis-modal');
    const propertyAnalysisModalTitle = document.getElementById('property-analysis-modal-title');
    const propertyAnalysisModalSubtitle = document.getElementById('property-analysis-modal-subtitle');
    const propertyAnalysisModalBody = document.getElementById('property-analysis-modal-body');
    const propertyAnalysisModalClose = document.getElementById('property-analysis-modal-close');
    let propertyDeals = [];

    function filteredPropertyDeals() {
        const search = (propertySearch?.value || '').toLowerCase().trim();
        const status = propertyStatusFilter?.value || 'active';
        const roiFilter = propertyRoiFilter?.value || 'all';
        const source = propertySourceFilter?.value || 'all';
        const sort = propertySort?.value || 'roi-desc';
        return propertyDeals.filter(deal => {
            const dealStatus = deal.deal_status || 'active';
            const haystack = `${deal.address || ''} ${deal.price || ''} ${deal.source || ''} ${deal.bedrooms || ''} ${(deal.tags || []).join(' ')}`.toLowerCase();
            const roi = Number(deal.analysis?.roi || 0);
            if (search && !haystack.includes(search)) return false;
            if (status === 'active' && dealStatus === 'not_interested') return false;
            if (status === 'good' && dealStatus !== 'good') return false;
            if (status === 'all' && dealStatus === 'not_interested') return false;
            if (status === 'not_interested' && dealStatus !== 'not_interested') return false;
            if (roiFilter === 'target' && roi < 20) return false;
            if (roiFilter === 'watchlist' && roi < 15) return false;
            if (roiFilter === 'below' && roi >= 15) return false;
            if (source !== 'all' && deal.source !== source) return false;
            return true;
        }).sort((a, b) => {
            const pinnedDelta = Number((b.deal_status || 'active') === 'good') - Number((a.deal_status || 'active') === 'good');
            if (pinnedDelta) return pinnedDelta;
            const roiA = typeof a.analysis?.roi === 'number' ? a.analysis.roi : -Infinity;
            const roiB = typeof b.analysis?.roi === 'number' ? b.analysis.roi : -Infinity;
            if (sort === 'roi-asc') return roiA - roiB || String(b.found || '').localeCompare(String(a.found || ''));
            if (sort === 'newest') return String(b.found || '').localeCompare(String(a.found || '')) || roiB - roiA;
            if (sort === 'price-asc') return propertyParseMoney(a.price) - propertyParseMoney(b.price) || roiB - roiA;
            return roiB - roiA || String(b.found || '').localeCompare(String(a.found || ''));
        });
    }

    function renderPropertySourceOptions() {
        if (!propertySourceFilter) return;
        const selected = propertySourceFilter.value || 'all';
        const sources = [...new Set(propertyDeals.map(deal => deal.source).filter(Boolean))].sort();
        propertySourceFilter.innerHTML = '<option value="all">All sources</option>' + sources.map(source => `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`).join('');
        propertySourceFilter.value = sources.includes(selected) ? selected : 'all';
    }

    function renderPropertyDeals() {
        if (!propertyList) return;
        const total = propertyDeals.length;
        const reviewed = propertyDeals.filter(deal => deal.deal_status === 'good').length;
        const outstanding = propertyDeals.filter(deal => (deal.deal_status || 'active') !== 'not_interested').length;
        if (propertyTotal) propertyTotal.innerText = total;
        if (propertyOutstanding) propertyOutstanding.innerText = outstanding;
        if (propertyReviewed) propertyReviewed.innerText = reviewed;

        const deals = filteredPropertyDeals();
        if (!deals.length) {
            propertyList.innerHTML = '<div class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-8 text-gray-500">No property leads match the current filters.</div>';
            return;
        }

        propertyList.innerHTML = deals.map(deal => {
            const dealStatus = deal.deal_status || 'active';
            const reviewedClass = dealStatus === 'not_interested' ? 'opacity-65' : '';
            const statusClass = dealStatus === 'good'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                : dealStatus === 'not_interested'
                    ? 'bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
            const statusLabel = dealStatus === 'good' ? '★ Good Find' : dealStatus === 'not_interested' ? 'Archived' : 'Active';
            const tagOptions = [['research', 'Research'], ['called', 'Called'], ['viewing_organised', 'Viewing Organised'], ['offer_made', 'Offer Made']];
            const activeTags = Array.isArray(deal.tags) ? deal.tags : [];
            const analysis = deal.analysis || {};
            const roi = typeof analysis.roi === 'number' ? analysis.roi : null;
            const cardCalculation = calculatePropertySheet(getPropertySheetInputs(deal));
            const maxPurchasePrice = cardCalculation.target_purchase_price;
            const askingPrice = cardCalculation.purchase_price;
            const askingWithinTarget = askingPrice > 0 && maxPurchasePrice > 0 && askingPrice <= maxPurchasePrice;
            const amountAboveTarget = Math.max(askingPrice - maxPurchasePrice, 0);
            const roiClass = roi === null
                ? 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'
                : roi >= 20
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                    : roi >= 15
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300';
            return `
                <article class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden hover:border-gray-300 dark:hover:border-white/20 transition-colors ${reviewedClass}">
                    <div class="p-5 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div class="flex items-start gap-4 min-w-0 flex-1">
                            <div class="min-w-0">
                                <div class="flex flex-wrap items-center gap-2 mb-2">
                                    <button type="button" onclick="openPropertyDealAnalysis('${escapeHtml(deal.id)}')" class="text-left text-lg font-semibold dark:text-white hover:text-blue-600 dark:hover:text-blue-300">${escapeHtml(deal.address || 'Address unknown')}</button>
                                    <span class="text-xs px-2.5 py-1 rounded-full ${statusClass}">${statusLabel}</span>
                                    <span class="text-xs px-2.5 py-1 rounded-full ${roiClass}">ROI ${roi === null ? '-' : `${roi}%`}</span>
                                    ${deal.market_history?.price_reduced ? '<span class="text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">Reduced</span>' : ''}
                                </div>
                                <div class="text-sm text-gray-600 dark:text-gray-300">${escapeHtml(deal.price || 'Price unknown')} · ${Number(deal.bedrooms || 0) || '-'} bed · ${escapeHtml(deal.source || 'Unknown agent')}${deal.agent_phone ? ` · <a href="tel:${escapeHtml(deal.agent_phone.replace(/\s+/g, ''))}" class="text-blue-600 dark:text-blue-300 hover:underline">${escapeHtml(deal.agent_phone)}</a>` : ''}</div>
                                <div class="mt-3 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 ${askingWithinTarget ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10' : 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10'}">
                                    <span class="text-xs font-semibold uppercase tracking-wide ${askingWithinTarget ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}">Max purchase price for ${propertyPct(cardCalculation.target_roi_pct)} ROI</span>
                                    <span class="text-lg font-bold text-gray-900 dark:text-white">${propertyMoneyPrecise(maxPurchasePrice)}</span>
                                    <span class="text-xs ${askingWithinTarget ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}">${askingWithinTarget ? 'Viable at asking price' : `${propertyMoneyPrecise(amountAboveTarget)} above max`}</span>
                                </div>
                                ${deal.market_history?.note ? `<div class="text-xs text-gray-500 dark:text-gray-400 mt-2">Market: ${escapeHtml(deal.market_history.note)}</div>` : ''}
                                ${analysis.room_rent_note ? `<div class="text-sm text-gray-500 dark:text-gray-400 mt-2">${escapeHtml(analysis.room_rent_note)}</div>` : ''}
                                ${analysis.rent_source ? `<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Rent basis: ${escapeHtml(analysis.rent_source)} · ${escapeHtml(analysis.tenant_type || 'professional assumed')}</div>` : ''}
                                <div class="flex flex-wrap gap-1.5 mt-3">${tagOptions.map(([tag, label]) => `<button type="button" onclick="togglePropertyDealTag('${escapeHtml(deal.id)}','${tag}')" class="text-xs px-2.5 py-1 rounded-full border ${activeTags.includes(tag) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-600 dark:border-white/20 dark:text-gray-300'}">${label}</button>`).join('')}</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">Found ${escapeHtml(deal.found || 'unknown')}</div>
                            </div>
                        </div>
                        <div class="flex flex-wrap lg:flex-col gap-2 lg:items-end">
                            <button type="button" onclick="updatePropertyDealWorkflow('${escapeHtml(deal.id)}','${dealStatus === 'good' ? 'active' : 'good'}')" class="text-xs px-3 py-1.5 rounded ${dealStatus === 'good' ? 'bg-emerald-600 text-white' : 'border border-emerald-500 text-emerald-700 dark:text-emerald-300'}">${dealStatus === 'good' ? 'Unpin Good Find' : '★ Good Find'}</button>
                            <button type="button" onclick="updatePropertyDealWorkflow('${escapeHtml(deal.id)}','${dealStatus === 'not_interested' ? 'active' : 'not_interested'}')" class="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 dark:border-white/20 dark:text-gray-300">${dealStatus === 'not_interested' ? 'Restore' : 'Not Interested'}</button>
                            ${deal.url ? `<a href="${escapeHtml(deal.url)}" target="_blank" rel="noopener" class="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors">Open listing</a>` : ''}
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    async function loadPropertyDeals(silent = false) {
        if (!propertyList) return;
        if (!silent) propertyList.innerHTML = '<div class="text-sm text-gray-500 dark:text-gray-400">Loading property leads...</div>';
        try {
            const res = await fetch('/api/property-deals');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Property deals request failed');
            propertyDeals = Array.isArray(data.deals) ? data.deals : [];
            renderPropertySourceOptions();
            renderPropertyDeals();
        } catch (e) {
            console.error(e);
            propertyList.innerHTML = '<div class="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg p-6 text-red-600 dark:text-red-300">Failed to load property leads.</div>';
        }
    }

    window.updatePropertyDealReviewed = async (id, reviewed) => {
        try {
            const res = await fetch(`/api/property-deals/${encodeURIComponent(id)}/reviewed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reviewed })
            });
            const data = await res.json();
            if (!res.ok || !data.deal) throw new Error(data.error || 'Status update failed');
            await loadPropertyDeals(true);
        } catch (e) {
            console.error(e);
            alert('Could not update property status.');
            await loadPropertyDeals(true);
        }
    };

    window.updatePropertyDealWorkflow = async (id, status) => {
        try {
            const res = await fetch(`/api/property-deals/${encodeURIComponent(id)}/workflow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (!res.ok || !data.deal) throw new Error(data.error || 'Workflow update failed');
            await loadPropertyDeals(true);
        } catch (e) {
            console.error(e);
            alert('Could not update property status.');
        }
    };

    window.togglePropertyDealTag = async (id, tag) => {
        const deal = propertyDeals.find(item => item.id === id);
        if (!deal) return;
        const tags = Array.isArray(deal.tags) ? [...deal.tags] : [];
        const nextTags = tags.includes(tag) ? tags.filter(item => item !== tag) : [...tags, tag];
        try {
            const res = await fetch(`/api/property-deals/${encodeURIComponent(id)}/workflow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tags: nextTags })
            });
            const data = await res.json();
            if (!res.ok || !data.deal) throw new Error(data.error || 'Tag update failed');
            await loadPropertyDeals(true);
        } catch (e) {
            console.error(e);
            alert('Could not update property tags.');
        }
    };

    function propertyMoney(value) {
        if (typeof value !== 'number') return '-';
        return `£${Math.round(value).toLocaleString()}`;
    }

    function propertyMoneyPrecise(value) {
        if (typeof value !== 'number' || Number.isNaN(value)) return '-';
        return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function propertyPct(value) {
        return typeof value === 'number' ? `${value}%` : '-';
    }

    function propertyParseMoney(value) {
        return Number(String(value || '').replace(/[^0-9.-]/g, '')) || 0;
    }

    function propertyRound(value, decimals = 2) {
        const n = Number(value);
        if (!Number.isFinite(n)) return 0;
        const factor = Math.pow(10, decimals);
        return Math.round(n * factor) / factor;
    }

    function propertyInputValue(deal, key, fallback) {
        const input = deal.investment_inputs || {};
        if (typeof input[key] === 'number') return input[key];
        return fallback;
    }

    function getPropertySheetInputs(deal) {
        const analysis = deal.analysis || {};
        const isStudent = analysis.tenant_type === 'student' || analysis.utilities_wifi_council_tax_included === true;
        const bedroomCount = Number(deal.bedrooms || analysis.bedrooms || 0);
        const achievableRent = propertyInputValue(deal, 'achievable_rent', analysis.monthly_rent || 0);
        const roomRate = propertyInputValue(deal, 'room_rate', analysis.room_rent || (bedroomCount ? achievableRent / bedroomCount : 0));
        return {
            purchase_price: propertyInputValue(deal, 'purchase_price', analysis.purchase_price || propertyParseMoney(deal.price)),
            room_rate: propertyRound(roomRate, 2),
            achievable_rent: propertyRound(achievableRent, 2),
            deposit_pct: propertyInputValue(deal, 'deposit_pct', 25),
            tax_legals_pct: propertyInputValue(deal, 'tax_legals_pct', 6),
            renovation: propertyInputValue(deal, 'renovation', 0),
            furnishing_dressing: propertyInputValue(deal, 'furnishing_dressing', 0),
            finders_fee: propertyInputValue(deal, 'finders_fee', 3000),
            mortgage_interest_pct: propertyInputValue(deal, 'mortgage_interest_pct', 5.5),
            management_fee_pct: propertyInputValue(deal, 'management_fee_pct', 12),
            maintenance_voids_pct: propertyInputValue(deal, 'maintenance_voids_pct', 5),
            target_roi_pct: propertyInputValue(deal, 'target_roi_pct', 20),
            opening_offer_discount_pct: propertyInputValue(deal, 'opening_offer_discount_pct', 10),
            utilities: propertyInputValue(deal, 'utilities', isStudent ? 200 : 0),
            wifi: propertyInputValue(deal, 'wifi', isStudent ? 30 : 0),
            council_tax: propertyInputValue(deal, 'council_tax', isStudent ? 190 : 0)
        };
    }

    function calculatePropertySheet(inputs) {
        const purchasePrice = Number(inputs.purchase_price || 0);
        const rent = Number(inputs.achievable_rent || 0);
        const deposit = purchasePrice * (Number(inputs.deposit_pct || 0) / 100);
        const mortgageAmount = Math.max(purchasePrice - deposit, 0);
        const taxLegals = purchasePrice * (Number(inputs.tax_legals_pct || 0) / 100);
        const renovation = Number(inputs.renovation || 0);
        const furnishing = Number(inputs.furnishing_dressing || 0);
        const findersFee = Number(inputs.finders_fee || 0);
        const totalMoneyIn = deposit + taxLegals + renovation + furnishing + findersFee;
        const mortgageMonthly = mortgageAmount * (Number(inputs.mortgage_interest_pct || 0) / 100) / 12;
        const managementFee = rent * (Number(inputs.management_fee_pct || 0) / 100);
        const maintenanceVoids = rent * (Number(inputs.maintenance_voids_pct || 0) / 100);
        const utilities = Number(inputs.utilities || 0);
        const wifi = Number(inputs.wifi || 0);
        const councilTax = Number(inputs.council_tax || 0);
        const operatingCosts = managementFee + maintenanceVoids + utilities + wifi + councilTax;
        const totalCosts = mortgageMonthly + operatingCosts;
        const monthlyCashflow = rent - totalCosts;
        const annualCashflow = monthlyCashflow * 12;
        const roi = totalMoneyIn > 0 ? (annualCashflow / totalMoneyIn) * 100 : 0;
        const grossYield = purchasePrice > 0 ? (rent * 12 / purchasePrice) * 100 : 0;
        const netYield = purchasePrice > 0 ? (annualCashflow / purchasePrice) * 100 : 0;
        const targetRoiRate = Number(inputs.target_roi_pct || 20) / 100;
        const openingOfferDiscountRate = Number(inputs.opening_offer_discount_pct || 0) / 100;
        const annualRentAfterOperatingCosts = (rent - operatingCosts) * 12;
        const depositRate = Number(inputs.deposit_pct || 0) / 100;
        const taxLegalsRate = Number(inputs.tax_legals_pct || 0) / 100;
        const annualMortgageRateOnPrice = Math.max(1 - depositRate, 0) * (Number(inputs.mortgage_interest_pct || 0) / 100);
        const fixedCashIn = renovation + furnishing + findersFee;
        const variableCashInRate = depositRate + taxLegalsRate;
        const targetPriceDenominator = (targetRoiRate * variableCashInRate) + annualMortgageRateOnPrice;
        const targetPurchasePrice = targetPriceDenominator > 0
            ? Math.max((annualRentAfterOperatingCosts - (targetRoiRate * fixedCashIn)) / targetPriceDenominator, 0)
            : 0;
        const meetsTargetAtAskingPrice = roi >= (targetRoiRate * 100);
        const openingOfferPrice = meetsTargetAtAskingPrice
            ? purchasePrice
            : targetPurchasePrice * Math.max(1 - openingOfferDiscountRate, 0);
        const targetPriceGap = Math.max(purchasePrice - targetPurchasePrice, 0);
        return {
            purchase_price: purchasePrice,
            monthly_rent: rent,
            deposit,
            mortgage_amount: mortgageAmount,
            tax_legals: taxLegals,
            renovation,
            furnishing_dressing: furnishing,
            finders_fee: findersFee,
            total_cash_in: totalMoneyIn,
            mortgage_monthly: mortgageMonthly,
            management_fee: managementFee,
            maintenance_voids: maintenanceVoids,
            utilities,
            wifi,
            council_tax: councilTax,
            operating_costs_monthly: operatingCosts,
            total_costs_monthly: totalCosts,
            net_cashflow_monthly: monthlyCashflow,
            annual_net_cashflow: annualCashflow,
            roi,
            gross_yield: grossYield,
            net_yield: netYield,
            target_roi_pct: Number(inputs.target_roi_pct || 20),
            target_purchase_price: targetPurchasePrice,
            opening_offer_discount_pct: Number(inputs.opening_offer_discount_pct || 0),
            opening_offer_price: openingOfferPrice,
            target_price_gap: targetPriceGap,
            meets_target_at_asking_price: meetsTargetAtAskingPrice
        };
    }

    function propertySheetInput(key, value, step = '1') {
        return `<input type="number" data-property-input="${key}" value="${Number(value || 0)}" step="${step}" class="w-full bg-yellow-200 text-black text-right px-2 py-1 border border-yellow-400 focus:outline-none focus:ring-2 focus:ring-blue-500">`;
    }

    function propertySheetRow(label, value, editableKey = null, step = '1') {
        const cell = editableKey ? propertySheetInput(editableKey, value, step) : `<span data-property-output="${editableKey || ''}">${propertyMoneyPrecise(value)}</span>`;
        return `<div class="property-sheet-label">${label}</div><div class="property-sheet-value">${cell}</div>`;
    }

    function propertySheetOutputRow(label, outputKey, value) {
        return `<div class="property-sheet-label">${label}</div><div class="property-sheet-value"><span data-property-output="${outputKey}">${propertyMoneyPrecise(value)}</span></div>`;
    }

    function renderPropertySheetOutputs(calculated) {
        if (!propertyAnalysisModalBody) return;
        const set = (key, value) => {
            propertyAnalysisModalBody.querySelectorAll(`[data-property-output="${key}"]`).forEach(el => {
                el.textContent = value;
            });
        };
        set('deposit', propertyMoneyPrecise(calculated.deposit));
        set('mortgage_amount', propertyMoneyPrecise(calculated.mortgage_amount));
        set('tax_legals', propertyMoneyPrecise(calculated.tax_legals));
        set('total_cash_in', propertyMoneyPrecise(calculated.total_cash_in));
        set('mortgage_monthly', propertyMoneyPrecise(calculated.mortgage_monthly));
        set('management_fee', propertyMoneyPrecise(calculated.management_fee));
        set('maintenance_voids', propertyMoneyPrecise(calculated.maintenance_voids));
        set('total_costs_monthly', propertyMoneyPrecise(calculated.total_costs_monthly));
        set('operating_costs_monthly', propertyMoneyPrecise(calculated.operating_costs_monthly));
        set('net_cashflow_monthly', propertyMoneyPrecise(calculated.net_cashflow_monthly));
        set('annual_net_cashflow', propertyMoneyPrecise(calculated.annual_net_cashflow));
        set('roi', `${propertyRound(calculated.roi, 2).toFixed(2)}%`);
        set('gross_yield', `${propertyRound(calculated.gross_yield, 2).toFixed(2)}%`);
        set('net_yield', `${propertyRound(calculated.net_yield, 2).toFixed(2)}%`);
        set('target_purchase_price', propertyMoneyPrecise(calculated.target_purchase_price));
        set('opening_offer_price', propertyMoneyPrecise(calculated.opening_offer_price));
        set('target_price_gap', propertyMoneyPrecise(calculated.target_price_gap));
    }

    function readPropertySheetInputs() {
        const inputs = {};
        propertyAnalysisModalBody?.querySelectorAll('[data-property-input]').forEach(input => {
            inputs[input.dataset.propertyInput] = Number(input.value || 0);
        });
        return inputs;
    }

    function setPropertyInputValue(key, value) {
        const input = propertyAnalysisModalBody?.querySelector(`[data-property-input="${key}"]`);
        if (input) input.value = propertyRound(value, 2);
    }

    function syncPropertyRentInputs(changedKey, bedroomCount) {
        if (!bedroomCount) return;
        const inputs = readPropertySheetInputs();
        if (changedKey === 'room_rate') {
            setPropertyInputValue('achievable_rent', Number(inputs.room_rate || 0) * bedroomCount);
        }
        if (changedKey === 'achievable_rent') {
            setPropertyInputValue('room_rate', Number(inputs.achievable_rent || 0) / bedroomCount);
        }
    }

    function recalculateOpenPropertySheet() {
        const calculated = calculatePropertySheet(readPropertySheetInputs());
        renderPropertySheetOutputs(calculated);
        return calculated;
    }

    function propertySheetAnalysisPayload(deal, inputs, calculated) {
        const previous = deal.analysis || {};
        const roi = propertyRound(calculated.roi, 1);
        return {
            investment_inputs: inputs,
            analysis: {
                ...previous,
                roi,
                verdict: roi >= 20 ? 'target' : roi >= 15 ? 'watchlist' : 'below target',
                target_gap_pct: roi >= 20 ? 0 : propertyRound(20 - roi, 1),
                purchase_price: propertyRound(calculated.purchase_price, 2),
                monthly_rent: propertyRound(calculated.monthly_rent, 2),
                annual_rent: propertyRound(calculated.monthly_rent * 12, 2),
                mortgage_monthly: propertyRound(calculated.mortgage_monthly, 2),
                operating_costs_monthly: propertyRound(calculated.operating_costs_monthly, 2),
                net_cashflow_monthly: propertyRound(calculated.net_cashflow_monthly, 2),
                annual_net_cashflow: propertyRound(calculated.annual_net_cashflow, 2),
                total_cash_in: propertyRound(calculated.total_cash_in, 2),
                gross_yield: propertyRound(calculated.gross_yield, 2),
                net_yield: propertyRound(calculated.net_yield, 2),
                target_roi_pct: propertyRound(inputs.target_roi_pct, 2),
                target_purchase_price: propertyRound(calculated.target_purchase_price, 2),
                opening_offer_discount_pct: propertyRound(inputs.opening_offer_discount_pct, 2),
                opening_offer_price: propertyRound(calculated.opening_offer_price, 2),
                target_price_gap: propertyRound(calculated.target_price_gap, 2),
                room_rent: propertyRound(inputs.room_rate, 2),
                room_rent_note: `${Number(deal.bedrooms || previous.bedrooms || 0) || '-'} rooms at £${propertyRound(inputs.room_rate, 2)}/room/month gives £${propertyRound(inputs.achievable_rent, 2)}/month achievable rent.`,
                deposit_pct: inputs.deposit_pct,
                tax_legals_pct: inputs.tax_legals_pct,
                mortgage_interest_pct: inputs.mortgage_interest_pct,
                management_fee_pct: inputs.management_fee_pct,
                maintenance_voids_pct: inputs.maintenance_voids_pct,
                assumptions: [
                    `${inputs.deposit_pct}% deposit / ${propertyRound(100 - inputs.deposit_pct, 1)}% LTV interest-only mortgage`,
                    `${inputs.tax_legals_pct}% tax and legals`,
                    `${inputs.mortgage_interest_pct}% mortgage interest`,
                    `${inputs.management_fee_pct}% management fee and ${inputs.maintenance_voids_pct}% maintenance/void allowance`,
                    `${inputs.utilities || inputs.wifi || inputs.council_tax ? 'Bills included in model' : 'Utilities, wifi and council tax excluded from model'}`
                ],
                updated_at: new Date().toISOString()
            }
        };
    }

    window.openPropertyDealAnalysis = (id) => {
        const deal = propertyDeals.find(item => item.id === id);
        if (!deal || !propertyAnalysisModal) return;
        const analysis = deal.analysis || {};
        const market = deal.market_history || {};
        const inputs = getPropertySheetInputs(deal);
        const calculated = calculatePropertySheet(inputs);
        const bedroomCount = Number(deal.bedrooms || analysis.bedrooms || 0);
        if (propertyAnalysisModalTitle) propertyAnalysisModalTitle.innerText = deal.address || 'Deal analysis';
        if (propertyAnalysisModalSubtitle) propertyAnalysisModalSubtitle.innerText = `${deal.price || 'Price unknown'} · ${Number(deal.bedrooms || 0) || '-'} bed · ${deal.source || 'Unknown agent'}${deal.agent_phone ? ` · ${deal.agent_phone}` : ''} · ROI ${propertyPct(analysis.roi)}`;
        if (propertyAnalysisModalBody) propertyAnalysisModalBody.innerHTML = `
            <div class="grid grid-cols-1 xl:grid-cols-[1fr_0.92fr] gap-6">
                <div class="property-sheet-grid">
                    <div class="property-sheet-title">Multi Let ROI</div>
                    <div></div>
                    ${propertySheetRow('Purchase Price', inputs.purchase_price, 'purchase_price')}
                    ${propertySheetOutputRow('Deposit', 'deposit', calculated.deposit)}
                    ${propertySheetOutputRow('Mortgage Amount', 'mortgage_amount', calculated.mortgage_amount)}
                    ${propertySheetRow(`Room Rate${bedroomCount ? ` x ${bedroomCount}` : ''}`, inputs.room_rate, 'room_rate')}
                    ${propertySheetRow('Achievable Rent', inputs.achievable_rent, 'achievable_rent')}
                    <div class="property-sheet-section">Money In Purchase</div>
                    <div></div>
                    <div class="property-sheet-label">Deposit <input type="number" data-property-input="deposit_pct" value="${Number(inputs.deposit_pct || 0)}" step="0.1" class="property-inline-input">%</div>
                    <div class="property-sheet-value"><span data-property-output="deposit">${propertyMoneyPrecise(calculated.deposit)}</span></div>
                    <div class="property-sheet-label">Tax and Legals <input type="number" data-property-input="tax_legals_pct" value="${Number(inputs.tax_legals_pct || 0)}" step="0.1" class="property-inline-input">%</div>
                    <div class="property-sheet-value"><span data-property-output="tax_legals">${propertyMoneyPrecise(calculated.tax_legals)}</span></div>
                    ${propertySheetRow('Renovation', inputs.renovation, 'renovation')}
                    ${propertySheetRow('Furnish and Dressing', inputs.furnishing_dressing, 'furnishing_dressing')}
                    ${propertySheetRow('Finders Fee', inputs.finders_fee, 'finders_fee')}
                    <div class="property-sheet-label">Total</div>
                    <div class="property-sheet-value"><span data-property-output="total_cash_in">${propertyMoneyPrecise(calculated.total_cash_in)}</span></div>
                    <div class="property-sheet-section">Return on Investment</div>
                    <div></div>
                    <div class="property-sheet-label">Monthly Cash flow</div>
                    <div class="property-sheet-value"><span data-property-output="net_cashflow_monthly">${propertyMoneyPrecise(calculated.net_cashflow_monthly)}</span></div>
                    <div class="property-sheet-label">Annual cash flow</div>
                    <div class="property-sheet-value"><span data-property-output="annual_net_cashflow">${propertyMoneyPrecise(calculated.annual_net_cashflow)}</span></div>
                    <div class="property-sheet-kpi">RETURN ON INVESTMENT</div>
                    <div class="property-sheet-kpi-value"><span data-property-output="roi">${propertyRound(calculated.roi, 2).toFixed(2)}%</span></div>
                    <div class="property-sheet-kpi">GROSS YIELD</div>
                    <div class="property-sheet-kpi-value"><span data-property-output="gross_yield">${propertyRound(calculated.gross_yield, 2).toFixed(2)}%</span></div>
                    <div class="property-sheet-kpi">NET YIELD</div>
                    <div class="property-sheet-kpi-value"><span data-property-output="net_yield">${propertyRound(calculated.net_yield, 2).toFixed(2)}%</span></div>
                    <div class="property-sheet-section">Offer Guidance</div>
                    <div></div>
                    <div class="property-sheet-label">Target ROI <input type="number" data-property-input="target_roi_pct" value="${Number(inputs.target_roi_pct || 20)}" step="0.1" class="property-inline-input">%</div>
                    <div class="property-sheet-value"><span data-property-output="target_purchase_price">${propertyMoneyPrecise(calculated.target_purchase_price)}</span> max purchase price</div>
                    <div class="property-sheet-label">Recommended offer <input type="number" data-property-input="opening_offer_discount_pct" value="${Number(inputs.opening_offer_discount_pct || 0)}" step="0.1" class="property-inline-input">% below target if negotiation is needed</div>
                    <div class="property-sheet-value"><span data-property-output="opening_offer_price">${propertyMoneyPrecise(calculated.opening_offer_price)}</span></div>
                    <div class="property-sheet-label">Reduction needed to hit target</div>
                    <div class="property-sheet-value"><span data-property-output="target_price_gap">${propertyMoneyPrecise(calculated.target_price_gap)}</span></div>
                </div>
                <div class="property-sheet-grid property-sheet-costs">
                    <div class="property-sheet-section">Monthly Costs</div>
                    <div></div>
                    <div class="property-sheet-label">Mortgage Payments <input type="number" data-property-input="mortgage_interest_pct" value="${Number(inputs.mortgage_interest_pct || 0)}" step="0.1" class="property-inline-input">%</div>
                    <div class="property-sheet-value"><span data-property-output="mortgage_monthly">${propertyMoneyPrecise(calculated.mortgage_monthly)}</span></div>
                    <div class="property-sheet-label">Management Fee <input type="number" data-property-input="management_fee_pct" value="${Number(inputs.management_fee_pct || 0)}" step="0.1" class="property-inline-input">%</div>
                    <div class="property-sheet-value"><span data-property-output="management_fee">${propertyMoneyPrecise(calculated.management_fee)}</span></div>
                    <div class="property-sheet-label">Maintenance and Voids <input type="number" data-property-input="maintenance_voids_pct" value="${Number(inputs.maintenance_voids_pct || 0)}" step="0.1" class="property-inline-input">%</div>
                    <div class="property-sheet-value"><span data-property-output="maintenance_voids">${propertyMoneyPrecise(calculated.maintenance_voids)}</span></div>
                    ${propertySheetRow('Utilities', inputs.utilities, 'utilities')}
                    ${propertySheetRow('Wifi', inputs.wifi, 'wifi')}
                    ${propertySheetRow('Council Tax', inputs.council_tax, 'council_tax')}
                    <div class="property-sheet-spacer"></div>
                    <div class="property-sheet-spacer"></div>
                    <div class="property-sheet-label">Total costs per month</div>
                    <div class="property-sheet-value"><span data-property-output="total_costs_monthly">${propertyMoneyPrecise(calculated.total_costs_monthly)}</span></div>
                    <div class="property-sheet-label">Operating costs</div>
                    <div class="property-sheet-value"><span data-property-output="operating_costs_monthly">${propertyMoneyPrecise(calculated.operating_costs_monthly)}</span></div>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-300">
                <div class="youtube-detail-card"><div class="youtube-detail-label">Market history</div><div class="youtube-detail-value">${escapeHtml(market.note || 'Unknown')}<br>Reduced: ${market.price_reduced ? 'Yes' : 'No / unknown'} · Days on market: ${typeof market.days_on_market === 'number' ? String(market.days_on_market) : 'Unknown'}</div></div>
                <div class="youtube-detail-card"><div class="youtube-detail-label">Rent basis</div><div class="youtube-detail-value">${escapeHtml(analysis.rent_source || '-')}<br>${escapeHtml(analysis.room_rent_note || '')}<br>${escapeHtml(analysis.tenant_type || 'professional assumed')}</div></div>
            </div>
            <div class="flex flex-wrap gap-2 items-center">
                ${deal.url ? `<a href="${escapeHtml(deal.url)}" target="_blank" rel="noopener" class="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">Open listing</a>` : ''}
                <button type="button" data-property-save="${escapeHtml(deal.id)}" class="text-sm px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-colors">Save numbers</button>
                <button onclick="updatePropertyDealWorkflow('${escapeHtml(deal.id)}', '${(deal.deal_status || 'active') === 'good' ? 'active' : 'good'}'); closePropertyAnalysisModal();" class="text-sm px-4 py-2 rounded-lg border border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors">${(deal.deal_status || 'active') === 'good' ? 'Unpin Good Find' : '★ Good Find'}</button>
                <span data-property-save-status class="text-xs text-gray-500 dark:text-gray-400"></span>
            </div>
        `;
        propertyAnalysisModalBody?.querySelectorAll('[data-property-input]').forEach(input => {
            input.addEventListener('input', () => {
                syncPropertyRentInputs(input.dataset.propertyInput, bedroomCount);
                recalculateOpenPropertySheet();
            });
        });
        propertyAnalysisModalBody?.querySelector('[data-property-save]')?.addEventListener('click', async () => {
            const saveStatus = propertyAnalysisModalBody.querySelector('[data-property-save-status]');
            const currentInputs = readPropertySheetInputs();
            const currentCalculated = calculatePropertySheet(currentInputs);
            const payload = propertySheetAnalysisPayload(deal, currentInputs, currentCalculated);
            try {
                if (saveStatus) saveStatus.textContent = 'Saving...';
                const res = await fetch(`/api/property-deals/${encodeURIComponent(deal.id)}/analysis`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (!res.ok || !data.deal) throw new Error(data.error || 'Save failed');
                const index = propertyDeals.findIndex(item => item.id === deal.id);
                if (index !== -1) propertyDeals[index] = data.deal;
                renderPropertyDeals();
                if (propertyAnalysisModalSubtitle) propertyAnalysisModalSubtitle.innerText = `${data.deal.price || 'Price unknown'} · ${Number(data.deal.bedrooms || 0) || '-'} bed · ${data.deal.source || 'Unknown source'} · ROI ${propertyPct(data.deal.analysis?.roi)}`;
                if (saveStatus) saveStatus.textContent = 'Saved';
            } catch (e) {
                console.error(e);
                if (saveStatus) saveStatus.textContent = 'Could not save';
            }
        });
        propertyAnalysisModal.classList.remove('hidden');
    };

    function closePropertyAnalysisModal() { propertyAnalysisModal?.classList.add('hidden'); }
    window.closePropertyAnalysisModal = closePropertyAnalysisModal;
    if (propertyAnalysisModalClose) propertyAnalysisModalClose.addEventListener('click', closePropertyAnalysisModal);
    if (propertyAnalysisModal) propertyAnalysisModal.addEventListener('click', e => { if (e.target === propertyAnalysisModal) closePropertyAnalysisModal(); });

    if (refreshPropertyBtn) refreshPropertyBtn.addEventListener('click', () => loadPropertyDeals());
    [propertySearch, propertyStatusFilter, propertyRoiFilter, propertySourceFilter, propertySort].forEach(el => el?.addEventListener('input', renderPropertyDeals));
    [propertyStatusFilter, propertyRoiFilter, propertySourceFilter, propertySort].forEach(el => el?.addEventListener('change', renderPropertyDeals));

    // === YTJobs Logic ===
    const refreshYtJobsBtn = document.getElementById('refresh-ytjobs-btn');
    const ytJobsList = document.getElementById('ytjobs-list');
    const ytJobsScanMeta = document.getElementById('ytjobs-scan-meta');
    const ytJobsTotal = document.getElementById('ytjobs-total');
    const ytJobsNew = document.getElementById('ytjobs-new');
    const ytJobsInterested = document.getElementById('ytjobs-interested');
    const ytJobsApplied = document.getElementById('ytjobs-applied');
    const ytJobsSearch = document.getElementById('ytjobs-search');
    const ytJobsRoleFilter = document.getElementById('ytjobs-role-filter');
    const ytJobsStatusFilter = document.getElementById('ytjobs-status-filter');
    const ytJobsSort = document.getElementById('ytjobs-sort');
    const ytJobsJobsTab = document.getElementById('ytjobs-jobs-tab');
    const ytJobsTalentTab = document.getElementById('ytjobs-talent-tab');
    const ytJobsJobsPanel = document.getElementById('ytjobs-jobs-panel');
    const ytJobsTalentPanel = document.getElementById('ytjobs-talent-panel');
    const ytJobsTalentList = document.getElementById('ytjobs-talent-list');
    const ytJobsTalentMeta = document.getElementById('ytjobs-talent-meta');
    const ytJobsTalentTotal = document.getElementById('ytjobs-talent-total');
    const ytJobsTalentUk = document.getElementById('ytjobs-talent-uk');
    const ytJobsTalentInterested = document.getElementById('ytjobs-talent-interested');
    const ytJobsTalentContacted = document.getElementById('ytjobs-talent-contacted');
    const ytJobsTalentSearch = document.getElementById('ytjobs-talent-search');
    const ytJobsTalentLocationFilter = document.getElementById('ytjobs-talent-location-filter');
    const ytJobsTalentStatusFilter = document.getElementById('ytjobs-talent-status-filter');
    const ytJobsTalentSort = document.getElementById('ytjobs-talent-sort');
    let ytJobs = [];
    let ytJobsMeta = {};
    let ytJobsTalents = [];
    let ytJobsTalentMetaData = {};
    let activeYtJobsTab = 'jobs';

    function ytJobStatusClass(status) {
        if (status === 'interested') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
        if (status === 'applied') return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
        if (status === 'not_interested') return 'bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-300';
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
    }

    function ytJobStatusLabel(status) {
        return ({
            new: 'New',
            interested: 'Interested',
            not_interested: 'Not Interested',
            applied: 'Applied'
        })[status] || 'New';
    }

    function ytJobsTalentStatusClass(status) {
        if (status === 'interested') return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
        if (status === 'contacted') return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300';
        if (status === 'replied') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
        if (status === 'feedback_booked') return 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300';
        if (status === 'not_fit') return 'bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-300';
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
    }

    function ytJobsTalentStatusLabel(status) {
        return ({
            new: 'New',
            interested: 'Interested',
            contacted: 'Contacted',
            replied: 'Replied',
            feedback_booked: 'Feedback Booked',
            not_fit: 'Not a Fit'
        })[status] || 'New';
    }

    function setYtJobsTab(tab) {
        activeYtJobsTab = tab;
        const jobsActive = tab === 'jobs';
        ytJobsJobsPanel?.classList.toggle('hidden', !jobsActive);
        ytJobsTalentPanel?.classList.toggle('hidden', jobsActive);
        ytJobsJobsTab?.classList.toggle('bg-white', jobsActive);
        ytJobsJobsTab?.classList.toggle('dark:bg-[#171717]', jobsActive);
        ytJobsJobsTab?.classList.toggle('shadow-sm', jobsActive);
        ytJobsJobsTab?.classList.toggle('dark:text-white', jobsActive);
        ytJobsJobsTab?.classList.toggle('text-gray-600', !jobsActive);
        ytJobsJobsTab?.classList.toggle('dark:text-gray-300', !jobsActive);
        ytJobsTalentTab?.classList.toggle('bg-white', !jobsActive);
        ytJobsTalentTab?.classList.toggle('dark:bg-[#171717]', !jobsActive);
        ytJobsTalentTab?.classList.toggle('shadow-sm', !jobsActive);
        ytJobsTalentTab?.classList.toggle('dark:text-white', !jobsActive);
        ytJobsTalentTab?.classList.toggle('text-gray-600', jobsActive);
        ytJobsTalentTab?.classList.toggle('dark:text-gray-300', jobsActive);
        if (!jobsActive && !ytJobsTalents.length) loadYtJobsTalents(true);
    }

    function filteredYtJobs() {
        const search = (ytJobsSearch?.value || '').toLowerCase().trim();
        const role = ytJobsRoleFilter?.value || 'all';
        const status = ytJobsStatusFilter?.value || 'active';
        const sort = ytJobsSort?.value || 'posted-desc';
        return ytJobs.filter(job => {
            const jobStatus = job.status || 'new';
            const haystack = `${job.title || ''} ${job.company || ''} ${job.role || ''} ${job.location || ''} ${job.styles || ''} ${job.categories || ''}`.toLowerCase();
            if (search && !haystack.includes(search)) return false;
            if (role !== 'all' && job.role !== role) return false;
            if (status === 'active' && jobStatus === 'not_interested') return false;
            if (status !== 'active' && status !== 'all' && jobStatus !== status) return false;
            return true;
        }).sort((a, b) => {
            const statusWeight = { interested: 0, new: 1, applied: 2, not_interested: 3 };
            const roleWeight = { 'Channel Manager': 0, Videographer: 1, 'Video Editor': 2 };
            const statusDelta = (statusWeight[a.status || 'new'] ?? 9) - (statusWeight[b.status || 'new'] ?? 9);
            if (sort === 'posted-asc') return String(a.posted_at || '').localeCompare(String(b.posted_at || '')) || statusDelta || String(a.company || '').localeCompare(String(b.company || ''));
            if (sort === 'company') return String(a.company || '').localeCompare(String(b.company || '')) || statusDelta || String(a.title || '').localeCompare(String(b.title || ''));
            if (sort === 'role') return (roleWeight[a.role] ?? 9) - (roleWeight[b.role] ?? 9) || String(b.posted_at || '').localeCompare(String(a.posted_at || '')) || statusDelta;
            return String(b.posted_at || '').localeCompare(String(a.posted_at || ''))
                || statusDelta
                || (roleWeight[a.role] ?? 9) - (roleWeight[b.role] ?? 9)
                || String(a.company || '').localeCompare(String(b.company || ''));
        });
    }

    function renderYtJobs() {
        if (!ytJobsList) return;
        if (ytJobsTotal) ytJobsTotal.innerText = ytJobs.length;
        if (ytJobsNew) ytJobsNew.innerText = ytJobs.filter(job => (job.status || 'new') === 'new').length;
        if (ytJobsInterested) ytJobsInterested.innerText = ytJobs.filter(job => job.status === 'interested').length;
        if (ytJobsApplied) ytJobsApplied.innerText = ytJobs.filter(job => job.status === 'applied').length;
        if (ytJobsScanMeta) {
            const scanned = ytJobsMeta.searched_at ? new Date(ytJobsMeta.searched_at).toLocaleString() : 'Not scanned yet';
            ytJobsScanMeta.innerText = `Last prompted scan: ${scanned} · ${ytJobs.length} matched from ${Number(ytJobsMeta.source_total_jobs || 0).toLocaleString()} current YTJobs listings.`;
        }

        const jobs = filteredYtJobs();
        if (!jobs.length) {
            ytJobsList.innerHTML = '<div class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-8 text-gray-500">No YTJobs match the current filters.</div>';
            return;
        }
        ytJobsList.innerHTML = jobs.map(job => {
            const status = job.status || 'new';
            const ytJobUrl = job.ytjobs_id ? `https://ytjobs.co/job/${encodeURIComponent(job.ytjobs_id)}` : job.url;
            return `
                <article class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden hover:border-gray-300 dark:hover:border-white/20 transition-colors ${status === 'not_interested' ? 'opacity-65' : ''}">
                    <div class="p-5 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-center gap-2 mb-2">
                                <h3 class="text-lg font-semibold dark:text-white">${escapeHtml(job.title || 'Untitled role')}</h3>
                                <span class="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">${escapeHtml(job.role || 'YouTube')}</span>
                                <span class="text-xs px-2.5 py-1 rounded-full ${ytJobStatusClass(status)}">${ytJobStatusLabel(status)}</span>
                                ${job.easy_apply ? '<span class="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">Easy Apply</span>' : ''}
                            </div>
                            <div class="text-sm text-gray-600 dark:text-gray-300">${escapeHtml(job.company || 'Unknown channel')} · ${escapeHtml(job.location || job.location_type || 'Location unknown')}</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">${job.posted_at ? `Posted ${escapeHtml(job.posted_at)}` : 'Posted date unavailable'}${job.subscribers ? ` · ${escapeHtml(job.subscribers)} subscribers` : ' · Subscriber count unknown'}${job.views ? ` · ${escapeHtml(job.views)} views` : ''}${job.salary ? ` · ${escapeHtml(job.salary)}` : ''}</div>
                            ${(job.styles || job.categories) ? `<div class="text-sm text-gray-500 dark:text-gray-400 mt-3">${escapeHtml([job.styles, job.categories].filter(Boolean).join(' · '))}</div>` : ''}
                            ${job.notes ? `<div class="text-xs text-gray-500 dark:text-gray-400 mt-2">${escapeHtml(job.notes)}</div>` : ''}
                        </div>
                        <div class="flex flex-wrap lg:flex-col gap-2 lg:items-end">
                            <button type="button" onclick="updateYtJobStatus('${escapeHtml(job.id)}','interested')" class="text-xs px-3 py-1.5 rounded ${status === 'interested' ? 'bg-emerald-600 text-white' : 'border border-emerald-500 text-emerald-700 dark:text-emerald-300'}">Interested</button>
                            <button type="button" onclick="updateYtJobStatus('${escapeHtml(job.id)}','not_interested')" class="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 dark:border-white/20 dark:text-gray-300">${status === 'not_interested' ? 'Restore Later' : 'Not Interested'}</button>
                            <button type="button" onclick="updateYtJobStatus('${escapeHtml(job.id)}','applied')" class="text-xs px-3 py-1.5 rounded border border-blue-500 text-blue-700 dark:text-blue-300">Applied</button>
                            ${ytJobUrl ? `<a href="${escapeHtml(ytJobUrl)}" target="_blank" rel="noopener" class="text-xs px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors">Open YTJobs</a>` : ''}
                            ${job.company_youtube ? `<a href="${escapeHtml(job.company_youtube)}" target="_blank" rel="noopener" class="text-xs px-3 py-1.5 rounded border border-gray-200 dark:border-white/10 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">Open Channel</a>` : ''}
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    function filteredYtJobsTalents() {
        const search = (ytJobsTalentSearch?.value || '').toLowerCase().trim();
        const location = ytJobsTalentLocationFilter?.value || 'all';
        const status = ytJobsTalentStatusFilter?.value || 'active';
        const sort = ytJobsTalentSort?.value || 'location-score';
        const locationWeight = { Wales: 0, UK: 1, Global: 2 };
        const statusWeight = { interested: 0, new: 1, contacted: 2, replied: 3, feedback_booked: 4, not_fit: 5 };
        return ytJobsTalents.filter(talent => {
            const talentStatus = talent.status || 'new';
            const haystack = `${talent.name || ''} ${talent.title || ''} ${talent.group || ''} ${talent.profileTextLocation || ''} ${talent.styles || ''} ${talent.about || ''} ${(talent.sampleVideos || []).map(video => video.title || '').join(' ')}`.toLowerCase();
            if (search && !haystack.includes(search)) return false;
            if (location !== 'all' && talent.group !== location) return false;
            if (status === 'active' && talentStatus === 'not_fit') return false;
            if (status !== 'active' && status !== 'all' && talentStatus !== status) return false;
            return true;
        }).sort((a, b) => {
            const statusDelta = (statusWeight[a.status || 'new'] ?? 9) - (statusWeight[b.status || 'new'] ?? 9);
            if (sort === 'score') return Number(b.score || 0) - Number(a.score || 0) || statusDelta;
            if (sort === 'reviews') return Number(b.reviews || 0) - Number(a.reviews || 0) || Number(b.score || 0) - Number(a.score || 0);
            if (sort === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
            return (locationWeight[a.group] ?? 9) - (locationWeight[b.group] ?? 9)
                || Number(b.score || 0) - Number(a.score || 0)
                || statusDelta;
        });
    }

    function renderYtJobsTalents() {
        if (!ytJobsTalentList) return;
        if (ytJobsTalentTotal) ytJobsTalentTotal.innerText = ytJobsTalents.length;
        if (ytJobsTalentUk) ytJobsTalentUk.innerText = ytJobsTalents.filter(talent => talent.group === 'Wales' || talent.group === 'UK').length;
        if (ytJobsTalentInterested) ytJobsTalentInterested.innerText = ytJobsTalents.filter(talent => talent.status === 'interested').length;
        if (ytJobsTalentContacted) ytJobsTalentContacted.innerText = ytJobsTalents.filter(talent => ['contacted', 'replied', 'feedback_booked'].includes(talent.status)).length;
        if (ytJobsTalentMeta) {
            const scanned = ytJobsTalentMetaData.generated_at ? new Date(ytJobsTalentMetaData.generated_at).toLocaleString() : 'Not scanned yet';
            ytJobsTalentMeta.innerText = `Talent scan: ${scanned} · ${Number(ytJobsTalentMetaData.scanned_ranked_profiles || 0).toLocaleString()} ranked profiles scanned · ${Number(ytJobsTalentMetaData.total_candidates || 0).toLocaleString()} talking-head candidates found.`;
        }

        const talents = filteredYtJobsTalents();
        if (!talents.length) {
            ytJobsTalentList.innerHTML = '<div class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-8 text-gray-500">No talent matches the current filters.</div>';
            return;
        }
        ytJobsTalentList.innerHTML = talents.map(talent => {
            const status = talent.status || 'new';
            const videos = (talent.sampleVideos || []).slice(0, 2).map(video => {
                const title = escapeHtml(video.title || 'Sample video');
                const views = video.views ? ` · ${escapeHtml(video.views)} views` : '';
                return `<a href="${escapeHtml(video.url || '#')}" target="_blank" rel="noopener" class="block text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-300">${title}${views}</a>`;
            }).join('');
            return `
                <article class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden hover:border-gray-300 dark:hover:border-white/20 transition-colors ${status === 'not_fit' ? 'opacity-65' : ''}">
                    <div class="p-5 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-center gap-2 mb-2">
                                <h3 class="text-lg font-semibold dark:text-white">${escapeHtml(talent.name || 'Unnamed editor')}</h3>
                                <span class="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">${escapeHtml(talent.group || 'Global')}</span>
                                <span class="text-xs px-2.5 py-1 rounded-full ${ytJobsTalentStatusClass(status)}">${ytJobsTalentStatusLabel(status)}</span>
                                ${talent.badge ? `<span class="text-xs px-2.5 py-1 rounded-full bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300">${escapeHtml(talent.badge)}</span>` : ''}
                            </div>
                            <div class="text-sm text-gray-600 dark:text-gray-300">${escapeHtml(String(talent.title || 'Video Editor').replaceAll(';*;*;', ', '))}</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">Score ${Number(talent.score || 0)}${Number.isFinite(Number(talent.reviews)) ? ` · ${Number(talent.reviews)} reviews` : ''}${talent.talkingHead ? ' · Talking head' : talent.adjacentTalkingHead ? ' · Adjacent talking-head fit' : ''}</div>
                            ${talent.styles ? `<div class="text-sm text-gray-500 dark:text-gray-400 mt-3">${escapeHtml(talent.styles)}</div>` : ''}
                            ${talent.about ? `<p class="text-sm text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">${escapeHtml(talent.about)}</p>` : ''}
                            ${videos ? `<div class="mt-3 space-y-1">${videos}</div>` : ''}
                        </div>
                        <div class="flex flex-wrap lg:flex-col gap-2 lg:items-end">
                            <button type="button" onclick="updateYtJobsTalentStatus('${escapeHtml(talent.id)}','interested')" class="text-xs px-3 py-1.5 rounded ${status === 'interested' ? 'bg-blue-600 text-white' : 'border border-blue-500 text-blue-700 dark:text-blue-300'}">Interested</button>
                            <button type="button" onclick="updateYtJobsTalentStatus('${escapeHtml(talent.id)}','contacted')" class="text-xs px-3 py-1.5 rounded border border-purple-500 text-purple-700 dark:text-purple-300">Contacted</button>
                            <button type="button" onclick="updateYtJobsTalentStatus('${escapeHtml(talent.id)}','replied')" class="text-xs px-3 py-1.5 rounded border border-emerald-500 text-emerald-700 dark:text-emerald-300">Replied</button>
                            <button type="button" onclick="updateYtJobsTalentStatus('${escapeHtml(talent.id)}','feedback_booked')" class="text-xs px-3 py-1.5 rounded border border-teal-500 text-teal-700 dark:text-teal-300">Feedback Booked</button>
                            <button type="button" onclick="updateYtJobsTalentStatus('${escapeHtml(talent.id)}','not_fit')" class="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 dark:border-white/20 dark:text-gray-300">${status === 'not_fit' ? 'Restore Later' : 'Not a Fit'}</button>
                            ${(talent.profileUrl || talent.url) ? `<a href="${escapeHtml(talent.profileUrl || talent.url)}" target="_blank" rel="noopener" class="text-xs px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors">Open Profile</a>` : ''}
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    async function loadYtJobs(silent = false) {
        if (!ytJobsList) return;
        if (!silent) ytJobsList.innerHTML = '<div class="text-sm text-gray-500 dark:text-gray-400">Loading YTJobs...</div>';
        try {
            const res = await fetch('/api/ytjobs');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'YTJobs request failed');
            ytJobs = Array.isArray(data.jobs) ? data.jobs : [];
            ytJobsMeta = data || {};
            renderYtJobs();
        } catch (e) {
            console.error(e);
            ytJobsList.innerHTML = '<div class="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg p-6 text-red-600 dark:text-red-300">Failed to load YTJobs.</div>';
        }
    }

    async function loadYtJobsTalents(silent = false) {
        if (!ytJobsTalentList) return;
        if (!silent) ytJobsTalentList.innerHTML = '<div class="text-sm text-gray-500 dark:text-gray-400">Loading YTJobs talent...</div>';
        try {
            const res = await fetch('/api/ytjobs-talents');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'YTJobs talent request failed');
            ytJobsTalents = Array.isArray(data.talents) ? data.talents : [];
            ytJobsTalentMetaData = data || {};
            renderYtJobsTalents();
        } catch (e) {
            console.error(e);
            ytJobsTalentList.innerHTML = '<div class="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg p-6 text-red-600 dark:text-red-300">Failed to load YTJobs talent.</div>';
        }
    }

    window.updateYtJobStatus = async (id, status) => {
        const nextStatus = status === 'not_interested' && ytJobs.find(job => job.id === id)?.status === 'not_interested' ? 'new' : status;
        try {
            const res = await fetch(`/api/ytjobs/${encodeURIComponent(id)}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus })
            });
            const data = await res.json();
            if (!res.ok || !data.job) throw new Error(data.error || 'Status update failed');
            const index = ytJobs.findIndex(job => job.id === id);
            if (index !== -1) ytJobs[index] = data.job;
            renderYtJobs();
        } catch (e) {
            console.error(e);
            alert('Could not update YTJobs status.');
        }
    };

    window.updateYtJobsTalentStatus = async (id, status) => {
        const current = ytJobsTalents.find(talent => talent.id === id);
        const nextStatus = status === 'not_fit' && current?.status === 'not_fit' ? 'new' : status;
        try {
            const res = await fetch(`/api/ytjobs-talents/${encodeURIComponent(id)}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus })
            });
            const data = await res.json();
            if (!res.ok || !data.talent) throw new Error(data.error || 'Status update failed');
            const index = ytJobsTalents.findIndex(talent => talent.id === id);
            if (index !== -1) ytJobsTalents[index] = data.talent;
            renderYtJobsTalents();
        } catch (e) {
            console.error(e);
            alert('Could not update YTJobs talent status.');
        }
    };

    if (refreshYtJobsBtn) refreshYtJobsBtn.addEventListener('click', () => activeYtJobsTab === 'talent' ? loadYtJobsTalents() : loadYtJobs());
    if (ytJobsJobsTab) ytJobsJobsTab.addEventListener('click', () => setYtJobsTab('jobs'));
    if (ytJobsTalentTab) ytJobsTalentTab.addEventListener('click', () => setYtJobsTab('talent'));
    [ytJobsSearch, ytJobsRoleFilter, ytJobsStatusFilter, ytJobsSort].forEach(el => el?.addEventListener('input', renderYtJobs));
    [ytJobsRoleFilter, ytJobsStatusFilter, ytJobsSort].forEach(el => el?.addEventListener('change', renderYtJobs));
    [ytJobsTalentSearch, ytJobsTalentLocationFilter, ytJobsTalentStatusFilter, ytJobsTalentSort].forEach(el => el?.addEventListener('input', renderYtJobsTalents));
    [ytJobsTalentLocationFilter, ytJobsTalentStatusFilter, ytJobsTalentSort].forEach(el => el?.addEventListener('change', renderYtJobsTalents));

    // === LinkedIn Jobs Logic ===
    const refreshLinkedInJobsBtn = document.getElementById('refresh-linkedin-jobs-btn');
    const checkAgentMailJobsBtn = document.getElementById('check-agentmail-jobs-btn');
    const linkedInJobsList = document.getElementById('linkedin-jobs-list');
    const linkedInJobsTotal = document.getElementById('linkedin-jobs-total');
    const linkedInJobsNew = document.getElementById('linkedin-jobs-new');
    const linkedInJobsAvgScore = document.getElementById('linkedin-jobs-avg-score');
    const linkedInJobsTopMatches = document.getElementById('linkedin-jobs-top-matches');
    const linkedInJobsSearch = document.getElementById('linkedin-jobs-search');
    const linkedInJobsStatusFilter = document.getElementById('linkedin-jobs-status-filter');
    const linkedInJobsScoreFilter = document.getElementById('linkedin-jobs-score-filter');
    const linkedInJobsLocationFilter = document.getElementById('linkedin-jobs-location-filter');
    const linkedInJobModal = document.getElementById('linkedin-job-modal');
    const linkedInJobModalTitle = document.getElementById('linkedin-job-modal-title');
    const linkedInJobModalSubtitle = document.getElementById('linkedin-job-modal-subtitle');
    const linkedInJobModalBody = document.getElementById('linkedin-job-modal-body');
    const linkedInJobModalClose = document.getElementById('linkedin-job-modal-close');
    let linkedInJobs = [];

    function linkedInJobScoreClass(score) {
        const n = Number(score || 0);
        if (n >= 75) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
        if (n >= 60) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
        return 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300';
    }

    function linkedInJobActionClass(action) {
        if (action === 'apply') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
        if (action === 'save') return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
        return 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300';
    }

    function filteredLinkedInJobs() {
        const search = (linkedInJobsSearch?.value || '').toLowerCase().trim();
        const status = linkedInJobsStatusFilter?.value || 'all';
        const scoreFilter = linkedInJobsScoreFilter?.value || 'all';
        const location = (linkedInJobsLocationFilter?.value || '').toLowerCase().trim();
        return linkedInJobs.filter(job => {
            const haystack = `${job.title || ''} ${job.company || ''}`.toLowerCase();
            const loc = `${job.location || ''} ${job.workplace_type || ''}`.toLowerCase();
            const score = Number(job.ai_score || 0);
            if (search && !haystack.includes(search)) return false;
            if (status !== 'all' && job.status !== status) return false;
            if (location && !loc.includes(location)) return false;
            if (scoreFilter === '75' && score < 75) return false;
            if (scoreFilter === '60' && score < 60) return false;
            if (scoreFilter === '0' && score >= 60) return false;
            return true;
        });
    }

    function renderLinkedInJobs() {
        if (!linkedInJobsList) return;
        const total = linkedInJobs.length;
        const newCount = linkedInJobs.filter(j => j.status === 'new').length;
        const avgScore = total ? Math.round(linkedInJobs.reduce((sum, j) => sum + Number(j.ai_score || 0), 0) / total) : 0;
        const topMatches = linkedInJobs.filter(j => Number(j.ai_score || 0) >= 75).length;
        if (linkedInJobsTotal) linkedInJobsTotal.innerText = total;
        if (linkedInJobsNew) linkedInJobsNew.innerText = newCount;
        if (linkedInJobsAvgScore) linkedInJobsAvgScore.innerText = avgScore;
        if (linkedInJobsTopMatches) linkedInJobsTopMatches.innerText = topMatches;

        const jobs = filteredLinkedInJobs().sort((a, b) => Number(b.ai_score || 0) - Number(a.ai_score || 0) || String(b.created_at || '').localeCompare(String(a.created_at || '')));
        if (!jobs.length) {
            linkedInJobsList.innerHTML = '<div class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-8 text-gray-500">No LinkedIn jobs match the current filters yet.</div>';
            return;
        }
        linkedInJobsList.innerHTML = jobs.map(job => `
            <article class="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden hover:border-gray-300 dark:hover:border-white/20 transition-colors">
                <div class="p-5 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <button class="text-left min-w-0 flex-1" onclick="openLinkedInJobDetail('${escapeHtml(job.id)}')">
                        <div class="flex flex-wrap items-center gap-2 mb-2">
                            <h3 class="text-lg font-semibold dark:text-white hover:text-blue-600 dark:hover:text-blue-300">${escapeHtml(job.title || 'Untitled role')}</h3>
                            <span class="text-xs px-2.5 py-1 rounded-full ${linkedInJobScoreClass(job.ai_score)}">${Number(job.ai_score || 0)}/100</span>
                            <span class="text-xs px-2.5 py-1 rounded-full ${linkedInJobActionClass(job.suggested_action)}">${escapeHtml(job.suggested_action || 'review')}</span>
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-300">${escapeHtml(job.company || 'Unknown company')} · ${escapeHtml(job.location || 'Location unknown')} ${job.workplace_type ? `· ${escapeHtml(job.workplace_type)}` : ''}</div>
                        ${job.salary ? `<div class="text-sm text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(job.salary)}</div>` : ''}
                        <p class="text-sm text-gray-500 dark:text-gray-400 mt-3 line-clamp-2">${escapeHtml(job.ai_summary || job.description || 'No summary yet.')}</p>
                    </button>
                    <div class="flex flex-wrap lg:flex-col gap-2 lg:items-end">
                        <select onchange="updateLinkedInJobStatus('${escapeHtml(job.id)}', this.value)" class="text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#171717] dark:text-gray-300 px-2 py-1.5 focus:outline-none">
                            ${['new','saved','applied','interview','rejected','ignored'].map(status => `<option value="${status}" ${job.status === status ? 'selected' : ''}>${status}</option>`).join('')}
                        </select>
                        ${job.linkedin_url ? `<a href="${escapeHtml(job.linkedin_url)}" target="_blank" rel="noopener" class="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors">Open LinkedIn</a>` : ''}
                        <button onclick="generateLinkedInCoverLetter('${escapeHtml(job.id)}')" class="text-xs px-3 py-1.5 rounded border border-gray-200 dark:border-white/10 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">${job.cover_letter ? 'Regenerate letter' : 'Generate cover letter'}</button>
                    </div>
                </div>
            </article>
        `).join('');
    }

    async function loadLinkedInJobs(silent = false) {
        if (!linkedInJobsList) return;
        if (!silent) linkedInJobsList.innerHTML = '<div class="text-sm text-gray-500 dark:text-gray-400">Loading LinkedIn jobs...</div>';
        try {
            const res = await fetch('/api/linkedin-jobs');
            const data = await res.json();
            linkedInJobs = Array.isArray(data.jobs) ? data.jobs : [];
            renderLinkedInJobs();
        } catch (e) {
            console.error(e);
            linkedInJobsList.innerHTML = '<div class="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg p-6 text-red-600 dark:text-red-300">Failed to load LinkedIn jobs.</div>';
        }
    }

    async function checkAgentMailLinkedInJobs() {
        if (!checkAgentMailJobsBtn) return;
        const previousText = checkAgentMailJobsBtn.innerText;
        checkAgentMailJobsBtn.disabled = true;
        checkAgentMailJobsBtn.innerText = 'Checking inbox...';
        try {
            const res = await fetch('/api/linkedin-jobs/check-agentmail', { method: 'POST' });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'AgentMail check failed');
            await loadLinkedInJobs(true);
            const summary = `AgentMail checked: ${data.checked || 0} new email(s), ${data.inserted || 0} job(s) added, ${data.updated || 0} updated.`;
            checkAgentMailJobsBtn.innerText = 'Inbox checked';
            setTimeout(() => { if (checkAgentMailJobsBtn) checkAgentMailJobsBtn.innerText = previousText; }, 2500);
            console.info(summary, data);
        } catch (e) {
            console.error(e);
            alert(`Could not check AgentMail inbox: ${e.message}`);
            checkAgentMailJobsBtn.innerText = previousText;
        } finally {
            checkAgentMailJobsBtn.disabled = false;
        }
    }

    window.updateLinkedInJobStatus = async (id, status) => {
        try {
            const res = await fetch(`/api/linkedin-jobs/${encodeURIComponent(id)}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
            if (!res.ok) throw new Error('Status update failed');
            await loadLinkedInJobs(true);
        } catch (e) { console.error(e); alert('Could not update job status.'); }
    };

    window.generateLinkedInCoverLetter = async (id) => {
        const btns = [...document.querySelectorAll('button')].filter(btn => btn.getAttribute('onclick')?.includes(`generateLinkedInCoverLetter('${id}')`));
        btns.forEach(btn => { btn.disabled = true; btn.innerText = 'Generating...'; });
        try {
            const res = await fetch(`/api/linkedin-jobs/${encodeURIComponent(id)}/cover-letter`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok || !data.job) throw new Error(data.error || 'Generation failed');
            await loadLinkedInJobs(true);
            openLinkedInJobDetail(id);
        } catch (e) { console.error(e); alert(`Could not generate cover letter: ${e.message}`); }
        finally { btns.forEach(btn => { btn.disabled = false; }); }
    };

    window.saveLinkedInJobDescription = async (id) => {
        const textarea = document.getElementById(`linkedin-job-description-${id}`);
        const job_description = textarea?.value || '';
        try {
            const res = await fetch(`/api/linkedin-jobs/${encodeURIComponent(id)}/job-description`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ job_description })
            });
            const data = await res.json();
            if (!res.ok || !data.job) throw new Error(data.error || 'Save failed');
            await loadLinkedInJobs(true);
            openLinkedInJobDetail(id);
        } catch (e) { console.error(e); alert(`Could not save job description: ${e.message}`); }
    };

    window.createLinkedInCoverLetterDoc = async (id) => {
        const btns = [...document.querySelectorAll('button')].filter(btn => btn.getAttribute('onclick')?.includes(`createLinkedInCoverLetterDoc('${id}')`));
        btns.forEach(btn => { btn.disabled = true; btn.innerText = 'Creating Doc...'; });
        try {
            const res = await fetch(`/api/linkedin-jobs/${encodeURIComponent(id)}/cover-letter-doc`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok || !data.job) throw new Error(data.error || 'Google Doc creation failed');
            await loadLinkedInJobs(true);
            if (data.job.google_doc_url) window.open(data.job.google_doc_url, '_blank', 'noopener');
            openLinkedInJobDetail(id);
        } catch (e) { console.error(e); alert(`Could not create Google Doc: ${e.message}`); }
        finally { btns.forEach(btn => { btn.disabled = false; }); }
    };

    window.copyLinkedInCoverLetter = async (id) => {
        const job = linkedInJobs.find(j => j.id === id);
        if (!job?.cover_letter) return;
        await navigator.clipboard.writeText(job.cover_letter);
    };

    window.openLinkedInJobDetail = (id) => {
        const job = linkedInJobs.find(j => j.id === id);
        if (!job || !linkedInJobModal) return;
        if (linkedInJobModalTitle) linkedInJobModalTitle.innerText = job.title || 'Job details';
        if (linkedInJobModalSubtitle) linkedInJobModalSubtitle.innerText = `${job.company || 'Unknown company'} · ${job.location || 'Location unknown'} ${job.workplace_type ? `· ${job.workplace_type}` : ''}`;
        if (linkedInJobModalBody) linkedInJobModalBody.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div class="youtube-detail-card"><div class="youtube-detail-label">AI Score</div><div class="youtube-detail-value"><span class="text-xs px-2.5 py-1 rounded-full ${linkedInJobScoreClass(job.ai_score)}">${Number(job.ai_score || 0)}/100</span></div></div>
                <div class="youtube-detail-card"><div class="youtube-detail-label">Suggested Action</div><div class="youtube-detail-value">${escapeHtml(job.suggested_action || '-')}</div></div>
                <div class="youtube-detail-card"><div class="youtube-detail-label">Status</div><div class="youtube-detail-value">${escapeHtml(job.status || 'new')}</div></div>
            </div>
            <div class="youtube-detail-card"><div class="youtube-detail-label">AI Summary</div><div class="youtube-detail-value">${escapeHtml(job.ai_summary || '-')}</div></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="youtube-detail-card"><div class="youtube-detail-label">Pros</div><div class="youtube-detail-value"><ul class="list-disc pl-5">${(job.ai_pros || []).map(p => `<li>${escapeHtml(p)}</li>`).join('') || '<li>-</li>'}</ul></div></div>
                <div class="youtube-detail-card"><div class="youtube-detail-label">Concerns</div><div class="youtube-detail-value"><ul class="list-disc pl-5">${(job.ai_concerns || []).map(c => `<li>${escapeHtml(c)}</li>`).join('') || '<li>-</li>'}</ul></div></div>
            </div>
            <div class="youtube-detail-card"><div class="youtube-detail-label">Parsed Job Info</div><div class="youtube-detail-value whitespace-pre-wrap">${escapeHtml(job.description || '-')}</div></div>
            <div class="youtube-detail-card">
                <div class="youtube-detail-label">Pasted Job Description</div>
                <div class="youtube-detail-value">
                    <textarea id="linkedin-job-description-${escapeHtml(job.id)}" rows="10" class="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#171717] dark:text-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Paste the full LinkedIn job description here before generating a cover letter...">${escapeHtml(job.pasted_job_description || '')}</textarea>
                    <div class="flex flex-wrap items-center gap-2 mt-3">
                        <button onclick="saveLinkedInJobDescription('${escapeHtml(job.id)}')" class="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">Save job description</button>
                        <span class="text-xs text-gray-500 dark:text-gray-400">Cover letters only generate after this is saved.</span>
                    </div>
                </div>
            </div>
            <div class="youtube-detail-card"><div class="youtube-detail-label">Cover Letter</div><div class="youtube-detail-value whitespace-pre-wrap">${escapeHtml(job.cover_letter || 'No cover letter generated yet.')}</div></div>
            <div class="flex flex-wrap gap-2">
                ${job.linkedin_url ? `<a href="${escapeHtml(job.linkedin_url)}" target="_blank" rel="noopener" class="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">Open LinkedIn job</a>` : ''}
                <button onclick="generateLinkedInCoverLetter('${escapeHtml(job.id)}')" ${job.pasted_job_description ? '' : 'disabled'} class="text-sm px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">${job.cover_letter ? 'Regenerate cover letter' : 'Generate cover letter'}</button>
                ${job.cover_letter ? `<button onclick="copyLinkedInCoverLetter('${escapeHtml(job.id)}')" class="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">Copy cover letter</button>` : ''}
                ${job.cover_letter && !job.google_doc_url ? `<button onclick="createLinkedInCoverLetterDoc('${escapeHtml(job.id)}')" class="text-sm px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">Create Google Doc</button>` : ''}
                ${job.google_doc_url ? `<a href="${escapeHtml(job.google_doc_url)}" target="_blank" rel="noopener" class="text-sm px-4 py-2 rounded-lg border border-emerald-200 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors">Open Google Doc</a>` : ''}
            </div>
            <div class="youtube-detail-card"><div class="youtube-detail-label">Source Email</div><div class="youtube-detail-value text-xs">${escapeHtml(job.source_email_subject || '-')}<br>${escapeHtml(job.source_email_from || '')}<br>Raw email id: ${escapeHtml(job.raw_email_id || '-')}</div></div>
        `;
        linkedInJobModal.classList.remove('hidden');
    };

    function closeLinkedInJobModal() { linkedInJobModal?.classList.add('hidden'); }
    if (linkedInJobModalClose) linkedInJobModalClose.addEventListener('click', closeLinkedInJobModal);
    if (linkedInJobModal) linkedInJobModal.addEventListener('click', e => { if (e.target === linkedInJobModal) closeLinkedInJobModal(); });
    if (checkAgentMailJobsBtn) checkAgentMailJobsBtn.addEventListener('click', checkAgentMailLinkedInJobs);
    if (refreshLinkedInJobsBtn) refreshLinkedInJobsBtn.addEventListener('click', () => loadLinkedInJobs());
    [linkedInJobsSearch, linkedInJobsStatusFilter, linkedInJobsScoreFilter, linkedInJobsLocationFilter].forEach(el => el?.addEventListener('input', renderLinkedInJobs));
    [linkedInJobsStatusFilter, linkedInJobsScoreFilter].forEach(el => el?.addEventListener('change', renderLinkedInJobs));

    // === People / Social CRM ===
    const peopleListEl = document.getElementById('people-list');
    const peopleQueueEl = document.getElementById('people-queue');
    const peopleSearchEl = document.getElementById('people-search');
    const peopleRelationshipFilterEl = document.getElementById('people-relationship-filter');
    const peopleDueFilterEl = document.getElementById('people-due-filter');
    const peopleModal = document.getElementById('people-modal');
    const peopleContactModal = document.getElementById('people-contact-modal');
    let socialPeople = [];

    const peopleDate = value => {
        if (!value) return 'Not set';
        const date = new Date(`${value}T12:00:00`);
        return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
    };

    const peopleInitials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
    const peopleLatestNote = person => String(person['Interaction History'] || '').split('\n').filter(Boolean)[0]?.replace(/^\d{4}-\d{2}-\d{2}\s*-\s*/, '') || person.Notes || '';
    const peopleTimingLabel = person => person._timing === 'due' ? 'Due now' : person._timing === 'upcoming' ? `Due ${peopleDate(person._nextContact)}` : `Next ${peopleDate(person._nextContact)}`;
    const peopleTimingClass = person => person._timing === 'due' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' : person._timing === 'upcoming' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300';

    function renderPeopleQueue() {
        if (!peopleQueueEl) return;
        const queue = socialPeople.filter(person => person.Status !== 'Archived' && ['due', 'upcoming'].includes(person._timing)).sort((a, b) => String(a._nextContact).localeCompare(String(b._nextContact)));
        document.getElementById('people-queue-count').innerText = `${queue.filter(person => person._timing === 'due').length} due`;
        peopleQueueEl.innerHTML = queue.length ? queue.map(person => `
            <article class="rounded-xl border ${person._timing === 'due' ? 'border-rose-200 dark:border-rose-500/20' : 'border-amber-200 dark:border-amber-500/20'} p-4 flex items-center gap-4">
                <div class="h-11 w-11 shrink-0 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-200 flex items-center justify-center text-sm font-semibold">${escapeHtml(peopleInitials(person.Name))}</div>
                <div class="min-w-0 flex-1"><div class="flex items-center gap-2 flex-wrap"><button data-people-action="edit" data-index="${person._index}" class="font-semibold dark:text-white hover:underline">${escapeHtml(person.Name)}</button><span class="text-[11px] rounded-full px-2 py-0.5 ${peopleTimingClass(person)}">${peopleTimingLabel(person)}</span></div><p class="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">${escapeHtml(peopleLatestNote(person) || person['Role/Tags'] || 'Add a conversation note when you catch up')}</p></div>
                <button data-people-action="contact" data-index="${person._index}" class="shrink-0 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-700">Log catch-up</button>
            </article>`).join('') : '<div class="lg:col-span-2 rounded-xl border border-dashed border-gray-200 dark:border-white/10 p-8 text-center"><div class="text-sm font-medium dark:text-white">You’re all caught up</div><p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Nothing needs your attention in the next seven days.</p></div>';
    }

    function renderPeopleList() {
        if (!peopleListEl) return;
        const query = String(peopleSearchEl?.value || '').trim().toLowerCase();
        const relationship = peopleRelationshipFilterEl?.value || '';
        const timing = peopleDueFilterEl?.value || '';
        const filtered = socialPeople.filter(person => {
            const haystack = [person.Name, person.Relationship, person['Role/Tags'], person.Location, person['How We Met'], person.Notes, person['Interaction History']].join(' ').toLowerCase();
            return (!query || haystack.includes(query)) && (!relationship || person.Relationship === relationship) && (!timing || person._timing === timing);
        }).sort((a, b) => a.Name.localeCompare(b.Name));
        document.getElementById('people-result-count').innerText = `${filtered.length} ${filtered.length === 1 ? 'person' : 'people'}`;
        peopleListEl.innerHTML = filtered.length ? filtered.map(person => `
            <article class="people-person-row p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                <div class="flex items-start gap-4 min-w-0 flex-1">
                    <div class="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-500/20 dark:to-fuchsia-500/20 text-violet-700 dark:text-violet-200 flex items-center justify-center text-sm font-semibold">${escapeHtml(peopleInitials(person.Name))}</div>
                    <div class="min-w-0"><div class="flex items-center gap-2 flex-wrap"><button data-people-action="edit" data-index="${person._index}" class="font-semibold text-left dark:text-white hover:underline">${escapeHtml(person.Name)}</button><span class="text-[11px] rounded-full px-2 py-0.5 bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">${escapeHtml(person.Relationship || 'Friend')}</span></div><p class="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">${escapeHtml([person['Role/Tags'], person.Location].filter(Boolean).join(' · ') || 'No tags yet')}</p>${peopleLatestNote(person) ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-1">Last note: ${escapeHtml(peopleLatestNote(person))}</p>` : ''}</div>
                </div>
                <div class="grid grid-cols-2 sm:flex sm:items-center gap-3 lg:justify-end">
                    <div class="text-xs"><div class="text-gray-400">Last contact</div><div class="mt-0.5 font-medium dark:text-gray-200">${peopleDate(person['Last Contacted'])}</div></div>
                    <div class="text-xs"><div class="text-gray-400">Rhythm</div><div class="mt-0.5"><span class="rounded-full px-2 py-1 ${peopleTimingClass(person)}">${peopleTimingLabel(person)}</span></div></div>
                    <button data-people-action="contact" data-index="${person._index}" class="col-span-2 rounded-lg border border-violet-200 dark:border-violet-500/30 px-3 py-2 text-xs font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-500/10">Log catch-up</button>
                </div>
            </article>`).join('') : '<div class="p-10 text-center text-sm text-gray-500 dark:text-gray-400">No people match those filters.</div>';
    }

    function renderPeople() {
        const active = socialPeople.filter(person => person.Status !== 'Archived');
        document.getElementById('people-total').innerText = active.length;
        document.getElementById('people-due').innerText = active.filter(person => person._timing === 'due').length;
        document.getElementById('people-upcoming').innerText = active.filter(person => person._timing === 'upcoming').length;
        document.getElementById('people-never').innerText = active.filter(person => !person['Last Contacted']).length;
        renderPeopleQueue();
        renderPeopleList();
    }

    async function loadPeople(silent = false) {
        if (!peopleListEl) return;
        if (!silent) peopleListEl.innerHTML = '<div class="p-10 text-center text-sm text-gray-500">Loading your people…</div>';
        try {
            const res = await fetch('/api/people');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not load people');
            socialPeople = Array.isArray(data.people) ? data.people : [];
            renderPeople();
        } catch (err) {
            console.error(err);
            peopleListEl.innerHTML = '<div class="p-10 text-center text-sm text-rose-500">Could not load your social CRM.</div>';
        }
    }

    function setPeopleModal(open) {
        peopleModal?.classList.toggle('hidden', !open);
        peopleModal?.classList.toggle('flex', open);
    }

    function openPeopleEditor(person = null) {
        document.getElementById('people-form')?.reset();
        document.getElementById('people-index').value = person?._index ?? '';
        document.getElementById('people-modal-title').innerText = person ? `Edit ${person.Name}` : 'Add person';
        document.getElementById('people-name').value = person?.Name || '';
        document.getElementById('people-relationship').value = person?.Relationship || 'Friend';
        document.getElementById('people-cadence').value = person?.['Catch-up Every Days'] || '30';
        document.getElementById('people-tags').value = person?.['Role/Tags'] || '';
        document.getElementById('people-contact').value = person?.['Link/Contact'] || '';
        document.getElementById('people-location').value = person?.Location || '';
        document.getElementById('people-met').value = person?.['How We Met'] || '';
        document.getElementById('people-last-contacted').value = person?.['Last Contacted'] || '';
        document.getElementById('people-next-contact').value = person?.['Next Contact'] || '';
        document.getElementById('people-birthday').value = person?.Birthday || '';
        document.getElementById('people-source').value = person?.Source || '';
        document.getElementById('people-notes').value = person?.Notes || '';
        document.getElementById('people-delete-btn').classList.toggle('hidden', !person);
        setPeopleModal(true);
    }

    function openPeopleContact(person) {
        if (!person) return;
        document.getElementById('people-contact-form')?.reset();
        document.getElementById('people-contact-index').value = person._index;
        document.getElementById('people-contact-name').innerText = `Catch-up with ${person.Name}`;
        const today = new Date().toISOString().slice(0, 10);
        const next = new Date(`${today}T12:00:00`);
        next.setDate(next.getDate() + Number(person['Catch-up Every Days'] || 90));
        document.getElementById('people-contact-date').value = today;
        document.getElementById('people-contact-next').value = next.toISOString().slice(0, 10);
        peopleContactModal?.classList.remove('hidden');
        peopleContactModal?.classList.add('flex');
    }

    const closePeopleContact = () => { peopleContactModal?.classList.add('hidden'); peopleContactModal?.classList.remove('flex'); };
    document.getElementById('people-add-btn')?.addEventListener('click', () => openPeopleEditor());
    document.getElementById('people-modal-close')?.addEventListener('click', () => setPeopleModal(false));
    document.getElementById('people-form-cancel')?.addEventListener('click', () => setPeopleModal(false));
    document.getElementById('people-contact-cancel')?.addEventListener('click', closePeopleContact);
    peopleModal?.addEventListener('click', event => { if (event.target === peopleModal) setPeopleModal(false); });
    peopleContactModal?.addEventListener('click', event => { if (event.target === peopleContactModal) closePeopleContact(); });
    [peopleSearchEl, peopleRelationshipFilterEl, peopleDueFilterEl].forEach(el => el?.addEventListener('input', renderPeopleList));

    [peopleListEl, peopleQueueEl].forEach(container => container?.addEventListener('click', event => {
        const button = event.target.closest('[data-people-action]');
        if (!button) return;
        const person = socialPeople.find(item => Number(item._index) === Number(button.dataset.index));
        if (button.dataset.peopleAction === 'edit') openPeopleEditor(person);
        if (button.dataset.peopleAction === 'contact') openPeopleContact(person);
    }));

    document.getElementById('people-form')?.addEventListener('submit', async event => {
        event.preventDefault();
        const index = document.getElementById('people-index').value;
        const payload = {
            Name: document.getElementById('people-name').value,
            Relationship: document.getElementById('people-relationship').value,
            'Catch-up Every Days': document.getElementById('people-cadence').value,
            'Role/Tags': document.getElementById('people-tags').value,
            'Link/Contact': document.getElementById('people-contact').value,
            Location: document.getElementById('people-location').value,
            'How We Met': document.getElementById('people-met').value,
            'Last Contacted': document.getElementById('people-last-contacted').value,
            'Next Contact': document.getElementById('people-next-contact').value,
            Birthday: document.getElementById('people-birthday').value,
            Source: document.getElementById('people-source').value,
            Notes: document.getElementById('people-notes').value
        };
        try {
            const res = await fetch(index === '' ? '/api/people' : `/api/people/${index}`, { method: index === '' ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not save person');
            setPeopleModal(false);
            await loadPeople(true);
            loadYouTubeTeam(true);
        } catch (err) { alert(err.message); }
    });

    document.getElementById('people-delete-btn')?.addEventListener('click', async () => {
        const index = document.getElementById('people-index').value;
        const person = socialPeople.find(item => Number(item._index) === Number(index));
        if (!person || !confirm(`Delete ${person.Name} from your social CRM?`)) return;
        const res = await fetch(`/api/people/${index}`, { method: 'DELETE' });
        if (!res.ok) return alert('Could not delete this person.');
        setPeopleModal(false);
        await loadPeople(true);
        loadYouTubeTeam(true);
    });

    document.getElementById('people-contact-form')?.addEventListener('submit', async event => {
        event.preventDefault();
        const index = document.getElementById('people-contact-index').value;
        try {
            const res = await fetch(`/api/people/${index}/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: document.getElementById('people-contact-date').value, note: document.getElementById('people-contact-note').value, nextContact: document.getElementById('people-contact-next').value }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not log catch-up');
            closePeopleContact();
            await loadPeople(true);
        } catch (err) { alert(err.message); }
    });

    // === Auto Refresh ===
    setInterval(() => {
        const activeView = Array.from(viewSections).find(v => v.classList.contains('block'));
        if (!activeView) return;
        if (activeView.id === 'view-fleet') loadFleet(true);
        else if (activeView.id === 'view-org-chart') loadFleet(true);
        else if (activeView.id === 'view-calendar') loadCalendar(true);
        else if (activeView.id === 'view-youtube') loadYouTubeData(true);
        else if (activeView.id === 'view-instagram') loadInstagramReelsData(true);
        else if (activeView.id === 'view-memory') loadMemoryIndex(true);
        else if (activeView.id === 'view-cron') loadCronJobs(true);
        else if (activeView.id === 'view-news') loadNews(true);
        else if (activeView.id === 'view-releases') loadReleases(true);
        else if (activeView.id === 'view-learnings') loadLearnings(true);
        else if (activeView.id === 'view-journal') loadJournal(true);
        else if (activeView.id === 'view-read') loadReadLibrary(true);
        else if (activeView.id === 'view-goals') loadGoals(true);
        else if (activeView.id === 'view-business-ideas') loadBusinessIdeas(true);
        else if (activeView.id === 'view-health') loadHealthData(true);
        else if (activeView.id === 'view-ytjobs') loadYtJobs(true);
        else if (activeView.id === 'view-linkedin-jobs') loadLinkedInJobs(true);
        else if (activeView.id === 'view-property') loadPropertyDeals(true);
        else if (activeView.id === 'view-analytics') loadAnalyticsData(true);
        else if (activeView.id === 'view-people') loadPeople(true);
    }, 5000);

    // Initial Load
    const initialView = location.pathname === '/linkedin-jobs' || location.pathname === '/jobs/linkedin'
        ? 'view-linkedin-jobs'
        : location.pathname === '/ytjobs' || location.pathname === '/jobs/youtube'
            ? 'view-ytjobs'
        : location.pathname === '/property'
            ? 'view-property'
        : location.pathname === '/people'
            ? 'view-people'
            : 'view-goals';

    if (contextSwitcher && !['/linkedin-jobs', '/jobs/linkedin', '/ytjobs', '/jobs/youtube', '/property', '/people'].includes(location.pathname)) {
        contextSwitcher.value = 'lifeos';
        navMissionControl?.classList.add('hidden');
        navLifeOs?.classList.remove('hidden');
    }
    loadFleet();
    loadYouTubeData();
    loadInstagramReelsData(true);
    loadMemoryIndex(true);
    loadCronJobs();
    loadCalendar(true);
    loadNews();
    loadReleases();
    loadLearnings();
    loadJournal();
    loadReadLibrary();
    loadGoals();
    loadBusinessIdeas(true);
    loadHealthData();
    loadYtJobs(true);
    loadLinkedInJobs(true);
    loadPropertyDeals(true);
    loadAnalyticsData();
    loadPeople(true);
    switchView(initialView);

    async function loadYouTubeTeam(silent = false) {
        const teamContainer = document.getElementById('youtube-team-container');
        if (!teamContainer) return;
        try {
            const res = await fetch('/api/youtube/team');
            if (res.ok) {
                const data = await res.json();
                const team = Array.isArray(data.team) ? data.team : [];
                const jsString = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                teamContainer.innerHTML = team.length ? team.map(member => `
                    <div class="bg-gray-50 dark:bg-[#171717]/50 border border-gray-200 dark:border-white/10 rounded-xl p-5 flex flex-col gap-3">
                        <div class="flex justify-between items-start gap-2">
                            <div>
                                <h3 class="font-semibold text-lg dark:text-white">${escapeHtml(member['Name'] || 'Unknown')}</h3>
                                <span class="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 mt-2 inline-block">${escapeHtml(member['Role/Tags'] || 'Team Member')}</span>
                            </div>
                            <div class="flex gap-1 shrink-0">
                                <button type="button" onclick="editYouTubeTeamMember(${Number(member._index)})" class="text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">Edit</button>
                                <button type="button" onclick="deleteYouTubeTeamMember(${Number(member._index)}, '${jsString(member['Name'] || 'this person')}')" class="text-xs px-2.5 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10 transition-colors">Delete</button>
                            </div>
                        </div>
                        ${member['Notes'] ? `<p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">${escapeHtml(member['Notes'])}</p>` : ''}
                        <div class="flex flex-col gap-1.5 mt-auto pt-2">
                            ${member['Link/Contact'] ? `<a href="${member['Link/Contact'].startsWith('http') ? escapeHtml(member['Link/Contact']) : '#'}" ${member['Link/Contact'].startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : ''} class="text-sm text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white truncate" title="${escapeHtml(member['Link/Contact'])}">📞 ${escapeHtml(member['Link/Contact'])}</a>` : ''}
                            ${member['Source'] ? `<span class="text-xs text-gray-500">Source: ${escapeHtml(member['Source'])}</span>` : ''}
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

    window.editYouTubeTeamMember = async (index) => {
        try {
            const res = await fetch('/api/youtube/team');
            const data = await res.json();
            const member = (Array.isArray(data.team) ? data.team : []).find(item => Number(item._index) === Number(index));
            if (!member) return alert('Team member not found. Refresh and try again.');

            const nextName = prompt('Name', member['Name'] || '');
            if (nextName === null) return;
            const nextRole = prompt('Role / tags', member['Role/Tags'] || 'YouTube Dream Team');
            if (nextRole === null) return;
            const nextContact = prompt('Link / contact', member['Link/Contact'] || '');
            if (nextContact === null) return;
            const nextSource = prompt('Source', member['Source'] || '');
            if (nextSource === null) return;
            const nextNotes = prompt('Notes', member['Notes'] || '');
            if (nextNotes === null) return;

            const updateRes = await fetch('/api/youtube/team/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    index,
                    'Name': nextName,
                    'Role/Tags': nextRole,
                    'Link/Contact': nextContact,
                    'Source': nextSource,
                    'Notes': nextNotes,
                    'Date Added': member['Date Added'] || new Date().toISOString().slice(0, 10)
                })
            });
            if (!updateRes.ok) {
                const error = await updateRes.json().catch(() => ({}));
                throw new Error(error.error || 'Failed to update team member');
            }
            loadYouTubeTeam(true);
        } catch (err) {
            console.error(err);
            alert(err.message || 'Failed to update team member.');
        }
    };

    window.deleteYouTubeTeamMember = async (index, name = 'this person') => {
        if (!confirm(`Delete ${name} from the YouTube Dream Team?`)) return;
        try {
            const res = await fetch('/api/youtube/team/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ index })
            });
            if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                throw new Error(error.error || 'Failed to delete team member');
            }
            loadYouTubeTeam(true);
        } catch (err) {
            console.error(err);
            alert(err.message || 'Failed to delete team member.');
        }
    };
});
