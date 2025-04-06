const fs = require('fs');

// Function to create a simple WAV file with a sine wave
function createWavFile(filename, durationSecs = 3) {
    const sampleRate = 44100;
    const numChannels = 1;
    const bitsPerSample = 16;
    const numSamples = sampleRate * durationSecs;
    const dataSize = numSamples * numChannels * (bitsPerSample / 8);
    const frequency = 440; // A4 note

    // WAV header
    const buffer = Buffer.alloc(44 + dataSize);

    // RIFF chunk descriptor
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);

    // Format chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20); // AudioFormat (PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); // ByteRate
    buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // BlockAlign
    buffer.writeUInt16LE(bitsPerSample, 34);

    // Data chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Write audio data
    let dataOffset = 44;
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const sample = Math.sin(2 * Math.PI * frequency * t) * 0x7FFF;
        buffer.writeInt16LE(sample, dataOffset);
        dataOffset += 2;
    }

    fs.writeFileSync(filename, buffer);
    console.log(`Created test WAV file: ${filename}`);
}

// Create a 3-second test file
createWavFile('test.wav'); 