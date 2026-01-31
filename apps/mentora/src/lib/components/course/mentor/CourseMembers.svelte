<script lang="ts">
    import { CircleMinus, X } from "@lucide/svelte";
    import * as m from "$lib/paraglide/messages.js";
    import Pagination from "./Pagination.svelte";

    // Mock Data
    let members = $state([
        {
            id: 1,
            name: "王小紀",
            email: "jui@gmail.com",
            joinedDate: "2026.01.14 23:59",
            role: "student",
        },
        {
            id: 2,
            name: "王小博",
            email: "bao@gmail.com",
            joinedDate: "2026.01.14 23:59",
            role: "student",
        },
        {
            id: 3,
            name: "王小文",
            email: "wen@gmail.com",
            joinedDate: "2026.01.14 23:59",
            role: "auditor",
        },
        {
            id: 4,
            name: "王小明",
            email: "ming@gmail.com",
            joinedDate: "2026.01.14 23:59",
            role: "auditor",
        },
    ]);

    let currentPage = $state(1);
    let pageSize = 10;
    let paginatedMembers = $derived(
        members.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    );
</script>

<!-- Members Table -->
<div
    class="overflow-hidden rounded-xl border border-gray-100 bg-[#F5F5F5] shadow-sm"
>
    <!-- Header -->
    <div
        class="grid grid-cols-[1fr_2fr_1.5fr_0.8fr_2fr] border-b border-gray-200/50 p-6 font-semibold text-gray-500"
    >
        <div>{m.course_members_name()}</div>
        <div>{m.course_members_email()}</div>
        <div>{m.course_members_joined_date()}</div>
        <div>{m.course_members_role()}</div>
        <div></div>
    </div>

    <!-- Rows -->
    <div class="flex flex-col divide-y divide-gray-200/50">
        {#each paginatedMembers as member (member.id)}
            <div
                class="grid grid-cols-[1fr_2fr_1.5fr_0.8fr_2fr] items-center p-6 transition-colors hover:bg-gray-50"
            >
                <div class="text-gray-600">{member.name}</div>
                <div class="text-gray-600">{member.email}</div>
                <div class="text-gray-600">{member.joinedDate}</div>
                <div class="font-medium text-gray-600">
                    {member.role === "student"
                        ? m.course_members_role_student()
                        : m.course_members_role_auditor()}
                </div>
                <div class="flex justify-end gap-3 text-gray-500">
                    {#if member.role === "student"}
                        <button
                            class="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
                        >
                            <CircleMinus
                                size={16}
                                class="fill-gray-600 text-white"
                            />
                            {m.course_members_change_to_auditor()}
                        </button>
                    {:else}
                        <button
                            class="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
                        >
                            <!-- <CirclePlus
                                size={16}
                                class="fill-gray-600 text-white"
                            /> -->
                            {m.course_members_change_to_student()}
                        </button>
                    {/if}

                    <button
                        class="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
                    >
                        <X size={16} class="text-gray-600" />
                        {m.course_members_remove()}
                    </button>
                </div>
            </div>
        {/each}
    </div>
</div>

<!-- Pagination -->
<div class="mt-6 flex justify-center">
    <div class="mt-6 flex justify-center">
        <Pagination bind:currentPage totalCount={members.length} {pageSize} />
    </div>
</div>
