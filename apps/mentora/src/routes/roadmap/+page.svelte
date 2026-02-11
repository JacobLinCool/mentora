<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { Map, ArrowLeft } from "@lucide/svelte";
    import PageHead from "$lib/components/PageHead.svelte";
    import BaseLayout from "$lib/components/layout/BaseLayout.svelte";
    import GlassCard from "$lib/components/ui/GlassCard.svelte";
    import CosmicButton from "$lib/components/ui/CosmicButton.svelte";
</script>

<PageHead title={m.roadmap_title()} description={m.roadmap_description()} />

<BaseLayout>
    <div class="container mx-auto max-w-4xl px-4 py-12">
        <CosmicButton href="/" variant="secondary" className="py-2! px-3! mb-6">
            <ArrowLeft class="me-2 h-4 w-4" />
            {m.back()}
        </CosmicButton>

        <GlassCard className="animate-slide-up">
            <div class="mb-8 flex items-center gap-4">
                <div
                    class="bg-brand-gold/10 flex h-12 w-12 items-center justify-center rounded-full"
                >
                    <Map class="text-brand-gold h-6 w-6" />
                </div>
                <div>
                    <h1 class="font-serif text-3xl text-white">
                        {m.roadmap_title()}
                    </h1>
                    <span
                        class="bg-brand-gold/15 text-brand-gold mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-medium"
                    >
                        {m.roadmap_coming_soon()}
                    </span>
                </div>
            </div>

            <p class="text-text-secondary leading-relaxed font-light">
                {m.roadmap_description()}
            </p>
        </GlassCard>
    </div>
</BaseLayout>
