<script lang="ts">
    import {
        Copy,
        Upload,
        Trash2,
        RotateCw,
        Save,
        RotateCcw,
        Check,
    } from "@lucide/svelte";
    import * as m from "$lib/paraglide/messages.js";
    import { api, type CourseDoc } from "$lib/api";
    import { onMount } from "svelte";
    import { page } from "$app/state";

    let { courseId = page.params.id } = $props();

    // Initial state for revert functionality
    let savedState = $state({
        courseName: "",
        category: "",
        visibility: "private" as "public" | "private" | "unlisted",
        thumbnail: "",
        code: "",
    });

    let courseName = $state("");
    let category = $state("");
    let visibility = $state<"public" | "private" | "unlisted">("private");
    let code = $state("");
    let thumbnail = $state("");

    let isUploading = $state(false);
    let isCopied = $state(false);
    let loading = $state(false);

    // Derived state to check for unsaved changes
    let isDirty = $derived(
        courseName !== savedState.courseName ||
            category !== savedState.category ||
            visibility !== savedState.visibility ||
            thumbnail !== savedState.thumbnail ||
            code !== savedState.code,
    );

    onMount(() => {
        loadData();
    });

    async function loadData() {
        if (!courseId) return;
        loading = true;
        try {
            const res = await api.courses.get(courseId);
            if (res.success) {
                const c = res.data;
                savedState = {
                    courseName: c.title,
                    category: c.category || "", // Check if category exists in schema
                    visibility: c.visibility || "private",
                    thumbnail: c.thumbnailUrl || "",
                    code: c.code || "",
                };
                handleRevert();
            }
        } catch (e) {
            console.error(e);
        } finally {
            loading = false;
        }
    }

    async function handleSave() {
        if (!courseId) return;
        loading = true;
        try {
            const updates: Partial<Omit<CourseDoc, "ownerId" | "createdAt">> = {
                title: courseName,
                visibility,
            };
            // Only update code if changed, it might fail if duplicate
            if (code !== savedState.code) updates.code = code;
            // If schema supports category/thumbnail:
            // updates.category = category;
            // updates.thumbnailUrl = thumbnail;

            const res = await api.courses.update(courseId, updates);

            if (res.success) {
                savedState.courseName = courseName;
                savedState.category = category;
                savedState.visibility = visibility;
                savedState.thumbnail = thumbnail;
                savedState.code = code;
            } else {
                alert("Failed to update: " + res.error);
            }
        } catch (e) {
            console.error(e);
            alert("Error saving");
        } finally {
            loading = false;
        }
    }

    function handleRevert() {
        courseName = savedState.courseName;
        category = savedState.category;
        visibility = savedState.visibility;
        thumbnail = savedState.thumbnail;
        code = savedState.code;
    }

    let fileInput: HTMLInputElement;

    function handleUpload() {
        fileInput.click();
    }

    function handleFileSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            const file = input.files[0];
            isUploading = true;

            // Create a preview URL
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    thumbnail = e.target.result as string;
                    isUploading = false;
                }
            };
            reader.readAsDataURL(file);
        }
    }

    function handleDeleteThumbnail() {
        thumbnail = "";
    }

    // Password logic likely N/A for this app or needs separate API?
    // Removing generic password handler unless confirming course has password field.
    // Keeping UI clean.

    function handleCopyLink() {
        const joinCode = code || courseId;
        const origin = window.location.origin;
        navigator.clipboard.writeText(`${origin}/join/${joinCode}`);
        isCopied = true;
        setTimeout(() => {
            isCopied = false;
        }, 2000);
    }
</script>

