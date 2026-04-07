import type { SynthesizedAudio } from "../types.js";

const WAV_HEADER_BYTES = 44;

function writeAscii(view: DataView, offset: number, value: string) {
    for (let i = 0; i < value.length; i++) {
        view.setUint8(offset + i, value.charCodeAt(i));
    }
}

/**
 * Wrap raw PCM16LE bytes in a WAV container so browsers can play the result.
 */
export function encodePcm16AsWav(
    pcmBase64: string,
    {
        channelCount = 1,
        sampleRate = 24_000,
        bytesPerSample = 2,
    }: {
        channelCount?: number;
        sampleRate?: number;
        bytesPerSample?: number;
    } = {},
): SynthesizedAudio {
    const pcmBytes = Buffer.from(pcmBase64, "base64");
    const wavBytes = new Uint8Array(WAV_HEADER_BYTES + pcmBytes.length);
    const view = new DataView(
        wavBytes.buffer,
        wavBytes.byteOffset,
        wavBytes.byteLength,
    );

    const byteRate = sampleRate * channelCount * bytesPerSample;
    const blockAlign = channelCount * bytesPerSample;
    const bitsPerSample = bytesPerSample * 8;

    writeAscii(view, 0, "RIFF");
    view.setUint32(4, 36 + pcmBytes.length, true);
    writeAscii(view, 8, "WAVE");
    writeAscii(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channelCount, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeAscii(view, 36, "data");
    view.setUint32(40, pcmBytes.length, true);
    wavBytes.set(pcmBytes, WAV_HEADER_BYTES);

    return {
        audioBase64: Buffer.from(wavBytes).toString("base64"),
        mimeType: "audio/wav",
    };
}
