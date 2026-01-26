<script lang="ts">
    import TopBar from "./TopBar.svelte";
    let { children } = $props();
</script>

<div class="min-h-screen bg-[#e5e5e5] text-black">
    <TopBar />
    {@render children()}
</div>
