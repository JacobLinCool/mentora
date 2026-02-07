<script lang="ts">
    import { SvelteDate } from "svelte/reactivity";
    import { ChevronUp, ChevronDown } from "@lucide/svelte";
    import { untrack } from "svelte";

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

    function navigate(weeks: number) {
        anchorDate.setDate(anchorDate.getDate() + weeks * 7);
    }

    // Get today's date
    const today = new SvelteDate();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    // Get two weeks of dates (14 days)
    function getTwoWeeksDates(date: Date | SvelteDate): DateInfo[] {
        // Access via getTime() ensures we track the reactive dependency if 'date' is a SvelteDate
        const current = new SvelteDate(date.getTime());
        const day = current.getDay();
        const diff = current.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new SvelteDate(current.setDate(diff));

        const allDates: DateInfo[] = [];
        for (let i = 0; i < 14; i++) {
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
    function handleDateClick(dateInfo: DateInfo): void {
        if (hasDeadline(dateInfo) && onDateSelect) {
            onDateSelect(dateInfo.fullDate);
        }
    }

    let twoWeeksDates = $derived(getTwoWeeksDates(anchorDate));

    // Get display month/year based on the first day of the view
    let currentMonthYear = $derived(
        twoWeeksDates[0]?.fullDate.toLocaleString("default", {
            month: "long",
            year: "numeric",
        }),
    );
</script>

<div class="relative flex flex-col space-y-2">
    <!-- Header -->
    <div class="flex items-center justify-center py-2">
        <span class="text-sm font-medium tracking-wider text-white/90 uppercase"
            >{currentMonthYear}</span
        >
    </div>

    <!-- Calendar Grid with Overlay Arrows -->
    <div class="group relative py-2">
        <!-- Up Navigation Overlay -->
        <button
            type="button"
            class="absolute top-0 right-0 left-0 z-50 flex h-8 w-full -translate-y-1/2 cursor-pointer items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus:opacity-100"
            onclick={() => navigate(-1)}
            aria-label="Previous week"
        >
            <div
                class="pointer-events-none rounded-full border border-white/5 bg-black/40 p-1 shadow-lg backdrop-blur-sm"
            >
                <ChevronUp class="size-4 text-white" />
            </div>
        </button>

        <div class="space-y-4">
            <!-- First Week -->
            <div class="grid grid-cols-7 gap-2 text-center text-xs md:gap-4">
                {#each dayNames as dayName, index (dayName)}
                    <div>
                        <div class="text-text-secondary mb-2 uppercase">
                            {dayName}
                        </div>
                        <div class="relative">
                            <button
                                class={getButtonClasses(twoWeeksDates[index])}
                                onclick={() =>
                                    handleDateClick(twoWeeksDates[index])}
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
                {#each dayNames as _dayName, index (_dayName)}
                    <div>
                        <div class="relative">
                            <button
                                class={getButtonClasses(
                                    twoWeeksDates[index + 7],
                                )}
                                onclick={() =>
                                    handleDateClick(twoWeeksDates[index + 7])}
                                disabled={!hasDeadline(
                                    twoWeeksDates[index + 7],
                                )}
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

        <!-- Down Navigation Overlay -->
        <button
            type="button"
            class="absolute right-0 bottom-0 left-0 z-50 flex h-8 w-full translate-y-1/2 cursor-pointer items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus:opacity-100"
            onclick={() => navigate(1)}
            aria-label="Next week"
        >
            <div
                class="pointer-events-none rounded-full border border-white/5 bg-black/40 p-1 shadow-lg backdrop-blur-sm"
            >
                <ChevronDown class="size-4 text-white" />
            </div>
        </button>
    </div>
</div>
