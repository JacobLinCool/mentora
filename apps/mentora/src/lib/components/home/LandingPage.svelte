<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { Button, Card } from "flowbite-svelte";
    import {
        BookOpen,
        MessageSquare,
        Mic,
        DollarSign,
        Zap,
    } from "@lucide/svelte";
</script>

<div class="mx-auto max-w-6xl">
    <!-- Hero Section -->
    <div class="mb-16 text-center">
        <h1 class="mb-6 text-5xl font-bold text-gray-900">{m.home_title()}</h1>
        <p class="mb-8 text-2xl text-gray-600">{m.home_subtitle()}</p>
        <Button href="/auth" size="xl" class="px-8 py-4">
            {m.nav_sign_in()}
        </Button>
    </div>

    <!-- Features Section -->
    <div class="mb-16">
        <h2 class="mb-8 text-center text-3xl font-bold text-gray-900">
            {m.landing_features_title()}
        </h2>
        <div class="grid gap-8 md:grid-cols-3">
            <Card class="p-6 text-center">
                <BookOpen class="mx-auto mb-4 h-12 w-12 text-blue-600" />
                <h3 class="mb-2 text-xl font-semibold">
                    {m.landing_feature_courses_title()}
                </h3>
                <p class="text-gray-600">
                    {m.landing_feature_courses_description()}
                </p>
            </Card>

            <Card class="p-6 text-center">
                <MessageSquare class="mx-auto mb-4 h-12 w-12 text-green-600" />
                <h3 class="mb-2 text-xl font-semibold">
                    {m.landing_feature_conversations_title()}
                </h3>
                <p class="text-gray-600">
                    {m.landing_feature_conversations_description()}
                </p>
            </Card>

            <Card class="p-6 text-center">
                <Mic class="mx-auto mb-4 h-12 w-12 text-purple-600" />
                <h3 class="mb-2 text-xl font-semibold">
                    {m.landing_feature_voice_title()}
                </h3>
                <p class="text-gray-600">
                    {m.landing_feature_voice_description()}
                </p>
            </Card>
        </div>
    </div>

    <!-- Pricing Section -->
    <div class="mb-16">
        <h2 class="mb-8 text-center text-3xl font-bold text-gray-900">
            {m.landing_pricing_title()}
        </h2>

        <Card class="mx-auto mb-8 max-w-2xl p-8">
            <div class="mb-6 text-center">
                <DollarSign class="mx-auto mb-4 h-16 w-16 text-green-600" />
                <h3 class="mb-2 text-2xl font-bold">
                    {m.landing_pricing_model_title()}
                </h3>
                <p class="text-3xl font-bold text-blue-600">
                    $1 = 1,000,000 {m.landing_pricing_credits()}
                </p>
            </div>

            <div class="space-y-4">
                <div class="flex items-start gap-4 rounded-lg bg-gray-50 p-4">
                    <Mic class="h-6 w-6 flex-shrink-0 text-purple-600" />
                    <div class="flex-1">
                        <h4 class="mb-1 font-semibold">
                            {m.landing_pricing_transcribe_title()}
                        </h4>
                        <p class="text-sm text-gray-600">
                            {m.landing_pricing_transcribe_description()}
                        </p>
                        <p class="mt-2 text-sm font-medium text-purple-600">
                            {m.landing_pricing_transcribe_rate()}
                        </p>
                    </div>
                </div>

                <div class="flex items-start gap-4 rounded-lg bg-gray-50 p-4">
                    <Zap class="h-6 w-6 flex-shrink-0 text-green-600" />
                    <div class="flex-1">
                        <h4 class="mb-1 font-semibold">
                            {m.landing_pricing_conversation_title()}
                        </h4>
                        <p class="text-sm text-gray-600">
                            {m.landing_pricing_conversation_description()}
                        </p>
                        <p class="mt-2 text-sm font-medium text-green-600">
                            {m.landing_pricing_conversation_rate()}
                        </p>
                    </div>
                </div>
            </div>
        </Card>

        <div class="text-center">
            <p class="mb-4 text-gray-600">{m.landing_pricing_cta()}</p>
            <Button href="/auth" size="lg" color="blue">
                {m.landing_get_started()}
            </Button>
        </div>
    </div>

    <!-- How It Works Section -->
    <div class="mb-16">
        <h2 class="mb-8 text-center text-3xl font-bold text-gray-900">
            {m.landing_how_it_works_title()}
        </h2>
        <div class="grid gap-6 md:grid-cols-3">
            <div class="text-center">
                <div
                    class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600"
                >
                    1
                </div>
                <h3 class="mb-2 text-lg font-semibold">
                    {m.landing_step_1_title()}
                </h3>
                <p class="text-gray-600">{m.landing_step_1_description()}</p>
            </div>

            <div class="text-center">
                <div
                    class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-xl font-bold text-green-600"
                >
                    2
                </div>
                <h3 class="mb-2 text-lg font-semibold">
                    {m.landing_step_2_title()}
                </h3>
                <p class="text-gray-600">{m.landing_step_2_description()}</p>
            </div>

            <div class="text-center">
                <div
                    class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-xl font-bold text-purple-600"
                >
                    3
                </div>
                <h3 class="mb-2 text-lg font-semibold">
                    {m.landing_step_3_title()}
                </h3>
                <p class="text-gray-600">{m.landing_step_3_description()}</p>
            </div>
        </div>
    </div>
</div>
