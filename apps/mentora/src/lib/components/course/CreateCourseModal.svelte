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
>
    <form
        class="custom-form flex flex-col space-y-6"
        onsubmit={(e) => {
            e.preventDefault();
            handleSubmit();
        }}
    >
        <Label>
            <span>{m.courses_create_title()}</span>
            <Input
                type="text"
                name="title"
                bind:value={title}
                placeholder={m.courses_create_title_placeholder()}
                required
            />
        </Label>

        <Label>
            <span>{m.courses_create_code_optional()}</span>
            <Input
                type="text"
                name="code"
                bind:value={code}
                placeholder={m.courses_create_code_placeholder()}
            />
            <p class="mt-1 text-xs text-gray-500">
                {m.courses_create_code_hint()}
            </p>
        </Label>

        <Label>
            <span>{m.course_settings_visibility()}</span>
            <Select items={visibilityOptions} bind:value={visibility} />
        </Label>

        <Label>
            <span>{m.courses_create_description_label()}</span>
            <Textarea
                name="description"
                bind:value={description}
                rows={3}
                placeholder={m.courses_create_description_placeholder()}
                class="w-full"
            />
        </Label>

        {#if errorMessage}
            <div class="text-sm text-red-500">{errorMessage}</div>
        {/if}

        <div class="flex items-center justify-end gap-2">
            <Button
                color="alternative"
                onclick={() => (open = false)}
                class="cursor-pointer text-[#494949] hover:text-[#494949]/90"
            >
                {m.cancel()}
            </Button>
            <Button
                type="submit"
                disabled={loading}
                class="cursor-pointer bg-[#494949] text-white hover:bg-[#494949]/90"
            >
                {#if loading}{m.courses_creating()}{:else}{m.courses_create()}{/if}
            </Button>
        </div>
    </form>
</Modal>

<style>
    /* Force override Flowbite focus styles within this modal */
    :global(.custom-form input:focus),
    :global(.custom-form select:focus),
    :global(.custom-form textarea:focus) {
        --tw-ring-color: #494949 !important;
        border-color: #494949 !important;
        box-shadow: 0 0 0 1px #494949 !important; /* Fallback/Addition for some ring implementations */
    }
</style>
