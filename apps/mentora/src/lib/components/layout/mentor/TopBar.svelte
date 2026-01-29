<script lang="ts">
    import { Bell, Settings, CircleUser } from "@lucide/svelte";
</script>

<div
    class="flex items-center justify-between bg-[#494949] px-8 py-4 text-white"
>
    <h1 class="font-serif-tc text-xl font-bold tracking-wide">Mentora</h1>
    <div class="flex items-center gap-4">
        <button
            class="cursor-pointer hover:text-gray-200"
            aria-label="Notifications"><Bell size={20} /></button
        >
        <button class="cursor-pointer hover:text-gray-200" aria-label="Settings"
            ><Settings size={20} /></button
        >
        <button
            class="cursor-pointer hover:text-gray-200"
            aria-label="User Profile"><CircleUser size={24} /></button
        >
    </div>
</div>
