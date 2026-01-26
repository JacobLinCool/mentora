<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import * as echarts from "echarts";

    interface UsageData {
        day: string;
        input: number;
        output: number;
    }

    interface TooltipItem {
        name: string;
        seriesName: string;
        value: number;
        marker: string;
        [key: string]: unknown;
    }

    interface Props {
        data: UsageData[];
        className?: string;
    }

    let { data = [], className = "" }: Props = $props();

    let chartContainer: HTMLDivElement;
    let chartInstance: echarts.ECharts | null = null;

    function initChart() {
        if (!chartContainer) return;

        chartInstance = echarts.init(chartContainer);

        const option: echarts.EChartsOption = {
            tooltip: {
                trigger: "axis",
                axisPointer: {
                    type: "shadow",
                },
                backgroundColor: "rgba(30, 41, 59, 0.9)", // gray-900 with opacity
                borderColor: "transparent",
                textStyle: {
                    color: "#fff",
                },
                formatter: (params: unknown) => {
                    // Custom tooltip formatter
                    const items = Array.isArray(params)
                        ? (params as TooltipItem[])
                        : [params as TooltipItem];
                    if (!items.length) return "";
                    let result = `<div class="font-bold mb-1">${items[0].name}</div>`;
                    let total = 0;
                    items.forEach((item) => {
                        total += item.value;
                        result += `<div>${item.marker} ${item.seriesName}: ${item.value}</div>`;
                    });
                    result =
                        `<div class="font-bold mb-1">${total} Total</div>` +
                        result;
                    return result;
                },
            },
            legend: {
                data: ["Input", "Output"],
                right: 0,
                top: 0,
                itemWidth: 10,
                itemHeight: 10,
                icon: "circle",
                textStyle: {
                    color: "#6b7280", // gray-500
                },
            },
            grid: {
                left: "3%",
                right: "4%",
                bottom: "3%",
                containLabel: true,
            },
            xAxis: {
                type: "category",
                data: data.map((d) => d.day),
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                    color: "#6b7280",
                },
            },
            yAxis: {
                type: "value",
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { show: false },
                axisLabel: { show: false }, // Hide Y axis labels to match mockup cleaner look
            },
            series: [
                {
                    name: "Input",
                    type: "bar",
                    stack: "total",
                    barWidth: "60%", // Adjust bar width
                    emphasis: {
                        focus: "series",
                    },
                    itemStyle: {
                        color: "#494949", // gray-800
                        borderRadius: [0, 0, 4, 4], // Bottom rounding for bottom stack? No, logic depends on pos.
                    },
                    data: data.map((d) => d.input),
                },
                {
                    name: "Output",
                    type: "bar",
                    stack: "total",
                    emphasis: {
                        focus: "series",
                    },
                    itemStyle: {
                        color: "#A0A0A0", // gray-400
                        borderRadius: [4, 4, 0, 0], // Top rounding
                    },
                    data: data.map((d) => d.output),
                },
            ],
        };

        chartInstance.setOption(option);
    }

    function handleResize() {
        chartInstance?.resize();
    }

    $effect(() => {
        if (data) {
            chartInstance?.setOption({
                xAxis: {
                    data: data.map((d) => d.day),
                },
                series: [
                    { data: data.map((d) => d.input) },
                    { data: data.map((d) => d.output) },
                ],
            });
        }
    });

    onMount(() => {
        initChart();
        window.addEventListener("resize", handleResize);
    });

    onDestroy(() => {
        if (typeof window !== "undefined") {
            window.removeEventListener("resize", handleResize);
        }
        chartInstance?.dispose();
    });
</script>

<div
    bind:this={chartContainer}
    class="h-full min-h-[250px] w-full {className}"
></div>
