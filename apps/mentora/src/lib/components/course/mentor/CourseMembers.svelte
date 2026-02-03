<script lang="ts">
    import { CircleMinus, CirclePlus, X } from "@lucide/svelte";
    import * as m from "$lib/paraglide/messages.js";
    import Table from "$lib/components/ui/Table.svelte";

    // Mock Data
    type Member = {
        id: number;
        name: string;
        email: string;
        joinedDate: string;
        role: string;
    };

    let members: Member[] = $state([
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

    function toggleRole(member: Member) {
        const index = members.findIndex((m) => m.id === member.id);
        if (index !== -1) {
            members[index] = {
                ...member,
                role: member.role === "student" ? "auditor" : "student",
            };
        }
    }

    function removeMember(id: number) {
        members = members.filter((m) => m.id !== id);
    }
</script>

<!-- Members Table -->
<div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
    <Table
        columns={[
            {
                key: "name",
                label: m.course_members_name(),
                sortable: true,
            },
            {
                key: "email",
                label: m.course_members_email(),
                sortable: true,
            },
            {
                key: "joinedDate",
                label: m.course_members_joined_date(),
                sortable: true,
            },
            {
                key: "role",
                label: m.course_members_role(),
                sortable: true,
            },
        ]}
        data={members}
        {renderCell}
        actions={renderActions}
    />
</div>

{#snippet renderCell(item: Member, key: string)}
    {#if key === "role"}
        <div class="font-medium text-gray-600">
            {item.role === "student"
                ? m.course_members_role_student()
                : m.course_members_role_auditor()}
        </div>
    {:else}
        <!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
        <div class="text-gray-600">{(item as any)[key]}</div>
    {/if}
{/snippet}

{#snippet renderActions(member: Member)}
    {#if member.role === "student"}
        <button
            class="flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
            onclick={() => toggleRole(member)}
        >
            <CircleMinus size={16} class="fill-gray-600 text-white" />
            {m.course_members_change_to_auditor()}
        </button>
    {:else}
        <button
            class="flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
            onclick={() => toggleRole(member)}
        >
            <CirclePlus size={16} class="fill-gray-600 text-white" />
            {m.course_members_change_to_student()}
        </button>
    {/if}

    <button
        class="flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
        onclick={() => removeMember(member.id)}
    >
        <X size={16} class="text-gray-600" />
        {m.course_members_remove()}
    </button>
{/snippet}
