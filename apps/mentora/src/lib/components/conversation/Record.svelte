<script lang="ts">
    import { Mic } from "@lucide/svelte";
    import { m } from "$lib/paraglide/messages";

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
    let activeStream: MediaStream | null = null;
    let audioChunks: Blob[] = [];

    function stopActiveStream() {
        if (!activeStream) {
            return;
        }

        activeStream.getTracks().forEach((track) => track.stop());
        activeStream = null;
    }

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
            activeStream = stream;

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

                stopActiveStream();
                mediaRecorder = null;
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
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            isRecording = false;
            return;
        }

        stopActiveStream();
        mediaRecorder = null;
        isRecording = false;
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

    $effect(() => {
        if (!isRecording && mediaRecorder?.state === "recording") {
            stopRecording();
        }
    });
</script>

<button
    class="student-icon-btn h-16 w-16 {isRecording
        ? 'bg-[#6d6d6d] text-white'
        : 'text-white'}"
    onclick={toggleRecording}
    {disabled}
    aria-label={isRecording
        ? m.conversation_record_stop_aria()
        : m.conversation_record_start_aria()}
>
    <Mic size={28} />
</button>
