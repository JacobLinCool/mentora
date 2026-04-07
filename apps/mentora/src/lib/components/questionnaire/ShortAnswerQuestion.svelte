<script lang="ts">
    interface Props {
        question: string;
        placeholder?: string;
        maxLength?: number;
        value?: string;
        onAnswer: (value: string) => void;
    }

    let {
        question,
        placeholder = "輸入您的答案...",
        maxLength,
        value = "",
        onAnswer,
    }: Props = $props();

    function handleInput(event: Event) {
        const target = event.target as HTMLTextAreaElement;
        onAnswer(target.value);
    }
</script>

<div class="w-full">
    <h2
        class="mb-6 text-[1.35rem] leading-[1.45] font-semibold text-white md:text-[1.55rem]"
    >
        {question}
    </h2>

    <div class="relative">
        <textarea
            class="min-h-[120px] w-full resize-y rounded-xl bg-white/8 px-5 py-4 text-base text-[#f5f5f5] transition-all duration-200 placeholder:text-[#dfdfdf] focus:ring-0 focus:outline-none"
            {placeholder}
            maxlength={maxLength}
            {value}
            oninput={handleInput}
            rows="4"
        ></textarea>
        {#if maxLength}
            <div class="absolute right-4 bottom-3 text-xs text-[#d9d9d9]">
                <span
                    class={value.length > maxLength * 0.9
                        ? "text-[#f0f0f0]"
                        : ""}
                >
                    {value.length}
                </span>
                / {maxLength}
            </div>
        {/if}
    </div>
</div>
