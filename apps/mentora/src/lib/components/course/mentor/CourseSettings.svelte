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
    import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
    import { storage } from "$lib/firebase";
    import * as m from "$lib/paraglide/messages";
    import { api, type CourseDoc } from "$lib/api";
    import { onMount } from "svelte";
    import { page } from "$app/state";

    let { courseId = page.params.id } = $props();

    // Initial state for revert functionality
    let savedState = $state({
        courseName: "",
        visibility: "private" as "public" | "private",
        thumbnail: "",
        code: "",
    });

    let courseName = $state("");
    let visibility = $state<"public" | "private">("private");
    let code = $state("");
    let thumbnail = $state("");
    let selectedFile = $state<File | null>(null);

    let isUploading = $state(false);
    let isCopied = $state(false);
    let loading = $state(false);
    let saveError = $state<string | null>(null);

    // Derived state to check for unsaved changes
    let isDirty = $derived(
        courseName !== savedState.courseName ||
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
                    visibility: c.visibility || "private",
                    thumbnail: c.thumbnail?.url || "",
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
        saveError = null;
        try {
            const updates: Partial<Omit<CourseDoc, "ownerId" | "createdAt">> = {
                title: courseName,
                visibility,
            };
            // Only update code if changed, it might fail if duplicate
            if (code !== savedState.code) updates.code = code;

            // Handle thumbnail upload
            if (selectedFile) {
                const storagePath = `courses/${courseId}/thumbnail/${selectedFile.name}`;
                const storageRef = ref(storage, storagePath);
                await uploadBytes(storageRef, selectedFile);
                const url = await getDownloadURL(storageRef);
                updates.thumbnail = { storagePath, url };
            } else if (savedState.thumbnail && !thumbnail) {
                // Thumbnail was cleared
                updates.thumbnail = null;
            }

            const res = await api.courses.update(courseId, updates);

            if (res.success) {
                savedState.courseName = courseName;
                savedState.visibility = visibility;
                savedState.thumbnail = thumbnail;
                savedState.code = code;
                selectedFile = null;
            } else {
                saveError = `${m.courses_error()}: ${res.error}`;
            }
        } catch (e) {
            console.error(e);
            saveError = m.course_settings_save_failed();
        } finally {
            loading = false;
        }
    }

    function handleRevert() {
        courseName = savedState.courseName;
        visibility = savedState.visibility;
        thumbnail = savedState.thumbnail;
        code = savedState.code;
        selectedFile = null;
    }

    let fileInput: HTMLInputElement;

    function handleUpload() {
        fileInput.click();
    }

    function handleFileSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            const file = input.files[0];
            selectedFile = file;
            isUploading = true;

            // Create a data URL for preview
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
        selectedFile = null;
    }

    let password = $derived(code || "------");

    function handleResetPassword() {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const buffer = new Uint32Array(6);
        crypto.getRandomValues(buffer);
        code = Array.from(buffer, (value) => chars[value % chars.length]).join(
            "",
        );
    }

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

<div class="grid grid-cols-3 gap-8 max-lg:grid-cols-1">
    <!-- Left Column: Course Details -->
    <div class="col-span-2 space-y-8 max-lg:col-span-1">
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

                <!-- Visibility -->
                <div class="space-y-2">
                    <label
                        for="course-visibility"
                        class="text-sm font-medium text-gray-700"
                        >{m.course_settings_visibility()}</label
                    >
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

                <!-- Thumbnail -->
                <div class="space-y-3 pt-2">
                    <span class="text-sm font-medium text-gray-700"
                        >{m.course_settings_thumbnail()}</span
                    >
                    <div class="flex flex-row gap-6 max-sm:flex-col">
                        <div
                            class="h-40 w-64 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 max-sm:w-full"
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
                                    {m.course_settings_no_image()}
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
                                class="flex w-auto cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 max-sm:w-full"
                            >
                                <Upload size={16} />
                                {isUploading
                                    ? m.course_settings_uploading()
                                    : m.course_settings_upload()}
                            </button>
                            <button
                                onclick={handleDeleteThumbnail}
                                class="flex w-auto cursor-pointer items-center gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 max-sm:w-full"
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

<div class="col-span-full flex items-center gap-3 pt-2">
    <button
        onclick={handleSave}
        disabled={loading || !isDirty}
        class="flex cursor-pointer items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
        {#if loading}
            {m.saving()}
        {:else}
            <Save size={16} />
            {m.course_settings_save()}
        {/if}
    </button>
    {#if isDirty}
        <button
            onclick={handleRevert}
            class="flex cursor-pointer items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
        >
            <RotateCcw size={16} />
            {m.course_settings_revert()}
        </button>
        <span class="text-xs font-medium text-gray-500">
            {m.course_settings_unsaved_changes()}
        </span>
    {/if}
    {#if saveError}
        <span class="text-xs font-medium text-red-500">{saveError}</span>
    {/if}
</div>
