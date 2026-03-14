<script lang="ts">
    import { SvelteDate } from "svelte/reactivity";
    import { ChevronLeft } from "@lucide/svelte";
    import { untrack } from "svelte";
    import { fly } from "svelte/transition";

    interface DateInfo {
        date: number;
        month: number;
        year: number;
        fullDate: SvelteDate;
    }

    interface Props {
        selectedDate?: Date | SvelteDate;
        deadlineDates?: (Date | SvelteDate)[];
        onDateSelect?: (date: SvelteDate) => void;
    }

    let {
        selectedDate = new SvelteDate(),
        deadlineDates = [],
        onDateSelect,
    }: Props = $props();

    const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

    // Anchor Date derived from selectedDate, but can be manually shifted
    // Use SvelteDate for fine-grained reactivity and compatibility with Svelte 5 linting
    const anchorDate = new SvelteDate(untrack(() => selectedDate));

    // Watch selectedDate changes to update anchor
    $effect(() => {
        if (selectedDate) {
            anchorDate.setTime(selectedDate.getTime());
        }
    });

    // Animation state
    let slideDirection = $state<1 | -1>(1);

    function navigate(weeks: number) {
        slideDirection = weeks > 0 ? 1 : -1;
        anchorDate.setDate(anchorDate.getDate() + weeks * 7);
    }

    // Get today's date
    const today = new SvelteDate();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    // Get one week of dates (7 days)
    function getOneWeekDates(date: Date | SvelteDate): DateInfo[] {
        // Access via getTime() ensures we track the reactive dependency if 'date' is a SvelteDate
        const current = new SvelteDate(date.getTime());
        const day = current.getDay();
        const diff = current.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new SvelteDate(current.setDate(diff));

        const allDates: DateInfo[] = [];
        for (let i = 0; i < 7; i++) {
            const dateObj = new SvelteDate(monday);
            dateObj.setDate(monday.getDate() + i);
            allDates.push({
                date: dateObj.getDate(),
                month: dateObj.getMonth(),
                year: dateObj.getFullYear(),
                fullDate: new SvelteDate(dateObj),
            });
        }
        return allDates;
    }

    // Check if a date has a deadline
    function hasDeadline(dateInfo: DateInfo): boolean {
        return deadlineDates.some((d) => {
            const deadlineDate = new SvelteDate(d);
            return (
                deadlineDate.getDate() === dateInfo.date &&
                deadlineDate.getMonth() === dateInfo.month &&
                deadlineDate.getFullYear() === dateInfo.year
            );
        });
    }

    // Check if a date is today
    function isToday(dateInfo: DateInfo): boolean {
        return (
            dateInfo.date === todayDay &&
            dateInfo.month === todayMonth &&
            dateInfo.year === todayYear
        );
    }

    // Check if a date is selected
    function isSelected(dateInfo: DateInfo): boolean {
        return (
            dateInfo.date === selectedDate.getDate() &&
            dateInfo.month === selectedDate.getMonth() &&
            dateInfo.year === selectedDate.getFullYear()
        );
    }

    // Get button style classes
    function getButtonClasses(dateInfo: DateInfo): string {
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
                "border border-white bg-transparent text-white font-bold ";
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
    function handleDateClick(dateInfo: DateInfo): void {
        if (hasDeadline(dateInfo) && onDateSelect) {
            onDateSelect(dateInfo.fullDate);
        }
    }

    let oneWeekDates = $derived(getOneWeekDates(anchorDate));

    // Get display month/year based on the first day of the view
    let currentMonthYear = $derived(
        oneWeekDates[0]?.fullDate.toLocaleString("default", {
            month: "long",
            year: "numeric",
        }),
    );
    // Calculate the week number of the year for the current anchor date
    let weekNumber = $derived.by(() => {
        const d = new SvelteDate(
            Date.UTC(
                anchorDate.getFullYear(),
                anchorDate.getMonth(),
                anchorDate.getDate(),
            ),
        );
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new SvelteDate(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil(
            ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
        );
        return weekNo;
    });

    let touchStartX = 0;
    let touchEndX = 0;

    function handleTouchStart(e: TouchEvent) {
        touchStartX = e.changedTouches[0].screenX;
    }

    function handleTouchEnd(e: TouchEvent) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }

    function handleSwipe() {
        const swipeDistance = touchEndX - touchStartX;
        const minSwipeDistance = 50;

        if (swipeDistance > minSwipeDistance) {
            navigate(-1);
        } else if (swipeDistance < -minSwipeDistance) {
            navigate(1);
        }
    }
</script>

<div class="relative flex flex-col space-y-2">
    <!-- Header -->
    <div class="flex items-center justify-center gap-2 py-2">
        <span
            class="text-sm font-medium tracking-wider text-white/90 uppercase"
        >
            {currentMonthYear}
        </span>
        <span class="text-sm font-medium text-white/40">•</span>
        <span class="text-sm font-medium tracking-wider text-white/60">
            WEEK {weekNumber.toString().padStart(2, "0")}
        </span>
    </div>

    <!-- Calendar Grid with Overlay Arrows -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="group relative flex items-center py-2"
        ontouchstart={handleTouchStart}
        ontouchend={handleTouchEnd}
    >
        <!-- Left Navigation Overlay -->
        <button
            type="button"
            class="absolute left-0 z-50 flex h-full w-8 -translate-x-2 cursor-pointer items-center justify-start opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus:opacity-100"
            onclick={() => navigate(-1)}
            aria-label="Previous week"
        >
            <div
                class="pointer-events-none rounded-full border border-white/5 bg-black/40 p-1 shadow-lg backdrop-blur-sm"
            >
                <ChevronLeft class="size-4 text-white" />
            </div>
        </button>

        <div class="relative h-[72px] w-full overflow-hidden">
            {#key anchorDate.getTime()}
                <div
                    class="absolute inset-0 grid w-full grid-cols-7 gap-1 px-2 text-center text-xs md:gap-4"
                    in:fly={{
                        x: slideDirection * 100,
                        duration: 300,
                    }}
                    out:fly={{
                        x: -slideDirection * 100,
                        duration: 300,
                    }}
                >
                    {#each dayNames as dayName, index (dayName)}
                        <div class="flex flex-col items-center">
                            <div
                                class="text-text-secondary mb-3 text-[10px] font-medium tracking-wider uppercase"
                            >
                                {dayName}
                            </div>
                            <div class="relative flex w-full justify-center">
                                <button
                                    class={getButtonClasses(
                                        oneWeekDates[index],
                                    )}
                                    onclick={() =>
                                        handleDateClick(oneWeekDates[index])}
                                    disabled={!hasDeadline(oneWeekDates[index])}
                                >
                                    {oneWeekDates[index].date}
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/key}
        </div>
    </div>
</div>
