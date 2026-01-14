<script>
    let {
        selectedDate = new Date(),
        deadlineDates = [],
        onDateSelect,
    } = $props();

    const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

    // Get today's date
    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    // Get two weeks of dates (14 days)
    function getTwoWeeksDates(date) {
        const current = new Date(date);
        const day = current.getDay();
        const diff = current.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(current.setDate(diff));

        const allDates = [];
        for (let i = 0; i < 14; i++) {
            const dateObj = new Date(monday);
            dateObj.setDate(monday.getDate() + i);
            allDates.push({
                date: dateObj.getDate(),
                month: dateObj.getMonth(),
                year: dateObj.getFullYear(),
                fullDate: new Date(dateObj),
            });
        }
        return allDates;
    }

    // Check if a date has a deadline
    function hasDeadline(dateInfo) {
        return deadlineDates.some((d) => {
            const deadlineDate = new Date(d);
            return (
                deadlineDate.getDate() === dateInfo.date &&
                deadlineDate.getMonth() === dateInfo.month &&
                deadlineDate.getFullYear() === dateInfo.year
            );
        });
    }

    // Check if a date is today
    function isToday(dateInfo) {
        return (
            dateInfo.date === todayDay &&
            dateInfo.month === todayMonth &&
            dateInfo.year === todayYear
        );
    }

    // Check if a date is selected
    function isSelected(dateInfo) {
        return (
            dateInfo.date === selectedDate.getDate() &&
            dateInfo.month === selectedDate.getMonth() &&
            dateInfo.year === selectedDate.getFullYear()
        );
    }

    // Get button style classes
    function getButtonClasses(dateInfo) {
        const isTodayDate = isToday(dateInfo);
        const isSelectedDate = isSelected(dateInfo);
        const hasDeadlineDate = hasDeadline(dateInfo);

        let classes =
            "w-8 h-8 mx-auto rounded-full flex items-center justify-center transition-all ";

        if (isTodayDate) {
            // Today: solid white background
            classes += "bg-white text-canvas-deep font-bold ";
        } else if (isSelectedDate) {
            // Selected: white outline with transparent background
            classes +=
                "border-2 border-white bg-transparent text-white font-bold ";
        } else {
            // Normal
            classes += "text-text-primary ";
        }

        if (hasDeadlineDate) {
            classes += "cursor-pointer hover:bg-white/20";
        } else {
            classes += "cursor-default";
        }

        return classes;
    }

    // Handle date click
    function handleDateClick(dateInfo) {
        if (hasDeadline(dateInfo) && onDateSelect) {
            onDateSelect(dateInfo.fullDate);
        }
    }

    const twoWeeksDates = getTwoWeeksDates(selectedDate);
</script>

<div class="space-y-4">
    <!-- First Week -->
    <div class="grid grid-cols-7 gap-2 text-center text-xs md:gap-4">
        {#each dayNames as dayName, index}
            <div>
                <div class="text-text-secondary mb-2 uppercase">{dayName}</div>
                <div class="relative">
                    <button
                        class={getButtonClasses(twoWeeksDates[index])}
                        onclick={() => handleDateClick(twoWeeksDates[index])}
                        disabled={!hasDeadline(twoWeeksDates[index])}
                    >
                        {twoWeeksDates[index].date}
                    </button>
                    {#if hasDeadline(twoWeeksDates[index])}
                        <div
                            class="bg-brand-gold absolute top-0 right-0 h-2 w-2 rounded-full"
                        ></div>
                    {/if}
                </div>
            </div>
        {/each}
    </div>

    <!-- Second Week -->
    <div class="grid grid-cols-7 gap-2 text-center text-xs md:gap-4">
        {#each dayNames as dayName, index}
            <div>
                <div class="relative">
                    <button
                        class={getButtonClasses(twoWeeksDates[index + 7])}
                        onclick={() =>
                            handleDateClick(twoWeeksDates[index + 7])}
                        disabled={!hasDeadline(twoWeeksDates[index + 7])}
                    >
                        {twoWeeksDates[index + 7].date}
                    </button>
                    {#if hasDeadline(twoWeeksDates[index + 7])}
                        <div
                            class="bg-brand-gold absolute top-0 right-0 h-2 w-2 rounded-full"
                        ></div>
                    {/if}
                </div>
            </div>
        {/each}
    </div>
</div>
