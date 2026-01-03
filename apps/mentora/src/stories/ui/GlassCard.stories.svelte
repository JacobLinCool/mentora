<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import GlassCard from "$lib/components/ui/GlassCard.svelte";

    const { Story } = defineMeta({
        title: "UI/GlassCard",
        component: GlassCard,
        argTypes: {
            className: { control: "text" },
        },
    });
</script>

<Story name="Default">
    <div class="bg-canvas-deep p-10">
        <GlassCard>
            <h2 class="mb-2 text-xl font-bold text-white">Card Title</h2>
            <p class="text-text-secondary">This is a glass card content.</p>
        </GlassCard>
    </div>
</Story>

<Story name="With Complex Content">
    <div class="bg-canvas-deep p-10">
        <GlassCard>
            <div class="mb-4 flex items-center gap-4">
                <div class="bg-brand-gold/20 h-10 w-10 rounded-full"></div>
                <div>
                    <h3 class="font-bold text-white">Analysis Complete</h3>
                    <div class="text-brand-gold text-xs">Just now</div>
                </div>
            </div>
            <p class="text-white/80">
                Your argument has strong logical consistency.
            </p>
        </GlassCard>
    </div>
</Story>
