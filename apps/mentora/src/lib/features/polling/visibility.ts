interface VisibilityPollingOptions {
    intervalMs: number;
    runImmediately?: boolean;
    onError?: (error: unknown) => void;
}

export function startVisibilityPolling(
    task: () => Promise<void> | void,
    options: VisibilityPollingOptions,
): () => void {
    const { intervalMs, runImmediately = true, onError } = options;
    let timer: ReturnType<typeof setInterval> | null = null;

    const runTask = async () => {
        try {
            await task();
        } catch (error) {
            onError?.(error);
        }
    };

    const startTimer = () => {
        if (timer) return;
        timer = setInterval(() => {
            if (document.visibilityState === "visible") {
                void runTask();
            }
        }, intervalMs);
    };

    const stopTimer = () => {
        if (!timer) return;
        clearInterval(timer);
        timer = null;
    };

    const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
            void runTask();
            startTimer();
            return;
        }
        stopTimer();
    };

    if (runImmediately && document.visibilityState === "visible") {
        void runTask();
    }
    startTimer();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
        stopTimer();
        document.removeEventListener(
            "visibilitychange",
            handleVisibilityChange,
        );
    };
}
