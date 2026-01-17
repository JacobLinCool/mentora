<script lang="ts">
    let {
        color1 = "#a855f7", // Purple
        color2 = "#eab308", // Yellow/Gold
        color3 = "#ec4899", // Pink
        color4 = "#e5e5e5", // White
        color5 = "#1f2937", // Dark
        animate = true, // New prop to control animation
    } = $props();
</script>

<div class="mesh-container" class:paused={!animate}>
    <div class="blob blob-1" style="background-color: {color1};"></div>
    <div class="blob blob-2" style="background-color: {color2};"></div>
    <div class="blob blob-3" style="background-color: {color3};"></div>
    <div class="blob blob-4" style="background-color: {color4};"></div>
    <div class="blob blob-5" style="background-color: {color5};"></div>
    <div class="backdrop"></div>
</div>

<style>
    /* 1. Container: Full screen, bottom layer */
    .mesh-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: -10;
        overflow: hidden;
        background-color: #494949;
    }

    /* 2. Common Blob Settings */
    .blob {
        position: absolute;
        width: 60vw;
        height: 60vw;
        /* Irregular initial shape */
        border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
        opacity: 0.8;
        /* Removing global mix-blend-mode: screen so dark colors are visible */
        filter: blur(80px);
        animation: float 6s infinite ease-in-out alternate;
    }

    /* Pause animation if requested */
    .paused .blob {
        animation-play-state: paused;
    }

    /* 3. Individual Blob Positioning & Unique Animations */
    .blob-1 {
        top: 0%;
        left: 0%;
        animation: roam 12s infinite ease-in-out alternate;
        animation-delay: 0s;
        transform-origin: center;
    }

    .blob-2 {
        top: 0%;
        right: 0%;
        animation: roam 15s infinite ease-in-out alternate-reverse;
        animation-delay: -5s;
        transform-origin: top right;
    }

    .blob-3 {
        bottom: 0%;
        left: 20%;
        width: 70vw;
        height: 70vw;
        animation: roam 18s infinite ease-in-out alternate;
        animation-delay: -10s;
        transform-origin: bottom left;
    }

    .blob-4 {
        bottom: -10%;
        right: -10%;
        width: 50vw;
        height: 50vw;
        animation: float 10s infinite ease-in-out alternate;
        animation-delay: -6s;
        transform-origin: bottom right;
    }

    .blob-5 {
        top: 30%;
        left: 30%;
        width: 60vw;
        height: 60vw;
        animation: roam 20s infinite ease-in-out alternate-reverse;
        animation-delay: -3s;
        transform-origin: center;
        opacity: 0.5;
    }

    /* Specific blend modes to ensure visibility */
    .blob-4,
    .blob-2 {
        /* Light colors (White/Silver) */
        mix-blend-mode: overlay;
        opacity: 0.9;
    }

    .blob-1,
    .blob-3,
    .blob-5 {
        /* Dark colors */
        mix-blend-mode: screen; /* Normal mode ensures darks darken the background */
    }

    /* Smooth overlay */
    .backdrop {
        position: absolute;
        inset: 0;
        backdrop-filter: blur(80px); /* Heavy blur to merge them */
        pointer-events: none;
    }

    /* 4. Float & Morph Animation - Standard (Edges) */
    @keyframes float {
        0% {
            transform: translate(0, 0) scale(1) rotate(0deg);
            border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
        }
        33% {
            transform: translate(5vw, -5vh) scale(1.1) rotate(5deg);
            border-radius: 70% 30% 50% 50% / 30% 30% 70% 70%;
        }
        66% {
            transform: translate(-5vw, 10vh) scale(0.9) rotate(-3deg);
            border-radius: 100% 60% 60% 100% / 100% 100% 60% 60%;
        }
        100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
            border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
        }
    }

    /* 5. Roam Animation - Large Movement (Cross Center) */
    @keyframes roam {
        0% {
            transform: translate(0, 0) scale(1) rotate(0deg);
            border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
        }
        33% {
            /* Move deeply into the center (approx 40% screen width/height) */
            transform: translate(40vw, 30vh) scale(1.2) rotate(20deg);
            border-radius: 50% 50% 20% 80% / 25% 80% 20% 75%;
        }
        66% {
            transform: translate(-20vw, 40vh) scale(0.8) rotate(-10deg);
            border-radius: 80% 20% 50% 50% / 75% 25% 75% 25%;
        }
        100% {
            transform: translate(10vw, -20vh) scale(1) rotate(10deg);
            border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
        }
    }
</style>
