<script lang="ts">
    import {
        Key,
        TestTube2,
        Save,
        CheckCircle,
        XCircle,
        AlertTriangle,
        Loader2,
    } from "@lucide/svelte";
    import * as m from "$lib/paraglide/messages";
    import { api } from "$lib";
    import { onMount } from "svelte";

    let { courseId }: { courseId: string } = $props();

    interface WalletInfo {
        courseId: string;
        apiKeyLastFour: string;
        spendingLimitUsd: number;
        totalSpentUsd: number;
        status: string;
    }

    let wallet = $state<WalletInfo | null>(null);
    let apiKeyInput = $state("");
    let spendingLimitInput = $state("10");
    let testing = $state(false);
    let testResult = $state<boolean | null>(null);
    let saving = $state(false);
    let loading = $state(true);
    let saveError = $state<string | null>(null);

    let hasWallet = $derived(wallet !== null);
    let spendPercent = $derived(
        wallet && wallet.spendingLimitUsd > 0
            ? Math.min(
                  100,
                  (wallet.totalSpentUsd / wallet.spendingLimitUsd) * 100,
              )
            : 0,
    );
    let canSave = $derived(
        apiKeyInput.length > 0 && parseFloat(spendingLimitInput) > 0 && !saving,
    );

    onMount(() => {
        loadWallet();
    });

    async function loadWallet() {
        loading = true;
        try {
            const res = await api.wallets.getCourseWallet(courseId);
            if (res.success && res.data) {
                wallet = res.data;
                spendingLimitInput = String(wallet.spendingLimitUsd);
            }
        } catch (e) {
            console.error("Failed to load wallet", e);
        } finally {
            loading = false;
        }
    }

    async function handleTestKey() {
        if (!apiKeyInput) return;
        testing = true;
        testResult = null;
        try {
            const res = await api.wallets.validateApiKey(apiKeyInput);
            testResult = res.success && res.data?.valid === true;
        } catch {
            testResult = false;
        } finally {
            testing = false;
        }
    }

    async function handleSave() {
        if (!canSave) return;
        saving = true;
        saveError = null;
        try {
            const res = await api.wallets.createOrUpdate(courseId, {
                apiKey: apiKeyInput,
                spendingLimitUsd: parseFloat(spendingLimitInput),
            });
            if (res.success) {
                wallet = res.data;
                apiKeyInput = "";
                testResult = null;
            } else {
                saveError = res.error || "Failed to save wallet";
            }
        } catch {
            saveError = "Failed to save wallet";
        } finally {
            saving = false;
        }
    }

    function statusColor(status: string) {
        if (status === "active") return "bg-green-100 text-green-700";
        if (status === "suspended") return "bg-yellow-100 text-yellow-700";
        return "bg-red-100 text-red-700";
    }
</script>

