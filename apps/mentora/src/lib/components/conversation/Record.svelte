<script lang="ts">
    import { Mic } from "@lucide/svelte";

    interface Props {
        onRecordingComplete: (blob: Blob) => void;
        isRecording?: boolean;
        disabled?: boolean;
    }

    let {
        onRecordingComplete,
        isRecording = $bindable(false),
        disabled = false,
    }: Props = $props();

    let mediaRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = [];

    function resolveRecorderOptions(): MediaRecorderOptions | undefined {
        const supportedTypes = [
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/mp4",
        ];

        for (const mimeType of supportedTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                return { mimeType };
            }
        }

        return undefined;
    }

    async function startRecording() {
        try {
            if (
                typeof navigator === "undefined" ||
                !navigator.mediaDevices ||
                typeof navigator.mediaDevices.getUserMedia !== "function" ||
                typeof MediaRecorder === "undefined"
            ) {
                throw new Error("Recording is not supported in this browser");
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            mediaRecorder = new MediaRecorder(stream, resolveRecorderOptions());

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const mimeType = mediaRecorder?.mimeType || "audio/webm";
                const audioBlob = new Blob(audioChunks, { type: mimeType });
                onRecordingComplete(audioBlob);
                audioChunks = [];

                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            isRecording = true;
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert(
                "Microphone access denied or not available. Please check your browser settings.",
            );
        }
    }

    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
        }
    }

    function toggleRecording() {
        if (disabled) {
            return;
        }

        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }
</script>

<button
    class="mic-btn"
    class:recording={isRecording}
    onclick={toggleRecording}
    {disabled}
    aria-label={isRecording ? "Stop recording" : "Start recording"}
>
    <Mic size={28} />
</button>

<style>
    .mic-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 64px;
        height: 64px;
        border: none;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(10px);
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }

    .mic-btn:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: scale(1.05);
    }

    .mic-btn.recording {
        background: #ef4444;
        animation: pulse 2s infinite;
        box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
    }

    .mic-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
        transform: none;
    }

    @keyframes pulse {
        0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
        }
        70% {
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
        }
        100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
        }
    }
</style>
