<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { FileText, ArrowLeft } from "@lucide/svelte";
    import PageHead from "$lib/components/PageHead.svelte";
    import BaseLayout from "$lib/components/layout/BaseLayout.svelte";
    import GlassCard from "$lib/components/ui/GlassCard.svelte";
    import CosmicButton from "$lib/components/ui/CosmicButton.svelte";
</script>

<PageHead title={m.terms_title()} description={m.terms_intro()} />

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
                    <FileText class="text-brand-gold h-6 w-6" />
                </div>
                <div>
                    <h1 class="font-serif text-3xl text-white">
                        {m.terms_title()}
                    </h1>
                    <p class="text-text-secondary text-sm">
                        {m.terms_last_updated()}: January 1, 2026
                    </p>
                </div>
            </div>

            <p class="text-text-secondary mb-8 leading-relaxed font-light">
                {m.terms_intro()}
            </p>

            <div class="space-y-8">
                <section>
                    <h2 class="mb-3 font-serif text-xl text-white">
                        {m.terms_section_1_title()}
                    </h2>
                    <p class="text-text-secondary leading-relaxed font-light">
                        {m.terms_section_1_content()}
                    </p>
                </section>

                <section>
                    <h2 class="mb-3 font-serif text-xl text-white">
                        {m.terms_section_2_title()}
                    </h2>
                    <p class="text-text-secondary leading-relaxed font-light">
                        {m.terms_section_2_content()}
                    </p>
                </section>

                <section>
                    <h2 class="mb-3 font-serif text-xl text-white">
                        {m.terms_section_3_title()}
                    </h2>
                    <p class="text-text-secondary leading-relaxed font-light">
                        {m.terms_section_3_content()}
                    </p>
                </section>

                <section>
                    <h2 class="mb-3 font-serif text-xl text-white">
                        {m.terms_section_4_title()}
                    </h2>
                    <p class="text-text-secondary leading-relaxed font-light">
                        {m.terms_section_4_content()}
                    </p>
                </section>

                <section>
                    <h2 class="mb-3 font-serif text-xl text-white">
                        {m.terms_section_5_title()}
                    </h2>
                    <p class="text-text-secondary leading-relaxed font-light">
                        {m.terms_section_5_content()}
                    </p>
                </section>
            </div>
        </GlassCard>
    </div>
</BaseLayout>