<div class="mx-auto max-w-2xl space-y-8">
    {#if loading}
        <div class="flex items-center justify-center py-12">
            <Loader2 size={24} class="animate-spin text-gray-400" />
        </div>
    {:else}
        <!-- Wallet Status Card -->
        {#if hasWallet && wallet}
            <div
                class="rounded-2xl border border-gray-100 bg-[#F5F5F5] p-8 shadow-sm"
            >
                <div class="mb-6 flex items-center justify-between">
                    <h3 class="text-xl font-semibold text-gray-900">
                        {m.wallet_status()}
                    </h3>
                    <span
                        class="rounded-full px-3 py-1 text-xs font-medium {statusColor(
                            wallet.status,
                        )}"
                    >
                        {#if wallet.status === "active"}
                            {m.wallet_status_active()}
                        {:else if wallet.status === "suspended"}
                            {m.wallet_status_suspended()}
                        {:else}
                            {m.wallet_status_invalid_key()}
                        {/if}
                    </span>
                </div>

                <!-- Usage Progress -->
                <div class="space-y-2">
                    <div class="flex justify-between text-sm text-gray-600">
                        <span>{m.wallet_usage()}</span>
                        <span
                            >${wallet.totalSpentUsd.toFixed(2)} / ${wallet.spendingLimitUsd.toFixed(
                                2,
                            )}</span
                        >
                    </div>
                    <div
                        class="h-3 w-full overflow-hidden rounded-full bg-gray-200"
                    >
                        <div
                            class="h-full rounded-full transition-all duration-300 {spendPercent >=
                            90
                                ? 'bg-red-500'
                                : spendPercent >= 70
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'}"
                            style="width: {spendPercent}%"
                        ></div>
                    </div>
                </div>

                <!-- API Key Display -->
                <div class="mt-4 text-sm text-gray-500">
                    <span class="font-medium">{m.wallet_api_key()}:</span>
                    ····{wallet.apiKeyLastFour}
                </div>
            </div>
        {/if}

        <!-- API Key & Settings Form -->
        <div
            class="rounded-2xl border border-gray-100 bg-[#F5F5F5] p-8 shadow-sm"
        >
            <h3 class="mb-6 text-xl font-semibold text-gray-900">
                {hasWallet ? m.wallet_update_settings() : m.wallet_setup()}
            </h3>

            <div class="space-y-6">
                <!-- API Key Input -->
                <div class="space-y-2">
                    <label
                        for="api-key"
                        class="text-sm font-medium text-gray-700"
                    >
                        <Key size={14} class="mr-1 inline" />
                        {m.wallet_api_key()}
                    </label>
                    <div class="flex gap-2">
                        <input
                            id="api-key"
                            type="password"
                            bind:value={apiKeyInput}
                            placeholder={m.wallet_api_key_placeholder()}
                            class="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-900 focus:bg-white focus:ring-0 focus:outline-none"
                        />
                        <button
                            onclick={handleTestKey}
                            disabled={!apiKeyInput || testing}
                            class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                        >
                            {#if testing}
                                <Loader2 size={14} class="animate-spin" />
                            {:else}
                                <TestTube2 size={14} />
                            {/if}
                            {m.wallet_test_connection()}
                        </button>
                    </div>
                    {#if testResult === true}
                        <div
                            class="flex items-center gap-1 text-sm text-green-600"
                        >
                            <CheckCircle size={14} />
                            {m.wallet_test_success()}
                        </div>
                    {:else if testResult === false}
                        <div
                            class="flex items-center gap-1 text-sm text-red-600"
                        >
                            <XCircle size={14} />
                            {m.wallet_test_failed()}
                        </div>
                    {/if}
                </div>

                <!-- Spending Limit -->
                <div class="space-y-2">
                    <label
                        for="spending-limit"
                        class="text-sm font-medium text-gray-700"
                        >{m.wallet_spending_limit()}</label
                    >
                    <div class="flex items-center gap-2">
                        <span class="text-gray-500">$</span>
                        <input
                            id="spending-limit"
                            type="number"
                            bind:value={spendingLimitInput}
                            min="0.01"
                            step="0.01"
                            class="w-40 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 transition-colors focus:border-gray-900 focus:bg-white focus:ring-0 focus:outline-none"
                        />
                        <span class="text-sm text-gray-500">USD</span>
                    </div>
                    <p class="text-xs text-gray-400">
                        {m.wallet_spending_limit_description()}
                    </p>
                </div>

                {#if saveError}
                    <div
                        class="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                        <AlertTriangle size={14} />
                        {saveError}
                    </div>
                {/if}

                <button
                    onclick={handleSave}
                    disabled={!canSave}
                    class="flex items-center gap-2 rounded-lg bg-black px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-800 disabled:opacity-50"
                >
                    {#if saving}
                        <Loader2 size={14} class="animate-spin" />
                    {:else}
                        <Save size={14} />
                    {/if}
                    {m.wallet_save()}
                </button>
            </div>
        </div>
    {/if}
</div>
