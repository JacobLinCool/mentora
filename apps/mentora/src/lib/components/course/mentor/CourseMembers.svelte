<script lang="ts">
    import { CircleMinus, CirclePlus, Loader2, X } from "@lucide/svelte";
    import * as m from "$lib/paraglide/messages.js";
    import Table from "$lib/components/ui/Table.svelte";
    import { api } from "$lib/api";
    import { onMount } from "svelte";

    let { courseId }: { courseId: string } = $props();

    type MemberRole = "student" | "auditor" | "instructor" | "ta";
    type Member = {
        id: string;
        name: string;
        email: string;
        joinedDate: string;
        role: MemberRole;
        status: "active" | "invited";
    };

    let members = $state<Member[]>([]);
    let loading = $state(false);
    let mutatingMemberId = $state<string | null>(null);
    let error = $state<string | null>(null);

    onMount(() => {
        void loadMembers();
    });

    async function loadMembers() {
        if (!courseId) return;

        loading = true;
        error = null;

        try {
            const res = await api.courses.getRoster(courseId);
            if (!res.success) {
                error = res.error;
                return;
            }

            const roster = res.data.filter(
                (member) =>
                    (member.status === "active" ||
                        member.status === "invited") &&
                    member.id,
            );

            const mapped = await Promise.all(
                roster.map(async (member) => {
                    let name = member.email.split("@")[0];

                    if (member.userId) {
                        try {
                            const profileRes = await api.users.getProfile(
                                member.userId,
                            );
                            if (
                                profileRes.success &&
                                profileRes.data.displayName
                            ) {
                                name = profileRes.data.displayName;
                            }
                        } catch {
                            // Keep fallback name if profile lookup fails.
                        }
                    }

                    const role =
                        member.role === "student" ||
                        member.role === "auditor" ||
                        member.role === "instructor" ||
                        member.role === "ta"
                            ? member.role
                            : "student";

                    return {
                        id: member.id,
                        name,
                        email: member.email,
                        joinedDate: member.joinedAt
                            ? new Date(member.joinedAt).toLocaleString()
                            : "-",
                        role,
                        status: member.status,
                    } as Member;
                }),
            );

            members = mapped;
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load members";
        } finally {
            loading = false;
        }
    }

    function canToggleRole(member: Member): boolean {
        return member.role === "student" || member.role === "auditor";
    }

    function canRemoveMember(member: Member): boolean {
        return member.role === "student" || member.role === "auditor";
    }

    async function toggleRole(member: Member) {
        if (!courseId || !canToggleRole(member)) return;

        mutatingMemberId = member.id;
        error = null;

        try {
            const nextRole = member.role === "student" ? "auditor" : "student";
            const result = await api.courses.updateMember(courseId, member.id, {
                role: nextRole,
            });

            if (!result.success) {
                error = result.error;
                return;
            }

            await loadMembers();
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to update member";
        } finally {
            mutatingMemberId = null;
        }
    }

    async function removeMember(member: Member) {
        if (!courseId || !canRemoveMember(member)) return;

        if (!confirm(m.course_members_remove())) return;

        mutatingMemberId = member.id;
        error = null;

        try {
            const result = await api.courses.removeMember(courseId, member.id);
            if (!result.success) {
                error = result.error;
                return;
            }

            await loadMembers();
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to remove member";
        } finally {
            mutatingMemberId = null;
        }
    }

    function roleLabel(role: MemberRole): string {
        if (role === "student") return m.course_members_role_student();
        if (role === "auditor") return m.course_members_role_auditor();
        if (role === "instructor") return "Instructor";
        return "TA";
    }
</script>

{#if error}
    <div
        class="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600"
    >
        {error}
    </div>
{/if}

{#if loading}
    <div class="p-8 text-center text-gray-500">Loading...</div>
{:else}
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
{/if}

{#snippet renderCell(item: Member, key: string)}
    {#if key === "role"}
        <div class="font-medium text-gray-600">{roleLabel(item.role)}</div>
    {:else if key === "name"}
        <div class="text-gray-600">{item.name}</div>
    {:else if key === "email"}
        <div class="text-gray-600">{item.email}</div>
    {:else}
        <div class="text-gray-600">{item.joinedDate}</div>
    {/if}
{/snippet}

{#snippet renderActions(member: Member)}
    {#if canToggleRole(member)}
        <button
            class="flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-gray-600 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            onclick={() => toggleRole(member)}
            disabled={mutatingMemberId === member.id}
        >
            {#if mutatingMemberId === member.id}
                <Loader2 size={14} class="animate-spin" />
            {:else if member.role === "student"}
                <CircleMinus size={16} class="fill-gray-600 text-white" />
            {:else}
                <CirclePlus size={16} class="fill-gray-600 text-white" />
            {/if}
            {member.role === "student"
                ? m.course_members_change_to_auditor()
                : m.course_members_change_to_student()}
        </button>
    {/if}

    {#if canRemoveMember(member)}
        <button
            class="flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-gray-600 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            onclick={() => removeMember(member)}
            disabled={mutatingMemberId === member.id}
        >
            <X size={16} class="text-gray-600" />
            {m.course_members_remove()}
        </button>
    {/if}
{/snippet}
