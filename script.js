// script.js
(function() {
  'use strict';

  // ---------- state ----------
  let habits = [];              // array of { id, name, log: { 'YYYY-MM-DD': true } }
  const STORAGE_KEY = 'habitTracker30';

  // DOM refs
  const container = document.getElementById('habitsContainer');
  const habitInput = document.getElementById('habitInput');
  const addBtn = document.getElementById('addBtn');
  const resetBtn = document.getElementById('resetBtn');

  // ---------- helpers ----------
  function getToday() {
    const d = new Date();
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  // generate last 30 days (including today) as array of date strings (oldest → newest)
  function getLast30Days() {
    const today = new Date();
    const dates = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }

  // ---------- storage ----------
  function loadFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        habits = JSON.parse(stored);
        // ensure each habit has a log object
        habits = habits.filter(h => h && typeof h === 'object' && h.id && h.name);
        habits.forEach(h => {
          if (!h.log || typeof h.log !== 'object') h.log = {};
        });
      } catch (e) {
        habits = [];
      }
    } else {
      // seed with sample habits for demo
      habits = [
        { id: '1', name: '☀️ Morning walk', log: {} },
        { id: '2', name: '📚 Read 15 pages', log: {} },
      ];
      // mark some random days as done for demo
      const today = getToday();
      const days = getLast30Days();
      habits[0].log = { [days[5]]: true, [days[7]]: true, [days[10]]: true, [days[12]]: true, [days[14]]: true, [days[18]]: true, [days[20]]: true, [days[25]]: true };
      habits[1].log = { [days[2]]: true, [days[4]]: true, [days[9]]: true, [days[11]]: true, [days[15]]: true, [days[19]]: true, [days[22]]: true, [days[27]]: true };
      // also mark today for first habit if possible
      if (days.includes(today)) habits[0].log[today] = true;
      saveToStorage();
    }
  }

  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  }

  // ---------- streak calculation ----------
  function calculateStreak(log, dateArray) {
    // dateArray: oldest → newest (30 days)
    let streak = 0;
    // iterate from newest (today) backwards
    for (let i = dateArray.length - 1; i >= 0; i--) {
      const dateStr = dateArray[i];
      if (log[dateStr] === true) {
        streak++;
      } else {
        // if today is not done, streak is 0 (but we still break at first miss)
        // but if today is the first day and it's not done, streak = 0
        // we need to stop at the first miss. However, if today is not done, streak=0.
        // But we want to count consecutive days ending today.
        // If today is not done, streak=0.
        // if we are at today (i === dateArray.length-1) and not done, break with 0.
        break;
      }
    }
    return streak;
  }

  // ---------- render ----------
  function render() {
    const today = getToday();
    const dateArray = getLast30Days(); // oldest → newest

    if (habits.length === 0) {
      container.innerHTML = `<div class="empty-state">✨ No habits yet. Add your first habit above!</div>`;
      return;
    }

    let html = '';
    habits.forEach(habit => {
      const log = habit.log || {};
      const streak = calculateStreak(log, dateArray);

      // build day cells (oldest → newest)
      let daysHtml = '';
      dateArray.forEach(dateStr => {
        const isToday = dateStr === today;
        const isDone = log[dateStr] === true;
        const isFuture = dateStr > today; // future dates (after today)
        let classes = 'day-cell';
        if (isToday) classes += ' today';
        if (isDone) classes += ' done';
        if (isFuture) classes += ' future';
        // if not done, not future, and before today -> missed (optional style)
        // we show missed only for days before today that are not done
        if (!isDone && !isFuture && dateStr < today) classes += ' missed';

        // show day number (1-30) for readability
        const dayNumber = dateArray.indexOf(dateStr) + 1;
        daysHtml += `<div class="${classes}" data-date="${dateStr}" data-habit-id="${habit.id}" title="${dateStr}">${dayNumber}</div>`;
      });

      html += `
        <div class="habit-card" data-habit-id="${habit.id}">
          <div class="habit-header">
            <span class="habit-name">${escapeHtml(habit.name)}</span>
            <span class="streak-badge">🔥 <span>${streak}</span> day${streak !== 1 ? 's' : ''}</span>
          </div>
          <div class="days-grid">
            ${daysHtml}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // attach event listeners to day cells for toggling
    document.querySelectorAll('.day-cell:not(.future)').forEach(cell => {
      cell.addEventListener('click', function(e) {
        const habitId = this.dataset.habitId;
        const dateStr = this.dataset.date;
        if (!habitId || !dateStr) return;
        // only allow toggle for today or past days (not future)
        if (dateStr > today) return;
        toggleHabitDay(habitId, dateStr);
      });
    });
  }

  // simple escape
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ---------- toggle habit day ----------
  function toggleHabitDay(habitId, dateStr) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    // toggle
    if (habit.log[dateStr] === true) {
      delete habit.log[dateStr];
    } else {
      habit.log[dateStr] = true;
    }
    saveToStorage();
    render();
  }

  // ---------- add habit ----------
  function addHabit() {
    const rawName = habitInput.value.trim();
    if (!rawName) {
      habitInput.focus();
      return;
    }
    const newHabit = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      name: rawName,
      log: {}
    };
    habits.push(newHabit);
    saveToStorage();
    habitInput.value = '';
    habitInput.focus();
    render();
  }

  // ---------- reset all data ----------
  function resetAll() {
    if (confirm('Delete all habits and progress?')) {
      habits = [];
      saveToStorage();
      render();
    }
  }

  // ---------- init ----------
  function init() {
    loadFromStorage();
    render();

    // event listeners
    addBtn.addEventListener('click', addHabit);
    habitInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addHabit();
    });
    resetBtn.addEventListener('click', resetAll);
  }

  // start
  init();
})();
