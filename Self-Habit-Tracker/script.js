document.addEventListener('DOMContentLoaded', () => {
    const habitsContainer = document.getElementById('habitsContainer');
    const addHabitBtn = document.getElementById('addHabit');
    const yearSelector = document.getElementById('yearSelector');
    
    let habits = JSON.parse(localStorage.getItem('habits')) || [];
    let currentYear = new Date().getFullYear();

    // Initialize year selector
    function initYearSelector() {
        const startYear = currentYear - 5;
        yearSelector.innerHTML = '';
        for (let year = currentYear; year >= startYear; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelector.appendChild(option);
        }
        yearSelector.value = currentYear;
    }
    initYearSelector();

    // Year change handler
    yearSelector.addEventListener('change', () => {
        currentYear = parseInt(yearSelector.value);
        refreshAllHabits();
    });

    // Add new habit
    addHabitBtn.addEventListener('click', () => {
        const habitName = prompt('Enter habit name:');
        if (habitName) {
            if (!habits.includes(habitName)) {
                habits.push(habitName);
                localStorage.setItem('habits', JSON.stringify(habits));
            }
            createHabit(habitName);
        }
    });

    // Create habit component
    function createHabit(name) {
        const habitDiv = document.createElement('div');
        habitDiv.className = 'habit-container';
        habitDiv.innerHTML = `
            <h2 class="editable-title">${name}</h2>
            <div class="timer">
                <div id="timeDisplay">00:00:00</div>
                <button class="start-btn">Start</button>
                <button class="pause-btn">Pause</button>
            </div>
            <div class="heatmap-container">
                <div class="month-labels" id="${name}-months"></div>
                <div class="heatmap-wrapper">
                    <div class="weekday-labels" id="${name}-weekdays"></div>
                    <div class="heatmap" id="${name}-heatmap"></div>
                </div>
                <div class="legend">
                    <div class="legend-item"><div class="legend-color color-1"></div>&lt;30m</div>
                    <div class="legend-item"><div class="legend-color color-2"></div>30m-1h</div>
                    <div class="legend-item"><div class="legend-color color-3"></div>1-3h</div>
                    <div class="legend-item"><div class="legend-color color-4"></div>&gt;3h</div>
                </div>
            </div>
        `;
        habitsContainer.appendChild(habitDiv);

        // Add title editing
        const title = habitDiv.querySelector('.editable-title');
        title.addEventListener('click', () => {
            const newName = prompt('Edit habit name:', name);
            if (newName && newName !== name) {
                const index = habits.indexOf(name);
                habits[index] = newName;
                localStorage.setItem('habits', JSON.stringify(habits));
                
                const data = localStorage.getItem(name);
                if (data) {
                    localStorage.setItem(newName, data);
                    localStorage.removeItem(name);
                }
                
                title.textContent = newName;
                name = newName;
            }
        });

        // Add weekday labels starting from Wednesday
        const weekdayLabels = habitDiv.querySelector('.weekday-labels');
        const weekdays = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'];
        
        weekdays.forEach(day => {
            const label = document.createElement('div');
            label.className = 'weekday-label';
            label.textContent = day;
            weekdayLabels.appendChild(label);
        });

        // Timer logic
        let timer = null;
        let seconds = 0;
        const timeDisplay = habitDiv.querySelector('#timeDisplay');
        const startBtn = habitDiv.querySelector('.start-btn');
        const pauseBtn = habitDiv.querySelector('.pause-btn');

        startBtn.addEventListener('click', () => {
            if (!timer) {
                timer = setInterval(() => {
                    seconds++;
                    updateDisplay();
                }, 1000);
            }
        });

        pauseBtn.addEventListener('click', () => {
            clearInterval(timer);
            timer = null;
            saveDuration(name, seconds);
            seconds = 0;
            updateDisplay();
            refreshHabit(name);
        });

        function updateDisplay() {
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            timeDisplay.textContent = 
                `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }

        refreshHabit(name);
    }

    // Refresh all habits
    function refreshAllHabits() {
        habitsContainer.innerHTML = '';
        habits.forEach(habit => createHabit(habit));
    }

    // Refresh single habit
    function refreshHabit(name) {
        updateHeatmap(name);
        updateMonthLabels(name);
    }

    // Update heatmap
    function updateHeatmap(habitName) {
        const heatmap = document.querySelector(`#${habitName}-heatmap`);
        if (!heatmap) return;
        heatmap.innerHTML = '';

        const allData = JSON.parse(localStorage.getItem(habitName)) || {};
        const yearData = allData[currentYear] || {};
        
        let currentDate = new Date(currentYear, 0, 1);
        const endDate = new Date(currentYear, 11, 31);

        // Adjust to start from Wednesday
        while (currentDate.getDay() !== 3) { // 3 = Wednesday
            currentDate.setDate(currentDate.getDate() - 1);
        }

        // Generate weeks
        while (currentDate <= endDate || currentDate.getFullYear() === currentYear) {
            const weekColumn = document.createElement('div');
            weekColumn.className = 'week-column';

            // Generate days
            for (let i = 0; i < 7; i++) {
                const date = new Date(currentDate);
                if (date.getFullYear() === currentYear) {
                    const dayCell = createDayCell(date, yearData);
                    weekColumn.appendChild(dayCell);
                } else {
                    // Add empty cell for days outside current year
                    const emptyCell = document.createElement('div');
                    emptyCell.className = 'day-cell color-0';
                    weekColumn.appendChild(emptyCell);
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            heatmap.appendChild(weekColumn);
        }
    }

    // Create day cell
    function createDayCell(date, yearData) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';

        const dateString = date.toISOString().split('T')[0];
        const duration = yearData[dateString] || 0;
        const totalMinutes = Math.floor(duration / 60);

        let colorLevel = 0;
        if (duration > 0) {
            if (duration >= 10800) colorLevel = 4;
            else if (duration >= 3600) colorLevel = 3;
            else if (duration >= 1800) colorLevel = 2;
            else colorLevel = 1;
        }

        dayCell.dataset.date = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            weekday: 'short'
        });
        dayCell.dataset.duration = `${totalMinutes} mins`;
        dayCell.classList.add(`color-${colorLevel}`);

        return dayCell;
    }

    // Update month labels - now precisely aligned with first day of month
    function updateMonthLabels(habitName) {
        const monthsContainer = document.querySelector(`#${habitName}-months`);
        if (!monthsContainer) return;
        monthsContainer.innerHTML = '';

        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun',
                          'Jul','Aug','Sep','Oct','Nov','Dec'];
        
        // Find the first Wednesday of the year
        let firstWednesday = new Date(currentYear, 0, 1);
        while (firstWednesday.getDay() !== 3) {
            firstWednesday.setDate(firstWednesday.getDate() + 1);
        }

        monthNames.forEach((month, index) => {
            const firstDayOfMonth = new Date(currentYear, index, 1);
            let firstVisibleDay = new Date(firstDayOfMonth);
            
            // Find the first Wednesday that includes this month
            if (index > 0) {
                while (firstVisibleDay.getDay() !== 3) {
                    firstVisibleDay.setDate(firstVisibleDay.getDate() - 1);
                }
                if (firstVisibleDay.getMonth() !== index) {
                    firstVisibleDay.setDate(firstVisibleDay.getDate() + 7);
                }
            }

            // Calculate week offset from start
            const diffTime = firstVisibleDay - firstWednesday;
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            const weekNumber = Math.floor(diffDays / 7);
            
            const label = document.createElement('div');
            label.className = 'month-label';
            label.textContent = month;
            label.style.left = `${weekNumber * 14 + 7}px`;
            
            monthsContainer.appendChild(label);
        });
    }

    // Save duration
    function saveDuration(habitName, duration) {
        const allData = JSON.parse(localStorage.getItem(habitName)) || {};
        const yearData = allData[currentYear] || {};
        const dateString = new Date().toISOString().split('T')[0];
        
        yearData[dateString] = (yearData[dateString] || 0) + duration;
        allData[currentYear] = yearData;
        localStorage.setItem(habitName, JSON.stringify(allData));
    }

    // Initialize habits
    refreshAllHabits();
});