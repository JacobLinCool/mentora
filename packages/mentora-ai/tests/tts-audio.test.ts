import { describe, expect, it } from "vitest";
import { encodePcm16AsWav } from "../src/executor/wav.js";

describe("encodePcm16AsWav", () => {
    it("wraps PCM bytes in a WAV container with the expected header", () => {
        const pcmBytes = Uint8Array.from([0x01, 0x02, 0x03, 0x04]);
        const result = encodePcm16AsWav(
            Buffer.from(pcmBytes).toString("base64"),
        );
        const wavBytes = Buffer.from(result.audioBase64, "base64");

        expect(result.mimeType).toBe("audio/wav");
        expect(wavBytes.toString("ascii", 0, 4)).toBe("RIFF");
        expect(wavBytes.toString("ascii", 8, 12)).toBe("WAVE");
        expect(wavBytes.toString("ascii", 12, 16)).toBe("fmt ");
        expect(wavBytes.readUInt16LE(20)).toBe(1);
        expect(wavBytes.readUInt16LE(22)).toBe(1);
        expect(wavBytes.readUInt32LE(24)).toBe(24_000);
        expect(wavBytes.readUInt16LE(34)).toBe(16);
        expect(wavBytes.toString("ascii", 36, 40)).toBe("data");
        expect(wavBytes.readUInt32LE(40)).toBe(pcmBytes.length);
        expect([...wavBytes.subarray(44)]).toEqual([...pcmBytes]);
    });
});
