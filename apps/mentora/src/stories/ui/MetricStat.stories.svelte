<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import MetricStat from "$lib/components/ui/MetricStat.svelte";

    const { Story } = defineMeta({
        title: "UI/MetricStat",
        component: MetricStat,
        argTypes: {
            label: { control: "text" },
            value: { control: "text" },
            subtext: { control: "text" },
        },
    });
</script>

<Story name="Default" args={{ label: "Total Users", value: "1,234" }} />

<Story
    name="With Subtext"
    args={{ label: "Revenue", value: "$45.2k", subtext: "+12% vs last month" }}
/>