<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
    <!-- Left Column: Course Details -->
    <div class="space-y-8 lg:col-span-2">
        <div
            class="rounded-2xl border border-gray-100 bg-[#F5F5F5] p-8 shadow-sm"
        >
            <h3 class="mb-6 text-xl font-semibold text-gray-900">
                {m.course_settings_basic_info()}
            </h3>

            <div class="space-y-6">
                <!-- Course Name -->
                <div class="space-y-2">
                    <label
                        for="course-name"
                        class="text-sm font-medium text-gray-700"
                        >{m.course_settings_name()}</label
                    >
                    <input
                        id="course-name"
                        type="text"
                        bind:value={courseName}
                        class="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-900 focus:bg-white focus:ring-0 focus:outline-none"
                    />
                </div>

                <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <!-- Category -->
                    <div class="space-y-2">
                        <label
                            for="course-category"
                            class="text-sm font-medium text-gray-700"
                            >{m.course_settings_category()}</label
                        >
                        <select
                            id="course-category"
                            bind:value={category}
                            class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-gray-900 transition-colors focus:border-gray-900 focus:ring-0 focus:outline-none"
                        >
                            <option value="" disabled selected></option>
                            <option value="math"
                                >{m.course_settings_category_math()}</option
                            >
                            <option value="science"
                                >{m.course_settings_category_science()}</option
                            >
                        </select>
                    </div>

                    <!-- Visibility -->
                    <div class="space-y-2">
                        <label
                            for="course-visibility"
                            class="text-sm font-medium text-gray-700"
                            >{m.course_settings_visibility()}</label
                        >
                        <div class="relative">
                            <select
                                id="course-visibility"
                                bind:value={visibility}
                                class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-gray-900 transition-colors focus:border-gray-900 focus:ring-0 focus:outline-none"
                            >
                                <option value="public"
                                    >{m.course_settings_visibility_public()}</option
                                >
                                <option value="private"
                                    >{m.course_settings_visibility_private()}</option
                                >
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Thumbnail -->
                <div class="space-y-3 pt-2">
                    <span class="text-sm font-medium text-gray-700"
                        >{m.course_settings_thumbnail()}</span
                    >
                    <div class="flex flex-col gap-6 sm:flex-row">
                        <div
                            class="h-40 w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100 sm:w-64"
                        >
                            {#if thumbnail}
                                <img
                                    src={thumbnail}
                                    alt="Course Thumbnail"
                                    class="h-full w-full object-cover"
                                />
                            {:else}
                                <div
                                    class="flex h-full w-full items-center justify-center bg-gray-200 text-gray-500"
                                >
                                    No Image
                                </div>
                            {/if}
                        </div>
                        <div class="flex flex-col justify-center gap-3">
                            <input
                                bind:this={fileInput}
                                type="file"
                                accept="image/*"
                                class="hidden"
                                onchange={handleFileSelect}
                            />
                            <button
                                onclick={handleUpload}
                                disabled={isUploading}
                                class="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 sm:w-auto"
                            >
                                <Upload size={16} />
                                {isUploading
                                    ? m.course_settings_uploading()
                                    : m.course_settings_upload()}
                            </button>
                            <button
                                onclick={handleDeleteThumbnail}
                                class="flex w-full items-center gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 sm:w-auto"
                            >
                                <Trash2 size={16} />
                                {m.course_settings_delete()}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Right Column: Course Access -->
    <div class="space-y-8">
        <div
            class="rounded-2xl border border-gray-100 bg-[#F5F5F5] p-8 shadow-sm"
        >
            <h3 class="mb-6 text-xl font-semibold text-gray-900">
                {m.course_settings_access()}
            </h3>

            <div class="space-y-6">
                <!-- QR Code -->
                <div
                    class="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 py-6"
                >
                    <div class="bg-white p-2 shadow-sm">
                        <img
                            src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Example"
                            alt="QR Code"
                            class="h-32 w-32"
                        />
                    </div>
                    <span class="text-xs font-medium text-gray-500"
                        >{m.course_settings_scan_qr()}</span
                    >
                </div>

                <div class="h-px bg-gray-100"></div>

                <!-- Join Link -->
                <div class="space-y-2">
                    <span class="text-sm font-medium text-gray-700"
                        >{m.course_settings_join_link()}</span
                    >
                    <div class="flex gap-2">
                        <div
                            class="flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
                        >
                            {window.location.origin}/join/{code || courseId}
                        </div>
                        <button
                            onclick={handleCopyLink}
                            class="flex cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition-all duration-200 hover:bg-gray-50"
                            class:!bg-green-50={isCopied}
                            class:!text-green-600={isCopied}
                            class:!border-green-200={isCopied}
                            title={isCopied
                                ? m.course_settings_copied()
                                : m.course_settings_copy_link()}
                        >
                            {#if isCopied}
                                <Check size={18} />
                            {:else}
                                <Copy size={18} />
                            {/if}
                        </button>
                    </div>
                </div>

                <!-- Password -->
                <div class="space-y-2">
                    <span class="text-sm font-medium text-gray-700"
                        >{m.course_settings_password()}</span
                    >
                    <div
                        class="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
                    >
                        <span
                            class="font-mono text-xl font-bold tracking-wider text-gray-800"
                            >{password}</span
                        >
                        <button
                            onclick={handleResetPassword}
                            class="flex cursor-pointer items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200"
                        >
                            <RotateCw size={14} />
                            {m.course_settings_reset_password()}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

{#if isDirty}
    <div class="fixed top-24 right-8 z-40 flex items-center gap-4">
        <span class="text-xs font-medium text-gray-500">
            {m.course_settings_unsaved_changes()}
        </span>
        <div class="flex items-center gap-2">
            <button
                onclick={handleRevert}
                class="flex cursor-pointer items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200"
            >
                <RotateCcw size={14} />
                {m.course_settings_revert()}
            </button>
            <button
                onclick={handleSave}
                disabled={loading}
                class="flex cursor-pointer items-center gap-2 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
                {#if loading}
                    Saving...
                {:else}
                    <Save size={14} />
                    {m.course_settings_save()}
                {/if}
            </button>
        </div>
    </div>
{/if}
