<script lang="ts">
    import BaseLayout from "$lib/components/layout/BaseLayout.svelte";
    import { m } from "$lib/paraglide/messages";

    let { children } = $props();
</script>

<BaseLayout>
    <div class="container mx-auto max-w-4xl px-4 py-12">
        <!-- Settings Header -->
        <div class="mb-10">
            <div
                class="text-text-secondary mb-2 text-sm font-medium tracking-wide uppercase"
            >
                {m.settings_account()}
            </div>
            <h1 class="font-serif text-4xl text-white">{m.settings_title()}</h1>
        </div>

        <!-- Content -->
        {@render children?.()}
    </div>
</BaseLayout>
