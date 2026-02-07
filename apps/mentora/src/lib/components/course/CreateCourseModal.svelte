<script lang="ts">
    import {
        Modal,
        Label,
        Input,
        Select,
        Button,
        Textarea,
    } from "flowbite-svelte";

    let { open = $bindable(false), onCreate } = $props();

    let title = $state("");
    let code = $state("");
    let description = $state("");
    let visibility = $state<"public" | "unlisted" | "private">("private");
    let loading = $state(false);
    let errorMessage = $state("");

    const visibilityOptions = [
        { value: "private", name: "Private (Invite Only)" },
        { value: "unlisted", name: "Unlisted (Link Access)" },
        { value: "public", name: "Public (Visible to All)" },
    ];

    async function handleSubmit() {
        if (!title.trim()) {
            errorMessage = "Title is required";
            return;
        }

        loading = true;
        errorMessage = "";

        try {
            if (onCreate) {
                await onCreate({
                    title,
                    code,
                    description,
                    visibility,
                });
            }
            open = false;
        } catch (err) {
            console.error(err);
            errorMessage = "Failed to create course";
        } finally {
            loading = false;
        }
    }
</script>

<Modal bind:open title="Create New Course" size="xs" autoclose={false}>
    <form
        class="custom-form flex flex-col space-y-6"
        onsubmit={(e) => {
            e.preventDefault();
            handleSubmit();
        }}
    >
        <h3 class="text-xl font-medium text-gray-900 dark:text-white">
            Create a course
        </h3>

        <Label>
            <span>Title</span>
            <Input
                type="text"
                name="title"
                bind:value={title}
                placeholder="e.g. Introduction to Philosophy"
                required
            />
        </Label>

        <Label>
            <span>Course Code (Optional)</span>
            <Input
                type="text"
                name="code"
                bind:value={code}
                placeholder="e.g. PHIL101"
            />
        </Label>

        <Label>
            <span>Visibility</span>
            <Select items={visibilityOptions} bind:value={visibility} />
        </Label>

        <Label>
            <span>Description (Optional)</span>
            <Textarea
                name="description"
                bind:value={description}
                rows={3}
                placeholder="Course description..."
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
                Cancel
            </Button>
            <Button
                type="submit"
                disabled={loading}
                class="cursor-pointer bg-[#494949] text-white hover:bg-[#494949]/90"
            >
                {#if loading}Creating...{:else}Create Course{/if}
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
