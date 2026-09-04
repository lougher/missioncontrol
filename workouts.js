// Mission Control - web workout planner and all-session monitoring
document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('workout-dashboard');
    if (!root) return;

    const PROGRAMME_START = '2026-07-06';
    const SESSION_DAYS = { 1: 0, 2: 2, 3: 4, 4: 6 };
    const state = { data: null, selectedWeek: currentProgrammeWeek(), selectedSession: 1, monitorSession: 0, saving: false };
    const el = id => document.getElementById(id);

    el('workout-week-select')?.addEventListener('change', event => {
        state.selectedWeek = Number(event.target.value || 1);
        setDefaultWorkoutDate();
        renderWorkoutSession();
    });
    el('workout-session-tabs')?.addEventListener('click', event => {
        const button = event.target.closest('[data-workout-session]');
        if (!button) return;
        state.selectedSession = Number(button.dataset.workoutSession);
        setDefaultWorkoutDate();
        renderSessionTabs();
        renderWorkoutSession();
    });
    el('workout-monitor-filters')?.addEventListener('click', event => {
        const button = event.target.closest('[data-monitor-session]');
        if (!button) return;
        state.monitorSession = Number(button.dataset.monitorSession);
        renderMonitorFilters();
        renderMonitoring();
    });
    el('workout-save-session')?.addEventListener('click', saveWorkoutSession);

    loadWorkouts();

    async function loadWorkouts() {
        try {
            const response = await fetch('/api/workouts');
            if (!response.ok) throw new Error(`Workout request failed: ${response.status}`);
            state.data = await response.json();
            const maxLoggedWeek = Math.max(1, ...(state.data.rows || []).map(row => Number(row.weekNumber || 0)));
            state.selectedWeek = Math.max(currentProgrammeWeek(), maxLoggedWeek);
            renderAll();
        } catch (error) {
            console.error(error);
            el('workout-session-rows').innerHTML = '<tr><td colspan="5" class="p-6 text-sm text-red-600">The workout dashboard could not be loaded.</td></tr>';
        }
    }

    function renderAll() {
        renderMetrics();
        renderWeekSelect();
        renderSessionTabs();
        renderWorkoutSession();
        renderMonitorFilters();
        renderMonitoring();
    }

    function renderMetrics() {
        const data = state.data || {};
        const sessions = data.sessions || [];
        const exercises = data.exercises || [];
        const statuses = exercises.map(exercise => progressFor(exercise.latest, exercise.previous));
        const latestSession = sessions.at(-1);
        el('health-sessions').textContent = Number(data.summary?.sessionCount || 0).toLocaleString();
        el('health-date-range').textContent = data.summary?.firstDate && data.summary?.latestDate
            ? `${shortDate(data.summary.firstDate)} to ${shortDate(data.summary.latestDate)}`
            : 'No workouts yet';
        el('workout-improving-count').textContent = statuses.filter(status => status.key === 'improving').length;
        el('health-latest-day').textContent = latestSession?.workoutDay || '-';
        el('health-latest-date').textContent = latestSession?.date ? longDate(latestSession.date) : '-';
        el('workout-current-week').textContent = `Week ${state.selectedWeek}`;
        el('workout-week-dates').textContent = weekDateLabel(state.selectedWeek);
    }

    function renderWeekSelect() {
        const select = el('workout-week-select');
        if (!select) return;
        const latest = Math.max(12, currentProgrammeWeek(), ...(state.data?.rows || []).map(row => Number(row.weekNumber || 0)));
        select.innerHTML = Array.from({ length: latest }, (_, index) => index + 1).map(week =>
            `<option value="${week}" ${week === state.selectedWeek ? 'selected' : ''}>Week ${week} · ${escapeHtml(weekDateLabel(week))}</option>`
        ).join('');
        setDefaultWorkoutDate();
    }

    function renderSessionTabs() {
        const container = el('workout-session-tabs');
        if (!container) return;
        container.innerHTML = [1, 2, 3, 4].map(sessionNumber => {
            const plan = sessionPlan(sessionNumber);
            const active = state.selectedSession === sessionNumber;
            return `<button type="button" data-workout-session="${sessionNumber}" class="shrink-0 rounded-xl border px-4 py-2.5 text-left transition-colors ${active ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black' : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5'}"><span class="block text-sm font-semibold">Session ${sessionNumber}</span><span class="block text-[11px] opacity-70 mt-0.5">${escapeHtml(plan[0]?.day || '')} · ${plan.length} exercises</span></button>`;
        }).join('');
    }

    function renderWorkoutSession() {
        if (!state.data) return;
        renderMetrics();
        const rows = el('workout-session-rows');
        const summary = el('workout-session-summary');
        const plan = sessionPlan(state.selectedSession);
        const logged = plan.filter(exercise => currentLog(exercise)).length;
        const totalWorkingSets = plan.reduce((sum, exercise) => sum + Number(exercise.workingSets || 0), 0);
        if (summary) summary.innerHTML = `<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"><div><span class="font-semibold text-indigo-950 dark:text-indigo-100">Session ${state.selectedSession} · ${escapeHtml(plan[0]?.day || '')}</span><span class="text-sm text-indigo-700/80 dark:text-indigo-200/70"> · ${plan.length} exercises · ${totalWorkingSets} working sets</span></div><div class="text-xs font-medium text-indigo-700 dark:text-indigo-300">${logged}/${plan.length} exercises logged this week</div></div>`;
        if (!rows) return;
        rows.innerHTML = plan.map(exercise => workoutExerciseRow(exercise)).join('') || '<tr><td colspan="5" class="p-6 text-sm text-gray-500">No exercises in this session.</td></tr>';
        el('workout-save-status').textContent = logged ? 'Edit any set and save to update this session. RIR is recorded as 0.' : 'Enter working sets. RIR is recorded as 0 automatically.';
    }

    function workoutExerciseRow(exercise) {
        const current = currentLog(exercise);
        const previous = previousLog(exercise, state.selectedWeek);
        const parsedSets = current?.parsed?.sets || [];
        const setCount = Math.max(Number(exercise.workingSets || 0), parsedSets.length);
        const status = progressFor(current, previous);
        const inputs = Array.from({ length: setCount }, (_, index) => {
            const set = parsedSets[index] || {};
            const weighted = isWeightedExercise(exercise, parsedSets);
            return `<div class="workout-set-pair"><label class="text-[10px] uppercase tracking-wider text-gray-400">${weighted ? 'kg' : 'Load'}<input data-workout-shortcode="${escapeHtml(exercise.shortcode)}" data-set-index="${index}" data-set-field="weight" type="number" min="0" step="0.5" value="${set.weight ? escapeHtml(set.weight) : ''}" placeholder="${weighted ? 'kg' : 'BW'}" class="workout-set-input mt-1" ${weighted ? '' : 'disabled'}></label><label class="text-[10px] uppercase tracking-wider text-gray-400">Reps<input data-workout-shortcode="${escapeHtml(exercise.shortcode)}" data-set-index="${index}" data-set-field="reps" type="number" min="0" step="1" value="${set.reps || ''}" placeholder="reps" class="workout-set-input mt-1"></label></div>`;
        }).join('');
        return `<tr data-workout-exercise="${escapeHtml(exercise.shortcode)}" class="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"><td class="px-5 py-4"><div class="font-semibold text-gray-900 dark:text-white">${escapeHtml(exercise.exercise)}</div><div class="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><span>${escapeHtml(exercise.muscleGroup)}</span><span>·</span><span class="font-mono">${escapeHtml(exercise.shortcode)}</span></div></td><td class="px-4 py-4 text-sm text-gray-600 dark:text-gray-300"><div>${escapeHtml(exercise.repRange)} reps</div><div class="text-xs text-gray-400 mt-1">${exercise.warmUpSets} warm-up · ${exercise.workingSets} working</div></td><td class="px-4 py-4 text-sm"><div class="font-medium text-gray-800 dark:text-gray-200">${escapeHtml(previous?.LogString || 'No previous log')}</div><div class="text-xs text-gray-400 mt-1">${previous?.Date ? longDate(previous.Date) : ''}</div></td><td class="px-4 py-4"><div class="flex gap-2">${inputs}</div></td><td class="px-5 py-4 text-right"><span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold workout-progress-${status.key}">${escapeHtml(status.label)}</span><div class="mt-2 text-xs text-gray-400">${escapeHtml(status.detail)}</div></td></tr>`;
    }

    async function saveWorkoutSession() {
        if (state.saving) return;
        const plan = sessionPlan(state.selectedSession);
        const entries = plan.map(exercise => {
            const inputRows = [...root.querySelectorAll(`[data-workout-shortcode="${exercise.shortcode}"]`)].reduce((sets, input) => {
                const index = Number(input.dataset.setIndex || 0);
                sets[index] ||= { weight: '', reps: '' };
                sets[index][input.dataset.setField] = input.value;
                return sets;
            }, []);
            return { shortcode: exercise.shortcode, sets: inputRows.filter(set => Number(set?.reps || 0) > 0) };
        }).filter(entry => entry.sets.length);
        if (!entries.length) {
            el('workout-save-status').textContent = 'Add reps for at least one exercise before saving.';
            return;
        }
        state.saving = true;
        const button = el('workout-save-session');
        button.disabled = true;
        button.textContent = 'Saving...';
        el('workout-save-status').textContent = 'Saving your workout...';
        try {
            const response = await fetch('/api/workouts/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: el('workout-date-input').value, sessionNumber: state.selectedSession, entries })
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Workout could not be saved');
            state.data = result;
            renderAll();
            el('workout-save-status').textContent = `Saved ${result.saved.exerciseCount} exercises for ${longDate(result.saved.date)}.`;
        } catch (error) {
            console.error(error);
            el('workout-save-status').textContent = error.message || 'Workout could not be saved.';
        } finally {
            state.saving = false;
            button.disabled = false;
            button.textContent = 'Save session';
        }
    }

    function renderMonitorFilters() {
        const container = el('workout-monitor-filters');
        if (!container) return;
        container.innerHTML = [0, 1, 2, 3, 4].map(sessionNumber => {
            const active = state.monitorSession === sessionNumber;
            return `<button type="button" data-monitor-session="${sessionNumber}" class="shrink-0 rounded-full px-3 py-2 text-xs font-medium ${active ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'}">${sessionNumber ? `Session ${sessionNumber}` : 'All sessions'}</button>`;
        }).join('');
    }

    function renderMonitoring() {
        if (!state.data) return;
        const plan = (state.data.programme || []).filter(exercise => !state.monitorSession || exercise.sessionNumber === state.monitorSession);
        const items = plan.map(exercise => {
            const logs = exerciseLogs(exercise);
            const latest = logs.at(-1) || null;
            const previous = logs.at(-2) || null;
            return { exercise, logs, latest, previous, status: progressFor(latest, previous) };
        });
        const statusCounts = items.reduce((counts, item) => {
            counts[item.status.key] = (counts[item.status.key] || 0) + 1;
            return counts;
        }, {});
        el('workout-monitor-summary').innerHTML = [
            ['Improving', statusCounts.improving || 0, 'text-emerald-600 dark:text-emerald-300'],
            ['Maintaining', statusCounts.maintaining || 0, 'text-blue-600 dark:text-blue-300'],
            ['Mixed', statusCounts.mixed || 0, 'text-amber-600 dark:text-amber-300'],
            ['Needs attention', statusCounts.declining || 0, 'text-red-600 dark:text-red-300']
        ].map(([label, count, colour]) => `<div class="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] p-4"><div class="text-xs text-gray-500 dark:text-gray-400">${label}</div><div class="mt-1 text-2xl font-semibold ${colour}">${count}</div></div>`).join('');
        el('workout-monitor-rows').innerHTML = items.map(item => monitorRow(item)).join('');
    }

    function monitorRow({ exercise, logs, latest, previous, status }) {
        const values = logs.slice(-7).map(metricFor);
        const max = Math.max(1, ...values);
        const spark = values.length ? `<div class="h-9 flex items-end gap-1" title="Last ${values.length} logs">${values.map(value => `<span class="workout-spark-bar" style="height:${Math.max(10, (value / max) * 100)}%"></span>`).join('')}</div>` : '<span class="text-xs text-gray-400">No history</span>';
        const tonnage = Number(latest?.volume || 0);
        return `<tr><td class="px-5 py-4"><div class="font-semibold text-gray-900 dark:text-white">${escapeHtml(exercise.exercise)}</div><div class="mt-1 text-xs font-mono text-gray-400">${escapeHtml(exercise.shortcode)}</div></td><td class="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">Session ${exercise.sessionNumber}<div class="text-xs text-gray-400 mt-1">${escapeHtml(exercise.day)}</div></td><td class="px-4 py-4 text-sm font-medium text-gray-800 dark:text-gray-200">${escapeHtml(latest?.LogString || 'Not logged')}<div class="text-xs text-gray-400 mt-1">${latest?.Date ? longDate(latest.Date) : ''}</div></td><td class="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">${tonnage ? `${Math.round(tonnage).toLocaleString()} kg` : latest ? `${latest.totalReps || 0} reps` : '-'}</td><td class="px-4 py-4"><span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold workout-progress-${status.key}">${escapeHtml(status.label)}</span><div class="mt-1 text-xs text-gray-400">${escapeHtml(status.detail)}</div></td><td class="px-5 py-4">${spark}</td></tr>`;
    }

    function progressFor(current, previous) {
        if (!current) return { key: 'not-logged', label: 'Not logged', detail: 'No result for this period' };
        if (!previous) return { key: 'new', label: 'Baseline', detail: 'First recorded result' };
        const currentMetric = metricFor(current);
        const previousMetric = metricFor(previous);
        const delta = currentMetric - previousMetric;
        const percent = previousMetric ? (delta / previousMetric) * 100 : 0;
        const currentWeight = Number(current.parsed?.topSet?.weight || 0);
        const previousWeight = Number(previous.parsed?.topSet?.weight || 0);
        const weightDelta = currentWeight - previousWeight;
        const repsDelta = Number(current.totalReps || current.parsed?.totalReps || 0) - Number(previous.totalReps || previous.parsed?.totalReps || 0);
        const mixed = (weightDelta > 0 && repsDelta < 0) || (weightDelta < 0 && repsDelta > 0);
        if (mixed && Math.abs(percent) < 8) return { key: 'mixed', label: 'Mixed', detail: `${signed(weightDelta)} kg · ${signed(repsDelta)} reps` };
        if (delta > 0.01) return { key: 'improving', label: 'Progressing', detail: `${signed(percent, 1)}% ${current.volume ? 'tonnage' : 'reps'}` };
        if (delta < -0.01) return { key: 'declining', label: 'Down', detail: `${signed(percent, 1)}% ${current.volume ? 'tonnage' : 'reps'}` };
        return { key: 'maintaining', label: 'Maintaining', detail: 'Matched previous result' };
    }

    function sessionPlan(sessionNumber) {
        return (state.data?.programme || []).filter(exercise => exercise.sessionNumber === sessionNumber);
    }

    function exerciseLogs(exercise) {
        return (state.data?.rows || []).filter(row => row.Session === exercise.session && row.Shortcode === exercise.shortcode).sort((a, b) => a.Date.localeCompare(b.Date));
    }

    function currentLog(exercise) {
        return exerciseLogs(exercise).filter(row => Number(row.weekNumber) === state.selectedWeek).at(-1) || null;
    }

    function previousLog(exercise, week) {
        return exerciseLogs(exercise).filter(row => Number(row.weekNumber) < week).at(-1) || null;
    }

    function metricFor(log) {
        return Number(log?.volume || log?.parsed?.volume || 0) || Number(log?.totalReps || log?.parsed?.totalReps || 0);
    }

    function isWeightedExercise(exercise, sets = []) {
        if (sets.some(set => Number(set.weight || 0) > 0)) return true;
        return exercise.shortcode !== 'LEGCR';
    }

    function currentProgrammeWeek() {
        const start = new Date(`${PROGRAMME_START}T00:00:00`);
        const now = new Date();
        return Math.max(1, Math.floor((startOfDay(now) - start) / 604800000) + 1);
    }

    function weekStart(week) {
        const date = new Date(`${PROGRAMME_START}T00:00:00`);
        date.setDate(date.getDate() + ((week - 1) * 7));
        return date;
    }

    function weekDateLabel(week) {
        const start = weekStart(week);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    }

    function setDefaultWorkoutDate() {
        const input = el('workout-date-input');
        if (!input) return;
        const date = weekStart(state.selectedWeek);
        date.setDate(date.getDate() + Number(SESSION_DAYS[state.selectedSession] || 0));
        input.value = localIsoDate(date);
    }

    function startOfDay(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function localIsoDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function shortDate(value) {
        const date = new Date(`${value}T00:00:00`);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }

    function longDate(value) {
        const date = new Date(`${value}T00:00:00`);
        return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }

    function signed(value, decimals = 0) {
        const number = Number(value || 0);
        return `${number > 0 ? '+' : ''}${number.toFixed(decimals).replace(/\.0$/, '')}`;
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
    }
});
