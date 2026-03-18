<script lang="ts">
    import {
        Modal,
        Label,
        Input,
        Select,
        Button,
        Textarea,
    } from "flowbite-svelte";
    import * as m from "$lib/paraglide/messages";

    type CreateCoursePayload = {
        title: string;
        code: string;
        visibility: "public" | "private";
        description: string;
    };

    let { open = $bindable(false), onCreate } = $props<{
        open?: boolean;
        onCreate?: (payload: CreateCoursePayload) => Promise<void> | void;
    }>();

    let title = $state("");
    let code = $state("");
    let description = $state("");
    let visibility = $state<"public" | "private">("private");
    let loading = $state(false);
    let errorMessage = $state("");

    const visibilityOptions = $derived([
        { value: "private", name: m.courses_create_visibility_private() },
        { value: "public", name: m.courses_create_visibility_public() },
    ]);

    function validateCode(value: string): string | null {
        if (!value) return null; // optional field
        const upper = value.toUpperCase();
        if (!/^[A-Z0-9\-_]+$/.test(upper)) {
            return m.courses_create_code_error_format();
        }
        const stripped = upper.replace(/[-_]/g, "");
        if (stripped.length < 6 || stripped.length > 64) {
            return m.courses_create_code_error_format();
        }
        return null;
    }

    async function handleSubmit() {
        if (!title.trim()) {
            title = m.courses_create_default_title();
        }

        const codeError = validateCode(code.trim());
        if (codeError) {
            errorMessage = codeError;
            return;
        }

        if (!onCreate) {
            errorMessage = "Missing create handler.";
            return;
        }

        loading = true;
        errorMessage = "";

        try {
            await onCreate({
                title: title.trim(),
                code: code.trim(),
                description: description || "",
                visibility,
            });

            open = false;
            // Reset form
            title = "";
            code = "";
            description = "";
            visibility = "private";
        } catch (e) {
            errorMessage =
                e instanceof Error ? e.message : m.courses_create_error();
        } finally {
            loading = false;
        }
    }
</script>

<Modal
    bind:open
    title={m.courses_create_modal_title()}
    size="xs"
    autoclose={false}
    class="create-course-modal !rounded-[1.25rem] !border !border-[rgba(95,95,95,0.14)] !bg-[#f5f5f5] !text-[#2f2f2f] !shadow-[0_24px_64px_rgba(0,0,0,0.18)]"
    headerClass="!rounded-t-[1.25rem] !border-b !border-[rgba(95,95,95,0.12)] !bg-[#f5f5f5] !text-[#2f2f2f]"
    bodyClass="!bg-[#f5f5f5] !text-[#2f2f2f]"
    closeBtnClass="!rounded-full !text-[#7a7a7a] hover:!bg-[rgba(95,95,95,0.08)] hover:!text-[#4b4b4b]"
>
    <form
        class="custom-form flex flex-col space-y-6 text-[#2f2f2f]"
        onsubmit={(e) => {
            e.preventDefault();
            handleSubmit();
        }}
    >
        <Label>
            <span class="text-sm font-medium text-[#5f5f5f]"
                >{m.courses_create_title()}</span
            >
            <Input
                type="text"
                name="title"
                bind:value={title}
                placeholder={m.courses_create_title_placeholder()}
                required
                class="mentor-modal-field mt-2"
            />
        </Label>

        <Label>
            <span class="text-sm font-medium text-[#5f5f5f]"
                >{m.courses_create_code_optional()}</span
            >
            <Input
                type="text"
                name="code"
                bind:value={code}
                placeholder={m.courses_create_code_placeholder()}
                class="mentor-modal-field mt-2"
            />
            <p class="mt-2 text-xs leading-relaxed text-[#767676]">
                {m.courses_create_code_hint()}
            </p>
        </Label>

        <Label>
            <span class="text-sm font-medium text-[#5f5f5f]"
                >{m.course_settings_visibility()}</span
            >
            <Select
                items={visibilityOptions}
                bind:value={visibility}
                class="mentor-modal-field mt-2"
            />
        </Label>

        <Label>
            <span class="text-sm font-medium text-[#5f5f5f]"
                >{m.courses_create_description_label()}</span
            >
            <Textarea
                name="description"
                bind:value={description}
                rows={3}
                placeholder={m.courses_create_description_placeholder()}
                class="mentor-modal-field mt-2 w-full"
            />
        </Label>

        {#if errorMessage}
            <div class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                {errorMessage}
            </div>
        {/if}

        <div class="flex items-center justify-end gap-2">
            <Button
                color="alternative"
                onclick={() => (open = false)}
                class="mentor-modal-btn cursor-pointer !rounded-full !border-0 !bg-white !px-5 !py-2.5 !text-[#4b4b4b] !shadow-sm hover:!bg-[#eeeeee]"
            >
                {m.cancel()}
            </Button>
            <Button
                type="submit"
                disabled={loading}
                class="mentor-modal-btn cursor-pointer !rounded-full !border-0 !bg-[#4b4b4b] !px-5 !py-2.5 !text-white !shadow-sm hover:!bg-[#3f3f3f] disabled:!bg-[#8a8a8a]"
            >
                {#if loading}{m.courses_creating()}{:else}{m.courses_create()}{/if}
            </Button>
        </div>
    </form>
</Modal>

<style>
    :global(dialog.create-course-modal::backdrop) {
        background-color: rgba(0, 0, 0, 0.48) !important;
        backdrop-filter: blur(2px);
    }

    :global(dialog.create-course-modal) {
        background-color: #f5f5f5 !important;
        color: #2f2f2f !important;
        border-radius: 1.25rem !important;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18) !important;
        border: 1px solid rgba(95, 95, 95, 0.14) !important;
    }

    :global(dialog.create-course-modal h3) {
        color: #2f2f2f !important;
        font-weight: 700 !important;
    }

    :global(dialog.create-course-modal .border-b),
    :global(
        dialog.create-course-modal .divide-y > :not([hidden]) ~ :not([hidden])
    ) {
        border-color: rgba(95, 95, 95, 0.12) !important;
    }

    :global(.custom-form .mentor-modal-field),
    :global(.custom-form .mentor-modal-field input),
    :global(.custom-form .mentor-modal-field select),
    :global(.custom-form .mentor-modal-field textarea) {
        background-color: #ffffff !important;
        color: #2f2f2f !important;
        border-color: rgba(95, 95, 95, 0.22) !important;
        border-radius: 0.9rem !important;
    }

    :global(.custom-form .mentor-modal-field::placeholder),
    :global(.custom-form .mentor-modal-field input::placeholder),
    :global(.custom-form .mentor-modal-field textarea::placeholder) {
        color: #9a9a9a !important;
    }

    :global(.custom-form input:focus),
    :global(.custom-form select:focus),
    :global(.custom-form textarea:focus) {
        --tw-ring-color: #5f5f5f !important;
        border-color: #5f5f5f !important;
        box-shadow: 0 0 0 1px #5f5f5f !important;
    }

    :global(.create-course-modal .mentor-modal-btn span) {
        color: inherit !important;
    }
</style>
