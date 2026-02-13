<script lang="ts">
    import { CircleMinus, CirclePlus, X } from "@lucide/svelte";
    import * as m from "$lib/paraglide/messages.js";
    import Table from "$lib/components/ui/Table.svelte";
    import { api } from "$lib/api";
    import { onMount } from "svelte";

    let { courseId }: { courseId: string } = $props();

    // UI Data Structure
    type Member = {
        id: string; // doc ID
        name: string;
        email: string;
        joinedDate: string;
        role: "student" | "auditor" | "instructor" | "ta" | "owner";
    };

    let members = $state<Member[]>([]);
    let loading = $state(false);

    onMount(() => {
        loadMembers();
    });

    async function loadMembers() {
        if (!courseId) return;
        loading = true;
        try {
            const res = await api.courses.getRoster(courseId);
            if (res.success) {
                // We need to fetch user profiles to get names
                // For "invited" members (no userId), use email as name
                const roster = res.data.filter(
                    (m) => m.status === "active" || m.status === "invited",
                );

                const memberPromises = roster.map(async (r) => {
                    let name = r.email.split("@")[0]; // Fallback

                    if (r.userId) {
                        try {
                            const profileRes = await api.users.getProfile(
                                r.userId,
                            );
                            if (
                                profileRes.success &&
                                profileRes.data.displayName
                            ) {
                                name = profileRes.data.displayName;
                            }
                        } catch {
                            // ignore
                        }
                    }

                    const role: Member["role"] =
                        r.role === "student" ||
                        r.role === "auditor" ||
                        r.role === "instructor" ||
                        r.role === "ta" ||
                        r.role === "owner"
                            ? r.role
                            : "student";

                    return {
                        id: r.userId || r.email, // Use userId or email as key if docId not available in return type (wait, getCourseRoster returns schema objects which might not have doc ID if schema doesn't include it?)
                        // getCourseRoster returns schema.parse(data). Does schema include ID?
                        // Looking at mentora-firebase schema... it typically doesn't include document ID field mixed in unless explicitly added.
                        // However, api.courses.ts implementation: snapshot.docs.map(doc => Courses.roster.schema.parse(doc.data()))
                        // It DOES NOT map doc.id.
                        // I might need to rely on email/userId as unique key for now (usually email is unique in roster).
                        // Refatoring to iterate: we need doc IDs to update.
                        // But wait! api.courses.updateMember takes memberId. unique doc ID.
                        // I NEED the memberId (roster doc ID).
                        // The current API implementation of `getCourseRoster` seems to DROP the doc ID?
                        // Let me check mentora-api/.../courses.ts again carefully.
                        // line 108: return snapshot.docs.map((doc) => Courses.roster.schema.parse(doc.data()));
                        // YES. It drops the ID. This is a BUG/Limitation in backend API wrapper.
                        // I cannot fix backend files.
                        // So I cannot call updateMember correctly without memberId.
                        // BUT, maybe I can find memberId by query? `updateMember` implementation takes memberId.
                        // Oh, `inviteMember` returns memberId.
                        // `getCourseRoster` is insufficient for management.
                        // Workaround: I can't really do management without IDs.
                        // I will assume for now I cannot fully implement toggle/remove without fixing backend.
                        // But I must not change backend.
                        // I will implement read-only for now and add a TODO log.
                        name: name,
                        email: r.email,
                        joinedDate: r.joinedAt
                            ? new Date(r.joinedAt).toLocaleString()
                            : "-",
                        role,
                    };
                });

                members = await Promise.all(memberPromises);
            }
        } catch (e) {
            console.error(e);
        } finally {
            loading = false;
        }
    }

    async function toggleRole(member: Member) {
        console.log("Toggle role for", member);
        // Limitation: We don't have the roster Doc ID (memberId) because getCourseRoster doesn't return it.
        // We cannot call api.courses.updateMember(courseId, memberId, ...) reliably.
        alert("Feature unavailable: API does not return Member ID.");
    }

    async function removeMember(id: string) {
        console.log("Remove member", id);
        // Same limitation
        alert("Feature unavailable: API does not return Member ID.");
    }
</script>

<!-- Members Table -->
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
